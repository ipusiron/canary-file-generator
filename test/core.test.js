import test from 'node:test';
import assert from 'node:assert/strict';
import { core, seeded } from './load.js';

const C = core();
const TOKEN = 'EDU_VTPVXVR14D2PF2DB_FAKE';

// 既知解答は ipusiron-work 側の ref/day054/token_ref.py で、標準の Base32 を Crockford の字母に置き換えて計算したもの
test('トークンは10バイトを Crockford の Base32 で16文字にする（既知解答）', () => {
  const cases = [
    [Array(10).fill(0), 'EDU_0000000000000000_FAKE'],
    [Array(10).fill(255), 'EDU_ZZZZZZZZZZZZZZZZ_FAKE'],
    [[0, 1, 2, 3, 4, 5, 6, 7, 8, 9], 'EDU_000G40R40M30E209_FAKE'],
    [[0xde, 0xad, 0xbe, 0xef, 0x01, 0x23, 0x45, 0x67, 0x89, 0xab], TOKEN]
  ];
  for (const [bytes, want] of cases) assert.equal(C.makeToken(Uint8Array.from(bytes)), want);
  assert.throws(() => C.makeToken(new Uint8Array(9)), RangeError);
});

test('乱数で作ったトークンは形式に合い、1000個がすべて異なる', () => {
  const seen = new Set();
  for (let i = 0; i < 1000; i++) {
    const t = C.makeToken();
    assert.ok(C.isToken(t), t);
    assert.doesNotMatch(t.slice(4, 20), /[ILOU]/);
    seen.add(t);
  }
  assert.equal(seen.size, 1000);
});

test('isToken は形式の違うもの（以前の版の形・小文字・字母にない文字・前後の空白）を受け付けない', () => {
  for (const s of ['EDU_MUVRAEVL_2CSF6MDFQ03_FAKE', 'edu_vtpvxvr14d2pf2db_fake', 'EDU_VTPVXVR14D2PF2DI_FAKE', ` ${TOKEN}`, '', null]) {
    assert.equal(C.isToken(s), false, String(s));
  }
});

test('randomInt は 0〜n-1 の整数を返す', () => {
  for (const n of [1, 2, 7, 100]) {
    for (let i = 0; i < 200; i++) {
      const v = C.randomInt(n);
      assert.ok(Number.isInteger(v) && v >= 0 && v < n, `${n}: ${v}`);
    }
  }
});

test('日時はこの端末の時刻で YYYY-MM-DD HH:mm:ss。以前の版の文字列はミリ秒に戻せる', () => {
  const d = new Date(2026, 0, 2, 3, 4, 5);
  assert.equal(C.formatLocal(d), '2026-01-02 03:04:05');
  assert.equal(C.formatDate(d), '2026-01-02');
  assert.equal(C.parseLocalTime('2026-01-02 03:04:05'), d.getTime());
  assert.ok(Number.isNaN(C.parseLocalTime('2026-01-02T03:04:05')));
  assert.ok(Number.isNaN(C.parseLocalTime('<img src=x>')));
});

test('本文: {{TOKEN}} があればすべて置き換え、末尾には足さない。{{DATE}} は日付に置き換わる', () => {
  const r = C.buildContent({ token: TOKEN, body: 'a {{TOKEN}}\nb {{TOKEN}}\nDate: {{DATE}}', includeNotice: false, date: '2026-01-02' });
  assert.equal(r.content, `a ${TOKEN}\nb ${TOKEN}\nDate: 2026-01-02\n`);
  assert.deepEqual(r.places, { header: 0, body: 2, end: 0 });
});

test('本文: {{TOKEN}} がなければ末尾に「Ref: トークン」を足す。教育用メッセージを外してもトークンは必ず入る', () => {
  const r = C.buildContent({ token: TOKEN, body: '  hello\n', includeNotice: false });
  assert.equal(r.content, `hello\n\nRef: ${TOKEN}\n`);
  assert.deepEqual(r.places, { header: 0, body: 0, end: 1 });
  const empty = C.buildContent({ token: TOKEN, body: '', includeNotice: false });
  assert.equal(empty.content, `Ref: ${TOKEN}\n`);
});

