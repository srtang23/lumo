/* ---------------------------------------------------------------------
   Lumo — mood candle-warmer lamp
   Front end only. Talks to an ESP32 over Web Bluetooth (Chrome/Edge).

   Firmware contract (adjust to match your ESP32 sketch):
     Service UUID:        a1e8f5b0-696b-4e4c-87c6-b8e2d4a1a001
     Heat characteristic:  a1e8f5b1-696b-4e4c-87c6-b8e2d4a1a001  (write, 1 byte: 0x00/0x01)
     Color characteristic: a1e8f5b2-696b-4e4c-87c6-b8e2d4a1a001  (write, 3 bytes: R,G,B)
     Glow characteristic:  a1e8f5b3-696b-4e4c-87c6-b8e2d4a1a001  (write, 1 byte: 0x00/0x01)
------------------------------------------------------------------- */

const LUMO_SERVICE_UUID = 'a1e8f5b0-696b-4e4c-87c6-b8e2d4a1a001';
const HEAT_CHAR_UUID    = 'a1e8f5b1-696b-4e4c-87c6-b8e2d4a1a001';
const COLOR_CHAR_UUID   = 'a1e8f5b2-696b-4e4c-87c6-b8e2d4a1a001';
const GLOW_CHAR_UUID    = 'a1e8f5b3-696b-4e4c-87c6-b8e2d4a1a001';

const state = {
  bleDevice: null,
  heatChar: null,
  colorChar: null,
  glowChar: null,
  connected: false,
  heatOn: false,
  glowOn: true,
  currentColor: { hex: '#e8975a', emotion: 'Calm', desc: 'A quiet amber — settled and warm.' },
};

/* ----------------------------- DOM refs ----------------------------- */

const el = (id) => document.getElementById(id);

const ambientGlow   = el('ambientGlow');
const brandDot      = el('brandDot');
const devicePlate    = el('devicePlate');
const deviceGlow     = el('deviceGlow');
const statusDot      = el('statusDot');
const statusText     = el('statusText');
const connectHint    = el('connectHint');
const connectBtn     = el('connectBtn');
const disconnectBtn  = el('disconnectBtn');
const deviceMeta     = el('deviceMeta');
const deviceName     = el('deviceName');

const heatSwitch     = el('heatSwitch');
const heatStateLabel = el('heatStateLabel');
const glowSwitch     = el('glowSwitch');
const lampStateLabel = el('lampStateLabel');

const moodSwatch      = el('moodSwatch');
const moodEmotion     = el('moodEmotion');
const moodDescription = el('moodDescription');
const moodHistory     = el('moodHistory');

const moodOrb        = el('moodOrb');
const moodPanel       = el('moodPanel');
const moodPanelClose  = el('moodPanelClose');
const moodInput       = el('moodInput');
const moodSubmit      = el('moodSubmit');
const moodResult       = el('moodResult');
const moodResultSwatch = el('moodResultSwatch');
const moodResultEmotion = el('moodResultEmotion');
const moodResultText    = el('moodResultText');

/* ------------------------- mood → color engine -----------------------
   Small local keyword model: no API key required, works offline.
   Swap `deriveMoodColor` for a real LLM call if you want richer read.
------------------------------------------------------------------- */

