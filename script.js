/* Canary File Generator - Day054 (MVP)
 * - Tab switching
 * - File generation via Blob (txt/pdf/docx/xlsx placeholders)
 * - Pseudo alert logging (localStorage persistence)
 */

(function () {
  // ===== Utilities =====
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  // Generate random dummy text
  function generateDummyText() {
    const words = [
      'lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipiscing', 'elit',
      'sed', 'do', 'eiusmod', 'tempor', 'incididunt', 'ut', 'labore', 'et', 'dolore',
      'magna', 'aliqua', 'enim', 'ad', 'minim', 'veniam', 'quis', 'nostrud',
      'exercitation', 'ullamco', 'laboris', 'nisi', 'aliquip', 'ex', 'ea', 'commodo',
      'consequat', 'duis', 'aute', 'irure', 'in', 'reprehenderit', 'voluptate',
      'velit', 'esse', 'cillum', 'fugiat', 'nulla', 'pariatur', 'excepteur', 'sint',
      'occaecat', 'cupidatat', 'non', 'proident', 'sunt', 'culpa', 'qui', 'officia',
      'deserunt', 'mollit', 'anim', 'id', 'est', 'laborum', 'data', 'value', 'key',
      'token', 'secret', 'password', 'user', 'admin', 'root', 'system', 'config',
      'database', 'server', 'client', 'network', 'protocol', 'encryption', 'hash',
      'algorithm', 'security', 'access', 'control', 'permission', 'authentication'
    ];
    
    const lines = [];
    const numLines = 15 + Math.floor(Math.random() * 10);
    
    for (let i = 0; i < numLines; i++) {
      const wordsPerLine = 5 + Math.floor(Math.random() * 10);
      const line = [];
      
      for (let j = 0; j < wordsPerLine; j++) {
        line.push(words[Math.floor(Math.random() * words.length)]);
      }
      
      // Occasionally add some structure
      if (Math.random() < 0.2) {
        lines.push('# ' + line.slice(0, 3).join(' ').toUpperCase());
      } else if (Math.random() < 0.1) {
        lines.push('---');
      } else if (Math.random() < 0.15) {
        const key = line[0];
        const value = line.slice(1, 4).join('_');
        lines.push(`${key}: ${value}_${Math.floor(Math.random() * 9999)}`);
      } else {
        lines.push(line.join(' ') + '.');
      }
    }
    
    return lines.join('\\n');
  }

  // Educational demo token generator (not cryptographically secure)
  function generateEducationalToken() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2);
    return `EDU_${timestamp}_${random}_FAKE`.toUpperCase();
  }

  function nowISO() {
    const d = new Date();
    // Format as YYYY-MM-DD HH:mm:ss (local time)
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
  }

  // ===== Storage (alerts) =====
  const LS_ALERTS_KEY = 'cfg_alerts';
  function loadAlerts() {
    try {
      return JSON.parse(localStorage.getItem(LS_ALERTS_KEY) || '[]');
    } catch {
      return [];
    }
  }
  function saveAlerts(alerts) {
    localStorage.setItem(LS_ALERTS_KEY, JSON.stringify(alerts));
  }

  // ===== Tabs =====
  function setupTabs() {
    const tabs = $$('.tab');
    const panels = $$('.tabpanel');

    tabs.forEach((btn) => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.tab; // gen | alerts | study

        tabs.forEach((t) => t.classList.toggle('active', t === btn));
        panels.forEach((p) =>
          p.classList.toggle('active', p.id === `tab-${key}`)
        );
      });
    });
  }

  // ===== File generation =====
  function checkFileExtension(fileName) {
    if (!fileName || fileName.trim() === '') return false;
    
    const name = fileName.trim();
    const lastDot = name.lastIndexOf('.');
    
    // No extension
    if (lastDot === -1) return false;
    
    const ext = name.substring(lastDot + 1).toLowerCase();
    
    // Check if it's txt or no extension
    if (ext === '' || ext === 'txt') return false;
    
    // Non-txt extension detected
    return true;
  }
  
  function getDefaultFileName() {
    return 'canary.txt';
  }

  function buildFileBlob(bodyText, token, enticingContent, includeEducational) {
    // Always generate text content regardless of file extension
    let content = '';
    
    if (includeEducational && bodyText) {
      const header =
        `[EDUCATIONAL CANARY FILE - DO NOT USE IN PRODUCTION]\n` +
        `Canary/Honey File (Educational Placeholder)\n` +
        `Token: ${token}\n` +
        `Generated: ${nowISO()}\n` +
        `WARNING: All credentials in this file are FAKE\n\n`;
      const divider = '\n========================================\n\n';
      content = header + bodyText + divider + (enticingContent || '');
    } else {
      // Only include enticing content when educational message is disabled
      content = enticingContent || '';
    }

    // Always use text/plain mime type
    return new Blob([content], { type: 'text/plain;charset=utf-8' });
  }

  function downloadBlob(blob, fileName) {
    const a = document.createElement('a');
    const url = URL.createObjectURL(blob);
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(url);
      a.remove();
    }, 0);
  }

  // ===== Alerts rendering =====
  const alertList = $('#alertList');

  function getAlertPriority(timeStr) {
    // Calculate time difference to determine alert priority
    const alertTime = new Date(timeStr.replace(' ', 'T'));
    const now = new Date();
    const diffMinutes = (now - alertTime) / (1000 * 60);
    
    if (diffMinutes < 5) return 'critical';  // Red - very recent
    if (diffMinutes < 30) return 'warning';  // Orange - recent
    if (diffMinutes < 60) return 'info';     // Yellow - somewhat recent
    return 'muted';                          // Gray - old
  }

  function renderAlerts() {
    const alerts = loadAlerts();
    alertList.innerHTML = '';

    if (!alerts.length) {
      const empty = document.createElement('li');
      empty.className = 'alert-item';
      empty.innerHTML = `
        <span class="alert-dot" style="background: #556070"></span>
        <div>
          <div class="alert-title">ログはありません</div>
          <div class="alert-meta">擬似通知は「生成」タブの「開封を擬似通知」で追加されます。</div>
        </div>
        <div class="alert-actions">
          <button id="clearAlertsBtn">Clear</button>
        </div>
      `;
      alertList.appendChild(empty);
      $('#clearAlertsBtn')?.addEventListener('click', clearAlerts);
      return;
    }

    alerts
      .slice()
      .reverse()
      .forEach((al, idx) => {
        const priority = getAlertPriority(al.time);
        const li = document.createElement('li');
        li.className = `alert-item alert-${priority}`;
        li.innerHTML = `
          <span class="alert-dot alert-dot-${priority}"></span>
          <div>
            <div class="alert-title">アクセス検知（擬似） - ${escapeHtml(al.fileName)} </div>
            <div class="alert-meta">
              時刻：${al.time} ／ 種別：${al.type} ／ Token：<code>${escapeHtml(al.token)}</code><br>
              UA：<code>${escapeHtml(al.ua || '')}</code>
            </div>
          </div>
          <div class="alert-actions">
            <button data-idx="${alerts.length - 1 - idx}" class="removeAlertBtn">Remove</button>
          </div>
        `;
        alertList.appendChild(li);
      });

    $$('.removeAlertBtn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.getAttribute('data-idx'));
        removeAlertByIndex(idx);
      });
    });

    // Add clear-all at end
    const last = document.createElement('li');
    last.className = 'alert-item';
    last.innerHTML = `
      <span class="alert-dot" style="background: #556070"></span>
      <div>
        <div class="alert-title">操作</div>
        <div class="alert-meta">ログを全消去します。</div>
      </div>
      <div class="alert-actions">
        <button id="clearAlertsBtn">Clear All</button>
      </div>
    `;
    alertList.appendChild(last);
    $('#clearAlertsBtn')?.addEventListener('click', clearAlerts);
  }

  function escapeHtml(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function addAlert(entry) {
    const alerts = loadAlerts();
    alerts.push(entry);
    saveAlerts(alerts);
    renderAlerts();
  }

  function removeAlertByIndex(idx) {
    const alerts = loadAlerts();
    if (idx >= 0 && idx < alerts.length) {
      alerts.splice(idx, 1);
      saveAlerts(alerts);
      renderAlerts();
    }
  }

  function clearAlerts() {
    saveAlerts([]);
    renderAlerts();
  }

  // ===== Enticing content presets =====
  const enticingContentPresets = {
    'passwords.txt': `[DUMMY DATA - EDUCATIONAL PURPOSE ONLY]
Admin Passwords - CONFIDENTIAL
=============================
Production Server: admin / EXAMPLE_P@ssw0rd123!
Database Root: root / EXAMPLE_Db#2024$ecure
VPN Access: vpnuser / EXAMPLE_Connect@2024
AWS Console: aws-admin / EXAMPLE_Cloud$ecurity789
GitHub Token: ghp_EXAMPLE_NOT_REAL_FOR_EDUCATION_ONLY
Mail Server: postmaster / EXAMPLE_Mail#Admin456
[END OF DUMMY DATA]`,
    
    'confidential.pdf': `[DUMMY DATA - EDUCATIONAL PURPOSE ONLY]
CONFIDENTIAL - Board Meeting Minutes
Date: ${new Date().toLocaleDateString()}

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
Routing: 987654321`,
    
    'budget.xlsx': `[DUMMY DATA - EDUCATIONAL PURPOSE ONLY]
Department Budget Allocation FY2024
=====================================
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
Project Beta: $3,500,000`,
    
    'secrets.docx': `[DUMMY DATA - EDUCATIONAL PURPOSE ONLY]
Internal Security Audit Results
================================
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
   Contains: 50,000+ customer records with SSN`,
    
    'id_rsa': `-----BEGIN EXAMPLE RSA PRIVATE KEY (EDUCATIONAL ONLY)-----
THIS IS NOT A REAL SSH KEY - FOR EDUCATIONAL PURPOSE ONLY
MIIEpAIBAAKCAQEA_FAKE_DUMMY_KEY_FOR_EDUCATION_ONLY_
9Kf5jX8zQkK9lRoLXYtcMZHcLvL3BzK7kxFw9zQ8xL5m9Kf5jX8
DO NOT USE THIS KEY - IT IS COMPLETELY FAKE
Production SSH Key - DUMMY DATA
Server: fake.example.internal
Port: 22
User: dummyuser
-----END FAKE RSA PRIVATE KEY (EDUCATIONAL DUMMY)-----`,
    
    'api_keys.txt': `[DUMMY DATA - EDUCATIONAL PURPOSE ONLY]
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

Database Connection String:
mongodb://example_user:example_password@example-host.localhost:27017/example_db

JWT Secret:
example_jwt_secret_for_educational_purposes_only_not_real
[END OF DUMMY DATA]`,
    
    'passwd': `[DUMMY DATA - EDUCATIONAL PURPOSE ONLY]
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
backup_svc:x:1005:1005:Backup Service Account:/var/backup:/bin/sh`
  };

  // ===== Hint management =====
  function showHint(message) {
    const hintBox = $('#hintBox');
    const hintText = $('#hintText');
    
    if (message) {
      hintText.innerHTML = '💡 HINT: ' + message;
      hintBox.style.display = 'block';
      
      // Fade in animation
      hintBox.style.opacity = '0';
      setTimeout(() => {
        hintBox.style.transition = 'opacity 0.3s ease';
        hintBox.style.opacity = '1';
      }, 10);
    } else {
      hintBox.style.display = 'none';
    }
  }

  // Preset-specific hints
  const presetHints = {
    'passwords.txt': 'パスワードファイルは/etc/shadowや.htpasswdのような形式にすると、よりリアルになります。',
    'confidential.pdf': 'PDFファイルの場合、実際のPDFバイナリを生成するツール（wkhtmltopdf等）を使うとより効果的です。',
    'budget.xlsx': 'Excelファイルは実際にExcelで開けるファイルにすると信憑性が上がります。CSVファイルも検討してください。',
    'secrets.docx': 'Word文書の場合、メタデータ（作成者、更新日時）も重要な誘引要素になります。',
    'id_rsa': 'SSH鍵ファイルは600のパーミッションで配置すると、より本物らしく見えます。',
    'api_keys.txt': 'APIキーは実際のサービスの形式に合わせると説得力が増します（例：AWS形式、GitHub形式）。',
    'passwd': '/etc/passwdファイルは通常644のパーミッションです。実際のシステムからコピーしたような内容にすると効果的です。'
  };

  // ===== Main bindings =====
  function setupGeneration() {
    const fileNameEl = $('#fileName');
    const fileWarningEl = $('#fileWarning');
    const fileBodyEl = $('#fileBody');
    const includeEducationalMsgEl = $('#includeEducationalMsg');
    const enticingContentEl = $('#enticingContent');
    const genBtn = $('#generateBtn');
    const simOpenBtn = $('#simulateOpenBtn');
    const dummyTextBtn = $('#dummyTextBtn');
    
    // Check file extension on input
    fileNameEl.addEventListener('input', () => {
      const hasNonTxtExt = checkFileExtension(fileNameEl.value);
      fileWarningEl.style.display = hasNonTxtExt ? 'block' : 'none';
    });

    // Setup checkbox for educational message
    includeEducationalMsgEl.addEventListener('change', () => {
      fileBodyEl.disabled = !includeEducationalMsgEl.checked;
    });

    // Setup preset buttons
    $$('.preset-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const name = btn.dataset.name;
        fileNameEl.value = name;
        
        // Check if non-txt extension
        const hasNonTxtExt = checkFileExtension(name);
        fileWarningEl.style.display = hasNonTxtExt ? 'block' : 'none';
        
        // Set enticing content based on preset
        if (enticingContentPresets[name]) {
          enticingContentEl.value = enticingContentPresets[name];
        }
        
        // Show preset-specific hint
        if (presetHints[name]) {
          showHint(presetHints[name]);
        }
        
        // Visual feedback
        btn.style.transform = 'scale(0.95)';
        setTimeout(() => {
          btn.style.transform = '';
        }, 100);
      });
    });

    // Setup dummy text button
    dummyTextBtn.addEventListener('click', (e) => {
      e.preventDefault();
      enticingContentEl.value = generateDummyText();
      
      // Show hint about file size
      showHint('大きいファイルサイズで誘引したい場合は、Linuxのdd/fallocate/truncateコマンドが有効です。');
      
      // Visual feedback
      dummyTextBtn.style.transform = 'scale(0.95)';
      setTimeout(() => {
        dummyTextBtn.style.transform = '';
      }, 100);
      
      toast('ダミーテキストに置き換えました。');
    });

    genBtn.addEventListener('click', () => {
      const fileName = fileNameEl.value.trim() || getDefaultFileName();
      const token = generateEducationalToken();
      const includeEducational = includeEducationalMsgEl.checked;
      const body = includeEducational ? (fileBodyEl.value || '').trim() : '';
      const enticingContent = (enticingContentEl.value || '').trim();

      const blob = buildFileBlob(body, token, enticingContent, includeEducational);
      downloadBlob(blob, fileName);

      // Preemptively log "generated" meta (not an alert; optional)
      // We only add alert when simulateOpenBtn is clicked.
      // For optional future dashboard: store last generated meta
      sessionStorage.setItem(
        'cfg_last_generated',
        JSON.stringify({ fileName, token })
      );

      // UX nudge
      toast('ファイルを生成しました。開封シミュレーションで擬似通知を発生できます。');
    });

    simOpenBtn.addEventListener('click', () => {
      // Use current inputs; if empty, try last generated meta
      let fileName = fileNameEl.value.trim() || getDefaultFileName();
      let token = generateEducationalToken();

      try {
        const last = JSON.parse(sessionStorage.getItem('cfg_last_generated') || 'null');
        if (last && last.fileName) {
          fileName = last.fileName;
          token = last.token;
        }
      } catch { /* ignore */ }

      addAlert({
        time: nowISO(),
        fileName,
        type: 'text',
        token,
        ua: navigator.userAgent || '',
      });

      // Switch to alerts tab for visibility
      document.querySelector('.tab[data-tab="alerts"]').click();
      toast('擬似通知を追加しました。');
    });
  }

  // ===== Minimal toast =====
  let toastTimer = null;
  function toast(msg) {
    let el = $('#__toast');
    if (!el) {
      el = document.createElement('div');
      el.id = '__toast';
      Object.assign(el.style, {
        position: 'fixed',
        left: '50%',
        bottom: '28px',
        transform: 'translateX(-50%)',
        background: '#111826',
        color: '#e6e8ef',
        border: '1px solid #243048',
        padding: '10px 14px',
        borderRadius: '12px',
        boxShadow: '0 12px 24px rgba(0,0,0,0.35)',
        zIndex: 9999,
        fontSize: '14px',
        maxWidth: '80%',
        textAlign: 'center',
      });
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.style.opacity = '1';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      el.style.transition = 'opacity .5s ease';
      el.style.opacity = '0';
    }, 1800);
  }

  // ===== Init =====
  document.addEventListener('DOMContentLoaded', () => {
    setupTabs();
    setupGeneration();
    renderAlerts();
  });
})();
