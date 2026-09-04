let config = null;
let audioContext = null;

async function init() {
  try {
    config = await API.getConfig();
  } catch (e) {
    config = {
      opacity: 100, alwaysOnTop: true, count: 0, soundEnabled: true, windowBounds: null
    };
  }

  applyConfig();
  initEventListeners();
  updateCountDisplay();
}

function applyConfig() {
  document.getElementById('opacity').value = config.opacity || 100;
  document.getElementById('opacityValue').textContent = (config.opacity || 100) + '%';
  document.getElementById('alwaysOnTop').checked = config.alwaysOnTop !== false;
  document.getElementById('soundEnabled').checked = config.soundEnabled !== false;

  const topToggle = document.getElementById('topToggle');
  if (topToggle) {
    topToggle.classList.toggle('active', config.alwaysOnTop !== false);
  }

  const soundToggle = document.getElementById('soundToggle');
  if (soundToggle) {
    soundToggle.classList.toggle('muted', !config.soundEnabled);
    soundToggle.textContent = config.soundEnabled ? '🔊' : '🔇';
  }
}

function updateCountDisplay() {
  const meritCount = document.getElementById('meritCount');
  const currentCount = document.getElementById('currentCount');
  if (meritCount) {
    meritCount.textContent = `功德 +${config.count || 0}`;
  }
  if (currentCount) {
    currentCount.textContent = config.count || 0;
  }
}

function playSound() {
  if (!config.soundEnabled) return;

  try {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(200, audioContext.currentTime + 0.15);

    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.2);
  } catch (e) {
    console.error('播放音效失败:', e);
  }
}

function createRipple(x, y) {
  const container = document.getElementById('floatTextContainer');
  const ripple = document.createElement('div');
  ripple.className = 'ripple';
  ripple.style.left = x + 'px';
  ripple.style.top = y + 'px';
  container.appendChild(ripple);
  
  setTimeout(() => {
    ripple.remove();
  }, 800);
}

function createFloatText() {
  const container = document.getElementById('floatTextContainer');
  const muyuBtn = document.getElementById('muyuBtn');
  const widgetRect = document.querySelector('.widget-container').getBoundingClientRect();
  const muyuRect = muyuBtn.getBoundingClientRect();

  const floatTexts = ['功德 +1', '福慧双修 +1', '功德 +1', '心诚则灵 +1', '功德 +1', '大彻大悟 +1', '功德 +1',
    '金玉满堂 +1', '功德 +1', '吉祥如意 +1', '长安喜乐 +1', '自在欢喜 +1','惠风和畅 +1', '厚德载福 +1', 
    '知足常乐 +1', '长风破浪 +1', '蕙质兰心 +1', '灾厄退散 +1', '诸事顺遂 +1', '事事如意 +1', '心想事成 +1', 
    '时来运转 +1', '八方来财 +1'];
  const randomText = floatTexts[Math.floor(Math.random() * floatTexts.length)];

  const floatText = document.createElement('div');
  floatText.className = 'float-text';
  floatText.textContent = randomText;

  const centerX = muyuRect.left - widgetRect.left + muyuRect.width / 2;
  const centerY = muyuRect.top - widgetRect.top + muyuRect.height / 4;

  floatText.style.left = (centerX - 40) + 'px';
  floatText.style.top = centerY + 'px';

  container.appendChild(floatText);

  setTimeout(() => {
    floatText.remove();
  }, 1200);
}

function hitMuyu(e) {
  config.count = (config.count || 0) + 1;
  updateCountDisplay();

  const meritCount = document.getElementById('meritCount');
  meritCount.classList.remove('bounce');
  void meritCount.offsetWidth;
  meritCount.classList.add('bounce');

  const muyuOuter = document.querySelector('.muyu-outer');
  muyuOuter.style.transform = 'scale(0.95)';
  setTimeout(() => {
    muyuOuter.style.transform = '';
  }, 150);

  if (e) {
    const container = document.getElementById('floatTextContainer');
    const widgetRect = document.querySelector('.widget-container').getBoundingClientRect();
    const clickX = e.clientX - widgetRect.left;
    const clickY = e.clientY - widgetRect.top;
    createRipple(clickX, clickY);
  } else {
    const container = document.getElementById('floatTextContainer');
    const widgetRect = document.querySelector('.widget-container').getBoundingClientRect();
    const muyuBtn = document.getElementById('muyuBtn');
    const muyuRect = muyuBtn.getBoundingClientRect();
    const centerX = muyuRect.left - widgetRect.left + muyuRect.width / 2;
    const centerY = muyuRect.top - widgetRect.top + muyuRect.height / 2;
    createRipple(centerX, centerY);
  }

  createFloatText();
  playSound();

  try {
    API.saveConfig(config);
  } catch (e) {}
}

