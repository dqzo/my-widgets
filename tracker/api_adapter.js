// tracker 记账 - 双模式 API 适配
const isElectron = !!(window.electronAPI && window.electronAPI.getConfig);

function api() {
  const e = window.electronAPI;
  return {
    async getConfig() {
      if (isElectron) return e.getConfig();
      try { return JSON.parse(localStorage.getItem('tracker_config') || 'null') || { opacity: 100, alwaysOnTop: true }; }
      catch { return { opacity: 100, alwaysOnTop: true }; }
    },
    async saveConfig(c) {
      if (isElectron) return e.saveConfig(c);
      localStorage.setItem('tracker_config', JSON.stringify(c));
      return true;
    },
    async setOpacity(v) { if (isElectron) e.setOpacity(v); else { try { document.body.style.opacity = v / 100; } catch {} } },
    async setAlwaysOnTop(v) { if (isElectron) e.setAlwaysOnTop(v); },

    // 表格数据（tracker 专用）
    async loadTableData() {
      if (isElectron) return e.loadTableData();
      try { return JSON.parse(localStorage.getItem('tracker_data') || 'null') || null; }
      catch { return null; }
    },
    async saveTableData(d) {
      if (isElectron) return e.saveTableData(d);
      localStorage.setItem('tracker_data', JSON.stringify(d));
      return true;
    },

    // Excel 导出（浏览器版用 SheetJS + Blob 下载）
    async exportExcel(data) {
      if (isElectron) return e.exportExcel(data);
      if (typeof XLSX === 'undefined') {
        console.error('SheetJS 未加载');
        return { success: false, error: 'SheetJS 未加载' };
      }
      try {
        const filename = 'tracker_export_' + new Date().toISOString().slice(0, 10) + '.xlsx';

        // data 是 { columns, rows, sums } 格式，转换成 Excel
        const headers = ['时间', ...data.columns.map(c => c.name), '合计'];
        const aoa = [headers];
        for (const row of data.rows) {
          const cells = [row.values[0] || '']; // 时间列
          for (let i = 1; i < data.columns.length; i++) {
            cells.push(row.values[data.columns[i].id] || '');
          }
          cells.push(''); // 合计
          aoa.push(cells);
        }
        if (data.sums) {
          const sumRow = ['合计', ...data.columns.slice(1).map(c => data.sums[c.id] || ''), ''];
          aoa.push(sumRow);
        }

        const ws = XLSX.utils.aoa_to_sheet(aoa);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, '数据');

        // 移动端兼容：用 Blob + 手动触发下载
        const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([wbout], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);

        return { success: true, path: filename };
      } catch (err) {
        console.error('导出 Excel 失败:', err);
        return { success: false, error: err.message };
      }
    },

    // Excel 导入（浏览器版：由 renderer.js 直接调用 importExcelFromFile）
    async importExcelFromFile(file) {
      if (typeof XLSX === 'undefined') {
        console.error('SheetJS 未加载');
        return { success: false, error: 'SheetJS 未加载' };
      }
      try {
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rawData = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

        if (!rawData || rawData.length < 2) {
          return { success: false, error: '文件中没有有效数据' };
        }

        // 解析表头（跳过第 0 个单元格是"时间"，最后一个是"合计"）
        const headerRow = rawData[0];
        const colNames = headerRow.slice(1, headerRow.length - 1); // 去掉首和尾

        if (colNames.length === 0) {
          return { success: false, error: '无法识别表头' };
        }

        const columns = [];
        for (let i = 0; i < colNames.length; i++) {
          columns.push({
            id: i + 1,
            name: String(colNames[i] || `列${i + 1}`),
            type: i === 0 ? 'date' : 'number'
          });
        }

        const rows = [];
        let rowId = 0;
        for (let r = 1; r < rawData.length; r++) {
          const rawRow = rawData[r];
          const firstCell = String(rawRow[0] || '').trim();
          if (firstCell === '合计' || firstCell.includes('合计')) continue;
          const isEmpty = rawRow.every(c => String(c || '').trim() === '');
          if (isEmpty) continue;

          const values = {};
          // 时间列存到 values[0]
          values[0] = firstCell;
          for (let i = 0; i < columns.length; i++) {
            const rawVal = rawRow[i + 1];
            values[columns[i].id] = rawVal === undefined || rawVal === null ? '' : String(rawVal);
          }
          rows.push({ id: rowId++, values });
        }

        return { success: true, data: { columns, rows, sums: {} } };
      } catch (err) {
        console.error('导入 Excel 失败:', err);
        return { success: false, error: err.message };
      }
    },

    async importExcel() {
      // Electron 版用系统对话框
      if (isElectron) return e.importExcel();
      // 浏览器版返回 null，让 renderer.js 直接处理文件选择
      // （因为手机端 input.click() 必须在 click handler 的同步栈里）
      return null;
    }
  };
}
const API = api();
