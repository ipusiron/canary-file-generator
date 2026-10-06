// プリセット（よく狙われるファイル名と、その中身の偽データ）。globalThis.CanaryPresets に置く
// - 中身はすべて偽物で、EXAMPLE・DUMMY・FAKE などの標識を付けている
// - {{TOKEN}} は生成のときにトークンへ、{{DATE}} はその日の日付（YYYY-MM-DD）へ置き換わる
// - String.raw で書く（バックスラッシュを書いたとおりに残す。\\fileserver\backups の \b が制御文字にならないように）
(() => {
  'use strict';

  const R = String.raw;

  const PRESETS = [
    {
      id: 'passwords',
      name: 'passwords.txt',
      body: R`[DUMMY DATA - EDUCATIONAL PURPOSE ONLY]
Admin Passwords - CONFIDENTIAL
=============================
Production Server: admin / EXAMPLE_P@ssw0rd123!
Database Root: root / EXAMPLE_Db#2024$ecure
VPN Access: vpnuser / EXAMPLE_Connect@2024
AWS Console: aws-admin / EXAMPLE_Cloud$ecurity789
GitHub Token: ghp_EXAMPLE_NOT_REAL_FOR_EDUCATION_ONLY
Mail Server: postmaster / EXAMPLE_Mail#Admin456
Backup Admin: backup-admin / {{TOKEN}}
[END OF DUMMY DATA]`
    },
    {
      id: 'confidential',
      name: 'confidential.pdf',
      body: R`[DUMMY DATA - EDUCATIONAL PURPOSE ONLY]
CONFIDENTIAL - Board Meeting Minutes
Date: {{DATE}}
Document ID: {{TOKEN}}

Q4 Financial Results:
- Revenue: $45.3M (projected)
- Net Profit: $12.7M
- Acquisition Target: TechCorp Inc. ($250M valuation)

Strategic Initiatives:
- Product launch codenamed "Project Phoenix"
- Partnership with major cloud provider (under NDA)
- Staff reduction planned for Q1 (15% workforce)

Banking Details:
Account: 1234567890
Routing: 987654321`
    },
    {
      id: 'budget',
      name: 'budget.xlsx',
      body: R`[DUMMY DATA - EDUCATIONAL PURPOSE ONLY]
Department Budget Allocation FY2024
=====================================
Budget Ref: {{TOKEN}}
IT Infrastructure: $2,500,000
- Hardware refresh: $800,000
- Cloud services: $650,000
- Security tools: $450,000
- Contingency: $600,000

Executive Bonuses: $3,200,000
CEO: $1,500,000
CTO: $850,000
CFO: $850,000

Confidential Projects:
Project Alpha: $5,000,000
Project Beta: $3,500,000`
    },
    {
      id: 'secrets',
      name: 'secrets.docx',
      body: R`[DUMMY DATA - EDUCATIONAL PURPOSE ONLY]
Internal Security Audit Results
================================
Report ID: {{TOKEN}}
CRITICAL VULNERABILITIES FOUND:

1. SQL Injection in customer portal
   URL: https://portal.company.com/login
   Parameter: username

2. Default credentials on admin panel
   URL: https://admin.company.com
   Username: admin
   Password: admin123

3. Exposed API keys in source code
   AWS Access Key: AKIAIOSFODNN7EXAMPLE
   Secret Key: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY

4. Unencrypted customer data backup
   Location: \\fileserver\backups\customers.sql
   Contains: 50,000+ customer records with SSN`
    },
    {
      id: 'idrsa',
      name: 'id_rsa',
      body: R`-----BEGIN EXAMPLE RSA PRIVATE KEY (EDUCATIONAL ONLY)-----
THIS IS NOT A REAL SSH KEY - FOR EDUCATIONAL PURPOSE ONLY
MIIEpAIBAAKCAQEA_FAKE_DUMMY_KEY_FOR_EDUCATION_ONLY_
9Kf5jX8zQkK9lRoLXYtcMZHcLvL3BzK7kxFw9zQ8xL5m9Kf5jX8
DO NOT USE THIS KEY - IT IS COMPLETELY FAKE
Production SSH Key - DUMMY DATA
Server: fake.example.internal
Port: 22
User: dummyuser
Key-ID: {{TOKEN}}
-----END EXAMPLE RSA PRIVATE KEY (EDUCATIONAL ONLY)-----`
    },
    {
      id: 'apikeys',
      name: 'api_keys.txt',
      body: R`[DUMMY DATA - EDUCATIONAL PURPOSE ONLY]
API Keys and Tokens - PRODUCTION
=================================

Stripe API Key:
sk_test_EXAMPLE_NOT_REAL_FOR_EDUCATION_4eC39HqL

OpenAI API Key:
sk-EXAMPLE-NOT-REAL-FOR-EDUCATION-abcdef123456

Google Maps API:
AIzaSy_EXAMPLE_NOT_REAL_FOR_EDUCATION_7890yuiop

Twilio Auth Token:
Auth Token: FAKE_32a3f4b5c6d7e8f9g0h1i2j3k4l5
Account SID: AC_DUMMY_a1b2c3d4e5f6g7h8i9j0k1l2m3n4

Internal Service Token:
{{TOKEN}}

Database Connection String:
mongodb://example_user:example_password@example-host.localhost:27017/example_db

JWT Secret:
example_jwt_secret_for_educational_purposes_only_not_real
[END OF DUMMY DATA]`
    },
    {
      id: 'passwd',
      name: 'passwd',
      body: R`[DUMMY DATA - EDUCATIONAL PURPOSE ONLY]
root:x:0:0:root:/root:/bin/bash
daemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin
bin:x:2:2:bin:/bin:/usr/sbin/nologin
sys:x:3:3:sys:/dev:/usr/sbin/nologin
sync:x:4:65534:sync:/bin:/bin/sync
games:x:5:60:games:/usr/games:/usr/sbin/nologin
man:x:6:12:man:/var/cache/man:/usr/sbin/nologin
lp:x:7:7:lp:/var/spool/lpd:/usr/sbin/nologin
mail:x:8:8:mail:/var/mail:/usr/sbin/nologin
news:x:9:9:news:/var/spool/news:/usr/sbin/nologin
uucp:x:10:10:uucp:/var/spool/uucp:/usr/sbin/nologin
proxy:x:13:13:proxy:/bin:/usr/sbin/nologin
www-data:x:33:33:www-data:/var/www:/usr/sbin/nologin
backup:x:34:34:backup:/var/backups:/usr/sbin/nologin
list:x:38:38:Mailing List Manager:/var/list:/usr/sbin/nologin
nobody:x:65534:65534:nobody:/nonexistent:/usr/sbin/nologin
sshd:x:105:65534::/run/sshd:/usr/sbin/nologin
admin:x:1000:1000:Administrator:/home/admin:/bin/bash
dbuser:x:1001:1001:Database Admin:/home/dbuser:/bin/bash
deploy:x:1002:1002:Deployment User:/home/deploy:/bin/bash
jenkins:x:1003:1003:Jenkins CI:/var/lib/jenkins:/bin/bash
monitoring:x:1004:1004:Monitoring Service:/home/monitoring:/bin/false
backup_svc:x:1005:1005:Backup Service Account:/var/backup:/bin/sh
svc_report:x:1006:1006:{{TOKEN}}:/var/lib/report:/usr/sbin/nologin`
    },
    {
      id: 'awscred',
      name: '.aws/credentials',
      body: R`# [DUMMY DATA - EDUCATIONAL PURPOSE ONLY]
# owner: {{TOKEN}}
[default]
aws_access_key_id = AKIAIOSFODNN7EXAMPLE
aws_secret_access_key = wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY

[backup]
aws_access_key_id = AKIA_EXAMPLE_NOT_REAL
aws_secret_access_key = EXAMPLE_SECRET_NOT_REAL_FOR_EDUCATION`
    },
    {
      id: 'dotenv',
      name: '.env',
      body: R`# [DUMMY DATA - EDUCATIONAL PURPOSE ONLY]
APP_ENV=production
APP_URL=https://app.example.internal
DB_HOST=db.example.internal
DB_USER=app_admin
DB_PASSWORD=EXAMPLE_NOT_REAL_PASSWORD
SMTP_PASSWORD=EXAMPLE_NOT_REAL_SMTP
INTERNAL_API_TOKEN={{TOKEN}}`
    }
  ];

  // 一式（ZIP にフォルダー構造ごとまとめる）。place は台帳に記録する置き場所、format は中身の形式
  const KITS = [
    {
      id: 'linuxHome',
      files: [
        { preset: 'idrsa', place: '/home/deploy/.ssh/id_rsa', format: 'text' },
        { preset: 'awscred', place: '/home/deploy/.aws/credentials', format: 'text' },
        { preset: 'dotenv', place: '/home/deploy/app/.env', format: 'text' }
      ]
    },
    {
      id: 'winShare',
      files: [
        { preset: 'budget', place: 'C:\\Share\\Finance\\budget.xlsx', format: 'xlsx' },
        { preset: 'secrets', place: 'C:\\Share\\HR\\secrets.docx', format: 'docx' },
        { preset: 'passwords', place: 'C:\\Share\\IT\\passwords.txt', format: 'text' }
      ]
    }
  ];

  globalThis.CanaryPresets = { PRESETS, KITS, byId: (id) => PRESETS.find((p) => p.id === id) || null };
})();
