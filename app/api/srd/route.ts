import { NextRequest, NextResponse } from 'next/server';
import {
  SRD_MONSTERS,
  SRD_SPELLS,
  SRD_ITEMS,
  findMonsterByName,
  findClosestMonster,
  getMonstersByChallenge,
  getMonstersByEnvironment,
  findSpellByName,
  getSpellsByClass,
  getSpellsByLevel,
  findItemByName,
  getItemsByType,
  getItemsByRarity,
} from '@/lib/srd-data';
import { z } from 'zod';

// Validation schemas
const srdQuerySchema = z.object({
  type: z.enum(['monsters', 'spells', 'items']),
  search: z.string().optional(),
  cr: z.coerce.number().optional(),
  env: z.string().optional(),
  class: z.string().optional(),
  level: z.coerce.number().optional(),
  itemType: z.string().optional(),
  rarity: z.string().optional(),
  fuzzy: z.enum(['true', 'false']).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const validation = srdQuerySchema.safeParse(Object.fromEntries(searchParams));

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid query parameters', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { type, search, cr, env, fuzzy, class: spellClass, level, itemType, rarity } = validation.data;

    let data: any[] = [];

    if (type === 'monsters') {
      if (search) {
        // Search by name
        const isFuzzy = fuzzy === 'true';
        const monster = isFuzzy ? findClosestMonster(search) : findMonsterByName(search);
        data = monster ? [monster] : [];
      } else if (cr !== undefined) {
        // Filter by challenge rating
        data = getMonstersByChallenge(cr);
      } else if (env) {
        // Filter by environment
        data = getMonstersByEnvironment(env);
      } else {
        // Return all monsters
        data = SRD_MONSTERS;
      }
    } else if (type === 'spells') {
      if (search) {
        // Search by name
        const spell = findSpellByName(search);
        data = spell ? [spell] : [];
      } else if (spellClass) {
        // Filter by class
        data = getSpellsByClass(spellClass);

        // Further filter by level if provided
        if (level !== undefined) {
          data = data.filter(s => s.level === level);
        }
      } else if (level !== undefined) {
        // Filter by level only
        data = getSpellsByLevel(level);
      } else {
        // Return all spells
        data = SRD_SPELLS;
      }
    } else if (type === 'items') {
      if (search) {
        // Search by name
        const item = findItemByName(search);
        data = item ? [item] : [];
      } else if (itemType) {
        // Filter by item type
        data = getItemsByType(itemType);

        // Further filter by rarity if provided
        if (rarity) {
          data = data.filter(i => i.rarity === rarity);
        }
      } else if (rarity) {
        // Filter by rarity only
        data = getItemsByRarity(rarity);
      } else {
        // Return all items
        data = SRD_ITEMS;
      }
    }

    return NextResponse.json({
      success: true,
      type,
      count: data.length,
      data,
    });
  } catch (error) {
    console.error('Error fetching SRD data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch SRD data' },
      { status: 500 }
    );
  }
}
