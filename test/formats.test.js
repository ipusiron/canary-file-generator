import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './load.js';

const F = load('js/formats.js').CanaryFormats;
const P = load('js/presets.js').CanaryPresets;
const BS = String.fromCharCode(92);
const TOKEN = 'EDU_VTPVXVR14D2PF2DB_FAKE';
const dec = new TextDecoder();

// ZIP を読み直す（中央ディレクトリーから各エントリーを引き、ローカルヘッダーと突き合わせる）
function readZip(bytes) {
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const endAt = bytes.length - 22;
  assert.equal(v.getUint32(endAt, true), 0x06054b50, 'end of central directory');
  const count = v.getUint16(endAt + 10, true);
  let p = v.getUint32(endAt + 16, true);
  const out = [];
  for (let i = 0; i < count; i++) {
    assert.equal(v.getUint32(p, true), 0x02014b50, 'central header');
    const flags = v.getUint16(p + 8, true);
    const method = v.getUint16(p + 10, true);
    const time = v.getUint16(p + 12, true);
    const date = v.getUint16(p + 14, true);
    const crc = v.getUint32(p + 16, true);
    const size = v.getUint32(p + 20, true);
    const nameLen = v.getUint16(p + 28, true);
    const localAt = v.getUint32(p + 42, true);
    const name = dec.decode(bytes.subarray(p + 46, p + 46 + nameLen));
    assert.equal(v.getUint32(localAt, true), 0x04034b50, 'local header');
    assert.equal(v.getUint32(localAt + 14, true), crc);
    const dataAt = localAt + 30 + v.getUint16(localAt + 26, true);
    const data = bytes.subarray(dataAt, dataAt + size);
    out.push({ name, flags, method, time, date, crc, data });
    p += 46 + nameLen;
  }
  return out;
}

const created = new Date(2026, 0, 2, 3, 4, 7);

test('CRC-32 の検査値（"123456789" → cbf43926）', () => {
  assert.equal(F.crc32('123456789').toString(16), 'cbf43926');
  assert.equal(F.crc32(''), 0);
});

test('ZIP: 無圧縮で、UTF-8 のファイル名の印（ビット11）、CRC が中身と合い、日時は MS-DOS 形式（2秒単位）', () => {
  const z = F.zip([{ path: 'home/deploy/.ssh/id_rsa', data: 'key' }, { path: '日本語/機密.txt', data: 'x' }], created);
  const entries = readZip(z);
  assert.deepEqual(entries.map((e) => e.name), ['home/deploy/.ssh/id_rsa', '日本語/機密.txt']);
  for (const e of entries) {
    assert.equal(e.method, 0);
    assert.equal(e.flags & 0x0800, 0x0800);
    assert.equal(e.crc, F.crc32(e.data));
    assert.equal(e.time, (3 << 11) | (4 << 5) | 3);
    assert.equal(e.date, ((2026 - 1980) << 9) | (1 << 5) | 2);
  }
  assert.equal(dec.decode(entries[0].data), 'key');
});

test('ZIP: 危ないパス（先頭の /・..・バックスラッシュ・空の要素・同じパスの2つ目）は作らない', () => {
  for (const bad of ['/etc/passwd', 'a/../b', `a${BS}b`, 'a//b', '', './a']) {
    assert.throws(() => F.zip([{ path: bad, data: 'x' }], created), Error, bad);
  }
  assert.throws(() => F.zip([{ path: 'a', data: '1' }, { path: 'a', data: '2' }], created));
});

