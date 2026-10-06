import test from 'node:test';
import assert from 'node:assert/strict';
import { read, load, core } from './load.js';

const { MESSAGES, t } = load('js/messages.js').CanaryMessages;
const C = core();
// かな・カタカナ・漢字・全角の記号
const JAPANESE = new RegExp('[' + [[0x3000, 0x303f], [0x3040, 0x30ff], [0x3400, 0x9fff], [0xff00, 0xffef]]
  .map(([a, b]) => String.fromCharCode(a) + '-' + String.fromCharCode(b)).join('') + ']');

const placeholders = (s) => [...s.matchAll(/\{([a-zA-Z0-9]+)\}/g)].map((m) => m[1]).sort();

test('日本語と英語の辞書は同じキーを持ち、置き場所 {name} と太字の数もそろう', () => {
  assert.deepEqual(Object.keys(MESSAGES.en).sort(), Object.keys(MESSAGES.ja).sort());
  assert.ok(Object.keys(MESSAGES.ja).length >= 130, String(Object.keys(MESSAGES.ja).length));
  for (const k of Object.keys(MESSAGES.ja)) {
    assert.deepEqual(placeholders(MESSAGES.en[k]), placeholders(MESSAGES.ja[k]), k);
    for (const lang of ['ja', 'en']) assert.equal((MESSAGES[lang][k].match(/\*\*/g) || []).length % 2, 0, `${lang} ${k}`);
  }
});

test('英語の辞書に日本語の文字がない（言語の切り替えボタンの「日本語」を除く）', () => {
  for (const [k, v] of Object.entries(MESSAGES.en)) {
    if (k === 'ui.langButton' || k === 'ui.langLabel') continue;
    assert.doesNotMatch(v, JAPANESE, k);
  }
});

test('日本語の文言は、日本語と英数字のあいだに半角空白を入れない。長音（ブラウザー・フォルダー・リポジトリー）をそろえる', () => {
  const bad = new RegExp(`(${JAPANESE.source} [A-Za-z0-9(])|([A-Za-z0-9)] ${JAPANESE.source})`);
  for (const [k, v] of Object.entries(MESSAGES.ja)) {
    assert.doesNotMatch(v, bad, k);
    assert.doesNotMatch(v, /ブラウザ(?!ー)|フォルダ(?!ー)|リポジトリ(?!ー)|ディレクトリ(?!ー)|サーバ(?!ー)/, k);
    // 「わかる」はひらがな、「分ける・分かれる」は漢字
    assert.doesNotMatch(v, /(?<![自0-9０-９])分か(?!れ)/, k);
  }
});

test('計算部が返すファイル名の指摘と経過時間の区分は、すべて辞書にある', () => {
  const src = read('js/canary-core.js');
  const codes = [...src.matchAll(/'(name\.[a-zA-Z]+)': '(?:warn|info)'/g)].map((m) => m[1]);
  assert.equal(codes.length, 10);
  for (const code of codes) for (const lang of ['ja', 'en']) assert.ok(MESSAGES[lang][`issue.${code}`], `${lang} ${code}`);
  for (const [, p] of C.PRIORITY) assert.ok(MESSAGES.ja[`pri.${p}`] && MESSAGES.en[`pri.${p}`], p);
  assert.ok(MESSAGES.ja['pri.muted'] && MESSAGES.en['pri.muted']);
});

test('画面のスクリプトが使う文言のキーは、すべて辞書にある', () => {
  const src = read('script.js');
  const keys = new Set([...src.matchAll(/\bt\('([a-zA-Z0-9.]+)'/g)].map((m) => m[1]));
  for (const m of src.matchAll(/key: '([a-zA-Z0-9.]+)'/g)) keys.add(m[1]);
  assert.ok(keys.size >= 25, String(keys.size));
  for (const k of keys) for (const lang of ['ja', 'en']) assert.ok(MESSAGES[lang][k] !== undefined, `${lang} ${k}`);
});

test('経過時間の区分の文言は、計算部のしきい値（5・30・60分）と同じ数字を書く', () => {
  const limits = C.PRIORITY.map(([m]) => m);
  assert.deepEqual(limits, [5, 30, 60]);
  assert.ok(MESSAGES.ja['pri.critical'].includes('5分'));
  assert.ok(MESSAGES.ja['pri.warning'].includes('30分'));
  assert.ok(MESSAGES.ja['pri.info'].includes('60分'));
  assert.ok(MESSAGES.en['pri.critical'].includes('5 min'));
});

test('t は {name} を置き換え、ない鍵はキーをそのまま返す', () => {
  assert.equal(t('gen.done', { name: 'passwd', token: 'EDU_X' }, 'ja'), 'passwdを生成しました。トークンはEDU_Xです。');
  assert.equal(t('gen.done', { name: 'passwd', token: 'EDU_X' }, 'en'), 'Generated passwd. The token is EDU_X.');
  assert.equal(t('no.such.key', {}, 'ja'), 'no.such.key');
});
