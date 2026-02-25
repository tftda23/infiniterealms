import { NextRequest, NextResponse } from 'next/server';
import * as settingsService from '@/lib/services/settings-service';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { AI_PROVIDERS } from '@/lib/ai-providers';
import type { AIProvider } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const { provider } = await request.json();

    if (!provider) {
      return NextResponse.json({ success: false, error: 'Provider is required' }, { status: 400 });
    }

    const settings = await settingsService.getSettings(true); // Decrypt keys
    const apiKey = settings.apiKeys?.[provider as AIProvider];

    if (!apiKey) {
      return NextResponse.json({ success: false, error: `API key for ${provider} not configured.` }, { status: 400 });
    }
    
    const testProvider = provider as AIProvider;
    const providerConfig = AI_PROVIDERS[testProvider];
    if (!providerConfig) {
      return NextResponse.json({ success: false, error: `Invalid provider: ${testProvider}` }, { status: 400 });
    }
    const testModel = providerConfig.models.find(m => m.recommended)?.id || providerConfig.models[0].id;
    
    try {
      if (testProvider === 'anthropic') {
        const anthropic = new Anthropic({ apiKey });
        await anthropic.messages.create({
          model: testModel,
          max_tokens: 10,
          messages: [{ role: 'user', content: 'Test' }],
        });
      } else {
        const openai = new OpenAI({
          apiKey,
          baseURL: providerConfig.baseUrl,
          defaultHeaders: testProvider === 'openrouter' ? {
            'HTTP-Referer': 'https://infiniterealms.app',
            'X-Title': 'Infinite Realms',
          } : undefined,
        });
        await openai.chat.completions.create({
          model: testModel,
          max_tokens: 10,
          messages: [{ role: 'user', content: 'Test' }],
        });
      }
      return NextResponse.json({ success: true, message: 'API key is valid!' });
    } catch (error) {
      console.error(`API Key Test Error for ${provider}:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return NextResponse.json({ success: false, error: `API key test failed: ${errorMessage}` }, { status: 400 });
    }
  } catch (error) {
    console.error('Error testing API key:', error);
    return NextResponse.json({ success: false, error: 'Failed to test API key' }, { status: 500 });
  }
}