import test from 'node:test';
import assert from 'node:assert/strict';
import { core, load } from './load.js';

const C = core();
const M = load('js/monitor.js').CanaryMonitor;
const BS = String.fromCharCode(92);
const A = 'EDU_VTPVXVR14D2PF2DB_FAKE';
const posix = { token: A, fileName: 'passwords.txt', at: 1, place: '/srv/share/passwords.txt' };
const win = { token: A, fileName: 'budget.xlsx', at: 1, place: `C:${BS}Share${BS}Finance${BS}budget.xlsx` };
const none = { token: A, fileName: '.aws/credentials', at: 1, place: '' };

test('置き場所の形を見分ける（/ で始まれば posix、ドライブ文字か \\\\ で始まれば windows）', () => {
  assert.equal(M.pathStyle('/srv/x'), 'posix');
  assert.equal(M.pathStyle(`C:${BS}x`), 'windows');
  assert.equal(M.pathStyle(`${BS}${BS}server${BS}HR${BS}x`), 'windows');
  assert.equal(M.pathStyle('docs/x'), 'other');
  assert.equal(M.pathStyle(''), 'none');
});

test('OS に合わない置き場所なら、例のパス（区切り文字は _）を使う', () => {
  assert.deepEqual(M.pathFor('linux', posix), { path: '/srv/share/passwords.txt', example: false });
  assert.deepEqual(M.pathFor('windows', posix), { path: `C:${BS}Share${BS}passwords.txt`, example: true });
  assert.deepEqual(M.pathFor('macos', win), { path: '/Users/Shared/budget.xlsx', example: true });
  assert.deepEqual(M.pathFor('linux', none), { path: '/srv/share/.aws_credentials', example: true });
});

test('auditd: 推奨の syscall 形式（-F path・perm=r）で、64ビットと32ビットの両方。キーはトークン（31バイト以内）', () => {
  const s = M.setup('linux', posix);
  assert.equal(s.key, A);
  assert.ok(A.length <= M.MAX_KEY_BYTES);
  assert.equal(s.steps[0].code, [
    `sudo auditctl -a always,exit -F arch=b64 -F path=/srv/share/passwords.txt -F perm=r -k ${A}`,
    `sudo auditctl -a always,exit -F arch=b32 -F path=/srv/share/passwords.txt -F perm=r -k ${A}`
  ].join('\n'));
  assert.equal(s.steps[1].code.split('\n')[0], `-a always,exit -F arch=b64 -F path=/srv/share/passwords.txt -F perm=r -k ${A}`);
  assert.equal(s.steps[2].code, 'sudo augenrules --load');
  assert.equal(s.steps[3].code, `sudo auditctl -l\nsudo ausearch -k ${A} -i`);
  assert.doesNotMatch(s.steps.map((x) => x.code).join('\n'), / -w | -p /);
});

test('シェルの引用: 空白や引用符を含むパスは単一引用符で囲み、指摘を付ける', () => {
  const s = M.setup('linux', { ...posix, place: "/srv/it's share/pw.txt" });
  assert.ok(s.steps[0].code.includes(`-F 'path=/srv/it'${BS}''s share/pw.txt'`));
  assert.deepEqual(s.issues, ['mon.issue.space']);
  assert.equal(M.shQuote('/srv/a-b_c.txt'), '/srv/a-b_c.txt');
});

test('Windows: サブカテゴリーは GUID で有効にし、SACL は Everyone（S-1-1-0）の ReadData の成功。確認はイベント 4663', () => {
  const s = M.setup('windows', win);
  assert.equal(s.steps[0].code, 'auditpol /set /subcategory:"{0CCE921D-69AE-11D9-BED3-505054503030}" /success:enable');
  const sacl = s.steps[1].code.split('\n');
  assert.equal(sacl[0], `$path = 'C:${BS}Share${BS}Finance${BS}budget.xlsx'`);
  assert.ok(sacl.includes("$rule = New-Object System.Security.AccessControl.FileSystemAuditRule($sid, 'ReadData', 'Success')"));
  assert.ok(sacl.includes('$acl = Get-Acl -LiteralPath $path -Audit'));
  assert.match(s.steps[2].code, /Id = 4663/);
  assert.equal(M.psQuote("C:\\it's"), "'C:\\it''s'");
});

test('macOS: eslogger でファイルを開くイベントを見て、パスで絞る', () => {
  const s = M.setup('macos', posix);
  assert.equal(s.steps[0].code, 'eslogger --list-events');
  assert.equal(s.steps[1].code, 'sudo eslogger open | grep -F /srv/share/passwords.txt');
});

