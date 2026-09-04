const SAVE_DELAY = 300;

let config = null;
let nextColId = 0;
let nextRowId = 0;

// allData: 完整数据（所有月份），筛选只影响显示，所有修改和保存都基于 allData
let allData = {
  columns: [],
  rows: [],
  sums: {}
};

let filterMonth = '';
let saveTimer = null;

function initDefaultData() {
  nextColId = 0;
  nextRowId = 0;
  allData = {
    columns: [
      { id: nextColId++, name: '日期', type: 'date' },
      { id: nextColId++, name: '项目', type: 'text' },
      { id: nextColId++, name: '金额', type: 'number' }
    ],
    rows: [],
    sums: {}
  };
}

function getNextColId() { return nextColId++; }
function getNextRowId() { return nextRowId++; }

async function init() {
  try { config = await API.getConfig(); } catch (e) { config = { opacity: 100, alwaysOnTop: true }; }
  await loadTableData();
  initEventListeners();
  renderTable();
  updateMonthFilter();
}

async function loadTableData() {
  try {
    const saved = await API.loadTableData();
    if (saved && saved.columns && saved.columns.length > 0) {
      if (saved.columns[0] && typeof saved.columns[0] === 'object') {
        allData = saved;
        nextColId = Math.max(...saved.columns.map(c => c.id || 0), 0) + 1;
        nextRowId = (saved.rows && saved.rows.length > 0)
          ? Math.max(...saved.rows.map(r => r.id || 0), 0) + 1 : 0;
        if (!allData.sums) allData.sums = {};
      } else {
        allData = migrateOldFormat(saved);
        nextColId = Math.max(...allData.columns.map(c => c.id), 0) + 1;
        nextRowId = allData.rows.length;
      }
    } else {
      initDefaultData();
      addInitialRow();
    }
  } catch (e) {
    console.error('加载数据失败:', e);
    initDefaultData();
  }
}

function migrateOldFormat(oldData) {
  nextColId = 0;
  const columns = oldData.columns.map((name, idx) => ({
    id: nextColId++,
    name: name,
    type: idx === 0 ? 'date' : (idx === 1 ? 'text' : 'number')
  }));
  const rows = []; nextRowId = 0;
  for (const oldRow of oldData.rows || []) {
    const values = {};
    for (const col of columns) {
      values[col.id] = oldRow.values ? (oldRow.values[col.id] || oldRow.date || '') : '';
    }
    rows.push({ id: nextRowId++, values });
  }
  return { columns, rows, sums: {} };
}

function addInitialRow() {
  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  const values = {};
  for (const col of allData.columns) {
    values[col.id] = col.type === 'date' ? dateStr : '';
  }
  allData.rows.push({ id: getNextRowId(), values });
}

async function saveTableData() {
  try {
    allData.sums = calcViewSums(allData.rows);
    await API.saveTableData(allData);
    showStatus('数据已保存');
  } catch (e) {
    console.error('保存失败:', e);
    showStatus('保存失败');
  }
}

function scheduleSave() {
  showStatus('编辑中...');
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => saveTableData(), SAVE_DELAY);
}

// 当前视图的行（按月份筛选）
function getViewRows() {
  if (!filterMonth) return allData.rows;
  const [year, month] = filterMonth.split('-');
  const dateCol = allData.columns.find(c => c.type === 'date');
  if (!dateCol) return allData.rows;
  return allData.rows.filter(row => {
    const dateVal = row.values[dateCol.id];
    if (!dateVal) return false;
    return dateVal.split('-')[0] === year && dateVal.split('-')[1] === month;
  });
}

function calcViewSums(rows) {
  const sums = {};
  for (const col of allData.columns) {
    if (col.type === 'number') {
      let sum = 0;
      for (const row of rows) {
        const val = row.values[col.id];
        if (val !== undefined && val !== '' && !isNaN(parseFloat(val))) {
          sum += parseFloat(val);
        }
      }
      sums[col.id] = Math.round(sum * 100) / 100;
    }
  }
  return sums;
}

