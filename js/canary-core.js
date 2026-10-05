// Canary File Generator の計算部（DOM を使わない）。トークン、ファイル本文の組み立て、ファイル名の検査、ダミーテキスト、記録の検証
// file:// でも動くように ES module にせず、通常のスクリプトとして読んで globalThis.CanaryCore に置く
(() => {
  'use strict';

  // ===== トークン =====
  // EDU_ ＋ Crockford の Base32 で16文字（80ビット）＋ _FAKE。I・L・O・U を使わないので読み違えにくい。
  // EDU_ と _FAKE は教育用の標識で、どのサービスの鍵の形式にも当たらない（secret scanning に拾われない）
  const B32 = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  const TOKEN_BYTES = 10;
  const TOKEN_RE = /^EDU_[0-9A-HJKMNP-TV-Z]{16}_FAKE$/;
  const PLACEHOLDER = '{{TOKEN}}';
  const DATE_PLACEHOLDER = '{{DATE}}';

  function randomBytes(n) {
    const a = new Uint8Array(n);
    globalThis.crypto.getRandomValues(a);
    return a;
  }

  // 0〜n-1 の整数（偏りが出ないように、端数の範囲は引き直す）
  function randomInt(n) {
    const limit = Math.floor(0x100000000 / n) * n;
    const a = new Uint32Array(1);
    do globalThis.crypto.getRandomValues(a); while (a[0] >= limit);
    return a[0] % n;
  }

  function makeToken(bytes = randomBytes(TOKEN_BYTES)) {
    if (bytes.length !== TOKEN_BYTES) throw new RangeError(`token needs ${TOKEN_BYTES} bytes`);
    let value = 0;
    let bits = 0;
    let out = '';
    for (const b of bytes) {
      value = (value << 8) | b;
      bits += 8;
      while (bits >= 5) {
        out += B32[(value >>> (bits - 5)) & 31];
        bits -= 5;
      }
      value &= (1 << bits) - 1;
    }
    return `EDU_${out}_FAKE`;
  }

  const isToken = (s) => typeof s === 'string' && TOKEN_RE.test(s);

  // ===== 日時 =====
  const pad = (n) => String(n).padStart(2, '0');
  const formatDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  // この端末の時刻で「YYYY-MM-DD HH:mm:ss」
  const formatLocal = (d) => `${formatDate(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

  // 以前の版が保存した「YYYY-MM-DD HH:mm:ss」（この端末の時刻）を、ミリ秒に戻す
  function parseLocalTime(s) {
    const m = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/.exec(String(s));
    if (!m) return NaN;
    return new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]).getTime();
  }

  // ===== ファイル本文 =====
  const NOTICE_HEADER = [
    '[EDUCATIONAL CANARY FILE - DO NOT USE IN PRODUCTION]',
    'Canary/Honey File (Educational Placeholder)'
  ];
  const DIVIDER = '========================================';

  // 本文を組み立てる。トークンは必ず入れる。
  // - 誘引テキストの {{TOKEN}} をすべてトークンに置き換える。1つもなければ、末尾に「Ref: トークン」の1行を足す
  // - 誘引テキストの {{DATE}} は date（YYYY-MM-DD）に置き換える
  // - 教育用メッセージを入れるときは、冒頭の見出しにもトークンを書く
  // 戻り値の places は、トークンを書いた場所（header・body・end）とその数
  function buildContent({ token, body = '', includeNotice = true, notice = '', generatedAt = '', date = '' }) {
    if (!isToken(token)) throw new TypeError('invalid token');
    const parts = String(body).trim().split(PLACEHOLDER);
    let text = parts.join(token).split(DATE_PLACEHOLDER).join(date);
    const places = { header: 0, body: parts.length - 1, end: 0 };
    if (places.body === 0) {
      text = text ? `${text}\n\nRef: ${token}` : `Ref: ${token}`;
      places.end = 1;
    }
    let head = '';
    if (includeNotice) {
      const lines = [...NOTICE_HEADER, `Token: ${token}`, `Generated: ${generatedAt}`, 'WARNING: All credentials in this file are FAKE', ''];
      const n = String(notice).trim();
      if (n) lines.push(n);
      head = `${lines.join('\n')}\n\n${DIVIDER}\n\n`;
      places.header = 1;
    }
    return { content: `${head}${text}\n`, places };
  }

  // ===== ダミーテキスト =====
  const WORDS = [
    'lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipiscing', 'elit',
    'sed', 'do', 'eiusmod', 'tempor', 'incididunt', 'ut', 'labore', 'et', 'dolore',
    'magna', 'aliqua', 'enim', 'ad', 'minim', 'veniam', 'quis', 'nostrud',
    'exercitation', 'ullamco', 'laboris', 'nisi', 'aliquip', 'ex', 'ea', 'commodo',
    'consequat', 'duis', 'aute', 'irure', 'in', 'reprehenderit', 'voluptate',
    'velit', 'esse', 'cillum', 'fugiat', 'nulla', 'pariatur', 'excepteur', 'sint',
    'occaecat', 'cupidatat', 'non', 'proident', 'sunt', 'culpa', 'qui', 'officia',
    'deserunt', 'mollit', 'anim', 'id', 'est', 'laborum', 'data', 'value', 'key',
    'token', 'secret', 'password', 'user', 'admin', 'root', 'system', 'config',
    'database', 'server', 'client', 'network', 'protocol', 'encryption', 'hash',
    'algorithm', 'security', 'access', 'control', 'permission', 'authentication'
  ];

  // 15〜24行。行ごとに、見出し（20%）・区切り線・「キー: 値」・文のどれかにする。行は改行（LF）でつなぐ。
  // randInt(n) は 0〜n-1 の整数を返す関数（テストでは種つきの乱数を渡す）
  function dummyText(randInt = randomInt) {
    const lines = [];
    const numLines = 15 + randInt(10);
    for (let i = 0; i < numLines; i++) {
      const line = [];
      const wordsPerLine = 5 + randInt(10);
      for (let j = 0; j < wordsPerLine; j++) line.push(WORDS[randInt(WORDS.length)]);
      if (randInt(100) < 20) {
        lines.push(`# ${line.slice(0, 3).join(' ').toUpperCase()}`);
      } else if (randInt(100) < 10) {
        lines.push('---');
      } else if (randInt(100) < 15) {
        lines.push(`${line[0]}: ${line.slice(1, 4).join('_')}_${randInt(10000)}`);
      } else {
        lines.push(`${line.join(' ')}.`);
      }
    }
    return lines.join('\n');
  }

  // ===== ファイル名 =====
  const DEFAULT_NAME = 'canary.txt';
  // どの名前でも、ブラウザーが拡張子（.txt）を足さないように application/octet-stream で渡す
  // （Chromium・Edge は text/plain だと passwd を passwd.txt にする。2026-10-06 実測）
  const MIME = 'application/octet-stream';
  const MAX_NAME = 120;
  const RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\..*)?$/i;
  // ブラウザーが .download を付けたり置き換えたりする拡張子
  const BLOCKED_EXT = ['lnk', 'url', 'scf', 'desktop'];
  const TEXT_EXT = ['txt', 'log', 'csv', 'md', 'conf', 'cfg', 'ini', 'env', 'json', 'yml', 'yaml', 'xml', 'sql', 'sh', 'pem', 'key'];
  const ISSUE_LEVEL = {
    'name.separator': 'warn', 'name.invalidChar': 'warn', 'name.leadingDot': 'warn', 'name.trailingDot': 'warn',
    'name.reserved': 'warn', 'name.blockedExt': 'warn', 'name.long': 'warn', 'name.textContent': 'info', 'name.noExt': 'info'
  };

  // 名前の最後の部分の拡張子（小文字）。先頭のドットだけの名前（.env）は拡張子なし
  function extOf(name) {
    const base = String(name).split(/[/\\]/).pop().replace(/^\.+/, '');
    const i = base.lastIndexOf('.');
    return i > 0 && i < base.length - 1 ? base.slice(i + 1).toLowerCase() : '';
  }

  const hasControl = (s) => [...s].some((ch) => {
    const c = ch.codePointAt(0);
    return c < 32 || c === 127;
  });

  // 名前を検査する。saveAs は保存される名前の目安（区切りを _ に、先頭のドットを外す。Chromium・Firefox の実測と同じ）
  function checkFileName(input) {
    const raw = String(input ?? '').trim();
    const name = raw || DEFAULT_NAME;
    const codes = [];
    if (/[/\\]/.test(name)) codes.push('name.separator');
    if (/[<>:"|?*]/.test(name) || hasControl(name)) codes.push('name.invalidChar');
    if (name.startsWith('.')) codes.push('name.leadingDot');
    if (/[. ]$/.test(name)) codes.push('name.trailingDot');
    const base = name.split(/[/\\]/).pop();
    if (RESERVED.test(base) || base.toLowerCase() === 'desktop.ini') codes.push('name.reserved');
    const ext = extOf(name);
    if (BLOCKED_EXT.includes(ext)) codes.push('name.blockedExt');
    if (name.length > MAX_NAME) codes.push('name.long');
    if (!ext) codes.push('name.noExt');
    else if (!TEXT_EXT.includes(ext) && !BLOCKED_EXT.includes(ext)) codes.push('name.textContent');
    const saveAs = name.replace(/[/\\]/g, '_').replace(/^\.+/, '');
    return { name, defaulted: !raw, ext, saveAs, issues: codes.map((code) => ({ code, level: ISSUE_LEVEL[code] })) };
  }

  // ===== 記録（生成したファイルの台帳と、擬似通知） =====
  const MAX_ITEMS = 200;
  // 時間の経過による色分け（分）。5分未満・30分未満・60分未満・それ以降
  const PRIORITY = [[5, 'critical'], [30, 'warning'], [60, 'info']];

  function priority(atMs, nowMs) {
    const minutes = (nowMs - atMs) / 60000;
    for (const [limit, name] of PRIORITY) if (minutes < limit) return name;
    return 'muted';
  }

  const str = (v, max) => (typeof v === 'string' && v.length <= max ? v : null);
  // 以前の版のトークン（EDU_時刻_乱数_FAKE）も表示できるように、英数字と _ - だけの64文字までを受け付ける
  const legacyToken = (v) => (typeof v === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(v) ? v : '');
  const isObject = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);

  function normalizeCanary(x) {
    if (!isObject(x) || !isToken(x.token) || !Number.isFinite(x.at)) return null;
    const fileName = str(x.fileName, 260);
    if (!fileName) return null;
    return { token: x.token, fileName, at: x.at, notice: x.notice === true };
  }

  // 以前の版の { time: 'YYYY-MM-DD HH:mm:ss', type, ... } も読む
  function normalizeAlert(x) {
    if (!isObject(x)) return null;
    const at = Number.isFinite(x.at) ? x.at : parseLocalTime(x.time);
    const fileName = str(x.fileName, 260);
    if (!Number.isFinite(at) || !fileName) return null;
    return { at, fileName, token: legacyToken(x.token), ua: str(x.ua ?? '', 512) ?? '' };
  }

  // 保存した JSON を読む。配列でない・JSON として読めないときは broken、形の合わない要素は捨てて数える
  function parseList(json, normalize) {
    if (json === null || json === undefined || json === '') return { items: [], dropped: 0, broken: false };
    let value;
    try {
      value = JSON.parse(json);
    } catch {
      return { items: [], dropped: 0, broken: true };
    }
    if (!Array.isArray(value)) return { items: [], dropped: 0, broken: true };
    const items = value.map(normalize).filter(Boolean);
    return { items: items.slice(-MAX_ITEMS), dropped: value.length - items.length, broken: false };
  }

  // 末尾に足して、上限を超えたら古いものから捨てる
  const append = (list, item) => [...list, item].slice(-MAX_ITEMS);

  globalThis.CanaryCore = {
    TOKEN_BYTES,
    PLACEHOLDER,
    DATE_PLACEHOLDER,
    DEFAULT_NAME,
    MIME,
    MAX_NAME,
    MAX_ITEMS,
    PRIORITY,
    WORDS,
    makeToken,
    isToken,
    randomInt,
    formatDate,
    formatLocal,
    parseLocalTime,
    buildContent,
    dummyText,
    extOf,
    checkFileName,
    priority,
    normalizeCanary,
    normalizeAlert,
    parseList,
    append
  };
})();
