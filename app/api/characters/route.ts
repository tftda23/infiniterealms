import { NextRequest, NextResponse } from 'next/server';
import * as characterService from '@/lib/services/character-service';
import { z } from 'zod';
import { AbilityScores } from '@/types';
import { getSpellSlots, DEFAULT_STARTING_SPELLS, getClassData } from '@/lib/dnd-data';
import { getSpellsByClass } from '@/lib/srd-data';

const getCharactersSchema = z.object({
  campaignId: z.string().uuid('Invalid campaign ID format (must be UUID)'),
});

const abilityScoresSchema = z.object({
  strength: z.number().int().min(1).max(30),
  dexterity: z.number().int().min(1).max(30),
  constitution: z.number().int().min(1).max(30),
  intelligence: z.number().int().min(1).max(30),
  wisdom: z.number().int().min(1).max(30),
  charisma: z.number().int().min(1).max(30),
});

const savingThrowsSchema = z.object({
  strength: z.boolean(),
  dexterity: z.boolean(),
  constitution: z.boolean(),
  intelligence: z.boolean(),
  wisdom: z.boolean(),
  charisma: z.boolean(),
});

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
});

const createCharacterSchema = z.object({
  campaignId: z.string().uuid('Campaign ID is required and must be a UUID'),
  name: z.string().min(1, 'Character name is required'),
  race: z.string().min(1, 'Character race is required'),
  class: z.string().min(1, 'Character class is required'),
  level: z.number().int().min(1).max(20).optional(),
  background: z.string().optional(),
  alignment: z.string().optional(),
  abilityScores: abilityScoresSchema.optional(),
  maxHp: z.number().int().min(1).optional(),
  armorClass: z.number().int().min(1).optional(),
  proficiencyBonus: z.number().int().min(2).max(6).optional(),
  speed: z.number().int().min(0).optional(),
  savingThrows: savingThrowsSchema.optional(),
  skills: skillsSchema.optional(),
  hitDice: z.string().optional(),
  hitDiceRemaining: z.number().int().min(0).optional(),
  deathSaves: z.object({ successes: z.number(), failures: z.number() }).optional(),
  experience: z.number().int().min(0).optional(),
  spellcastingAbility: z.string().optional(),
  spellSaveDC: z.number().int().optional(),
  spellAttackBonus: z.number().int().optional(),
  notes: z.string().optional(),
  syncEnabled: z.boolean().optional(),
  // Starting equipment — not persisted on character directly, used to create inventory items
  startingEquipment: z.array(z.string()).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const validation = getCharactersSchema.safeParse(Object.fromEntries(searchParams));

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues },
        { status: 400 }
      );
    }
    const { campaignId } = validation.data;

    const characters = await characterService.getCharactersByCampaign(campaignId);
    return NextResponse.json({ success: true, data: characters });
  } catch (error) {
    console.error('Error fetching characters:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch characters' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = createCharacterSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues },
        { status: 400 }
      );
    }

    const {
      campaignId, name, race, class: charClass, level, background,
      alignment, abilityScores, maxHp, armorClass, proficiencyBonus,
      speed, savingThrows, skills, hitDice, hitDiceRemaining,
      deathSaves, experience, spellcastingAbility, spellSaveDC,
      spellAttackBonus, notes, syncEnabled, startingEquipment,
    } = validation.data;

    // Generate spell slots based on class and level
    const charLevel = level || 1;
    const spellSlots = spellcastingAbility ? getSpellSlots(charClass, charLevel) : undefined;

    const character = await characterService.createCharacter({
      campaignId,
      name,
      race,
      class: charClass,
      level,
      background,
      alignment,
      abilityScores,
      maxHp,
      armorClass,
      proficiencyBonus,
      speed,
      savingThrows,
      skills,
      hitDice,
      hitDiceRemaining,
      deathSaves,
      experience,
      spellcastingAbility,
      spellSaveDC,
      spellAttackBonus,
      spellSlots: Object.keys(spellSlots || {}).length > 0 ? spellSlots : undefined,
      notes,
      syncEnabled,
    });

    // Add starting spells from SRD defaults based on class
    const classLower = charClass.toLowerCase();
    const startingSpells = DEFAULT_STARTING_SPELLS[classLower];
    if (startingSpells && spellcastingAbility) {
      const srdSpells = getSpellsByClass(charClass);
      // Add cantrips
      for (const cantripName of startingSpells.cantrips) {
        const srd = srdSpells.find(s => s.name === cantripName);
        if (srd) {
          try {
            await characterService.addSpell(character.id, {
              name: srd.name,
              level: 0,
              school: srd.school,
              castingTime: srd.castingTime,
              range: srd.range,
              components: srd.components,
              duration: srd.duration,
              description: srd.description,
              prepared: true, // Cantrips are always prepared
              ritual: false,
              concentration: srd.duration.toLowerCase().includes('concentration'),
            });
          } catch (e) { console.warn(`Failed to add cantrip '${cantripName}':`, e); }
        }
      }
      // Add level 1+ spells
      for (const spellName of startingSpells.spells) {
        const srd = srdSpells.find(s => s.name === spellName);
        if (srd) {
          try {
            await characterService.addSpell(character.id, {
              name: srd.name,
              level: srd.level,
              school: srd.school,
              castingTime: srd.castingTime,
              range: srd.range,
              components: srd.components,
              duration: srd.duration,
              description: srd.description,
              prepared: true,
              ritual: false,
              concentration: srd.duration.toLowerCase().includes('concentration'),
            });
          } catch (e) { console.warn(`Failed to add spell '${spellName}':`, e); }
        }
      }
    }

    // Add starting equipment as inventory items
    if (startingEquipment && startingEquipment.length > 0) {
      for (const itemName of startingEquipment) {
        try {
          await characterService.addInventoryItem(character.id, {
            name: itemName,
            type: 'gear',
            quantity: 1,
            weight: 0,
            value: 0,
            description: 'Starting equipment',
            equipped: false,
            attuned: false,
            requiresAttunement: false,
            magical: false,
          });
        } catch (e) {
          console.warn(`Failed to add starting equipment '${itemName}':`, e);
        }
      }
    }

    return NextResponse.json({ success: true, data: character }, { status: 201 });
  } catch (error) {
    console.error('Error creating character:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create character' },
      { status: 500 }
    );
  }
}
