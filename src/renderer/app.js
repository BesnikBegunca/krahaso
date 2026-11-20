/* global api */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const eur = (n) => '€' + Number(n).toLocaleString('de-DE', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 });
const ICON = {
  check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg>',
  x: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  bell: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>',
  ext: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>',
  link: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/></svg>',
  warn: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/></svg>',
};
const SUGGEST = ['Tavolinë buke', 'RTX 5070', 'Lavatriçe 8kg', 'Ryzen 7 7800X3D', 'Frigorifer', 'Monitor 27 165Hz', 'Karrige gaming'];

const state = { settings: null, stores: [], countries: [], links: [], tracked: [], last: null, sort: 'rec', storeFilter: null, slots: [], build: {}, buildQueries: {}, manual: new Set(), kindFilter: null };

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove('show'), 2600);
}
function open(url) { api.openExternal(url); }
// Fotot e dyqaneve që nuk ngarkohen (link i prishur, bllokim) — fshihen në vend të ikonës së prishur
document.addEventListener('error', (e) => { const t = e.target; if (t && t.tagName === 'IMG') t.classList.add('broken'); }, true);
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[data-ext]');
  if (a) { e.preventDefault(); open(a.getAttribute('href')); }
});

// ---------------- Navigimi ----------------
function show(view) {
  $$('.nav').forEach((b) => b.classList.toggle('active', b.dataset.view === view));
  $$('.view').forEach((v) => (v.hidden = v.id !== 'view-' + view));
  if (view === 'track') renderTracked();
  if (view === 'settings') renderSettings();
  $('.main').scrollTop = 0;
}
$$('.nav').forEach((b) => b.addEventListener('click', () => show(b.dataset.view)));

// ---------------- Init ----------------
(async function init() {
  const d = await api.init();
  Object.assign(state, { settings: d.settings, stores: d.stores, countries: d.countries, tracked: d.tracked, slots: d.slots });
  renderLocation();
  renderSuggest(d.recent);
  renderStoreChips();
  renderLinks();
  renderTrackedPreview();
  await applyPreset(true);
  renderParts();
  renderBuildAside();
})();

function activeStores() {
  return state.stores.filter((s) => s.enabled && (s.custom || s.country === state.settings.country));
}
function renderLocation() {
  const c = state.countries.find((x) => x.id === state.settings.country);
  $('#locName').textContent = c ? c.name : '—';
  const n = activeStores().length;
  $('#locStores').textContent = n + (n === 1 ? ' dyqan aktiv' : ' dyqane aktive');
  $('#countryLabel').textContent = c ? c.name : '';
  const tc = $('#trackCount');
  tc.hidden = !state.tracked.length;
  tc.textContent = state.tracked.length;
}
function renderSuggest(recent) {
  const items = (recent && recent.length ? recent.slice(0, 4) : []).concat(SUGGEST).filter((v, i, a) => a.indexOf(v) === i).slice(0, 7);
  $('#suggestChips').innerHTML = '<span class="muted small">Provo:</span>' + items.map((s) => `<button type="button" class="chip" data-q="${esc(s)}">${esc(s)}</button>`).join('') + '<button type="button" class="chip accent" id="toBuild">Kompleto PC</button>';
  $$('#suggestChips [data-q]').forEach((b) => b.addEventListener('click', () => { $('#q').value = b.dataset.q; runSearch(); }));
  $('#toBuild').addEventListener('click', () => show('build'));
}
function renderStoreChips() {
  const list = state.stores.filter((s) => s.custom || s.country === state.settings.country);
  $('#storeChips').innerHTML = list.length
    ? list.map((s) => `<label class="storechip"><input type="checkbox" data-id="${esc(s.id)}" ${s.enabled ? 'checked' : ''}>${esc(s.name)}</label>`).join('')
    : '<p class="muted small">Nuk ka dyqane të njohura për këtë vend. Shto një te Cilësimet ose përdor linqet.</p>';
  $$('#storeChips input').forEach((i) => i.addEventListener('change', () => toggleStore(i.dataset.id, i.checked)));
}
async function toggleStore(id, on) {
  const dis = new Set(state.settings.disabled || []);
  on ? dis.delete(id) : dis.add(id);
  const r = await api.saveSettings({ disabled: [...dis] });
  state.settings = r.settings; state.stores = r.stores;
  renderLocation(); renderStoreChips();
}

// ---------------- Linqet ----------------
$('#linkForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const v = $('#linkInput').value.trim();
  if (!/^https?:\/\/.+\..+/i.test(v)) return toast('Shkruaj një link të vlefshëm (https://…)');
  if (!state.links.includes(v)) state.links.push(v);
  $('#linkInput').value = '';
  renderLinks();
});
function renderLinks() {
  $('#linkList').innerHTML = state.links.map((l, i) => `<li>${ICON.link}<span title="${esc(l)}">${esc(l.replace(/^https?:\/\/(www\.)?/, ''))}</span><button class="iconbtn" style="width:32px;height:32px" aria-label="Hiq linkun" data-i="${i}">${ICON.x}</button></li>`).join('');
  $$('#linkList button').forEach((b) => b.addEventListener('click', () => { state.links.splice(+b.dataset.i, 1); renderLinks(); }));
}

