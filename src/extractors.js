// Këto funksione ekzekutohen BRENDA faqes së dyqanit (në një dritare të fshehur).
// Prandaj nuk mund të përdorin asgjë nga Node — vetëm DOM.

function pageExtractListing(cfg) {
  const abs = (u) => { try { return new URL(u, location.href).href; } catch (e) { return ''; } };
  const parseNum = (raw) => {
    if (raw == null) return null;
    let t = String(raw).replace(/[^\d.,]/g, '');
    if (!t) return null;
    const lc = t.lastIndexOf(','), ld = t.lastIndexOf('.');
    if (lc > -1 && ld > -1) {
      if (lc > ld) t = t.replace(/\./g, '').replace(',', '.');
      else t = t.replace(/,/g, '');
    } else if (lc > -1) {
      const dec = t.length - lc - 1;
      t = (dec === 2 || dec === 1) && t.split(',').length === 2 ? t.replace(',', '.') : t.replace(/,/g, '');
    } else if (ld > -1) {
      const parts = t.split('.');
      const dec = t.length - ld - 1;
      if (parts.length > 2 || dec === 3) t = t.replace(/\./g, '');
    }
    const n = parseFloat(t);
    return isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null;
  };
  const priceOf = (el) => {
    if (!el) return null;
    const c = el.cloneNode(true);
    c.querySelectorAll('sup, .decimal-rounded-price').forEach((s) => { s.textContent = '.' + s.textContent.trim(); });
    c.querySelectorAll('.currency-symbol, .ty-price-num:not([id])').forEach((s) => { if (!/\d/.test(s.textContent)) s.remove(); });
    return parseNum(c.textContent.replace(/\s+/g, ''));
  };
  const txt = (el) => (el ? (el.getAttribute('title') || el.textContent || '').replace(/\s+/g, ' ').trim() : '');
  const img = (el) => {
    if (!el) return '';
    const s = el.getAttribute('data-src') || el.getAttribute('src') || '';
    return s && !s.startsWith('data:') ? abs(s) : '';
  };

  const out = [];
  // --- API JSON (VTEX: ShopAZ etj.) ---
  if (cfg && cfg.json === 'vtex') {
    let data = [];
    try { data = JSON.parse(document.body.innerText); } catch (e) { return []; }
    (Array.isArray(data) ? data : []).forEach((p) => {
      const it = (p.items || [])[0] || {};
      const seller = (it.sellers || []).find((s) => s.commertialOffer && s.commertialOffer.Price > 0) || (it.sellers || [])[0];
      const off = (seller && seller.commertialOffer) || {};
      if (!p.productName || !(off.Price > 0)) return;
      const old = Math.max(off.ListPrice || 0, off.PriceWithoutDiscount || 0);
      out.push({
        title: p.productName,
        url: cfg.linkBase ? cfg.linkBase + p.linkText + '/p' : p.link,
        image: ((it.images || [])[0] || {}).imageUrl || '',
        price: Math.round(off.Price * 100) / 100,
        oldPrice: old > off.Price ? old : null,
        stock: off.AvailableQuantity > 0 ? 'Në stok' : 'Pa stok',
        brandHint: p.brand || '',
      });
    });
    return out;
  }
  if (cfg && cfg.card) {
    document.querySelectorAll(cfg.card).forEach((card) => {
      const titleEl = card.querySelector(cfg.title);
      const title = txt(titleEl);
      const linkEl = (cfg.link && card.querySelector(cfg.link)) || (titleEl && titleEl.closest('a')) || card.querySelector('a[href]');
      let prices = [...card.querySelectorAll(cfg.price)].map(priceOf).filter(Boolean);
      if (!prices.length && cfg.priceAttr) prices = [parseNum(card.getAttribute(cfg.priceAttr))].filter(Boolean);
      if (!title || !prices.length) return;
      const price = cfg.priceMode === 'min' ? Math.min(...prices) : prices[0];
      let old = cfg.old ? [...card.querySelectorAll(cfg.old)].map(priceOf).filter(Boolean) : [];
      if (cfg.priceMode === 'min' && prices.length > 1) old = old.concat([Math.max(...prices)]);
      const oldPrice = old.length ? Math.max(...old) : null;
      const stockEl = cfg.stock ? card.querySelector(cfg.stock) : null;
      out.push({
        title,
        url: linkEl ? abs(linkEl.getAttribute('href')) : location.href,
        image: img(card.querySelector(cfg.img || 'img')),
        price,
        oldPrice: oldPrice && oldPrice > price ? oldPrice : null,
        stock: stockEl ? txt(stockEl) : '',
      });
    });
    if (out.length) return out;
  }

  // --- Rezervë e përgjithshme: JSON-LD ---
  const fromLd = [];
  const walk = (o) => {
    if (!o || typeof o !== 'object') return;
    if (Array.isArray(o)) return o.forEach(walk);
    const type = [].concat(o['@type'] || []).join(',');
    if (/Product/.test(type) && o.name) {
      const off = [].concat(o.offers || [])[0] || {};
      const p = parseNum(off.price || off.lowPrice);
      if (p) fromLd.push({ title: o.name, url: abs(o.url || off.url || location.href), image: abs([].concat(o.image || [])[0] || ''), price: p, oldPrice: null, stock: /InStock/.test(off.availability || '') ? 'Në stok' : '' });
    }
    Object.values(o).forEach(walk);
  };
  document.querySelectorAll('script[type="application/ld+json"]').forEach((s) => { try { walk(JSON.parse(s.textContent)); } catch (e) {} });
  if (fromLd.length) return fromLd;

  // --- Rezervë heuristike: elemente me çmim + linkun më të afërt ---
  const re = /(€|eur|lek|all|den)\s*\d|\d[\d.,\s]*\s*(€|eur|lek|all|den)/i;
  const seen = new Set();
  [...document.querySelectorAll('body *')].forEach((el) => {
    if (el.children.length > 3 || !re.test(el.textContent) || el.textContent.length > 40) return;
    let card = el;
    for (let i = 0; i < 6 && card.parentElement; i++) {
      card = card.parentElement;
      const a = [...card.querySelectorAll('a[href]')].find((x) => x.textContent.trim().length > 12);
      if (a) {
        const url = abs(a.getAttribute('href'));
        if (seen.has(url)) return;
        seen.add(url);
        const p = priceOf(el);
        if (p) out.push({ title: txt(a), url, image: img(card.querySelector('img')), price: p, oldPrice: null, stock: '' });
        return;
      }
    }
  });
  return out.slice(0, 40);
}

