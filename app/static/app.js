let allVoices = {}; // { locale: [ {name, gender, locale, locale_name, friendly_name} ] }
let localeList = []; // sorted array of locale codes
let selectedLocale = null;
let selectedVoice = null;

const VOICES_CACHE_KEY = 'voice-tool.voices.v1';

const textArea = document.getElementById('text');
const charcount = document.getElementById('charcount');
const generateBtn = document.getElementById('generateBtn');
const statusEl = document.getElementById('status');
const playerWrap = document.getElementById('playerWrap');
const player = document.getElementById('player');
const durationEl = document.getElementById('duration');
const downloadBtn = document.getElementById('downloadBtn');

const rateInput = document.getElementById('rate');
const pitchInput = document.getElementById('pitch');
const rateVal = document.getElementById('rateVal');
const pitchVal = document.getElementById('pitchVal');

// --- Custom dropdown elements ---
const languageTrigger = document.getElementById('languageTrigger');
const languageValue = document.getElementById('languageValue');
const languageList = document.getElementById('languageList');
const voiceTrigger = document.getElementById('voiceTrigger');
const voiceValue = document.getElementById('voiceValue');
const voiceList = document.getElementById('voiceList');

function setStatus(msg, type) {
  statusEl.textContent = msg || '';
  statusEl.className = 'status' + (type ? ' ' + type : '');
}

// Shrinks a dropdown's font-size in small steps until its text fits on one
// line inside the box, so long language/voice names never overflow.
function fitDropdownText(el) {
  el.style.fontSize = '';
  const computedSize = parseFloat(getComputedStyle(el).fontSize);
  let size = computedSize;
  const minSize = 11;
  requestAnimationFrame(() => {
    let guard = 0;
    while (el.scrollWidth > el.clientWidth && size > minSize && guard < 30) {
      size -= 0.5;
      el.style.fontSize = size + 'px';
      guard++;
    }
  });
}

function refitAllDropdowns() {
  fitDropdownText(languageValue);
  fitDropdownText(voiceValue);
}

window.addEventListener('resize', refitAllDropdowns);

function closeAllDropdowns() {
  languageList.classList.remove('open');
  languageTrigger.classList.remove('open');
  languageTrigger.setAttribute('aria-expanded', 'false');
  voiceList.classList.remove('open');
  voiceTrigger.classList.remove('open');
  voiceTrigger.setAttribute('aria-expanded', 'false');
}

function toggleDropdown(trigger, list) {
  const isOpen = list.classList.contains('open');
  closeAllDropdowns();
  if (!isOpen) {
    list.classList.add('open');
    trigger.classList.add('open');
    trigger.setAttribute('aria-expanded', 'true');
  }
}

languageTrigger.addEventListener('click', (e) => {
  e.stopPropagation();
  toggleDropdown(languageTrigger, languageList);
});

voiceTrigger.addEventListener('click', (e) => {
  e.stopPropagation();
  toggleDropdown(voiceTrigger, voiceList);
});

document.addEventListener('click', () => closeAllDropdowns());

function applyVoices(data) {
  allVoices = data;
  localeList = Object.keys(allVoices);
  populateLanguages();
}

async function loadVoices() {
  // Render instantly from the local cache (if any), then refresh in the
  // background so the very first paint is never blocked by the network.
  let hadCache = false;
  try {
    const cached = localStorage.getItem(VOICES_CACHE_KEY);
    if (cached) {
      applyVoices(JSON.parse(cached));
      hadCache = true;
    }
  } catch (_) { /* ignore bad cache */ }

  if (!hadCache) setStatus('Loading voices...', '');

  try {
    const res = await fetch('/api/voices');
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to load voices');
    if (!hadCache) applyVoices(data.voices);
    try { localStorage.setItem(VOICES_CACHE_KEY, JSON.stringify(data.voices)); } catch (_) {}
    setStatus('');
  } catch (err) {
    if (!hadCache) setStatus('Could not load voice list: ' + err.message, 'error');
  }
}

