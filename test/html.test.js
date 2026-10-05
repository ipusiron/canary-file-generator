import test from 'node:test';
import assert from 'node:assert/strict';
import { read, load } from './load.js';

const html = read('index.html');
const { PRESETS } = load('js/presets.js').CanaryPresets;
const { MESSAGES, t } = load('js/messages.js').CanaryMessages;
const { parseVars } = load('js/i18n.js').CanaryI18n;
const SCRIPTS = ['script.js', 'js/canary-core.js', 'js/presets.js', 'js/messages.js', 'js/i18n.js', 'js/theme.js', 'js/theme-init.js'];
const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
const TABS = ['gen', 'alerts', 'study'];

test('CSP はスクリプト・スタイルを同じ場所のファイルだけに限り、unsafe-inline と外部の通信を許さない', () => {
  const csp = html.match(/http-equiv="Content-Security-Policy"\s+content="([^"]+)"/)[1];
  assert.equal(csp, "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; "
    + "connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'");
  assert.doesNotMatch(csp, /frame-ancestors/);
  assert.match(html, /<meta name="referrer" content="no-referrer">/);
  assert.match(html, /<link rel="icon" href="data:,">/);
  assert.match(html, /<noscript>/);
});

test('HTML に style 属性・インラインのスクリプト・イベントハンドラーがない。外部リンクは noopener noreferrer', () => {
  assert.doesNotMatch(html, /\sstyle=/);
  assert.doesNotMatch(html, /\son[a-z]+=/i);
  const scripts = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map((m) => m[1]);
  assert.deepEqual(scripts, ['js/theme-init.js', 'js/canary-core.js', 'js/presets.js', 'js/messages.js', 'js/i18n.js', 'js/theme.js', 'script.js']);
  assert.equal((html.match(/<script/g) || []).length, scripts.length);
  for (const a of html.match(/<a [^>]*>/g)) assert.match(a, /target="_blank" rel="noopener noreferrer"/, a);
});

test('タブは WAI-ARIA の形（tablist の中はタブだけ、aria-controls の先が実在、最初のタブだけ選択）', () => {
  const nav = html.match(/<nav class="tabs" role="tablist"[\s\S]*?<\/nav>/)[0];
  assert.equal((nav.match(/<button/g) || []).length, TABS.length);
  const tabs = [...nav.matchAll(/role="tab" id="(tab-[a-z]+)" data-tab="([a-z]+)" aria-controls="(panel-[a-z]+)" aria-selected="(true|false)"/g)];
  assert.deepEqual(tabs.map((m) => [m[2], m[4]]), TABS.map((k, i) => [k, i === 0 ? 'true' : 'false']));
  for (const [, id, , panel, selected] of tabs) {
    const tag = html.match(new RegExp(`<section [^>]*id="${panel}"[^>]*>`))[0];
    assert.match(tag, new RegExp(`role="tabpanel" aria-labelledby="${id}"`), panel);
    assert.equal(/\shidden/.test(tag), selected === 'false', panel);
  }
});

test('ボタンは type="button"。入力欄には label があり、ファイル名と中身の欄はスペルチェックを切る', () => {
  for (const b of html.match(/<button[^>]*>/g)) assert.match(b, /type="button"/, b);
  for (const m of html.matchAll(/<(textarea|select|input) [^>]*id="([^"]+)"/g)) {
    assert.match(html, new RegExp(`<label [^>]*for="${m[2]}"`), m[2]);
  }
  for (const id of ['file-name', 'notice-text', 'body-text']) {
    assert.match(html, new RegExp(`id="${id}"[^>]*spellcheck="false"`), id);
  }
});

test('動的に変わるところには aria-live がある', () => {
  for (const id of ['save-as', 'name-issues', 'hint', 'gen-status', 'alerts-status']) {
    assert.match(html, new RegExp(`id="${id}"[^>]*aria-live="polite"`), id);
  }
});

test('プリセットのボタンは、presets.js の7つと同じ順・同じ名前', () => {
  const buttons = [...html.matchAll(/data-preset="([a-z]+)">([^<]+)</g)].map((m) => [m[1], m[2]]);
  assert.deepEqual(buttons, PRESETS.map((p) => [p.id, p.name]));
  for (const p of PRESETS) assert.ok(MESSAGES.ja[`hint.${p.id}`] && MESSAGES.en[`hint.${p.id}`], p.id);
});

// 文言の太字（**）と改行（\n）は HTML の strong と br に当たる。HTML 側のタグを外して比べる
const plain = (s) => s.replace(/\n\s*/g, '').replace(/<br>/g, '\n').replace(/<[^>]+>/g, '')
  .replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&amp;/g, '&').trim();
const fromDict = (s) => s.replace(/\*\*/g, '');

test('data-i18n のキーは辞書にあり、HTML に書いた日本語は辞書の日本語と同じ', () => {
  let n = 0;
  for (const m of html.matchAll(/<([a-z0-9]+)([^>]*?)data-i18n="([^"]+)"([^>]*)>([\s\S]*?)<\/\1>/g)) {
    const key = m[3];
    assert.ok(MESSAGES.ja[key] !== undefined, key);
    const vars = parseVars(((m[2] + m[4]).match(/data-i18n-vars="([^"]*)"/) || [])[1]);
    assert.equal(plain(m[5]), fromDict(t(key, vars, 'ja')), key);
    n++;
  }
  assert.ok(n >= 70, String(n));
  for (const m of html.matchAll(/data-i18n-attr="([^"]+)"/g)) {
    for (const pair of m[1].split(';')) assert.ok(MESSAGES.ja[pair.split(':')[1]] !== undefined, pair);
  }
});

test('画面のスクリプトが参照する id は、すべて HTML にある', () => {
  const src = read('script.js');
  const used = [...src.matchAll(/\$\('([a-z0-9-]+)'\)/g)].map((m) => m[1]);
  assert.ok(used.length >= 20, String(used.length));
  for (const id of used) assert.ok(ids.has(id), id);
  for (const k of TABS) assert.ok(ids.has(`tab-${k}`) && ids.has(`panel-${k}`), k);
});

test('JS は innerHTML・eval を使わず、style を書き換えない。document 全体の keydown を拾わない。sessionStorage を使わない', () => {
  for (const f of SCRIPTS) {
    const src = read(f);
    assert.doesNotMatch(src, /innerHTML|outerHTML|insertAdjacentHTML|\beval\(|new Function|document\.write/, f);
    assert.doesNotMatch(src, /\.style\b|setAttribute\('style'|cssText/, f);
    assert.doesNotMatch(src, /console\.(log|debug|info|error|warn)/, f);
    assert.doesNotMatch(src, /document\.addEventListener\('keydown'/, f);
    assert.doesNotMatch(src, /sessionStorage|Math\.random/, f);
  }
});

test('localStorage は try で囲んで読み書きする（使えない環境でも画面が止まらない）', () => {
  // messages.js は文言（localStorage という語を含む）なので除く
  for (const f of SCRIPTS.filter((x) => x !== 'js/messages.js')) {
    const src = read(f);
    const uses = (src.match(/localStorage\./g) || []).length;
    const guarded = [...src.matchAll(/try \{\s*(?:const [a-z]+ = |return )?localStorage\./g)].length;
    assert.equal(guarded, uses, f);
  }
});

test('ダウンロードは計算部の MIME（application/octet-stream）で Blob を作る', () => {
  const src = read('script.js');
  assert.match(src, /new Blob\(\[content\], \{ type: C\.MIME \}\)/);
  assert.equal((src.match(/new Blob\(/g) || []).length, 1);
});
