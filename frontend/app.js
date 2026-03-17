'use strict';

const BLE = {
  SERVICE:   '12345678-1234-5678-1234-56789abcdef0',
  INTENSITY: '12345678-1234-5678-1234-56789abcdef1',
  DIRECTION: '12345678-1234-5678-1234-56789abcdef2',
  FREQUENCY: '12345678-1234-5678-1234-56789abcdef3',
  STATUS:    '12345678-1234-5678-1234-56789abcdef4',
  DEVICE_NAME: 'GVS Controller',
};

const state = {
  device: null, server: null, service: null, chars: {},
  connected: false, stimulating: false,
  intensity: 0, frequency: 100, direction: 0,
  rampRate: 5, rampInterval: null,
};

const $ = id => document.getElementById(id);

function toast(msg, type = 'info', duration = 3500) {
  const container = $('toast-container');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(() => {
    el.classList.add('exit');
    el.addEventListener('animationend', () => el.remove());
  }, duration);
}

function playAlert() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [440, 330, 220].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = 'sawtooth';
      gain.gain.setValueAtTime(0.3, ctx.currentTime + i * 0.18);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.18 + 0.17);
      osc.start(ctx.currentTime + i * 0.18);
      osc.stop(ctx.currentTime + i * 0.18 + 0.17);
    });
  } catch (_) {}
}

async function writeChar(uuid, value) {
  if (!state.chars[uuid]) throw new Error('Characteristic not available');
  const buf = new ArrayBuffer(4);
  new DataView(buf).setUint32(0, value, true);
  await state.chars[uuid].writeValueWithoutResponse(buf);
}

function stopRamp() {
  if (state.rampInterval) {
    clearInterval(state.rampInterval);
    state.rampInterval = null;
  }
  $('ramp-status').classList.remove('visible');
}

async function rampTo(target) {
  stopRamp();
  if (target === state.intensity) return;
  const dir = target > state.intensity ? 1 : -1;
  $('ramp-status').classList.add('visible');
  $('ramp-status').textContent = `→ ${target}%`;
  state.rampInterval = setInterval(async () => {
    if (!state.connected) { stopRamp(); return; }
    state.intensity += dir * state.rampRate;
    if (dir > 0 && state.intensity >= target) state.intensity = target;
    if (dir < 0 && state.intensity <= target) state.intensity = target;
    updateIntensityUI(state.intensity, false);
    try { await writeChar(BLE.INTENSITY, state.intensity); }
    catch (e) { stopRamp(); toast('Write failed during ramp', 'error'); return; }
    if (state.intensity === target) {
      stopRamp();
      toast(`Intensity → ${target}%`, 'success', 2000);
    }
  }, 120);
}

function updateIntensityUI(val, syncSlider = true) {
  const pct = Math.max(0, Math.min(100, val));
  if (syncSlider) $('intensity-slider').value = pct;
  $('intensity-value').textContent = `${pct}%`;
  $('intensity-fill').style.width = `${pct}%`;
  const danger = pct >= 70;
  $('intensity-slider').classList.toggle('danger', danger);
  $('intensity-fill').classList.toggle('danger', danger);
  $('intensity-value').classList.toggle('danger', danger);
}

function updateDirectionUI(dir) {
  document.querySelectorAll('.dir-btn').forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.dataset.dir) === dir);
  });
}

function setConnectionUI(status) {
  const isConnected  = status === 'connected';
  const isConnecting = status === 'connecting';

  $('btn-connect').classList.toggle('hidden', isConnected || isConnecting);
  $('btn-disconnect').classList.toggle('hidden', !isConnected);
  $('controls-section').classList.toggle('hidden', !isConnected);
  $('header-dot').className = 'header-status-dot' + (isConnected ? ' connected' : '');

  const icon = $('connection-icon');
  icon.className = 'connection-icon' + (isConnected ? ' connected' : '') + (isConnecting ? ' connecting' : '');
  icon.innerHTML = isConnected ? svgCheck() : svgBluetooth();

  const statusText = $('connection-status');
  const statusSub  = $('connection-subtitle');

  if (status === 'disconnected') {
    statusText.textContent = 'Not Connected';
    statusText.style.color = '';
    statusSub.textContent  = 'Tap Connect to pair';
  } else if (status === 'connecting') {
    statusText.textContent = 'Connecting…';
    statusText.style.color = 'var(--amber)';
    statusSub.textContent  = 'Searching for GVS Controller…';
  } else {
    statusText.textContent = state.device?.name || 'GVS Controller';
    statusText.style.color = 'var(--green)';
    statusSub.textContent  = state.device?.id?.slice(0, 22) + '…' || '';
  }
}