function populateLanguages() {
  languageList.innerHTML = '';
  localeList.forEach(locale => {
    const label = allVoices[locale][0].locale_name || locale;
    const li = document.createElement('li');
    li.textContent = label;
    li.dataset.value = locale;
    li.setAttribute('role', 'option');
    li.addEventListener('click', (e) => {
      e.stopPropagation();
      selectedLocale = locale;
      languageValue.textContent = label;
      fitDropdownText(languageValue);
      highlightActive(languageList, locale);
      closeAllDropdowns();
      populateVoices();
    });
    languageList.appendChild(li);
  });

  // Default to English (US) if present
  const preferred = localeList.find(l => l === 'en-US') || localeList[0];
  selectedLocale = preferred;
  languageValue.textContent = allVoices[preferred][0].locale_name || preferred;
  fitDropdownText(languageValue);
  highlightActive(languageList, preferred);
  populateVoices();
}

function populateVoices() {
  const voices = allVoices[selectedLocale] || [];
  voiceList.innerHTML = '';
  voices.forEach(v => {
    const label = `${v.friendly_name} — ${v.gender}`;
    const li = document.createElement('li');
    li.textContent = label;
    li.dataset.value = v.name;
    li.setAttribute('role', 'option');
    li.addEventListener('click', (e) => {
      e.stopPropagation();
      selectedVoice = v.name;
      voiceValue.textContent = label;
      fitDropdownText(voiceValue);
      highlightActive(voiceList, v.name);
      closeAllDropdowns();
    });
    voiceList.appendChild(li);
  });

  if (voices.length > 0) {
    selectedVoice = voices[0].name;
    voiceValue.textContent = `${voices[0].friendly_name} — ${voices[0].gender}`;
    fitDropdownText(voiceValue);
    highlightActive(voiceList, voices[0].name);
  } else {
    selectedVoice = null;
    voiceValue.textContent = 'No voices available';
  }
}

function highlightActive(listEl, value) {
  listEl.querySelectorAll('li').forEach(li => {
    li.classList.toggle('active', li.dataset.value === value);
  });
}

textArea.addEventListener('input', () => {
  charcount.textContent = `${textArea.value.length} characters`;
});

rateInput.addEventListener('input', () => {
  rateVal.textContent = `${rateInput.value}%`;
});
pitchInput.addEventListener('input', () => {
  pitchVal.textContent = `${pitchInput.value}Hz`;
});

function formatDuration(seconds) {
  const s = Math.round(seconds);
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
}

generateBtn.addEventListener('click', async () => {
  const text = textArea.value.trim();
  if (!text) {
    setStatus('Please enter some text first.', 'error');
    return;
  }
  const MAX_CHARACTERS = 200000;
  if (text.length > MAX_CHARACTERS) {
    setStatus(`Maximum character limit is 200,000 characters. Your text has ${text.length.toLocaleString()} characters.`, 'error');
    return;
  }
  if (!selectedVoice) {
    setStatus('Please choose a voice.', 'error');
    return;
  }

  generateBtn.disabled = true;
  setStatus('Generating voice, please wait...', '');
  playerWrap.classList.add('hidden');
  durationEl.textContent = '';

  try {
    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        voice: selectedVoice,
        rate: Number(rateInput.value),
        pitch: Number(pitchInput.value),
        volume: 0,
      }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || data.detail || 'Generation failed');

    const url = data.audio_url + '?t=' + Date.now();
    player.src = url;
    downloadBtn.href = data.audio_url;
    downloadBtn.setAttribute('download', 'voice.mp3');

    player.onloadedmetadata = () => {
      if (isFinite(player.duration)) {
        durationEl.textContent = formatDuration(player.duration);
      }
    };

    playerWrap.classList.remove('hidden');
    downloadBtn.classList.remove('hidden');
    setStatus('Voice generated successfully.', 'success');
    player.play().catch(() => {});
  } catch (err) {
    setStatus('Error: ' + err.message, 'error');
  } finally {
    generateBtn.disabled = false;
  }
});

loadVoices();
