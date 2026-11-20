const { contextBridge, ipcRenderer } = require('electron');

// Versioni desktop: funksionet thirren me IPC. (Në web, të njëjtat funksione i jep web-api.js me HTTP.)
const CHANNELS = ['init', 'search', 'preset', 'presetTiers', 'optimizeBuild', 'searchPart', 'buildSummary', 'track', 'untrack', 'getTracked', 'refreshTracked', 'saveSettings', 'openExternal', 'webInfo', 'webStart', 'webStop'];
const api = { platform: 'desktop' };
for (const ch of CHANNELS) api[ch] = (arg) => ipcRenderer.invoke(ch, arg);
contextBridge.exposeInMainWorld('api', api);