function calcRowSum(row) {
  let sum = 0;
  for (const col of allData.columns) {
    if (col.type === 'number') {
      const val = row.values[col.id];
      if (val !== undefined && val !== '' && !isNaN(parseFloat(val))) {
        sum += parseFloat(val);
      }
    }
  }
  return Math.round(sum * 100) / 100;
}

function calcTotalSum(rows) {
  let total = 0;
  for (const row of rows) total += calcRowSum(row);
  return Math.round(total * 100) / 100;
}

function renderTable() {
  const thead = document.getElementById('tableHead');
  const tbody = document.getElementById('tableBody');
  const tfoot = document.getElementById('tableFoot');
  thead.innerHTML = ''; tbody.innerHTML = ''; tfoot.innerHTML = '';

  const viewRows = getViewRows();
  const viewSums = calcViewSums(viewRows);

  // 表头
  const headerRow = document.createElement('tr');
  const deleteCol = document.createElement('th');
  deleteCol.style.width = '30px';
  headerRow.appendChild(deleteCol);

  for (const col of allData.columns) {
    const th = document.createElement('th');
    const input = document.createElement('input');
    input.type = 'text';
    input.value = col.name;
    input.placeholder = '列名';
    input.addEventListener('change', (e) => {
      const newName = e.target.value.trim();
      if (newName && newName !== col.name) {
        col.name = newName;
        scheduleSave();
      } else {
        e.target.value = col.name;
      }
    });
    th.appendChild(input);

    if (col.type === 'number') {
      const delBtn = document.createElement('span');
      delBtn.className = 'col-delete';
      delBtn.textContent = '✕';
      delBtn.title = '删除此列';
      delBtn.addEventListener('click', () => {
        if (confirm(`确定要删除列"${col.name}"吗？`)) deleteColumn(col.id);
      });
      th.appendChild(delBtn);
    }
    headerRow.appendChild(th);
  }

  const rowSumTh = document.createElement('th');
  rowSumTh.textContent = '合计';
  rowSumTh.classList.add('row-total-header');
  headerRow.appendChild(rowSumTh);
  thead.appendChild(headerRow);

  // 数据行
  for (const row of viewRows) {
    const tr = document.createElement('tr');
    const delTd = document.createElement('td');
    delTd.className = 'row-delete';
    delTd.textContent = '✕';
    delTd.addEventListener('click', () => {
      if (confirm('确定要删除此行吗？')) {
        allData.rows = allData.rows.filter(r => r.id !== row.id);
        scheduleSave();
        renderTable();
      }
    });
    tr.appendChild(delTd);

    for (const col of allData.columns) {
      const td = document.createElement('td');
      const input = document.createElement('input');
      input.type = col.type === 'date' ? 'date' : 'text';
      input.value = row.values[col.id] || '';
      if (col.type === 'text') input.classList.add('text-cell');
      input.addEventListener('input', (e) => {
        row.values[col.id] = e.target.value;
        if (col.type === 'number') {
          renderSumsOnly();
          updateRowTotal(row, tr);
        }
        scheduleSave();
      });
      td.appendChild(input);
      tr.appendChild(td);
    }

    const rowSumTd = document.createElement('td');
    rowSumTd.className = 'row-total';
    const rowSumInput = document.createElement('input');
    rowSumInput.type = 'text';
    rowSumInput.value = calcRowSum(row);
    rowSumInput.readOnly = true;
    rowSumTd.appendChild(rowSumInput);
    tr.appendChild(rowSumTd);

    tbody.appendChild(tr);
  }

  // 底部合计行
  const sumRow = document.createElement('tr');
  const sumDeleteCol = document.createElement('td');
  sumRow.appendChild(sumDeleteCol);

  for (const col of allData.columns) {
    const td = document.createElement('td');
    td.dataset.colId = col.id;
    if (col.type === 'text') {
      td.textContent = '合计';
      td.style.fontWeight = '600';
      td.style.background = '#e8f5e9';
      td.style.color = '#2e7d32';
      td.style.textAlign = 'left';
    } else if (col.type === 'number') {
      const input = document.createElement('input');
      input.type = 'text';
      input.value = viewSums[col.id] || '0';
      input.readOnly = true;
      td.style.background = '#e8f5e9';
      td.appendChild(input);
    } else {
      td.style.background = '#e8f5e9';
    }
    sumRow.appendChild(td);
  }

  const totalTd = document.createElement('td');
  totalTd.className = 'row-total-sum';
  const totalInput = document.createElement('input');
  totalInput.type = 'text';
  totalInput.value = calcTotalSum(viewRows);
  totalInput.readOnly = true;
  totalTd.appendChild(totalInput);
  sumRow.appendChild(totalTd);
  tfoot.appendChild(sumRow);
}

