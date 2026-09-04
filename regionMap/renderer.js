// ===== 行政区划地图联动 - 渲染进程 =====
// 双模式：Electron 桌面版 + 浏览器网页版（检测 window.electronAPI 自动切换）

const CHINA_ADCODE = '100000';
const CHINA_NAME = '中国';
const LEVEL_KEYS = ['province', 'city', 'county', 'town', 'village'];
const SELECT_IDS = ['provinceSelect', 'citySelect', 'countySelect', 'townSelect', 'villageSelect'];

let chart = null;
let config = null;
let currentDepth = 0;
let currentRegionName = CHINA_NAME;
let currentGeoJson = null;
let currentBaseAdcode = CHINA_ADCODE;
let cascade = {};
LEVEL_KEYS.forEach(k => { cascade[k] = { code: null, name: null }; });

// 浏览器版坐标缓存
const coordCache = new Map();
let userAmapKey = '';

// ===== 模式检测 & API 适配 =====
const isElectron = !!(window.electronAPI && window.electronAPI.getConfig);

function api() {
  const e = window.electronAPI;
  return {
    // 配置
    async getConfig() {
      if (isElectron) return e.getConfig();
      try { return JSON.parse(localStorage.getItem('rm_config') || 'null') || {}; } catch { return {}; }
    },
    async saveConfig(c) {
      if (isElectron) return e.saveConfig(c);
      localStorage.setItem('rm_config', JSON.stringify(c));
      return true;
    },
    async setOpacity(v) { if (isElectron) e.setOpacity(v); },
    async setAlwaysOnTop(v) { if (isElectron) e.setAlwaysOnTop(v); },
    async minimize() { if (isElectron) e.minimize(); else { try { window.open('', '_self'); window.close(); } catch {} } },
    async close() { if (isElectron) e.close(); },

    // 浏览器版：从 DataV/高德 API 懒加载，不需要 33MB 的 regions.json
    async getProvinces() {
      if (isElectron) return e.getProvinces();
      // 从全国 GeoJSON 提取省级（adcode 以 0000 结尾且不是 100000）
      const geo = await this.fetchGeojson('100000');
      if (!geo || !geo.features) return [];
      const provinces = [];
      for (const f of geo.features) {
        const ac = String(f.properties.adcode);
        if (ac.endsWith('0000') && ac !== '100000') {
          provinces.push({ code: ac.substring(0, 2), name: f.properties.name });
        }
      }
      return provinces;
    },
    async getChildren(level, parentCode) {
      if (isElectron) return e.getChildren(level, parentCode);
      // level = parent 的级别，我们要获取 parent 的下级
      // province(省) → city(市/直辖市直接到区县) → county(区县) → town(乡镇) → village(村)
      const parentAdcode = await this.toAdcode(String(parentCode), level);
      
      // 省→市、市→区县：从本地 GeoJSON 提取子区域
      if (level === 'province' || level === 'city') {
        const geo = await this.fetchGeojson(parentAdcode);
        if (!geo || !geo.features) return [];
        const children = [];
        for (const f of geo.features) {
          const ac = String(f.properties.adcode);
          if (ac === parentAdcode) continue;
          // parent 是省 → children 应该是市（xx00 结尾但不是 xx0000）
          // parent 是市 → children 应该是区县（不以 00 结尾）
          if (level === 'province' && ac.endsWith('00') && !ac.endsWith('0000')) {
            children.push({ code: ac.substring(0, 4), name: f.properties.name });
          } else if (level === 'city' && !ac.endsWith('00')) {
            children.push({ code: ac, name: f.properties.name });
          }
        }
        // 直辖市处理：省→市 没有地级市这一层，返回虚拟"市辖区"
        if (level === 'province' && children.length === 0 && geo.features.length > 0) {
          return [{ code: parentAdcode.substring(0, 4) || parentAdcode, name: '市辖区' }];
        }
        return children;
      }
      
      // 区县→乡镇、乡镇→村：DataV 不覆盖，用高德 district API
      if (level === 'county' || level === 'town') {
        const key = userAmapKey || '13f1c508d451e2000a1e8b9a525a4f63';
        try {
          const url = `https://restapi.amap.com/v3/config/district?keywords=${encodeURIComponent(parentAdcode)}&subdistrict=1&key=${key}`;
          const r = await fetch(url);
          const j = await r.json();
          if (j.districts && j.districts.length > 0 && j.districts[0].districts) {
            return j.districts[0].districts.map(d => ({ code: d.adcode || d.name, name: d.name }));
          }
        } catch {}
        return [];
      }
      
      return [];
    },
    async toAdcode(code, level) {
      if (isElectron) return e.toAdcode(code, level);
      code = String(code).trim();
      if (level === 'province') return (code + '0000').substring(0, 6);
      if (level === 'city') return (code + '00').substring(0, 6);
      return code;
    },

    // GeoJSON（浏览器版优先读本地 data/ 文件，DataV API 作 fallback）
    async fetchGeojson(adcode) {
      if (isElectron) return e.fetchGeojson(adcode);
      const code = String(adcode);
      // 1️⃣ 优先从本地 data/ 目录读取
      // 先试 _full.json（含下级子区域，适合省/市级），再试 .json（区域自身边界，适合区县）
      const localTries = [`data/${code}_full.json`, `data/${code}.json`];
      for (const url of localTries) {
        try {
          const res = await fetch(url);
          if (res.ok) {
            const j = await res.json();
            if (j && j.features && j.features.length > 0) return j;
          }
        } catch {}
      }
      // 2️⃣ fallback：DataV API（开发调试用）
      const remoteTries = [
        `https://geo.datav.aliyun.com/areas_v3/bound/${code}_full.json`,
        `https://geo.datav.aliyun.com/areas_v3/bound/${code}.json`
      ];
      for (const url of remoteTries) {
        try {
          const res = await fetch(url);
          if (res.ok) {
            const j = await res.json();
            if (j && j.features && j.features.length > 0) return j;
          }
        } catch {}
      }
      return null;
    },

    // 高德坐标
    async getCoords(items, codeField, nameField) {
      if (isElectron) return e.getCoords(items, codeField, nameField);
      const key = userAmapKey || '13f1c508d451e2000a1e8b9a525a4f63';
      const results = [];
      const batch = 5;
      for (let i = 0; i < items.length; i += batch) {
        const promises = items.slice(i, i + batch).map(async item => {
          const code = String(item[codeField]);
          const name = item[nameField];
          if (coordCache.has(code)) return { code, name, coord: coordCache.get(code) };
          try {
            // 方式1: district
            let coord = null;
            const url1 = `https://restapi.amap.com/v3/config/district?keywords=${encodeURIComponent(name)}&subdistrict=0&key=${key}`;
            const r1 = await fetch(url1);
            const j1 = await r1.json();
            if (j1.districts && j1.districts.length > 0 && j1.districts[0].center) {
              const [lng, lat] = j1.districts[0].center.split(',').map(Number);
              if (lng > 70 && lng < 140 && lat > 10 && lat < 55) coord = [lng, lat];
            }
            // 方式2: geocode（用完整路径）
            if (!coord) {
              const parentAdcode = String(code).substring(0, 6);
              const url2 = `https://restapi.amap.com/v3/geocode/geo?address=${encodeURIComponent(name)}&city=${parentAdcode}&key=${key}`;
              const r2 = await fetch(url2);
              const j2 = await r2.json();
              if (j2.geocodes && j2.geocodes.length > 0 && j2.geocodes[0].location) {
                const [lng, lat] = j2.geocodes[0].location.split(',').map(Number);
                if (lng > 70 && lng < 140 && lat > 10 && lat < 55) coord = [lng, lat];
              }
            }
            if (coord) coordCache.set(code, coord);
            return { code, name, coord };
          } catch { return { code, name, coord: null }; }
        });
        results.push(...await Promise.all(promises));
        if (i + batch < items.length) await new Promise(r => setTimeout(r, 300));
      }
      return results;
    }
  };
}

