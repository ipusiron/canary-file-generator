/* Canary File Generator - Day054
 * 画面の処理（DOM）。計算は js/canary-core.js、プリセットは js/presets.js、文言は js/messages.js
 * - タブの切り替え（WAI-ARIA のタブ。矢印キー・Home・End）
 * - ファイルの生成（トークンを必ず書き込み、application/octet-stream でダウンロード）と台帳への記録
 * - 擬似通知（台帳のファイルに対して出す）と、経過時間による色分け、擬似ログ（auditd・イベント4663）の表示
 * - 台帳の書き出し（JSON・CSV）と読み込み（JSON）、ファイルごとの監視の設定例（js/monitor.js）
 * - 特定（ログや流出したテキストから、トークンと置き場所で台帳のファイルを引く）
 * - 言語（日本語・英語）とテーマ（ライト・ダーク）の切り替え
 */
(() => {
  'use strict';

  const C = globalThis.CanaryCore;
  const P = globalThis.CanaryPresets;
  const MON = globalThis.CanaryMonitor;
  const I18N = globalThis.CanaryI18n;
  const THEME = globalThis.CanaryTheme;
  const t = (key, vars) => globalThis.CanaryMessages.t(key, vars, I18N.lang);
  const $ = (id) => document.getElementById(id);

  // 以前の版と同じキーで通知を残す。台帳は新しいキー
  const KEY_ALERTS = 'cfg_alerts';
  const KEY_CANARIES = 'cfg_canaries';
  const REFRESH_MS = 60000;
  const TABS = ['gen', 'alerts', 'find', 'study'];
  // 特定の結果を並べる順（台帳に結びつくものを先に）
  const KIND_ORDER = ['exact', 'variant', 'place', 'near', 'unknown', 'malformed'];

  const state = {
    canaries: [],
    alerts: [],
    stored: true,
    loadProblem: null,
    lastToken: null,
    hint: null,
    genStatus: [],
    alertsStatus: [],
    monitorToken: null,
    monitorOs: 'linux',
    monitorStatus: [],
    logFormat: 'none',
    findResult: null,
    findStatus: []
  };

  // ===== 保存（使えない環境では、そのページの間だけ記録する） =====
  function readKey(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      state.stored = false;
      return null;
    }
  }

  function writeKey(key, list) {
    try {
      localStorage.setItem(key, JSON.stringify(list));
      return true;
    } catch {
      state.stored = false;
      return false;
    }
  }

  function loadRecords() {
    const a = C.parseList(readKey(KEY_ALERTS), C.normalizeAlert);
    const c = C.parseList(readKey(KEY_CANARIES), C.normalizeCanary);
    state.alerts = a.items;
    state.canaries = c.items;
    if (a.broken || c.broken) state.loadProblem = { key: 'alerts.broken', vars: {} };
    else if (a.dropped + c.dropped > 0) state.loadProblem = { key: 'alerts.dropped', vars: { n: a.dropped + c.dropped } };
  }

  // ===== 小さな部品 =====
  function el(tag, className, text) {
    const e = document.createElement(tag);
    if (className) e.className = className;
    if (text !== undefined) e.textContent = text;
    return e;
  }

  function button(label, ariaLabel, onClick) {
    const b = el('button', 'btn small', label);
    b.type = 'button';
    b.setAttribute('aria-label', ariaLabel);
    b.addEventListener('click', onClick);
    return b;
  }

  // 状態の文言は { key, vars } で持ち、言語を切り替えたら描き直す（vars が関数なら描くときに計算する）
  function renderStatus(target, items) {
    target.replaceChildren(...items.map(({ key, vars }) => el('p', '', t(key, typeof vars === 'function' ? vars() : vars))));
  }

  // ===== タブ =====
  function selectTab(key, focus) {
    for (const k of TABS) {
      const tab = $(`tab-${k}`);
      const on = k === key;
      tab.setAttribute('aria-selected', String(on));
      tab.tabIndex = on ? 0 : -1;
      $(`panel-${k}`).hidden = !on;
      if (on && focus) tab.focus();
    }
    if (key === 'alerts') renderAlerts();
  }

  function setupTabs() {
    for (const k of TABS) $(`tab-${k}`).addEventListener('click', () => selectTab(k, false));
    $('tab-gen').parentElement.addEventListener('keydown', (e) => {
      const i = TABS.findIndex((k) => $(`tab-${k}`).getAttribute('aria-selected') === 'true');
      const next = { ArrowRight: (i + 1) % TABS.length, ArrowLeft: (i + TABS.length - 1) % TABS.length, Home: 0, End: TABS.length - 1 }[e.key];
      if (next === undefined) return;
      e.preventDefault();
      selectTab(TABS[next], true);
    });
  }

  // ===== 生成タブ =====
  function renderName() {
    const r = C.checkFileName($('file-name').value);
    $('name-issues').replaceChildren(...r.issues.map((x) => el('li', x.level,
      t(`issue.${x.code}`, { saveAs: r.saveAs, name: r.name, ext: r.ext, max: C.MAX_NAME }))));
    const saveAs = $('save-as');
    saveAs.hidden = r.saveAs === r.name;
    saveAs.textContent = saveAs.hidden ? '' : t('gen.saveAs', { name: r.saveAs });
    return r;
  }

  function renderHint() {
    const hint = $('hint');
    hint.hidden = !state.hint;
    hint.textContent = state.hint ? t('hint.prefix') + t(state.hint) : '';
  }

  // 生成タブのボタンが擬似通知する対象＝このページで最後に生成したファイル（なければ台帳の最後）
  function lastCanary() {
    return state.canaries.find((c) => c.token === state.lastToken) || state.canaries[state.canaries.length - 1] || null;
  }

  function renderGen() {
    const c = lastCanary();
    $('btn-simulate').disabled = !c;
    $('simulate-target').textContent = c ? t('gen.simulateTarget', { name: c.fileName, token: c.token }) : t('gen.simulateNone');
    renderStatus($('gen-status'), state.genStatus);
  }

  function placesText(places) {
    const parts = [];
    if (places.header) parts.push(t('place.header'));
    if (places.body) parts.push(t('place.body', { n: places.body }));
    if (places.end) parts.push(t('place.end'));
    return parts.join(t('ui.sep'));
  }

  function download(blob, name) {
    const a = document.createElement('a');
    const url = URL.createObjectURL(blob);
    a.href = url;
    a.download = name;
    document.body.append(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(url);
      a.remove();
    }, 0);
  }

  function generate() {
    const name = renderName().name;
    const token = C.makeToken();
    const now = new Date();
    const includeNotice = $('include-notice').checked;
    const { content, places } = C.buildContent({
      token,
      body: $('body-text').value,
      includeNotice,
      notice: $('notice-text').value,
      generatedAt: C.formatLocal(now),
      date: C.formatDate(now)
    });
    download(new Blob([content], { type: C.MIME }), name);
    const entry = C.normalizeCanary({
      token, fileName: name, at: now.getTime(), notice: includeNotice, place: $('place-path').value.trim(), memo: $('memo-text').value.trim()
    });
    state.canaries = C.append(state.canaries, entry);
    writeKey(KEY_CANARIES, state.canaries);
    state.lastToken = token;
    state.genStatus = [{ key: 'gen.done', vars: { name, token } }, { key: 'gen.places', vars: () => ({ list: placesText(places) }) }];
    renderGen();
    renderLedger();
    renderStorage();
  }

  function setupGen() {
    $('file-name').addEventListener('input', renderName);
    $('include-notice').addEventListener('change', () => {
      $('notice-text').disabled = !$('include-notice').checked;
    });
    for (const b of document.querySelectorAll('[data-preset]')) {
      b.addEventListener('click', () => {
        const p = P.byId(b.dataset.preset);
        if (!p) return;
        $('file-name').value = p.name;
        $('body-text').value = p.body;
        state.hint = `hint.${p.id}`;
        state.genStatus = [{ key: 'gen.presetDone', vars: { name: p.name } }];
        renderName();
        renderHint();
        renderGen();
      });
    }
    $('btn-dummy').addEventListener('click', () => {
      $('body-text').value = C.dummyText();
      state.hint = 'hint.dummy';
      state.genStatus = [{ key: 'gen.dummyDone', vars: {} }];
      renderHint();
      renderGen();
    });
    $('btn-generate').addEventListener('click', generate);
    $('btn-simulate').addEventListener('click', () => {
      const c = lastCanary();
      if (c) simulate(c.token, 'gen');
    });
  }

  // ===== アラートタブ =====
  function simulate(token, from) {
    const c = state.canaries.find((x) => x.token === token);
    if (!c) return;
    state.alerts = C.append(state.alerts, { at: Date.now(), fileName: c.fileName, token: c.token, ua: navigator.userAgent || '', place: c.place || '' });
    writeKey(KEY_ALERTS, state.alerts);
    const msg = [{ key: 'gen.simulated', vars: { name: c.fileName } }];
    state.alertsStatus = msg;
    if (from === 'gen') {
      state.genStatus = msg;
      renderGen();
      selectTab('alerts', false);
    } else {
      renderAlerts();
    }
    renderStorage();
  }

  function renderLedger() {
    const list = $('ledger-list');
    for (const id of ['btn-clear-ledger', 'btn-export-json', 'btn-export-csv']) $(id).disabled = !state.canaries.length;
    if (!state.canaries.length) {
      list.replaceChildren(el('li', 'record empty', t('ledger.empty')));
      return;
    }
    list.replaceChildren(...state.canaries.slice().reverse().map((c) => {
      const li = el('li', 'record');
      const body = el('div');
      const token = el('p', 'record-meta');
      token.append(el('code', 'mono', c.token));
      body.append(el('p', 'record-title mono', c.fileName), token);
      if (c.place) body.append(el('p', 'record-meta mono', t('ledger.place', { place: c.place })));
      if (c.memo) body.append(el('p', 'record-meta', t('ledger.memo', { memo: c.memo })));
      body.append(el('p', 'record-meta', t('ledger.generated', { time: C.formatLocal(new Date(c.at)) })));
      const actions = el('div', 'record-actions');
      actions.append(
        button(t('ledger.monitor'), t('ledger.monitorLabel', { name: c.fileName }), () => openMonitor(c.token)),
        button(t('ledger.simulate'), t('ledger.simulateLabel', { name: c.fileName }), () => simulate(c.token, 'ledger'))
      );
      li.append(body, actions);
      return li;
    }));
  }

  // ===== 監視の設定 =====
  function openMonitor(token) {
    const c = state.canaries.find((x) => x.token === token);
    if (!c) return;
    state.monitorToken = token;
    state.monitorOs = MON.pathStyle(c.place) === 'windows' ? 'windows' : 'linux';
    state.monitorStatus = [];
    renderMonitor();
    $('monitor-title').focus();
  }

  function copyText(text) {
    const done = (key) => {
      state.monitorStatus = [{ key, vars: {} }];
      renderStatus($('monitor-status'), state.monitorStatus);
    };
    try {
      navigator.clipboard.writeText(text).then(() => done('mon.copied'), () => done('mon.copyFailed'));
    } catch {
      done('mon.copyFailed');
    }
  }

  function renderMonitor() {
    const c = state.canaries.find((x) => x.token === state.monitorToken);
    $('monitor-card').hidden = !c;
    if (!c) return;
    $('monitor-title').textContent = t('mon.title', { name: c.fileName });
    for (const os of MON.OS_LIST) $(`os-${os}`).checked = os === state.monitorOs;
    const s = MON.setup(state.monitorOs, c);
    $('monitor-path').textContent = s.example
      ? t('mon.pathExample', { os: t(`mon.os.${s.os}`), path: s.path })
      : t('mon.path', { path: s.path });
    $('monitor-issues').replaceChildren(...s.issues.map((key) => el('li', 'warn', t(key))));
    $('monitor-steps').replaceChildren(...s.steps.map((step) => {
      const li = el('li', 'step');
      li.append(el('p', 'step-title', t(step.key)), el('pre', 'code mono', step.code),
        button(t('mon.copy'), t('mon.copyLabel'), () => copyText(step.code)));
      return li;
    }));
    renderStatus($('monitor-status'), state.monitorStatus);
  }

  // ===== 台帳の書き出しと読み込み =====
  function exportLedger(kind) {
    if (!state.canaries.length) {
      state.alertsStatus = [{ key: 'ledger.exportEmpty', vars: {} }];
      renderAlerts();
      return;
    }
    const stamp = C.formatDate(new Date()).split('-').join('');
    if (kind === 'json') download(new Blob([C.ledgerToJson(state.canaries)], { type: 'application/json' }), `canary-ledger-${stamp}.json`);
    else download(new Blob([C.ledgerToCsv(state.canaries)], { type: 'text/csv;charset=utf-8' }), `canary-ledger-${stamp}.csv`);
    state.alertsStatus = [{ key: 'ledger.exported', vars: { n: state.canaries.length } }];
    renderAlerts();
  }

  async function importLedger(file) {
    let text;
    try {
      text = await file.text();
    } catch {
      state.alertsStatus = [{ key: 'import.read', vars: {} }];
      renderAlerts();
      return;
    }
    const r = C.ledgerFromJson(text, state.canaries);
    if (!r.ok) {
      state.alertsStatus = [{ key: r.error, vars: {} }];
    } else {
      state.canaries = r.items;
      writeKey(KEY_CANARIES, state.canaries);
      state.alertsStatus = [{ key: 'ledger.imported', vars: { added: r.added, duplicate: r.duplicate, invalid: r.invalid, dropped: r.dropped } }];
    }
    renderLedger();
    renderGen();
    renderAlerts();
    renderStorage();
  }

  // 通知の行。色（左の線と点）だけに頼らず、経過時間の区分を文字でも出す
  function alertItem(a, index, now) {
    const p = C.priority(a.at, now);
    const li = el('li', `record pri-${p}`);
    li.dataset.index = String(index);
    const dot = el('span', 'dot');
    dot.setAttribute('aria-hidden', 'true');
    const title = el('p', 'record-title');
    title.append(dot, el('span', 'badge', t(`pri.${p}`)), document.createTextNode(t('log.item', { name: a.fileName })));
    const token = el('p', 'record-meta', t('log.token'));
    token.append(el('code', 'mono', a.token || '-'));
    const ua = el('p', 'record-meta', t('log.ua'));
    ua.append(el('code', 'mono', a.ua || '-'));
    const body = el('div');
    body.append(title, el('p', 'record-meta', t('log.time', { time: C.formatLocal(new Date(a.at)) })), token, ua);
    if (state.logFormat !== 'none') {
      body.append(el('p', 'record-meta', t('log.pseudoNote')), el('pre', 'code mono', pseudoLogOf(a, state.logFormat)));
    }
    li.append(body, button(t('log.remove'), t('log.removeLabel', { name: a.fileName }), () => removeAlert(index)));
    return li;
  }

  // 通知の擬似ログ。台帳にあれば台帳の置き場所、なければ通知に残した置き場所で作る
  function pseudoLogOf(a, kind) {
    const c = state.canaries.find((x) => x.token === a.token) || { fileName: a.fileName, token: a.token, place: a.place };
    return MON.pseudoLog(kind, a, c);
  }

  function renderAlerts() {
    const list = $('alert-list');
    $('log-count').textContent = t('log.count', { n: state.alerts.length });
    $('btn-clear-alerts').disabled = !state.alerts.length;
    $('btn-send-find').disabled = !state.alerts.length;
    $('log-format').value = state.logFormat;
    if (!state.alerts.length) {
      list.replaceChildren(el('li', 'record empty', t('log.empty')));
    } else {
      const now = Date.now();
      const items = [];
      for (let i = state.alerts.length - 1; i >= 0; i--) items.push(alertItem(state.alerts[i], i, now));
      list.replaceChildren(...items);
    }
    renderStatus($('alerts-status'), state.alertsStatus);
  }

  // 1分ごとに色分けだけを更新する（行を作り直さないので、ボタンのフォーカスを奪わない）
  function refreshPriorities() {
    const now = Date.now();
    for (const li of $('alert-list').querySelectorAll('li[data-index]')) {
      const a = state.alerts[Number(li.dataset.index)];
      if (!a) continue;
      const p = C.priority(a.at, now);
      if (li.classList.contains(`pri-${p}`)) continue;
      li.className = `record pri-${p}`;
      li.querySelector('.badge').textContent = t(`pri.${p}`);
    }
  }

  function removeAlert(index) {
    state.alerts = state.alerts.filter((_, i) => i !== index);
    writeKey(KEY_ALERTS, state.alerts);
    state.alertsStatus = [{ key: 'log.removed', vars: {} }];
    renderAlerts();
    renderStorage();
    const next = $('alert-list').querySelector('button');
    (next || $('tab-alerts')).focus();
  }

  function setupAlerts() {
    $('btn-clear-alerts').addEventListener('click', () => {
      state.alerts = [];
      writeKey(KEY_ALERTS, state.alerts);
      state.alertsStatus = [{ key: 'log.cleared', vars: {} }];
      renderAlerts();
      renderStorage();
      $('tab-alerts').focus();
    });
    $('btn-clear-ledger').addEventListener('click', () => {
      state.canaries = [];
      state.lastToken = null;
      state.monitorToken = null;
      writeKey(KEY_CANARIES, state.canaries);
      state.alertsStatus = [{ key: 'ledger.cleared', vars: {} }];
      state.genStatus = [];
      renderLedger();
      renderMonitor();
      renderGen();
      renderAlerts();
      renderStorage();
      $('tab-alerts').focus();
    });
    $('btn-export-json').addEventListener('click', () => exportLedger('json'));
    $('btn-export-csv').addEventListener('click', () => exportLedger('csv'));
    $('btn-import').addEventListener('click', () => $('ledger-file').click());
    $('ledger-file').addEventListener('change', () => {
      const file = $('ledger-file').files[0];
      $('ledger-file').value = '';
      if (file) importLedger(file);
    });
    for (const os of MON.OS_LIST) {
      $(`os-${os}`).addEventListener('change', () => {
        state.monitorOs = os;
        state.monitorStatus = [];
        renderMonitor();
      });
    }
    $('log-format').addEventListener('change', () => {
      state.logFormat = MON.LOG_KINDS.includes($('log-format').value) ? $('log-format').value : 'none';
      renderAlerts();
    });
    // 擬似ログ（形式を選んでいなければ auditd）を古い順に並べて特定タブへ渡し、そのまま特定する
    $('btn-send-find').addEventListener('click', () => {
      const kind = state.logFormat === 'none' ? 'auditd' : state.logFormat;
      $('find-text').value = state.alerts.map((a) => pseudoLogOf(a, kind)).join('\n');
      state.alertsStatus = [{ key: 'log.sent', vars: {} }];
      renderStatus($('alerts-status'), state.alertsStatus);
      selectTab('find', true);
      runFind();
    });
  }

  // ===== 特定タブ =====
  function runFind() {
    const text = $('find-text').value;
    if (!text.trim()) {
      state.findResult = null;
      state.findStatus = [{ key: 'find.empty', vars: {} }];
    } else {
      const r = C.findInText(text, state.canaries);
      state.findResult = r;
      if (r.tooLong) state.findStatus = [{ key: 'find.tooLong', vars: { max: C.MAX_FIND_CHARS.toLocaleString('en-US') } }];
      else if (!r.hits.length) state.findStatus = [{ key: 'find.none', vars: {} }];
      else {
        state.findStatus = [{ key: 'find.done', vars: { n: r.hits.length } }];
        if (r.truncated) state.findStatus.push({ key: 'find.truncated', vars: { max: C.MAX_HITS } });
      }
    }
    renderFind();
  }

  function findItem(h) {
    const li = el('li', `record kind-${h.kind}`);
    const body = el('div');
    const title = el('p', 'record-title');
    title.append(el('span', 'badge', t(`kind.${h.kind}`)), el('code', 'mono', h.kind === 'place' || !h.token ? h.found[0] : h.token));
    const found = el('p', 'record-meta', t('find.found'));
    found.append(el('code', 'mono', h.found.join(' / ')));
    const where = el('p', 'record-meta', `${t('find.lines', { lines: h.lines.join(', ') })}${t('ui.sep')}${t('find.count', { n: h.count })}`);
    const snippet = el('p', 'snippet mono');
    snippet.append(document.createTextNode(h.snippet.before), el('mark', '', h.snippet.match), document.createTextNode(h.snippet.after));
    body.append(title, found, where, snippet);
    if (h.matches.length) {
      for (const c of h.matches) {
        body.append(el('p', 'record-meta', t('find.entry', { name: c.fileName, time: C.formatLocal(new Date(c.at)) })));
        if (c.place) body.append(el('p', 'record-meta mono', t('ledger.place', { place: c.place })));
        if (c.memo) body.append(el('p', 'record-meta', t('ledger.memo', { memo: c.memo })));
      }
    } else {
      body.append(el('p', 'record-meta', t(h.kind === 'malformed' ? 'find.malformed' : 'find.unknown')));
    }
    li.append(body);
    return li;
  }

  function renderFind() {
    renderStatus($('find-status'), state.findStatus);
    const list = $('find-results');
    const r = state.findResult;
    if (!r || r.tooLong) {
      list.replaceChildren();
      $('find-summary').textContent = '';
      return;
    }
    const hits = r.hits.slice().sort((a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind) || a.lines[0] - b.lines[0]);
    $('find-summary').textContent = t('find.summary', { n: hits.length });
    list.replaceChildren(...(hits.length ? hits.map(findItem) : [el('li', 'record empty', t('find.none'))]));
  }

  // 例: 台帳の最後のファイルのトークンを書き換えたもの・auditd の擬似ログ・台帳にないトークン・途中で切れたトークン
  function sampleText() {
    const c = state.canaries[state.canaries.length - 1];
    if (!c) return null;
    const body = c.token.slice(4, 20);
    const variant = `edu-${body.toLowerCase().replace(/1/g, 'l').replace(/0/g, 'o')}-fake`;
    const alert = { at: Date.now(), fileName: c.fileName, token: c.token, place: c.place };
    return [
      '# (1) Text found on a paste site (example)',
      `Backup Admin: backup-admin / ${variant}`,
      '# (2) auditd log (pseudo)',
      MON.pseudoLog('auditd', alert, c),
      '# (3) A token that is not in this ledger',
      'EDU_ZZZZZZZZZZZZZZZZ_FAKE',
      '# (4) A token cut off partway',
      `EDU_${body.slice(0, 10)}_FAKE`
    ].join('\n');
  }

  async function loadFindFile(file) {
    if (file.size > C.MAX_FIND_CHARS * 4) {
      state.findStatus = [{ key: 'find.tooLong', vars: { max: C.MAX_FIND_CHARS.toLocaleString('en-US') } }];
      renderFind();
      return;
    }
    try {
      const text = await file.text();
      $('find-text').value = text;
      state.findStatus = [{ key: 'find.loaded', vars: { name: file.name, n: text.length.toLocaleString('en-US') } }];
    } catch {
      state.findStatus = [{ key: 'import.read', vars: {} }];
    }
    renderFind();
  }

  function setupFind() {
    $('btn-find').addEventListener('click', runFind);
    $('btn-find-file').addEventListener('click', () => $('find-file').click());
    $('find-file').addEventListener('change', () => {
      const file = $('find-file').files[0];
      $('find-file').value = '';
      if (file) loadFindFile(file);
    });
    $('btn-find-sample').addEventListener('click', () => {
      const text = sampleText();
      if (!text) {
        state.findStatus = [{ key: 'find.sampleNone', vars: {} }];
        renderFind();
        return;
      }
      $('find-text').value = text;
      runFind();
      state.findStatus.unshift({ key: 'find.sampleDone', vars: {} });
      renderFind();
    });
    $('btn-find-clear').addEventListener('click', () => {
      $('find-text').value = '';
      state.findResult = null;
      state.findStatus = [{ key: 'find.cleared', vars: {} }];
      renderFind();
      $('find-text').focus();
    });
  }

  function renderStorage() {
    $('storage-off').hidden = state.stored;
    const problem = $('load-problem');
    problem.hidden = !state.loadProblem;
    problem.textContent = state.loadProblem ? t(state.loadProblem.key, state.loadProblem.vars) : '';
  }

  // ===== 言語・テーマ =====
  function renderAll() {
    renderName();
    renderHint();
    renderGen();
    renderLedger();
    renderMonitor();
    renderAlerts();
    renderFind();
    renderStorage();
  }

  function applyLanguage() {
    I18N.applyStaticText();
    THEME.refresh($('btn-theme'));
    renderAll();
  }

  function init() {
    I18N.init();
    loadRecords();
    setupTabs();
    setupGen();
    setupAlerts();
    setupFind();
    $('btn-lang').addEventListener('click', () => {
      I18N.set(I18N.lang === 'ja' ? 'en' : 'ja');
      applyLanguage();
    });
    $('btn-theme').addEventListener('click', () => THEME.toggle($('btn-theme')));
    applyLanguage();
    setInterval(refreshPriorities, REFRESH_MS);
  }

  init();
})();