function renderSumsOnly() {
  const tfoot = document.getElementById('tableFoot');
  if (!tfoot.children.length) return;
  const sumRow = tfoot.children[0];
  const viewRows = getViewRows();
  const viewSums = calcViewSums(viewRows);
  for (const col of allData.columns) {
    if (col.type === 'number') {
      const td = sumRow.querySelector(`td[data-col-id="${col.id}"]`);
      if (td) {
        const input = td.querySelector('input');
        if (input) input.value = viewSums[col.id] || '0';
      }
    }
  }
  const footTotalInput = sumRow.querySelector('td.row-total-sum input');
  if (footTotalInput) footTotalInput.value = calcTotalSum(viewRows);
}

function updateRowTotal(row, tr) {
  const totalInput = tr.querySelector('td.row-total input');
  if (totalInput) totalInput.value = calcRowSum(row);
  renderSumsOnly();
}

function addRow() {
  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  const values = {};
  for (const col of allData.columns) values[col.id] = col.type === 'date' ? dateStr : '';
  allData.rows.push({ id: getNextRowId(), values });
  scheduleSave();
  renderTable();
}

function addColumn() {
  const newCol = { id: getNextColId(), name: `列${nextColId-1}`, type: 'number' };
  allData.columns.push(newCol);
  for (const row of allData.rows) row.values[newCol.id] = '';
  scheduleSave();
  renderTable();
}

function deleteColumn(colId) {
  allData.columns = allData.columns.filter(c => c.id !== colId);
  for (const row of allData.rows) delete row.values[colId];
  scheduleSave();
  renderTable();
}

function clearAll() {
  if (confirm('确定要清空所有数据吗？此操作不可恢复！')) {
    initDefaultData();
    addInitialRow();
    saveTableData();
    renderTable();
  }
}

async function exportExcel() {
  try {
    const viewRows = getViewRows();
    const viewSums = calcViewSums(viewRows);
    const result = await API.exportExcel({
      columns: allData.columns, rows: viewRows, sums: viewSums
    });
    if (result && result.success) {
      showStatus('导出成功');
    } else if (result && !result.canceled) {
      showStatus('导出失败');
    }
  } catch (e) {
    console.error('导出失败:', e);
    showStatus('导出失败');
  }
}

