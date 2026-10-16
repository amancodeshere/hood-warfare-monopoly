/**
 * Layered Foley Web Audio Synthesizer
 * Synthesizes physical, acoustic tabletop qualities without external audio assets.
 */

export const REACTION_EMOJIS = ["🔥", "💀", "🎯", "💰", "👑"];

let globalAudioCtx = null;
let audioMuted = false;

export function getAudioContext() {
  if (!globalAudioCtx && typeof window !== "undefined") {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) {
      globalAudioCtx = new AudioCtx();
    }
  }
  return globalAudioCtx;
}

export function setAudioMuted(muted) {
  audioMuted = Boolean(muted);
}

export function isAudioMuted() {
  return audioMuted;
}

/**
 * Multi-impulse noise bursts with decaying pitch simulating wooden dice tumbling in a cup and double-bouncing.
 */
export function playDice(ctx, now = ctx.currentTime) {
  // 5 discrete impacts: 3 tumbling within cup, 1 hard tabletop bounce, 1 settling double-bounce
  const impulses = [
    { delay: 0.000, pitch: 740, endPitch: 580, duration: 0.035, gain: 0.16 },
    { delay: 0.065, pitch: 620, endPitch: 480, duration: 0.030, gain: 0.20 },
    { delay: 0.140, pitch: 510, endPitch: 390, duration: 0.035, gain: 0.24 },
    { delay: 0.230, pitch: 420, endPitch: 310, duration: 0.040, gain: 0.18 }, // Tabletop impact
    { delay: 0.315, pitch: 340, endPitch: 240, duration: 0.030, gain: 0.10 }, // Double-bounce settle
  ];

  const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * 0.05));
  const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  impulses.forEach(({ delay, pitch, endPitch, duration, gain: peakGain }) => {
    const t = now + delay;

    // A. Filtered noise burst simulating wooden edge friction & impact
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = "bandpass";
    noiseFilter.frequency.setValueAtTime(pitch * 1.5, t);
    noiseFilter.frequency.exponentialRampToValueAtTime(
      Math.max(100, endPitch * 1.2),
      t + duration,
    );
    noiseFilter.Q.setValueAtTime(4.0, t);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(peakGain * 0.7, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, t + duration);

    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(ctx.destination);

    noiseSource.start(t);
    noiseSource.stop(t + duration);

    // B. Decaying pitch resonant body tone (wooden cup and hollow wooden dice cavity)
    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(pitch, t);
    osc.frequency.exponentialRampToValueAtTime(
      Math.max(40, endPitch),
      t + duration,
    );

    const oscGain = ctx.createGain();
    oscGain.gain.setValueAtTime(peakGain * 0.8, t);
    oscGain.gain.exponentialRampToValueAtTime(0.0001, t + duration);

    osc.connect(oscGain);
    oscGain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + duration);
  });
}

/**
 * Low-pass filtered 60Hz sub-thud giving physical weight to token landing.
 */
export function playLand(ctx, now = ctx.currentTime) {
  const t = now;
  const duration = 0.22;

  // 1. Low-pass filtered 60Hz sub-thud
  const subOsc = ctx.createOscillator();
  subOsc.type = "sine";
  subOsc.frequency.setValueAtTime(85, t);
  subOsc.frequency.exponentialRampToValueAtTime(60, t + 0.04);
  subOsc.frequency.setValueAtTime(60, t + 0.04);

  const subFilter = ctx.createBiquadFilter();
  subFilter.type = "lowpass";
  subFilter.frequency.setValueAtTime(110, t);
  subFilter.Q.setValueAtTime(1.0, t);

  const subGain = ctx.createGain();
  subGain.gain.setValueAtTime(0.001, t);
  subGain.gain.linearRampToValueAtTime(0.38, t + 0.006);
  subGain.gain.exponentialRampToValueAtTime(0.0001, t + duration);

  subOsc.connect(subFilter);
  subFilter.connect(subGain);
  subGain.connect(ctx.destination);

  subOsc.start(t);
  subOsc.stop(t + duration);

  // 2. Physical impact transient (felt/board contact click)
  const bufSize = Math.max(1, Math.floor(ctx.sampleRate * 0.025));
  const clickBuffer = ctx.createBuffer(1, bufSize, ctx.sampleRate);
  const clickData = clickBuffer.getChannelData(0);
  for (let i = 0; i < bufSize; i++) {
    clickData[i] = Math.random() * 2 - 1;
  }
  const clickSource = ctx.createBufferSource();
  clickSource.buffer = clickBuffer;

  const clickFilter = ctx.createBiquadFilter();
  clickFilter.type = "lowpass";
  clickFilter.frequency.setValueAtTime(240, t);

  const clickGain = ctx.createGain();
  clickGain.gain.setValueAtTime(0.18, t);
  clickGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.035);

  clickSource.connect(clickFilter);
  clickFilter.connect(clickGain);
  clickGain.connect(ctx.destination);

  clickSource.start(t);
  clickSource.stop(t + 0.035);
}

/**
 * Dual-harmonic bell strike (880Hz + 1760Hz with exponential gain decay) mimicking a metallic cash register chime.
 */
