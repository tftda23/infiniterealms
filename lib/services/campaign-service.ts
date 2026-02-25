import { query, transaction } from '../db';
import type { Campaign, GameState, NPC, Quest, Location, Faction } from '@/types';

// ============================================
// Campaign CRUD Operations
// ============================================

export async function createCampaign(data: {
  name: string;
  description?: string;
  worldSetting?: string;
  difficultyLevel?: Campaign['difficultyLevel'];
  dmPersonality?: string;
}): Promise<Campaign> {
  const result = await query(
    `INSERT INTO campaigns (name, description, world_setting, difficulty_level, dm_personality)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [
      data.name,
      data.description || '',
      data.worldSetting || 'Generic Fantasy',
      data.difficultyLevel || 'normal',
      data.dmPersonality || 'A wise and fair Dungeon Master who creates immersive adventures.',
    ]
  );

  const campaign = mapCampaignRow(result.rows[0]);

  // Create initial game state
  await query(
    `INSERT INTO game_state (campaign_id) VALUES ($1)`,
    [campaign.id]
  );

  return campaign;
}

export async function getCampaign(id: string): Promise<Campaign | null> {
  const result = await query(
    `SELECT * FROM campaigns WHERE id = $1`,
    [id]
  );
  return result.rows[0] ? mapCampaignRow(result.rows[0]) : null;
}

export async function getAllCampaigns(): Promise<Campaign[]> {
  const result = await query(
    `SELECT * FROM campaigns ORDER BY last_played_at DESC`
  );
  return result.rows.map(mapCampaignRow);
}

export async function updateCampaign(
  id: string,
  updates: Partial<Campaign>
): Promise<Campaign | null> {
  const setClauses: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  const fieldMap: Record<string, string> = {
    name: 'name',
    description: 'description',
    worldSetting: 'world_setting',
    currentScene: 'current_scene',
    currentLocation: 'current_location',
    themes: 'themes',
    difficultyLevel: 'difficulty_level',
    rulesEnforcement: 'rules_enforcement',
    npcs: 'npcs',
    quests: 'quests',
    locations: 'locations',
    factions: 'factions',
    sessionCount: 'session_count',
    totalPlaytime: 'total_playtime',
    dmPersonality: 'dm_personality',
  };

  for (const [key, value] of Object.entries(updates)) {
    if (fieldMap[key] && value !== undefined) {
      const dbField = fieldMap[key];
      if (['npcs', 'quests', 'locations', 'factions'].includes(key)) {
        setClauses.push(`${dbField} = $${paramIndex}::jsonb`);
        values.push(JSON.stringify(value));
      } else if (key === 'themes') {
        setClauses.push(`${dbField} = $${paramIndex}`);
        values.push(value);
      } else {
        setClauses.push(`${dbField} = $${paramIndex}`);
        values.push(value);
      }
      paramIndex++;
    }
  }

  if (setClauses.length === 0) return getCampaign(id);

  setClauses.push(`updated_at = NOW()`);
  values.push(id);

  const result = await query(
    `UPDATE campaigns SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values
  );

  return result.rows[0] ? mapCampaignRow(result.rows[0]) : null;
}

export async function deleteCampaign(id: string): Promise<boolean> {
  const result = await query(
    `DELETE FROM campaigns WHERE id = $1`,
    [id]
  );
  return (result.rowCount ?? 0) > 0;
}

export async function updateLastPlayed(id: string): Promise<void> {
  await query(
    `UPDATE campaigns SET last_played_at = NOW() WHERE id = $1`,
    [id]
  );
}

// ============================================
// Game State Operations
// ============================================

export async function getGameState(campaignId: string): Promise<GameState | null> {
  const result = await query(
    `SELECT * FROM game_state WHERE campaign_id = $1`,
    [campaignId]
  );
  return result.rows[0] ? mapGameStateRow(result.rows[0]) : null;
}

