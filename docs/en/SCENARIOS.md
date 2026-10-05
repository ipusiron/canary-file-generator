# Scenarios: where canary files and honey files fit

English · [日本語](../SCENARIOS.md)

This page summarizes, scenario by scenario, where to place canary files and honey files, what to place and how to detect access. This tool is for education, and the detection mechanisms described here (audit logs, EDR, cloud logs and so on) have to be set up separately.

---

## 1. Honeypots and honeynets

- Bait files: names an attacker wants to open, such as `password.txt`, `confidential.docx` and `backup_keys.zip`
- Placement: conspicuous places such as shared folders, user desktops and a web server's `/backup/` directory
- Detection: auditing of file reads (auditd on Linux, SACLs and event 4663 on Windows) and regular hash checks (to detect modification). Sysmon has no event for reading a file
- What you gain: the attacker's techniques (TTPs), the intrusion path and the timing of the attack

## 2. Malware analysis and dynamic analysis

- Sandbox placement: build a realistic directory structure inside a virtual environment and place canary files in it
- Behavior observation: watch which file names and paths the malware looks for
- What you learn: how it chooses files to encrypt and which data it prioritizes for exfiltration
- Applications: analyzing the behavior of new malware families and writing YARA rules

## 3. Early ransomware detection

- Placement: the root of each drive (`C:\`, `D:\`) and important folders (Documents, Pictures)
- Canary folders: put several canary files in a folder and detect when they are encrypted together
- Automated response: on detecting a modified file, isolate the machine from the network at once and stop the process
- Working with EDR: some EDR products (Elastic Defend, Check Point Harmony Endpoint, Huntress and others) place canary files automatically for ransomware detection and detect when they are modified

## 4. Server and infrastructure intrusion detection

- SSH: `.ssh/id_rsa`, `.ssh/authorized_keys.bak`, `.ssh/config.backup`
- Configuration files: `/etc/passwd.old`, `/etc/shadow.backup`, `.env.production`
- Databases: `database_backup.sql`, `users_export.csv`, `config.ini.bak`
- Web: `.htpasswd`, `web.config.backup`, `database.php.old`
- What to monitor: reads, copies, moves, content changes and permission changes

## 5. Insider misuse and privilege abuse

- Executive information: `executives_contact.xlsx`, `board_meeting_notes.docx`
- HR information: `salary_data.xlsx`, `employee_evaluation.pdf`
- Financial information: `financial_forecast.xlsx`, `audit_report.pdf`
- Technical information: `source_code_backup.zip`, `api_documentation.pdf`
- Detection: detect access to files that normal work never needs to open

## 6. Cloud environments

- AWS keys: place a real key of an IAM user with no permissions in `.aws/credentials` or similar, and learn from CloudTrail that it was used (GitGuardian's ggcanary, SpaceSiren and others). An invalid key that only looks real leaves nothing in your own account's logs when it is used
- Docker: a `docker-compose.yml` whose environment variables contain fake API keys
- Kubernetes: fake data in ConfigMaps and Secrets
- Detection: CloudTrail, VPC Flow Logs and GuardDuty

## 7. Endpoints and desktops

- User folders: place important-looking files in each user's Documents and Desktop
- USB and other external media: detect spread through removable media
- Email attachments: send fake confidential documents as attachments and follow where they are opened
- Printers: place canary files in the shared folder of a network printer

## 8. Network shares and file servers

- Shared folders: per-department shared folders (`\\server\HR\`, `\\server\Finance\`)
- Archives: places that hold old projects and backups
- Templates: hide them among document templates
- Detection: SMB logs and the file server's audit logs

## 9. DevOps and development environments

- Git repositories: `.env.production`, `secrets.yaml`, `database.config`
- CI/CD: fake credentials in build scripts
- Container registries: fake settings in Docker images
- Detection: Git access logs and container registry logs
- Caution: a key in a real format placed in a public repository may trigger GitHub secret scanning and a notice to the issuer

## 10. CTF, exercises and education

- Competitions: mislead players with fake flags and buy time
- Red team exercises: analyze the attack team's techniques and assess the defense team's response
- Internal training: "phishing" files to raise security awareness
- Learning outcomes: understanding the attacker's point of view and practicing detection

---

## References

- [Elastic Defend advanced settings (ransomware canary)](https://www.elastic.co/docs/reference/security/defend-advanced-settings)
- [Check Point Harmony Endpoint Anti-Ransomware](https://sc1.checkpoint.com/documents/R81.10/SmartEndpoint_OLH/EN/Topics-EPSG-R81.10/Anti-Ransomware-Files.htm)
- [Huntress, Ransomware Canaries](https://www.huntress.com/blog/huntress-service-ransomware-canaries)
- [GitGuardian ggcanary](https://github.com/GitGuardian/ggcanary)
- [SpaceSiren](https://github.com/spacesiren/spacesiren)
- [Microsoft Learn, 4663(S): An attempt was made to access an object](https://learn.microsoft.com/en-us/previous-versions/windows/it-pro/windows-10/security/threat-protection/auditing/event-4663)
- [auditctl(8)](https://man7.org/linux/man-pages/man8/auditctl.8.html)
- [Canarytokens documentation](https://docs.canarytokens.org/)