// ---------------- Kërkimi ----------------
$('#searchForm').addEventListener('submit', (e) => { e.preventDefault(); runSearch(); });

async function runSearch() {
  const q = $('#q').value.trim();
  if (!q && !state.links.length) return toast('Shkruaj produktin që kërkon');
  if (!activeStores().length && !state.links.length) return toast('Asnjë dyqan aktiv — aktivizo një te “Ku të kërkoj?”');
  $('#homeExtras').hidden = true;
  $('#homeHead').hidden = true;
  $('#goBtn').disabled = true;
  const names = activeStores().map((s) => s.name).join(', ');
  $('#results').innerHTML = `<div class="card loading"><div class="spinner"></div><b>Po kontrolloj çmimet…</b><span class="small">${esc(names)}${state.links.length ? ' + ' + state.links.length + ' link' : ''}</span></div>`;
  try {
    const r = await api.search({ query: q, links: state.links });
    state.last = r; state.sort = 'rec'; state.storeFilter = null; state.kindFilter = null;
    renderResults();
  } catch (err) {
    $('#results').innerHTML = `<div class="card empty">Diçka shkoi keq: ${esc(err.message || err)}</div>`;
  } finally {
    $('#goBtn').disabled = false;
  }
}

function stockBadge(o) {
  if (!o.stock) return '';
  const t = o.stock.replace(/\s+/g, ' ').trim().slice(0, 24);
  return `<span class="badge ${o.inStock ? 'good' : 'neutral'}">${esc(t)}</span>`;
}
function verdictBadge(o) { return `<span class="badge ${o.tone}">${esc(o.verdict)}</span>`; }

function sparkSvg(hist, dark) {
  if (!hist || hist.length < 2) return '';
  const ps = hist.map((h) => h.p), mn = Math.min(...ps), mx = Math.max(...ps), w = 300, h = 80;
  const pts = ps.map((p, i) => `${(i / (ps.length - 1)) * w},${mx === mn ? h / 2 : 8 + (1 - (p - mn) / (mx - mn)) * (h - 16)}`).join(' ');
  const c = dark ? '#7DD3FC' : '#2346D8';
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" role="img" aria-label="Historiku: nga ${eur(ps[0])} në ${eur(ps[ps.length - 1])}"><polyline points="${pts}" fill="none" stroke="${c}" stroke-width="2.5" vector-effect="non-scaling-stroke"/></svg>`;
}

