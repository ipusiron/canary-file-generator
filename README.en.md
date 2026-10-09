# Canary File Generator - Educational Canary/Honey File Generator

English · [日本語](README.md)

![GitHub Repo stars](https://img.shields.io/github/stars/ipusiron/canary-file-generator?style=social)
![GitHub forks](https://img.shields.io/github/forks/ipusiron/canary-file-generator?style=social)
![GitHub last commit](https://img.shields.io/github/last-commit/ipusiron/canary-file-generator)
![GitHub license](https://img.shields.io/github/license/ipusiron/canary-file-generator)
[![GitHub Pages](https://img.shields.io/badge/demo-GitHub%20Pages-blue?logo=github)](https://ipusiron.github.io/canary-file-generator/)

**Day054 - 100 Security Tools with Generative AI**

Canary File Generator creates "important-looking files" that catch an attacker's eye (canary files and honey files) for education. It writes a unique token (a honeytoken) into each file and records every generated file in a ledger. Simulating an "opened" alert walks you through how a token tells you which file was opened. It gives monitoring setup examples that match where the file is placed (Linux auditd, Windows and macOS), and when you paste a log or leaked text, it identifies the file in the ledger from tokens and locations. It can make Word, Excel and PDF files that really open, and pack files into a ZIP with the folder structure of their location. Nothing is sent over the network.

---

## 🌐 Demo

👉 **[https://ipusiron.github.io/canary-file-generator/](https://ipusiron.github.io/canary-file-generator/)**

You can try it directly in your browser.

---

## 📸 Screenshots

>![The passwd preset after generating a file](assets/en/screenshot.png)
>
>*After generating passwd with a location and a memo, the page shows where the token was written (the header and the comment field of the last line)*

>![A file name that starts with a dot](assets/en/screenshot2.png)
>
>*Browsers change names such as .aws/credentials when saving. The page shows the likely saved name*

>![The ledger and detection log on the Alerts tab (dark mode)](assets/en/screenshot3.png)
>
>*The ledger of generated files, and the detection log colored by elapsed time*

>![Monitoring setup (Windows)](assets/en/screenshot4.png)
>
>*"Monitoring setup" in the ledger gives steps that match the location (on Windows, the audit policy and a SACL, checked with event 4663)*

>![Results on the Find tab (dark mode)](assets/en/screenshot5.png)
>
>*Paste a log or leaked text, and the page finds the file in the ledger from tokens and locations*

>![Monitoring examples on the Learn tab](assets/en/screenshot6.png)
>
>*The Learn tab summarizes the audit settings that detection needs*

>![Content format and a set in a ZIP](assets/en/screenshot7.png)
>
>*Choose the content format (Word, Excel, PDF), author and date, and pack a set into a ZIP with the folder structure*

---

## 🐤 Canary files and honeytokens

A canary file or honey file is a piece of bait that legitimate work should never open. The fact that it was opened is itself a clue to an intrusion or insider misuse. Placing a file alone, however, detects nothing. Combine it with something that records reads (an audit log or EDR), and put a unique identifier (a honeytoken) in each file. Then you can tell from a log or from leaked text which file was touched.

This tool uses the terms as follows.

- Dummy file: a stand-in or test file. It has no bait and no detection mechanism.
- Honey file: a bait file that lures attackers. Detection (an audit log and so on) is set up separately.
- Canary file: a fake file that combines bait with a mechanism, so that touching it can be detected.
- Honeytoken: fake data that legitimate work should never use (credentials, keys, documents, identifiers and so on). Its use is proof of a leak or misuse.

Where the lines fall depends on the source. Yuill et al. (2004) define a honeyfile as a bait file for which "the server sends an alarm when a honey file is accessed", so detection is part of the definition. Spitzner (2003) counts documents, not only credentials, as honeytokens. [docs/en/HISTORY.md](docs/en/HISTORY.md) traces the story from Stoll's bait documents in 1988 to Canarytokens in 2015.

---

## ✨ Features

### Generate

- Type a file name, or pick one of nine presets of file names that attackers look for
- Write the bait text (the file content). A preset fills in content with fake data. You can also replace it with dummy text (Lorem ipsum style)
- Choose whether to put an educational header and message at the top of the file
- Downloading writes a unique token into each file. The token is always written, even without the educational header
- If the file name has something the browser changes when saving (a leading dot, a separator, a reserved name and so on), the page explains why and shows the likely saved name
- The path where the file will be placed and a memo (both optional) are recorded in the ledger together with the token
- Choose the content format (Auto, Text, Word, Excel, PDF). Names ending in .docx, .xlsx or .pdf get files that really open
- The author and a date (0-30 days back) go into the document properties and the dates in the content
- Pack into a ZIP with the folder structure of the location (leading dots and folders survive; CANARY-SETUP.txt with the monitoring steps is included)
- Make a set (Linux home, Windows shared folder) in one ZIP with a different token for each file, all recorded in the ledger

### Alerts (ledger and detection log)

- Each generated file is recorded in the ledger with its name, token, location, memo and time of generation
- "Monitoring setup" on a ledger entry gives Linux (auditd), Windows and macOS steps that match the location. Commands can be copied with a button
- "Simulate opening" on a ledger entry adds one entry to the detection log. The button on the Generate tab works on the last generated file
- The detection log is colored by the time since each alert, and the category is also shown in words (updated every minute). Pseudo logs (an auditd record or event 4663 XML) can also be shown
- The pseudo logs can be sent to the Find tab in one go and examined there
- Export the ledger as JSON or CSV, and import JSON (to move it to another browser or device)
- Remove entries or clear everything. In a browser that cannot save data, it still works while the page is open

### Find

- Paste a log or leaked text, or load a text file, and the page looks for tokens and location paths and shows which file in the ledger they belong to
- Results fall into six categories, with line numbers and the surrounding text (see "Result categories of Find" below)
- "Insert an example" builds an example from the last file in the ledger: a rewritten token, an auditd pseudo log, a token not in the ledger and a token cut off partway

### Learn

- Terms, the idea behind honeytokens, history, where they are used, going further, monitoring examples (auditd, SACLs with event 4663 on Windows, eslogger on macOS) and notes for using it in practice

### Common

- Japanese and English (also selectable with `?lang=ja` or `?lang=en`)
- Light mode and dark mode (follows the OS setting and can be switched by hand)
- Fully usable from the keyboard (tabs move with the arrow keys, Home and End)

---

## 📖 How to use

1. On the Generate tab, press a preset (for example, passwd), or type a file name and bait text
2. Write `{{TOKEN}}` where you want the token in the bait text (each preset has one)
3. Press "Download". The token and where it was written appear below
4. Press "(Educational) Simulate opening this file". The page moves to the Alerts tab and adds one entry to the detection log
5. Press "Monitoring setup" in the ledger on the Alerts tab and see the steps that match the location
6. Choose a "Pseudo log format" in the detection log and press "Examine the pseudo logs on the Find tab". On the Find tab, check which line of the log points to which file
7. You can also paste real logs or text found somewhere on the Find tab (nothing leaves this page)

---

## 🔬 Technical notes

### The token

A token looks like `EDU_` + 16 characters + `_FAKE`. The 16 characters are 10 bytes (80 bits) from `crypto.getRandomValues`, written in Crockford's Base32 (32 characters without I, L, O and U). `EDU_` and `_FAKE` are educational markers and do not match the key format of any service.

### Where the token is written

| Condition | Where the token is written |
|---|---|
| The bait text contains `{{TOKEN}}` | Every place where `{{TOKEN}}` is written |
| The bait text has no `{{TOKEN}}` | A "Ref: token" line added at the end |
| The educational header is included | In addition to either of the above, the "Token:" line of the header at the top |

`{{DATE}}` is replaced with the date of generation (YYYY-MM-DD).

### Presets

| File name | Line that carries the token |
|---|---|
| passwords.txt | `Backup Admin: backup-admin / {{TOKEN}}` |
| confidential.pdf | `Document ID: {{TOKEN}}` |
| budget.xlsx | `Budget Ref: {{TOKEN}}` |
| secrets.docx | `Report ID: {{TOKEN}}` |
| id_rsa | `Key-ID: {{TOKEN}}` |
| api_keys.txt | `{{TOKEN}}` |
| passwd | `svc_report:x:1006:1006:{{TOKEN}}:/var/lib/report:/usr/sbin/nologin` |
| .aws/credentials | `# owner: {{TOKEN}}` |
| .env | `INTERNAL_API_TOKEN={{TOKEN}}` |

In api_keys.txt the token is on the line after "Internal Service Token:", and in passwd it is in the comment field (the fifth field) of the last line.

### File names and saved names

Every download is handed over as `application/octet-stream`. With `text/plain`, Chromium and Edge add `.txt` to names without an extension (passwd becomes passwd.txt). The table shows names confirmed by saving in Chromium, Edge and Firefox. The notes are those shown when the content format is "Auto" (the default).

| Name entered | Likely saved name | Notes on the page |
|---|---|---|
| `passwd` | `passwd` | No extension |
| `id_rsa` | `id_rsa` | No extension |
| `.env` | `env` | Leading dot, no extension |
| `.aws/credentials` | `aws_credentials` | Separator, leading dot, no extension |
| `budget.xlsx` | `budget.xlsx` | None |
| `old_report.doc` | `old_report.doc` | Content is text |
| `notes.txt` | `notes.txt` | None |

A leading dot and folder separators cannot survive a browser download. Rename the file or move it into its folder after saving.

### Colors by elapsed time

| Time since the alert | Color |
|---|---|
| Under 5 min | Red (blinks; stops when reduced motion is set) |
| Under 30 min | Orange |
| Under 60 min | Yellow |
| 60 min or more | Gray |

### Files that really open

With the content format set to "Auto" (the default), names ending in .docx, .xlsx or .pdf get files that open in the matching app. They are built in the browser without libraries.

| Content format | How it is built | Where the token is written |
|---|---|---|
| Text | The content as is, in UTF-8 | The content |
| Word | The minimum parts needed to open (Office Open XML), one paragraph per line | The content and the identifier property (dc:identifier) |
| Excel | One row per line; "key: value" lines are split into two columns. All values are strings (no formulas) | Cells and the identifier property (dc:identifier) |
| PDF | PDF 1.4, Courier 10 pt, wrapped at 85 characters, a new page every 60 lines. ASCII only | The content and the Subject in the document information |

The author and "how many days back" (0-30 days) go into the Word, Excel and PDF properties and into the dates in the content ({{DATE}} and the header). Canarytokens also sets the creation date of its Word documents 1 to 25 days back.

### ZIP and sets

With "Pack into a ZIP with the folder structure of the location", the file goes into the ZIP at the location path without the drive letter and the leading separator (for example, C:\Share\Finance\budget.xlsx becomes Share/Finance/budget.xlsx). Leading dots and folders survive, and after extraction the date written in the ZIP becomes the file's modified time (checked with PowerShell Expand-Archive). The ZIP also includes CANARY-SETUP.txt with the monitoring steps.

| Set | Path inside the ZIP | Content format |
|---|---|---|
| Linux home | `home/deploy/.ssh/id_rsa` | Text |
| Linux home | `home/deploy/.aws/credentials` | Text |
| Linux home | `home/deploy/app/.env` | Text |
| Windows shared folder | `Share/Finance/budget.xlsx` | Excel |
| Windows shared folder | `Share/HR/secrets.docx` | Word |
| Windows shared folder | `Share/IT/passwords.txt` | Text |

The ZIP is stored without compression, file names are written in UTF-8 (general purpose bit 11), and times are this device's local time (MS-DOS format, so in 2-second steps). Paths containing ".." or starting with / are not put into the ZIP.

### Result categories of Find

Examples when the ledger has `EDU_VTPVXVR14D2PF2DB_FAKE` (located at `/srv/share/passwords.txt`).

| Category | Condition | Example |
|---|---|---|
| Exact | Same as a token in the ledger | `EDU_VTPVXVR14D2PF2DB_FAKE` |
| Variant spelling | Differs only in letter case, "-" as a separator, or I, L and O in place of 1 and 0 | `edu-vtpvxvrl4d2pf2db-fake` |
| Location | A location path from the ledger appears (Windows paths ignore letter case) | `/srv/share/passwords.txt` |
| One character off | Differs from a token in the ledger by exactly one character | `EDU_VTPVXVR14D2PF2DC_FAKE` |
| Not in the ledger | The format is valid, but it is not in this ledger | `EDU_ZZZZZZZZZZZZZZZZ_FAKE` |
| Broken | The middle part is not 16 characters, or contains characters that are not used | `EDU_VTPVXVR14D_FAKE` |

Doubled backslashes, as in Windows paths inside JSON, are also found as locations. The text to examine can be up to 2,000,000 characters, and the search stops after 500 matches.

### Monitoring setup examples

| OS | What records access | Steps the tool gives |
|---|---|---|
| Linux | auditd (syscall rules, when opened for reading) | Add rules with `auditctl`, keep them in /etc/audit/rules.d/ and load with `augenrules --load`, check with `ausearch -k` |
| Windows | Auditing of "File System" and the file's SACL | Enable auditing with `auditpol`, add `ReadData` to the SACL in PowerShell, check events with `Id = 4663` |
| macOS | eslogger (Endpoint Security) | Check event names with `eslogger --list-events`, filter the output of `eslogger open` by the location path |

The token itself (25 characters; auditctl keys can be up to 31 bytes) is used as the auditd key. The token stays in the records, so pasting the log on the Find tab leads you to the file in the ledger. The Windows subcategory is given by GUID ({0CCE921D-69AE-11D9-BED3-505054503030}) rather than by name, so the same command works on any language version of Windows. When the location is not a path for that OS, an example path (/srv/share/..., C:\Share\..., /Users/Shared/...) is used.

### Pseudo logs

The pseudo logs in the detection log are built in the form of an auditd record (three lines, SYSCALL, CWD and PATH, for openat on x86_64) and event 4663 XML (AccessList %%4416 = ReadData, AccessMask 0x1). Values other than the time and the file path (process IDs, user names and so on) are made up for learning.

---

## 🎯 Use cases

Ways of using this tool in particular

- Marking each copy differently to trace where a document came from (advance copies of manuscripts, exam papers, internal documents): give the same document to five people with only the token changed, and note in the ledger whose copy each one is. If the document turns up somewhere, paste the text into Find and the ledger note shows which copy it came from (if the text is reworded or summarized and the token is lost, it cannot be traced)
- Catching copied-out marks too (handwritten or read out over the phone): tokens use letters without I, L, O and U (Crockford Base32), and matching reads I and L as 1 and O as 0, and ignores case and the difference between the separators "_" and "-". Even if EDU_JKWNXGS8HQS5FF11_FAKE turns up copied as `edu-jkwnxgs8hqs5ffll-fake` (1 written as l), it is shown as "Variant spelling" of the same copy
- Offering near misses as candidates (matching reference numbers at a service desk): a string that differs from a ledger token in exactly one character is shown as "One character off" with the nearby ledger row. You can check by hand the idea of matching that tolerates one misread or mistyped character and treats two or more differences as something else

General uses

- Security training: let learners go through generation, a simulated alert, the ledger and Find, and see the difference between bait and detection and how a honeytoken traces the source
- IT department preparation: before trying file server auditing (SACLs with event 4663 on Windows, auditd on Linux), prepare the files and tokens to place and check the steps that match each location with "Monitoring setup" in the ledger
- Practice reading audit logs: look at the pseudo logs (an auditd record and event 4663 XML) to see which fields carry the path and the key, and connect them to the ledger on the Find tab
- Ransomware workshops: list candidate locations and names for canary files, starting from the presets and [docs/en/SCENARIOS.md](docs/en/SCENARIOS.md) (detection itself needs EDR or audit settings)
- Leak investigation drills: create several documents with tokens, keep them in the ledger, paste leaked text on the Find tab and work out which document it came from. Tokens with altered case or separators, and tokens one character off, are told apart as well
- Handing over the ledger: export the ledger as JSON and import it in the browser of the person who monitors (hand out the CSV as a list)
- CTF and puzzle design: create fake flags or files that send players the long way round (a fake passwd or id_rsa) with tokens, and tell which file was used
- Props for escape rooms, tabletop RPGs and video: create documents that look like "confidential files" while keeping the fake markers
- Classes (computing and information security): check the format of `/etc/passwd`, how file names, extensions and MIME types relate, and why browsers rename files when saving, by actually saving files
- Development and testing: use the files as test data to see how secret scanners or DLP rules handle marked fake data
- Home and small offices: place an eye-catching file on a NAS or shared folder and use it as a marker to check for signs of access in the NAS access log (the record has to come from the NAS)
- Research and reading: apply the descriptions of Canarytokens, MITRE D3FEND Decoy File and MITRE Engage Lures to the tokens and ledger of this tool
- Combining with other tools: measure the random bits of a token from its characters and length with [Token Entropy Estimator](https://ipusiron.github.io/token-entropy-estimator/) (Day048)

The author does not encourage misuse of this tool.

---

## 🏢 Using it in practice

Files made by this tool say plainly that they are fake, so that GitHub secret scanning and similar tools do not raise false alarms. To use one as a real honey file or canary file, treat the generated file as a draft and adjust the following.

1. Remove the markers: delete `EXAMPLE_`, `DUMMY_`, `[EDUCATIONAL ONLY]` and so on (keep the token and match it with the ledger)
2. Match the environment: adjust organization names, department names, server names, IP addresses and dates to the place where the file will live
3. Get the technical details right: file permissions (for example, 600 for an SSH private key and 644 for passwd), timestamps and the directory where it is placed
4. Set up monitoring and notification: auditing of file reads (auditd, SACLs with event 4663), forwarding to a SIEM, and the alert flow

A key in a real format (AWS, GitHub, Stripe and so on) placed somewhere public may trigger secret scanning and a notice to the issuer. Honeytokens for cloud keys usually use a real key with no permissions and learn of its use from the cloud audit log (see "6. Cloud environments" in [docs/en/SCENARIOS.md](docs/en/SCENARIOS.md)).

---

## 🔒 Security

- Content Security Policy (meta tag): `default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'`. No inline scripts or styles, and no network access
- Files are built in the browser and downloaded through a Blob URL. What you enter is never sent anywhere
- Tokens come from `crypto.getRandomValues` (not `Math.random`)
- The ledger and the detection log are saved in localStorage (`cfg_canaries` and `cfg_alerts`). When loading, the types are checked, and records of the wrong shape are dropped and counted on the page
- Text on the Find tab and files loaded there are read only inside the browser (`connect-src 'none'`)
- Word, Excel and PDF files contain no references to external images or documents, no macros and no formulas (opening them sends nothing out)
- Paths containing ".." or starting with / are never put into a ZIP (so that extraction does not write outside the location)
- Importing a ledger JSON goes through the same type checks. When exporting CSV, values starting with `=`, `+`, `-`, `@` and so on get a leading `'` so that spreadsheets do not treat them as formulas (a defense against CSV injection)
- The page is built with the DOM (`textContent`) and never uses `innerHTML`. Even if the saved records are tampered with, they do not run as scripts
- Spell checking is turned off in the input fields
- `<meta name="referrer" content="no-referrer">`, and external links use `rel="noopener noreferrer"`

---

## ⚠️ Notes and limitations

- This tool does not detect anything. The "opened" alert is only a simulation on the page. Real detection needs an audit log, EDR or a similar mechanism
- The commands in the monitoring setup were checked against primary sources (man pages, Microsoft Learn, MS-GPAC and so on), but not on real systems up to the point where audit records appear. Set them up with administrator rights and follow your organization's procedures
- The values in the pseudo logs are made up. Fields in real records may differ by kernel, auditd and Windows version
- Find only searches for strings in text. For compressed files such as .docx, .xlsx and .pdf, extract the text first and paste it
- The copy buttons fail if the browser does not allow writing to the clipboard (in that case, select the commands and copy them)
- With the content format set to "Text", apps that open .pdf, .docx or .xlsx files will treat the file as broken
- Word and Excel files contain only the minimum parts needed to open (no formatting or styles). PDFs can only contain ASCII
- The Word, Excel and PDF files were checked to open with python-docx, PyMuPDF and Office 2007 (Word and Excel). Newer Office, LibreOffice and Google Docs were not tested
- ZIP extraction was checked with PowerShell Expand-Archive. Other tools may treat leading dots and times differently
- Browsers change a leading dot, separators, names reserved by Windows and shortcut extensions when saving
- The ledger and the detection log are saved only in this browser (up to 200 entries each; the oldest are dropped beyond that). They are not shared with other browsers or devices
- The colors by elapsed time depend on this device's clock
- The fake data in the presets includes the example key from the AWS documentation (AKIAIOSFODNN7EXAMPLE). The other keys are fakes whose format is deliberately broken
- It has not been tested in Safari

---

## 📚 Documents

- [docs/en/HISTORY.md](docs/en/HISTORY.md): a timeline of canary files, honey files and honeytokens, with references
- [docs/en/SCENARIOS.md](docs/en/SCENARIOS.md): where to place files and how to detect access, in ten scenarios
- [docs/en/ADVANCED_CASE_STUDIES.md](docs/en/ADVANCED_CASE_STUDIES.md): buying time with a password file (a shadow-style decoy and auditing)
- [docs/en/ADVANCED_DECEPTION.md](docs/en/ADVANCED_DECEPTION.md): deception in real operations, with a design checklist
- [docs/en/LINUX_DUMMY_FILES.md](docs/en/LINUX_DUMMY_FILES.md): how to create dummy files of a given size on Linux

The Japanese versions are in [docs/](docs/).

---

## 🧪 Tests

```bash
npm test
```

- Runs with `node --test` on Node.js 22 or later, with no dependencies (no `npm install` needed)
- GitHub Actions runs it on every push and pull request
- `test/core.test.js`: known answers and uniqueness of tokens, building the content (where the token goes), line breaks in dummy text, file name checks and saved names, color thresholds, validation of saved records
- `test/formats.test.js`: reading ZIPs back to check CRC, the UTF-8 flag and times, refusing unsafe paths, Word and Excel parts and tokens, PDF xref offsets, pages and the ASCII limit, set paths
- `test/presets.test.js`: control characters, backslashes, token positions, the number of fields in passwd, and no keys in real formats
- `test/find.test.js`: the six categories of Find, line numbers and surrounding text, letter case and doubled backslashes in Windows paths, limits and speed on 2,000,000 characters, ledger JSON round trips and import checks, CSV quoting and the CSV injection defense
- `test/monitor.test.js`: telling path styles apart, example paths, auditd, Windows and macOS steps, shell and PowerShell quoting, the form of the pseudo logs, and that passing a pseudo log through Find leads back to the file in the ledger
- `test/html.test.js`, `test/contrast.test.js`, `test/messages.test.js`, `test/i18n.test.js`, `test/format.test.js`: CSP, tab ARIA, dictionary and page text, color contrast (4.5:1 and 3:1), formatting
- `test/readme.test.js`: checks the README tables (where the token goes, presets, saved names, colors, result categories of Find, monitoring setup examples) against the logic, and the headings, images and directory structure of the Japanese and English READMEs

---

## 🔗 References

- [Canarytokens documentation (Thinkst)](https://docs.canarytokens.org/)
- [J. Yuill et al., Honeyfiles: Deceptive Files for Intrusion Detection (IEEE IAW 2004)](https://doi.org/10.1109/IAW.2004.1437806)
- [L. Spitzner, Honeytokens: The Other Honeypot (2003)](https://web.archive.org/web/20040211083829id_/http://www.securityfocus.com/infocus/1713)
- [B. M. Bowen et al., Baiting Inside Attackers Using Decoy Documents (SecureComm 2009)](https://doi.org/10.1007/978-3-642-05284-2_4)
- [MITRE D3FEND Decoy File](https://d3fend.mitre.org/technique/d3f:DecoyFile/)
- [MITRE Engage Lures](https://engage.mitre.org/matrix/?activity=lures)
- [Microsoft Learn "4663(S): An attempt was made to access an object"](https://learn.microsoft.com/en-us/previous-versions/windows/it-pro/windows-10/security/threat-protection/auditing/event-4663)
- [auditctl(8)](https://man7.org/linux/man-pages/man8/auditctl.8.html)
- [augenrules(8)](https://man7.org/linux/man-pages/man8/augenrules.8.html)
- [MS-GPAC "Subcategory and SubcategoryGUID"](https://learn.microsoft.com/en-us/openspecs/windows_protocols/ms-gpac/77878370-0712-47cd-997d-b07053429f6d)
- [SUSE "Understanding the audit logs"](https://documentation.suse.com/sles/15-SP6/html/SLES-all/cha-audit-comp.html)
- [OWASP "CSV Injection"](https://owasp.org/www-community/attacks/CSV_Injection)
- [PKWARE "APPNOTE.TXT - .ZIP File Format Specification"](https://pkware.cachefly.net/webdocs/casestudies/APPNOTE.TXT)
- [Ecma International "ECMA-376 Office Open XML file formats"](https://ecma-international.org/publications-and-standards/standards/ecma-376/)

---

## 📁 Directory structure

```text
canary-file-generator/
├── .github/                       # GitHub settings
│   ├── SECURITY.md                # Security policy (about the fake credentials)
│   └── workflows/                 # GitHub Actions workflows
│       └── test.yml               # Runs npm test on push and pull request
├── assets/                        # Images for the README
│   ├── en/                        # Screenshots of the English page
│   │   ├── screenshot.png         # Generate tab (English)
│   │   ├── screenshot2.png        # File name notes (English)
│   │   ├── screenshot3.png        # Alerts tab (English, dark)
│   │   ├── screenshot4.png        # Monitoring setup (English)
│   │   ├── screenshot5.png        # Find tab (English, dark)
│   │   ├── screenshot6.png        # Learn tab (English)
│   │   └── screenshot7.png        # Content format and sets (English)
│   ├── screenshot.png             # Generate tab
│   ├── screenshot2.png            # File name notes
│   ├── screenshot3.png            # Alerts tab (dark)
│   ├── screenshot4.png            # Monitoring setup
│   ├── screenshot5.png            # Find tab (dark)
│   ├── screenshot6.png            # Learn tab
│   └── screenshot7.png            # Content format and sets
├── docs/                          # Detailed documents
│   ├── en/                        # English documents
│   │   ├── ADVANCED_CASE_STUDIES.md # Case study on buying time (English)
│   │   ├── ADVANCED_DECEPTION.md  # Deception in real operations (English)
│   │   ├── HISTORY.md             # Timeline (English)
│   │   ├── LINUX_DUMMY_FILES.md   # Creating dummy files (English)
│   │   └── SCENARIOS.md           # Scenarios (English)
│   ├── ADVANCED_CASE_STUDIES.md   # Buying time with a password file
│   ├── ADVANCED_DECEPTION.md      # Deception in real operations
│   ├── HISTORY.md                 # Timeline and references
│   ├── LINUX_DUMMY_FILES.md       # Creating dummy files of a given size on Linux
│   └── SCENARIOS.md               # Scenarios (ten situations)
├── js/                            # Scripts loaded by the page
│   ├── canary-core.js             # Logic (tokens, content, file name checks, record validation)
│   ├── formats.js                 # Builds Word, Excel, PDF and ZIP files
│   ├── i18n.js                    # Language selection and replacing the HTML text
│   ├── messages.js                # Japanese and English text
│   ├── monitor.js                 # Monitoring setup (auditd, Windows, macOS) and pseudo logs
│   ├── presets.js                 # Presets (file names and fake data)
│   ├── theme-init.js              # Applies the saved theme before rendering
│   └── theme.js                   # Switches between light and dark
├── test/                          # Automated tests (node --test)
│   ├── contrast.test.js           # Color contrast and control sizes
│   ├── core.test.js               # Logic
│   ├── find.test.js               # Finding tokens and locations, ledger export and import
│   ├── format.test.js             # Line length, line endings and control characters
│   ├── formats.test.js            # Building ZIP, Word, Excel and PDF files
│   ├── html.test.js               # CSP, tab ARIA, text matching between HTML and dictionary
│   ├── i18n.test.js               # How the language is chosen
│   ├── load.js                    # Loads the page scripts into the tests
│   ├── messages.test.js           # Japanese and English dictionaries
│   ├── monitor.test.js            # Monitoring setup and pseudo logs
│   ├── presets.test.js            # Presets
│   └── readme.test.js             # README tables, headings, images and directory structure
├── .gitignore                     # Files excluded from Git
├── .nojekyll                      # Disables Jekyll on GitHub Pages
├── CLAUDE.md                      # Notes for development (for Claude Code)
├── LICENSE                        # MIT License
├── README.en.md                   # This file
├── README.md                      # README in Japanese
├── index.html                     # The page
├── package.json                   # Defines npm test (no dependencies)
├── script.js                      # Page logic
└── style.css                      # Styles (light and dark)
```

---

## 💻 Requirements

- A recent browser (tested in Chromium, Edge and Firefox; not tested in Safari)
- Opening `index.html` directly in a browser works. To use a local HTTP server, run the following

```bash
python -m http.server 8000
# open http://localhost:8000/
```

---

## 📄 License

- See the `LICENSE` file (MIT) for the source code license.
- No external libraries are used.

---

## 🛠️ About this tool

This tool was developed as part of the "100 Security Tools with Generative AI" project.
The project creates and publishes a variety of security-related tools over 100 days, with the help of AI.

For details of the project and the other tools, see the following page.

🔗 [https://akademeia.info/?page_id=42163](https://akademeia.info/?page_id=42163)
