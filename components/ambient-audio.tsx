'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { EnvironmentTheme } from '@/components/dm-chat';

interface AmbientAudioProps {
  theme: EnvironmentTheme;
  inCombat?: boolean;
}

// Ambient sound presets using Web Audio API noise generation
interface AmbienceConfig {
  label: string;
  /** Base frequency for filtered noise (Hz) */
  freq?: number;
  /** Filter type */
  filterType?: BiquadFilterType;
  /** Q factor for the filter */
  q?: number;
  /** Gain level (0-1) */
  gain: number;
  /** Secondary oscillator freq (0 = none) */
  oscFreq?: number;
  /** Secondary osc type */
  oscType?: OscillatorType;
  /** Secondary osc gain */
  oscGain?: number;
  /** LFO speed for pulsing */
  lfoRate?: number;
  /** Audio file URL for real loops (optional) */
  url?: string;
}

const AMBIENCE_CONFIGS: Record<string, AmbienceConfig> = {
  default: { 
    label: 'Wind', 
    freq: 400, filterType: 'lowpass', q: 1, gain: 0.08,
    url: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3' // Light wind
  },
  tavern: { 
    label: 'Tavern', 
    freq: 800, filterType: 'bandpass', q: 0.8, gain: 0.06, lfoRate: 0.3,
    url: 'https://www.ambient-mixer.com/sounds/ambience/tavern_crowd.mp3' // Placeholder, will find better CC0
  },
  dungeon: { 
    label: 'Dungeon', 
    freq: 200, filterType: 'lowpass', q: 2, gain: 0.1, oscFreq: 55, oscType: 'sine', oscGain: 0.02,
    url: 'https://files.freemusicarchive.org/storage-freemusicarchive-org/music/ccCommunity/Kai_Engel/Satin/Kai_Engel_-_04_-_Interception.mp3' // Dark ambient
  },
  cave: { 
    label: 'Cave', 
    freq: 150, filterType: 'lowpass', q: 3, gain: 0.12, lfoRate: 0.1,
    url: 'https://assets.mixkit.co/active_storage/sfx/2568/2571-preview.mp3' // Cave drips
  },
  forest: { 
    label: 'Forest', 
    freq: 2000, filterType: 'bandpass', q: 0.5, gain: 0.05, lfoRate: 0.2,
    url: 'https://assets.mixkit.co/active_storage/sfx/2501/2501-preview.mp3' // Forest birds
  },
  ocean: { 
    label: 'Ocean', 
    freq: 300, filterType: 'lowpass', q: 1, gain: 0.12, lfoRate: 0.08,
    url: 'https://assets.mixkit.co/active_storage/sfx/2513/2513-preview.mp3' // Waves
  },
  desert: { label: 'Desert Wind', freq: 600, filterType: 'highpass', q: 0.5, gain: 0.04 },
  mountain: { label: 'Mountain', freq: 500, filterType: 'lowpass', q: 0.5, gain: 0.06, lfoRate: 0.15 },
  swamp: { label: 'Swamp', freq: 250, filterType: 'lowpass', q: 2, gain: 0.08, lfoRate: 0.25 },
  snow: { label: 'Blizzard', freq: 3000, filterType: 'highpass', q: 0.3, gain: 0.07 },
  fire: { 
    label: 'Crackling', 
    freq: 1200, filterType: 'bandpass', q: 1.5, gain: 0.06, lfoRate: 4,
    url: 'https://assets.mixkit.co/active_storage/sfx/2538/2538-preview.mp3' // Fire
  },
  sky: { label: 'Wind', freq: 700, filterType: 'bandpass', q: 0.3, gain: 0.05 },
  city: { label: 'City', freq: 500, filterType: 'lowpass', q: 0.5, gain: 0.04, lfoRate: 0.5 },
  night: { label: 'Night', freq: 100, filterType: 'lowpass', q: 3, gain: 0.06, oscFreq: 440, oscType: 'sine', oscGain: 0.005 },
  dawn: { label: 'Dawn', freq: 1500, filterType: 'bandpass', q: 0.3, gain: 0.03, lfoRate: 0.3 },
  temple: { label: 'Temple', freq: 120, filterType: 'lowpass', q: 5, gain: 0.08, oscFreq: 220, oscType: 'sine', oscGain: 0.01 },
  combat: { 
    label: 'Battle', 
    freq: 250, filterType: 'lowpass', q: 1, gain: 0.1, oscFreq: 80, oscType: 'sawtooth', oscGain: 0.015, lfoRate: 2,
    url: 'https://files.freemusicarchive.org/storage-freemusicarchive-org/music/ccCommunity/Kai_Engel/Satin/Kai_Engel_-_01_-_Satin.mp3' // Tense track
  },
};

