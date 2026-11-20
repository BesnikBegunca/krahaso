const { app, BrowserWindow, ipcMain, shell, Notification, session } = require('electron');
const path = require('path');
const fs = require('fs');
const { pageExtractListing, pageExtractProduct } = require('./extractors');
const { BUILTIN_STORES, COUNTRIES, buildSearchUrl } = require('./stores');
const A = require('./analysis');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
app.userAgentFallback = UA;

// ---------------- Ruajtja e të dhënave ----------------
let dataFile;
let db = { settings: { country: 'XK', disabled: [], customStores: [] }, tracked: [], history: {}, recent: [] };
function load() {
  dataFile = path.join(app.getPath('userData'), 'krahaso-data.json');
  try { db = { ...db, ...JSON.parse(fs.readFileSync(dataFile, 'utf8')) }; } catch (e) {}
}
let saveTimer;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => { try { fs.writeFileSync(dataFile, JSON.stringify(db, null, 1)); } catch (e) {} }, 300);
}
function recordPrice(url, price) {
  if (!url || !price) return;
  const h = (db.history[url] = db.history[url] || []);
  const day = new Date().toISOString().slice(0, 10);
  const last = h[h.length - 1];
  if (last && last.d === day) last.p = Math.min(last.p, price);
  else h.push({ d: day, p: price });
  if (h.length > 365) h.shift();
}

function allStores() {
  const custom = (db.settings.customStores || []).map((s) => ({ ...s, custom: true, categories: ['tech', 'appliance', 'furniture', 'general'] }));
  return [...BUILTIN_STORES, ...custom].map((s) => ({ ...s, enabled: !db.settings.disabled.includes(s.id) }));
}
function activeStores() {
  const c = db.settings.country;
  return allStores().filter((s) => s.enabled && (s.custom || s.country === c));
}

// ---------------- Leximi i faqeve (dritare e fshehur) ----------------
let scrapeSession;
function newHiddenWindow() {
  return new BrowserWindow({
    show: false,
    width: 1366,
    height: 900,
    webPreferences: { session: scrapeSession, backgroundThrottling: false, images: true, contextIsolation: true, sandbox: true },
  });
}

async function scrape(url, fnSrc, readySelector, timeoutMs = 25000) {
  const win = newHiddenWindow();
  win.webContents.setAudioMuted(true);
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  const started = Date.now();
  let result = [];
  // executeJavaScript mund të mos përgjigjet kurrë nëse faqja ngec — prandaj gjithmonë me afat
  const ejs = (code, fallback, ms = 8000) => Promise.race([
    win.webContents.executeJavaScript(code).catch(() => fallback),
    new Promise((r) => setTimeout(() => r(fallback), ms)),
  ]);
  try {
    await Promise.race([
      win.loadURL(url, { userAgent: UA }).catch(() => {}),
      new Promise((r) => setTimeout(r, 15000)),
    ]);
    while (Date.now() - started < timeoutMs) {
      const ready = readySelector ? await ejs(`document.querySelectorAll(${JSON.stringify(readySelector)}).length`, 0, 4000) : 1;
      if (ready) {
        await new Promise((r) => setTimeout(r, 900));
        result = await ejs(fnSrc, []);
        if ((Array.isArray(result) && result.length) || (!Array.isArray(result) && result && result.price)) break;
      }
      await new Promise((r) => setTimeout(r, 700));
    }
    if (!result || (Array.isArray(result) && !result.length)) {
      result = await ejs(fnSrc, []);
    }
  } finally {
    if (!win.isDestroyed()) win.destroy();
  }
  return result;
}

async function searchStore(store, query) {
  const url = buildSearchUrl(store, query);
  const src = `(${pageExtractListing.toString()})(${JSON.stringify(store.cfg || null)})`;
  try {
    const items = await scrape(url, src, store.cfg && store.cfg.card);
    return { store: store.name, storeId: store.id, url, ok: true, items: (items || []).map((i) => ({ ...i, store: store.name, storeId: store.id })) };
  } catch (e) {
    return { store: store.name, storeId: store.id, url, ok: false, items: [], error: String(e) };
  }
}

