/** Discord-style notification sounds. Uses /sounds/*.mp3 files (from discord-sounds). */

const MESSAGE_SRC = '/sounds/message.mp3';
const MENTION_SRC = '/sounds/mention.mp3';

let ctx = null;

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
  try {
    const audio = new Audio(src);
    const fallbackFn = () => {
      audio.removeEventListener('error', onError);
      fallback();
    };
    const onError = fallbackFn;
    audio.addEventListener('error', onError);
    audio.play().catch(fallbackFn);
  } catch (_) {
    fallback();
  }
}

export function playMessageSound() {
  playSound(MESSAGE_SRC, () => playTone(800));
}

export function playMentionSound() {
  playSound(MENTION_SRC, () => {
    playTone(600, 0.06);
    setTimeout(() => playTone(900, 0.08), 80);
  });
}