const MOOD_LEXICON = [
  { words: ['happy', 'joy', 'joyful', 'excited', 'great', 'fantastic', 'thrilled', 'good'], emotion: 'Joyful', hex: '#f4b942', desc: 'Bright gold — light and open.' },
  { words: ['calm', 'peaceful', 'relaxed', 'content', 'fine', 'okay', 'ok', 'steady'], emotion: 'Calm', hex: '#7fb8a4', desc: 'Soft sage — settled and even.' },
  { words: ['sad', 'down', 'blue', 'unhappy', 'lonely', 'empty', 'heavy'], emotion: 'Sad', hex: '#5b7fa6', desc: 'Muted blue — quiet and low.' },
  { words: ['angry', 'mad', 'furious', 'frustrated', 'irritated', 'annoyed'], emotion: 'Frustrated', hex: '#c94f3d', desc: 'Deep red — sharp and hot.' },
  { words: ['anxious', 'nervous', 'worried', 'stressed', 'overwhelmed', 'panicked', 'tense'], emotion: 'Anxious', hex: '#8b6fc4', desc: 'Restless violet — wound tight.' },
  { words: ['tired', 'exhausted', 'drained', 'sleepy', 'burnt', 'burned'], emotion: 'Weary', hex: '#6b6f8a', desc: 'Faded indigo — running low.' },
  { words: ['love', 'loved', 'grateful', 'thankful', 'warm', 'affection'], emotion: 'Tender', hex: '#e27d9a', desc: 'Warm rose — soft and open-hearted.' },
  { words: ['hopeful', 'optimistic', 'motivated', 'inspired', 'curious'], emotion: 'Hopeful', hex: '#5fb0d9', desc: 'Clear sky — looking forward.' },
  { words: ['confused', 'lost', 'uncertain', 'unsure', 'conflicted'], emotion: 'Uncertain', hex: '#9c8f6e', desc: 'Clouded gold — searching.' },
  { words: ['angsty', 'restless', 'bored', 'numb', 'flat'], emotion: 'Numb', hex: '#7a7a7a', desc: 'Grey — not much moving.' },
  { words: ['proud', 'accomplished', 'confident', 'strong'], emotion: 'Proud', hex: '#d98b3f', desc: 'Warm bronze — standing tall.' },
  { words: ['scared', 'afraid', 'fearful', 'terrified'], emotion: 'Afraid', hex: '#4a5b7a', desc: 'Dark slate — bracing.' },
];

const POSITIVE_WORDS = ['good', 'nice', 'well', 'better', 'light', 'bright', 'free', 'easy'];
const NEGATIVE_WORDS = ['bad', 'hard', 'difficult', 'sick', 'sore', 'awful', 'terrible', 'worse'];
const HIGH_ENERGY_WORDS = ['excited', 'energetic', 'buzzing', 'racing', 'fast', 'alive'];
const LOW_ENERGY_WORDS = ['slow', 'quiet', 'still', 'sleepy', 'tired', 'heavy'];

function hexToHsl(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  if (max === min) { h = s = 0; }
  else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      default: h = (r - g) / d + 4;
    }
    h /= 6;
  }
  return [h * 360, s * 100, l * 100];
}