test('置き場所のパスから ZIP の中のパスを作る（ドライブ文字と先頭の区切りを外す。.. は作らない）', () => {
  const cases = [
    ['/home/deploy/.ssh/id_rsa', 'id_rsa', 'home/deploy/.ssh/id_rsa'],
    [`C:${BS}Share${BS}Finance${BS}budget.xlsx`, 'budget.xlsx', 'Share/Finance/budget.xlsx'],
    [`${BS}${BS}server${BS}HR${BS}x.docx`, 'x.docx', 'server/HR/x.docx'],
    ['/srv/share/', 'passwords.txt', 'srv/share/passwords.txt'],
    [`C:${BS}`, 'a.txt', 'a.txt'],
    ['', '.env', '.env'],
    ['', '.aws/credentials', 'credentials'],
    ['/srv/../etc/passwd', 'passwd', null],
    ['/srv/./x', 'x', null]
  ];
  for (const [place, name, want] of cases) assert.equal(F.zipPathFromPlace(place, name), want, place);
});

test('XML の文字: 使えない制御文字と対になっていないサロゲートを除き、5つの記号を逃がす', () => {
  const s = `a${String.fromCharCode(0, 8, 11)}<b>&"'${String.fromCharCode(0xd800)}z${String.fromCharCode(9, 10)}😀`;
  assert.equal(F.xmlText(s), `a&lt;b&gt;&amp;&quot;&apos;z${String.fromCharCode(9, 10)}😀`);
});

const meta = { title: 'budget', creator: 'EXAMPLE Finance', token: TOKEN, created, sheet: 'Budget' };

test('Word: 部品がそろい、各行が段落になり、トークンは本文と dc:identifier に入る。タブは w:tab', () => {
  const r = F.build('docx', `Title\n\nRef: ${TOKEN}\na\tb <x>\n`, meta);
  assert.equal(r.ok, true);
  const parts = Object.fromEntries(readZip(r.bytes).map((e) => [e.name, dec.decode(e.data)]));
  assert.deepEqual(Object.keys(parts), ['[Content_Types].xml', '_rels/.rels', 'word/document.xml', 'docProps/core.xml']);
  const doc = parts['word/document.xml'];
  assert.equal((doc.match(/<w:p>|<w:p\/>/g) || []).length, 4);
  assert.ok(doc.includes(`Ref: ${TOKEN}`));
  assert.ok(doc.includes('<w:t xml:space="preserve">a</w:t><w:tab/><w:t xml:space="preserve">b &lt;x&gt;</w:t>'));
  const core = parts['docProps/core.xml'];
  assert.ok(core.includes(`<dc:identifier>${TOKEN}</dc:identifier>`));
  assert.ok(core.includes('<dc:creator>EXAMPLE Finance</dc:creator>'));
  assert.ok(core.includes(`<dcterms:created xsi:type="dcterms:W3CDTF">${created.toISOString().replace(/\.\d{3}Z$/, 'Z')}</dcterms:created>`));
  assert.match(parts['[Content_Types].xml'], /wordprocessingml\.document\.main\+xml/);
});

test('Excel: 「キー: 値」は2列、ほかは1列。値はすべて文字列（数式なし）。シート名は31文字まで、使えない文字は _', () => {
  assert.deepEqual(F.rowsFromLines(['IT Infrastructure: $2,500,000', 'root:x:0:0:root:/root:/bin/bash', 'URL: https://a:b@c', '=SUM(1)', '']),
    [['IT Infrastructure', '$2,500,000'], ['root:x:0:0:root:/root:/bin/bash'], ['URL', 'https://a:b@c'], ['=SUM(1)'], ['']]);
  const r = F.build('xlsx', `Budget Ref: ${TOKEN}\n=SUM(A1)\n`, meta);
  const parts = Object.fromEntries(readZip(r.bytes).map((e) => [e.name, dec.decode(e.data)]));
  const sheet = parts['xl/worksheets/sheet1.xml'];
  assert.ok(sheet.includes(`<c r="B1" t="inlineStr"><is><t xml:space="preserve">${TOKEN}</t></is></c>`));
  assert.ok(sheet.includes('<c r="A2" t="inlineStr"><is><t xml:space="preserve">=SUM(A1)</t></is></c>'));
  assert.doesNotMatch(sheet, /<f>/);
  assert.ok(parts['xl/workbook.xml'].includes('<sheet name="Budget" sheetId="1" r:id="rId1"/>'));
  assert.equal(F.sheetName('a[b]:c*?/d'.repeat(5)).length, 31);
  assert.equal(F.colName(26), 'AA');
});