async function fetchProduct(url) {
  const src = `(${pageExtractProduct.toString()})()`;
  const r = await scrape(url, src, null, 20000);
  let host = '';
  try { host = new URL(url).hostname.replace(/^www\./, ''); } catch (e) {}
  const known = allStores().find((s) => { try { return new URL(s.searchUrl.replace(/\{q_?\}/g, 'x')).hostname.replace(/^www\./, '') === host; } catch (e) { return false; } });
  return { ...r, url, store: known ? known.name : host, storeId: known ? known.id : host };
}

// Kufizon sa dritare të fshehura hapen njëkohësisht.
async function pool(tasks, limit) {
  const out = new Array(tasks.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, async () => {
    while (next < tasks.length) { const i = next++; out[i] = await tasks[i](); }
  }));
  return out;
}

async function searchAll(query, opts = {}) {
  const stores = activeStores().filter((s) => !opts.category || !s.categories || s.categories.includes(opts.category) || opts.category === 'general');
  const terms = opts.noIntent ? [query] : A.searchTerms(query);
  const jobs = [];
  for (const s of stores) for (const t of terms) jobs.push({ s, t });
  const raw = await pool(jobs.map(({ s, t }) => () => searchStore(s, t)), 8);
  // bashko rezultatet e disa fjalëve për të njëjtin dyqan
  const results = stores.map((s) => {
    const mine = raw.filter((r) => r.storeId === s.id);
    const seen = new Set();
    const items = mine.flatMap((r) => r.items).filter((i) => (seen.has(i.url) ? false : (seen.add(i.url), true)));
    return { store: s.name, storeId: s.id, url: mine[0] ? mine[0].url : '', ok: mine.some((r) => r.ok), items };
  });
  let offers = results.flatMap((r) => r.items);
  if (opts.extraLinks && opts.extraLinks.length) {
    const extra = await Promise.all(opts.extraLinks.map((u) => fetchProduct(u).catch(() => null)));
    offers = offers.concat(extra.filter((x) => x && x.price).map((x) => ({ ...x, fromLink: true })));
  }
  const analysis = A.analyze(query, offers, { excludeWords: opts.exclude, noIntent: opts.noIntent, require: opts.require });
  analysis.terms = terms;
  for (const o of analysis.offers) recordPrice(o.url, o.price);
  analysis.offers = analysis.offers.map((o) => ({ ...o, history: db.history[o.url] || [], tracked: db.tracked.some((t) => t.url === o.url) }));
  if (analysis.best) analysis.best = analysis.offers[0];
  analysis.storeStatus = results.map((r) => ({ store: r.store, ok: r.ok, count: r.items.length, url: r.url }));
  analysis.query = query;
  save();
  return analysis;
}