async function importExcel() {
  try {
    // 先尝试 Electron 方式
    const electronResult = await API.importExcel();
    if (electronResult && electronResult.success) {
      allData = electronResult.data;
      nextColId = Math.max(...allData.columns.map(c => c.id), 0) + 1;
      nextRowId = Math.max(...allData.rows.map(r => r.id), 0) + 1;
      filterMonth = '';
      scheduleSave();
      renderTable();
      updateMonthFilter();
      showStatus('导入成功');
      return;
    }
    if (electronResult && electronResult.canceled) return;

    // 浏览器/手机版：同步触发 input.click() 确保被允许
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx,.xls';
    input.style.display = 'none';
    document.body.appendChild(input);

    input.onchange = async function() {
      const file = input.files[0];
      document.body.removeChild(input);
      if (!file) return;
      const result = await API.importExcelFromFile(file);
      if (result && result.success) {
        allData = result.data;
        nextColId = Math.max(...allData.columns.map(c => c.id), 0) + 1;
        nextRowId = Math.max(...allData.rows.map(r => r.id), 0) + 1;
        filterMonth = '';
        scheduleSave();
        renderTable();
        updateMonthFilter();
        showStatus('导入成功');
      } else if (result && !result.canceled) {
        showStatus('导入失败: ' + (result.error || '未知错误'));
      }
    };

    input.click();
  } catch (e) {
    console.error('导入失败:', e);
    showStatus('导入失败: ' + e.message);
  }
}

function showStatus(text) {
  const statusText = document.getElementById('statusText');
  if (statusText) {
    statusText.textContent = text;
    clearTimeout(showStatus._timer);
    showStatus._timer = setTimeout(() => {
      statusText.textContent = '数据已保存';
    }, 2000);
  }
}

function updateMonthFilter() {
  const monthFilter = document.getElementById('monthFilter');
  const now = new Date();
  monthFilter.value = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
}

function filterByMonth() {
  const monthFilter = document.getElementById('monthFilter');
  filterMonth = monthFilter.value || '';
  renderTable();
}

function initEventListeners() {
  document.getElementById('addRowBtn').addEventListener('click', addRow);
  document.getElementById('addColBtn').addEventListener('click', addColumn);
  document.getElementById('importBtn').addEventListener('click', importExcel);
  document.getElementById('exportBtn').addEventListener('click', exportExcel);
  document.getElementById('clearAllBtn').addEventListener('click', clearAll);
  document.getElementById('monthFilter').addEventListener('change', filterByMonth);

  const settingsToggle = document.getElementById('settingsToggle');
  const settingsPanel = document.getElementById('settingsPanel');
  const settingsClose = document.getElementById('settingsClose');
  const topToggle = document.getElementById('topToggle');
  const opacitySlider = document.getElementById('opacity');
  const opacityValue = document.getElementById('opacityValue');
  const alwaysOnTopCheckbox = document.getElementById('alwaysOnTop');
  const saveBtn = document.getElementById('saveBtn');

  settingsToggle.addEventListener('click', () => settingsPanel.classList.add('show'));
  settingsClose.addEventListener('click', () => settingsPanel.classList.remove('show'));

  if (config.alwaysOnTop) topToggle.classList.add('active');

  topToggle.addEventListener('click', () => {
    const enabled = !config.alwaysOnTop;
    config.alwaysOnTop = enabled;
    topToggle.classList.toggle('active', enabled);
    alwaysOnTopCheckbox.checked = enabled;
    try { API.setAlwaysOnTop(enabled); API.saveConfig(config); } catch (err) {}
  });

  opacitySlider.value = config.opacity || 100;
  opacityValue.textContent = (config.opacity || 100) + '%';
  alwaysOnTopCheckbox.checked = config.alwaysOnTop !== false;

  opacitySlider.addEventListener('input', (e) => {
    const val = parseInt(e.target.value);
    opacityValue.textContent = val + '%';
    config.opacity = val;
    try { API.setOpacity(val); } catch (err) {}
  });

  alwaysOnTopCheckbox.addEventListener('change', (e) => {
    const enabled = e.target.checked;
    config.alwaysOnTop = enabled;
    topToggle.classList.toggle('active', enabled);
    try { API.setAlwaysOnTop(enabled); } catch (err) {}
  });

  saveBtn.addEventListener('click', async () => {
    config.opacity = parseInt(opacitySlider.value);
    config.alwaysOnTop = alwaysOnTopCheckbox.checked;
    try { await API.saveConfig(config); } catch (e) {}
    settingsPanel.classList.remove('show');
    showStatus('设置已保存');
  });
}

init();
