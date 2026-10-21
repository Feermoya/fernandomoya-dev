/** Celebración corta: papelitos y un grito de cancha. El siguiente gol corta el anterior. */
let audio: AudioContext | null = null;
let crowdBuffer: AudioBuffer | null = null;
let stopLive: ((at: number) => void) | null = null;

function ctx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctx = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  if (!audio) audio = new Ctx();
  if (audio.state === 'suspended') void audio.resume();
  return audio;
}

function noise(context: AudioContext): AudioBuffer {
  if (crowdBuffer && crowdBuffer.sampleRate === context.sampleRate) return crowdBuffer;
  const length = Math.floor(context.sampleRate * 1.1);
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1;
    last = last * 0.96 + white * 0.04;
    data[i] = white * 0.65 + last * 6;
  }
  crowdBuffer = buffer;
  return buffer;
}

function pop(context: AudioContext, master: GainNode, at: number, gain: number, ms: number) {
  const source = context.createBufferSource();
  source.buffer = noise(context);
  const filter = context.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = 2800;
  const amp = context.createGain();
  amp.gain.setValueAtTime(0.0001, at);
  amp.gain.exponentialRampToValueAtTime(gain, at + 0.008);
  amp.gain.exponentialRampToValueAtTime(0.0001, at + ms);
  source.connect(filter);
  filter.connect(amp);
  amp.connect(master);
  source.start(at);
  source.stop(at + ms + 0.02);
}

export function playGoalSound(): void {
  const context = ctx();
  if (!context) return;
  const now = context.currentTime;
  stopLive?.(now);

  const master = context.createGain();
  master.gain.setValueAtTime(0.9, now);
  master.connect(context.destination);

  const stops: Array<() => void> = [];
  const track = (node: AudioNode & { stop: (when?: number) => void }) => {
    stops.push(() => {
      try {
        node.stop();
      } catch {
        /* ya terminó */
      }
    });
  };

  pop(context, master, now, 0.55, 0.07);
  pop(context, master, now + 0.05, 0.28, 0.05);
  pop(context, master, now + 0.1, 0.18, 0.04);
  pop(context, master, now + 0.16, 0.12, 0.04);

  const hornGain = context.createGain();
  hornGain.gain.setValueAtTime(0.0001, now);
  hornGain.gain.exponentialRampToValueAtTime(0.16, now + 0.03);
  hornGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);
  hornGain.connect(master);
  for (const freq of [220, 277, 330]) {
    const horn = context.createOscillator();
    horn.type = 'sawtooth';
    horn.frequency.setValueAtTime(freq, now);
    horn.frequency.exponentialRampToValueAtTime(freq * 1.12, now + 0.18);
    const tone = context.createGain();
    tone.gain.value = freq === 220 ? 0.7 : 0.35;
    horn.connect(tone);
    tone.connect(hornGain);
    horn.start(now);
    horn.stop(now + 0.45);
    track(horn);
  }

  const roar = context.createBufferSource();
  roar.buffer = noise(context);
  const air = context.createBiquadFilter();
  air.type = 'bandpass';
  air.frequency.setValueAtTime(520, now);
  air.frequency.exponentialRampToValueAtTime(980, now + 0.2);
  air.Q.value = 0.7;
  const roarGain = context.createGain();
  roarGain.gain.setValueAtTime(0.0001, now + 0.02);
  roarGain.gain.exponentialRampToValueAtTime(0.42, now + 0.12);
  roarGain.gain.setValueAtTime(0.36, now + 0.34);
  roarGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);
  roar.connect(air);
  air.connect(roarGain);
  roarGain.connect(master);
  roar.start(now);
  roar.stop(now + 0.95);
  track(roar);

  stopLive = (at) => {
    master.gain.cancelScheduledValues(at);
    master.gain.setValueAtTime(Math.max(master.gain.value, 0.0001), at);
    master.gain.exponentialRampToValueAtTime(0.0001, at + 0.05);
    window.setTimeout(() => stops.forEach((stop) => stop()), 80);
    stopLive = null;
  };
}
