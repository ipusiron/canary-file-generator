// 監視の設定例と擬似ログ（DOM を使わない）。globalThis.CanaryMonitor に置く
// - 設定例: Linux（auditd）・Windows（監査ポリシーと SACL、イベント 4663）・macOS（eslogger）。手順の説明は文言のキー、コマンドは言語によらない文字列
// - 擬似ログ: 開封の擬似通知を、auditd の記録（SYSCALL・CWD・PATH）と、イベント 4663 の XML の形で示す。値は教育用の作りもの
// 出典: auditctl(8)・augenrules(8)・SUSE「Understanding the audit logs」・Microsoft Learn「4663(S)」・MS-GPAC・eslogger(1)
(() => {
  'use strict';

  // 「ファイルシステム」の監査のサブカテゴリー（MS-GPAC）。日本語版の Windows でも名前ではなく GUID で指定できる
  const FILE_SYSTEM_GUID = '{0CCE921D-69AE-11D9-BED3-505054503030}';
  const EVERYONE_SID = 'S-1-1-0';
  // auditctl(8): キーは31バイトまで
  const MAX_KEY_BYTES = 31;
  // x86_64 の openat の番号と、AT_FDCWD（-100）を符号なしで表した値
  const SYSCALL_OPENAT = 257;
  const AT_FDCWD = 'ffffff9c';

  const OS_LIST = ['linux', 'windows', 'macos'];

  // 置き場所のパスの形。/ で始まれば posix、ドライブ文字か \\ で始まれば windows
  function pathStyle(place) {
    const p = String(place || '');
    if (!p) return 'none';
    if (p.startsWith('/')) return 'posix';
    if (/^[A-Za-z]:\\/.test(p) || p.startsWith('\\\\')) return 'windows';
    return 'other';
  }

  // 例のパスに使う名前（区切り文字を _ にする）
  const baseName = (fileName) => String(fileName || 'canary.txt').replace(/[/\\]/g, '_');

  const EXAMPLE_DIR = { linux: '/srv/share/', macos: '/Users/Shared/', windows: 'C:\\Share\\' };
  const WANT_STYLE = { linux: 'posix', macos: 'posix', windows: 'windows' };

  // その OS で使うパス。台帳の置き場所が OS に合わなければ、例のパスを使う
  function pathFor(os, canary) {
    const place = canary.place || '';
    if (pathStyle(place) === WANT_STYLE[os]) return { path: place, example: false };
    return { path: EXAMPLE_DIR[os] + baseName(canary.fileName), example: true };
  }

  // シェル（bash）の引数。安全な文字だけなら囲まない。' は '\'' にする
  function shQuote(s) {
    if (/^[A-Za-z0-9_./=:,+@%-]+$/.test(s)) return s;
    return `'${s.split("'").join("'\\''")}'`;
  }

  // PowerShell の単一引用符の文字列。' は '' にする
  const psQuote = (s) => `'${String(s).split("'").join("''")}'`;

  const utf8 = (s) => new TextEncoder().encode(s);

  // auditd のキー。トークンが31バイトに収まればトークンそのもの（ログからトークンで台帳を引ける）
  function auditKey(canary) {
    const t = canary.token || '';
    return t && utf8(t).length <= MAX_KEY_BYTES ? t : 'canary';
  }

  function issuesFor(path) {
    const issues = [];
    if (/\s/.test(path)) issues.push('mon.issue.space');
    return issues;
  }

  function linuxSetup(canary) {
    const { path, example } = pathFor('linux', canary);
    const key = auditKey(canary);
    const rule = (arch) => `-a always,exit -F arch=${arch} -F ${shQuote(`path=${path}`)} -F perm=r -k ${key}`;
    const ruleFile = (arch) => `-a always,exit -F arch=${arch} -F path=${path} -F perm=r -k ${key}`;
    return {
      os: 'linux', path, example, key, issues: issuesFor(path),
      steps: [
        { key: 'mon.linux.temp', code: [`sudo auditctl ${rule('b64')}`, `sudo auditctl ${rule('b32')}`].join('\n') },
        { key: 'mon.linux.persist', code: [ruleFile('b64'), ruleFile('b32')].join('\n') },
        { key: 'mon.linux.load', code: 'sudo augenrules --load' },
        { key: 'mon.linux.check', code: ['sudo auditctl -l', `sudo ausearch -k ${key} -i`].join('\n') }
      ]
    };
  }

  function windowsSetup(canary) {
    const { path, example } = pathFor('windows', canary);
    return {
      os: 'windows', path, example, key: '', issues: [],
      steps: [
        { key: 'mon.windows.policy', code: `auditpol /set /subcategory:"${FILE_SYSTEM_GUID}" /success:enable` },
        {
          key: 'mon.windows.sacl',
          code: [
            `$path = ${psQuote(path)}`,
            '$acl = Get-Acl -LiteralPath $path -Audit',
            `$sid = New-Object System.Security.Principal.SecurityIdentifier('${EVERYONE_SID}')`,
            "$rule = New-Object System.Security.AccessControl.FileSystemAuditRule($sid, 'ReadData', 'Success')",
            '$acl.AddAuditRule($rule)',
            'Set-Acl -LiteralPath $path -AclObject $acl'
          ].join('\n')
        },
        {
          key: 'mon.windows.check',
          code: [
            "Get-WinEvent -FilterHashtable @{ LogName = 'Security'; Id = 4663 } -MaxEvents 500 |",
            `  Where-Object { $_.Message.Contains(${psQuote(path)}) } |`,
            '  Select-Object TimeCreated, Message'
          ].join('\n')
        }
      ]
    };
  }

  function macSetup(canary) {
    const { path, example } = pathFor('macos', canary);
    return {
      os: 'macos', path, example, key: '', issues: issuesFor(path),
      steps: [
        { key: 'mon.mac.events', code: 'eslogger --list-events' },
        { key: 'mon.mac.watch', code: `sudo eslogger open | grep -F ${shQuote(path)}` }
      ]
    };
  }

  const setup = (os, canary) => ({ linux: linuxSetup, windows: windowsSetup, macos: macSetup }[os](canary));

  // ===== 擬似ログ =====
  // トークンから決まる数（同じ通知はいつも同じ見た目になる）。FNV-1a 32ビット
  function seedOf(s) {
    let h = 0x811c9dc5;
    for (const b of utf8(String(s))) {
      h ^= b;
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h;
  }

  // auditd の文字列のフィールド。印字できる ASCII（空白と " を除く）だけなら "…"、そうでなければ UTF-8 の16進（大文字、引用符なし）
  function auditString(s) {
    const str = String(s);
    if (/^[\x21\x23-\x7e]+$/.test(str)) return `"${str}"`;
    return [...utf8(str)].map((b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();
  }

  const PROGRAMS = {
    linux: { comm: 'cat', exe: '/usr/bin/cat', cwd: '/home/analyst' },
    windows: { process: 'C:\\Windows\\System32\\notepad.exe' }
  };

  function auditdLog(alert, canary) {
    const { path } = pathFor('linux', { ...canary, place: alert.place || canary.place });
    const seed = seedOf(alert.token || alert.fileName);
    const at = Math.max(0, Math.floor(alert.at));
    const stamp = `audit(${Math.floor(at / 1000)}.${String(at % 1000).padStart(3, '0')}:${1000 + (seed % 90000)})`;
    const pid = 2000 + (seed % 30000);
    const p = PROGRAMS.linux;
    const key = auditKey({ token: alert.token });
    return [
      `type=SYSCALL msg=${stamp}: arch=c000003e syscall=${SYSCALL_OPENAT} success=yes exit=3 a0=${AT_FDCWD} a1=7ffd${seed.toString(16).padStart(8, '0')}`
        + ` a2=0 a3=0 items=1 ppid=${pid - 7} pid=${pid} auid=1000 uid=1000 gid=1000 euid=1000 suid=1000 fsuid=1000 egid=1000 sgid=1000`
        + ` fsgid=1000 tty=pts0 ses=${1 + (seed % 9)} comm=${auditString(p.comm)} exe=${auditString(p.exe)} key=${auditString(key)}`,
      `type=CWD msg=${stamp}:  cwd=${auditString(p.cwd)}`,
      `type=PATH msg=${stamp}: item=0 name=${auditString(path)} inode=${1000000 + (seed % 900000)} dev=08:01 mode=0100644`
        + ' ouid=0 ogid=0 rdev=00:00 nametype=NORMAL'
    ].join('\n');
  }

  const xmlEscape = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  function event4663(alert, canary) {
    const { path } = pathFor('windows', { ...canary, place: alert.place || canary.place });
    const seed = seedOf(alert.token || alert.fileName);
    const iso = new Date(Math.max(0, alert.at)).toISOString().replace(/\.(\d{3})Z$/, '.$1000000Z');
    const hex = (n) => `0x${n.toString(16)}`;
    return [
      '<Event xmlns="http://schemas.microsoft.com/win/2004/08/events/event">',
      '  <System>',
      '    <Provider Name="Microsoft-Windows-Security-Auditing" Guid="{54849625-5478-4994-A5BA-3E3B0328C30D}" />',
      '    <EventID>4663</EventID>',
      '    <Task>12800</Task>',
      '    <Keywords>0x8020000000000000</Keywords>',
      `    <TimeCreated SystemTime="${iso}" />`,
      `    <EventRecordID>${100000 + (seed % 900000)}</EventRecordID>`,
      '    <Channel>Security</Channel>',
      '    <Computer>FILESRV01.example.local</Computer>',
      '  </System>',
      '  <EventData>',
      `    <Data Name="SubjectUserSid">S-1-5-21-0-0-0-${1100 + (seed % 800)}</Data>`,
      '    <Data Name="SubjectUserName">analyst</Data>',
      '    <Data Name="SubjectDomainName">EXAMPLE</Data>',
      `    <Data Name="SubjectLogonId">${hex(0x40000 + (seed % 0xffff))}</Data>`,
      '    <Data Name="ObjectServer">Security</Data>',
      '    <Data Name="ObjectType">File</Data>',
      `    <Data Name="ObjectName">${xmlEscape(path)}</Data>`,
      `    <Data Name="HandleId">${hex(0x100 + (seed % 0xf00))}</Data>`,
      '    <Data Name="AccessList">%%4416</Data>',
      '    <Data Name="AccessMask">0x1</Data>',
      `    <Data Name="ProcessId">${hex(0x400 + (seed % 0x3000))}</Data>`,
      `    <Data Name="ProcessName">${xmlEscape(PROGRAMS.windows.process)}</Data>`,
      '    <Data Name="ResourceAttributes">-</Data>',
      '  </EventData>',
      '</Event>'
    ].join('\n');
  }

  const LOG_KINDS = ['auditd', 'event4663'];
  const pseudoLog = (kind, alert, canary = {}) => (kind === 'auditd' ? auditdLog(alert, canary) : event4663(alert, canary));

  globalThis.CanaryMonitor = {
    FILE_SYSTEM_GUID, EVERYONE_SID, MAX_KEY_BYTES, SYSCALL_OPENAT, OS_LIST, LOG_KINDS, EXAMPLE_DIR,
    pathStyle, pathFor, shQuote, psQuote, auditKey, auditString, setup, pseudoLog
  };
})();
