'use client';

import { useState, useCallback, useEffect } from 'react';

export interface UseTTSOptions {
  rate?: number;
  pitch?: number;
  preferredVoice?: string;
}

export interface UseTTSReturn {
  speak: (text: string) => void;
  stop: () => void;
  isSpeaking: boolean;
  isSupported: boolean;
  voices: SpeechSynthesisVoice[];
  selectedVoice: SpeechSynthesisVoice | null;
  setVoice: (voice: SpeechSynthesisVoice) => void;
}

export function useTTS(options: UseTTSOptions = {}): UseTTSReturn {
  const { rate = 0.9, pitch = 1, preferredVoice } = options;

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);

  const isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  // Load voices
  useEffect(() => {
    if (!isSupported) return;

    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      setVoices(availableVoices);

      // Select a default voice
      if (availableVoices.length > 0 && !selectedVoice) {
        // Try to find preferred voice
        if (preferredVoice) {
          const preferred = availableVoices.find(v =>
            v.name.toLowerCase().includes(preferredVoice.toLowerCase())
          );
          if (preferred) {
            setSelectedVoice(preferred);
            return;
          }
        }

        // Try to find a good English voice
        const englishVoice = availableVoices.find(v =>
          v.lang.startsWith('en') && (v.name.includes('Male') || v.name.includes('Daniel'))
        );

        if (englishVoice) {
          setSelectedVoice(englishVoice);
        } else {
          // Fallback to first English voice
          const anyEnglish = availableVoices.find(v => v.lang.startsWith('en'));
          setSelectedVoice(anyEnglish || availableVoices[0]);
        }
      }
    };

    // Voices may not be loaded immediately
    loadVoices();
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices);

    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
    };
  }, [isSupported, preferredVoice, selectedVoice]);

  // Clean up text for speech
  const cleanText = useCallback((text: string): string => {
    return text
      // Remove markdown formatting
      .replace(/[#*_`~]/g, '')
      // Remove markdown links but keep text
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      // Remove code blocks
      .replace(/```[\s\S]*?```/g, '')
      // Remove inline code
      .replace(/`[^`]+`/g, '')
      // Clean up multiple spaces/newlines
      .replace(/\s+/g, ' ')
      .trim();
  }, []);

  const speak = useCallback((text: string) => {
    if (!isSupported) return;

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const cleanedText = cleanText(text);
    if (!cleanedText) return;

    const utterance = new SpeechSynthesisUtterance(cleanedText);
    utterance.rate = rate;
    utterance.pitch = pitch;

    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  }, [isSupported, rate, pitch, selectedVoice, cleanText]);

  const stop = useCallback(() => {
    if (!isSupported) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, [isSupported]);

  const setVoice = useCallback((voice: SpeechSynthesisVoice) => {
    setSelectedVoice(voice);
  }, []);

  return {
    speak,
    stop,
    isSpeaking,
    isSupported,
    voices,
    selectedVoice,
    setVoice,
  };
}
