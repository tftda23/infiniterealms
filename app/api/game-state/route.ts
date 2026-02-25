import { NextRequest, NextResponse } from 'next/server';
import * as campaignService from '@/lib/services/campaign-service';
import { z } from 'zod';
import type { GameState } from '@/types';

const getGameStateSchema = z.object({
  campaignId: z.string().uuid('Invalid campaign ID format (must be UUID)'),
});

const initiativeEntrySchema = z.object({
  id: z.string(),
  name: z.string(),
  initiative: z.number().int(),
  isPlayer: z.boolean(),
  characterId: z.string().uuid().optional(),
  hp: z.number().int().optional(),
  maxHp: z.number().int().optional(),
  ac: z.number().int().optional(),
  conditions: z.array(z.string()),
});

const partyInventoryItemSchema = z.object({
  id: z.string().uuid(),
  characterId: z.string().uuid(),
  name: z.string(),
  type: z.enum(['weapon', 'armor', 'potion', 'scroll', 'wondrous', 'gear', 'treasure', 'other']),
  quantity: z.number().int().min(0),
  weight: z.number().min(0),
  value: z.number().int().min(0),
  description: z.string(),
  equipped: z.boolean(),
  attuned: z.boolean(),
  requiresAttunement: z.boolean(),
  magical: z.boolean(),
  rarity: z.enum(['common', 'uncommon', 'rare', 'very_rare', 'legendary', 'artifact']).optional(),
  properties: z.array(z.string()).optional(),
}).partial();


const updateGameStateSchema = z.object({
  inCombat: z.boolean().optional(),
  initiativeOrder: z.array(initiativeEntrySchema).optional(),
  currentTurn: z.number().int().min(0).optional(),
  round: z.number().int().min(0).optional(),
  currentScene: z.string().optional(),
  currentSceneImageUrl: z.string().url().optional(),
  timeOfDay: z.enum(['dawn', 'morning', 'midday', 'afternoon', 'evening', 'night']).optional(),
  weather: z.string().optional(),
  partyGold: z.number().int().min(0).optional(),
  partyInventory: z.array(partyInventoryItemSchema).optional(),
}).partial();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const validation = getGameStateSchema.safeParse(Object.fromEntries(searchParams));

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues },
        { status: 400 }
      );
    }
    const { campaignId } = validation.data;

    const gameState = await campaignService.getGameState(campaignId);

    if (!gameState) {
      return NextResponse.json(
        { success: false, error: 'Game state not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: gameState });
  } catch (error) {
    console.error('Error fetching game state:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch game state' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const campaignIdValidation = getGameStateSchema.safeParse(Object.fromEntries(searchParams));

    if (!campaignIdValidation.success) {
      return NextResponse.json(
        { success: false, error: campaignIdValidation.error.issues },
        { status: 400 }
      );
    }
    const { campaignId } = campaignIdValidation.data;

    const body = await request.json();
    const updatesValidation = updateGameStateSchema.safeParse(body);

    if (!updatesValidation.success) {
      return NextResponse.json(
        { success: false, error: updatesValidation.error.issues },
        { status: 400 }
      );
    }
    const updates = updatesValidation.data;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No update fields provided' },
        { status: 400 }
      );
    }

    const gameState = await campaignService.updateGameState(campaignId, updates as Partial<GameState>);

    if (!gameState) {
      return NextResponse.json(
        { success: false, error: 'Game state not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: gameState });
  } catch (error) {
    console.error('Error updating game state:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update game state' },
      { status: 500 }
    );
  }
}