function svgBluetooth() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="6.5 6.5 17.5 17.5 12 23 12 1 17.5 6.5 6.5 17.5"/>
  </svg>`;
}
function svgCheck() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="var(--green)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M20 6L9 17l-5-5"/>
  </svg>`;
}

async function connect() {
  if (!navigator.bluetooth) {
    toast('Web Bluetooth not supported. Use Chrome on Android or desktop.', 'error', 6000);
    return;
  }
  try {
    setConnectionUI('connecting');
    state.device = await navigator.bluetooth.requestDevice({
      filters: [{ name: BLE.DEVICE_NAME }],
      optionalServices: [BLE.SERVICE],
    });
    state.device.addEventListener('gattserverdisconnected', onDisconnected);
    state.server  = await state.device.gatt.connect();
    state.service = await state.server.getPrimaryService(BLE.SERVICE);
    state.chars[BLE.INTENSITY] = await state.service.getCharacteristic(BLE.INTENSITY);
    state.chars[BLE.DIRECTION] = await state.service.getCharacteristic(BLE.DIRECTION);
    state.chars[BLE.FREQUENCY] = await state.service.getCharacteristic(BLE.FREQUENCY);
    state.chars[BLE.STATUS]    = await state.service.getCharacteristic(BLE.STATUS);
    state.connected = true;
    setConnectionUI('connected');
    await writeChar(BLE.INTENSITY, 0);
    await writeChar(BLE.DIRECTION, state.direction);
    await writeChar(BLE.FREQUENCY, state.frequency);
    await writeChar(BLE.STATUS, 0);
    updateIntensityUI(0);
    updateDirectionUI(state.direction);
    $('freq-input').value = state.frequency;
    toast(`Connected to ${state.device.name}`, 'success');
  } catch (err) {
    setConnectionUI('disconnected');
    if (err.name === 'AbortError') {
      toast('Pairing cancelled.', 'warning', 2500);
    } else if (err.name === 'NotFoundError') {
      toast('No device selected.', 'warning', 2500);
    } else if (err.name === 'NotSupportedError') {
      toast(`BLE not supported on this platform. (${err.name})`, 'error', 8000);
    } else if (err.name === 'SecurityError') {
      toast('Bluetooth blocked — needs HTTPS or localhost. Open via http://localhost:8000', 'error', 8000);
    } else {
      toast(`[${err.name}] ${err.message}`, 'error', 8000);
    }
    console.error('BLE connect error:', err.name, err.message, err);
  }
}

async function disconnect() {
  stopRamp();
  if (state.stimulating) await setStimulation(false, true);
  state.device?.gatt?.disconnect();
}

async function onDisconnected() {
  stopRamp();
  state.connected = false;
  state.stimulating = false;
  state.chars = {};
  updateStartStopBtn();
  setConnectionUI('disconnected');
  playAlert();
  toast('Device disconnected — stimulation stopped.', 'error', 6000);
}

async function setStimulation(active, skipRamp = false) {
  if (!state.connected) return;
  try {
    if (!active) {
      stopRamp();
      await rampDown();
      await writeChar(BLE.STATUS, 0);
      state.stimulating = false;
    } else {
      if (state.intensity > 0 && !skipRamp) {
        toast('Intensity must be 0 to start safely. Resetting…', 'warning');
        state.intensity = 0;
        updateIntensityUI(0);
        await writeChar(BLE.INTENSITY, 0);
      }
      await writeChar(BLE.STATUS, 1);
      state.stimulating = true;
    }
    updateStartStopBtn();
  } catch (e) {
    toast(`Control error: ${e.message}`, 'error');
  }
}