const API = api();

// ===== 初始化 =====
async function init() {
  if (typeof echarts === 'undefined') {
    document.getElementById('mapContainer').innerHTML =
      '<div class="error-msg">⚠ ECharts 未加载<br>请通过 HTTP 服务器打开本页面</div>';
    return;
  }

  try { config = await API.getConfig(); } catch { config = { opacity: 100, alwaysOnTop: true }; }
  userAmapKey = config.amapKey || '';

  const container = document.getElementById('mapContainer');
  chart = echarts.init(container, null, { renderer: 'canvas' });
  chart.on('click', handleMapClick);
  window.addEventListener('resize', () => { if (chart) chart.resize(); });

  // 浏览器版提示
  if (!isElectron) {
    const hint = document.createElement('div');
    hint.style.cssText = 'position:fixed;top:42px;right:14px;background:rgba(255,170,50,0.9);color:#000;font-size:11px;padding:4px 10px;border-radius:4px;z-index:200;';
    hint.textContent = '📱 网页版模式';
    document.body.appendChild(hint);
  }

  initEventListeners();
  applyConfigToUI();
  await loadChina();
}

// ===== 加载全国 =====
async function loadChina() {
  currentDepth = 0; currentRegionName = CHINA_NAME; currentGeoJson = null; currentBaseAdcode = CHINA_ADCODE;
  LEVEL_KEYS.forEach(k => { cascade[k] = { code: null, name: null }; });

  showStatus('加载全国地图...');
  const geojson = await API.fetchGeojson(CHINA_ADCODE);
  if (geojson && geojson.features && geojson.features.length > 0) {
    currentGeoJson = geojson;
    renderMap(CHINA_ADCODE, geojson, null);
  } else {
    showStatus('全国地图加载失败');
  }

  const provinces = await API.getProvinces();
  populateDropdown('provinceSelect', provinces);
  enableSelect('provinceSelect');
  for (let i = 1; i < SELECT_IDS.length; i++) { resetDropdown(SELECT_IDS[i]); disableSelect(SELECT_IDS[i]); }

  updateBreadcrumb(); updateCurrentRegion();
  showStatus('就绪 · 共 ' + provinces.length + ' 个省级区划' + (isElectron ? '' : ' · 网页版'));
}

