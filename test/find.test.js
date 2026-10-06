import test from 'node:test';
import assert from 'node:assert/strict';
import { core } from './load.js';

const C = core();
const A = 'EDU_VTPVXVR14D2PF2DB_FAKE';
const B = 'EDU_000G40R40M30E209_FAKE';
const NL = String.fromCharCode(10);
const BS = String.fromCharCode(92);
const ledger = [
  { token: A, fileName: 'passwords.txt', at: 1, notice: true, place: '/srv/share/passwords.txt', memo: '経理' },
  { token: B, fileName: 'budget.xlsx', at: 2, notice: false, place: `C:${BS}Share${BS}budget.xlsx`, memo: '' }
];
const kinds = (r) => r.hits.map((h) => `${h.kind}:${h.token ?? h.found[0]}`).sort();

test('台帳のトークンと同じものは exact。行番号と、前後の文を返す', () => {
  const r = C.findInText(`first line${NL}leaked: user=admin pass=${A} end${NL}${A}`, ledger);
  assert.equal(r.tooLong, false);
  assert.equal(r.hits.length, 1);
  const h = r.hits[0];
  assert.equal(h.kind, 'exact');
  assert.equal(h.count, 2);
  assert.deepEqual(h.lines, [2, 3]);
  assert.deepEqual(h.matches.map((c) => c.fileName), ['passwords.txt']);
  assert.equal(h.snippet.match, A);
  assert.equal(h.snippet.before, 'leaked: user=admin pass=');
  assert.equal(h.snippet.after, ' end');
});

test('大文字小文字・区切りの - ・I/L/O の書き換えは variant として同じトークンに戻す', () => {
  const lower = A.toLowerCase();
  const dashed = A.replace(/_/g, '-');
  const ocr = A.replace('1', 'l').replace('0', 'O');
  for (const s of [lower, dashed, 'edu-vtpvxvrl4d2pf2db-fake', ocr]) {
    const r = C.findInText(`x ${s} y`, ledger);
    assert.deepEqual(kinds(r), [`variant:${A}`], s);
    assert.deepEqual(r.hits[0].found, [s]);
  }
  assert.equal(C.canonicalBody('vtpvxvrl4d2pf2db'), 'VTPVXVR14D2PF2DB');
  assert.equal(C.canonicalBody('VTPVXVR14D2PF2DU'), null);
});

test('1文字だけ違う台帳のトークンがあれば near、なければ unknown。中身が16文字でない・U を含むものは malformed', () => {
  const near = `EDU_VTPVXVR14D2PF2DC_FAKE`;
  const unknown = 'EDU_ZZZZZZZZZZZZZZZZ_FAKE';
  const short = 'EDU_VTPVXVR14D2PF2D_FAKE';
  const withU = 'EDU_VTPVXVR14D2PF2DU_FAKE';
  const r = C.findInText([near, unknown, short, withU].join(NL), ledger);
  assert.deepEqual(kinds(r), [`malformed:${short}`, `malformed:${withU}`, `near:${near}`, `unknown:${unknown}`].sort());
  assert.deepEqual(r.hits.find((h) => h.kind === 'near').matches.map((c) => c.token), [A]);
});

test('英数字に続く・続かれる文字列は拾わない（xEDU_…、…_FAKEx）', () => {
  assert.equal(C.findInText(`x${A}`, ledger).hits.length, 0);
  assert.equal(C.findInText(`${A}x`, ledger).hits.length, 0);
  assert.equal(C.findInText(`"${A}"`, ledger).hits.length, 1);
});

test('置き場所のパスでも引ける。Windows のパスは大文字小文字を区別せず、JSON の二重のバックスラッシュも拾う', () => {
  const winLower = `c:${BS}share${BS}budget.xlsx`;
  const json = `{"ObjectName":"C:${BS}${BS}Share${BS}${BS}budget.xlsx"}`;
  const r = C.findInText(`ObjectName: ${winLower}${NL}${json}${NL}name="/srv/share/passwords.txt"`, ledger);
  assert.deepEqual(kinds(r), [`place:${A}`, `place:${B}`].sort());
  assert.equal(r.hits.find((h) => h.token === B).count, 2);
  // POSIX のパスは大文字小文字を区別する
  assert.equal(C.findInText('/SRV/SHARE/PASSWORDS.TXT', ledger).hits.length, 0);
});

