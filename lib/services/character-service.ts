import { query, transaction } from '../db';
import type { Character, InventoryItem, Spell, AbilityScores, SavingThrows, Skills } from '../../types';

// ============================================
// Character CRUD Operations
// ============================================

export async function createCharacter(data: {
  campaignId: string;
  name: string;
  race: string;
  class: string;
  level?: number;
  background?: string;
  alignment?: string;
  abilityScores?: AbilityScores;
  maxHp?: number;
  armorClass?: number;
  proficiencyBonus?: number;
  speed?: number;
  savingThrows?: SavingThrows;
  skills?: Skills;
  hitDice?: string;
  hitDiceRemaining?: number;
  deathSaves?: { successes: number; failures: number };
  experience?: number;
  spellcastingAbility?: string;
  spellSaveDC?: number;
  spellAttackBonus?: number;
  spellSlots?: Character['spellSlots'];
  notes?: string;
  syncEnabled?: boolean;
}): Promise<Character> {
  const abilityScores = data.abilityScores || {
    strength: 10,
    dexterity: 10,
    constitution: 10,
    intelligence: 10,
    wisdom: 10,
    charisma: 10,
  };

  const level = data.level || 1;
  const maxHp = data.maxHp || 10;
  const profBonus = data.proficiencyBonus || (Math.floor((level - 1) / 4) + 2);
  const armorClass = data.armorClass || (10 + Math.floor((abilityScores.dexterity - 10) / 2));
  const speed = data.speed || 30;
  const savingThrows = data.savingThrows || {
    strength: false, dexterity: false, constitution: false,
    intelligence: false, wisdom: false, charisma: false,
  };
  const skills = data.skills || {
    acrobatics: false, animalHandling: false, arcana: false, athletics: false,
    deception: false, history: false, insight: false, intimidation: false,
    investigation: false, medicine: false, nature: false, perception: false,
    performance: false, persuasion: false, religion: false, sleightOfHand: false,
    stealth: false, survival: false,
  };
  const hitDice = data.hitDice || `${level}d8`;
  const hitDiceRemaining = data.hitDiceRemaining ?? level;
  const deathSaves = data.deathSaves || { successes: 0, failures: 0 };

  return transaction(async (client) => {
    const result = await client.query(
      `INSERT INTO characters (
        campaign_id, name, race, class, level, background, alignment,
        ability_scores, max_hp, current_hp, proficiency_bonus,
        armor_class, speed, saving_throws, skills,
        hit_dice, hit_dice_remaining, death_saves, experience,
        spellcasting_ability, spell_save_dc, spell_attack_bonus, spell_slots,
        notes, sync_enabled
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
      RETURNING *`,
      [
        data.campaignId,
        data.name,
        data.race,
        data.class,
        level,
        data.background || '',
        data.alignment || '',
        JSON.stringify(abilityScores),
        maxHp,
        profBonus,
        armorClass,
        speed,
        JSON.stringify(savingThrows),
        JSON.stringify(skills),
        hitDice,
        hitDiceRemaining,
        JSON.stringify(deathSaves),
        data.experience || 0,
        data.spellcastingAbility || null,
        data.spellSaveDC || null,
        data.spellAttackBonus || null,
        JSON.stringify(data.spellSlots || {}),
        data.notes || '',
        data.syncEnabled ?? false,
      ]
    );

    return mapCharacterRow(result.rows[0]);
  });
}

export async function getCharacter(id: string): Promise<Character | null> {
  const result = await query(
    `SELECT * FROM characters WHERE id = $1`,
    [id]
  );
  return result.rows[0] ? mapCharacterRow(result.rows[0]) : null;
}

export async function getCharactersByCampaign(campaignId: string): Promise<Character[]> {
  const result = await query(
    `SELECT * FROM characters WHERE campaign_id = $1 ORDER BY created_at ASC`,
    [campaignId]
  );
  return result.rows.map(mapCharacterRow);
}