// ===== 下钻 =====
async function drillToLevel(levelKey, code, name) {
  const levelIndex = LEVEL_KEYS.indexOf(levelKey);
  if (levelIndex < 0) return;
  showStatus('加载 ' + name + ' ...');

  cascade[levelKey] = { code: String(code), name: name };
  const selectEl = document.getElementById(SELECT_IDS[levelIndex]);
  if (selectEl) selectEl.value = String(code);
  for (let i = levelIndex + 1; i < LEVEL_KEYS.length; i++) {
    cascade[LEVEL_KEYS[i]] = { code: null, name: null };
    resetDropdown(SELECT_IDS[i]); disableSelect(SELECT_IDS[i]);
  }

  currentDepth = levelIndex + 1; currentRegionName = name;

  let children = [];
  if (levelIndex + 1 < LEVEL_KEYS.length) {
    children = await API.getChildren(levelKey, String(code));
    if (children && children.length > 0) {
      populateDropdown(SELECT_IDS[levelIndex + 1], children);
      enableSelect(SELECT_IDS[levelIndex + 1]);
    }
  }

  const isPolygonLevel = (levelKey === 'province' || levelKey === 'city' || levelKey === 'county');
  const isScatterLevel = (levelKey === 'town' || levelKey === 'village');

  if (isPolygonLevel) {
    const adcode = await API.toAdcode(String(code), levelKey);
    const geojson = await API.fetchGeojson(adcode);
    if (geojson && geojson.features && geojson.features.length > 0) {
      currentGeoJson = geojson; currentBaseAdcode = adcode;
      renderMap(adcode, geojson, null);
      showStatus('已加载: ' + name + ' · ' + geojson.features.length + ' 个子区域');
    } else {
      showStatus(name + ' - 地图边界暂不可用，下拉正常');
    }
  } else if (isScatterLevel) {
    const baseAdcode = getBaseAdcode(String(code));
    let baseGeojson = currentGeoJson;
    if (!baseGeojson || currentBaseAdcode !== baseAdcode) {
      baseGeojson = await API.fetchGeojson(baseAdcode);
      if (baseGeojson && baseGeojson.features) { currentGeoJson = baseGeojson; currentBaseAdcode = baseAdcode; }
    }
    if (children.length > 0 && baseGeojson) {
      showStatus('获取坐标中 (' + children.length + ' 项)...');
      const coords = await API.getCoords(children, 'code', 'name');
      renderMap(baseAdcode, baseGeojson, coords);
      const withCoord = coords.filter(c => c.coord).length;
      showStatus(name + ' · ' + withCoord + '/' + children.length + ' 已定位');
    } else if (baseGeojson) {
      renderMap(baseAdcode, baseGeojson, null);
      showStatus(name + ' - 无可定位子项');
    } else {
      showStatus(name + ' - 底图加载失败');
    }
  }

  updateBreadcrumb(); updateCurrentRegion();
}

function getBaseAdcode(code) { return String(code).substring(0, 6); }

