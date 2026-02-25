import { NextRequest, NextResponse } from 'next/server';
import * as characterService from '../../../../lib/services/character-service';
import { z } from 'zod';
import type { AbilityScores, SavingThrows, Skills, Character } from '../../../../types';

const characterIdSchema = z.object({
  id: z.string().uuid('Invalid character ID format (must be UUID)'),
});

const abilityScoresSchema = z.object({
  strength: z.number().int().min(1).max(30),
  dexterity: z.number().int().min(1).max(30),
  constitution: z.number().int().min(1).max(30),
  intelligence: z.number().int().min(1).max(30),
  wisdom: z.number().int().min(1).max(30),
  charisma: z.number().int().min(1).max(30),
}).partial();

const savingThrowsSchema = z.object({
  strength: z.boolean(),
  dexterity: z.boolean(),
  constitution: z.boolean(),
  intelligence: z.boolean(),
  wisdom: z.boolean(),
  charisma: z.boolean(),
}).partial();

const skillsSchema = z.object({
  acrobatics: z.boolean(),
  animalHandling: z.boolean(),
  arcana: z.boolean(),
  athletics: z.boolean(),
  deception: z.boolean(),
  history: z.boolean(),
  insight: z.boolean(),
  intimidation: z.boolean(),
  investigation: z.boolean(),
  medicine: z.boolean(),
  nature: z.boolean(),
  perception: z.boolean(),
  performance: z.boolean(),
  persuasion: z.boolean(),
  religion: z.boolean(),
  sleightOfHand: z.boolean(),
  stealth: z.boolean(),
  survival: z.boolean(),
}).partial();

const deathSavesSchema = z.object({
  successes: z.number().int().min(0).max(3),
  failures: z.number().int().min(0).max(3),
}).partial();

const spellSlotsSchema = z.record(
  z.string(),
  z.object({
    max: z.number().int().min(0),
    used: z.number().int().min(0),
  })
).optional();