test('PDF: xref の位置が各オブジェクトの位置と合い、ページの数・本文・Subject のトークンがそろう', () => {
  const lines = Array.from({ length: 130 }, (_, i) => `line ${i} (x) \\ y`);
  const r = F.build('pdf', `${lines.join('\n')}\n`, meta);
  assert.equal(r.ok, true);
  const s = dec.decode(r.bytes);
  assert.ok(s.startsWith('%PDF-1.4\n') && s.endsWith('%%EOF\n'));
  const xrefAt = Number(s.match(/startxref\n(\d+)\n/)[1]);
  assert.ok(s.slice(xrefAt).startsWith('xref\n'));
  const entries = [...s.slice(xrefAt).matchAll(/^(\d{10}) 00000 n $/gm)].map((m) => Number(m[1]));
  entries.forEach((off, i) => assert.ok(s.slice(off).startsWith(`${i + 1} 0 obj\n`), String(i + 1)));
  assert.match(s, /\/Count 3 >>/);
  assert.ok(s.includes(`/Subject (${TOKEN})`));
  assert.ok(s.includes('(line 0 \\(x\\) \\\\ y) Tj'));
  for (const m of s.matchAll(/<< \/Length (\d+) >>\nstream\n([\s\S]*?)\nendstream/g)) assert.equal(new TextEncoder().encode(m[2]).length, Number(m[1]));
});

test('PDF: ASCII 以外を含むと作らず、何行目かを返す。長い行は85文字で折り返す', () => {
  assert.deepEqual(F.build('pdf', 'ok\n日本語\n', meta), { ok: false, error: 'pdf.nonAscii', line: 2 });
  assert.equal(F.build('pdf', 'ok\n', { ...meta, creator: '経理' }).ok, false);
  assert.deepEqual(F.wrapLines(['x'.repeat(170), '', `a${String.fromCharCode(9)}b`]), ['x'.repeat(85), 'x'.repeat(85), '', 'a    b']);
});

test('形式の選び方: 自動は拡張子に合わせ、それ以外はテキスト。選んだ形式はそのまま', () => {
  assert.equal(F.formatFor('auto', 'docx'), 'docx');
  assert.equal(F.formatFor('auto', 'pdf'), 'pdf');
  assert.equal(F.formatFor('auto', 'txt'), 'text');
  assert.equal(F.formatFor('auto', ''), 'text');
  assert.equal(F.formatFor('xlsx', 'txt'), 'xlsx');
  assert.equal(new TextDecoder().decode(F.build('text', 'abc\n', meta).bytes), 'abc\n');
});

test('同じ入力と日時からは、同じバイト列になる', () => {
  for (const f of ['docx', 'xlsx', 'pdf']) {
    assert.deepEqual(F.build(f, `a ${TOKEN}\n`, meta).bytes, F.build(f, `a ${TOKEN}\n`, meta).bytes, f);
  }
});

test('一式: 各ファイルのプリセットがあり、置き場所から作る ZIP の中のパスはすべて安全で重ならない', () => {
  assert.deepEqual(P.KITS.map((k) => k.id), ['linuxHome', 'winShare']);
  for (const kit of P.KITS) {
    const paths = kit.files.map((f) => {
      const preset = P.byId(f.preset);
      assert.ok(preset, f.preset);
      assert.ok(F.FORMATS.includes(f.format), f.format);
      return F.zipPathFromPlace(f.place, preset.name);
    });
    for (const p of paths) assert.ok(F.isSafeZipPath(p), p);
    assert.equal(new Set(paths).size, paths.length);
  }
  assert.deepEqual(P.KITS[0].files.map((f) => F.zipPathFromPlace(f.place, P.byId(f.preset).name)),
    ['home/deploy/.ssh/id_rsa', 'home/deploy/.aws/credentials', 'home/deploy/app/.env']);
});