test('本文: 教育用メッセージを入れると、冒頭の見出しにトークンと生成日時を書く。冒頭テキストが空でも見出しは入る', () => {
  const r = C.buildContent({ token: TOKEN, body: 'x {{TOKEN}}', includeNotice: true, notice: ' Notice text ', generatedAt: '2026-01-02 03:04:05' });
  assert.equal(r.content, [
    '[EDUCATIONAL CANARY FILE - DO NOT USE IN PRODUCTION]',
    'Canary/Honey File (Educational Placeholder)',
    `Token: ${TOKEN}`,
    'Generated: 2026-01-02 03:04:05',
    'WARNING: All credentials in this file are FAKE',
    '',
    'Notice text',
    '',
    '========================================',
    '',
    `x ${TOKEN}`,
    ''
  ].join('\n'));
  assert.deepEqual(r.places, { header: 1, body: 1, end: 0 });
  const noText = C.buildContent({ token: TOKEN, body: 'x', includeNotice: true, notice: '   ' });
  assert.ok(noText.content.includes(`Token: ${TOKEN}`));
  assert.ok(noText.content.endsWith(`x\n\nRef: ${TOKEN}\n`));
  assert.deepEqual(noText.places, { header: 1, body: 0, end: 1 });
});

test('本文: トークンの形式が違えば組み立てない', () => {
  assert.throws(() => C.buildContent({ token: 'EDU_X_FAKE', body: 'x' }), TypeError);
});

