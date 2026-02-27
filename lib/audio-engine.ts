/**
 * Procedural Ambient Audio Engine for Infinite Realms
 *
 * Generates rich, layered ambient soundscapes using the Web Audio API.
 * Each scene preset combines multiple synthesis layers:
 *   - Pads:   Detuned oscillators for harmonic drones
 *   - Arps:   Sequenced notes from musical scales
 *   - Noise:  Filtered noise for environmental texture (wind, rain, fire)
 *   - Pulses: Periodic bursts for rhythmic elements (drips, crickets, percussion)
 *
 * No external audio files or libraries required.
 */

// ─── Musical helpers ──────────────────────────────────────────────────────────

/** Convert a MIDI note number to frequency (A4 = 69 = 440 Hz) */
function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

// Common scales as MIDI offsets from root
const SCALES = {
  minor:       [0, 2, 3, 5, 7, 8, 10],
  major:       [0, 2, 4, 5, 7, 9, 11],
  minorPent:   [0, 3, 5, 7, 10],
  majorPent:   [0, 2, 4, 7, 9],
  phrygian:    [0, 1, 3, 5, 7, 8, 10],    // desert/eastern feel
  wholeTone:   [0, 2, 4, 6, 8, 10],       // dreamy/mysterious
  chromatic:   [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
} as const;

// ─── Layer configuration types ────────────────────────────────────────────────

interface PadConfig {
  /** Base MIDI note (e.g. 48 = C3) */
  note: number;
  /** Additional intervals above root (semitones) */
  intervals: number[];
  /** Detune spread in cents per oscillator */
  detune: number;
  /** Oscillator waveform */
  wave: OscillatorType;
  /** Low-pass filter cutoff Hz */
  filterCutoff: number;
  /** Filter Q */
  filterQ: number;
  /** Volume 0–1 */
  gain: number;
  /** Attack time in seconds */
  attack: number;
  /** Optional LFO rate on filter cutoff (Hz, 0 = none) */
  lfoRate?: number;
  /** LFO depth as fraction of filter cutoff */
  lfoDepth?: number;
}

interface ArpConfig {
  /** Root MIDI note */
  root: number;
  /** Scale to pick notes from */
  scale: readonly number[];
  /** Octave range (notes chosen from root to root + range*12) */
  octaveRange: number;
  /** Milliseconds between notes */
  interval: number;
  /** Random variation on interval (±ms) */
  intervalJitter: number;
  /** Note duration in seconds */
  noteDuration: number;
  /** Oscillator wave type */
  wave: OscillatorType;
  /** Volume 0–1 */
  gain: number;
  /** Filter cutoff for each note */
  filterCutoff: number;
}

interface NoiseConfig {
  /** Filter type for shaping */
  filterType: BiquadFilterType;
  /** Center/cutoff frequency */
  filterFreq: number;
  /** Filter Q */
  filterQ: number;
  /** Volume 0–1 */
  gain: number;
  /** Optional LFO on gain for pulsing (Hz, 0 = steady) */
  lfoRate?: number;
  /** LFO depth (0–1, fraction of gain) */
  lfoDepth?: number;
  /** If true, use brown noise (smoother) instead of white */
  brown?: boolean;
}

interface PulseConfig {
  /** Filter frequency for the noise burst */
  filterFreq: number;
  /** Filter type */
  filterType: BiquadFilterType;
  /** Filter Q */
  filterQ: number;
  /** Pulse duration in seconds */
  duration: number;
  /** Average interval between pulses (ms) */
  interval: number;
  /** Random variation on interval (±ms) */
  intervalJitter: number;
  /** Volume 0–1 */
  gain: number;
  /** Optional pitch (use oscillator instead of noise) */
  pitch?: number;
  /** Oscillator type if pitched */
  wave?: OscillatorType;
}

interface ScenePreset {
  label: string;
  pads?: PadConfig[];
  arps?: ArpConfig[];
  noises?: NoiseConfig[];
  pulses?: PulseConfig[];
}

// ─── Scene Presets ────────────────────────────────────────────────────────────

export const SCENE_PRESETS: Record<string, ScenePreset> = {
  default: {
    label: 'Calm Winds',
    pads: [{
      note: 48, intervals: [7, 12], detune: 5,
      wave: 'triangle', filterCutoff: 800, filterQ: 0.7,
      gain: 0.12, attack: 4, lfoRate: 0.06, lfoDepth: 0.3,
    }],
    noises: [{
      filterType: 'lowpass', filterFreq: 500, filterQ: 0.5,
      gain: 0.04, brown: true, lfoRate: 0.08, lfoDepth: 0.6,
    }],
  },

  tavern: {
    label: 'Tavern',
    pads: [{
      note: 48, intervals: [4, 7, 12], detune: 6,
      wave: 'triangle', filterCutoff: 1200, filterQ: 0.5,
      gain: 0.1, attack: 3,
    }],
    arps: [{
      root: 60, scale: SCALES.majorPent, octaveRange: 2,
      interval: 600, intervalJitter: 200,
      noteDuration: 0.3, wave: 'triangle',
      gain: 0.06, filterCutoff: 2000,
    }],
    noises: [{
      filterType: 'bandpass', filterFreq: 600, filterQ: 0.4,
      gain: 0.03, brown: true,
    }],
  },

  dungeon: {
    label: 'Dungeon',
    pads: [{
      note: 36, intervals: [7, 12], detune: 8,
      wave: 'sine', filterCutoff: 400, filterQ: 1.5,
      gain: 0.14, attack: 5, lfoRate: 0.04, lfoDepth: 0.4,
    }],
    arps: [{
      root: 48, scale: SCALES.minor, octaveRange: 1,
      interval: 3000, intervalJitter: 2000,
      noteDuration: 1.2, wave: 'sine',
      gain: 0.03, filterCutoff: 800,
    }],
    pulses: [{
      filterFreq: 3000, filterType: 'bandpass', filterQ: 5,
      duration: 0.05, interval: 4000, intervalJitter: 3000,
      gain: 0.06,
    }],
  },

  cave: {
    label: 'Cave',
    pads: [{
      note: 31, intervals: [12, 19], detune: 10,
      wave: 'sine', filterCutoff: 300, filterQ: 2,
      gain: 0.15, attack: 6, lfoRate: 0.03, lfoDepth: 0.3,
    }],
    pulses: [
      {
        filterFreq: 4000, filterType: 'bandpass', filterQ: 8,
        duration: 0.03, interval: 2500, intervalJitter: 2000,
        gain: 0.08,
      },
      {
        filterFreq: 6000, filterType: 'bandpass', filterQ: 10,
        duration: 0.02, interval: 5000, intervalJitter: 4000,
        gain: 0.05,
      },
    ],
  },

  forest: {
    label: 'Forest',
    pads: [{
      note: 48, intervals: [4, 7, 11], detune: 4,
      wave: 'triangle', filterCutoff: 1000, filterQ: 0.5,
      gain: 0.08, attack: 4, lfoRate: 0.07, lfoDepth: 0.2,
    }],
    arps: [{
      root: 72, scale: SCALES.majorPent, octaveRange: 2,
      interval: 1500, intervalJitter: 1000,
      noteDuration: 0.15, wave: 'sine',
      gain: 0.04, filterCutoff: 4000,
    }],
    noises: [{
      filterType: 'bandpass', filterFreq: 2000, filterQ: 0.3,
      gain: 0.025, lfoRate: 0.15, lfoDepth: 0.5,
    }],
    pulses: [{
      filterFreq: 5000, filterType: 'highpass', filterQ: 2,
      duration: 0.08, interval: 3000, intervalJitter: 2500,
      gain: 0.03,
    }],
  },

  ocean: {
    label: 'Ocean',
    pads: [{
      note: 43, intervals: [7, 12, 16], detune: 7,
      wave: 'sine', filterCutoff: 600, filterQ: 0.8,
      gain: 0.12, attack: 5, lfoRate: 0.05, lfoDepth: 0.4,
    }],
    noises: [
      {
        filterType: 'lowpass', filterFreq: 400, filterQ: 1,
        gain: 0.08, brown: true, lfoRate: 0.07, lfoDepth: 0.7,
      },
      {
        filterType: 'highpass', filterFreq: 3000, filterQ: 0.3,
        gain: 0.015, lfoRate: 0.07, lfoDepth: 0.8,
      },
    ],
  },

  desert: {
    label: 'Desert',
    pads: [{
      note: 57, intervals: [5, 12], detune: 3,
      wave: 'sine', filterCutoff: 1500, filterQ: 1,
      gain: 0.07, attack: 5, lfoRate: 0.04, lfoDepth: 0.2,
    }],
    arps: [{
      root: 60, scale: SCALES.phrygian, octaveRange: 2,
      interval: 2500, intervalJitter: 1500,
      noteDuration: 0.8, wave: 'triangle',
      gain: 0.035, filterCutoff: 1800,
    }],
    noises: [{
      filterType: 'highpass', filterFreq: 1500, filterQ: 0.3,
      gain: 0.025, lfoRate: 0.1, lfoDepth: 0.6,
    }],
  },

  mountain: {
    label: 'Mountain',
    pads: [
      {
        note: 36, intervals: [7, 12, 19], detune: 6,
        wave: 'triangle', filterCutoff: 700, filterQ: 0.6,
        gain: 0.1, attack: 5, lfoRate: 0.04, lfoDepth: 0.3,
      },
    ],
    noises: [{
      filterType: 'lowpass', filterFreq: 600, filterQ: 0.5,
      gain: 0.06, brown: true, lfoRate: 0.06, lfoDepth: 0.7,
    }],
  },

  swamp: {
    label: 'Swamp',
    pads: [{
      note: 36, intervals: [3, 6, 10], detune: 10,
      wave: 'sine', filterCutoff: 350, filterQ: 1.8,
      gain: 0.12, attack: 4, lfoRate: 0.08, lfoDepth: 0.4,
    }],
    pulses: [
      {
        filterFreq: 300, filterType: 'lowpass', filterQ: 3,
        duration: 0.1, interval: 1500, intervalJitter: 1000,
        gain: 0.05,
      },
      {
        filterFreq: 4000, filterType: 'bandpass', filterQ: 6,
        duration: 0.04, interval: 800, intervalJitter: 400,
        gain: 0.03,
      },
    ],
    noises: [{
      filterType: 'lowpass', filterFreq: 250, filterQ: 2,
      gain: 0.04, brown: true,
    }],
  },

  snow: {
    label: 'Blizzard',
    pads: [{
      note: 60, intervals: [7, 12, 16], detune: 4,
      wave: 'sine', filterCutoff: 2000, filterQ: 0.5,
      gain: 0.08, attack: 5, lfoRate: 0.05, lfoDepth: 0.2,
    }],
    arps: [{
      root: 72, scale: SCALES.majorPent, octaveRange: 2,
      interval: 4000, intervalJitter: 3000,
      noteDuration: 0.6, wave: 'sine',
      gain: 0.025, filterCutoff: 3000,
    }],
    noises: [{
      filterType: 'highpass', filterFreq: 2500, filterQ: 0.3,
      gain: 0.05, lfoRate: 0.12, lfoDepth: 0.5,
    }],
  },

  fire: {
    label: 'Inferno',
    pads: [{
      note: 41, intervals: [5, 12], detune: 8,
      wave: 'triangle', filterCutoff: 500, filterQ: 1,
      gain: 0.1, attack: 3, lfoRate: 0.15, lfoDepth: 0.3,
    }],
    noises: [{
      filterType: 'bandpass', filterFreq: 1200, filterQ: 1.5,
      gain: 0.06, lfoRate: 4, lfoDepth: 0.8,
    }],
    pulses: [{
      filterFreq: 2000, filterType: 'bandpass', filterQ: 2,
      duration: 0.06, interval: 200, intervalJitter: 150,
      gain: 0.04,
    }],
  },

  sky: {
    label: 'Open Sky',
    pads: [{
      note: 55, intervals: [7, 12, 16, 24], detune: 3,
      wave: 'sine', filterCutoff: 1800, filterQ: 0.4,
      gain: 0.08, attack: 6, lfoRate: 0.03, lfoDepth: 0.2,
    }],
    arps: [{
      root: 67, scale: SCALES.majorPent, octaveRange: 2,
      interval: 3500, intervalJitter: 2000,
      noteDuration: 0.5, wave: 'sine',
      gain: 0.025, filterCutoff: 3000,
    }],
    noises: [{
      filterType: 'bandpass', filterFreq: 800, filterQ: 0.3,
      gain: 0.02, brown: true, lfoRate: 0.06, lfoDepth: 0.5,
    }],
  },

  city: {
    label: 'City',
    pads: [{
      note: 43, intervals: [7, 10, 14], detune: 8,
      wave: 'triangle', filterCutoff: 500, filterQ: 0.8,
      gain: 0.08, attack: 3,
    }],
    noises: [{
      filterType: 'lowpass', filterFreq: 400, filterQ: 0.5,
      gain: 0.04, brown: true,
    }],
    pulses: [{
      filterFreq: 1000, filterType: 'bandpass', filterQ: 1,
      duration: 0.08, interval: 1200, intervalJitter: 800,
      gain: 0.025,
    }],
  },

  night: {
    label: 'Night',
    pads: [{
      note: 36, intervals: [3, 7, 12], detune: 6,
      wave: 'sine', filterCutoff: 300, filterQ: 1.5,
      gain: 0.1, attack: 5, lfoRate: 0.04, lfoDepth: 0.3,
    }],
    pulses: [
      {
        // Crickets: high-pitched rapid chirps
        filterFreq: 5000, filterType: 'bandpass', filterQ: 8,
        duration: 0.03, interval: 500, intervalJitter: 300,
        gain: 0.02,
      },
      {
        // Owl-like tones
        pitch: 523, wave: 'sine',
        filterFreq: 600, filterType: 'lowpass', filterQ: 1,
        duration: 0.8, interval: 8000, intervalJitter: 6000,
        gain: 0.02,
      },
    ],
  },

  dawn: {
    label: 'Dawn',
    pads: [{
      note: 48, intervals: [4, 7, 12, 16], detune: 4,
      wave: 'triangle', filterCutoff: 1200, filterQ: 0.4,
      gain: 0.09, attack: 5, lfoRate: 0.05, lfoDepth: 0.2,
    }],
    arps: [{
      root: 67, scale: SCALES.majorPent, octaveRange: 2,
      interval: 2000, intervalJitter: 1500,
      noteDuration: 0.2, wave: 'sine',
      gain: 0.03, filterCutoff: 4000,
    }],
    pulses: [{
      // Bird chirps
      pitch: 2000, wave: 'sine',
      filterFreq: 4000, filterType: 'lowpass', filterQ: 1,
      duration: 0.1, interval: 2000, intervalJitter: 1500,
      gain: 0.025,
    }],
  },

  temple: {
    label: 'Temple',
    pads: [
      {
        note: 36, intervals: [7, 12, 19], detune: 3,
        wave: 'sine', filterCutoff: 500, filterQ: 2,
        gain: 0.13, attack: 6, lfoRate: 0.03, lfoDepth: 0.15,
      },
    ],
    arps: [{
      // Bell-like tones
      root: 72, scale: [0, 7, 12, 7], octaveRange: 1,
      interval: 5000, intervalJitter: 3000,
      noteDuration: 1.5, wave: 'sine',
      gain: 0.03, filterCutoff: 3000,
    }],
  },

  combat: {
    label: 'Battle',
    pads: [{
      note: 33, intervals: [7, 12], detune: 12,
      wave: 'sawtooth', filterCutoff: 400, filterQ: 2,
      gain: 0.12, attack: 1, lfoRate: 0.2, lfoDepth: 0.3,
    }],
    arps: [{
      root: 36, scale: SCALES.minor, octaveRange: 2,
      interval: 400, intervalJitter: 100,
      noteDuration: 0.2, wave: 'triangle',
      gain: 0.06, filterCutoff: 1500,
    }],
    noises: [{
      filterType: 'bandpass', filterFreq: 200, filterQ: 1,
      gain: 0.05, brown: true,
    }],
    pulses: [{
      // Percussion hits
      filterFreq: 150, filterType: 'lowpass', filterQ: 3,
      duration: 0.08, interval: 500, intervalJitter: 50,
      gain: 0.08,
    }],
  },
};

// ─── Active layer handles (for cleanup) ───────────────────────────────────────

interface ActiveLayer {
  nodes: AudioNode[];
  sources: (AudioBufferSourceNode | OscillatorNode)[];
  timers: ReturnType<typeof setTimeout>[];
  gainNode: GainNode;
}

// ─── Audio Engine ─────────────────────────────────────────────────────────────

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private activeLayers: ActiveLayer[] = [];
  private noiseBuffer: AudioBuffer | null = null;
  private brownNoiseBuffer: AudioBuffer | null = null;
  private _volume = 0.5;
  private _playing = false;
  private _currentPreset = '';
  private fadeOutTimers: ReturnType<typeof setTimeout>[] = [];

  get isPlaying(): boolean { return this._playing; }
  get currentPreset(): string { return this._currentPreset; }
  get volume(): number { return this._volume; }

  private ensureContext(): AudioContext {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();

      // Master gain → compressor → destination
      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.value = -20;
      this.compressor.knee.value = 10;
      this.compressor.ratio.value = 4;
      this.compressor.connect(this.ctx.destination);

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this._volume;
      this.masterGain.connect(this.compressor);
    }
    return this.ctx;
  }

  /** Pre-generate noise buffers (white + brown) */
  private ensureNoiseBuffers(ctx: AudioContext): void {
    if (!this.noiseBuffer) {
      const len = ctx.sampleRate * 4;
      this.noiseBuffer = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < len; i++) {
        data[i] = Math.random() * 2 - 1;
      }
    }
    if (!this.brownNoiseBuffer) {
      const len = ctx.sampleRate * 4;
      this.brownNoiseBuffer = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = this.brownNoiseBuffer.getChannelData(0);
      let lastOut = 0;
      for (let i = 0; i < len; i++) {
        const white = Math.random() * 2 - 1;
        lastOut = (lastOut + 0.02 * white) / 1.02;
        data[i] = lastOut * 3.5; // Normalize
      }
    }
  }

  setVolume(v: number): void {
    this._volume = Math.max(0, Math.min(1, v));
    if (this.masterGain) {
      this.masterGain.gain.setTargetAtTime(this._volume, this.ctx!.currentTime, 0.1);
    }
  }

  async play(presetName: string): Promise<void> {
    const ctx = this.ensureContext();
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    const preset = SCENE_PRESETS[presetName] || SCENE_PRESETS.default;

    // If already playing this preset, skip
    if (this._playing && this._currentPreset === presetName) return;

    // Fade out existing layers
    this.fadeOutLayers(2);

    this.ensureNoiseBuffers(ctx);
    this._currentPreset = presetName;
    this._playing = true;

    const now = ctx.currentTime;
    const newLayers: ActiveLayer[] = [];

    // Create pad layers
    if (preset.pads) {
      for (const pad of preset.pads) {
        newLayers.push(this.createPadLayer(ctx, pad, now));
      }
    }

    // Create arp layers
    if (preset.arps) {
      for (const arp of preset.arps) {
        newLayers.push(this.createArpLayer(ctx, arp));
      }
    }

    // Create noise layers
    if (preset.noises) {
      for (const noise of preset.noises) {
        newLayers.push(this.createNoiseLayer(ctx, noise, now));
      }
    }

    // Create pulse layers
    if (preset.pulses) {
      for (const pulse of preset.pulses) {
        newLayers.push(this.createPulseLayer(ctx, pulse));
      }
    }

    this.activeLayers.push(...newLayers);
  }

  stop(): void {
    this.fadeOutLayers(1.5);
    this._playing = false;
    this._currentPreset = '';
  }

  destroy(): void {
    this.killAllLayers();
    if (this.ctx) {
      this.ctx.close().catch(() => {});
      this.ctx = null;
    }
    this.masterGain = null;
    this.compressor = null;
    this.noiseBuffer = null;
    this.brownNoiseBuffer = null;
  }

  // ─── Layer factories ──────────────────────────────────────────────────

  private createPadLayer(ctx: AudioContext, cfg: PadConfig, now: number): ActiveLayer {
    const layer: ActiveLayer = { nodes: [], sources: [], timers: [], gainNode: ctx.createGain() };

    // Fade in
    layer.gainNode.gain.setValueAtTime(0, now);
    layer.gainNode.gain.linearRampToValueAtTime(cfg.gain, now + cfg.attack);

    // Low-pass filter
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = cfg.filterCutoff;
    filter.Q.value = cfg.filterQ;
    layer.nodes.push(filter);

    // Optional LFO on filter cutoff
    if (cfg.lfoRate && cfg.lfoDepth) {
      const lfo = ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = cfg.lfoRate;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = cfg.filterCutoff * cfg.lfoDepth;
      lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);
      lfo.start(now);
      layer.sources.push(lfo);
      layer.nodes.push(lfoGain);
    }

    // Build all notes: root + intervals
    const allNotes = [cfg.note, ...cfg.intervals.map(i => cfg.note + i)];
    for (const note of allNotes) {
      // Two detuned oscillators per note for richness
      for (const detuneOffset of [-cfg.detune, cfg.detune]) {
        const osc = ctx.createOscillator();
        osc.type = cfg.wave;
        osc.frequency.value = midiToFreq(note);
        osc.detune.value = detuneOffset;
        osc.connect(filter);
        osc.start(now);
        layer.sources.push(osc);
      }
    }

    filter.connect(layer.gainNode);
    layer.gainNode.connect(this.masterGain!);

    return layer;
  }

  private createArpLayer(ctx: AudioContext, cfg: ArpConfig): ActiveLayer {
    const layer: ActiveLayer = { nodes: [], sources: [], timers: [], gainNode: ctx.createGain() };
    layer.gainNode.gain.value = cfg.gain;

    // Filter for the arp notes
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = cfg.filterCutoff;
    filter.Q.value = 1;
    filter.connect(layer.gainNode);
    layer.nodes.push(filter);

    layer.gainNode.connect(this.masterGain!);

    // Build available notes from scale + octave range
    const notes: number[] = [];
    for (let oct = 0; oct < cfg.octaveRange; oct++) {
      for (const degree of cfg.scale) {
        notes.push(cfg.root + oct * 12 + degree);
      }
    }

    // Schedule recurring random notes
    const scheduleNext = () => {
      if (!this._playing) return;

      const now = ctx.currentTime;
      const note = notes[Math.floor(Math.random() * notes.length)];
      const freq = midiToFreq(note);

      const osc = ctx.createOscillator();
      osc.type = cfg.wave;
      osc.frequency.value = freq;

      const noteGain = ctx.createGain();
      noteGain.gain.setValueAtTime(0, now);
      noteGain.gain.linearRampToValueAtTime(1, now + 0.05); // Attack
      noteGain.gain.setValueAtTime(1, now + cfg.noteDuration * 0.6);
      noteGain.gain.linearRampToValueAtTime(0, now + cfg.noteDuration); // Release

      osc.connect(noteGain);
      noteGain.connect(filter);
      osc.start(now);
      osc.stop(now + cfg.noteDuration + 0.05);

      // Schedule next note
      const jitter = (Math.random() * 2 - 1) * cfg.intervalJitter;
      const nextTime = Math.max(200, cfg.interval + jitter);
      const timer = setTimeout(scheduleNext, nextTime);
      layer.timers.push(timer);
    };

    // Start first note after a short random delay
    const initTimer = setTimeout(scheduleNext, Math.random() * cfg.interval);
    layer.timers.push(initTimer);

    return layer;
  }

  private createNoiseLayer(ctx: AudioContext, cfg: NoiseConfig, now: number): ActiveLayer {
    const layer: ActiveLayer = { nodes: [], sources: [], timers: [], gainNode: ctx.createGain() };

    // Fade in
    layer.gainNode.gain.setValueAtTime(0, now);
    layer.gainNode.gain.linearRampToValueAtTime(cfg.gain, now + 2);

    const buffer = cfg.brown ? this.brownNoiseBuffer! : this.noiseBuffer!;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = cfg.filterType;
    filter.frequency.value = cfg.filterFreq;
    filter.Q.value = cfg.filterQ;

    source.connect(filter);
    filter.connect(layer.gainNode);
    layer.sources.push(source);
    layer.nodes.push(filter);

    // Optional LFO on gain for pulsing texture
    if (cfg.lfoRate && cfg.lfoDepth) {
      const lfo = ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = cfg.lfoRate;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = cfg.gain * cfg.lfoDepth;
      lfo.connect(lfoGain);
      lfoGain.connect(layer.gainNode.gain);
      lfo.start(now);
      layer.sources.push(lfo);
      layer.nodes.push(lfoGain);
    }

    layer.gainNode.connect(this.masterGain!);
    source.start(now);

    return layer;
  }

  private createPulseLayer(ctx: AudioContext, cfg: PulseConfig): ActiveLayer {
    const layer: ActiveLayer = { nodes: [], sources: [], timers: [], gainNode: ctx.createGain() };
    layer.gainNode.gain.value = 1; // Individual pulses control their own gain
    layer.gainNode.connect(this.masterGain!);

    const scheduleNext = () => {
      if (!this._playing) return;

      const now = ctx.currentTime;
      const pulseGain = ctx.createGain();
      pulseGain.gain.setValueAtTime(0, now);
      pulseGain.gain.linearRampToValueAtTime(cfg.gain, now + 0.005);
      pulseGain.gain.setValueAtTime(cfg.gain, now + cfg.duration * 0.3);
      pulseGain.gain.exponentialRampToValueAtTime(0.001, now + cfg.duration);

      if (cfg.pitch && cfg.wave) {
        // Pitched pulse (bird chirp, owl hoot, etc.)
        const osc = ctx.createOscillator();
        osc.type = cfg.wave;
        osc.frequency.value = cfg.pitch;
        // Add slight pitch variation
        osc.frequency.value = cfg.pitch * (0.95 + Math.random() * 0.1);

        const filter = ctx.createBiquadFilter();
        filter.type = cfg.filterType;
        filter.frequency.value = cfg.filterFreq;
        filter.Q.value = cfg.filterQ;

        osc.connect(filter);
        filter.connect(pulseGain);
        pulseGain.connect(layer.gainNode);
        osc.start(now);
        osc.stop(now + cfg.duration + 0.01);
      } else {
        // Noise burst
        const buffer = this.noiseBuffer!;
        const source = ctx.createBufferSource();
        source.buffer = buffer;

        const filter = ctx.createBiquadFilter();
        filter.type = cfg.filterType;
        filter.frequency.value = cfg.filterFreq;
        filter.Q.value = cfg.filterQ;

        source.connect(filter);
        filter.connect(pulseGain);
        pulseGain.connect(layer.gainNode);
        source.start(now);
        source.stop(now + cfg.duration + 0.01);
      }

      const jitter = (Math.random() * 2 - 1) * cfg.intervalJitter;
      const nextTime = Math.max(100, cfg.interval + jitter);
      const timer = setTimeout(scheduleNext, nextTime);
      layer.timers.push(timer);
    };

    const initTimer = setTimeout(scheduleNext, Math.random() * cfg.interval);
    layer.timers.push(initTimer);

    return layer;
  }

  // ─── Cleanup helpers ──────────────────────────────────────────────────

  private fadeOutLayers(duration: number): void {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const layersToFade = [...this.activeLayers];
    this.activeLayers = [];

    for (const layer of layersToFade) {
      // Clear scheduled timers immediately
      for (const timer of layer.timers) {
        clearTimeout(timer);
      }
      layer.timers = [];

      // Fade gain to 0
      try {
        layer.gainNode.gain.cancelScheduledValues(now);
        layer.gainNode.gain.setValueAtTime(layer.gainNode.gain.value, now);
        layer.gainNode.gain.linearRampToValueAtTime(0, now + duration);
      } catch {
        // Node may already be disconnected
      }
    }

    // Clean up nodes after fade completes
    const cleanupTimer = setTimeout(() => {
      for (const layer of layersToFade) {
        this.cleanupLayer(layer);
      }
    }, duration * 1000 + 100);
    this.fadeOutTimers.push(cleanupTimer);
  }

  private cleanupLayer(layer: ActiveLayer): void {
    for (const timer of layer.timers) {
      clearTimeout(timer);
    }
    for (const source of layer.sources) {
      try { source.stop(); } catch { /* already stopped */ }
      try { source.disconnect(); } catch { /* already disconnected */ }
    }
    for (const node of layer.nodes) {
      try { node.disconnect(); } catch { /* already disconnected */ }
    }
    try { layer.gainNode.disconnect(); } catch { /* already disconnected */ }
  }

  private killAllLayers(): void {
    for (const timer of this.fadeOutTimers) {
      clearTimeout(timer);
    }
    this.fadeOutTimers = [];

    for (const layer of this.activeLayers) {
      for (const timer of layer.timers) {
        clearTimeout(timer);
      }
      this.cleanupLayer(layer);
    }
    this.activeLayers = [];
  }
}

// Singleton
let _engineInstance: AudioEngine | null = null;

export function getAudioEngine(): AudioEngine {
  if (!_engineInstance) {
    _engineInstance = new AudioEngine();
  }
  return _engineInstance;
}
