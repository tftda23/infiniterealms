'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { Button } from '../components/ui/button';
import type { EnvironmentTheme } from '../components/dm-chat';
import { getAudioEngine, SCENE_PRESETS } from '../lib/audio-engine';

interface AmbientAudioProps {
  theme: EnvironmentTheme;
  inCombat?: boolean;
}

export function AmbientAudio({ theme, inCombat }: AmbientAudioProps) {
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [showSlider, setShowSlider] = useState(false);
  const engineRef = useRef(getAudioEngine());

  const activeTheme = inCombat ? 'combat' : theme;
  const preset = SCENE_PRESETS[activeTheme] || SCENE_PRESETS.default;

  // Switch preset when theme changes (if currently playing)
  useEffect(() => {
    if (playing) {
      engineRef.current.play(activeTheme);
    }
  }, [activeTheme, playing]);

  // Sync volume
  useEffect(() => {
    engineRef.current.setVolume(volume);
  }, [volume]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      engineRef.current.stop();
    };
  }, []);

  const toggle = useCallback(() => {
    if (playing) {
      engineRef.current.stop();
      setPlaying(false);
    } else {
      engineRef.current.play(activeTheme);
      setPlaying(true);
    }
  }, [playing, activeTheme]);

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
        title={playing ? `${preset.label} ambience (click to mute)` : 'Enable ambient audio'}
      >
        {playing ? (
          <Volume2 className="w-4 h-4 text-primary" />
        ) : (
          <VolumeX className="w-4 h-4 text-muted-foreground" />
        )}
      </Button>
      {showSlider && playing && (
        <div className="absolute top-full right-0 mt-1 bg-popover border rounded-lg shadow-lg p-2 z-50 w-36">
          <div className="text-[10px] text-muted-foreground mb-1 text-center font-medium">
            {preset.label}
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(volume * 100)}
            onChange={(e) => setVolume(Number(e.target.value) / 100)}
            className="w-full h-1.5 accent-primary cursor-pointer"
          />
          <div className="text-[9px] text-muted-foreground mt-0.5 text-center">
            {Math.round(volume * 100)}%
          </div>
        </div>
      )}
    </div>
  );
}