export function AmbientAudio({ theme, inCombat }: AmbientAudioProps) {
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [showSlider, setShowSlider] = useState(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const noiseRef = useRef<AudioBufferSourceNode | null>(null);
  const oscRef = useRef<OscillatorNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const filterRef = useRef<BiquadFilterNode | null>(null);
  const lfoRef = useRef<OscillatorNode | null>(null);
  const lfoGainRef = useRef<GainNode | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  const activeTheme = inCombat ? 'combat' : theme;
  const config = AMBIENCE_CONFIGS[activeTheme] || AMBIENCE_CONFIGS.default;

  const stopAudio = useCallback(() => {
    try { noiseRef.current?.stop(); } catch { /* already stopped */ }
    try { oscRef.current?.stop(); } catch { /* already stopped */ }
    try { lfoRef.current?.stop(); } catch { /* already stopped */ }
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current.currentTime = 0;
      audioElementRef.current = null;
    }
    noiseRef.current = null;
    oscRef.current = null;
    lfoRef.current = null;
  }, []);

  const startAudio = useCallback(async () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = audioCtxRef.current;

    // Resume suspended AudioContext (browser requires user gesture before playing)
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    stopAudio();

    if (config.url) {
      const audio = new Audio(config.url);
      audio.loop = true;
      audio.volume = volume * config.gain * 2; // Scale by config gain
      audio.play().catch(err => console.error('Audio play failed:', err));
      audioElementRef.current = audio;
      return;
    }

    // Procedural Fallback
    // Create noise buffer
    const bufferSize = ctx.sampleRate * 4;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    // Filter
    const filter = ctx.createBiquadFilter();
    filter.type = config.filterType || 'lowpass';
    filter.frequency.value = config.freq || 400;
    filter.Q.value = config.q || 1;

    // Gain node
    const gain = ctx.createGain();
    gain.gain.value = config.gain;

    // Master gain (volume control)
    const masterGain = ctx.createGain();
    masterGain.gain.value = volume;

    // Connect noise → filter → gain → master → output
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);
    masterGain.connect(ctx.destination);

    noise.start();
    noiseRef.current = noise;
    filterRef.current = filter;
    gainRef.current = gain;
    masterGainRef.current = masterGain;

    // Optional oscillator for tonal ambience
    if (config.oscFreq && config.oscType) {
      const osc = ctx.createOscillator();
      osc.type = config.oscType;
      osc.frequency.value = config.oscFreq;
      const oscGain = ctx.createGain();
      oscGain.gain.value = config.oscGain || 0.01;
      osc.connect(oscGain);
      oscGain.connect(masterGain);
      osc.start();
      oscRef.current = osc;
    }

    // Optional LFO for amplitude modulation (pulsing)
    if (config.lfoRate) {
      const lfo = ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = config.lfoRate;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = config.gain * 0.3;
      lfo.connect(lfoGain);
      lfoGain.connect(gain.gain);
      lfo.start();
      lfoRef.current = lfo;
      lfoGainRef.current = lfoGain;
    }
  }, [config, volume, stopAudio]);

  // Restart audio when theme changes (if playing)
  useEffect(() => {
    if (playing) {
      startAudio();
    }
    return () => {
      if (!playing) stopAudio();
    };
  }, [activeTheme, playing]);

  // Update volume without restarting
  useEffect(() => {
    if (masterGainRef.current) {
      masterGainRef.current.gain.value = volume;
    }
    if (audioElementRef.current) {
      audioElementRef.current.volume = volume * config.gain * 2;
    }
  }, [volume, config.gain]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAudio();
      audioCtxRef.current?.close();
    };
  }, []);

  const toggle = useCallback(() => {
    if (playing) {
      stopAudio();
      setPlaying(false);
    } else {
      startAudio();
      setPlaying(true);
    }
  }, [playing, startAudio, stopAudio]);

  return (
    <div
      className="relative flex items-center gap-1"
      onMouseEnter={() => setShowSlider(true)}
      onMouseLeave={() => setShowSlider(false)}
    >
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={toggle}
        title={playing ? `${config.label} ambience (click to mute)` : 'Enable ambient audio'}
      >
        {playing ? (
          <Volume2 className="w-4 h-4 text-primary" />
        ) : (
          <VolumeX className="w-4 h-4 text-muted-foreground" />
        )}
      </Button>
      {showSlider && playing && (
        <div className="absolute top-full right-0 mt-1 bg-popover border rounded-lg shadow-lg p-2 z-50 w-32">
          <div className="text-[10px] text-muted-foreground mb-1 text-center">{config.label}</div>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(volume * 100)}
            onChange={(e) => setVolume(Number(e.target.value) / 100)}
            className="w-full h-1.5 accent-primary cursor-pointer"
          />
        </div>
      )}
    </div>
  );
}
