'use client';

import { useState, useEffect, useMemo } from 'react';
import { AISettings } from '@/types';
import { toast } from 'sonner';

const DEFAULT_SETTINGS: AISettings = {
  defaultProvider: 'openai',
  defaultModel: 'gpt-4o',
  temperature: 0.8,
  maxTokens: 2000,
  apiKeys: {},
  globalPrompt: '',
};

export function useAiSettings() {
  const [settings, setSettings] = useState<AISettings>(DEFAULT_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/ai-settings');
        const data = await res.json();
        if (data.success) {
          setSettings(data.data);
        } else {
          toast.error(data.error || 'Failed to load AI settings.');
        }
      } catch (error) {
        toast.error('Failed to load AI settings.');
      } finally {
        setIsLoaded(true);
      }
    };
    fetchSettings();
  }, []);

  const value = useMemo(() => ({
    ...settings,
    isLoaded,
  }), [settings, isLoaded]);

  return value;
}