test('auditd の擬似ログ: SYSCALL・CWD・PATH の3行が同じ時刻と番号を持ち、キーはトークン、パスは置き場所', () => {
  const alert = { at: Date.UTC(2026, 0, 2, 3, 4, 5, 67), fileName: 'passwords.txt', token: A, place: posix.place };
  const log = M.pseudoLog('auditd', alert, posix);
  const lines = log.split('\n');
  assert.equal(lines.length, 3);
  const stamps = lines.map((l) => l.match(/msg=audit\((\d+\.\d{3}):(\d+)\):/));
  assert.ok(stamps.every(Boolean));
  assert.equal(stamps[0][1], `${Math.floor(alert.at / 1000)}.067`);
  assert.ok(stamps.every((m) => m[0] === stamps[0][0]));
  assert.match(lines[0], /^type=SYSCALL .* arch=c000003e syscall=257 success=yes .* items=1 .* key="EDU_VTPVXVR14D2PF2DB_FAKE"$/);
  assert.match(lines[0], / a1=7ffd[0-9a-f]{8} /);
  assert.match(lines[1], /^type=CWD msg=audit\([^)]+\): {2}cwd="\/home\/analyst"$/);
  assert.match(lines[2], /^type=PATH .* item=0 name="\/srv\/share\/passwords.txt" .* nametype=NORMAL$/);
  assert.equal(M.pseudoLog('auditd', alert, posix), log);
});

test('auditd の文字列: 空白・引用符・日本語を含むものは UTF-8 の16進で書く', () => {
  assert.equal(M.auditString('/srv/x.txt'), '"/srv/x.txt"');
  assert.equal(M.auditString('/srv/my file'), '2F7372762F6D792066696C65');
  assert.equal(M.auditString('/srv/機密'), '2F7372762FE6A99FE5AF86');
});

test('イベント 4663 の擬似ログ: ObjectName は置き場所、AccessList は %%4416（ReadData）、AccessMask は 0x1。XML の特殊文字は逃がす', () => {
  const alert = { at: Date.UTC(2026, 0, 2, 3, 4, 5, 67), fileName: 'budget.xlsx', token: A, place: win.place };
  const xml = M.pseudoLog('event4663', alert, win);
  assert.ok(xml.includes(`<Data Name="ObjectName">C:${BS}Share${BS}Finance${BS}budget.xlsx</Data>`));
  assert.ok(xml.includes('<EventID>4663</EventID>'));
  assert.ok(xml.includes('<Data Name="AccessList">%%4416</Data>'));
  assert.ok(xml.includes('<Data Name="AccessMask">0x1</Data>'));
  assert.ok(xml.includes('<TimeCreated SystemTime="2026-01-02T03:04:05.067000000Z" />'));
  const amp = M.pseudoLog('event4663', { ...alert, place: `C:${BS}R&D${BS}<x>.txt` }, win);
  assert.ok(amp.includes(`C:${BS}R&amp;D${BS}&lt;x&gt;.txt`));
});

test('擬似ログを特定に貼ると、台帳のファイルに戻る（auditd はキーのトークン、4663 は置き場所のパス）', () => {
  const ledger = [{ ...posix, notice: true, memo: '' }, { ...win, token: 'EDU_000G40R40M30E209_FAKE', notice: true, memo: '' }];
  const audit = M.pseudoLog('auditd', { at: 5, fileName: posix.fileName, token: posix.token, place: posix.place }, ledger[0]);
  const r1 = C.findInText(audit, ledger);
  assert.ok(r1.hits.some((h) => h.kind === 'exact' && h.token === A));
  assert.ok(r1.hits.some((h) => h.kind === 'place' && h.token === A));
  const xml = M.pseudoLog('event4663', { at: 5, fileName: win.fileName, token: ledger[1].token, place: win.place }, ledger[1]);
  const r2 = C.findInText(xml, ledger);
  assert.deepEqual(r2.hits.map((h) => `${h.kind}:${h.token}`), ['place:EDU_000G40R40M30E209_FAKE']);
});

test('監視の設定の手順・指摘・OS の名前の文言は、日英の辞書にある', () => {
  const { MESSAGES } = load('js/messages.js').CanaryMessages;
  for (const os of M.OS_LIST) {
    for (const c of [posix, win, { ...posix, place: '/srv/a b/x' }]) {
      const s = M.setup(os, c);
      for (const k of [...s.steps.map((x) => x.key), ...s.issues, `mon.os.${os}`]) {
        for (const lang of ['ja', 'en']) assert.ok(MESSAGES[lang][k], `${lang} ${k}`);
      }
    }
  }
});