function rampDown() {
  return new Promise((resolve) => {
    if (state.intensity === 0) { resolve(); return; }
    const iv = setInterval(async () => {
      state.intensity = Math.max(0, state.intensity - state.rampRate);
      updateIntensityUI(state.intensity, true);
      try { await writeChar(BLE.INTENSITY, state.intensity); } catch(_) {}
      if (state.intensity <= 0) { clearInterval(iv); resolve(); }
    }, 120);
  });
}

function updateStartStopBtn() {
  const btn = $('btn-start-stop');
  btn.classList.toggle('stopping', state.stimulating);
  btn.innerHTML = state.stimulating
    ? `<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg> Stop Stimulation`
    : `<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg> Start Stimulation`;
}

async function emergencyStop() {
  stopRamp();
  const btn = $('btn-estop');
  btn.style.background = 'rgba(192,57,43,0.4)';
  setTimeout(() => { btn.style.background = ''; }, 600);
  try {
    if (state.connected) {
      await writeChar(BLE.INTENSITY, 0);
      await writeChar(BLE.STATUS, 0);
    }
  } catch (_) {}
  state.intensity   = 0;
  state.stimulating = false;
  updateIntensityUI(0);
  updateStartStopBtn();
  toast('Emergency stop — all output halted.', 'error', 5000);
  playAlert();
}

function wireEvents() {
  $('btn-connect').addEventListener('click', connect);
  $('btn-disconnect').addEventListener('click', disconnect);
  $('btn-start-stop').addEventListener('click', () => setStimulation(!state.stimulating));
  $('btn-estop').addEventListener('click', emergencyStop);

  const intensitySlider = $('intensity-slider');
  intensitySlider.addEventListener('input', () => updateIntensityUI(parseInt(intensitySlider.value), false));
  intensitySlider.addEventListener('change', async () => {
    const target = parseInt(intensitySlider.value);
    if (!state.connected || !state.stimulating) { state.intensity = target; return; }
    await rampTo(target);
  });

  $('btn-intensity-minus').addEventListener('click', async () => {
    const v = Math.max(0, state.intensity - 1);
    state.intensity = v;
    updateIntensityUI(v);
    if (state.connected && state.stimulating)
      try { await writeChar(BLE.INTENSITY, v); } catch(e) { toast(e.message, 'error'); }
  });

  $('btn-intensity-plus').addEventListener('click', async () => {
    if (!state.stimulating) { toast('Start stimulation before increasing intensity.', 'warning', 3000); return; }
    const v = Math.min(100, state.intensity + 1);
    state.intensity = v;
    updateIntensityUI(v);
    if (state.connected)
      try { await writeChar(BLE.INTENSITY, v); } catch(e) { toast(e.message, 'error'); }
  });

  document.querySelectorAll('.dir-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      state.direction = parseInt(btn.dataset.dir);
      updateDirectionUI(state.direction);
      if (state.connected)
        try { await writeChar(BLE.DIRECTION, state.direction); } catch(e) { toast(e.message, 'error'); }
    });
  });

  $('freq-input').addEventListener('change', async () => {
    const v = Math.max(0, Math.min(1000000, parseInt($('freq-input').value) || 0));
    state.frequency = v;
    $('freq-input').value = v;
    if (state.connected)
      try { await writeChar(BLE.FREQUENCY, v); } catch(e) { toast(e.message, 'error'); }
  });

  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const v = parseInt(btn.dataset.freq);
      state.frequency = v;
      $('freq-input').value = v;
      if (state.connected)
        try { await writeChar(BLE.FREQUENCY, v); } catch(e) { toast(e.message, 'error'); }
    });
  });

  $('ramp-rate-slider').addEventListener('input', () => {
    state.rampRate = parseInt($('ramp-rate-slider').value);
    $('ramp-rate-val').textContent = `${state.rampRate}%`;
  });
}

function registerSW() {
  if ('serviceWorker' in navigator)
    navigator.serviceWorker.register('./sw.js').catch(() => {});
}

document.addEventListener('DOMContentLoaded', () => {
  setConnectionUI('disconnected');
  updateIntensityUI(0);
  updateDirectionUI(0);
  $('freq-input').value = 100;
  updateStartStopBtn();
  wireEvents();
  registerSW();
  window.addEventListener('beforeunload', (e) => {
    if (state.stimulating || state.connected) { e.preventDefault(); e.returnValue = ''; }
  });
});