function hslToHex(h, s, l) {
  h = ((h % 360) + 360) % 360;
  s /= 100; l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;
  let r, g, b;
  if (h < 60)       [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else              [r, g, b] = [c, 0, x];
  const toHex = (v) => Math.round((v + m) * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function deriveMoodColor(rawText) {
  const text = rawText.toLowerCase();
  const tokens = text.match(/[a-z']+/g) || [];

  let best = null;
  let bestHits = 0;
  for (const entry of MOOD_LEXICON) {
    const hits = entry.words.filter((w) => tokens.includes(w) || text.includes(w)).length;
    if (hits > bestHits) { bestHits = hits; best = entry; }
  }

  if (best) {
    // nudge lightness/saturation slightly using energy words, so repeated
    // moods don't always land on the exact same shade
    const [h, s, l] = hexToHsl(best.hex);
    const energyUp = HIGH_ENERGY_WORDS.some((w) => text.includes(w));
    const energyDown = LOW_ENERGY_WORDS.some((w) => text.includes(w));
    const sAdj = energyUp ? Math.min(s + 12, 90) : energyDown ? Math.max(s - 12, 20) : s;
    const lAdj = energyUp ? Math.min(l + 4, 70) : energyDown ? Math.max(l - 4, 30) : l;
    return { hex: hslToHex(h, sAdj, lAdj), emotion: best.emotion, desc: best.desc };
  }

  // fallback heuristic: no direct keyword hit, so build a color from
  // rough sentiment + energy signals instead of a generic default
  const posHits = POSITIVE_WORDS.filter((w) => text.includes(w)).length;
  const negHits = NEGATIVE_WORDS.filter((w) => text.includes(w)).length;
  const energyUp = HIGH_ENERGY_WORDS.some((w) => text.includes(w));
  const energyDown = LOW_ENERGY_WORDS.some((w) => text.includes(w));

  let hue = 40; // warm neutral amber
  if (posHits > negHits) hue = 45;
  else if (negHits > posHits) hue = 225;

  const sat = energyUp ? 65 : energyDown ? 30 : 45;
  const light = energyUp ? 58 : energyDown ? 38 : 50;

  return {
    hex: hslToHex(hue, sat, light),
    emotion: text.trim().length ? 'Blended' : 'Undefined',
    desc: text.trim().length
      ? 'A color woven from what you wrote.'
      : 'Say a little more and Lumo will find a shade.',
  };
}

function hexToRgbBytes(hex) {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

/* ------------------------------ theming ------------------------------ */

function applyMoodColor(hex, { silent = false } = {}) {
  const root = document.documentElement.style;
  root.setProperty('--mood', hex);
  root.setProperty('--mood-soft', `${hex}55`);

  moodSwatch.style.backgroundColor = hex;

  if (!silent && state.connected && state.colorChar) {
    sendColorToDevice(hex);
  }
}

function pushHistoryChip(hex) {
  const empty = moodHistory.querySelector('.empty');
  if (empty) empty.remove();
  const chip = document.createElement('div');
  chip.className = 'chip';
  chip.style.backgroundColor = hex;
  chip.title = hex;
  moodHistory.prepend(chip);
  while (moodHistory.children.length > 24) {
    moodHistory.removeChild(moodHistory.lastChild);
  }
}

function loadHistory() {
  try {
    const saved = JSON.parse(localStorage.getItem('lumo-mood-history') || '[]');
    if (!saved.length) return;
    moodHistory.innerHTML = '';
    saved.forEach((hex) => pushHistoryChip(hex));
    const last = saved[0];
    applyMoodColor(last, { silent: true });
  } catch (_) { /* ignore corrupted storage */ }
}

function saveHistoryEntry(hex) {
  try {
    const saved = JSON.parse(localStorage.getItem('lumo-mood-history') || '[]');
    saved.unshift(hex);
    localStorage.setItem('lumo-mood-history', JSON.stringify(saved.slice(0, 24)));
  } catch (_) { /* private mode / storage disabled — history just won't persist */ }
}

/* --------------------------- mood orb panel --------------------------- */

function openMoodPanel() {
  moodPanel.classList.add('open');
  moodOrb.setAttribute('aria-expanded', 'true');
  setTimeout(() => moodInput.focus(), 200);
}

function closeMoodPanel() {
  moodPanel.classList.remove('open');
  moodOrb.setAttribute('aria-expanded', 'false');
}

moodOrb.addEventListener('click', () => {
  moodPanel.classList.contains('open') ? closeMoodPanel() : openMoodPanel();
});
moodPanelClose.addEventListener('click', closeMoodPanel);

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeMoodPanel();
});

document.addEventListener('click', (e) => {
  const wrap = document.querySelector('.mood-orb-wrap');
  if (moodPanel.classList.contains('open') && !wrap.contains(e.target)) closeMoodPanel();
});

moodSubmit.addEventListener('click', submitMood);
moodInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submitMood();
});

function submitMood() {
  const text = moodInput.value.trim();
  if (!text) {
    moodInput.focus();
    return;
  }

  const result = deriveMoodColor(text);
  state.currentColor = result;

  moodResultSwatch.style.backgroundColor = result.hex;
  moodResultEmotion.textContent = result.emotion;
  moodResultText.textContent = result.desc;
  moodResult.classList.remove('hidden');

  moodEmotion.textContent = result.emotion;
  moodDescription.textContent = result.desc;

  applyMoodColor(result.hex);
  pushHistoryChip(result.hex);
  saveHistoryEntry(result.hex);
}

/* --------------------------------- switches --------------------------------- */

heatSwitch.addEventListener('click', async () => {
  state.heatOn = !state.heatOn;
  heatSwitch.classList.toggle('is-on', state.heatOn);
  heatSwitch.setAttribute('aria-checked', String(state.heatOn));
  heatStateLabel.textContent = state.heatOn ? 'On · plate is warming' : 'Off · plate is cool';
  devicePlate.style.filter = state.heatOn ? 'brightness(1.15) saturate(1.1)' : 'none';

  if (state.connected && state.heatChar) {
    try {
      await state.heatChar.writeValue(new Uint8Array([state.heatOn ? 1 : 0]));
    } catch (err) {
      console.warn('Failed to write heat state to lamp:', err);
    }
  }
});

glowSwitch.addEventListener('click', async () => {
  state.glowOn = !state.glowOn;
  glowSwitch.classList.toggle('is-on', state.glowOn);
  glowSwitch.setAttribute('aria-checked', String(state.glowOn));
  lampStateLabel.textContent = state.glowOn ? 'On · showing current mood color' : 'Off';
  deviceGlow.style.opacity = state.glowOn ? '1' : '0.15';
  ambientGlow.style.opacity = state.glowOn ? '0.7' : '0.15';

  if (state.connected && state.glowChar) {
    try {
      await state.glowChar.writeValue(new Uint8Array([state.glowOn ? 1 : 0]));
    } catch (err) {
      console.warn('Failed to write glow state to lamp:', err);
    }
  }
});

/* ------------------------------ web bluetooth ------------------------------ */

const bleSupported = 'bluetooth' in navigator;

if (!bleSupported) {
  connectHint.textContent = 'Web Bluetooth isn’t available in this browser. Try Chrome or Edge on desktop or Android — the site still works in preview mode.';
}

connectBtn.addEventListener('click', connectLamp);
disconnectBtn.addEventListener('click', disconnectLamp);

async function connectLamp() {
  if (!bleSupported) return;

  connectBtn.disabled = true;
  connectBtn.textContent = 'Connecting…';

  try {
    const device = await navigator.bluetooth.requestDevice({
      filters: [{ namePrefix: 'Lumo' }],
      optionalServices: [LUMO_SERVICE_UUID],
    });

    state.bleDevice = device;
    device.addEventListener('gattserverdisconnected', onDeviceDisconnected);

    const server = await device.gatt.connect();
    const service = await server.getPrimaryService(LUMO_SERVICE_UUID);

    state.heatChar = await getCharSafe(service, HEAT_CHAR_UUID);
    state.colorChar = await getCharSafe(service, COLOR_CHAR_UUID);
    state.glowChar = await getCharSafe(service, GLOW_CHAR_UUID);

    state.connected = true;
    onConnected(device.name || 'Lumo lamp');

    // push current UI state to the freshly connected lamp
    if (state.colorChar) sendColorToDevice(state.currentColor.hex);
    if (state.heatChar) state.heatChar.writeValue(new Uint8Array([state.heatOn ? 1 : 0])).catch(() => {});
    if (state.glowChar) state.glowChar.writeValue(new Uint8Array([state.glowOn ? 1 : 0])).catch(() => {});

  } catch (err) {
    console.warn('Lumo connect cancelled or failed:', err);
    connectBtn.textContent = 'Connect lamp';
    connectBtn.disabled = false;
  }
}

async function getCharSafe(service, uuid) {
  try {
    return await service.getCharacteristic(uuid);
  } catch (err) {
    console.warn(`Characteristic ${uuid} not found on device — that control will stay in preview mode.`);
    return null;
  }
}

function sendColorToDevice(hex) {
  if (!state.colorChar) return;
  const bytes = new Uint8Array(hexToRgbBytes(hex));
  state.colorChar.writeValue(bytes).catch((err) => console.warn('Failed to write color to lamp:', err));
}

function onConnected(name) {
  statusDot.classList.add('connected');
  statusText.textContent = 'Connected';
  connectHint.textContent = 'Synced — Lumo will update live as you change mood or warmth.';
  connectBtn.classList.add('hidden');
  disconnectBtn.classList.remove('hidden');
  deviceMeta.classList.remove('hidden');
  deviceName.textContent = name;
  connectBtn.disabled = false;
  connectBtn.textContent = 'Connect lamp';
}

async function disconnectLamp() {
  if (state.bleDevice && state.bleDevice.gatt.connected) {
    state.bleDevice.gatt.disconnect();
  } else {
    onDeviceDisconnected();
  }
}

function onDeviceDisconnected() {
  state.connected = false;
  state.heatChar = null;
  state.colorChar = null;
  state.glowChar = null;

  statusDot.classList.remove('connected');
  statusText.textContent = 'Not connected';
  connectHint.textContent = bleSupported
    ? 'Works over Web Bluetooth in Chrome or Edge. Make sure your Lumo is powered on and nearby.'
    : 'Web Bluetooth isn’t available in this browser. Try Chrome or Edge on desktop or Android — the site still works in preview mode.';
  connectBtn.classList.remove('hidden');
  disconnectBtn.classList.add('hidden');
  deviceMeta.classList.add('hidden');
}

/* --------------------------------- init --------------------------------- */

loadHistory();
