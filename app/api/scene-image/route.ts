import { NextRequest, NextResponse } from 'next/server';
import * as campaignService from '../../../lib/services/campaign-service';
import * as settingsService from '../../../lib/services/settings-service';
import { z } from 'zod';
import type { SceneTheme } from '../../../types';

const generateSceneImageSchema = z.object({
  campaignId: z.string().uuid('Invalid campaign ID format (must be UUID)'),
  description: z.string().min(1, 'Description is required').max(1000, 'Description too long (max 1000 characters)'),
  theme: z.enum([
    'tavern', 'forest', 'dungeon', 'castle', 'cave',
    'village', 'city', 'battlefield', 'temple', 'ruins',
    'mountain', 'swamp', 'desert', 'ocean', 'underground',
    'library', 'throne_room', 'marketplace', 'graveyard', 'portal'
  ]).optional(),
  // For generating specific items like NPCs, maps, items in chat
  imageType: z.enum(['scene', 'npc', 'item', 'map']).optional(),
  updateGameState: z.boolean().optional(), // Whether to update game state with URL
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = generateSceneImageSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues },
        { status: 400 }
      );
    }

    const { campaignId, description, theme, imageType = 'scene', updateGameState = true } = validation.data;

    // Fetch API key from settings
    const settings = await settingsService.getSettings(true); // Decrypt keys

    // Check image provider settings
    const imageProvider = settings.imageProvider || 'openai';
    if (imageProvider === 'none') {
      return NextResponse.json(
        { success: false, error: 'Image generation is disabled in settings' },
        { status: 400 }
      );
    }

    const apiKey = settings.apiKeys?.openai;
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'OpenAI API key is required for image generation. Please configure it in Settings.' },
        { status: 400 }
      );
    }

    const imageModel = settings.imageModel || 'dall-e-3';

    // Generate image
    const { default: OpenAI } = await import('openai');
    const client = new OpenAI({ apiKey });

    // Build prompt based on image type
    let prompt: string;
    switch (imageType) {
      case 'npc':
        prompt = `Fantasy RPG character portrait: ${description}. Detailed digital art, dramatic lighting. Style: fantasy illustration, concept art, character portrait.`;
        break;
      case 'item':
        prompt = `Fantasy RPG item illustration: ${description}. Detailed digital art, dramatic lighting, item showcase. Style: fantasy illustration, concept art.`;
        break;
      case 'map':
        prompt = `Fantasy RPG map illustration: ${description}. Top-down or artistic perspective, detailed, labeled areas. Style: hand-drawn fantasy map, parchment texture.`;
        break;
      default:
        prompt = `Fantasy RPG scene, ${theme || 'fantasy'} setting: ${description}. Detailed digital art, dramatic lighting, cinematic composition. Style: fantasy illustration, concept art.`;
    }

    const size = imageType === 'scene' ? '1792x1024' : '1024x1024';

    const response = await client.images.generate({
      model: imageModel as 'dall-e-3' | 'dall-e-2',
      prompt,
      n: 1,
      size: size as any,
      quality: 'standard',
    });

    const imageUrl = response.data?.[0]?.url;
    if (!imageUrl) {
      return NextResponse.json(
        { success: false, error: 'Failed to generate image' },
        { status: 500 }
      );
    }

    // Only update game state for scene images
    if (imageType === 'scene' && updateGameState) {
      await campaignService.updateGameState(campaignId, {
        currentSceneImageUrl: imageUrl,
      });
    }

    return NextResponse.json({ success: true, data: { imageUrl, imageType } });
  } catch (error: any) {
    console.error('Error generating scene image:', error);
    const errorMessage = error?.message?.includes('billing')
      ? 'OpenAI billing issue - please check your account.'
      : 'Failed to generate scene image';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
