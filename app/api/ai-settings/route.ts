import { NextRequest, NextResponse } from 'next/server';
import * as settingsService from '../../../lib/services/settings-service';
import { z } from 'zod';
import type { AISettings, AIProvider } from '../../../types';

const aiProviders = ['openai', 'anthropic', 'gemini', 'deepseek', 'openrouter'] as const;

const aiSettingsSchema = z.object({
  defaultProvider: z.enum(aiProviders).optional(),
  defaultModel: z.string().optional(),
  temperature: z.number().optional(),
  maxTokens: z.number().optional(),
  globalPrompt: z.string().optional(),
  apiKeys: z.record(z.string()).optional(),
  autoFallback: z.boolean().optional(),
  fallbackOrder: z.array(z.enum(aiProviders)).optional(),
  imageProvider: z.enum(['openai', 'none']).optional(),
  imageModel: z.string().optional(),
  imageStoragePath: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const settings = await settingsService.getSettings();
    return NextResponse.json({ success: true, data: settings });
  } catch (error) {
    console.error('Error fetching AI settings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = aiSettingsSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues },
        { status: 400 }
      );
    }
    
    const updatedSettings = await settingsService.updateSettings(validation.data as Partial<AISettings>);

    return NextResponse.json({ success: true, data: updatedSettings });
  } catch (error) {
    console.error('Error updating AI settings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}
