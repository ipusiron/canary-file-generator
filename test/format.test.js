import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { read } from './load.js';

const list = (dir, ext) => fs.readdirSync(new URL(`../${dir}`, import.meta.url)).filter((f) => f.endsWith(ext)).map((f) => `${dir}/${f}`);
// js/presets.js はデータ（偽のファイルの中身）なので、行の長さの検査からは外す
const DATA = ['js/presets.js'];
const CODE = [...list('js', '.js'), ...list('test', '.js')];

test('JS・テストの最長行は160文字以下', () => {
  for (const f of CODE.filter((x) => !DATA.includes(x))) {
    const lines = read(f).split('\n');
    const i = lines.findIndex((l) => l.length > 160);
    assert.equal(i, -1, `${f}:${i + 1}`);
  }
});

test('主要なファイルは1行に詰め込まれていない（行数の下限）', () => {
  const min = { 'js/canary-core.js': 200, 'js/presets.js': 150 };
  for (const [f, n] of Object.entries(min)) assert.ok(read(f).split('\n').length >= n, f);
});

test('改行は LF、制御文字なし、末尾に改行', () => {
  for (const f of [...CODE, 'package.json', '.github/workflows/test.yml']) {
    const s = read(f);
    assert.ok(!s.includes('\r'), `${f}: CR`);
    assert.ok(![...s].some((ch) => { const c = ch.codePointAt(0); return (c < 32 && c !== 10) || c === 127; }), f);
    assert.ok(s.endsWith('\n'), `${f}: no final newline`);
  }
});
