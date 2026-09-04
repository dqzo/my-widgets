// 木鱼 - 双模式 API 适配
const isElectron = !!(window.electronAPI && window.electronAPI.getConfig);

const DEFAULT_CONFIG = {
  opacity: 100, alwaysOnTop: true, count: 0, soundEnabled: true, windowBounds: null
};

function api() {
  const e = window.electronAPI;
  return {
    async getConfig() {
      if (isElectron) return e.getConfig();
      try { return JSON.parse(localStorage.getItem('muyu_config') || 'null') || { ...DEFAULT_CONFIG }; }
      catch { return { ...DEFAULT_CONFIG }; }
    },
    async saveConfig(c) {
      if (isElectron) return e.saveConfig(c);
      localStorage.setItem('muyu_config', JSON.stringify(c));
      return true;
    },
    async setOpacity(v) { if (isElectron) e.setOpacity(v); else { try { document.body.style.opacity = v / 100; } catch {} } },
    async setAlwaysOnTop(v) { if (isElectron) e.setAlwaysOnTop(v); },
    async minimize() { if (isElectron) e.minimize(); },
    async close() { if (isElectron) e.close(); else { try { window.open('', '_self'); window.close(); } catch {} } }
  };
}
const API = api();