export async function updateGameState(
  campaignId: string,
  updates: Partial<GameState>
): Promise<GameState | null> {
  const setClauses: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  const fieldMap: Record<string, string> = {
    inCombat: 'in_combat',
    initiativeOrder: 'initiative_order',
    currentTurn: 'current_turn',
    round: 'round',
    currentScene: 'current_scene',
    currentSceneImageUrl: 'current_scene_image_url',
    timeOfDay: 'time_of_day',
    weather: 'weather',
    partyGold: 'party_gold',
    partyInventory: 'party_inventory',
  };

  for (const [key, value] of Object.entries(updates)) {
    if (fieldMap[key] && value !== undefined) {
      const dbField = fieldMap[key];
      if (['initiativeOrder', 'partyInventory'].includes(key)) {
        setClauses.push(`${dbField} = $${paramIndex}::jsonb`);
        values.push(JSON.stringify(value));
      } else {
        setClauses.push(`${dbField} = $${paramIndex}`);
        values.push(value);
      }
      paramIndex++;
    }
  }

  if (setClauses.length === 0) return getGameState(campaignId);

  setClauses.push(`updated_at = NOW()`);
  values.push(campaignId);

  const result = await query(
    `UPDATE game_state SET ${setClauses.join(', ')} WHERE campaign_id = $${paramIndex} RETURNING *`,
    values
  );

  return result.rows[0] ? mapGameStateRow(result.rows[0]) : null;
}

// ============================================
// NPC Operations
// ============================================

export async function addNpc(campaignId: string, npc: Omit<NPC, 'id'>): Promise<Campaign | null> {
  const campaign = await getCampaign(campaignId);
  if (!campaign) return null;

  const newNpc: NPC = {
    ...npc,
    id: crypto.randomUUID(),
  };

  const updatedNpcs = [...campaign.npcs, newNpc];
  return updateCampaign(campaignId, { npcs: updatedNpcs });
}

export async function updateNpc(
  campaignId: string,
  npcId: string,
  updates: Partial<NPC>
): Promise<Campaign | null> {
  const campaign = await getCampaign(campaignId);
  if (!campaign) return null;

  const updatedNpcs = campaign.npcs.map(npc =>
    npc.id === npcId ? { ...npc, ...updates } : npc
  );

  return updateCampaign(campaignId, { npcs: updatedNpcs });
}

// ============================================
// Quest Operations
// ============================================

export async function addQuest(campaignId: string, quest: Omit<Quest, 'id' | 'createdAt'>): Promise<Campaign | null> {
  const campaign = await getCampaign(campaignId);
  if (!campaign) return null;

  const newQuest: Quest = {
    ...quest,
    id: crypto.randomUUID(),
    createdAt: new Date(),
  };

  const updatedQuests = [...campaign.quests, newQuest];
  return updateCampaign(campaignId, { quests: updatedQuests });
}

export async function updateQuest(
  campaignId: string,
  questId: string,
  updates: Partial<Quest>
): Promise<Campaign | null> {
  const campaign = await getCampaign(campaignId);
  if (!campaign) return null;

  const updatedQuests = campaign.quests.map(quest =>
    quest.id === questId ? { ...quest, ...updates } : quest
  );

  return updateCampaign(campaignId, { quests: updatedQuests });
}

// ============================================
// Row Mappers
// ============================================

function mapCampaignRow(row: Record<string, unknown>): Campaign {
  return {
    id: row.id as string,
    name: row.name as string,
    description: row.description as string,
    worldSetting: row.world_setting as string,
    currentScene: row.current_scene as string,
    currentLocation: row.current_location as string,
    themes: row.themes as string[],
    difficultyLevel: row.difficulty_level as Campaign['difficultyLevel'],
    rulesEnforcement: row.rules_enforcement as Campaign['rulesEnforcement'],
    npcs: (row.npcs as NPC[]) || [],
    quests: (row.quests as Quest[]) || [],
    locations: (row.locations as Location[]) || [],
    factions: (row.factions as Faction[]) || [],
    sessionCount: (row.session_count as number) || 0,
    totalPlaytime: (row.total_playtime as number) || 0,
    aiModel: (row.ai_model as string) || 'gpt-4o',
    dmPersonality: row.dm_personality as string,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
    lastPlayedAt: new Date(row.last_played_at as string),
  };
}

function mapGameStateRow(row: Record<string, unknown>): GameState {
  return {
    id: row.id as string,
    campaignId: row.campaign_id as string,
    inCombat: row.in_combat as boolean,
    initiativeOrder: row.initiative_order as GameState['initiativeOrder'],
    currentTurn: row.current_turn as number,
    round: row.round as number,
    currentScene: row.current_scene as string,
    currentSceneImageUrl: row.current_scene_image_url as string | undefined,
    timeOfDay: row.time_of_day as GameState['timeOfDay'],
    weather: row.weather as string,
    partyGold: row.party_gold as number,
    partyInventory: row.party_inventory as GameState['partyInventory'],
    updatedAt: new Date(row.updated_at as string),
  };
}
