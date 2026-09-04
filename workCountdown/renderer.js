let config = null;
let timerInterval = null;
let selectedWorkDays = new Set([1, 2, 3, 4, 5]);
let selectedTextColor = '#ff6b35';
let selectedBgColor = '#ffffff';
let selectedPet = 'cat';
let isLocked = false;
let isAlwaysOnTop = true;

const petEmojis = {
  cat: 'img/cat.gif',
  dog: 'img/dog.gif',
  bear: 'img/bear.gif',
  rabbit: 'img/rabbit.gif'
};

async function init() {
  try {
    config = await API.getConfig();
  } catch (e) {
    config = {
      widgetName: '下班倒计时',
      workDays: [1, 2, 3, 4, 5],
      startTime: '08:30',
      endTime: '18:00',
      textColor: '#ff6b35',
      bgColor: '#ffffff',
      salaryDay: 15,
      dailyIncome: 150,
      petImage: 'cat',
      opacity: 100
    };
  }

  applyConfig();
  initSettingsPanel();
  startCountdown();
}

function applyConfig() {
  selectedWorkDays = new Set(config.workDays || [1, 2, 3, 4, 5]);
  selectedTextColor = config.textColor || '#ff6b35';
  selectedBgColor = config.bgColor || '#ffffff';
  selectedPet = config.petImage || 'cat';

  document.getElementById('widgetName').value = config.widgetName || '下班倒计时';
  updateNameCount();

  document.getElementById('startTime').value = config.startTime || '08:30';
  document.getElementById('endTime').value = config.endTime || '18:00';
  document.getElementById('salaryDay').value = config.salaryDay || 15;
  document.getElementById('dailyIncome').value = config.dailyIncome || 150;
  document.getElementById('opacity').value = config.opacity || 100;
  document.getElementById('opacityValue').textContent = (config.opacity || 100) + '%';

  document.getElementById('countdownLabel').textContent = `距离${config.widgetName || '下班'}还有`;
  document.title = config.widgetName || '下班倒计时';

  updateWidgetColors();
  updateWorkdayButtons();
  updateColorSelection('textColorPicker', selectedTextColor);
  updateColorSelection('bgColorPicker', selectedBgColor);
  updatePetSelection();
  updatePetImage();
  updateLockState();
  updateTopState();
}

function updateWidgetColors() {
  const container = document.getElementById('widgetContainer');
  container.style.setProperty('--text-color', selectedTextColor);
  container.style.setProperty('--bg-color', selectedBgColor);

  document.querySelectorAll('.info-value').forEach(el => {
    el.style.color = selectedTextColor;
  });
}

function updateWorkdayButtons() {
  document.querySelectorAll('.day-btn').forEach(btn => {
    const day = parseInt(btn.dataset.day);
    btn.classList.toggle('active', selectedWorkDays.has(day));
  });
}

function updateColorSelection(pickerId, color) {
  const picker = document.getElementById(pickerId);
  const options = picker.querySelectorAll('.color-option');
  let found = false;
  options.forEach(opt => {
    const isMatch = opt.dataset.color.toLowerCase() === color.toLowerCase();
    opt.classList.toggle('active', isMatch);
    if (isMatch) found = true;
  });

  const customInput = picker.querySelector('input[type="color"]');
  if (customInput) {
    customInput.value = color;
  }
}

function updatePetSelection() {
  document.querySelectorAll('.pet-option').forEach(opt => {
    opt.classList.toggle('active', opt.dataset.pet === selectedPet);
  });
}

function updatePetImage() {
  const petEl = document.querySelector('.pet-placeholder');
  if (petEl) {
    const value = petEmojis[selectedPet] || '🐱';
    if (value.includes('.') && (value.endsWith('.gif') || value.endsWith('.png') || value.endsWith('.jpg') || value.endsWith('.jpeg'))) {
      petEl.src = value;
      petEl.textContent = '';
    } else {
      petEl.textContent = value;
      petEl.src = '';
    }
    petEl.className = `pet-placeholder ${selectedPet}`;
  }
}

function updateLockState() {
  isLocked = config.locked || false;
  const lockToggle = document.getElementById('lockToggle');
  const headerLock = document.getElementById('headerLock');
  const settingsToggle = document.getElementById('settingsToggle');
  const widgetContainer = document.getElementById('widgetContainer');

  if (isLocked) {
    if (lockToggle) {
      lockToggle.textContent = '🔒';
      lockToggle.classList.add('locked');
    }
    if (headerLock) {
      headerLock.textContent = '🔒';
      headerLock.classList.add('locked');
    }
    if (settingsToggle) {
      settingsToggle.style.display = 'none';
    }
    if (widgetContainer) {
      widgetContainer.classList.add('locked');
    }
  } else {
    if (lockToggle) {
      lockToggle.textContent = '🔓';
      lockToggle.classList.remove('locked');
    }
    if (headerLock) {
      headerLock.textContent = '🔓';
      headerLock.classList.remove('locked');
    }
    if (settingsToggle) {
      settingsToggle.style.display = 'flex';
    }
    if (widgetContainer) {
      widgetContainer.classList.remove('locked');
    }
  }
}