export async function updateCharacter(
  id: string,
  updates: Partial<Character>
): Promise<Character | null> {
  const setClauses: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  const fieldMap: Record<string, string> = {
    name: 'name',
    race: 'race',
    class: 'class',
    subclass: 'subclass',
    level: 'level',
    background: 'background',
    alignment: 'alignment',
    experience: 'experience',
    abilityScores: 'ability_scores',
    maxHp: 'max_hp',
    currentHp: 'current_hp',
    tempHp: 'temp_hp',
    armorClass: 'armor_class',
    initiative: 'initiative',
    speed: 'speed',
    proficiencyBonus: 'proficiency_bonus',
    savingThrows: 'saving_throws',
    skills: 'skills',
    hitDice: 'hit_dice',
    hitDiceRemaining: 'hit_dice_remaining',
    deathSaves: 'death_saves',
    spellcastingAbility: 'spellcasting_ability',
    spellSaveDC: 'spell_save_dc',
    spellAttackBonus: 'spell_attack_bonus',
    spellSlots: 'spell_slots',
    dndbeyondId: 'dndbeyond_id',
    dndbeyondUrl: 'dndbeyond_url',
    lastSyncedAt: 'last_synced_at',
    syncEnabled: 'sync_enabled',
    portraitUrl: 'portrait_url',
    notes: 'notes',
  };

  const jsonFields = ['abilityScores', 'savingThrows', 'skills', 'deathSaves', 'spellSlots'];

  for (const [key, value] of Object.entries(updates)) {
    if (fieldMap[key] && value !== undefined) {
      const dbField = fieldMap[key];
      if (jsonFields.includes(key)) {
        setClauses.push(`${dbField} = $${paramIndex}::jsonb`);
        values.push(JSON.stringify(value));
      } else {
        setClauses.push(`${dbField} = $${paramIndex}`);
        values.push(value);
      }
      paramIndex++;
    }
  }

  if (setClauses.length === 0) return getCharacter(id);

  setClauses.push(`updated_at = NOW()`);
  values.push(id);

  const result = await query(
    `UPDATE characters SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values
  );

  return result.rows[0] ? mapCharacterRow(result.rows[0]) : null;
}

export async function deleteCharacter(id: string): Promise<boolean> {
  const result = await query(
    `DELETE FROM characters WHERE id = $1`,
    [id]
  );
  return (result.rowCount ?? 0) > 0;
}

// ============================================
// HP Management
// ============================================

export async function healCharacter(id: string, amount: number): Promise<Character | null> {
  if (amount < 0) {
    throw new Error('Heal amount must be non-negative');
  }
  const char = await getCharacter(id);
  if (!char) return null;

  const newHp = Math.min(char.currentHp + amount, char.maxHp);
  return updateCharacter(id, { currentHp: newHp });
}

export async function damageCharacter(id: string, amount: number): Promise<Character | null> {
  if (amount < 0) {
    throw new Error('Damage amount must be non-negative');
  }
  const char = await getCharacter(id);
  if (!char) return null;

  // Damage temp HP first
  let remaining = amount;
  let newTempHp = char.tempHp;
  let newCurrentHp = char.currentHp;

  if (char.tempHp > 0) {
    if (char.tempHp >= remaining) {
      newTempHp = char.tempHp - remaining;
      remaining = 0;
    } else {
      remaining -= char.tempHp;
      newTempHp = 0;
    }
  }

  newCurrentHp = Math.max(0, char.currentHp - remaining);

  return updateCharacter(id, { currentHp: newCurrentHp, tempHp: newTempHp });
}

export async function addTempHp(id: string, amount: number): Promise<Character | null> {
  const char = await getCharacter(id);
  if (!char) return null;

  // Temp HP doesn't stack - take the higher value
  const newTempHp = Math.max(char.tempHp, amount);
  return updateCharacter(id, { tempHp: newTempHp });
}

// ============================================
// Rest Functions
// ============================================

export async function shortRest(id: string, hitDiceUsed: number): Promise<Character | null> {
  const char = await getCharacter(id);
  if (!char) return null;

  // Validate hit dice usage
  if (hitDiceUsed > char.hitDiceRemaining) {
    throw new Error('Not enough hit dice remaining');
  }

  // Roll hit dice for healing (simplified - uses average)
  const hitDieSize = parseInt(char.hitDice.split('d')[1]) || 8;
  const conMod = Math.floor((char.abilityScores.constitution - 10) / 2);
  const healPerDie = Math.floor(hitDieSize / 2) + 1 + conMod;
  const totalHeal = healPerDie * hitDiceUsed;

  const newHp = Math.min(char.currentHp + totalHeal, char.maxHp);
  const newHitDice = char.hitDiceRemaining - hitDiceUsed;

  return updateCharacter(id, {
    currentHp: newHp,
    hitDiceRemaining: newHitDice,
  });
}

export async function longRest(id: string): Promise<Character | null> {
  const char = await getCharacter(id);
  if (!char) return null;

  // Restore all HP
  // Restore half of max hit dice (minimum 1)
  const maxHitDice = char.level;
  const hitDiceToRestore = Math.max(1, Math.floor(maxHitDice / 2));
  const newHitDice = Math.min(char.hitDiceRemaining + hitDiceToRestore, maxHitDice);

  // Reset death saves
  const deathSaves = { successes: 0, failures: 0 };

  // Reset spell slots (if any)
  let spellSlots = char.spellSlots;
  if (spellSlots) {
    spellSlots = Object.fromEntries(
      Object.entries(spellSlots).map(([level, slot]) => [
        level,
        { ...slot, used: 0 },
      ])
    );
  }

  return updateCharacter(id, {
    currentHp: char.maxHp,
    tempHp: 0,
    hitDiceRemaining: newHitDice,
    deathSaves,
    spellSlots,
  });
}

// ============================================
// Inventory Operations
// ============================================

export async function getInventory(characterId: string): Promise<InventoryItem[]> {
  const result = await query(
    `SELECT * FROM inventory WHERE character_id = $1 ORDER BY type, name`,
    [characterId]
  );
  return result.rows.map(mapInventoryRow);
}

export async function addInventoryItem(
  characterId: string,
  item: Omit<InventoryItem, 'id' | 'characterId' | 'createdAt'>
): Promise<InventoryItem> {
  const result = await query(
    `INSERT INTO inventory (
      character_id, name, type, quantity, weight, value, description,
      equipped, attuned, requires_attunement, magical, rarity, properties
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    RETURNING *`,
    [
      characterId,
      item.name,
      item.type,
      item.quantity,
      item.weight,
      item.value,
      item.description,
      item.equipped,
      item.attuned,
      item.requiresAttunement,
      item.magical,
      item.rarity || null,
      item.properties || [],
    ]
  );
  return mapInventoryRow(result.rows[0]);
}

export async function updateInventoryItem(
  id: string,
  updates: Partial<InventoryItem>
): Promise<InventoryItem | null> {
  const setClauses: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  const fieldMap: Record<string, string> = {
    name: 'name',
    type: 'type',
    quantity: 'quantity',
    weight: 'weight',
    value: 'value',
    description: 'description',
    equipped: 'equipped',
    attuned: 'attuned',
    requiresAttunement: 'requires_attunement',
    magical: 'magical',
    rarity: 'rarity',
    properties: 'properties',
  };

  for (const [key, value] of Object.entries(updates)) {
    if (fieldMap[key] && value !== undefined) {
      setClauses.push(`${fieldMap[key]} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    }
  }

  if (setClauses.length === 0) return null;

  values.push(id);
  const result = await query(
    `UPDATE inventory SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values
  );

  return result.rows[0] ? mapInventoryRow(result.rows[0]) : null;
}

export async function removeInventoryItem(id: string): Promise<boolean> {
  // First try exact UUID match
  const result = await query(`DELETE FROM inventory WHERE id = $1`, [id]);
  if ((result.rowCount ?? 0) > 0) return true;

  // Fall back to case-insensitive name match (AI tools often pass item names, not IDs)
  const byName = await query(
    `DELETE FROM inventory WHERE id = (
      SELECT id FROM inventory WHERE LOWER(name) = LOWER($1) LIMIT 1
    )`,
    [id]
  );
  return (byName.rowCount ?? 0) > 0;
}

// ============================================
// Spell Operations
// ============================================

export async function getSpells(characterId: string): Promise<Spell[]> {
  const result = await query(
    `SELECT * FROM spells WHERE character_id = $1 ORDER BY level, name`,
    [characterId]
  );
  return result.rows.map(mapSpellRow);
}

export async function addSpell(
  characterId: string,
  spell: Omit<Spell, 'id' | 'characterId'>
): Promise<Spell> {
  const result = await query(
    `INSERT INTO spells (
      character_id, name, level, school, casting_time, range,
      components, duration, description, prepared, ritual, concentration
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    RETURNING *`,
    [
      characterId,
      spell.name,
      spell.level,
      spell.school,
      spell.castingTime,
      spell.range,
      spell.components,
      spell.duration,
      spell.description,
      spell.prepared,
      spell.ritual,
      spell.concentration,
    ]
  );
  return mapSpellRow(result.rows[0]);
}

export async function toggleSpellPrepared(id: string): Promise<Spell | null> {
  const result = await query(
    `UPDATE spells SET prepared = NOT prepared WHERE id = $1 RETURNING *`,
    [id]
  );
  return result.rows[0] ? mapSpellRow(result.rows[0]) : null;
}

export async function removeSpell(id: string): Promise<boolean> {
  const result = await query(`DELETE FROM spells WHERE id = $1`, [id]);
  return (result.rowCount ?? 0) > 0;
}

// ============================================
// Row Mappers
// ============================================

function mapCharacterRow(row: Record<string, unknown>): Character {
  return {
    id: row.id as string,
    campaignId: row.campaign_id as string,
    name: row.name as string,
    race: row.race as string,
    class: row.class as string,
    subclass: row.subclass as string | undefined,
    level: row.level as number,
    background: row.background as string,
    alignment: row.alignment as string,
    experience: row.experience as number,
    abilityScores: row.ability_scores as AbilityScores,
    maxHp: row.max_hp as number,
    currentHp: row.current_hp as number,
    tempHp: row.temp_hp as number,
    armorClass: row.armor_class as number,
    initiative: row.initiative as number,
    speed: row.speed as number,
    proficiencyBonus: row.proficiency_bonus as number,
    savingThrows: (row.saving_throws as SavingThrows) || {},
    skills: (row.skills as Skills) || {},
    hitDice: row.hit_dice as string,
    hitDiceRemaining: row.hit_dice_remaining as number,
    deathSaves: row.death_saves as Character['deathSaves'],
    spellcastingAbility: row.spellcasting_ability as string | undefined,
    spellSaveDC: row.spell_save_dc as number | undefined,
    spellAttackBonus: row.spell_attack_bonus as number | undefined,
    spellSlots: row.spell_slots as Character['spellSlots'],
    dndbeyondId: row.dndbeyond_id as string | undefined,
    dndbeyondUrl: row.dndbeyond_url as string | undefined,
    lastSyncedAt: row.last_synced_at ? new Date(row.last_synced_at as string) : undefined,
    syncEnabled: row.sync_enabled as boolean,
    portraitUrl: row.portrait_url as string | undefined,
    notes: row.notes as string,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  };
}

function mapInventoryRow(row: Record<string, unknown>): InventoryItem {
  return {
    id: row.id as string,
    characterId: row.character_id as string,
    name: row.name as string,
    type: row.type as InventoryItem['type'],
    quantity: row.quantity as number,
    weight: Number(row.weight),
    value: row.value as number,
    description: row.description as string,
    equipped: row.equipped as boolean,
    attuned: row.attuned as boolean,
    requiresAttunement: row.requires_attunement as boolean,
    magical: row.magical as boolean,
    rarity: row.rarity as InventoryItem['rarity'],
    properties: row.properties as string[],
    createdAt: new Date(row.created_at as string),
  };
}

function mapSpellRow(row: Record<string, unknown>): Spell {
  return {
    id: row.id as string,
    characterId: row.character_id as string,
    name: row.name as string,
    level: row.level as number,
    school: row.school as string,
    castingTime: row.casting_time as string,
    range: row.range as string,
    components: row.components as string,
    duration: row.duration as string,
    description: row.description as string,
    prepared: row.prepared as boolean,
    ritual: row.ritual as boolean,
    concentration: row.concentration as boolean,
  };
}