// ===== 渲染地图 =====
function renderMap(adcode, geojson, scatterCoords) {
  const mapName = 'region_' + adcode;
  try { echarts.registerMap(mapName, geojson); } catch(e) {}

  const polygonData = geojson.features.map(f => ({
    name: f.properties.name, adcode: String(f.properties.adcode), value: 1
  }));

  const series = [{
    type: 'map', map: mapName, roam: true, zoom: 1.2,
    label: { show: true, color: '#b0c8e0', fontSize: 9 },
    itemStyle: { areaColor: '#2a3a5a', borderColor: '#4a6a9a', borderWidth: 0.8 },
    emphasis: { itemStyle: { areaColor: '#3a7ad6', borderColor: '#7ab0ff', borderWidth: 1.5, shadowBlur: 10, shadowColor: 'rgba(90,176,255,0.5)' }, label: { color: '#fff', fontWeight: 'bold', fontSize: 11 } },
    select: { itemStyle: { areaColor: '#5ab0ff' }, label: { color: '#fff', fontWeight: 'bold' } },
    data: polygonData
  }];

  if (scatterCoords && scatterCoords.length > 0) {
    const valid = scatterCoords.filter(c => c.coord);
    if (valid.length > 0) {
      series.push({
        type: 'scatter', coordinateSystem: 'geo',
        data: valid.map(c => ({ name: c.name, value: c.coord.concat([1]), adcode: c.code })),
        symbolSize: 12,
        itemStyle: { color: '#ff6b35', borderColor: '#fff', borderWidth: 1 },
        emphasis: { itemStyle: { color: '#ffaa33', borderColor: '#fff', borderWidth: 2, shadowBlur: 15, shadowColor: 'rgba(255,107,53,0.7)' }, label: { show: true, color: '#fff', fontWeight: 'bold', fontSize: 12 } },
        label: { show: true, formatter: p => p.name, color: '#ffaa77', fontSize: 10, position: 'right' }
      });
    }
  }

  chart.setOption({
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(20,28,45,0.95)', borderColor: 'rgba(90,176,255,0.5)', borderWidth: 1,
      textStyle: { color: '#d0e0f0', fontSize: 12 },
      formatter: function(p) {
        if (p.seriesType === 'scatter') return '<b>' + p.name + '</b><br/>编码: ' + p.data.adcode + '<br/>坐标: ' + p.data.value[0].toFixed(4) + ', ' + p.data.value[1].toFixed(4);
        if (!p.data) return p.name;
        return p.name + '<br/>编码: ' + (p.data.adcode || '-') + '<br/><span style="color:#5ab0ff">点击进入下级</span>';
      }
    },
    geo: { map: mapName, roam: false, silent: true, show: false },
    series: series
  }, true);
  setTimeout(() => { if (chart) chart.resize(); }, 50);
}

// ===== 点击 =====
function handleMapClick(params) {
  if (params.seriesType === 'scatter') {
    var adcode = params.data.adcode, name = params.name;
    var selectIdx = currentDepth;
    if (selectIdx >= LEVEL_KEYS.length) { showStatus('已到最底层级'); return; }
    var select = document.getElementById(SELECT_IDS[selectIdx]);
    if (select && !select.disabled) {
      for (var i = 0; i < select.options.length; i++) {
        if (select.options[i].value === adcode) {
          select.value = adcode;
          drillToLevel(LEVEL_KEYS[selectIdx], adcode, name);
          return;
        }
      }
    }
    showStatus('点击: ' + name + ' · 编码 ' + adcode);
    return;
  }
  if (!params.data || !params.data.adcode) return;
  if (currentDepth >= LEVEL_KEYS.length) { showStatus('已到最底层级'); return; }
  var nextLevel = LEVEL_KEYS[currentDepth];
  var selectId2 = SELECT_IDS[currentDepth];
  var select2 = document.getElementById(selectId2);
  if (!select2 || select2.disabled || !select2.options.length) return;
  for (var j = 0; j < select2.options.length; j++) {
    if (select2.options[j].text === params.data.name) {
      select2.value = select2.options[j].value;
      drillToLevel(nextLevel, select2.options[j].value, select2.options[j].text);
      return;
    }
  }
  showStatus('点击区域 "' + params.data.name + '" 未匹配');
}

