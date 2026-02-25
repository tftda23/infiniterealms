import { openai } from '@ai-sdk/openai';
import { streamText, CoreMessage } from 'ai';
import { createDMTools } from './tools';
import * as campaignService from '../services/campaign-service';
import * as characterService from '../services/character-service';
import * as messageService from '../services/message-service';
import type { Campaign, Character, GameState, ChatMessage } from '../../types';

// ============================================
// DM Engine - Core AI Integration
// ============================================

export interface DMContext {
  campaign: Campaign;
  characters: Character[];
  gameState: GameState;
  recentMessages: ChatMessage[];
}

export async function loadDMContext(campaignId: string): Promise<DMContext | null> {
  const [campaign, characters, gameState, recentMessages] = await Promise.all([
    campaignService.getCampaign(campaignId),
    characterService.getCharactersByCampaign(campaignId),
    campaignService.getGameState(campaignId),
    messageService.getRecentMessages(campaignId, 30),
  ]);

  if (!campaign || !gameState) return null;

  return { campaign, characters, gameState, recentMessages };
}

export function buildSystemPrompt(context: DMContext): string {
  const { campaign, characters, gameState } = context;

  const characterSummaries = characters.map(c => {
    return `- ${c.name}: Level ${c.level} ${c.race} ${c.class}, HP: ${c.currentHp}/${c.maxHp}, AC: ${c.armorClass}`;
  }).join('\n');

  const npcSummaries = campaign.npcs.slice(0, 10).map(npc => {
    return `- ${npc.name} (${npc.race} ${npc.occupation}): ${npc.disposition}, at ${npc.location}`;
  }).join('\n');

  const questSummaries = campaign.quests
    .filter(q => q.status === 'active')
    .map(q => `- ${q.name}: ${q.description}`)
    .join('\n');

  const combatStatus = gameState.inCombat
    ? `\n**COMBAT ACTIVE** - Round ${gameState.round}, Current Turn: ${gameState.initiativeOrder[gameState.currentTurn]?.name || 'Unknown'}`
    : '';

  return `You are an expert Dungeon Master running a solo D&D 5th Edition campaign.

## Campaign: ${campaign.name}
${campaign.description}

## World Setting
${campaign.worldSetting}

## DM Style
${campaign.dmPersonality}

## Current Party
${characterSummaries || 'No characters created yet.'}

## Known NPCs
${npcSummaries || 'None yet.'}

## Active Quests
${questSummaries || 'None yet.'}

## Current Scene
${gameState.currentScene || 'The adventure begins...'}
Location: ${campaign.currentLocation || 'Unknown'}
Time: ${gameState.timeOfDay}, Weather: ${gameState.weather}
Party Gold: ${gameState.partyGold} gp
${combatStatus}

## Rules
- Difficulty: ${campaign.difficultyLevel}
- Rules Enforcement: ${campaign.rulesEnforcement}

## Your Role
1. Narrate the story vividly and respond to player actions
2. Use tools to track NPCs, quests, items, gold, and combat
3. Roll dice when appropriate using the rollDice tool
4. Enforce D&D 5e rules based on the rules enforcement setting
5. Create engaging encounters, puzzles, and roleplay opportunities
6. Track HP changes when damage is dealt or healing occurs
7. Use setScene to update when the party moves to new locations
8. Add new NPCs with addNpc when the party meets someone important
9. Add quests with addQuest when the party receives new objectives

## Combat Flow (CRITICAL)
When combat is active, follow this EXACT loop:
1. On a PLAYER'S turn: Briefly describe the situation and WAIT for the player to declare their action. Do NOT act for the player.
2. After the player acts: Narrate the result, then call advanceTurn to move to the next combatant.
3. On an NPC's turn: Immediately call npcAction with the NPC's attack/action. After npcAction resolves, call advanceTurn.
4. On a DEFEATED combatant's turn: Call advanceTurn immediately to skip them.
5. Keep cycling through steps 2-4 automatically until it is a PLAYER's turn again. NEVER stop mid-round waiting for the player to type "continue".
6. When calling advanceTurn, if the result says it's another NPC turn, handle that NPC immediately with npcAction. Chain through all NPC turns until you reach a player's turn.

## Dice Rolls & Hidden Information
- NEVER show the player DC breakdowns, outcome tiers, or success/failure thresholds. The player should NOT see text like "On 1-9 (Failure): ..." or "DC 12" in your narration.
- When you need a skill check, call requestRoll or requestSavingThrow. The system will handle the roll and tell you the result.
- Narrate outcomes AFTER the roll result comes back, not before. Do not pre-describe what different roll results would mean.
- Keep mechanical details (exact DCs, attack bonuses, damage formulas) hidden. The player should experience the story, not the spreadsheet.

Keep responses immersive and in-character as the DM. Describe outcomes of actions, speak as NPCs when appropriate, and advance the story.`;
}