function renderResults() {
  const r = state.last;
  const el = $('#results');
  if (!r) return (el.innerHTML = '');
  const back = `<div class="toolbar"><button class="btn ghost small" id="backHome">← Kthehu</button><div class="statusline">${r.storeStatus.map((s) => `<span class="badge ${s.ok && s.count ? 'good' : s.ok ? 'neutral' : 'bad'}">${esc(s.store)}: ${s.count}</span>`).join('')}</div></div>`;
  const it = r.intent || {};
  const intentBar = it.type || (it.brands && it.brands.length)
    ? `<div class="intent">${ICON.check}<span>${it.type ? `Po shfaq vetëm <b>${esc(it.typeLabel)}</b>${it.type === 'desktop' ? ' të plotë' : ''} — pa çanta, karikues, pjesë e aksesorë` : ''}${it.type && it.brands.length ? ' · ' : ''}${it.brands.length ? `Marka: <b>${esc(it.brands.join(', '))}</b>` : ''}.</span>${it.type ? '<span class="muted small">Për aksesorë shkruaj p.sh. “çantë laptop”.</span>' : ''}</div>`
    : '';
  if (!r.offers.length) {
    el.innerHTML = back + intentBar + `<div class="card empty"><h2>Nuk u gjet asnjë ofertë që përputhet</h2><p class="muted">Provo një emër më të shkurtër (p.sh. “tavolinë” në vend të “tavolinë buke druri 6 vende”), ose aktivizo më shumë dyqane.${r.hidden ? ` (${r.hidden} produkte të tjera u gjetën por nuk përputhen me kërkimin.)` : ''}</p></div>`;
    $('#backHome').addEventListener('click', resetHome);
    return;
  }
  if (it.brandMode) return renderBrandResults(r, back, intentBar);
  const b = r.best, s = b.sub;
  const meters = [
    ['Çmimi', s.cmimi],
    s.vlera != null ? ['Vlera për çmimin', s.vlera] : null,
    s.performanca != null ? ['Performanca', s.performanca] : null,
    b.furniture ? ['Materiali / cilësia', s.cilesia] : null,
    ['Marka', s.marka],
  ].filter(Boolean);
  const isCheapest = b.url === r.cheapest.url;

  let list = r.offers.slice();
  if (state.storeFilter) list = list.filter((o) => o.store === state.storeFilter);
  if (state.sort === 'cheap') list.sort((a, c) => a.price - c.price);
  if (state.sort === 'exp') list.sort((a, c) => c.price - a.price);
  if (state.sort === 'disc') list.sort((a, c) => c.discount - a.discount);
  const stores = [...new Set(r.offers.map((o) => o.store))];

  el.innerHTML = back + intentBar + `
  <section class="rec" aria-labelledby="recT">
    <div class="l">
      <span class="pill">${ICON.check} Rekomandimi · ${esc(b.verdict)}</span>
      <div class="top">
        ${b.image ? `<img class="img" src="${esc(b.image)}" alt="">` : ''}
        <h2 id="recT">${esc(b.title)}</h2>
      </div>
      <ul>${b.reasons.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
      <div class="price"><b>${eur(b.price)}</b>${b.oldPrice ? `<s>${eur(b.oldPrice)}</s>` : ''}<em>te ${esc(b.store)}${isCheapest ? ' · më i liri' : ''}</em></div>
      <div class="chips">
        <a class="btn primary" data-ext href="${esc(b.url)}">Hap në ${esc(b.store)} ${ICON.ext}</a>
        <button class="btn ghost" data-track="0">${ICON.bell} ${b.tracked ? 'Po ndiqet' : 'Më njofto kur bie çmimi'}</button>
      </div>
    </div>
    <div class="r">
      <div class="meter"><div class="lab" style="align-items:baseline"><span style="color:#CBD5E1">Vlerësimi i përgjithshëm</span><span class="score">${b.score.toFixed(1)}<small>/10</small></span></div></div>
      ${meters.map(([l, v]) => `<div class="meter"><div class="lab"><span>${l}</span><b>${v.toFixed(1)}</b></div><div class="bar"><i style="width:${Math.round(v * 10)}%"></i></div></div>`).join('')}
      <span class="muted-d">Kategoria: ${esc(r.categoryLabel)} · vlerësim automatik</span>
    </div>
  </section>
  <div class="split">
    <section class="card listcard" aria-labelledby="offT">
      <div class="toolbar">
        <h2 id="offT">Të gjitha ofertat (${list.length})</h2>
        <div class="chips">
          <label class="sr" for="sortSel">Rendit</label>
          <select id="sortSel">
            <option value="rec">Rekomandimi</option><option value="cheap">Më i liri</option><option value="exp">Më i shtrenjti</option><option value="disc">Zbritja më e madhe</option>
          </select>
          <label class="sr" for="storeSel">Dyqani</label>
          <select id="storeSel"><option value="">Të gjitha dyqanet</option>${stores.map((x) => `<option ${state.storeFilter === x ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select>
        </div>
      </div>
      <div>${list.map((o) => offerRow(o, r.offers.indexOf(o), o.url === r.cheapest.url)).join('')}</div>
      ${r.hidden ? `<p class="muted small">${r.hidden} produkte të tjera u fshehën sepse nuk përputhen mirë me “${esc(r.query)}”.</p>` : ''}
    </section>
    <aside class="aside">
      <section class="card">
        <h2>Përmbledhje e çmimeve</h2>
        <div class="kv"><span>Më i liri</span><b>${eur(r.stats.min)}</b></div>
        <div class="kv"><span>Mesatarja</span><b>${eur(Math.round(r.stats.median * 100) / 100)}</b></div>
        <div class="kv"><span>Më i shtrenjti</span><b>${eur(r.stats.max)}</b></div>
        <div class="kv"><span>Oferta / dyqane</span><b>${r.stats.count} / ${r.stats.stores}</b></div>
        ${r.stats.max > r.stats.min ? `<p class="note">Duke zgjedhur më të lirin kursen deri në ${eur(Math.round((r.stats.max - r.stats.min) * 100) / 100)}.</p>` : ''}
      </section>
      <section class="card">
        <h2>Historiku i çmimit</h2>
        ${b.history && b.history.length >= 2 ? sparkSvg(b.history) + `<div class="kv"><span>${esc(b.history[0].d)}</span><b>${eur(b.history[0].p)}</b></div><div class="kv"><span>Sot</span><b>${eur(b.price)}</b></div>` : '<p class="muted small">Historiku mbushet automatikisht sa herë që kërkon ose kontrollon këtë produkt. Ndiqe për ta parë si ndryshon çmimi.</p>'}
      </section>
    </aside>
  </div>`;
  $('#backHome').addEventListener('click', resetHome);
  $('#sortSel').value = state.sort;
  $('#sortSel').addEventListener('change', (e) => { state.sort = e.target.value; renderResults(); });
  $('#storeSel').addEventListener('change', (e) => { state.storeFilter = e.target.value || null; renderResults(); });
  $$('[data-track]').forEach((btn) => btn.addEventListener('click', () => trackOffer(r.offers[+btn.dataset.track])));
}

// Kërkim vetëm me markë (p.sh. "Canon", "Midea"): s'ka kuptim një "rekomandim" mes printerit dhe kamerës,
// prandaj tregojmë të gjitha produktet e markës, të ndara sipas llojit.
function renderBrandResults(r, back, intentBar) {
  const el = $('#results');
  const brand = r.intent.brands.join(', ');
  let list = r.offers.slice();
  if (state.kindFilter) list = list.filter((o) => o.kind === state.kindFilter);
  if (state.storeFilter) list = list.filter((o) => o.store === state.storeFilter);
  if (state.sort === 'cheap') list.sort((a, c) => a.price - c.price);
  if (state.sort === 'exp') list.sort((a, c) => c.price - a.price);
  if (state.sort === 'disc') list.sort((a, c) => c.discount - a.discount);
  const stores = [...new Set(r.offers.map((o) => o.store))];
  const kinds = r.kinds || [];
  el.innerHTML = back + intentBar + `
  <section class="card">
    <div class="brandhead">
      <div><span class="muted small">Produktet e markës</span><h2>${esc(brand)}</h2></div>
      <div class="stats">
        <div><span>Produkte</span><b>${r.stats.count}</b></div>
        <div><span>Dyqane</span><b>${r.stats.stores}</b></div>
        <div><span>Nga</span><b>${eur(r.stats.min)}</b></div>
        <div><span>Deri</span><b>${eur(r.stats.max)}</b></div>
      </div>
    </div>
    ${kinds.length > 1 ? `<div class="chips"><button class="chip ${!state.kindFilter ? 'on' : ''}" data-kind="">Të gjitha (${r.offers.length})</button>${kinds.map((k) => `<button class="chip ${state.kindFilter === k.id ? 'on' : ''}" data-kind="${esc(k.id)}">${esc(k.label)} (${k.n})</button>`).join('')}</div>` : ''}
  </section>
  <section class="card listcard">
    <div class="toolbar">
      <h2>${state.kindFilter ? esc((kinds.find((k) => k.id === state.kindFilter) || {}).label || '') : 'Të gjitha produktet'} (${list.length})</h2>
      <div class="chips">
        <label class="sr" for="sortSel">Rendit</label>
        <select id="sortSel"><option value="rec">Sipas llojit</option><option value="cheap">Më i liri</option><option value="exp">Më i shtrenjti</option><option value="disc">Zbritja më e madhe</option></select>
        <label class="sr" for="storeSel">Dyqani</label>
        <select id="storeSel"><option value="">Të gjitha dyqanet</option>${stores.map((x) => `<option ${state.storeFilter === x ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select>
      </div>
    </div>
    <div>${list.map((o) => offerRow(o, r.offers.indexOf(o), false, true)).join('')}</div>
  </section>`;
  $('#backHome').addEventListener('click', resetHome);
  $('#sortSel').value = state.sort;
  $('#sortSel').addEventListener('change', (e) => { state.sort = e.target.value; renderResults(); });
  $('#storeSel').addEventListener('change', (e) => { state.storeFilter = e.target.value || null; renderResults(); });
  $$('[data-kind]').forEach((b) => b.addEventListener('click', () => { state.kindFilter = b.dataset.kind || null; renderResults(); }));
  $$('[data-track]').forEach((btn) => btn.addEventListener('click', () => trackOffer(r.offers[+btn.dataset.track])));
}

const KIND_LABEL = { laptop: 'Laptop', desktop: 'Desktop', phone: 'Telefon', tablet: 'Tablet', monitor: 'Monitor', tv: 'TV', printer: 'Printer', camera: 'Kamerë', washer: 'Lavatriçe', fridge: 'Frigorifer', ac: 'Kondicioner', accessory: 'Aksesor' };

function offerRow(o, idx, cheapest, brandView) {
  if (brandView) {
    return `<div class="offer">
    ${o.image ? `<img src="${esc(o.image)}" alt="" loading="lazy">` : '<div class="thumb"></div>'}
    <div class="t">
      <a data-ext href="${esc(o.url)}" title="${esc(o.title)}">${esc(o.title)}</a>
      <div class="meta"><b style="color:var(--ink2)">${esc(o.store)}</b> ${KIND_LABEL[o.kind] ? `<span class="badge neutral">${KIND_LABEL[o.kind]}</span>` : ''} ${stockBadge(o)}</div>
    </div>
    <div class="p"><b>${eur(o.price)}</b>${o.oldPrice ? `<s>${eur(o.oldPrice)}</s>` : ''}<span class="d">${o.discount ? '−' + o.discount + '%' : ''}</span></div>
    <div class="act">
      <button class="iconbtn" data-track="${idx}" aria-label="${o.tracked ? 'Po ndiqet' : 'Ndiq çmimin'}" title="${o.tracked ? 'Po ndiqet' : 'Ndiq çmimin'}" style="${o.tracked ? 'color:var(--accent);border-color:var(--accent)' : ''}">${ICON.bell}</button>
      <a class="iconbtn" data-ext href="${esc(o.url)}" aria-label="Hap në dyqan" title="Hap në dyqan">${ICON.ext}</a>
    </div>
  </div>`;
  }
  return `<div class="offer ${idx === 0 ? 'best' : ''}">
    ${o.image ? `<img src="${esc(o.image)}" alt="" loading="lazy">` : '<div class="thumb"></div>'}
    <div class="t">
      <a data-ext href="${esc(o.url)}" title="${esc(o.title)}">${esc(o.title)}</a>
      <div class="meta"><b style="color:var(--ink2)">${esc(o.store)}</b>${o.brand ? ' · ' + esc(o.brand) : ''} ${stockBadge(o)} ${verdictBadge(o)} <span>${o.score.toFixed(1)}/10</span>${o.perf ? ` <span class="badge neutral">${esc(o.perf.model)}</span>` : ''}</div>
    </div>
    <div class="p"><b>${eur(o.price)}</b>${o.oldPrice ? `<s>${eur(o.oldPrice)}</s>` : ''}<span class="d">${cheapest ? 'Më i liri' : o.discount ? '−' + o.discount + '%' : ''}</span></div>
    <div class="act">
      <button class="iconbtn" data-track="${idx}" aria-label="${o.tracked ? 'Po ndiqet' : 'Ndiq çmimin'}" title="${o.tracked ? 'Po ndiqet' : 'Ndiq çmimin'}" style="${o.tracked ? 'color:var(--accent);border-color:var(--accent)' : ''}">${ICON.bell}</button>
      <a class="iconbtn" data-ext href="${esc(o.url)}" aria-label="Hap në dyqan" title="Hap në dyqan">${ICON.ext}</a>
    </div>
  </div>`;
}

async function trackOffer(o) {
  if (!o) return;
  if (o.tracked) { state.tracked = await api.untrack(o.url); o.tracked = false; toast('U hoq nga ndjekja'); }
  else { state.tracked = await api.track(o); o.tracked = true; toast('Po e ndjek çmimin — do të njoftohesh kur bie'); }
  renderLocation(); renderResults(); renderTrackedPreview();
}

function resetHome() {
  state.last = null;
  $('#results').innerHTML = '';
  $('#homeExtras').hidden = false;
  $('#homeHead').hidden = false;
  renderTrackedPreview();
}

function renderTrackedPreview() {
  const el = $('#trackedPreview');
  if (!state.tracked.length) return (el.innerHTML = '');
  el.innerHTML = `<div class="card-head" style="margin-bottom:12px"><h2>Çmimet që po ndjek</h2><button class="btn ghost small" id="seeAll">Shiko të gjitha</button></div>
  <div class="grid2" style="grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px">${state.tracked.slice(0, 4).map((t) => {
    const d = t.price - t.firstPrice;
    return `<a class="card" data-ext href="${esc(t.url)}" style="text-decoration:none;color:inherit;gap:8px"><span class="muted small">${esc(t.store)}</span><b style="line-height:1.3">${esc(t.title.slice(0, 70))}</b><span style="display:flex;justify-content:space-between;align-items:center"><b style="font-size:20px">${eur(t.price)}</b>${d ? `<span class="badge ${d < 0 ? 'good' : 'bad'}">${d < 0 ? '−' : '+'}${eur(Math.abs(Math.round(d * 100) / 100))}</span>` : '<span class="badge neutral">pa ndryshim</span>'}</span></a>`;
  }).join('')}</div>`;
  $('#seeAll').addEventListener('click', () => show('track'));
}

// ---------------- Ndjekja ----------------
async function renderTracked() {
  const list = await api.getTracked();
  state.tracked = list;
  renderLocation();
  const el = $('#trackList');
  if (!list.length) {
    el.innerHTML = '<div class="card empty"><h2>Ende nuk po ndjek asnjë produkt</h2><p class="muted">Kërko një produkt dhe kliko ikonën e ziles për ta ndjekur.</p></div>';
    return;
  }
  el.innerHTML = `<section class="card">${list.map((t, i) => {
    const d = Math.round((t.price - t.firstPrice) * 100) / 100;
    return `<div class="titem">
      ${t.image ? `<img class="thumb" src="${esc(t.image)}" alt="">` : '<div class="thumb"></div>'}
      <div class="t" style="display:flex;flex-direction:column;gap:4px;min-width:0">
        <a data-ext href="${esc(t.url)}" style="font-weight:600;color:var(--ink);text-decoration:none">${esc(t.title)}</a>
        <span class="muted small">${esc(t.store)} · kontrolluar ${new Date(t.checkedAt).toLocaleString('sq-AL')}</span>
      </div>
      <div>${sparkSvg(t.history) || '<span class="muted small">Pak të dhëna ende</span>'}</div>
      <div style="display:flex;align-items:center;gap:12px">
        <div style="text-align:right"><b style="font-size:18px">${eur(t.price)}</b><br>${d ? `<span class="badge ${d < 0 ? 'good' : 'bad'}">${d < 0 ? '−' : '+'}${eur(Math.abs(d))}</span>` : '<span class="badge neutral">pa ndryshim</span>'}</div>
        <button class="iconbtn" data-un="${i}" aria-label="Hiq nga ndjekja" title="Hiq">${ICON.x}</button>
      </div>
    </div>`;
  }).join('')}</section>`;
  $$('[data-un]').forEach((b) => b.addEventListener('click', async () => { state.tracked = await api.untrack(list[+b.dataset.un].url); renderTracked(); renderTrackedPreview(); }));
}
$('#refreshBtn').addEventListener('click', async () => {
  const btn = $('#refreshBtn');
  btn.disabled = true; btn.textContent = 'Po kontrolloj…';
  try {
    const r = await api.refreshTracked();
    state.tracked = r.tracked;
    toast(r.drops.length ? `${r.drops.length} produkte kanë rënë në çmim!` : 'Çmimet u kontrolluan — pa rënie të reja');
    renderTracked(); renderTrackedPreview();
  } finally { btn.disabled = false; btn.textContent = 'Kontrollo çmimet tani'; }
});

// ---------------- PC builder ----------------
const useVal = () => ($('#useSeg input:checked') || {}).value || 'gaming';
async function applyPreset(silent) {
  const p = await api.preset({ use: useVal(), budget: +$('#budget').value });
  state.buildQueries = { ...p };
  state.build = {};
  state.manual = new Set();
  if (!silent) { renderParts(); renderBuildAside(); toast('U sugjeruan pjesët sipas buxhetit — kliko “Kërko çmimet”'); }
}
$('#presetBtn').addEventListener('click', () => applyPreset(false));
$$('#useSeg input').forEach((i) => i.addEventListener('change', () => applyPreset(false)));
$('#budget').addEventListener('change', () => renderBuildAside());

function renderParts() {
  $('#parts').innerHTML = state.slots.map((s) => {
    const b = state.build[s.id];
    let pick = '';
    if (b && b.loading) pick = '<div class="pick" style="grid-template-columns:1fr"><span class="muted small">Po kërkoj…</span></div>';
    else if (b && b.offer) {
      const o = b.offer;
      pick = `<div class="pick">
        ${o.image ? `<img src="${esc(o.image)}" alt="">` : '<div class="thumb" style="width:48px;height:48px"></div>'}
        <div class="t"><a data-ext href="${esc(o.url)}">${esc(o.title)}</a>
          <span class="meta muted small" style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">${verdictBadge(o)} ${o.perf ? `<span class="badge neutral">${esc(o.perf.model)}</span>` : ''}</span>
          ${b.options.length > 1 ? `<label class="sr" for="opt-${s.id}">Zgjidh ofertë tjetër</label><select id="opt-${s.id}" data-slot="${s.id}">${b.options.map((x, i) => `<option value="${i}" ${x.url === o.url ? 'selected' : ''}>${esc(eur(x.price) + ' · ' + x.store + ' · ' + x.title.slice(0, 60))}</option>`).join('')}</select>` : ''}
        </div>
        <div class="p"><b>${eur(o.price)}</b><span class="muted small">te ${esc(o.store)}</span></div>
      </div>`;
    } else if (b && b.none) pick = '<div class="pick" style="grid-template-columns:1fr"><span class="muted small">Nuk u gjet në dyqanet aktive — provo një emër tjetër.</span></div>';
    return `<div class="part"><div class="slot">${esc(s.label)}</div><div class="body">
      <form class="q" data-slot="${s.id}"><label class="sr" for="pq-${s.id}">${esc(s.label)}</label><input id="pq-${s.id}" value="${esc(state.buildQueries[s.id] || '')}" placeholder="${s.id === 'cooler' || s.id === 'gpu' ? 'Opsionale' : 'Shkruaj modelin…'}"><button class="btn ghost small" type="submit">Kërko</button>${b && b.offer ? `<button class="iconbtn" type="button" data-clear="${s.id}" aria-label="Hiq pjesën">${ICON.x}</button>` : ''}</form>
      ${pick}</div></div>`;
  }).join('');
  syncPC3D();
  $$('#parts form.q').forEach((f) => f.addEventListener('submit', (e) => { e.preventDefault(); const id = f.dataset.slot; state.buildQueries[id] = $('input', f).value.trim(); searchPart(id); }));
  $$('#parts input[id^="pq-"]').forEach((i) => i.addEventListener('change', () => { state.buildQueries[i.id.slice(3)] = i.value.trim(); }));
  $$('#parts select[data-slot]').forEach((sel) => sel.addEventListener('change', () => { const b = state.build[sel.dataset.slot]; b.offer = b.options[+sel.value]; state.manual.add(sel.dataset.slot); renderParts(); renderBuildAside(); }));
  $$('[data-clear]').forEach((btn) => btn.addEventListener('click', () => { delete state.build[btn.dataset.clear]; state.buildQueries[btn.dataset.clear] = ''; state.manual.delete(btn.dataset.clear); renderParts(); renderBuildAside(); }));
}

// Pamja 3D (pc3d.js ngarkohet si modul; mund të vijë pak më vonë se app.js)
function syncPC3D() { if (window.PC3D) window.PC3D.sync(state.build); }
window.addEventListener('pc3d-ready', syncPC3D);

async function searchPart(id) {
  const q = state.buildQueries[id];
  if (!q) { delete state.build[id]; renderParts(); renderBuildAside(); return; }
  state.build[id] = { loading: true };
  state.manual.delete(id);
  renderParts();
  try {
    const r = await api.searchPart({ slot: id, query: q });
    const opts = (r.offers || []).slice(0, 12);
    state.build[id] = opts.length ? { offer: opts[0], options: opts } : { none: true, options: [] };
  } catch (e) { state.build[id] = { none: true, options: [] }; }
  renderParts(); renderBuildAside();
}

$('#buildAllBtn').addEventListener('click', async () => {
  $$('#parts input[id^="pq-"]').forEach((i) => { state.buildQueries[i.id.slice(3)] = i.value.trim(); });
  const btn = $('#buildAllBtn');
  btn.disabled = true; btn.textContent = 'Po kërkoj…';
  const ids = state.slots.map((s) => s.id).filter((id) => state.buildQueries[id]);
  for (const id of ids) state.build[id] = { loading: true };
  renderParts();
  // 2 nga 2 që të mos hapen shumë dritare njëherësh
  for (let i = 0; i < ids.length; i += 2) await Promise.all(ids.slice(i, i + 2).map(searchPart));
  btn.disabled = false; btn.textContent = 'Kërko çmimet';
  await fitBudget();
});

$('#fitBtn').addEventListener('click', () => fitBudget());

// Përpiqet që totali të mos e kalojë buxhetin: zgjedh oferta më të lira për pjesët ku humbet më pak,
// e nëse s'mjafton, provon modele nga niveli më i lirë (p.sh. RTX 5060 Ti në vend të RTX 5070).
// Nuk është i ndaluar tejkalimi — nëse s'ka zgjidhje, mbetet kombinimi më i afërt dhe të tregohet sa e kalon.
async function fitBudget() {
  const budget = +$('#budget').value || 0;
  const filled = Object.keys(state.build).filter((k) => state.build[k] && state.build[k].options && state.build[k].options.length);
  if (!filled.length || !budget) return toast('Kliko fillimisht “Kërko çmimet”');
  const btn = $('#fitBtn');
  btn.disabled = true; btn.textContent = 'Po përshtat…';
  const run = async () => {
    const options = {}, locked = {};
    for (const k of filled) {
      options[k] = state.build[k].options;
      if (state.manual.has(k)) locked[k] = Math.max(0, options[k].findIndex((o) => o.url === state.build[k].offer.url));
    }
    const res = await api.optimizeBuild({ options, budget, locked });
    for (const k of filled) state.build[k].offer = options[k][res.pick[k]];
    return res;
  };
  try {
    const before = filled.reduce((s, k) => s + state.build[k].offer.price, 0);
    let res = await run();
    // niveli më i lirë i pjesëve, nëse ende jemi mbi buxhet (> 2%)
    if (res.total > budget * 1.02) {
      const tiers = await api.presetTiers({ use: useVal(), budget });
      for (const tier of tiers) {
        const slots = filled.filter((k) => !state.manual.has(k) && tier[k] && tier[k] !== state.buildQueries[k]);
        if (!slots.length) continue;
        renderParts();
        await Promise.all(slots.map(async (k) => {
          try {
            const r = await api.searchPart({ slot: k, query: tier[k] });
            const extra = (r.offers || []).slice(0, 8).filter((o) => !state.build[k].options.some((x) => x.url === o.url));
            state.build[k].options = state.build[k].options.concat(extra);
          } catch (e) {}
        }));
        res = await run();
        if (res.total <= budget * 1.02) break;
      }
    }
    renderParts(); renderBuildAside();
    const saved = Math.round(before - res.total);
    if (res.total <= budget) toast(saved > 0 ? `Brenda buxhetit — u kursyen ${eur(saved)}` : 'Konfigurimi është brenda buxhetit');
    else toast(`S'u gjet kombinim brenda buxhetit — më i afërti e kalon me ${eur(Math.round(res.total - budget))}`);
  } finally {
    btn.disabled = false; btn.textContent = 'Përshtat me buxhetin';
  }
}

async function renderBuildAside() {
  const picks = {};
  for (const [k, v] of Object.entries(state.build)) if (v && v.offer) picks[k] = v.offer;
  const budget = +$('#budget').value || 0;
  const s = await api.buildSummary({ picks, budget, use: useVal() });
  const over = s.total > budget;
  const okIcon = (ok) => `<span class="dot ${ok === true ? 'good' : ok === false ? 'bad' : 'warn'}">${ok === true ? ICON.check : ok === false ? ICON.x : ICON.warn}</span>`;
  const n = Object.keys(picks).length;
  // sa do kushtonte nëse blihej gjithçka te dyqani më i shtrenjtë i secilës pjesë
  let worst = 0;
  for (const v of Object.values(state.build)) if (v && v.offer) worst += Math.max(...v.options.map((x) => x.price));
  $('#buildAside').innerHTML = `
  <section class="sumcard">
    <span style="color:#CBD5E1;font-weight:600">Totali (${n} pjesë)</span>
    <span class="big">${eur(Math.round(s.total * 100) / 100)}</span>
    <div class="bar ${over ? 'over' : ''}"><i style="width:${Math.min(100, s.pct)}%"></i></div>
    <div style="display:flex;justify-content:space-between;font-size:12px;color:#CBD5E1"><span>${s.pct}% e buxhetit</span><span>${over ? 'Mbi buxhet me ' + eur(Math.round(-s.left)) : 'Mbeten ' + eur(Math.round(s.left))}</span></div>
    ${worst > s.total ? `<p style="margin:0;color:var(--mint);font-weight:600">Kursen ${eur(Math.round(worst - s.total))} krahasuar me ofertat më të shtrenjta.</p>` : ''}
  </section>
  ${s.checks.length ? `<section class="card"><h2>Përputhshmëria</h2>${s.checks.map((c) => `<div class="check">${okIcon(c.ok)}<span>${esc(c.text)}</span></div>`).join('')}</section>` : ''}
  ${s.perf ? `<section class="card"><h2>Performanca e pritur</h2>${s.perf.map((p) => `<div class="meter"><div class="lab"><span>${p.label}</span><b>${p.level}</b></div><div class="bar light"><i style="width:${p.pct}%"></i></div></div>`).join('')}<span class="muted small">Përafërsi bazuar në modelin e kartës grafike dhe procesorit.</span></section>` : ''}
  ${s.stores.length ? `<section class="card"><h2>Ku t’i blesh</h2>${s.stores.map((x) => `<div class="kv"><span>${esc(x.store)} <span class="muted">· ${x.n} pjesë</span></span><b>${eur(Math.round(x.sum * 100) / 100)}</b></div>`).join('')}</section>` : ''}
  ${!n ? '<section class="card"><p class="muted small">Kliko “Kërko çmimet” që aplikacioni të gjejë ofertën më të mirë për secilën pjesë. Mund ta ndryshosh çdo pjesë me dorë.</p></section>' : ''}`;
}

// ---------------- Cilësimet ----------------
async function renderWebCard() {
  const body = $('#webBody');
  if (!body) return;
  // Në versionin web (p.sh. i publikuar online) kjo kartë nuk ka kuptim — faqja hapet thjesht nga linku.
  if (api.platform === 'web') { $('#webCard').hidden = true; return; }
  const w = await api.webInfo();
  body.innerHTML = w.running
    ? `<div class="note">Versioni web është i ndezur. Hape në shfletues ose në telefon (i njëjti Wi‑Fi):</div>
       <ul class="weburls">${w.urls.concat(['http://localhost:' + w.port]).map((u) => `<li><a data-ext href="${esc(u)}">${esc(u)}</a></li>`).join('')}</ul>
       <button class="btn ghost" id="webToggle" type="button">Ndale versionin web</button>`
    : `<button class="btn dark" id="webToggle" type="button">Ndize versionin web</button>
       <p class="muted small">Kur e ndez, kushdo në të njëjtin rrjet mund ta hapë adresën. Ndale kur s’të duhet.</p>`;
  $('#webToggle').addEventListener('click', async () => {
    try { if (w.running) await api.webStop(); else await api.webStart(); } catch (e) { toast('Nuk u ndez: ' + (e.message || e)); }
    renderWebCard();
  });
}

function renderSettings() {
  renderWebCard();
  const sel = $('#countrySel');
  sel.innerHTML = state.countries.map((c) => `<option value="${c.id}" ${c.id === state.settings.country ? 'selected' : ''}>${esc(c.name)}</option>`).join('');
  sel.onchange = async () => { const r = await api.saveSettings({ country: sel.value }); state.settings = r.settings; state.stores = r.stores; renderLocation(); renderStoreChips(); renderSettings(); };
  const cname = (id) => (state.countries.find((c) => c.id === id) || {}).name || '';
  $('#storeToggles').innerHTML = state.stores.map((s) => `<label class="toggle"><input type="checkbox" data-id="${esc(s.id)}" ${s.enabled ? 'checked' : ''}><span class="grow"><b>${esc(s.name)}</b><span class="muted small">${s.custom ? 'Dyqan i shtuar nga ti' : cname(s.country)}</span></span>${s.custom ? `<button class="iconbtn" type="button" data-del="${esc(s.id)}" aria-label="Fshi dyqanin">${ICON.x}</button>` : ''}</label>`).join('');
  $$('#storeToggles input').forEach((i) => i.addEventListener('change', async () => { await toggleStore(i.dataset.id, i.checked); renderSettings(); }));
  $$('[data-del]').forEach((b) => b.addEventListener('click', async (e) => {
    e.preventDefault();
    const r = await api.saveSettings({ customStores: (state.settings.customStores || []).filter((c) => c.id !== b.dataset.del) });
    state.settings = r.settings; state.stores = r.stores; renderLocation(); renderStoreChips(); renderSettings();
  }));
}
$('#customForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = $('#csName').value.trim(), url = $('#csUrl').value.trim();
  if (!/^https?:\/\//.test(url) || !url.includes('{q}')) return toast('URL duhet të fillojë me https:// dhe të ketë {q}');
  const id = 'c_' + name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '_' + Date.now().toString(36);
  const r = await api.saveSettings({ customStores: [...(state.settings.customStores || []), { id, name, searchUrl: url, country: 'OTHER' }] });
  state.settings = r.settings; state.stores = r.stores;
  $('#csName').value = ''; $('#csUrl').value = '';
  renderLocation(); renderStoreChips(); renderSettings();
  toast('Dyqani u shtua');
});
