import type { Character, DndBeyondCharacter, DndBeyondSyncResult, AbilityScores } from '../../types';
import { updateCharacter } from './character-service';

// ============================================
// D&D Beyond Character Sync
// ============================================

const DNDBEYOND_API = 'https://character-service.dndbeyond.com/character/v5/character';

// Ability ID to name mapping for D&D Beyond
const ABILITY_MAP: Record<number, keyof AbilityScores> = {
  1: 'strength',
  2: 'dexterity',
  3: 'constitution',
  4: 'intelligence',
  5: 'wisdom',
  6: 'charisma',
};

export async function fetchDndBeyondCharacter(
  characterId: string
): Promise<DndBeyondCharacter | null> {
  try {
    const response = await fetch(`${DNDBEYOND_API}/${characterId}`, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('D&D Beyond fetch failed:', response.status);
      return null;
    }

    const data = await response.json();
    return data.data as DndBeyondCharacter;
  } catch (error) {
    console.error('Error fetching D&D Beyond character:', error);
    return null;
  }
}

export function parseDndBeyondCharacter(
  ddbChar: DndBeyondCharacter
): Partial<Character> {
  // Parse ability scores
  const abilityScores: AbilityScores = {
    strength: 10,
    dexterity: 10,
    constitution: 10,
    intelligence: 10,
    wisdom: 10,
    charisma: 10,
  };

  for (const stat of ddbChar.stats) {
    const abilityName = ABILITY_MAP[stat.id];
    if (abilityName) {
      abilityScores[abilityName] = stat.value;
    }
  }

  // Calculate total level
  const totalLevel = ddbChar.classes.reduce((sum, cls) => sum + cls.level, 0);

  // Get primary class
  const primaryClass = ddbChar.classes.sort((a, b) => b.level - a.level)[0];

  // Calculate HP
  const maxHp = ddbChar.baseHitPoints + ddbChar.bonusHitPoints;
  const currentHp = maxHp - ddbChar.removedHitPoints;

  return {
    name: ddbChar.name,
    race: ddbChar.race.fullName,
    class: primaryClass?.definition.name || 'Unknown',
    subclass: primaryClass?.subclassDefinition?.name,
    level: totalLevel,
    background: ddbChar.background?.definition?.name || '',
    abilityScores,
    maxHp,
    currentHp,
    tempHp: ddbChar.temporaryHitPoints,
    experience: ddbChar.currentXp,
    portraitUrl: ddbChar.avatarUrl,
    dndbeyondId: String(ddbChar.id),
    lastSyncedAt: new Date(),
  };
}

export async function syncCharacterFromDndBeyond(
  localCharacter: Character
): Promise<DndBeyondSyncResult> {
  if (!localCharacter.dndbeyondId) {
    return {
      success: false,
      error: 'No D&D Beyond character linked',
    };
  }

  const ddbChar = await fetchDndBeyondCharacter(localCharacter.dndbeyondId);
  if (!ddbChar) {
    return {
      success: false,
      error: 'Failed to fetch character from D&D Beyond',
    };
  }

  const updates = parseDndBeyondCharacter(ddbChar);
  const changes: string[] = [];

  // Track what changed
  if (updates.name !== localCharacter.name) changes.push('name');
  if (updates.level !== localCharacter.level) changes.push('level');
  if (updates.maxHp !== localCharacter.maxHp) changes.push('max HP');
  if (updates.currentHp !== localCharacter.currentHp) changes.push('current HP');

  // Apply updates
  const updatedCharacter = await updateCharacter(localCharacter.id, {
    ...updates,
    syncEnabled: true,
  });

  return {
    success: true,
    character: updatedCharacter || undefined,
    changes,
  };
}

export function extractDndBeyondId(url: string): string | null {
  // Match URLs like:
  // https://www.dndbeyond.com/characters/12345678
  // https://dndbeyond.com/characters/12345678/some-name
  const match = url.match(/dndbeyond\.com\/characters\/(\d+)/);
  return match ? match[1] : null;
}

export async function importCharacterFromUrl(
  campaignId: string,
  url: string
): Promise<{ success: boolean; character?: Partial<Character>; error?: string }> {
  const dndbeyondId = extractDndBeyondId(url);
  if (!dndbeyondId) {
    return {
      success: false,
      error: 'Invalid D&D Beyond URL',
    };
  }

  const ddbChar = await fetchDndBeyondCharacter(dndbeyondId);
  if (!ddbChar) {
    return {
      success: false,
      error: 'Failed to fetch character from D&D Beyond',
    };
  }

  const characterData = parseDndBeyondCharacter(ddbChar);

  return {
    success: true,
    character: {
      ...characterData,
      dndbeyondUrl: url,
      syncEnabled: true,
    },
  };
}
