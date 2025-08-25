# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Canary File Generator is an educational web tool for learning about canary files, honey files, and honey tokens. It allows users to generate decoy files and simulate access detection workflows without actual network communication.

## Architecture

This is a client-side web application with no backend:

- **index.html** - Single-page application with tabs for file generation, alerts viewing, and educational content
- **script.js** - JavaScript logic handling:
  - Tab navigation
  - File generation via Blob API (creates text placeholders for txt/pdf/docx/xlsx)
  - Pseudo alert logging stored in localStorage
  - UI interactions and toast notifications
- **style.css** - Styling for the application

## Development Commands

### Local Development Server

Since this is a static HTML/JS/CSS application, use any HTTP server to avoid CORS issues:

```bash
# Python 3
python3 -m http.server 8080

# Node.js http-server
npx http-server -p 8080
```

## Testing

No automated tests are configured. Manual testing involves:
1. Opening the application in a browser
2. Testing file generation with different file types
3. Verifying pseudo-notification functionality
4. Checking alert persistence in localStorage

## Key Implementation Details

- Files are generated using the Blob API with educational placeholder content
- All "detection alerts" are simulated locally - no actual network requests
- Alerts persist using localStorage under key `cfg_alerts`
- Generated file metadata temporarily stored in sessionStorage
- UUID generation is demo-quality (not cryptographically secure)