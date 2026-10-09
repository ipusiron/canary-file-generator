import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { read, core, presets, load } from './load.js';


const C = core();
const P = presets();
const { PRESETS } = P;
const M = load('js/monitor.js').CanaryMonitor;
const F = load('js/formats.js').CanaryFormats;
const { MESSAGES } = load('js/messages.js').CanaryMessages;
const ROOT = fileURLToPath(new URL('..', import.meta.url));
const TOKEN = 'EDU_VTPVXVR14D2PF2DB_FAKE';

const DOCS = {
  ja: {
    file: 'README.md', switcher: '[English](README.en.md) · 日本語', day: '**Day054 - 生成AIで作るセキュリティツール100**',
    shots: /^assets\/screenshot\d*\.png$/, docsDir: 'docs/',
    sec: { tech: '🔬 技術的な説明', limits: '⚠️ 注意と限界', refs: '🔗 参考', tree: '📁 ディレクトリー構造', about: '🛠️ このツールについて',
      security: '🔒 セキュリティ', documents: '📚 ドキュメント' },
    head: { place: '| 条件 | トークンを書く場所 |', preset: '| ファイル名 | トークンを書く行 |', name: '| 入力した名前 | 保存される名前の目安 | 画面の指摘 |',
      color: '| 通知からの経過時間 | 色 |', find: '| 区分 | 条件 | 例 |', monitor: '| OS | 記録する仕組み | 本ツールが出す手順 |',
      formats: '| 中身の形式 | 組み立て方 | トークンを書く場所 |', kits: '| 一式 | ZIPの中のパス | 中身の形式 |' },
    wrap: (n) => `${n}文字で折り返し`, pageLines: (n) => `${n}行ごと`,
    place: { withToken: 'がある', withoutToken: 'がない', notice: '教育用の見出し' },
    labels: { 拡張子なし: 'name.noExt', 先頭のドット: 'name.leadingDot', 区切り文字: 'name.separator', 中身はテキスト: 'name.textContent' },
    none: 'なし', sep: '・',
    max: (n) => `${n}件まで`,
    // 長音のない表記・簡体字の「敌」・「わかる」の漢字書き（分ける・分かれるは漢字のまま）・確かめられない量の表現
    forbidden: /ブラウザ(?!ー)|フォルダ(?!ー)|ディレクトリ(?!ー)|リポジトリ(?!ー)|ライブラリ(?!ー)|敌|(?<![自0-9０-９])分か(?!れ)|多くのEDR/
  },
  en: {
    file: 'README.en.md', switcher: 'English · [日本語](README.md)', day: '**Day054 - 100 Security Tools with Generative AI**',
    shots: /^assets\/en\/screenshot\d*\.png$/, docsDir: 'docs/en/',
    sec: { tech: '🔬 Technical notes', limits: '⚠️ Notes and limitations', refs: '🔗 References', tree: '📁 Directory structure',
      about: '🛠️ About this tool', security: '🔒 Security', documents: '📚 Documents' },
    head: { place: '| Condition | Where the token is written |', preset: '| File name | Line that carries the token |',
      name: '| Name entered | Likely saved name | Notes on the page |', color: '| Time since the alert | Color |',
      find: '| Category | Condition | Example |', monitor: '| OS | What records access | Steps the tool gives |',
      formats: '| Content format | How it is built | Where the token is written |', kits: '| Set | Path inside the ZIP | Content format |' },
    wrap: (n) => `wrapped at ${n} characters`, pageLines: (n) => `every ${n} lines`,
    place: { withToken: 'contains', withoutToken: 'has no', notice: 'educational header' },
    labels: { 'no extension': 'name.noExt', 'leading dot': 'name.leadingDot', separator: 'name.separator', 'content is text': 'name.textContent' },
    none: 'None', sep: ', ',
    max: (n) => `up to ${n} entries`,
    forbidden: /many EDR/i
  }
};
for (const d of Object.values(DOCS)) d.text = read(d.file);

function section(text, heading) {
  const i = text.indexOf(`\n## ${heading}`);
  assert.ok(i >= 0, heading);
  const rest = text.slice(i + 1);
  const end = rest.indexOf('\n## ', 3);
  return end < 0 ? rest : rest.slice(0, end);
}