export function buildMessageHistory(messages: ChatMessage[]): CoreMessage[] {
  return messages.map(msg => ({
    role: msg.role as 'user' | 'assistant' | 'system',
    content: msg.content,
  }));
}

export interface StreamDMResponseOptions {
  campaignId: string;
  userMessage: string;
  apiKey?: string;
}

export async function streamDMResponse(options: StreamDMResponseOptions) {
  const { campaignId, userMessage, apiKey } = options;

  // Load context
  const context = await loadDMContext(campaignId);
  if (!context) {
    throw new Error('Campaign not found');
  }

  // Save user message
  await messageService.createMessage({
    campaignId,
    role: 'user',
    content: userMessage,
  });

  // Build prompts
  const systemPrompt = buildSystemPrompt(context);
  const messageHistory = buildMessageHistory(context.recentMessages);

  // Add current user message
  messageHistory.push({ role: 'user', content: userMessage });

  // Create tools
  const tools = createDMTools(campaignId);

  // Configure model
  const model = openai(context.campaign.aiModel || 'gpt-4o');

  // Stream response
  const result = streamText({
    model,
    system: systemPrompt,
    messages: messageHistory,
    tools,
    maxSteps: 10, // Allow multiple tool calls
    temperature: 0.8,
  });

  return result;
}

// ============================================
// Scene Image Generation
// ============================================

export async function generateSceneImage(
  description: string,
  theme: string,
  apiKey?: string
): Promise<string | null> {
  const { default: OpenAI } = await import('openai');

  const client = new OpenAI({
    apiKey: apiKey || process.env.OPENAI_API_KEY,
  });

  const prompt = `Fantasy RPG scene, ${theme} setting: ${description}. Detailed digital art, dramatic lighting, cinematic composition. Style: fantasy illustration, concept art.`;

  try {
    const response = await client.images.generate({
      model: 'dall-e-3',
      prompt,
      n: 1,
      size: '1792x1024',
      quality: 'standard',
    });

    return response.data?.[0]?.url || null;
  } catch (error) {
    console.error('Scene image generation failed:', error);
    return null;
  }
}

// ============================================
// Session Summary Generation
// ============================================

export async function generateSessionSummary(
  campaignId: string,
  apiKey?: string
): Promise<string> {
  const messages = await messageService.getRecentMessages(campaignId, 50);
  const campaign = await campaignService.getCampaign(campaignId);

  if (!campaign || messages.length === 0) {
    return 'No session activity to summarize.';
  }

  const { default: OpenAI } = await import('openai');

  const client = new OpenAI({
    apiKey: apiKey || process.env.OPENAI_API_KEY,
  });

  const conversationText = messages
    .map(m => `${m.role.toUpperCase()}: ${m.content}`)
    .join('\n\n');

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'You are a helpful assistant that summarizes D&D session logs. Create a concise but evocative summary highlighting key events, discoveries, battles, and character moments.',
      },
      {
        role: 'user',
        content: `Summarize this D&D session for the campaign "${campaign.name}":\n\n${conversationText}`,
      },
    ],
    temperature: 0.7,
    max_tokens: 500,
  });

  return response.choices[0]?.message?.content || 'Unable to generate summary.';
}

// ============================================
// Suggested Actions
// ============================================

export async function suggestActions(
  campaignId: string,
  apiKey?: string
): Promise<string[]> {
  const context = await loadDMContext(campaignId);
  if (!context) return [];

  const { default: OpenAI } = await import('openai');

  const client = new OpenAI({
    apiKey: apiKey || process.env.OPENAI_API_KEY,
  });

  const prompt = `Based on the current D&D scene, suggest 4 possible actions for the player:

Scene: ${context.gameState.currentScene}
Location: ${context.campaign.currentLocation}
${context.gameState.inCombat ? 'Currently in combat!' : ''}

Active quests: ${context.campaign.quests.filter(q => q.status === 'active').map(q => q.name).join(', ') || 'None'}

Provide exactly 4 short action suggestions (each under 50 characters), one per line. Mix combat options, exploration, and roleplay.`;

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.9,
    max_tokens: 200,
  });

  const suggestions = response.choices[0]?.message?.content
    ?.split('\n')
    .map(s => s.replace(/^\d+\.\s*/, '').trim())
    .filter(s => s.length > 0 && s.length < 60)
    .slice(0, 4) || [];

  return suggestions;
}
