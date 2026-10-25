const STORAGE_KEY = 'portfolio-sound';
const listeners = new Set<(enabled: boolean) => void>();

let context: AudioContext | null = null;
let noise: AudioBuffer | null = null;
let enabled = false;

try {
  enabled = localStorage.getItem(STORAGE_KEY) === 'on';
} catch {}

export const isSoundOn = () => enabled;

export function setSound(value: boolean) {
  enabled = value;
  try {
    localStorage.setItem(STORAGE_KEY, value ? 'on' : 'off');
  } catch {}
  if (value) ensureContext();
  listeners.forEach((listener) => listener(value));
}

export const onSoundChange = (listener: (enabled: boolean) => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

function ensureContext() {
  if (!context) {
    context = new AudioContext();
    noise = context.createBuffer(1, context.sampleRate * 1.5, context.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  if (context.state === 'suspended') context.resume();
  return context;
}

interface NoiseShape {
  duration: number;
  frequency: number;
  q?: number;
  sweepTo?: number;
  gain?: number;
  attack?: number;
  type?: BiquadFilterType;
}

function playNoise({ duration, frequency, q = 1, sweepTo, gain = 0.25, attack = 0.01, type = 'bandpass' }: NoiseShape) {
  if (!enabled) return;
  const audio = ensureContext();
  const source = audio.createBufferSource();
  source.buffer = noise;
  const filter = audio.createBiquadFilter();
  filter.type = type;
  filter.Q.value = q;
  const now = audio.currentTime;
  filter.frequency.setValueAtTime(frequency, now);
  if (sweepTo) filter.frequency.exponentialRampToValueAtTime(sweepTo, now + duration);
  const envelope = audio.createGain();
  envelope.gain.setValueAtTime(0, now);
  envelope.gain.linearRampToValueAtTime(gain, now + attack);
  envelope.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  source.connect(filter).connect(envelope).connect(audio.destination);
  source.start(now, Math.random() * 0.5);
  source.stop(now + duration + 0.05);
}

function playTone(frequency: number, duration: number, gain = 0.08, slideTo?: number) {
  if (!enabled) return;
  const audio = ensureContext();
  const oscillator = audio.createOscillator();
  oscillator.type = 'triangle';
  const now = audio.currentTime;
  oscillator.frequency.setValueAtTime(frequency, now);
  if (slideTo) oscillator.frequency.exponentialRampToValueAtTime(slideTo, now + duration);
  const envelope = audio.createGain();
  envelope.gain.setValueAtTime(gain, now);
  envelope.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  oscillator.connect(envelope).connect(audio.destination);
  oscillator.start(now);
  oscillator.stop(now + duration + 0.05);
}

export const sounds = {
  pageFlip: () => playNoise({ duration: 0.35, frequency: 2400, sweepTo: 700, q: 0.7, gain: 0.22, attack: 0.04 }),
  brush: () => playNoise({ duration: 0.45, frequency: 900, sweepTo: 3200, q: 1.4, gain: 0.12, attack: 0.08 }),
  stamp: () => {
    playNoise({ duration: 0.12, frequency: 180, q: 0.8, gain: 0.5, type: 'lowpass' });
    playTone(110, 0.15, 0.12, 60);
  },
  pop: () => playTone(520, 0.12, 0.07, 900),
  splat: () => {
    playNoise({ duration: 0.25, frequency: 300, sweepTo: 120, q: 0.6, gain: 0.4, type: 'lowpass' });
    playTone(160, 0.2, 0.08, 70);
  },
  bark: () => {
    playNoise({ duration: 0.07, frequency: 900, q: 1.2, gain: 0.18, type: 'bandpass' });
    playTone(640, 0.09, 0.08, 380);
  },
  paper: () => playNoise({ duration: 0.18, frequency: 3200, q: 0.5, gain: 0.08 }),
};