const updateCharacterSchema = z.object({
  name: z.string().min(1, 'Character name cannot be empty').optional(),
  race: z.string().min(1, 'Character race cannot be empty').optional(),
  class: z.string().min(1, 'Character class cannot be empty').optional(),
  subclass: z.string().optional(),
  level: z.number().int().min(1).optional(),
  background: z.string().optional(),
  alignment: z.string().optional(),
  experience: z.number().int().min(0).optional(),
  abilityScores: abilityScoresSchema.optional(),
  maxHp: z.number().int().min(1).optional(),
  currentHp: z.number().int().optional(),
  tempHp: z.number().int().min(0).optional(),
  armorClass: z.number().int().min(0).optional(),
  initiative: z.number().int().optional(),
  speed: z.number().int().min(0).optional(),
  proficiencyBonus: z.number().int().min(0).optional(),
  savingThrows: savingThrowsSchema.optional(),
  skills: skillsSchema.optional(),
  hitDice: z.string().optional(),
  hitDiceRemaining: z.number().int().min(0).optional(),
  deathSaves: deathSavesSchema.optional(),
  spellcastingAbility: z.string().optional(),
  spellSaveDC: z.number().int().optional(),
  spellAttackBonus: z.number().int().optional(),
  spellSlots: spellSlotsSchema.optional(),
  dndbeyondId: z.string().optional(),
  dndbeyondUrl: z.string().url().optional(),
  lastSyncedAt: z.preprocess((arg) => (typeof arg === 'string' || arg instanceof Date ? new Date(arg) : undefined), z.date()).optional(),
  syncEnabled: z.boolean().optional(),
  portraitUrl: z.string().url().optional(),
  notes: z.string().optional(),
}).partial();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: rawId } = await params;
    const idValidation = characterIdSchema.safeParse({ id: rawId });

    if (!idValidation.success) {
      return NextResponse.json(
        { success: false, error: idValidation.error.issues },
        { status: 400 }
      );
    }
    const { id } = idValidation.data;

    const character = await characterService.getCharacter(id);

    if (!character) {
      return NextResponse.json(
        { success: false, error: 'Character not found' },
        { status: 404 }
      );
    }

    // Include extras if requested via query param (comma-separated)
    const { searchParams } = request.nextUrl;
    const includes = (searchParams.get('include') || '').split(',').map(s => s.trim());
    const extras: Record<string, unknown> = {};
    if (includes.includes('inventory')) {
      extras.inventory = await characterService.getInventory(id);
    }
    if (includes.includes('spells')) {
      extras.spells = await characterService.getSpells(id);
    }
    if (Object.keys(extras).length > 0) {
      return NextResponse.json({ success: true, data: { ...character, ...extras } });
    }

    return NextResponse.json({ success: true, data: character });
  } catch (error) {
    console.error('Error fetching character:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch character' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: rawId } = await params;
    const idValidation = characterIdSchema.safeParse({ id: rawId });

    if (!idValidation.success) {
      return NextResponse.json(
        { success: false, error: idValidation.error.issues },
        { status: 400 }
      );
    }
    const { id } = idValidation.data;

    const body = await request.json();
    const updatesValidation = updateCharacterSchema.safeParse(body);

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

    const character = await characterService.updateCharacter(id, updates as Partial<Character>);

    if (!character) {
      return NextResponse.json(
        { success: false, error: 'Character not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: character });
  } catch (error) {
    console.error('Error updating character:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update character' },
      { status: 500 }
    );
  }
}

// ─── REST ACTIONS ─────────────────────────────────────────────
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: rawId } = await params;
    const idValidation = characterIdSchema.safeParse({ id: rawId });

    if (!idValidation.success) {
      return NextResponse.json(
        { success: false, error: idValidation.error.issues },
        { status: 400 }
      );
    }
    const { id } = idValidation.data;

    const body = await request.json();
    const { action, hitDiceUsed } = body;

    if (action === 'shortRest') {
      const dice = typeof hitDiceUsed === 'number' ? hitDiceUsed : 0;
      if (dice < 0) {
        return NextResponse.json(
          { success: false, error: 'hitDiceUsed must be >= 0' },
          { status: 400 }
        );
      }
      const character = await characterService.shortRest(id, dice);
      if (!character) {
        return NextResponse.json(
          { success: false, error: 'Character not found' },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true, data: character });
    }

    if (action === 'longRest') {
      const character = await characterService.longRest(id);
      if (!character) {
        return NextResponse.json(
          { success: false, error: 'Character not found' },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true, data: character });
    }

    if (action === 'equipItem') {
      const { itemId, equipped } = body;
      if (!itemId || typeof equipped !== 'boolean') {
        return NextResponse.json(
          { success: false, error: 'itemId and equipped (boolean) are required' },
          { status: 400 }
        );
      }

      // Update the item equipped status
      await characterService.updateInventoryItem(itemId, { equipped });

      // Recalculate AC based on equipped armor
      const inventory = await characterService.getInventory(id);
      const character = await characterService.getCharacter(id);
      if (character) {
        const dexMod = Math.floor(((character.abilityScores?.dexterity || 10) - 10) / 2);
        let newAC = 10 + dexMod; // Base AC (unarmored)
        let hasHeavy = false;

        const equippedArmor = inventory.filter(
          (item) => item.type === 'armor' && item.equipped
        );

        for (const armor of equippedArmor) {
          const name = armor.name.toLowerCase();
          if (name.includes('shield')) { newAC += 2; continue; }
          // Light armor
          if (name.includes('padded')) { newAC = Math.max(newAC, 11 + dexMod); }
          else if (name.includes('leather') && !name.includes('studded')) { newAC = Math.max(newAC, 11 + dexMod); }
          else if (name.includes('studded')) { newAC = Math.max(newAC, 12 + dexMod); }
          // Medium armor
          else if (name.includes('hide')) { newAC = Math.max(newAC, 12 + Math.min(2, dexMod)); }
          else if (name.includes('chain shirt')) { newAC = Math.max(newAC, 13 + Math.min(2, dexMod)); }
          else if (name.includes('scale')) { newAC = Math.max(newAC, 14 + Math.min(2, dexMod)); }
          else if (name.includes('breastplate')) { newAC = Math.max(newAC, 14 + Math.min(2, dexMod)); }
          else if (name.includes('half plate')) { newAC = Math.max(newAC, 15 + Math.min(2, dexMod)); }
          // Heavy armor
          else if (name.includes('ring mail')) { newAC = Math.max(newAC, 14); hasHeavy = true; }
          else if (name.includes('chain mail') && !name.includes('shirt')) { newAC = Math.max(newAC, 16); hasHeavy = true; }
          else if (name.includes('splint')) { newAC = Math.max(newAC, 17); hasHeavy = true; }
          else if (name.includes('plate') && !name.includes('half') && !name.includes('breast')) { newAC = Math.max(newAC, 18); hasHeavy = true; }
        }

        if (newAC !== character.armorClass) {
          await characterService.updateCharacter(id, { armorClass: newAC });
        }
      }

      const updatedChar = await characterService.getCharacter(id);
      const updatedInventory = await characterService.getInventory(id);
      return NextResponse.json({
        success: true,
        data: { character: updatedChar, inventory: updatedInventory },
      });
    }

    if (action === 'addItem') {
      const { name, type: itemType, quantity, description, magical } = body;
      if (!name) {
        return NextResponse.json({ success: false, error: 'Item name is required' }, { status: 400 });
      }
      await characterService.addInventoryItem(id, {
        name,
        type: itemType || 'gear',
        quantity: quantity || 1,
        weight: 0,
        value: 0,
        description: description || '',
        equipped: false,
        attuned: false,
        requiresAttunement: false,
        magical: magical || false,
      });
      const updatedInventory = await characterService.getInventory(id);
      return NextResponse.json({ success: true, data: { inventory: updatedInventory } });
    }

    if (action === 'removeItem') {
      const { itemId: removeItemId } = body;
      if (!removeItemId) {
        return NextResponse.json({ success: false, error: 'itemId is required' }, { status: 400 });
      }
      await characterService.removeInventoryItem(removeItemId);
      const updatedInventory = await characterService.getInventory(id);
      return NextResponse.json({ success: true, data: { inventory: updatedInventory } });
    }

    return NextResponse.json(
      { success: false, error: 'Unknown action. Use "shortRest", "longRest", "equipItem", "addItem", or "removeItem".' },
      { status: 400 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to perform rest action';
    console.error('Error performing rest action:', error);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: rawId } = await params;
    const idValidation = characterIdSchema.safeParse({ id: rawId });

    if (!idValidation.success) {
      return NextResponse.json(
        { success: false, error: idValidation.error.issues },
        { status: 400 }
      );
    }
    const { id } = idValidation.data;

    const deleted = await characterService.deleteCharacter(id);

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Character not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting character:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete character' },
      { status: 500 }
    );
  }
}
