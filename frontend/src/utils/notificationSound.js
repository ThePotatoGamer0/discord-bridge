/** Discord-style notification sounds. Mention takes priority; no overlapping playback. */

const MESSAGE_SRC = '/sounds/message.mp3';
const MENTION_SRC = '/sounds/mention.mp3';
const COOLDOWN_MS = 600;

let currentAudio = null;
let lastPlayedAt = 0;
let ctx = null;

function stopCurrent() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }
}

function getContext() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  return ctx;
}

function playTone(freq, duration = 0.08) {
  try {
    const context = getContext();
    if (context.state === 'suspended') context.resume();
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.connect(gain);
    gain.connect(context.destination);
    osc.frequency.value = freq;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.15, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, context.currentTime + duration);
    osc.start(context.currentTime);
    osc.stop(context.currentTime + duration);
  } catch (_) { /* ignore */ }
}

function playSound(src, fallback) {
  stopCurrent();
  lastPlayedAt = Date.now();
  try {
    const audio = new Audio(src);
    currentAudio = audio;
    const fallbackFn = () => {
      audio.removeEventListener('error', onError);
      if (currentAudio === audio) currentAudio = null;
      fallback();
    };
    const onError = fallbackFn;
    audio.addEventListener('error', onError);
    audio.onended = () => { if (currentAudio === audio) currentAudio = null; };
    audio.play().catch(fallbackFn);
  } catch (_) {
    currentAudio = null;
    fallback();
  }
}

export function playMessageSound() {
  if (Date.now() - lastPlayedAt < COOLDOWN_MS) return;
  playSound(MESSAGE_SRC, () => playTone(800));
}

export function playMentionSound() {
  playSound(MENTION_SRC, () => {
    playTone(600, 0.06);
    setTimeout(() => playTone(900, 0.08), 80);
  });
}