function initEventListeners() {
  const muyuBtn = document.getElementById('muyuBtn');
  const settingsToggle = document.getElementById('settingsToggle');
  const settingsPanel = document.getElementById('settingsPanel');
  const settingsClose = document.getElementById('settingsClose');
  const topToggle = document.getElementById('topToggle');
  const soundToggle = document.getElementById('soundToggle');
  const opacitySlider = document.getElementById('opacity');
  const opacityValue = document.getElementById('opacityValue');
  const alwaysOnTopCheckbox = document.getElementById('alwaysOnTop');
  const soundEnabledCheckbox = document.getElementById('soundEnabled');
  const resetBtn = document.getElementById('resetBtn');
  const saveBtn = document.getElementById('saveBtn');

  muyuBtn.addEventListener('click', (e) => {
    hitMuyu(e);
  });

  muyuBtn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const mockEvent = { clientX: touch.clientX, clientY: touch.clientY };
    hitMuyu(mockEvent);
  });

  settingsToggle.addEventListener('click', () => {
    settingsPanel.classList.add('show');
  });

  settingsClose.addEventListener('click', () => {
    settingsPanel.classList.remove('show');
  });

  topToggle.addEventListener('click', () => {
    const enabled = !config.alwaysOnTop;
    config.alwaysOnTop = enabled;
    topToggle.classList.toggle('active', enabled);
    alwaysOnTopCheckbox.checked = enabled;

    try {
      API.setAlwaysOnTop(enabled);
      API.saveConfig(config);
    } catch (err) {}
  });

  soundToggle.addEventListener('click', () => {
    const enabled = !config.soundEnabled;
    config.soundEnabled = enabled;
    soundToggle.classList.toggle('muted', !enabled);
    soundToggle.textContent = enabled ? '🔊' : '🔇';
    soundEnabledCheckbox.checked = enabled;
  });

  opacitySlider.addEventListener('input', (e) => {
    const val = parseInt(e.target.value);
    opacityValue.textContent = val + '%';
    config.opacity = val;

    try {
      API.setOpacity(val);
    } catch (err) {}
  });

  alwaysOnTopCheckbox.addEventListener('change', (e) => {
    const enabled = e.target.checked;
    config.alwaysOnTop = enabled;
    topToggle.classList.toggle('active', enabled);

    try {
      API.setAlwaysOnTop(enabled);
    } catch (err) {}
  });

  soundEnabledCheckbox.addEventListener('change', (e) => {
    const enabled = e.target.checked;
    config.soundEnabled = enabled;
    soundToggle.classList.toggle('muted', !enabled);
    soundToggle.textContent = enabled ? '🔊' : '🔇';
  });

  resetBtn.addEventListener('click', () => {
    if (confirm('确定要重置功德数吗？')) {
      config.count = 0;
      updateCountDisplay();
      try { API.saveConfig(config); } catch (e) {}
    }
  });

  saveBtn.addEventListener('click', async () => {
    const newConfig = {
      ...config,
      opacity: parseInt(opacitySlider.value),
      alwaysOnTop: alwaysOnTopCheckbox.checked,
      soundEnabled: soundEnabledCheckbox.checked
    };

    config = newConfig;

    try {
      await API.saveConfig(newConfig);
    } catch (e) {
      console.error('保存配置失败:', e);
    }

    settingsPanel.classList.remove('show');
  });

  document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.code === 'Enter') {
      e.preventDefault();
      hitMuyu();
    }
  });
}

init();