function table(text, firstHeader) {
  const lines = text.split('\n');
  const start = lines.findIndex((l) => l.startsWith(firstHeader));
  assert.ok(start >= 0, firstHeader);
  const rows = [];
  for (let i = start + 2; i < lines.length && lines[i].startsWith('|'); i++) {
    rows.push(lines[i].replace(/^\| | \|$/g, '').split(/ (?<!\\)\| /).map((c) => c.trim()));
  }
  return rows;
}

const noCode = (md) => md.replace(/```[\s\S]*?```/g, '');
const h2 = (md) => noCode(md).split('\n').filter((l) => l.startsWith('## ')).map((l) => l.slice(3));
const headings = (md) => noCode(md).split('\n').filter((l) => /^#{1,4} /.test(l));
const unquote = (s) => s.replace(/^`|`$/g, '');

test('YAML メタデータの構造（キーの順、ブロック形式のリスト、固定の値）。YAML は README.md だけに置く', () => {
  const m = DOCS.ja.text.match(/^<!--\n---\n([\s\S]*?)\n---\n-->\n/);
  assert.ok(m, 'YAML block');
  const keys = [...m[1].matchAll(/^([a-z_]+):/gm)].map((x) => x[1]);
  assert.deepEqual(keys, ['id', 'slug', 'title', 'subtitle_ja', 'subtitle_en', 'description_ja', 'description_en', 'category_ja', 'category_en',
    'difficulty', 'tags', 'repo_url', 'demo_url', 'hub']);
  for (const k of ['category_ja', 'category_en', 'tags']) assert.match(m[1], new RegExp(`^${k}:\\n  - `, 'm'), k);
  assert.match(m[1], /^id: day054$/m);
  assert.match(m[1], /^slug: canary-file-generator$/m);
  assert.match(m[1], /^repo_url: "https:\/\/github.com\/ipusiron\/canary-file-generator"$/m);
  assert.match(m[1], /^demo_url: "https:\/\/ipusiron.github.io\/canary-file-generator\/"$/m);
  assert.match(m[1], /^hub: true$/m);
  assert.doesNotMatch(DOCS.en.text, /^<!--/);
});

test('日英の README は同じ見出しを同じ順に持つ（階層と絵文字がそろう）', () => {
  const ja = headings(DOCS.ja.text);
  const en = headings(DOCS.en.text);
  assert.equal(en.length, ja.length);
  assert.ok(ja.length >= 25, String(ja.length));
  ja.forEach((h, i) => {
    assert.equal(en[i].match(/^#+/)[0], h.match(/^#+/)[0], `${h} / ${en[i]}`);
    const first = [...h.replace(/^#+ /, '')][0];
    if (/\p{Extended_Pictographic}/u.test(first)) assert.equal([...en[i].replace(/^#+ /, '')][0], first, `${h} / ${en[i]}`);
  });
});

for (const [lang, d] of Object.entries(DOCS)) {
  test(`${d.file}: シリーズ標準の構成（前半と後半の見出しの順、Day の表記、言語の切り替え、プロジェクトのリンク）と、古い記述がないこと`, () => {
    const heads = h2(d.text);
    assert.ok(d.text.includes(d.switcher));
    assert.match(d.text, /(^|\n)# Canary File Generator - .+\n/);
    assert.ok(d.text.includes(d.day));
    assert.ok(heads[0].startsWith('🌐'));
    assert.ok(heads[1].startsWith('📸'));
    assert.deepEqual(heads.slice(-4).map((h) => [...h][0]), ['📁', '💻', '📄', '🛠']);
    for (const icon of ['🐤', '✨', '📖', '🔬', '🎯', '🏢', '🔒', '⚠', '📚', '🧪', '🔗']) assert.ok(heads.some((h) => h.startsWith(icon)), icon);
    assert.match(section(d.text, d.sec.about), /https:\/\/akademeia\.info\/\?page_id=42163/);
    for (const b of ['stars', 'forks', 'last-commit', 'license']) assert.ok(d.text.includes(`img.shields.io/github/${b}/ipusiron/canary-file-generator`), b);
    assert.doesNotMatch(d.text.replace(/<!--[\s\S]*?-->/, ''), d.forbidden);
  });

  test(`${d.file}: 強調は1節に2か所まで、箇条書きの項目名を太字にしない、文末にコロンを置かない`, () => {
    for (const h of h2(d.text)) {
      const n = (section(d.text, h).match(/\*\*[^*\n]+\*\*/g) || []).length;
      assert.ok(n <= 2, `${h}: ${n}`);
    }
    assert.doesNotMatch(d.text, /^\s*- \*\*/m);
    if (lang === 'ja') assert.doesNotMatch(noCode(d.text).replace(/<!--[\s\S]*?-->/, ''), /[：:]$/m);
  });

  test(`${d.file}: トークンを書く場所の表は、計算部の組み立てと同じ`, () => {
    const rows = table(section(d.text, d.sec.tech), d.head.place);
    assert.equal(rows.length, 3);
    const withToken = C.buildContent({ token: TOKEN, body: 'a {{TOKEN}} b {{TOKEN}}', includeNotice: false }).places;
    const without = C.buildContent({ token: TOKEN, body: 'a', includeNotice: false }).places;
    const notice = C.buildContent({ token: TOKEN, body: 'a', includeNotice: true }).places;
    assert.ok(rows[0][0].includes(d.place.withToken) && withToken.body === 2 && withToken.end === 0, rows[0][0]);
    assert.ok(rows[1][0].includes(d.place.withoutToken) && without.body === 0 && without.end === 1, rows[1][0]);
    assert.ok(rows[2][0].includes(d.place.notice) && notice.header === 1, rows[2][0]);
    assert.ok(rows[1][1].includes('Ref:'));
    assert.ok(rows[2][1].includes('Token:'));
  });

  test(`${d.file}: プリセットの表は、presets.js の7つと同じ順で、書いた行が中身にある`, () => {
    const rows = table(section(d.text, d.sec.tech), d.head.preset);
    assert.deepEqual(rows.map((r) => r[0]), PRESETS.map((p) => p.name));
    rows.forEach(([, line], i) => assert.ok(PRESETS[i].body.split('\n').includes(unquote(line)), `${PRESETS[i].name}: ${line}`));
  });

  test(`${d.file}: 保存される名前の表は、計算部の検査（保存される名前の目安と指摘）と同じ`, () => {
    const rows = table(section(d.text, d.sec.tech), d.head.name);
    assert.ok(rows.length >= 6, String(rows.length));
    for (const [input, saveAs, notes] of rows) {
      // 画面の既定（中身の形式は「自動」）と同じ条件で検査する
      const r = C.checkFileName(unquote(input), F.formatFor('auto', C.extOf(unquote(input))));
      assert.equal(r.saveAs, unquote(saveAs), input);
      const codes = notes === d.none ? [] : notes.split(d.sep).map((s) => d.labels[s.trim().toLowerCase()]);
      assert.ok(codes.every(Boolean), notes);
      assert.deepEqual(codes.sort(), r.issues.map((x) => x.code).sort(), input);
    }
  });

  test(`${d.file}: 色分けの表は、計算部のしきい値（分）と同じ`, () => {
    const rows = table(section(d.text, d.sec.tech), d.head.color);
    const nums = rows.map((r) => Number(r[0].match(/\d+/)[0]));
    assert.deepEqual(nums, [...C.PRIORITY.map(([m]) => m), C.PRIORITY[C.PRIORITY.length - 1][0]]);
  });

  test(`${d.file}: 特定の結果の区分の表は、画面の区分名と同じ順で、例を計算部に通すとその区分になる`, () => {
    const rows = table(section(d.text, d.sec.tech), d.head.find);
    const kinds = ['exact', 'variant', 'place', 'near', 'unknown', 'malformed'];
    assert.deepEqual(rows.map((r) => r[0]), kinds.map((k) => MESSAGES[lang][`kind.${k}`]));
    const ledger = [{ token: TOKEN, fileName: 'passwords.txt', at: 1, notice: true, place: '/srv/share/passwords.txt', memo: '' }];
    assert.ok(d.text.includes(TOKEN) && d.text.includes(ledger[0].place));
    rows.forEach(([, , example], i) => {
      const r = C.findInText(unquote(example), ledger);
      assert.deepEqual(r.hits.map((h) => h.kind), [kinds[i]], example);
    });
    assert.ok(section(d.text, d.sec.tech).includes(C.MAX_FIND_CHARS.toLocaleString('en-US')));
    assert.ok(section(d.text, d.sec.tech).includes(String(C.MAX_HITS)));
  });

  test(`${d.file}: 本当に開けるファイルの表は、形式の名前と順が画面と同じで、PDF の折り返しとページの行数が計算部と同じ`, () => {
    const tech = section(d.text, d.sec.tech);
    const rows = table(tech, d.head.formats);
    assert.deepEqual(rows.map((r) => r[0]), F.FORMATS.map((f) => MESSAGES[lang][`fmt.${f}`]));
    assert.ok(rows[3][1].includes(d.wrap(F.PDF_WRAP)), rows[3][1]);
    assert.ok(rows[3][1].includes(d.pageLines(F.PDF_PAGE_LINES)), rows[3][1]);
  });

  test(`${d.file}: 一式の表は、presets.js の一式と同じパス・同じ形式`, () => {
    const rows = table(section(d.text, d.sec.tech), d.head.kits);
    const want = P.KITS.flatMap((kit) => kit.files.map((f) => [MESSAGES[lang][`kit.name.${kit.id}`],
      F.zipPathFromPlace(f.place, P.byId(f.preset).name), MESSAGES[lang][`fmt.${f.format}`]]));
    assert.deepEqual(rows.map(([kit, path, fmt]) => [kit, unquote(path), fmt]), want);
  });

  test(`${d.file}: 監視の設定例の表のコマンドは、計算部が出す手順に含まれる。GUID とキーの長さも同じ`, () => {
    const rows = table(section(d.text, d.sec.tech), d.head.monitor);
    assert.deepEqual(rows.map((r) => r[0]), ['Linux', 'Windows', 'macOS']);
    const canary = { token: TOKEN, fileName: 'passwords.txt', at: 1, place: '' };
    rows.forEach(([, , steps], i) => {
      const code = M.setup(M.OS_LIST[i], canary).steps.map((s) => s.code).join('\n');
      const cmds = [...steps.matchAll(/`([^`]+)`/g)].map((m) => m[1]);
      assert.ok(cmds.length >= 2, steps);
      for (const c of cmds) assert.ok(code.includes(c), `${M.OS_LIST[i]}: ${c}`);
    });
    const tech = section(d.text, d.sec.tech);
    assert.ok(tech.includes(M.FILE_SYSTEM_GUID));
    assert.ok(tech.includes(String(M.MAX_KEY_BYTES)) && tech.includes(String(TOKEN.length)));
  });

  test(`${d.file}: 記録の上限・CSP は実装と同じ`, () => {
    assert.ok(section(d.text, d.sec.limits).includes(d.max(C.MAX_ITEMS)), String(C.MAX_ITEMS));
    const csp = read('index.html').match(/http-equiv="Content-Security-Policy"\s+content="([^"]+)"/)[1];
    assert.ok(section(d.text, d.sec.security).includes(`\`${csp}\``));
  });

  test(`${d.file}: ドキュメントの節は、${d.docsDir} の Markdown をすべて挙げ、リンク先が実在する`, () => {
    const links = [...section(d.text, d.sec.documents).matchAll(/\]\((docs\/[^)]+\.md)\)/g)].map((m) => m[1]);
    const files = fs.readdirSync(path.join(ROOT, d.docsDir)).filter((f) => f.endsWith('.md')).map((f) => `${d.docsDir}${f}`);
    assert.deepEqual(links.sort(), files.sort());
  });

  test(`${d.file}: ディレクトリー構造にすべてのファイルとディレクトリーが載り、全行に説明がある`, () => {
    const block = section(d.text, d.sec.tree).match(/```text\n([\s\S]*?)```/)[1];
    const lines = block.split('\n').filter((l) => l.trim()).slice(1);
    const listed = new Set();
    for (const line of lines) {
      const m = line.match(/[├└]── ([^\s#]+)\s+# \S/);
      assert.ok(m, `説明のない行: ${line}`);
      listed.add(m[1].replace(/\/$/, ''));
    }
    const walk = (dir) => fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })
      .filter((x) => !['.git', 'node_modules', '.claude'].includes(x.name))
      .flatMap((x) => (x.isDirectory() ? [x.name, ...walk(path.join(dir, x.name))] : [x.name]));
    const all = walk('.');
    for (const name of all) assert.ok(listed.has(name), `ツリーにない: ${name}`);
    for (const name of listed) assert.ok(all.includes(name), `実在しない: ${name}`);
  });
}

test('参考文献の URL は日英で同じ', () => {
  const urls = (d) => [...section(d.text, d.sec.refs).matchAll(/\]\((https:\/\/[^)\s]+)\)/g)].map((m) => m[1]);
  assert.deepEqual(urls(DOCS.en), urls(DOCS.ja));
  assert.equal(urls(DOCS.ja).length, 14);
});

test('docs と docs/en は同じファイルを持ち、見出しの数と参考文献の URL がそろう。互いに言語の切り替えのリンクがある', () => {
  const ja = fs.readdirSync(path.join(ROOT, 'docs')).filter((f) => f.endsWith('.md')).sort();
  const en = fs.readdirSync(path.join(ROOT, 'docs/en')).filter((f) => f.endsWith('.md')).sort();
  assert.deepEqual(en, ja);
  assert.equal(ja.length, 5);
  const urls = (s) => [...s.matchAll(/\]\((https?:\/\/[^)\s]+)\)/g)].map((m) => m[1]);
  for (const f of ja) {
    const j = read(`docs/${f}`);
    const e = read(`docs/en/${f}`);
    assert.doesNotMatch(j, /敌|(?<![自0-9０-９])分か(?!れ)|多くのEDR/, f);
    assert.ok(j.includes(`[English](en/${f}) · 日本語`), f);
    assert.ok(e.includes(`English · [日本語](../${f})`), f);
    assert.equal(headings(e).length, headings(j).length, f);
    assert.deepEqual(urls(e), urls(j), f);
  }
});

test('画像: 参照はすべて実在する。スクリーンショットは日本語版が assets/、英語版が assets/en/ の7枚。どこからも参照しない画像は置かない', () => {
  const refs = {};
  for (const [lang, d] of Object.entries(DOCS)) {
    refs[lang] = [...d.text.matchAll(/!\[[^\]]*\]\((assets\/[^)]+)\)/g)].map((m) => m[1]);
    for (const r of refs[lang]) assert.ok(fs.existsSync(path.join(ROOT, r)), r);
    const shots = refs[lang].filter((r) => /screenshot/.test(r));
    assert.equal(shots.length, 7, lang);
    for (const r of shots) {
      assert.match(r, d.shots, r);
      assert.ok(fs.statSync(path.join(ROOT, r)).size <= 300 * 1024, r);
    }
  }
  const used = new Set([...refs.ja, ...refs.en]);
  const files = (dir) => fs.readdirSync(path.join(ROOT, dir)).filter((f) => /\.(png|jpg)$/.test(f)).map((f) => `${dir}/${f}`);
  for (const f of [...files('assets'), ...files('assets/en')]) assert.ok(used.has(f), `参照していない画像: ${f}`);
});

test('ユースケースの「このツールならではの使い方」の照合の例は特定の結果と同じ（日英）', () => {
  const [ja, en] = [read('README.md'), read('README.en.md')];
  const token = 'EDU_JKWNXGS8HQS5FF11_FAKE';
  assert.ok(C.isToken(token));
  const ledger = [token, 'EDU_4P5EYN5S3T1YGKDJ_FAKE'].map((t, i) => ({ token: t, fileName: `copy${i + 1}.txt`, place: '', memo: `copy${i + 1}`, at: 0 }));
  const kinds = (text) => C.findInText(text, ledger).hits.map((h) => [h.kind, h.matches.map((m) => m.memo)]);
  const copied = 'edu-jkwnxgs8hqs5ffll-fake';
  assert.deepEqual(kinds(`… ${token} …`), [['exact', ['copy1']]]);
  assert.deepEqual(kinds(`… ${copied} …`), [['variant', ['copy1']]]);
  assert.deepEqual(kinds('… EDU_JKWNXGS8HQS5FF1A_FAKE …'), [['near', ['copy1']]]);
  assert.deepEqual(kinds('… EDU_JKWNXGS8HQS5FFAA_FAKE …'), [['unknown', []]]);
  for (const text of [ja, en]) assert.ok(text.includes(token) && text.includes('`' + copied + '`'));
  const { MESSAGES } = load('js/messages.js').CanaryMessages;
  assert.ok(ja.includes(`「${MESSAGES.ja['kind.variant']}」`) && ja.includes(`「${MESSAGES.ja['kind.near']}」`));
  assert.ok(en.includes(`"${MESSAGES.en['kind.variant']}"`) && en.includes(`"${MESSAGES.en['kind.near']}"`));
});
