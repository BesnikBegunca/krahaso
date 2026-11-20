// Ura për versionin web: kur faqja hapet në shfletues (jo në aplikacionin desktop),
// të njëjtat funksione thirren me HTTP te serveri i Krahaso-s. Dizajni dhe logjika mbeten identike.
(function () {
  if (window.api) return; // në desktop api vjen nga preload.js
  const call = (name) => async (arg) => {
    const r = await fetch('/api/' + name, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: arg === undefined ? '' : JSON.stringify(arg),
    });
    if (!r.ok) throw new Error('Serveri ktheu ' + r.status);
    return r.json();
  };
  const names = ['init', 'search', 'preset', 'presetTiers', 'optimizeBuild', 'searchPart', 'buildSummary', 'track', 'untrack', 'getTracked', 'refreshTracked', 'saveSettings', 'webInfo'];
  const api = { platform: 'web' };
  for (const n of names) api[n] = call(n);
  // linqet e dyqaneve hapen në një skedë të re të shfletuesit
  api.openExternal = async (url) => { if (/^https?:\/\//i.test(url)) window.open(url, '_blank', 'noopener'); };
  api.webStart = api.webStop = async () => api.webInfo();
  window.api = api;
})();
