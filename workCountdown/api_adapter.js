// 倒计时 - 双模式 API 适配
const isElectron = !!(window.electronAPI && window.electronAPI.getConfig);

const DEFAULT_CONFIG = {
  widgetName: '下班倒计时', workDays: [1, 2, 3, 4, 5], startTime: '08:30', endTime: '18:00',
  textColor: '#ff6b35', bgColor: '#ffffff', salaryDay: 15, dailyIncome: 150, petImage: 'cat',
  opacity: 100, alwaysOnTop: true, locked: false, windowBounds: null
};

function api() {
  const e = window.electronAPI;
  return {
    async getConfig() {
      if (isElectron) return e.getConfig();
      try { return JSON.parse(localStorage.getItem('wc_config') || 'null') || { ...DEFAULT_CONFIG }; }
      catch { return { ...DEFAULT_CONFIG }; }
    },
    async saveConfig(c) {
      if (isElectron) return e.saveConfig(c);
      localStorage.setItem('wc_config', JSON.stringify(c));
      return true;
    },
    async setOpacity(v) { if (isElectron) e.setOpacity(v); else { try { document.body.style.opacity = v / 100; } catch {} } },
    async setAlwaysOnTop(v) { if (isElectron) e.setAlwaysOnTop(v); },
    async setLocked(v) { if (isElectron && e.setLocked) return e.setLocked(v); },
    onToggleSettings(cb) { if (isElectron && e.onToggleSettings) e.onToggleSettings(cb); }
  };
}
const API = api();