export function playCash(ctx, now = ctx.currentTime) {
  const t = now;
  const duration = 0.85;

  // 880Hz fundamental bell strike
  const osc1 = ctx.createOscillator();
  osc1.type = "sine";
  osc1.frequency.setValueAtTime(880, t);

  const gain1 = ctx.createGain();
  gain1.gain.setValueAtTime(0.20, t);
  gain1.gain.exponentialRampToValueAtTime(0.0001, t + duration);

  osc1.connect(gain1);
  gain1.connect(ctx.destination);

  osc1.start(t);
  osc1.stop(t + duration);

  // 1760Hz second harmonic chime
  const osc2 = ctx.createOscillator();
  osc2.type = "sine";
  osc2.frequency.setValueAtTime(1760, t);

  const gain2 = ctx.createGain();
  gain2.gain.setValueAtTime(0.15, t);
  gain2.gain.exponentialRampToValueAtTime(0.0001, t + 0.65);

  osc2.connect(gain2);
  gain2.connect(ctx.destination);

  osc2.start(t);
  osc2.stop(t + 0.65);

  // High metallic shimmer (subtle 3rd harmonic for register bell strike)
  const osc3 = ctx.createOscillator();
  osc3.type = "sine";
  osc3.frequency.setValueAtTime(2640, t);

  const gain3 = ctx.createGain();
  gain3.gain.setValueAtTime(0.04, t);
  gain3.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);

  osc3.connect(gain3);
  gain3.connect(ctx.destination);

  osc3.start(t);
  osc3.stop(t + 0.35);
}

/**
 * High-impact noise burst with tight bandpass + 40Hz sub-kick and reverberation tail in src/ArenaDuel.jsx.
 */
export function playGunshot(ctx, now = ctx.currentTime) {
  const t = now;

  // 1. High-impact noise burst with tight bandpass
  const noiseSize = Math.max(1, Math.floor(ctx.sampleRate * 0.12));
  const noiseBuf = ctx.createBuffer(1, noiseSize, ctx.sampleRate);
  const noiseData = noiseBuf.getChannelData(0);
  for (let i = 0; i < noiseSize; i++) {
    noiseData[i] = Math.random() * 2 - 1;
  }
  const snapSource = ctx.createBufferSource();
  snapSource.buffer = noiseBuf;

  const bandpass = ctx.createBiquadFilter();
  bandpass.type = "bandpass";
  bandpass.frequency.setValueAtTime(1400, t);
  bandpass.frequency.exponentialRampToValueAtTime(600, t + 0.10);
  bandpass.Q.setValueAtTime(3.0, t); // tight bandpass

  const snapGain = ctx.createGain();
  snapGain.gain.setValueAtTime(0.48, t);
  snapGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.10);

  snapSource.connect(bandpass);
  bandpass.connect(snapGain);
  snapGain.connect(ctx.destination);

  snapSource.start(t);
  snapSource.stop(t + 0.10);

  // 2. 40Hz sub-kick (heavy shockwave)
  const subKick = ctx.createOscillator();
  subKick.type = "sine";
  subKick.frequency.setValueAtTime(140, t);
  subKick.frequency.exponentialRampToValueAtTime(40, t + 0.06);
  subKick.frequency.setValueAtTime(40, t + 0.06);

  const kickGain = ctx.createGain();
  kickGain.gain.setValueAtTime(0.55, t);
  kickGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);

  subKick.connect(kickGain);
  kickGain.connect(ctx.destination);

  subKick.start(t);
  subKick.stop(t + 0.22);

  // 3. Reverberation tail
  const revSize = Math.max(1, Math.floor(ctx.sampleRate * 0.7));
  const revBuf = ctx.createBuffer(1, revSize, ctx.sampleRate);
  const revData = revBuf.getChannelData(0);
  for (let i = 0; i < revSize; i++) {
    revData[i] = Math.random() * 2 - 1;
  }
  const revSource = ctx.createBufferSource();
  revSource.buffer = revBuf;

  const revFilter = ctx.createBiquadFilter();
  revFilter.type = "lowpass";
  revFilter.frequency.setValueAtTime(500, t);
  revFilter.frequency.exponentialRampToValueAtTime(250, t + 0.65);

  const revGain = ctx.createGain();
  revGain.gain.setValueAtTime(0.001, t);
  revGain.gain.linearRampToValueAtTime(0.18, t + 0.025);
  revGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.65);

  revSource.connect(revFilter);
  revFilter.connect(revGain);
  revGain.connect(ctx.destination);

  revSource.start(t);
  revSource.stop(t + 0.65);
}

/**
 * Punchy physical kick impact for arena melee.
 */
export function playKick(ctx, now = ctx.currentTime) {
  const t = now;
  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(120, t);
  osc.frequency.exponentialRampToValueAtTime(45, t + 0.12);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.35, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.14);
}

/**
 * Master procedural Foley Web Audio player.
 */
export function play(type, options = {}) {
  if (audioMuted && !options.force) return;
  const ctx = options.ctx || getAudioContext();
  if (!ctx) return;
  if (ctx.state === "suspended") {
    ctx.resume().catch(() => {});
  }
  const now = options.now ?? ctx.currentTime;
  try {
    switch (type) {
      case "dice":
        playDice(ctx, now);
        break;
      case "land":
        playLand(ctx, now);
        break;
      case "cash":
        playCash(ctx, now);
        break;
      case "gunshot":
        playGunshot(ctx, now);
        break;
      case "kick":
        playKick(ctx, now);
        break;
      default:
        break;
    }
  } catch {
    /* Audio is optional */
  }
}