// ---------------- Funksionet e aplikacionit (të përbashkëta për desktop dhe web) ----------------
// Çdo funksion merr një argument (objekt JSON) dhe kthen JSON. Desktopi i thërret me IPC, web-i me HTTP.
const handlers = {
  init: () => ({
    settings: db.settings,
    countries: COUNTRIES,
    stores: allStores().map(({ cfg, ...s }) => s),
    recent: db.recent.slice(0, 8),
    tracked: db.tracked,
    slots: A.SLOTS.map(({ id, label }) => ({ id, label })),
  }),

  search: async ({ query, links } = {}) => {
    query = String(query || '').trim();
    links = (Array.isArray(links) ? links : []).filter((l) => /^https?:\/\//i.test(l)).slice(0, 10);
    if (!query && !links.length) return null;
    db.recent = [query, ...db.recent.filter((q) => q !== query)].filter(Boolean).slice(0, 12);
    return searchAll(query || 'produkt', { extraLinks: links });
  },

  preset: ({ use, budget } = {}) => A.presetFor(use, Number(budget) || 1200),
  presetTiers: ({ use, budget } = {}) => A.presetTiers(use, Number(budget) || 1200),
  optimizeBuild: ({ options, budget, locked } = {}) => A.optimizeBuild(options || {}, Number(budget) || 0, locked || {}),

  searchPart: async ({ slot, query } = {}) => {
    const s = A.SLOTS.find((x) => x.id === slot);
    return searchAll(String(query || '').trim(), { category: 'tech', exclude: s ? s.exclude : [], require: s ? s.require : null, noIntent: true });
  },

  buildSummary: ({ picks, budget, use } = {}) => A.buildSummary(picks || {}, Number(budget) || 0, use),

  track: (offer = {}) => {
    if (offer.url && !db.tracked.some((t) => t.url === offer.url)) {
      db.tracked.unshift({ url: offer.url, title: offer.title, store: offer.store, storeId: offer.storeId, image: offer.image, price: offer.price, firstPrice: offer.price, addedAt: Date.now(), checkedAt: Date.now() });
      recordPrice(offer.url, offer.price);
      save();
    }
    return db.tracked;
  },
  untrack: (url) => { db.tracked = db.tracked.filter((t) => t.url !== url); save(); return db.tracked; },
  getTracked: () => db.tracked.map((t) => ({ ...t, history: db.history[t.url] || [] })),

  refreshTracked: async () => {
    const drops = [];
    for (const t of db.tracked) {
      let price = null;
      try {
        const p = await fetchProduct(t.url);
        price = p && p.price;
        if (!price) {
          const store = allStores().find((s) => s.id === t.storeId);
          if (store) {
            const r = await searchStore(store, t.title);
            const same = r.items.find((i) => i.url === t.url);
            price = same && same.price;
          }
        }
      } catch (e) {}
      if (price) {
        if (price < t.price) drops.push({ title: t.title, from: t.price, to: price, store: t.store });
        t.price = price;
        t.checkedAt = Date.now();
        recordPrice(t.url, price);
      }
    }
    save();
    if (drops.length && Notification.isSupported()) {
      for (const d of drops.slice(0, 3)) new Notification({ title: 'Çmimi ra!', body: `${d.title}\n€${A.fmt(d.from)} → €${A.fmt(d.to)} te ${d.store}` }).show();
    }
    return { tracked: db.tracked.map((t) => ({ ...t, history: db.history[t.url] || [] })), drops };
  },

  saveSettings: (settings = {}) => {
    const allowed = {};
    for (const k of ['country', 'disabled', 'customStores']) if (k in settings) allowed[k] = settings[k];
    db.settings = { ...db.settings, ...allowed };
    save();
    return { settings: db.settings, stores: allStores().map(({ cfg, ...s }) => s) };
  },

  // vetëm në desktop: hap linkun në shfletuesin e kompjuterit (në web e hap vetë faqja)
  openExternal: (url) => { if (/^https?:\/\//i.test(url)) shell.openExternal(url); },

  // informacion për modalitetin web (adresat ku mund të hapet nga telefoni etj.)
  webInfo: () => ({ running: !!webServer, port: webPort, urls: webServer ? lanUrls(webPort) : [] }),
  webStart: async () => { await startWeb(WEB_PORT, true); return handlers.webInfo(); },
  webStop: async () => { await stopWeb(); return handlers.webInfo(); },
};

for (const [name, fn] of Object.entries(handlers)) ipcMain.handle(name, (_e, arg) => fn(arg));

// ---------------- Serveri HTTP (shërben të njëjtën faqe + API) ----------------
const http = require('http');
const os = require('os');
const RENDERER = path.join(__dirname, 'renderer');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8' };
const WEB_ONLY_BLOCKED = new Set(['openExternal', 'webStart', 'webStop']); // nga shfletuesi nuk lejohen
const WEB_PORT = Number((process.argv.find((a) => a.startsWith('--port=')) || '').split('=')[1]) || 3210;

function lanUrls(port) {
  const out = [];
  for (const list of Object.values(os.networkInterfaces())) {
    for (const a of list || []) if (a.family === 'IPv4' && !a.internal) out.push(`http://${a.address}:${port}`);
  }
  return out;
}

function createServer({ allowApi = true, isLocalUi = false } = {}) {
  return http.createServer(async (req, res) => {
    try {
      const u = new URL(req.url, 'http://x');
      if (u.pathname.startsWith('/api/')) {
        const name = u.pathname.slice(5);
        const fn = handlers[name];
        if (!allowApi || !fn || req.method !== 'POST' || (!isLocalUi && WEB_ONLY_BLOCKED.has(name))) { res.writeHead(404); return res.end(); }
        let body = '';
        for await (const chunk of req) { body += chunk; if (body.length > 2e6) { res.writeHead(413); return res.end(); } }
        let arg;
        try { arg = body ? JSON.parse(body) : undefined; } catch (e) { res.writeHead(400); return res.end(); }
        const out = await fn(arg);
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
        return res.end(JSON.stringify(out === undefined ? null : out));
      }
      // skedarët statikë — vetëm brenda dosjes renderer
      let p = decodeURIComponent(u.pathname);
      if (p === '/' || p === '') p = '/index.html';
      const file = path.normalize(path.join(RENDERER, p));
      if (!file.startsWith(RENDERER + path.sep)) { res.writeHead(403); return res.end(); }
      fs.readFile(file, (err, data) => {
        if (err) { res.writeHead(404); return res.end('Nuk u gjet'); }
        res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
        res.end(data);
      });
    } catch (e) {
      if (!res.headersSent) res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: String(e && e.message || e) }));
    }
  });
}

