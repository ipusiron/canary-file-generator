# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Canary File Generator is an educational web tool for learning about canary files, honey files and honeytokens. It generates decoy files that carry a unique token, records them in a ledger and simulates "opened" alerts, all without network access.

**Important**: This is an educational tool. All credentials in the presets are intentionally fake and marked with `EXAMPLE_`, `DUMMY_`, `FAKE` or `[EDUCATIONAL ONLY]`, so that GitHub secret scanning and similar tools do not flag them. Do not add keys in real provider formats (the only exception is AWS's documented example key `AKIAIOSFODNN7EXAMPLE`).

## Architecture

Client-side only, no build step, no dependencies. Scripts are classic scripts (not ES modules) so that `index.html` also works from `file://`. Each script puts one object on `globalThis`.

- `index.html` - Four tabs (Generate / Alerts / Find / Learn) using the WAI-ARIA tab pattern. Meta CSP with `connect-src 'none'`
- `js/canary-core.js` (`CanaryCore`) - DOM-free logic
  - `makeToken()`: `EDU_` + 16 Crockford Base32 characters (10 bytes from `crypto.getRandomValues`) + `_FAKE`
  - `buildContent()`: replaces every `{{TOKEN}}` in the bait text (or appends `Ref: <token>` when there is none) and `{{DATE}}`; adds the educational header with a `Token:` line when enabled. The token is always written
  - `checkFileName()`: issue codes (`name.*`) and the likely saved name (separators become `_`, leading dots are dropped)
  - `MIME` is `application/octet-stream` so that Chromium/Edge do not append `.txt` to names such as `passwd`
  - `priority()`: 5 / 30 / 60 minute thresholds; `parseList()` / `normalizeAlert()` / `normalizeCanary()` validate stored JSON (canaries carry optional `place` and `memo`)
  - `findInText()`: finds tokens (exact / variant / near / unknown / malformed) and ledger locations in pasted text; limits `MAX_FIND_CHARS` and `MAX_HITS`
  - `ledgerToJson()` / `ledgerFromJson()` / `ledgerToCsv()`: export and import; CSV guards against formula injection
- `js/presets.js` (`CanaryPresets`) - Seven presets written with `String.raw`; each contains exactly one `{{TOKEN}}`
- `js/monitor.js` (`CanaryMonitor`) - Monitoring setup steps (auditd syscall rules keyed by the token, Windows `auditpol` by GUID + SACL `ReadData`, macOS `eslogger`) and pseudo logs (auditd SYSCALL/CWD/PATH, event 4663 XML). Step texts are dictionary keys; commands are language-neutral
- `js/messages.js` (`CanaryMessages`) and `js/i18n.js` (`CanaryI18n`) - Japanese/English dictionaries and static text replacement (`data-i18n`, `data-i18n-attr`). Language: `?lang=` → saved choice → browser language
- `js/theme-init.js`, `js/theme.js` (`CanaryTheme`) - Light/dark theme
- `script.js` - DOM handling only. Builds every dynamic element with `textContent` (no `innerHTML`)
- `style.css` - Color tokens on `:root`; dark values under `prefers-color-scheme` and `[data-theme="dark"]` must stay identical

## Storage

- `localStorage`: `cfg_canaries` (ledger), `cfg_alerts` (alerts; older entries with `time`/`type` are still read), `canary-file-generator-lang`, `canary-file-generator-theme`
- Every `localStorage` access is wrapped in `try`; the page keeps working in memory when storage is blocked
- Up to 200 records each (`MAX_ITEMS`); the oldest are dropped

## Development Commands

```bash
npm test                     # node --test (Node.js 22+, no dependencies)
python -m http.server 8000   # then open http://localhost:8000/
```

## Testing

- `test/core.test.js`, `test/presets.test.js`, `test/find.test.js`, `test/monitor.test.js` - logic, known answers, file name table, preset checks, finding, ledger export/import, monitoring steps and pseudo logs
- `test/html.test.js`, `test/contrast.test.js`, `test/messages.test.js`, `test/i18n.test.js`, `test/format.test.js` - CSP, ARIA, dictionaries, contrast, formatting
- `test/readme.test.js` - README tables are checked against the logic; Japanese/English READMEs and `docs/` vs `docs/en/` must have matching headings, references and directory trees

When you change behavior, update the README tables (both languages) so that `test/readme.test.js` keeps passing.

## Writing rules for Japanese text

- Body text in です・ます; lists and tables in である
- No space between Japanese and alphanumerics; long vowel marks (ブラウザー, フォルダー, ディレクトリー, リポジトリー)
- 「わかる」 in hiragana (「分ける」「分かれる」 stay in kanji)
- At most two bold spans per README section; do not bold list item labels