function updateTopState() {
  isAlwaysOnTop = config.alwaysOnTop || true;
  const topToggle = document.getElementById('topToggle');
  if (topToggle) {
    topToggle.textContent = isAlwaysOnTop ? '📌' : '📍';
    topToggle.classList.toggle('active', isAlwaysOnTop);
  }
}

function updateNameCount() {
  const input = document.getElementById('widgetName');
  document.getElementById('nameCount').textContent = `${input.value.length}/20`;
}

function startCountdown() {
  updateCountdown();
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(updateCountdown, 1000);
}

function isWorkDay(dayOfWeek) {
  return selectedWorkDays.has(dayOfWeek);
}

function parseTime(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  return { h, m };
}

function getNextWorkEndTime(now) {
  const { h: endH, m: endM } = parseTime(config.endTime);
  const { h: startH, m: startM } = parseTime(config.startTime);

  for (let i = 0; i < 14; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() + i);
    const dayOfWeek = date.getDay();

    if (isWorkDay(dayOfWeek)) {
      const startTime = new Date(date);
      startTime.setHours(startH, startM, 0, 0);

      const endTime = new Date(date);
      endTime.setHours(endH, endM, 0, 0);

      if (now >= startTime && now < endTime) {
        return endTime;
      }
    }
  }
  return null;
}

function getFridayCount(now) {
  let count = 0;
  const currentDay = now.getDay();

  if (currentDay === 5) {
    const { h: endH, m: endM } = parseTime(config.endTime);
    const endTime = new Date(now);
    endTime.setHours(endH, endM, 0, 0);
    if (now < endTime) return 0;
    count = 1;
  } else if (currentDay < 5) {
    count = 5 - currentDay;
  } else {
    count = 5 + (7 - currentDay);
  }

  for (let i = 1; i < count; i++) {
    const checkDate = new Date(now);
    checkDate.setDate(checkDate.getDate() + i);
    if (isWorkDay(checkDate.getDay())) {
    }
  }

  return count;
}

function getSalaryCount(now) {
  const salaryDay = config.salaryDay;
  const currentDay = now.getDate();

  if (currentDay < salaryDay) {
    return salaryDay - currentDay;
  } else {
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, salaryDay);
    const diff = Math.ceil((nextMonth - now) / (1000 * 60 * 60 * 24));
    return diff;
  }
}

function getEarnedToday(now) {
  const dayOfWeek = now.getDay();
  if (!isWorkDay(dayOfWeek)) return 0;

  const { h: startH, m: startM } = parseTime(config.startTime);
  const { h: endH, m: endM } = parseTime(config.endTime);

  const startTime = new Date(now);
  startTime.setHours(startH, startM, 0, 0);
  const endTime = new Date(now);
  endTime.setHours(endH, endM, 0, 0);

  if (now <= startTime) return 0;
  if (now >= endTime) return config.dailyIncome;

  const totalMs = endTime - startTime;
  const elapsedMs = now - startTime;
  return (elapsedMs / totalMs) * config.dailyIncome;
}