// ===== 面包屑 =====
function updateBreadcrumb() {
  var bc = document.getElementById('breadcrumb');
  bc.innerHTML = '';
  var rootItem = document.createElement('span');
  rootItem.className = 'breadcrumb-item' + (currentDepth === 0 ? ' current' : '');
  rootItem.textContent = CHINA_NAME;
  if (currentDepth !== 0) rootItem.addEventListener('click', loadChina);
  bc.appendChild(rootItem);
  for (var i = 0; i < currentDepth && i < LEVEL_KEYS.length; i++) {
    bc.appendChild(Object.assign(document.createElement('span'), { className: 'breadcrumb-sep', textContent: '\u203A' }));
    var item = document.createElement('span');
    var level = LEVEL_KEYS[i];
    var isCurrent = (i === currentDepth - 1);
    item.className = 'breadcrumb-item' + (isCurrent ? ' current' : '');
    item.textContent = cascade[level].name || '';
    if (!isCurrent && cascade[level].code) {
      (function(lvl) { item.addEventListener('click', function() { drillToLevel(lvl, cascade[lvl].code, cascade[lvl].name); }); })(level);
    }
    bc.appendChild(item);
  }
}

// ===== 事件 =====
function initEventListeners() {
  document.getElementById('minimizeBtn').addEventListener('click', () => API.minimize());
  document.getElementById('closeBtn').addEventListener('click', () => API.close());

  var topToggle = document.getElementById('topToggle');
  topToggle.addEventListener('click', async function() {
    config.alwaysOnTop = !config.alwaysOnTop;
    topToggle.classList.toggle('active', config.alwaysOnTop);
    document.getElementById('alwaysOnTop').checked = config.alwaysOnTop;
    await API.setAlwaysOnTop(config.alwaysOnTop);
    await API.saveConfig(config);
  });

  var panel = document.getElementById('settingsPanel');
  document.getElementById('settingsToggle').addEventListener('click', function() {
    var ak = document.getElementById('amapKey');
    if (ak) ak.value = config.amapKey || '';
    panel.classList.add('show');
  });
  document.getElementById('settingsClose').addEventListener('click', () => panel.classList.remove('show'));

  var slider = document.getElementById('opacity'), val = document.getElementById('opacityValue');
  slider.addEventListener('input', async function(e) {
    config.opacity = parseInt(e.target.value);
    val.textContent = config.opacity + '%';
    await API.setOpacity(config.opacity);
  });

  document.getElementById('alwaysOnTop').addEventListener('change', async function(e) {
    config.alwaysOnTop = e.target.checked;
    topToggle.classList.toggle('active', config.alwaysOnTop);
    await API.setAlwaysOnTop(config.alwaysOnTop);
  });

  document.getElementById('saveBtn').addEventListener('click', async function() {
    config.opacity = parseInt(slider.value);
    config.alwaysOnTop = document.getElementById('alwaysOnTop').checked;
    var ak = document.getElementById('amapKey');
    if (ak) { config.amapKey = ak.value.trim(); userAmapKey = config.amapKey; }
    await API.saveConfig(config);
    panel.classList.remove('show');
    showStatus('设置已保存');
  });

  document.getElementById('resetBtn').addEventListener('click', loadChina);

  SELECT_IDS.forEach(function(id, idx) {
    document.getElementById(id).addEventListener('change', function(e) {
      var code = e.target.value; if (!code) return;
      drillToLevel(LEVEL_KEYS[idx], code, e.target.options[e.target.selectedIndex].text);
    });
  });
}

function applyConfigToUI() {
  var slider = document.getElementById('opacity'), val = document.getElementById('opacityValue');
  var topToggle = document.getElementById('topToggle');
  slider.value = config.opacity || 100; val.textContent = (config.opacity || 100) + '%';
  document.getElementById('alwaysOnTop').checked = config.alwaysOnTop !== false;
  if (config.alwaysOnTop !== false) topToggle.classList.add('active');
  var ak = document.getElementById('amapKey');
  if (ak && config.amapKey) ak.value = config.amapKey;
}

function showStatus(t) { var el = document.getElementById('statusText'); if (el) el.textContent = t; }
function updateCurrentRegion() { var el = document.getElementById('currentRegion'); if (el) el.textContent = currentRegionName; }
function populateDropdown(id, items) {
  var s = document.getElementById(id); s.innerHTML = '<option value="">— 选择 —</option>';
  for (var i = 0; i < items.length; i++) {
    var o = document.createElement('option'); o.value = items[i].code; o.textContent = items[i].name; s.appendChild(o);
  }
}
function resetDropdown(id) { var s = document.getElementById(id); s.innerHTML = '<option value="">— 选择 —</option>'; s.value = ''; }
function enableSelect(id) { document.getElementById(id).disabled = false; }
function disableSelect(id) { document.getElementById(id).disabled = true; }

init();