test('上限: 2,000,000文字を超える入力は扱わない。見つけた数が500を超えたら打ち切る', () => {
  assert.equal(C.findInText('a'.repeat(C.MAX_FIND_CHARS + 1), ledger).tooLong, true);
  const many = Array.from({ length: 600 }, () => A).join(' ');
  const r = C.findInText(many, ledger);
  assert.equal(r.truncated, true);
  assert.equal(r.hits[0].count, C.MAX_HITS);
  assert.ok(r.hits[0].lines.length <= 20);
});

test('200万文字の入力でも1秒以内に終わる', () => {
  const chunk = `noise ${'x'.repeat(90)}${NL}`;
  const big = chunk.repeat(Math.floor(C.MAX_FIND_CHARS / chunk.length) - 1) + A;
  const t0 = performance.now();
  const r = C.findInText(big, ledger);
  assert.ok(performance.now() - t0 < 1000);
  assert.equal(r.hits.find((h) => h.kind === 'exact').token, A);
});

test('台帳の書き出し（JSON）と読み込みは往復する。重なるトークンは足さない', () => {
  const json = C.ledgerToJson(ledger, new Date(Date.UTC(2026, 0, 2)));
  const doc = JSON.parse(json);
  assert.equal(doc.format, C.LEDGER_FORMAT);
  assert.equal(doc.version, 1);
  assert.equal(doc.exportedAt, '2026-01-02T00:00:00.000Z');
  const back = C.ledgerFromJson(json, []);
  assert.equal(back.ok, true);
  assert.equal(back.added, 2);
  assert.deepEqual(back.items, ledger);
  const again = C.ledgerFromJson(json, back.items);
  assert.deepEqual([again.added, again.duplicate, again.invalid], [0, 2, 0]);
});

test('台帳の読み込み: 形の合わない要素は数えて捨てる。配列だけでもよい。壊れた JSON・違う形式・大きすぎるものは読まない', () => {
  const r = C.ledgerFromJson(JSON.stringify([ledger[0], { token: 'x' }, null]), []);
  assert.deepEqual([r.ok, r.added, r.invalid], [true, 1, 2]);
  assert.deepEqual(C.ledgerFromJson('{', []), { ok: false, error: 'import.json' });
  assert.deepEqual(C.ledgerFromJson('{"items":[]}', []), { ok: false, error: 'import.format' });
  assert.deepEqual(C.ledgerFromJson(' '.repeat(C.MAX_IMPORT_CHARS + 1), []), { ok: false, error: 'import.tooLarge' });
});

test('台帳の読み込み: 古い順に並べ、上限を超えた分は古いものから捨てる', () => {
  const existing = Array.from({ length: C.MAX_ITEMS }, (_, i) => ({ ...ledger[0], token: C.makeToken(), at: 100 + i }));
  const r = C.ledgerFromJson(JSON.stringify([{ ...ledger[1], at: 5000 }]), existing);
  assert.equal(r.items.length, C.MAX_ITEMS);
  assert.equal(r.dropped, 1);
  assert.equal(r.items[r.items.length - 1].token, B);
  assert.equal(r.items[0].at, 101);
});

test("CSV は BOM・CRLF・引用符の二重化。式として解釈される先頭の文字には ' を付ける", () => {
  const rows = [{ ...ledger[0], memo: '=HYPERLINK("http://x")', fileName: 'a,b.txt' }, { ...ledger[1], memo: '@SUM(1)' }];
  const csv = C.ledgerToCsv(rows);
  assert.equal(csv.charCodeAt(0), 0xfeff);
  const lines = csv.slice(1).split(String.fromCharCode(13, 10));
  assert.equal(lines[0], 'token,fileName,place,memo,createdAt,notice');
  assert.equal(lines[1], `${A},"a,b.txt",/srv/share/passwords.txt,"'=HYPERLINK(""http://x"")",1970-01-01T00:00:00.001Z,true`);
  assert.ok(lines[2].includes(",'@SUM(1),"));
  assert.equal(lines[3], '');
});