function updateCountdown() {
  const now = new Date();
  const targetTime = getNextWorkEndTime(now);

  if (targetTime) {
    const diff = targetTime - now;

    if (diff <= 0) {
      document.getElementById('countdownTime').textContent = '00:00:00';
      document.getElementById('countdownLabel').textContent = '已下班啦！';
    } else {
      const totalSeconds = Math.floor(diff / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      document.getElementById('countdownLabel').textContent = `距离${config.widgetName || '下班'}还有`;

      document.getElementById('countdownTime').textContent =
        String(hours).padStart(2, '0') + ':' +
        String(minutes).padStart(2, '0') + ':' +
        String(seconds).padStart(2, '0');
    }
  } else {
    document.getElementById('countdownTime').textContent = '00:00:00';
    document.getElementById('countdownLabel').textContent = '下班啦！下班啦！';
  }

  document.getElementById('fridayCount').textContent = getFridayCount(now);
  document.getElementById('salaryCount').textContent = getSalaryCount(now);
  document.getElementById('earnedToday').textContent = getEarnedToday(now).toFixed(2);
}

function initSettingsPanel() {
  const settingsToggle = document.getElementById('settingsToggle');
  const settingsPanel = document.getElementById('settingsPanel');
  const settingsClose = document.getElementById('settingsClose');
  const lockToggle = document.getElementById('lockToggle');
  const headerLock = document.getElementById('headerLock');
  const topToggle = document.getElementById('topToggle');

  settingsToggle.addEventListener('click', () => {
    if (isLocked) return;
    settingsPanel.classList.add('show');
  });

  settingsClose.addEventListener('click', () => {
    settingsPanel.classList.remove('show');
  });

  function toggleLock() {
    isLocked = !isLocked;
    config.locked = isLocked;
    updateLockState();

    try {
      if (API) {
        API.setLocked(isLocked);
        API.saveConfig(config);
      }
    } catch (err) {}

    if (!isLocked) {
      settingsPanel.classList.remove('show');
    }
  }

  if (lockToggle) {
    lockToggle.addEventListener('click', () => {
      toggleLock();
    });
  }

  if (headerLock) {
    headerLock.addEventListener('click', () => {
      toggleLock();
    });
  }

  if (topToggle) {
    topToggle.addEventListener('click', () => {
      if (isLocked) return;
      isAlwaysOnTop = !isAlwaysOnTop;
      config.alwaysOnTop = isAlwaysOnTop;
      updateTopState();

      try {
        if (API) {
          API.setAlwaysOnTop(isAlwaysOnTop);
          API.saveConfig(config);
        }
      } catch (err) {}
    });
  }

  document.getElementById('widgetName').addEventListener('input', updateNameCount);

  document.querySelectorAll('.day-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const day = parseInt(btn.dataset.day);
      if (selectedWorkDays.has(day)) {
        if (selectedWorkDays.size > 1) {
          selectedWorkDays.delete(day);
        }
      } else {
        selectedWorkDays.add(day);
      }
      updateWorkdayButtons();
    });
  });

  document.querySelectorAll('#textColorPicker .color-option').forEach(opt => {
    opt.addEventListener('click', () => {
      selectedTextColor = opt.dataset.color;
      updateColorSelection('textColorPicker', selectedTextColor);
    });
  });

  document.querySelectorAll('#bgColorPicker .color-option').forEach(opt => {
    opt.addEventListener('click', () => {
      selectedBgColor = opt.dataset.color;
      updateColorSelection('bgColorPicker', selectedBgColor);
    });
  });

  document.getElementById('customTextColor').addEventListener('input', (e) => {
    selectedTextColor = e.target.value;
    updateColorSelection('textColorPicker', selectedTextColor);
  });

  document.getElementById('customBgColor').addEventListener('input', (e) => {
    selectedBgColor = e.target.value;
    updateColorSelection('bgColorPicker', selectedBgColor);
  });

  document.getElementById('opacity').addEventListener('input', (e) => {
    const val = parseInt(e.target.value);
    document.getElementById('opacityValue').textContent = val + '%';
    if (config) {
      config.opacity = val;
    }
    try {
      if (API && API.setOpacity) {
        API.setOpacity(val);
      }
    } catch (err) {}
  });

  document.querySelectorAll('.pet-option').forEach(opt => {
    opt.addEventListener('click', () => {
      selectedPet = opt.dataset.pet;
      updatePetSelection();
    });
  });

  document.getElementById('saveBtn').addEventListener('click', saveSettings);

  try {
    API.onToggleSettings(() => {
      settingsPanel.classList.toggle('show');
    });
  } catch (e) {}
}

async function saveSettings() {
  const widgetName = document.getElementById('widgetName').value.trim() || '下班倒计时';
  const startTime = document.getElementById('startTime').value;
  const endTime = document.getElementById('endTime').value;
  const salaryDay = parseInt(document.getElementById('salaryDay').value);
  const dailyIncome = parseFloat(document.getElementById('dailyIncome').value) || 0;
  const opacity = parseInt(document.getElementById('opacity').value);

  const workDaysArray = Array.from(selectedWorkDays).sort();

  const newConfig = {
    ...config,
    widgetName,
    workDays: workDaysArray,
    startTime,
    endTime,
    textColor: selectedTextColor,
    bgColor: selectedBgColor,
    salaryDay,
    dailyIncome,
    petImage: selectedPet,
    opacity,
    locked: isLocked,
    alwaysOnTop: isAlwaysOnTop
  };

  config = newConfig;
  updateWidgetColors();
  updatePetImage();
  document.getElementById('countdownLabel').textContent = `距离${widgetName}还有`;
  document.title = widgetName;

  try {
    await API.saveConfig(newConfig);
  } catch (e) {
    console.error('保存配置失败:', e);
  }

  document.getElementById('settingsPanel').classList.remove('show');
}

init();
