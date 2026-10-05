/* Canary File Generator - Day054
 * 画面の処理（DOM）。計算は js/canary-core.js、プリセットは js/presets.js、文言は js/messages.js
 * - タブの切り替え（WAI-ARIA のタブ。矢印キー・Home・End）
 * - ファイルの生成（トークンを必ず書き込み、application/octet-stream でダウンロード）と台帳への記録
 * - 擬似通知（台帳のファイルに対して出す）と、経過時間による色分け
 * - 言語（日本語・英語）とテーマ（ライト・ダーク）の切り替え
 */
(() => {
  'use strict';

  const C = globalThis.CanaryCore;
  const P = globalThis.CanaryPresets;
  const I18N = globalThis.CanaryI18n;
  const THEME = globalThis.CanaryTheme;
  const t = (key, vars) => globalThis.CanaryMessages.t(key, vars, I18N.lang);
  const $ = (id) => document.getElementById(id);

  // 以前の版と同じキーで通知を残す。台帳は新しいキー
  const KEY_ALERTS = 'cfg_alerts';
  const KEY_CANARIES = 'cfg_canaries';
  const REFRESH_MS = 60000;
  const TABS = ['gen', 'alerts', 'study'];

  const state = {
    canaries: [],
    alerts: [],
    stored: true,
    loadProblem: null,
    lastToken: null,
    hint: null,
    genStatus: [],
    alertsStatus: []
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
    state.canaries = C.append(state.canaries, { token, fileName: name, at: now.getTime(), notice: includeNotice });
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
    state.alerts = C.append(state.alerts, { at: Date.now(), fileName: c.fileName, token: c.token, ua: navigator.userAgent || '' });
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
    $('btn-clear-ledger').disabled = !state.canaries.length;
    if (!state.canaries.length) {
      list.replaceChildren(el('li', 'record empty', t('ledger.empty')));
      return;
    }
    list.replaceChildren(...state.canaries.slice().reverse().map((c) => {
      const li = el('li', 'record');
      const body = el('div');
      const token = el('p', 'record-meta');
      token.append(el('code', 'mono', c.token));
      body.append(el('p', 'record-title mono', c.fileName), token,
        el('p', 'record-meta', t('ledger.generated', { time: C.formatLocal(new Date(c.at)) })));
      li.append(body, button(t('ledger.simulate'), t('ledger.simulateLabel', { name: c.fileName }), () => simulate(c.token, 'ledger')));
      return li;
    }));
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
    li.append(body, button(t('log.remove'), t('log.removeLabel', { name: a.fileName }), () => removeAlert(index)));
    return li;
  }

  function renderAlerts() {
    const list = $('alert-list');
    $('log-count').textContent = t('log.count', { n: state.alerts.length });
    $('btn-clear-alerts').disabled = !state.alerts.length;
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
      writeKey(KEY_CANARIES, state.canaries);
      state.alertsStatus = [{ key: 'ledger.cleared', vars: {} }];
      state.genStatus = [];
      renderLedger();
      renderGen();
      renderAlerts();
      renderStorage();
      $('tab-alerts').focus();
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
    renderAlerts();
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
