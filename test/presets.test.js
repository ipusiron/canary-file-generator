import test from 'node:test';
import assert from 'node:assert/strict';
import { core, presets } from './load.js';

const C = core();
const { PRESETS, byId } = presets();
const BS = String.fromCharCode(92);
const TOKEN = 'EDU_VTPVXVR14D2PF2DB_FAKE';

test('プリセットは7つ。名前と id は重ならない', () => {
  assert.deepEqual(PRESETS.map((p) => p.name),
    ['passwords.txt', 'confidential.pdf', 'budget.xlsx', 'secrets.docx', 'id_rsa', 'api_keys.txt', 'passwd']);
  assert.equal(new Set(PRESETS.map((p) => p.id)).size, PRESETS.length);
  assert.equal(byId('passwd').name, 'passwd');
  assert.equal(byId('nothing'), null);
});

test('中身に制御文字（改行を除く）がない', () => {
  for (const p of PRESETS) {
    const bad = [...p.body].filter((ch) => { const c = ch.codePointAt(0); return (c < 32 && c !== 10) || c === 127; });
    assert.deepEqual(bad, [], p.name);
  }
});

test('secrets.docx の共有フォルダーのパスは、バックスラッシュを書いたとおりに残す', () => {
  const want = `Location: ${BS}${BS}fileserver${BS}backups${BS}customers.sql`;
  assert.ok(byId('secrets').body.includes(want));
});

test('どのプリセットにも {{TOKEN}} がちょうど1つあり、生成すると本文の中にトークンが入る', () => {
  for (const p of PRESETS) {
    assert.equal(p.body.split(C.PLACEHOLDER).length - 1, 1, p.name);
    const r = C.buildContent({ token: TOKEN, body: p.body, includeNotice: false, date: '2026-01-02' });
    assert.deepEqual(r.places, { header: 0, body: 1, end: 0 }, p.name);
    assert.ok(!r.content.includes('{{'), p.name);
  }
  assert.ok(C.buildContent({ token: TOKEN, body: byId('confidential').body, includeNotice: false, date: '2026-01-02' })
    .content.includes('Date: 2026-01-02'));
});

test('id_rsa の BEGIN と END の見出しは対になる', () => {
  const lines = byId('idrsa').body.split('\n');
  const begin = lines[0].match(/^-----BEGIN (.+)-----$/);
  const end = lines.at(-1).match(/^-----END (.+)-----$/);
  assert.ok(begin && end);
  assert.equal(end[1], begin[1]);
  assert.match(begin[1], /EXAMPLE/);
});

test('passwd の行は7つの欄（区切りの : が6つ）になっている', () => {
  const lines = byId('passwd').body.split('\n').slice(1);
  assert.ok(lines.length >= 20);
  for (const line of lines) assert.equal(line.split(':').length, 7, line);
});

// 本物の形式の鍵は置かない（公開リポジトリーに置かれると、secret scanning で発行元に通知されることがある）。
// 例外は AWS のドキュメントに載っている例の値だけ
test('偽の鍵は、本物の形式に当たらない', () => {
  const all = PRESETS.map((p) => p.body).join('\n');
  assert.doesNotMatch(all, /ghp_[A-Za-z0-9]{36}/);
  assert.doesNotMatch(all, /sk_(live|test)_[A-Za-z0-9]{24,}/);
  assert.doesNotMatch(all, /-----BEGIN (RSA |OPENSSH |EC )?PRIVATE KEY-----/);
  assert.deepEqual([...new Set(all.match(/AKIA[0-9A-Z]{16}/g))], ['AKIAIOSFODNN7EXAMPLE']);
  for (const p of PRESETS) assert.match(p.body, /EXAMPLE|DUMMY|FAKE/, p.name);
});