test('ダミーテキストは15〜24行を本物の改行でつなぎ、文字どおりの「\\n」を含まない', () => {
  for (let seed = 1; seed <= 50; seed++) {
    const text = C.dummyText(seeded(seed));
    const lines = text.split('\n');
    assert.ok(lines.length >= 15 && lines.length <= 24, `${seed}: ${lines.length}`);
    assert.ok(!text.includes(String.fromCharCode(92)), String(seed));
    for (const line of lines) assert.match(line, /^(# [A-Z ]+|---|[a-z]+: [a-z_]+_\d{1,4}|[a-z ]+\.)$/, line);
  }
  assert.equal(C.dummyText(seeded(7)), C.dummyText(seeded(7)));
});

test('ファイル名の検査と、保存される名前の目安（2026-10-06 に Chromium・Firefox で実測した名前）', () => {
  const cases = [
    ['', 'canary.txt', 'canary.txt', []],
    ['  passwd  ', 'passwd', 'passwd', ['name.noExt']],
    ['id_rsa', 'id_rsa', 'id_rsa', ['name.noExt']],
    ['.env', '.env', 'env', ['name.leadingDot', 'name.noExt']],
    ['.aws/credentials', '.aws/credentials', 'aws_credentials', ['name.separator', 'name.leadingDot', 'name.noExt']],
    ['../../etc/passwd', '../../etc/passwd', '_.._etc_passwd', ['name.separator', 'name.leadingDot', 'name.noExt']],
    ['file.', 'file.', 'file.', ['name.trailingDot', 'name.noExt']],
    ['CON', 'CON', 'CON', ['name.reserved', 'name.noExt']],
    ['nul.txt', 'nul.txt', 'nul.txt', ['name.reserved']],
    ['desktop.ini', 'desktop.ini', 'desktop.ini', ['name.reserved']],
    ['shortcut.lnk', 'shortcut.lnk', 'shortcut.lnk', ['name.blockedExt']],
    ['budget.xlsx', 'budget.xlsx', 'budget.xlsx', ['name.textContent']],
    ['archive.tar.gz', 'archive.tar.gz', 'archive.tar.gz', ['name.textContent']],
    ['notes.TXT', 'notes.TXT', 'notes.TXT', []],
    ['bad|name.txt', 'bad|name.txt', 'bad|name.txt', ['name.invalidChar']],
    ['日本語の機密.pdf', '日本語の機密.pdf', '日本語の機密.pdf', ['name.textContent']]
  ];
  for (const [input, name, saveAs, codes] of cases) {
    const r = C.checkFileName(input);
    assert.equal(r.name, name, input);
    assert.equal(r.saveAs, saveAs, input);
    assert.deepEqual(r.issues.map((x) => x.code), codes, input);
    for (const x of r.issues) assert.ok(['warn', 'info'].includes(x.level), x.code);
  }
  assert.equal(C.checkFileName('').defaulted, true);
  const long = C.checkFileName(`${'a'.repeat(C.MAX_NAME)}.txt`);
  assert.deepEqual(long.issues.map((x) => x.code), ['name.long']);
  const ctrl = C.checkFileName(`a${String.fromCharCode(8)}b.txt`);
  assert.deepEqual(ctrl.issues.map((x) => x.code), ['name.invalidChar']);
});

test('中身の形式を渡すと、テキストのときだけ「中身はテキスト」、ほかの形式では拡張子との食い違いを指摘する', () => {
  const codes = (name, f) => C.checkFileName(name, f).issues.map((x) => x.code);
  assert.deepEqual(codes('budget.xlsx', 'text'), ['name.textContent']);
  assert.deepEqual(codes('budget.xlsx', 'xlsx'), []);
  assert.deepEqual(codes('budget.xlsx', 'docx'), ['name.formatMismatch']);
  assert.deepEqual(codes('passwd', 'pdf'), ['name.noExt', 'name.formatMismatch']);
  assert.deepEqual(codes('notes.txt', 'text'), []);
  assert.equal(C.checkFileName('notes.txt', 'docx').issues[0].level, 'info');
});

test('保存のときの MIME は、拡張子を足されない application/octet-stream', () => {
  assert.equal(C.MIME, 'application/octet-stream');
});

test('色分けは5分・30分・60分で変わる（境目はその分になった瞬間に次の段階）', () => {
  const now = Date.UTC(2026, 0, 1, 12, 0, 0);
  const at = (min) => now - min * 60000;
  assert.equal(C.priority(at(0), now), 'critical');
  assert.equal(C.priority(at(4.99), now), 'critical');
  assert.equal(C.priority(at(5), now), 'warning');
  assert.equal(C.priority(at(29.99), now), 'warning');
  assert.equal(C.priority(at(30), now), 'info');
  assert.equal(C.priority(at(60), now), 'muted');
  assert.equal(C.priority(now + 60000, now), 'critical');
});

test('通知の記録: 形の合わない要素は捨てる。以前の版の形（time・type）も読む。文字列はそのまま（描画は textContent）', () => {
  const old = { time: '2026-01-02 03:04:05', fileName: 'a.txt', type: 'text', token: 'EDU_MUVRAEVL_2CSF6MDFQ03_FAKE', ua: 'UA' };
  const xss = { at: 1, fileName: '<img src=x onerror=alert(1)>', token: '<b>t</b>', ua: '<script>' };
  const r = C.parseList(JSON.stringify([old, null, 3, 'x', [], { at: 1 }, xss, { time: '<img>', fileName: 'b' }]), C.normalizeAlert);
  assert.equal(r.broken, false);
  assert.equal(r.dropped, 6);
  assert.deepEqual(r.items, [
    { at: new Date(2026, 0, 2, 3, 4, 5).getTime(), fileName: 'a.txt', token: 'EDU_MUVRAEVL_2CSF6MDFQ03_FAKE', ua: 'UA', place: '' },
    { at: 1, fileName: '<img src=x onerror=alert(1)>', token: '', ua: '<script>', place: '' }
  ]);
});

test('記録の JSON が読めない・配列でないときは broken。空なら空の一覧', () => {
  assert.deepEqual(C.parseList('{"a":1}', C.normalizeAlert), { items: [], dropped: 0, broken: true });
  assert.deepEqual(C.parseList('[', C.normalizeAlert), { items: [], dropped: 0, broken: true });
  assert.deepEqual(C.parseList(null, C.normalizeAlert), { items: [], dropped: 0, broken: false });
  assert.deepEqual(C.parseList('[]', C.normalizeAlert), { items: [], dropped: 0, broken: false });
});

test('台帳: トークンの形式・日時・ファイル名がそろったものだけを読む', () => {
  const ok = { token: TOKEN, fileName: 'passwd', at: 5, notice: true, extra: 'x' };
  const r = C.parseList(JSON.stringify([ok, { ...ok, token: 'EDU_X_FAKE' }, { ...ok, at: 'now' }, { ...ok, fileName: '' }]), C.normalizeCanary);
  assert.deepEqual(r.items, [{ token: TOKEN, fileName: 'passwd', at: 5, notice: true, place: '', memo: '' }]);
  assert.equal(r.dropped, 3);
});

test('台帳: 置き場所とメモは任意。長すぎる・制御文字を含む・文字列でないものは空にする（記録そのものは残す）', () => {
  const base = { token: TOKEN, fileName: 'passwd', at: 5 };
  const pick = (x) => { const c = C.normalizeCanary({ ...base, ...x }); return [c.place, c.memo]; };
  assert.deepEqual(pick({ place: '/etc/passwd.old', memo: '経理の共有' }), ['/etc/passwd.old', '経理の共有']);
  assert.deepEqual(pick({ place: 'x'.repeat(C.MAX_PLACE + 1), memo: 'm'.repeat(C.MAX_MEMO + 1) }), ['', '']);
  assert.deepEqual(pick({ place: `a${String.fromCharCode(10)}b`, memo: 3 }), ['', '']);
});

test('記録は上限（200件）を超えたら古いものから捨てる', () => {
  let list = [];
  for (let i = 0; i < C.MAX_ITEMS + 5; i++) list = C.append(list, i);
  assert.equal(list.length, C.MAX_ITEMS);
  assert.equal(list[0], 5);
  const many = Array.from({ length: 250 }, (_, i) => ({ at: i, fileName: 'f' }));
  assert.equal(C.parseList(JSON.stringify(many), C.normalizeAlert).items.length, C.MAX_ITEMS);
});
