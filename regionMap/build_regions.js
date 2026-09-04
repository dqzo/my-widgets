// 预解析 zcun.xlsx → data/regions.json
// 让网页版也能直接用，不需要 xlsx 依赖
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const EXCEL_PATH = path.join(__dirname, '..', 'zcun.xlsx');
const OUT_DIR = path.join(__dirname, 'data');
const OUT_PATH = path.join(OUT_DIR, 'regions.json');

if (!fs.existsSync(EXCEL_PATH)) {
  console.error('找不到 ' + EXCEL_PATH);
  process.exit(1);
}

console.log('解析 Excel:', EXCEL_PATH);

const wb = XLSX.readFile(EXCEL_PATH);
const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: '' });

if (rows.length < 2) { console.error('Excel 无数据'); process.exit(1); }

const h = rows[0].map(x => String(x).trim());
const idx = {
  pC: h.findIndex(x => x === 'provinceCode'),
  pN: h.findIndex(x => x === 'provinceName'),
  cC: h.findIndex(x => x === 'cityCode'),
  cN: h.findIndex(x => x === 'cityName'),
  aC: h.findIndex(x => x === 'areaCode'),
  aN: h.findIndex(x => x === 'areaName'),
  sC: h.findIndex(x => x === 'streetCode'),
  sN: h.findIndex(x => x === 'streetName'),
  vC: 8, // 第9列
  vN: 9  // 第10列
};

const provSet = new Map();
const citySet = new Map();
const countySet = new Map();
const streetSet = new Map();
const villageSet = new Map();

let count = 0;
for (let r = 1; r < rows.length; r++) {
  const row = rows[r];
  if (!row || row.length === 0) continue;
  const pC = String(row[idx.pC] || '').trim();
  const pN = String(row[idx.pN] || '').trim();
  const cC = String(row[idx.cC] || '').trim();
  const cN = String(row[idx.cN] || '').trim();
  const aC = String(row[idx.aC] || '').trim();
  const aN = String(row[idx.aN] || '').trim();
  const sC = String(row[idx.sC] || '').trim();
  const sN = String(row[idx.sN] || '').trim();
  const vC = String(row[idx.vC] || '').trim();
  const vN = String(row[idx.vN] || '').trim();
  if (!pC) continue;

  if (!provSet.has(pC)) provSet.set(pC, { code: pC, name: pN });
  if (cC && !citySet.has(cC)) citySet.set(cC, { code: cC, name: cN });
  if (aC && !countySet.has(aC)) countySet.set(aC, { code: aC, name: aN });
  if (sC && !streetSet.has(sC)) streetSet.set(sC, { code: sC, name: sN });
  if (vC && !villageSet.has(vC)) villageSet.set(vC, { code: vC, name: vN });
  count++;
}

// 重建父子关系索引
const provinces = Array.from(provSet.values()).sort((a, b) => a.code.localeCompare(b.code));

const cityByProvince = new Map();
for (const [cCode, city] of citySet) {
  const parent = cCode.substring(0, 2);
  if (!cityByProvince.has(parent)) cityByProvince.set(parent, []);
  cityByProvince.get(parent).push(city);
}
for (const arr of cityByProvince.values()) arr.sort((a, b) => a.code.localeCompare(b.code));

const countyByCity = new Map();
for (const [aCode, county] of countySet) {
  const parent = aCode.substring(0, 4);
  if (!countyByCity.has(parent)) countyByCity.set(parent, []);
  countyByCity.get(parent).push(county);
}
for (const arr of countyByCity.values()) arr.sort((a, b) => a.code.localeCompare(b.code));

const streetByCounty = new Map();
for (const [sCode, street] of streetSet) {
  const parent = sCode.substring(0, 6);
  if (!streetByCounty.has(parent)) streetByCounty.set(parent, []);
  streetByCounty.get(parent).push(street);
}
for (const arr of streetByCounty.values()) arr.sort((a, b) => a.code.localeCompare(b.code));

const villageByStreet = new Map();
for (const [vCode, village] of villageSet) {
  const parent = vCode.substring(0, 9);
  if (!villageByStreet.has(parent)) villageByStreet.set(parent, []);
  villageByStreet.get(parent).push(village);
}
for (const arr of villageByStreet.values()) arr.sort((a, b) => a.code.localeCompare(b.code));

// Map → Object 序列化
function mapToObj(map) {
  const obj = {};
  for (const [k, v] of map) obj[k] = v;
  return obj;
}

const output = {
  provinces,
  cities: mapToObj(cityByProvince),
  counties: mapToObj(countyByCity),
  streets: mapToObj(streetByCounty),
  villages: mapToObj(villageByStreet)
};

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(OUT_PATH, JSON.stringify(output));

const size = (fs.statSync(OUT_PATH).size / 1024 / 1024).toFixed(2);
console.log('Done! 共 ' + count + ' 行');
console.log('  ' + provinces.length + ' 省 | ' + citySet.size + ' 市 | ' + countySet.size + ' 县 | ' + streetSet.size + ' 乡镇 | ' + villageSet.size + ' 村');
console.log('输出:', OUT_PATH + ' (' + size + ' MB)');