function pageExtractProduct() {
  const abs = (u) => { try { return new URL(u, location.href).href; } catch (e) { return ''; } };
  const parseNum = (raw) => {
    if (raw == null) return null;
    let t = String(raw).replace(/[^\d.,]/g, '');
    if (!t) return null;
    const lc = t.lastIndexOf(','), ld = t.lastIndexOf('.');
    if (lc > -1 && ld > -1) t = lc > ld ? t.replace(/\./g, '').replace(',', '.') : t.replace(/,/g, '');
    else if (lc > -1) { const d = t.length - lc - 1; t = (d === 2 || d === 1) && t.split(',').length === 2 ? t.replace(',', '.') : t.replace(/,/g, ''); }
    else if (ld > -1) { const d = t.length - ld - 1; if (t.split('.').length > 2 || d === 3) t = t.replace(/\./g, ''); }
    const n = parseFloat(t);
    return isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null;
  };
  const priceOf = (el) => {
    const c = el.cloneNode(true);
    c.querySelectorAll('sup, .decimal-rounded-price').forEach((s) => { s.textContent = '.' + s.textContent.trim(); });
    return parseNum(c.textContent.replace(/\s+/g, ''));
  };
  const res = { title: '', price: null, oldPrice: null, image: '', brand: '', stock: '', url: location.href };
  const walk = (o) => {
    if (!o || typeof o !== 'object' || res.price) return;
    if (Array.isArray(o)) return o.forEach(walk);
    if (/Product/.test([].concat(o['@type'] || []).join(',')) && o.name) {
      const off = [].concat(o.offers || [])[0] || {};
      res.title = o.name;
      res.price = parseNum(off.price || off.lowPrice);
      res.image = abs([].concat(o.image || [])[0] || '');
      res.brand = (o.brand && (o.brand.name || o.brand)) || '';
      res.stock = /InStock/.test(off.availability || '') ? 'Në stok' : /OutOfStock/.test(off.availability || '') ? 'Pa stok' : '';
    }
    Object.values(o).forEach(walk);
  };
  document.querySelectorAll('script[type="application/ld+json"]').forEach((s) => { try { walk(JSON.parse(s.textContent)); } catch (e) {} });
  const meta = (sel) => { const m = document.querySelector(sel); return m ? m.getAttribute('content') : ''; };
  if (!res.title) res.title = (document.querySelector('h1') || {}).textContent || meta('meta[property="og:title"]') || document.title;
  res.title = String(res.title).replace(/\s+/g, ' ').trim();
  if (!res.image) res.image = abs(meta('meta[property="og:image"]') || '');
  if (!res.price) res.price = parseNum(meta('meta[property="product:price:amount"]') || meta('meta[itemprop="price"]'));
  if (!res.price) {
    const ip = document.querySelector('[itemprop="price"]');
    if (ip) res.price = parseNum(ip.getAttribute('content') || ip.textContent);
  }
  if (!res.price) {
    // Çmimi me shkronjat më të mëdha që nuk është i vizatuar me vijë.
    const cands = [...document.querySelectorAll('[class*=price], [class*=Price], [class*=cmim]')]
      .filter((e) => e.offsetParent && /\d/.test(e.textContent) && e.textContent.length < 40)
      .filter((e) => !/line-through/.test(getComputedStyle(e).textDecorationLine) && !e.closest('[class*=old],[class*=strike],[class*=list-price]'))
      .map((e) => ({ p: priceOf(e), fs: parseFloat(getComputedStyle(e).fontSize) || 0, top: e.getBoundingClientRect().top }))
      .filter((x) => x.p && x.top < 1400)
      .sort((a, b) => b.fs - a.fs || a.top - b.top);
    if (cands.length) res.price = cands[0].p;
  }
  return res;
}

module.exports = { pageExtractListing, pageExtractProduct };
