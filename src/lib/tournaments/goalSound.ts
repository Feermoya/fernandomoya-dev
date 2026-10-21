/** Gol corto, sintetizado. No tapa el siguiente toque. */
let audio: AudioContext | null = null;
let release: GainNode | null = null;

export function playGoalSound(): void {
  if (typeof window === 'undefined') return;
  const Ctx = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return;
  if (!audio) audio = new Ctx();
  if (audio.state === 'suspended') void audio.resume();

  const now = audio.currentTime;
  if (release) {
    release.gain.cancelScheduledValues(now);
    release.gain.setValueAtTime(Math.max(release.gain.value, 0.0001), now);
    release.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);
  }

  const master = audio.createGain();
  release = master;
  master.connect(audio.destination);
  master.gain.setValueAtTime(0.0001, now);
  master.gain.exponentialRampToValueAtTime(0.09, now + 0.015);
  master.gain.exponentialRampToValueAtTime(0.0001, now + 0.32);

  const low = audio.createOscillator();
  low.type = 'triangle';
  low.frequency.setValueAtTime(196, now);
  low.frequency.exponentialRampToValueAtTime(262, now + 0.16);

  const high = audio.createOscillator();
  high.type = 'sine';
  high.frequency.setValueAtTime(523, now);
  high.frequency.exponentialRampToValueAtTime(784, now + 0.18);

  low.connect(master);
  high.connect(master);
  low.start(now);
  high.start(now);
  low.stop(now + 0.34);
  high.stop(now + 0.34);
}
