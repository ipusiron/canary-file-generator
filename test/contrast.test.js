import test from 'node:test';
import assert from 'node:assert/strict';
import { read } from './load.js';

const css = read('style.css');

function block(selector) {
  const start = css.indexOf(`${selector} {`);
  assert.ok(start >= 0, selector);
  return css.slice(start, css.indexOf('}', start));
}

const tokens = (selector) => Object.fromEntries([...block(selector).matchAll(/--([a-z0-9-]+):\s*(#[0-9a-f]{6})/g)].map((m) => [m[1], m[2]]));

const luminance = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

// 文字の色と背景の色の組（画面で実際に重なるもの）。4.5:1 以上
const TEXT = [
  ['text', 'bg'], ['text', 'card'], ['text', 'surface'], ['text', 'field-bg'], ['text', 'accent-weak'],
  ['muted', 'bg'], ['muted', 'card'], ['muted', 'surface'],
  ['accent-text', 'bg'], ['accent-text', 'card'], ['accent-text', 'surface'],
  ['on-accent', 'accent'],
  ['ok-text', 'ok-bg'], ['warn-text', 'warn-bg'], ['info-text', 'info-bg'], ['danger-text', 'danger-bg']
];
// 入力欄・ボタンの枠、経過時間の色（左の線と点）と、その下地の組。3:1 以上（WCAG 1.4.11）
const GRAPHICS = [
  ['field-border', 'card'], ['field-border', 'bg'], ['field-border', 'field-bg'], ['accent', 'card'], ['danger-text', 'danger-bg'],
  ['pri-critical', 'surface'], ['pri-warning', 'surface'], ['pri-info', 'surface'], ['pri-muted', 'surface'],
  ['pri-critical', 'card'], ['pri-warning', 'card'], ['pri-info', 'card'], ['pri-muted', 'card']
];

test('ライトとダークの配色は、文字と背景が4.5:1以上、入力欄の枠と経過時間の色が3:1以上', () => {
  for (const [name, set] of [['light', tokens(':root')], ['dark', tokens(':root[data-theme="dark"]')]]) {
    for (const [fg, bg] of TEXT) assert.ok(ratio(set[fg], set[bg]) >= 4.5, `${name} ${fg} on ${bg}: ${ratio(set[fg], set[bg]).toFixed(2)}`);
    for (const [fg, bg] of GRAPHICS) assert.ok(ratio(set[fg], set[bg]) >= 3, `${name} ${fg} on ${bg}: ${ratio(set[fg], set[bg]).toFixed(2)}`);
  }
});

test('OS の設定によるダークと、手動のダークは同じ値', () => {
  const read2 = (sel) => Object.fromEntries([...block(sel).matchAll(/--([a-z0-9-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
  const os = read2(':root:not([data-theme="light"])');
  assert.ok(Object.keys(os).length >= 25);
  assert.deepEqual(os, read2(':root[data-theme="dark"]'));
  assert.deepEqual(Object.keys(read2(':root')).sort(), Object.keys(os).sort());
});

test('操作するボタン・タブ・入力欄は高さ44px以上、入力欄の文字は16px', () => {
  for (const sel of ['.icon-btn', '.tab-btn', '.btn', '.site-footer a']) assert.match(block(sel), /min-height: 44px/, sel);
  const field = block('.text-input,\n.text-area');
  assert.match(field, /min-height: 44px/);
  assert.match(field, /font-size: 16px/);
  assert.match(block('.check-row'), /min-height: 44px/);
});

test('本文の書体は欧文の書体を先に置く（日本語の書体のバックスラッシュが ¥ の形で描かれないように）', () => {
  assert.match(css, /body \{[^}]*font-family: "Segoe UI", system-ui,/);
});

test('動きを減らす設定では、点滅と切り替えのアニメーションを止める', () => {
  assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{\s*\* \{ transition: none !important; animation: none !important; \}/);
});

test('背景は1色で塗る（以前の版はグラデーションが画面の高さで継ぎ目になっていた）', () => {
  assert.match(block('\nbody'), /background: var\(--bg\);/);
  assert.doesNotMatch(css, /gradient/);
});