// Serveri lokal i dritares desktop (vetëm 127.0.0.1) — e njëjta faqe si web-i
let uiServer, uiPort;
function startUiServer() {
  return new Promise((resolve) => {
    uiServer = createServer({ allowApi: true, isLocalUi: true });
    uiServer.listen(0, '127.0.0.1', () => { uiPort = uiServer.address().port; resolve(uiPort); });
  });
}

// Serveri web (i hapur në rrjet, që ta përdorësh nga telefoni ose kompjuterë të tjerë)
let webServer = null, webPort = null;
function startWeb(port, openLan) {
  if (webServer) return Promise.resolve(webPort);
  return new Promise((resolve, reject) => {
    const srv = createServer({ allowApi: true });
    srv.once('error', (e) => {
      if (e.code === 'EADDRINUSE' && port < WEB_PORT + 20) return startWeb(port + 1, openLan).then(resolve, reject);
      reject(e);
    });
    srv.listen(port, openLan ? '0.0.0.0' : '127.0.0.1', () => { webServer = srv; webPort = port; resolve(port); });
  });
}
function stopWeb() {
  return new Promise((resolve) => { if (!webServer) return resolve(); webServer.close(() => resolve()); webServer = null; webPort = null; });
}

// ---------------- Dritarja kryesore ----------------
function createWindow() {
  const win = new BrowserWindow({
    width: 1360,
    height: 880,
    minWidth: 380,
    minHeight: 600,
    backgroundColor: '#EEF0F4',
    title: 'Krahaso',
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    autoHideMenuBar: true,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  win.removeMenu();
  win.on('closed', () => app.quit());
  win.loadURL(`http://127.0.0.1:${uiPort}/`);
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:/.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  // mos lejo që dritarja të largohet nga aplikacioni (linqet e dyqaneve hapen në shfletues)
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith(`http://127.0.0.1:${uiPort}/`)) { e.preventDefault(); if (/^https?:/.test(url)) shell.openExternal(url); } });
}

const WEB_MODE = process.argv.includes('--web');

app.whenReady().then(async () => {
  if (process.platform === 'win32') app.setAppUserModelId('com.krahaso.app');
  load();
  scrapeSession = session.fromPartition('persist:krahaso-scraper');
  scrapeSession.setUserAgent(UA, 'sq-AL,sq;q=0.9,en;q=0.8');
  // blloko vetëm media të rënda për shpejtësi
  scrapeSession.webRequest.onBeforeRequest({ urls: ['*://*/*'] }, (d, cb) => cb({ cancel: d.resourceType === 'media' || d.resourceType === 'font' }));

  if (WEB_MODE) {
    // Modaliteti web: pa dritare, vetëm serveri. Hape adresën në çdo shfletues.
    const local = process.argv.includes('--local');
    const port = await startWeb(WEB_PORT, !local);
    const urls = [`http://localhost:${port}`].concat(local ? [] : lanUrls(port));
    console.log('\n  Krahaso (web) po punon:\n' + urls.map((u) => '   → ' + u).join('\n') + '\n  Mbylle këtë dritare për ta ndalur.\n');
    if (!process.argv.includes('--no-open')) shell.openExternal(urls[0]);
    return;
  }
  await startUiServer();
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

// Dritaret e fshehura të leximit të faqeve mbyllen vazhdimisht — në modalitetin web aplikacioni nuk duhet të mbyllet.
app.on('window-all-closed', () => { if (!WEB_MODE && process.platform !== 'darwin') app.quit(); });
