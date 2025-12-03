# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Canary File Generator is an educational web tool for learning about canary files, honey files, and honey tokens. It allows users to generate decoy files and simulate access detection workflows without actual network communication.

**Important**: This is an educational-only tool. All generated credentials/API keys are intentionally marked as fake (with `EXAMPLE_`, `DUMMY_`, `[EDUCATIONAL ONLY]` prefixes) to avoid triggering GitHub secret scanning and other security tools.

## Architecture

This is a client-side web application with no backend:

- **index.html** - Single-page application with three tabs: 生成 (Generation), アラート (Alerts), 座学 (Study)
- **script.js** - JavaScript logic handling:
  - Tab navigation
  - File generation via Blob API (all files are plain text regardless of extension)
  - Preset file templates (`passwords.txt`, `confidential.pdf`, `budget.xlsx`, `secrets.docx`, `id_rsa`, `api_keys.txt`, `passwd`)
  - Pseudo alert logging with time-based color priority (critical/warning/info/muted)
  - Dynamic HINT display system
  - Toast notifications
- **style.css** - Dark theme styling with CSS variables

## Development Commands

Since this is a static HTML/JS/CSS application, you can open `index.html` directly in a browser. For a local HTTP server:

```bash
# Python 3
python3 -m http.server 8080

# Node.js http-server
npx http-server -p 8080
```

## Testing

No automated tests are configured. Manual testing involves:
1. Opening the application in a browser
2. Testing file generation with different file types and presets
3. Verifying pseudo-notification functionality
4. Checking alert persistence in localStorage

## Key Implementation Details

- Files are generated using the Blob API with `text/plain` MIME type regardless of file extension
- All "detection alerts" are simulated locally - no actual network requests
- Alerts persist using localStorage under key `cfg_alerts`
- Generated file metadata temporarily stored in sessionStorage under key `cfg_last_generated`
- Educational tokens follow format: `EDU_[timestamp]_[random]_FAKE`
- Alert priority is calculated based on time elapsed since alert creation