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

  // 置き場所のパスとメモは任意。長すぎる・制御文字を含むものは空にする
  const MAX_PLACE = 260;
  const MAX_MEMO = 200;
  const optional = (v, max) => {
    const s = str(v ?? '', max);
    return s === null || hasControl(s) ? '' : s;
  };

  function normalizeCanary(x) {
    if (!isObject(x) || !isToken(x.token) || !Number.isFinite(x.at)) return null;
    const fileName = str(x.fileName, 260);
    if (!fileName) return null;
    return { token: x.token, fileName, at: x.at, notice: x.notice === true, place: optional(x.place, MAX_PLACE), memo: optional(x.memo, MAX_MEMO) };
  }

  // 以前の版の { time: 'YYYY-MM-DD HH:mm:ss', type, ... } も読む
  function normalizeAlert(x) {
    if (!isObject(x)) return null;
    const at = Number.isFinite(x.at) ? x.at : parseLocalTime(x.time);
    const fileName = str(x.fileName, 260);
    if (!Number.isFinite(at) || !fileName) return null;
    return { at, fileName, token: legacyToken(x.token), ua: str(x.ua ?? '', 512) ?? '', place: optional(x.place, MAX_PLACE) };
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

  // ===== 特定（ログや流出したテキストから、トークンと置き場所を探す） =====
  const MAX_FIND_CHARS = 2000000;
  const MAX_HITS = 500;
  const MAX_LINES = 20;
  const SNIPPET = 60;
  // 大文字小文字・区切りの - ・Crockford の読み替え（I・L→1、O→0）を許して拾う。中身が16文字でないものは「形が崩れている」に分ける
  const LOOSE_RE = /(?<![0-9A-Za-z])EDU[_-]([0-9A-Za-z]{1,40})[_-]FAKE(?![0-9A-Za-z])/gi;

  function canonicalBody(raw) {
    const s = raw.toUpperCase().replace(/[IL]/g, '1').replace(/O/g, '0');
    return /^[0-9A-HJKMNP-TV-Z]{16}$/.test(s) ? s : null;
  }

  // 16文字のうち、ちょうど1文字だけ違う
  function differsByOne(a, b) {
    let d = 0;
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i] && ++d > 1) return false;
    return d === 1;
  }

  // 位置から行番号（1始まり）を引くための、各行の先頭の位置
  function lineIndex(text) {
    const starts = [0];
    for (let i = text.indexOf('\n'); i >= 0; i = text.indexOf('\n', i + 1)) starts.push(i + 1);
    const lineOf = (pos) => {
      let lo = 0;
      let hi = starts.length - 1;
      while (lo < hi) {
        const mid = (lo + hi + 1) >> 1;
        if (starts[mid] <= pos) lo = mid;
        else hi = mid - 1;
      }
      return lo;
    };
    const snippet = (pos, len) => {
      const i = lineOf(pos);
      const end = i + 1 < starts.length ? starts[i + 1] - 1 : text.length;
      const from = Math.max(starts[i], pos - SNIPPET);
      const to = Math.min(end, pos + len + SNIPPET);
      return {
        before: (from > starts[i] ? '…' : '') + text.slice(from, pos).replace(/\r$/, ''),
        match: text.slice(pos, pos + len),
        after: text.slice(pos + len, to).replace(/\r$/, '') + (to < end ? '…' : '')
      };
    };
    return { line: (pos) => lineOf(pos) + 1, snippet };
  }

  function addHit(map, key, base, pos, len, found, idx) {
    let hit = map.get(key);
    if (!hit) {
      hit = { ...base, found: [], count: 0, lines: [], snippet: idx.snippet(pos, len) };
      map.set(key, hit);
    }
    hit.count++;
    if (hit.found.length < 3 && !hit.found.includes(found)) hit.found.push(found);
    const line = idx.line(pos);
    if (hit.lines.length < MAX_LINES && !hit.lines.includes(line)) hit.lines.push(line);
  }

  // 置き場所のパスは、そのままの形と、JSON などでバックスラッシュを二重にした形の両方で探す。Windows のパスは大文字小文字を区別しない
  const isWindowsPath = (p) => /^[A-Za-z]:\\/.test(p) || /^\\\\/.test(p);

  function findPlaces(text, canaries, idx, hits) {
    const lower = text.toLowerCase();
    for (const c of canaries) {
      if (!c.place || c.place.length < 4) continue;
      const win = isWindowsPath(c.place);
      const hay = win ? lower : text;
      const forms = [...new Set([c.place, c.place.split('\\').join('\\\\')])].map((f) => (win ? f.toLowerCase() : f));
      for (const form of forms) {
        for (let pos = hay.indexOf(form); pos >= 0; pos = hay.indexOf(form, pos + form.length)) {
          addHit(hits, `p:${c.token}`, { kind: 'place', token: c.token, matches: [c] }, pos, form.length, text.slice(pos, pos + form.length), idx);
        }
      }
    }
  }

  // 結果の種類: exact（台帳のトークンと同じ）・variant（大文字小文字や I・L・O の書き換えだけ違う）・near（1文字だけ違う台帳のトークンがある）
  // ・unknown（形は正しいが台帳にない）・malformed（中身が16文字でない、字母にない文字）・place（置き場所のパスが見つかった）
  function findInText(text, canaries) {
    const s = String(text ?? '');
    if (s.length > MAX_FIND_CHARS) return { tooLong: true, hits: [], truncated: false };
    const byToken = new Map(canaries.map((c) => [c.token, c]));
    const idx = lineIndex(s);
    const hits = new Map();
    let total = 0;
    let truncated = false;
    for (const m of s.matchAll(LOOSE_RE)) {
      if (total >= MAX_HITS) {
        truncated = true;
        break;
      }
      total++;
      const found = m[0];
      const body = canonicalBody(m[1]);
      if (!body) {
        addHit(hits, `m:${found.toUpperCase()}`, { kind: 'malformed', token: null, matches: [] }, m.index, found.length, found, idx);
        continue;
      }
      const token = `EDU_${body}_FAKE`;
      const own = byToken.get(token);
      if (own) {
        const kind = found === token ? 'exact' : 'variant';
        addHit(hits, `${kind}:${token}`, { kind, token, matches: [own] }, m.index, found.length, found, idx);
      } else {
        const near = canaries.filter((c) => differsByOne(c.token.slice(4, 20), body));
        const kind = near.length ? 'near' : 'unknown';
        addHit(hits, `${kind}:${token}`, { kind, token, matches: near }, m.index, found.length, found, idx);
      }
    }
    findPlaces(s, canaries, idx, hits);
    return { tooLong: false, hits: [...hits.values()], truncated };
  }

  // ===== 台帳の書き出しと読み込み =====
  const LEDGER_FORMAT = 'canary-file-generator/ledger';
  const MAX_IMPORT_CHARS = 1000000;

  function ledgerToJson(canaries, now = new Date()) {
    const items = canaries.map((c) => ({
      token: c.token,
      fileName: c.fileName,
      place: c.place || '',
      memo: c.memo || '',
      at: c.at,
      createdAt: new Date(c.at).toISOString(),
      notice: c.notice === true
    }));
    return `${JSON.stringify({ format: LEDGER_FORMAT, version: 1, exportedAt: now.toISOString(), items }, null, 2)}\n`;
  }

  // 書き出した JSON（またはその items の配列）を読み、トークンが重ならないものだけを足す。古い順に並べ、上限を超えた分は古いものから捨てる
  function ledgerFromJson(text, existing) {
    const s = String(text ?? '');
    if (s.length > MAX_IMPORT_CHARS) return { ok: false, error: 'import.tooLarge' };
    let value;
    try {
      value = JSON.parse(s);
    } catch {
      return { ok: false, error: 'import.json' };
    }
    const items = Array.isArray(value) ? value : (isObject(value) && value.format === LEDGER_FORMAT && Array.isArray(value.items) ? value.items : null);
    if (!items) return { ok: false, error: 'import.format' };
    const have = new Set(existing.map((c) => c.token));
    const list = existing.slice();
    let added = 0;
    let duplicate = 0;
    let invalid = 0;
    for (const x of items) {
      const c = normalizeCanary(x);
      if (!c) invalid++;
      else if (have.has(c.token)) duplicate++;
      else {
        have.add(c.token);
        list.push(c);
        added++;
      }
    }
    list.sort((a, b) => a.at - b.at);
    const dropped = Math.max(0, list.length - MAX_ITEMS);
    return { ok: true, items: list.slice(-MAX_ITEMS), added, duplicate, invalid, dropped };
  }

  // CSV（RFC 4180、改行は CRLF、Excel で文字化けしないように BOM を付ける）。= + - @ などで始まる値は、表計算ソフトが式として
  // 解釈しないように先頭に ' を付ける（OWASP の CSV Injection の対策）
  function csvCell(v) {
    let s = String(v ?? '');
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }

  function ledgerToCsv(canaries) {
    const rows = [['token', 'fileName', 'place', 'memo', 'createdAt', 'notice']];
    for (const c of canaries) rows.push([c.token, c.fileName, c.place || '', c.memo || '', new Date(c.at).toISOString(), c.notice ? 'true' : 'false']);
    return String.fromCharCode(0xfeff) + rows.map((r) => r.map(csvCell).join(',')).join('\r\n') + '\r\n';
  }

  globalThis.CanaryCore = {
    TOKEN_BYTES,
    PLACEHOLDER,
    DATE_PLACEHOLDER,
    DEFAULT_NAME,
    MIME,
    MAX_NAME,
    MAX_ITEMS,
    MAX_PLACE,
    MAX_MEMO,
    MAX_FIND_CHARS,
    MAX_HITS,
    MAX_IMPORT_CHARS,
    LEDGER_FORMAT,
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
    append,
    canonicalBody,
    isWindowsPath,
    findInText,
    ledgerToJson,
    ledgerFromJson,
    ledgerToCsv
  };
})();
