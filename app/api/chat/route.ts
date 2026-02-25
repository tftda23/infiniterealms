import { NextRequest } from 'next/server';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as campaignService from '@/lib/services/campaign-service';
import * as characterService from '@/lib/services/character-service';
import * as messageService from '@/lib/services/message-service';
import * as settingsService from '@/lib/services/settings-service';
import * as contentService from '@/lib/services/campaign-content-service';
import { AI_PROVIDERS, getModelConfig } from '@/lib/ai-providers';
import { z } from 'zod';
import type { AIProvider } from '@/types';
import { HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

const geminiTools = [
  {
    function_declarations: [
      {
        name: 'requestDiceRoll',
        description: 'Request a dice roll from the player for a skill check, saving throw, or attack roll.',
        parameters: {
          type: 'object',
          properties: {
            skill: {
              type: 'string',
              description: 'The skill or ability to roll for (e.g., "Investigation", "Strength", "Initiative").',
            },
            dc: {
              type: 'number',
              description: 'The difficulty class (DC) of the check. If not applicable (like for Initiative), omit.',
            },
            isGroupRoll: {
              type: 'boolean',
              description: 'Whether this is a group roll for all players (e.g., group stealth or initiative).',
            },
          },
          required: ['skill'],
        },
      },
    ],
  },
  {
    function_declarations: [
      {
        name: 'requestSavingThrow',
        description: 'Request a saving throw from a player character or monster.',
        parameters: {
          type: 'object',
          properties: {
            ability: {
              type: 'string',
              description: 'The ability for the saving throw: "Strength", "Dexterity", "Constitution", "Intelligence", "Wisdom", or "Charisma".',
            },
            dc: {
              type: 'number',
              description: 'The difficulty class (DC) of the saving throw.',
            },
            characterName: {
              type: 'string',
              description: 'Name of specific character making the save (optional). If omitted, prompts the current character.',
            },
            source: {
              type: 'string',
              description: 'What caused the saving throw (e.g., "Dragon\'s breath weapon", "Fireball spell").',
            },
          },
          required: ['ability', 'dc'],
        },
      },
    ],
  },
  {
    function_declarations: [
      {
        name: 'startEncounter',
        description: 'Signals the start of a combat encounter, optionally specifying the initial combatants.',
        parameters: {
          type: 'object',
          properties: {
            combatants: {
              type: 'array',
              items: {
                type: 'string',
              },
              description: 'Names of the initial combatants in the encounter (e.g., "Goblin Sentry", "James").',
            },
          },
        },
      },
    ],
  },
  {
    function_declarations: [
      {
        name: 'endEncounter',
        description: 'Signals the end of a combat encounter. Call this when all enemies are defeated.',
        parameters: {
          type: 'object',
          properties: {},
        },
      },
    ],
  },
  {
    function_declarations: [
      {
        name: 'npcAction',
        description: 'Resolve an NPC combat action (attack). Rolls attack vs target AC and damage automatically. Use this for every NPC attack during combat.',
        parameters: {
          type: 'object',
          properties: {
            attackerName: {
              type: 'string',
              description: 'Name of the attacking NPC (must match initiative entry).',
            },
            targetName: {
              type: 'string',
              description: 'Name of the target (must match initiative entry).',
            },
            attackBonus: {
              type: 'number',
              description: 'Attack bonus (e.g., 4 for +4 to hit).',
            },
            damageDice: {
              type: 'string',
              description: 'Damage dice notation (e.g., "1d6+2", "2d6+3").',
            },
            description: {
              type: 'string',
              description: 'Brief vivid description of the attack (e.g., "lunges with its scimitar").',
            },
            damageType: {
              type: 'string',
              description: 'Damage type (slashing, piercing, bludgeoning, fire, etc.).',
            },
            advantage: {
              type: 'string',
              enum: ['normal', 'advantage', 'disadvantage'],
              description: 'Whether the NPC has advantage or disadvantage on the attack. Use for Pack Tactics, restrained targets, etc. Defaults to normal.',
            },
          },
          required: ['attackerName', 'targetName', 'attackBonus', 'damageDice', 'description'],
        },
      },
    ],
  },
  {
    function_declarations: [
      {
        name: 'updateCombatant',
        description: 'Update a combatant HP or conditions. Use for spell damage, environmental damage, healing, or applying/removing conditions like Stunned, Prone, etc.',
        parameters: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Name of the combatant to update.',
            },
            damage: {
              type: 'number',
              description: 'Damage to deal (subtracted from current HP).',
            },
            healing: {
              type: 'number',
              description: 'Healing to apply (added to current HP, capped at maxHp).',
            },
            addCondition: {
              type: 'string',
              description: 'Condition to add (e.g., "Stunned", "Prone", "Frightened", "Unconscious").',
            },
            removeCondition: {
              type: 'string',
              description: 'Condition to remove by name.',
            },
          },
          required: ['name'],
        },
      },
    ],
  },
  {
    function_declarations: [
      {
        name: 'advanceTurn',
        description: 'Advance to the next combatant in initiative order. Returns who is next. If next is an NPC, handle their turn immediately.',
        parameters: {
          type: 'object',
          properties: {},
        },
      },
    ],
  },
  {
    function_declarations: [
      {
        name: 'setScene',
        description: 'Updates the current game scene with a new description. Always call this tool when the location or environment changes significantly. Includes keywords for theme detection.',
        parameters: {
          type: 'object',
          properties: {
            description: {
              type: 'string',
              description: 'A vivid, detailed description of the new scene, including atmosphere, key features, and any NPCs present.',
            },
            location: {
              type: 'string',
              description: 'A short, one- or two-word name for the primary location of the scene (e.g., "Tavern", "Docks", "Forest Path"). This should be a place name, not a description.',
            },
            timeOfDay: {
              type: 'string',
              description: 'The current time of day in the scene (e.g., "dawn", "morning", "midday", "afternoon", "dusk", "night").',
            },
            weather: {
              type: 'string',
              description: 'The current weather conditions (e.g., "clear", "rainy", "foggy", "snowy").',
            },
          },
          required: ['description', 'location'],
        },
      },
    ],
  },
  {
    function_declarations: [
      {
        name: 'awardXP',
        description: 'Award experience points to the party. Call after combat victories, puzzle solutions, quest completions, roleplay moments, discoveries, or story milestones.',
        parameters: {
          type: 'object',
          properties: {
            category: {
              type: 'string',
              description: 'XP category: combat, puzzle, quest, roleplay, exploration, milestone, or skillCheck.',
            },
            amount: {
              type: 'number',
              description: 'Base XP amount before modifiers. Combat: 25-200, Puzzle: 50-150, Quest: 100-500, Roleplay: 15-75, Exploration: 25-100, Milestone: 200-1000, Skill check: 10-50.',
            },
            reason: {
              type: 'string',
              description: 'Short reason for the award.',
            },
          },
          required: ['category', 'amount', 'reason'],
        },
      },
    ],
  },
  {
    function_declarations: [
      {
        name: 'modifyGold',
        description: 'Add or remove gold from the party treasury. Call whenever the party finds treasure, buys items, pays for services, loots enemies, or spends gold in any way.',
        parameters: {
          type: 'object',
          properties: {
            amount: {
              type: 'number',
              description: 'Amount to add (positive) or remove (negative). E.g. 50 for finding gold, -10 for buying a potion.',
            },
            reason: {
              type: 'string',
              description: 'Why the gold is being added/removed. E.g. "Looted goblin bodies", "Purchased healing potion".',
            },
          },
          required: ['amount', 'reason'],
        },
      },
    ],
  },
  {
    function_declarations: [
      {
        name: 'addItem',
        description: 'Add an item to the player character\'s inventory. Call when the party finds, buys, receives, or crafts an item.',
        parameters: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Name of the item.' },
            type: { type: 'string', description: 'Item type: weapon, armor, potion, scroll, wondrous, gear, treasure, or other.' },
            quantity: { type: 'number', description: 'How many to add. Default 1.' },
            description: { type: 'string', description: 'Brief description of the item.' },
            magical: { type: 'boolean', description: 'Whether the item is magical.' },
          },
          required: ['name', 'type'],
        },
      },
    ],
  },
  {
    function_declarations: [
      {
        name: 'removeItem',
        description: 'Remove an item from inventory. Call when an item is consumed, sold, broken, lost, or given away.',
        parameters: {
          type: 'object',
          properties: {
            itemName: { type: 'string', description: 'Name of the item to remove.' },
            reason: { type: 'string', description: 'Why it is being removed.' },
          },
          required: ['itemName'],
        },
      },
    ],
  },
];

const openAITools = [
  {
    type: 'function' as const,
    function: {
      name: 'requestDiceRoll',
      description: 'Request a dice roll from the player for a skill check, saving throw, or attack roll.',
      parameters: {
        type: 'object',
        properties: {
          skill: {
            type: 'string',
            description: 'The skill or ability to roll for (e.g., "Investigation", "Strength", "Initiative").',
          },
          dc: {
            type: 'number',
            description: 'The difficulty class (DC) of the check. If not applicable (like for Initiative), omit.',
          },
          isGroupRoll: {
            type: 'boolean',
            description: 'Whether this is a group roll for all players (e.g., group stealth or initiative).',
          },
          advantage: {
            type: 'string',
            enum: ['normal', 'advantage', 'disadvantage'],
            description: 'Roll with advantage (2d20 take higher) or disadvantage (2d20 take lower). Defaults to normal. Use ONLY when D&D 5e rules clearly grant it (e.g., attacking unseen target = disadvantage, prone target in melee = advantage, Help action = advantage). Multiple sources don\'t stack. Any advantage + any disadvantage cancel to normal.',
          },
        },
        required: ['skill'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'requestSavingThrow',
      description: 'Request a saving throw from a player character or monster.',
      parameters: {
        type: 'object',
        properties: {
          ability: {
            type: 'string',
            description: 'The ability for the saving throw: "Strength", "Dexterity", "Constitution", "Intelligence", "Wisdom", or "Charisma".',
          },
          dc: {
            type: 'number',
            description: 'The difficulty class (DC) of the saving throw.',
          },
          characterName: {
            type: 'string',
            description: 'Name of specific character making the save (optional). If omitted, prompts the current character.',
          },
          source: {
            type: 'string',
            description: 'What caused the saving throw (e.g., "Dragon\'s breath weapon", "Fireball spell").',
          },
          advantage: {
            type: 'string',
            enum: ['normal', 'advantage', 'disadvantage'],
            description: 'Roll with advantage (2d20 take higher) or disadvantage (2d20 take lower). Defaults to normal. Use ONLY when D&D 5e rules clearly grant it. Multiple sources don\'t stack. Any advantage + any disadvantage cancel to normal.',
          },
        },
        required: ['ability', 'dc'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'startEncounter',
      description: 'Signals the start of a combat encounter, optionally specifying the initial combatants.',
      parameters: {
        type: 'object',
        properties: {
          combatants: {
            type: 'array',
            items: {
              type: 'string',
            },
            description: 'Names of the initial combatants in the encounter (e.g., "Goblin Sentry", "James").',
          },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'endEncounter',
      description: 'Signals the end of a combat encounter. Call this when all enemies are defeated.',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'npcAction',
      description: 'Resolve an NPC combat action (attack). Rolls attack vs target AC and damage automatically. Use this for every NPC attack during combat.',
      parameters: {
        type: 'object',
        properties: {
          attackerName: {
            type: 'string',
            description: 'Name of the attacking NPC (must match initiative entry).',
          },
          targetName: {
            type: 'string',
            description: 'Name of the target (must match initiative entry).',
          },
          attackBonus: {
            type: 'number',
            description: 'Attack bonus (e.g., 4 for +4 to hit).',
          },
          damageDice: {
            type: 'string',
            description: 'Damage dice notation (e.g., "1d6+2", "2d6+3").',
          },
          description: {
            type: 'string',
            description: 'Brief vivid description of the attack (e.g., "lunges with its scimitar").',
          },
          damageType: {
            type: 'string',
            description: 'Damage type (slashing, piercing, bludgeoning, fire, etc.).',
          },
          advantage: {
            type: 'string',
            enum: ['normal', 'advantage', 'disadvantage'],
            description: 'Whether the NPC has advantage or disadvantage on the attack. Use for Pack Tactics, restrained targets, etc. Defaults to normal.',
          },
        },
        required: ['attackerName', 'targetName', 'attackBonus', 'damageDice', 'description'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'updateCombatant',
      description: 'Update a combatant HP or conditions. Use for spell damage, environmental damage, healing, or applying/removing conditions like Stunned, Prone, etc.',
      parameters: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Name of the combatant to update.',
          },
          damage: {
            type: 'number',
            description: 'Damage to deal (subtracted from current HP).',
          },
          healing: {
            type: 'number',
            description: 'Healing to apply (added to current HP, capped at maxHp).',
          },
          addCondition: {
            type: 'string',
            description: 'Condition to add (e.g., "Stunned", "Prone", "Frightened", "Unconscious").',
          },
          removeCondition: {
            type: 'string',
            description: 'Condition to remove by name.',
          },
        },
        required: ['name'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'advanceTurn',
      description: 'Advance to the next combatant in initiative order. Returns who is next. If next is an NPC, handle their turn immediately.',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'setScene',
      description: 'Updates the current game scene with a new description. Always call this tool when the location or environment changes significantly. Includes keywords for theme detection.',
      parameters: {
        type: 'object',
        properties: {
          description: {
            type: 'string',
            description: 'A vivid, detailed description of the new scene, including atmosphere, key features, and any NPCs present.',
          },
          location: {
            type: 'string',
            description: 'A short, one- or two-word name for the primary location of the scene (e.g., "Tavern", "Docks", "Forest Path"). This should be a place name, not a description.',
          },
          timeOfDay: {
            type: 'string',
            description: 'The current time of day in the scene (e.g., "dawn", "morning", "midday", "afternoon", "dusk", "night").',
          },
          weather: {
            type: 'string',
            description: 'The current weather conditions (e.g., "clear", "rainy", "foggy", "snowy").',
          },
        },
        required: ['description', 'location'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'awardXP',
      description: 'Award experience points to the party. Call this after: combat victories, puzzle solutions, quest completions, great roleplay moments, new area discoveries, or story milestones. Include the category and a reason.',
      parameters: {
        type: 'object',
        properties: {
          category: {
            type: 'string',
            enum: ['combat', 'puzzle', 'quest', 'roleplay', 'exploration', 'milestone', 'skillCheck'],
            description: 'The type of XP award.',
          },
          amount: {
            type: 'number',
            description: 'Base XP amount (before level scaling and diminishing returns). Combat: 25-200 per enemy. Puzzle: 50-150. Quest: 100-500. Roleplay: 15-75. Exploration: 25-100. Milestone: 200-1000. Skill check: 10-50.',
          },
          reason: {
            type: 'string',
            description: 'Short reason for the XP award (e.g., "Defeated goblin ambush", "Solved the riddle of the sphinx").',
          },
        },
        required: ['category', 'amount', 'reason'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'modifyGold',
      description: 'Add or remove gold from the party treasury. ALWAYS call this when: finding treasure/loot, buying items, paying for services, receiving quest rewards, or any gold exchange.',
      parameters: {
        type: 'object',
        properties: {
          amount: {
            type: 'number',
            description: 'Amount to add (positive) or remove (negative). E.g. 50 for finding gold, -10 for buying a potion.',
          },
          reason: {
            type: 'string',
            description: 'Why the gold is being added/removed.',
          },
        },
        required: ['amount', 'reason'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'addItem',
      description: 'Add an item to the player character\'s inventory. Call when the party finds, buys, receives, or crafts an item.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Name of the item.' },
          type: { type: 'string', enum: ['weapon', 'armor', 'potion', 'scroll', 'wondrous', 'gear', 'treasure', 'other'], description: 'Item type.' },
          quantity: { type: 'number', description: 'How many to add. Default 1.' },
          description: { type: 'string', description: 'Brief description of the item.' },
          magical: { type: 'boolean', description: 'Whether the item is magical.' },
        },
        required: ['name', 'type'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'removeItem',
      description: 'Remove an item from inventory. Call when an item is consumed, sold, broken, lost, or given away.',
      parameters: {
        type: 'object',
        properties: {
          itemName: { type: 'string', description: 'Name of the item to remove.' },
          reason: { type: 'string', description: 'Why it is being removed.' },
        },
        required: ['itemName'],
      },
    },
  },
];

const postChatSchema = z.object({
  campaignId: z.string().uuid('Invalid campaign ID format (must be UUID)'),
  message: z.string().min(1, 'Message cannot be empty').max(10000, 'Message too long').optional(),
  toolResponses: z.array(z.object({
    tool_call_id: z.string(),
    content: z.string(),
  })).optional(),
  forceNextTool: z.string().optional(), // Force the AI to call this tool next (combat chaining)
  characterId: z.string().uuid().optional(),
  isWhisper: z.boolean().optional(),
}).refine(data => {
  // Ensure either message OR toolResponses is provided, but not both.
  const hasMessage = !!data.message;
  const hasToolResponses = data.toolResponses && data.toolResponses.length > 0;
  return (hasMessage && !hasToolResponses) || (!hasMessage && hasToolResponses);
}, {
  message: "Either 'message' or a non-empty 'toolResponses' array must be provided, but not both.",
  path: ["message", "toolResponses"],
});

const getChatHistorySchema = z.object({
  campaignId: z.string().uuid('Invalid campaign ID format (must be UUID)'),
  limit: z.preprocess(
    (val) => parseInt(z.string().parse(val), 10),
    z.number().int().min(1).max(200).default(50)
  ).optional(),
});

const deleteChatSchema = z.object({
  campaignId: z.string().uuid('Invalid campaign ID format (must be UUID)'),
});

function buildSystemPrompt(campaign: any, characters: any[], gameState: any, globalPrompt?: string, campaignContentSummary?: string): string {
  const charSummaries = (characters || []).map(c => `- ${c.name}: Level ${c.level} ${c.race} ${c.class}`).join('\n') || 'No characters.';
  const npcSummaries = (campaign?.npcs || []).slice(0, 10).map((n: any) => `- ${n.name} (${n.race} ${n.occupation})`).join('\n') || 'None.';
  const questSummaries = (campaign?.quests || []).filter((q: any) => q.status === 'active').map((q: any) => `- ${q.name}: ${q.description}`).join('\n') || 'None.';

  const encounterSummaries = (gameState?.currentEncounter?.monsters || []).map((m: any) => `- ${m.name} (HP: ${m.currentHp}/${m.maxHp})`).join('\n') || 'None.';

  const globalAmendments = globalPrompt ? `\n## Global Rules & Style\n${globalPrompt}` : '';
  const contentReference = campaignContentSummary || '';

  return `You are an expert Dungeon Master running a solo D&D 5th Edition campaign.

## Campaign: ${campaign?.name || 'Unnamed'}
${campaign?.description || 'A new adventure awaits...'}

## World Setting
${campaign?.worldSetting || 'Generic Fantasy'}

## Current Party
${charSummaries}

## Known NPCs
${npcSummaries}

## Active Quests
${questSummaries}

## Current Scene
${gameState?.currentScene || 'The adventure begins...'}
Location: ${campaign?.currentLocation || 'Unknown'}
Time: ${gameState?.timeOfDay || 'midday'}, Weather: ${gameState?.weather || 'clear'}
${gameState?.currentEncounter ? `\n## Current Encounter\n${encounterSummaries}` : ''}

## DM Rules
- Difficulty: ${campaign?.difficultyLevel || 'normal'}
- Rules Enforcement: ${campaign?.rulesEnforcement || 'moderate'}
- Your Personality: ${campaign?.dmPersonality || 'A wise and fair Dungeon Master.'}
- **Storytelling Style:** Narrate vividly in 3-5 sentences. During exploration, be immersive. During combat, be BRIEF and tactical — show the numbers.
- **Tool Usage Philosophy:** Only use tools when a player action clearly requires one (skill check, scene change, encounter start/end). Never use tools if narrative alone suffices.
${globalAmendments}
${contentReference}

## CRITICAL: ALL DICE ROLLS HAPPEN IN CODE
You NEVER roll dice yourself. You NEVER describe random outcomes. You NEVER say "you rolled a 15" or "the goblin rolled 12 to hit".
- For skill checks: Call 'requestDiceRoll' with skill and DC. The client rolls the dice and sends you the result.
- For saving throws: Call 'requestSavingThrow' with ability and DC. The client rolls and sends the result.
- For NPC combat attacks: Call 'npcAction' — it rolls attack and damage in code, and shows dice on screen. Pass advantage='advantage' or 'disadvantage' when appropriate (Pack Tactics, restrained targets, etc.). For player combat attacks: Call 'requestDiceRoll'. You NEVER invent attack or damage numbers.
- When you receive a [ROLL RESULT] or [SAVING THROW RESULT] message, narrate ONLY the outcome. Do not re-roll or second-guess the numbers.

## Advantage & Disadvantage (D&D 5e Rules)
Both requestDiceRoll and requestSavingThrow accept an optional 'advantage' parameter ('advantage', 'disadvantage', or 'normal').
- **Advantage:** Roll 2d20, take the HIGHER result. Grant when D&D 5e rules clearly call for it.
- **Disadvantage:** Roll 2d20, take the LOWER result. Apply when rules clearly call for it.
- **Cancellation:** If ANY source of advantage and ANY source of disadvantage both apply, they cancel out — roll normally. Even if there are 3 sources of advantage and 1 of disadvantage, they still cancel.
- **No stacking:** Multiple sources of advantage = just advantage. Multiple disadvantage = just disadvantage.
- **Use sparingly.** Most rolls should be normal. Only set advantage/disadvantage when the situation clearly warrants it per D&D 5e rules.
- Common examples: attacking a blinded/restrained/stunned target = advantage; attacking while blinded/prone/restrained = disadvantage; Reckless Attack = advantage; heavy crossbow at long range = disadvantage; Help action = advantage on next check.

## Combat Mode (AI-DRIVEN THEATER OF THE MIND)
YOU are the full combat DM. You control ALL combatants, narrate all actions, and resolve all mechanics through tools. There is no local combat engine or grid.

### CRITICAL COMBAT RULE: NEVER STOP MID-COMBAT
You can call MULTIPLE tools in a SINGLE response. During combat you MUST chain tool calls together. NEVER send a response that just says "proceed" or waits for the player when it's not the player's turn. Resolve as much as possible in every response.

### Starting Combat
Call 'startEncounter' with enemy names. The system sets up initiative order. Then announce initiative and describe the opening scene. Then IMMEDIATELY call advanceTurn and handle the first turn.

### NPC Turns — FULLY AUTOMATIC
When it's an NPC's turn, handle it ALL in ONE response with NO user input:
1. Call 'npcAction' → 2. Narrate the result → 3. Call 'advanceTurn' → 4. If next is ALSO an NPC, repeat steps 1-3 → 5. Keep going until you reach a PLAYER turn or combat ends.

You MUST chain all NPC turns back-to-back in one response. The player should NEVER have to type "proceed" to advance NPC turns.

### Player Turns
When it's the player's turn:
1. Describe the tactical situation and wait for input.
2. When the player states their action, call 'requestDiceRoll' for the attack/check.
3. IMPORTANT: After calling requestDiceRoll, you will get a tool result saying "player is rolling". You MUST describe the anticipation briefly then STOP. Do NOT narrate any outcome. The actual roll result will arrive in a follow-up [ROLL RESULT] message.
4. When the [ROLL RESULT] arrives: narrate the outcome, call 'updateCombatant' if damage was dealt, then call 'advanceTurn'. If the player has Extra Attack, call 'requestDiceRoll' again for the next attack.
5. After all player attacks are resolved, call 'advanceTurn'. If next is an NPC, handle it immediately.

### Key Combat Tools
- **npcAction**: NPC attacks. Rolls attack and damage automatically, and SHOWS the dice on screen for the player to see. Accepts optional advantage parameter. After EVERY npcAction, call advanceTurn.
- **updateCombatant**: Apply damage/healing/conditions to any combatant. After using this for player damage, call advanceTurn.
- **advanceTurn**: Move to next in initiative. Read the result — if it says NPC, call npcAction immediately. If DEFEATED, call advanceTurn again to skip.
- **requestDiceRoll / requestSavingThrow**: Player rolls only.
- **endEncounter**: When ALL enemies reach 0 HP. Always follow with 'awardXP'.

### Combat Style
- Be VIVID but FAST — one sentence of narration per attack, not a paragraph.

## GOLD & INVENTORY TRACKING — ALWAYS USE TOOLS
You MUST call 'modifyGold' and 'addItem'/'removeItem' tools whenever gold or items change. NEVER just narrate a gold change or item gain/loss without calling the tool.
- **Finding loot/treasure:** Call modifyGold with positive amount AND addItem for each item found.
- **Buying from shops:** Call modifyGold with negative amount AND addItem for purchased item.
- **Selling items:** Call removeItem AND modifyGold with positive amount.
- **Using consumables (potions, scrolls):** Call removeItem when the item is consumed.
- **Quest rewards:** Call modifyGold for gold rewards AND addItem for item rewards.
- **Paying for services (inn, ferry, etc.):** Call modifyGold with negative amount.
Current party gold: ${gameState?.partyGold ?? 0} gp.

## PLAYER SELF-INITIATED ROLLS
When you receive a [ROLL RESULT] that the player initiated from the character sheet (not from a requested roll), they rolled it voluntarily. Ask what they're using it for, or suggest what it could apply to based on the current context. For example: "You rolled a 17 Perception — scanning the room, you notice..." or "That's a 12 on your Athletics check — what are you trying to do?"
- Always show numbers: "The goblin lunges [rolls 16 vs AC 14 — hit!] for 5 slashing damage. Kael: 17/22 HP."
- Critical hits (nat 20): one line of dramatic flair. Critical misses (nat 1): one line of humor.
- When enemies drop to 0 HP, narrate defeat in one punchy sentence.
- Describe battlefield positioning so the player can make tactical decisions.

### NPC Advantage/Disadvantage
When calling npcAction, pass advantage='advantage' or 'disadvantage' when D&D 5e rules call for it:
- Pack Tactics (wolves, kobolds): advantage if an ally is within 5ft of target
- Target is restrained, stunned, paralyzed, prone (melee): advantage
- Attacker is blinded, frightened, prone: disadvantage
- Target is invisible: disadvantage
- Most attacks are normal — only set when clearly warranted.

### Roll Visibility — ALL rolls are shown on screen
The player SEES all dice rolls — NPC attack rolls, NPC damage rolls, player rolls. This is by design. Do NOT describe rolls as "secret" or "behind the screen" unless it truly must be hidden. Secret rolls should be extremely rare — only for:
- Passive Perception vs Stealth (where knowing the roll would spoil surprise)
- Insight vs Deception (to prevent metagaming)
- Random encounter tables or story-deciding DM rolls
When you do roll secretly, briefly say "The DM rolls behind the screen..." then narrate only the outcome.

### Common NPC Stats (use your D&D 5e knowledge for others)
- Goblin: AC 15, +4 to hit, 1d6+2 slashing
- Orc: AC 13, +5 to hit, 1d12+3 slashing
- Skeleton: AC 13, +4 to hit, 1d6+2 piercing
- Wolf: AC 13, +4 to hit, 2d4+2 piercing (pack tactics = advantage if ally adjacent — pass advantage='advantage' to npcAction)
- Bandit: AC 12, +3 to hit, 1d6+1 slashing
- Zombie: AC 8, +3 to hit, 1d6+1 bludgeoning

## Scene Setting & Recaps

**A) Initial Scene (First Message):**
When chat history is empty, you MUST:
1. Call 'setScene' with a vivid description matching the campaign setting
2. Include location keywords (tavern, forest, cave, dungeon, etc.) for theme detection
3. Provide a compelling opening narration

**B) Session Recap (Subsequent Loads):**
When chat history exists, briefly recap in 1-2 sentences before continuing.

## Narrative Text with Tool Calls
When your FINAL response to the player includes tool calls, also include narrative text so they see story, not just mechanics. However, during combat when chaining multiple tool calls (npcAction → advanceTurn → npcAction etc.), you do NOT need to narrate between every single tool call — just provide a combined narration covering all the actions at the end or alongside the chain.

## Skill Checks — HIDDEN OUTCOMES
When a player action warrants a skill check:
1. Call 'requestDiceRoll' with skill and DC.
2. You will receive a tool result saying "player is rolling dice". Describe the moment of anticipation briefly, then STOP your response. Do NOT pre-describe outcomes or guess the result.
3. The actual [ROLL RESULT] will arrive as a separate follow-up message. When it does, narrate ONLY the actual outcome — never reveal the DC, outcome tiers, or what different rolls would have meant.
- NEVER show text like "On 1-9 (Failure):", "DC 15", or outcome tier breakdowns. The player experiences the story, not the mechanics.
- Simply narrate what happens based on the roll result you receive.

## setScene Tool
Call 'setScene' whenever the location changes significantly, with vivid description and location keywords.

## Experience Points (XP) System
You control XP awards using the 'awardXP' tool. Award XP for:
- **Combat victories** (category: 'combat'): After enemies are defeated. Scale by difficulty: easy=25-50, medium=50-100, hard=100-200.
- **Puzzle/trap solutions** (category: 'puzzle'): After the player solves a puzzle or disarms a trap. 50-150 XP.
- **Quest progress** (category: 'quest'): When a quest objective is completed. 100-500 XP.
- **Roleplay** (category: 'roleplay'): When the player does something creative or in-character. 15-75 XP. Use sparingly.
- **Exploration** (category: 'exploration'): When the player discovers a new area or secret. 25-100 XP.
- **Story milestones** (category: 'milestone'): Major story beats — completing a dungeon, defeating a boss, major plot reveals. 200-1000 XP.
- **Skill challenges** (category: 'skillCheck'): Overcoming a meaningful challenge through skills. 10-50 XP.

IMPORTANT: The system applies diminishing returns automatically. Repeated combat without story progression yields less XP. Story events (quest/milestone) reset this. You don't need to worry about anti-grind — just award XP honestly and the engine handles the rest.
IMPORTANT: ALWAYS call awardXP after combat ends. ALWAYS call it after puzzle solutions and quest progress. Don't forget — the player should feel rewarded!

## Your Role
1. Narrate vividly during exploration; be BRIEF and tactical during combat (show numbers).
2. Set scenes with 'setScene' on significant location changes (not every small movement).
3. For skill checks: call requestDiceRoll, WAIT for the result, then narrate ONLY the actual outcome. Never pre-describe what different rolls would mean.
4. NEVER roll dice — always use requestDiceRoll/requestSavingThrow tools and let the code handle it.
5. Play NPCs with distinct personalities.
6. Keep the story moving forward — don't end responses mid-sentence or mid-scene.
7. Use markdown for emphasis.
8. When receiving combat results, show the numbers: "Goblin attacks Kael (rolled 17 vs AC 15) — hit for 6 damage!"
9. COMBAT PACING: The player should NEVER need to type "proceed", "continue", or "next" during combat. YOU drive the action. After every tool result, either call the next tool immediately or (if it's the player's turn) describe the situation and wait for their action. That's it — those are the only two options.`;
}

async function streamOpenAICompatible(
  client: OpenAI,
  modelId: string,
  allMessages: OpenAI.Chat.ChatCompletionMessageParam[], // Changed from 'messages'
  temperature: number,
  maxTokens: number,
  campaignId: string,
  provider: AIProvider, // Add provider to get model config
  forceNextTool?: string // Force AI to call this specific tool
): Promise<Response> {
  let stream;
  try {
    const modelConfig = getModelConfig(provider, modelId);
    const supportsToolUse = modelConfig?.supportsToolUse;

    const chatCompletionParams: OpenAI.Chat.ChatCompletionCreateParamsStreaming = {
      model: modelId,
      messages: allMessages, // Use allMessages here
      temperature,
      max_tokens: maxTokens,
      stream: true,
    };

    if (supportsToolUse) {
      chatCompletionParams.tools = openAITools;
      // If forceNextTool is set (combat chaining), force the AI to call that specific tool
      if (forceNextTool) {
        chatCompletionParams.tool_choice = { type: 'function', function: { name: forceNextTool } };
      } else {
        chatCompletionParams.tool_choice = 'auto';
      }
    }

    console.log('OpenAI Compatible API Request Details:');
    console.log('  Base URL:', client.baseURL);
    console.log('  Model:', modelId);
    console.log('  Supports Tool Use:', supportsToolUse);
    console.log('  Force Next Tool:', forceNextTool || 'none');
    console.log('  Tool Choice:', forceNextTool ? `forced: ${forceNextTool}` : 'auto');
    console.log('  Messages count:', allMessages.length);
    console.log('  Message roles:', allMessages.map((m: any) => m.role + (m.tool_call_id ? `(${m.tool_call_id.slice(0,8)})` : '') + (m.tool_calls ? `[${m.tool_calls.length}tc]` : '')).join(' → '));
    console.log('  Temperature:', temperature);
    console.log('  Max Tokens:', maxTokens);

    stream = await client.chat.completions.create(chatCompletionParams);
  } catch (error: any) {
    console.error('OpenAI Compatible API Error:', error);
    let errorMessage = 'An unexpected AI error occurred.';
    if (error.status === 429) {
      errorMessage = 'AI rate limit exceeded. Please wait a moment and try again.';
    } else if (error.message) {
      errorMessage = `AI Error: ${error.message}`;
    }
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: error.status || 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let fullContent = '';
  const toolCallChunks: { [key: number]: any } = {};
  let collectedToolCalls: any[] = []; // New variable to collect all tool calls

  const encoder = new TextEncoder();
  const readableStream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content || '';
          if (content) {
            fullContent += content;
            controller.enqueue(encoder.encode(`0:${JSON.stringify(content)}\n`));
          }

          const toolCalls = chunk.choices[0]?.delta?.tool_calls;
          if (toolCalls) {
            for (const toolCall of toolCalls) {
              if (toolCall.index !== undefined) {
                if (!toolCallChunks[toolCall.index]) {
                  toolCallChunks[toolCall.index] = {
                    id: '',
                    type: 'function',
                    function: { name: '', arguments: '' },
                  };
                }
                if (toolCall.id) {
                  toolCallChunks[toolCall.index].id += toolCall.id;
                }
                if (toolCall.function?.name) {
                  toolCallChunks[toolCall.index].function.name += toolCall.function.name;
                }
                if (toolCall.function?.arguments) {
                  toolCallChunks[toolCall.index].function.arguments += toolCall.function.arguments;
                }
              }
            }
          }
        }

        // After the stream is finished, process any complete tool calls
        collectedToolCalls = Object.values(toolCallChunks); // Collect the complete tool calls
        if (collectedToolCalls.length > 0) {
          controller.enqueue(encoder.encode(`1:${JSON.stringify(collectedToolCalls)}\n`));
        }

        // Save the assistant message to the database
        // ALWAYS save if there's content OR tool calls
        const completeToolCallsArray = Object.values(toolCallChunks);
        if (fullContent || completeToolCallsArray.length > 0) {
          await messageService.createMessage({
            campaignId,
            role: 'assistant',
            content: fullContent || '',
            toolCalls: completeToolCallsArray.length > 0 ? completeToolCallsArray : undefined,
          });
        }
        controller.close();
      } catch (error) {
        console.error('Streaming error:', error);
        controller.error(error);
      }
    },
  });

  return new Response(readableStream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}

async function streamAnthropic(
  client: Anthropic,
  model: string,
  systemPrompt: string,
  allMessages: (OpenAI.Chat.ChatCompletionMessageParam | { role: 'tool', tool_call_id: string, content: string })[], // Changed to allMessages
  temperature: number,
  maxTokens: number,
  campaignId: string
): Promise<Response> {
  let stream;
  try {
    // Anthropic does not directly support 'tool' role in messages for stream API,
    // and expects alternating user/assistant. Tool responses must be formatted
    // as part of a user message. This is a simplification.
    let anthropicMessages: { role: 'user' | 'assistant'; content: string | Anthropic.Messages.TextBlock[] }[] = [];
    let lastRole: 'user' | 'assistant' | null = null;

    for (const msg of allMessages) { // Use allMessages here
      if (msg.role === 'system') {
          // System prompt is handled separately or becomes first user message.
          // We already pass it to buildSystemPrompt, and it's included in startChat.
          continue;
      }

      let content: string | Anthropic.Messages.TextBlock[] = '';
      if (typeof msg.content === 'string') {
          content = msg.content;
      } else if (Array.isArray(msg.content)) {
          // Handle complex content types if necessary
          content = msg.content as Anthropic.Messages.TextBlock[];
      }

      if (msg.role === 'tool') {
          // Format tool response as a user message for Anthropic
          let toolResponseParsed: unknown;
          try {
            toolResponseParsed = JSON.parse((msg as { content: string }).content);
          } catch {
            // Tool response is a plain string, not JSON — wrap it
            toolResponseParsed = (msg as { content: string }).content;
          }
          const toolResponseName = (msg as { tool_call_id: string }).tool_call_id;
          const formattedToolResponse = `Tool_Result: <tool_code tool_name="${toolResponseName}">${typeof toolResponseParsed === 'string' ? toolResponseParsed : JSON.stringify(toolResponseParsed)}</tool_code>`;
          if (lastRole === 'user') {
              anthropicMessages[anthropicMessages.length - 1].content += `\n${formattedToolResponse}`;
          } else {
              anthropicMessages.push({ role: 'user', content: formattedToolResponse });
          }
          lastRole = 'user';
      } else if (msg.role === 'assistant') {
          if (lastRole === 'assistant') { // Merge consecutive assistant messages
              anthropicMessages[anthropicMessages.length - 1].content += `\n${content}`;
          } else {
              anthropicMessages.push({ role: 'assistant', content: content });
          }
          lastRole = 'assistant';
      } else if (msg.role === 'user') {
          if (lastRole === 'user') { // Merge consecutive user messages
              anthropicMessages[anthropicMessages.length - 1].content += `\n${content}`;
          } else {
              anthropicMessages.push({ role: 'user', content: content });
          }
          lastRole = 'user';
      }
    }
    // Ensure the *last* message is always from 'user' for Anthropic's API if it's expecting a prompt.
    // The previous logic for `lastMessage` for Gemini doesn't fully apply here.

    stream = await client.messages.stream({
      model,
      system: systemPrompt,
      messages: anthropicMessages, // Use anthropicMessages here
      temperature,
      max_tokens: maxTokens,
    });
  } catch (error: any) {
    console.error('Anthropic API Error:', error);
    const errorStr = error?.message || JSON.stringify(error?.error) || '';
    const isBillingIssue = errorStr.includes('credit balance') || errorStr.includes('billing');

    let errorMessage = 'An unexpected AI error occurred.';
    let status = error.status || 500;

    if (error.status === 429) {
      errorMessage = 'AI rate limit exceeded. Please wait a moment and try again.';
      status = 429;
    } else if (isBillingIssue) {
      errorMessage = 'API billing issue - insufficient credits.';
      status = 402; // Payment Required
    } else if (error.message) {
      errorMessage = `AI Error: ${error.message}`;
    }

    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let fullContent = '';
  const toolCallChunks: { [key: number]: any } = {};

  const encoder = new TextEncoder();
  const readableStream = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            const content = event.delta.text || '';
            if (content) {
              fullContent += content;
              controller.enqueue(encoder.encode(`0:${JSON.stringify(content)}\n`));
            }
          }
        }

        // Collect complete tool calls from Anthropic's response
        // Note: Anthropic tool calls would be processed differently if they were part of the stream
        const completeToolCallsArray = Object.values(toolCallChunks);

        // Save the assistant message to the database
        // Always save if there's content OR tool calls
        if (fullContent || completeToolCallsArray.length > 0) {
          await messageService.createMessage({
            campaignId,
            role: 'assistant',
            content: fullContent || '',
            toolCalls: completeToolCallsArray.length > 0 ? completeToolCallsArray : undefined,
          });
        }
        controller.close();
      } catch (error) {
        console.error('Streaming error:', error);
        controller.error(error);
      }
    },
  });

  return new Response(readableStream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}

async function streamGemini(
  client: GoogleGenerativeAI,
  modelId: string,
  systemPrompt: string,
  messages: any[],
  temperature: number,
  maxTokens: number,
  campaignId: string,
  provider: AIProvider // Add provider to get model config
): Promise<Response> {
  let geminiStream;
  try {
    const modelConfig = getModelConfig(provider, modelId);
    const supportsToolUse = modelConfig?.supportsToolUse;

    const geminiConfig: any = {
      model: modelId,
    };

    if (supportsToolUse) {
      geminiConfig.tools = geminiTools;
    }

    const geminiModel = client.getGenerativeModel(geminiConfig);

    const geminiHistory: { role: 'user' | 'model', parts: { text: string }[] }[] = [];

    // Add the system prompt as the first user message
    geminiHistory.push({ role: 'user', parts: [{ text: systemPrompt }] });

    // Iterate through the original messages, ensuring alternating roles
    let expectedRole: 'user' | 'model' = 'model'; // After system prompt, we expect model's response

    for (const msg of messages.slice(0, -1)) { // All messages except the last one (current user input)
        const geminiRole = msg.role === 'assistant' ? 'model' : 'user';

        // Discard leading 'model' (assistant) turns that might break the user/model alternation
        // immediately after the system prompt.
        if (geminiHistory.length === 1 && geminiRole === 'model') {
            continue; // Skip this leading assistant message
        }

        // Ensure proper alternating roles in history
        if (geminiRole === expectedRole) {
            geminiHistory.push({ role: geminiRole, parts: [{ text: msg.content }] });
            expectedRole = expectedRole === 'user' ? 'model' : 'user'; // Toggle expected role
        } else {
            // If roles don't alternate, it's a malformed history.
            // For now, we'll just add it and let Gemini potentially handle or error.
            // A more robust solution might involve error logging or history truncation.
            geminiHistory.push({ role: geminiRole, parts: [{ text: msg.content }] });
            expectedRole = expectedRole === 'user' ? 'model' : 'user';
        }
    }

    const lastUserMessage = messages[messages.length - 1].content;

    const chat = geminiModel.startChat({
      history: geminiHistory, // Use the carefully constructed history
      generationConfig: {
        temperature,
        maxOutputTokens: maxTokens,
      },
      safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
      ],
    });

    // Send only the actual current user message, as systemPrompt is now in history
    const result = await chat.sendMessageStream(lastUserMessage);
    geminiStream = result.stream;

  } catch (error: any) {
    console.error('Gemini API Error:', error);
    let errorMessage = 'An unexpected AI error occurred.';
    if (error.response?.status === 429) {
      errorMessage = 'AI rate limit exceeded. Please wait a moment and try again.';
    } else if (error.message) {
      errorMessage = `AI Error: ${error.message}`;
    }
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: error.response?.status || 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let fullContent = '';
  const toolCallChunks: { [key: string]: any } = {};

  const encoder = new TextEncoder();
  const readableStream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of geminiStream) {
          const text = chunk.text();
          if (text) {
            fullContent += text;
            controller.enqueue(encoder.encode(`0:${JSON.stringify(text)}\n`));
          }

          const functionCalls = chunk.functionCalls();
          if (functionCalls) {
            // Since Gemini streams function calls differently, we might get the whole call at once
            // This logic assumes we might get it in chunks, but often it's a single object.
            for (const call of functionCalls) {
              // We'll use the name as a key for assembly
              if (!toolCallChunks[call.name]) {
                toolCallChunks[call.name] = { name: call.name, args: {} };
              }
              Object.assign(toolCallChunks[call.name].args, call.args);
            }
          }
        }
        
        const completeToolCalls = Object.values(toolCallChunks).map(tool => ({
          type: 'function',
          function: {
            name: tool.name,
            arguments: JSON.stringify(tool.args),
          },
        }));

        if (completeToolCalls.length > 0) {
          controller.enqueue(encoder.encode(`1:${JSON.stringify(completeToolCalls)}\n`));
        }

        // Always save assistant message if there's content OR tool calls
        if (fullContent || completeToolCalls.length > 0) {
          // Map Gemini tool calls to standard ToolCall format
          const mappedToolCalls = completeToolCalls.map((tc: any, idx: number) => ({
            id: `gemini-call-${Date.now()}-${idx}`,
            name: tc.function?.name || tc.name || 'unknown',
            arguments: tc.function?.arguments ? (typeof tc.function.arguments === 'string' ? JSON.parse(tc.function.arguments) : tc.function.arguments) : (tc.args || {}),
          }));
          await messageService.createMessage({
            campaignId,
            role: 'assistant',
            content: fullContent || '',
            toolCalls: mappedToolCalls.length > 0 ? mappedToolCalls : undefined,
          });
        }
        controller.close();
      } catch (error) {
        console.error('Streaming error (Gemini):', error);
        controller.error(error);
      }
    },
  });

  return new Response(readableStream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}

function createClient(provider: AIProvider, apiKey: string): OpenAI | Anthropic | GoogleGenerativeAI {
  const config = AI_PROVIDERS[provider];

  if (provider === 'anthropic') {
    return new Anthropic({ apiKey });
  }

  if (provider === 'gemini') {
    return new GoogleGenerativeAI(apiKey);
  }

  // All other providers use OpenAI-compatible API
  return new OpenAI({
    apiKey,
    baseURL: config.baseUrl,
    defaultHeaders: provider === 'openrouter' ? {
      'HTTP-Referer': 'https://infiniterealms.app',
      'X-Title': 'Infinite Realms',
    } : undefined,
  });
}

// Helper to try a provider and detect rate limiting
async function tryProvider(
  provider: AIProvider,
  model: string,
  apiKey: string,
  systemPrompt: string,
  recentMessages: any[],
  currentMessages: (OpenAI.Chat.ChatCompletionMessageParam | { role: 'tool', tool_call_id: string, content: string })[], // Modified parameter
  temperature: number,
  maxTokens: number,
  campaignId: string,
  forceNextTool?: string // Force AI to call this specific tool
): Promise<{ response?: Response; rateLimited?: boolean; error?: string }> {
  try {
    const client = createClient(provider, apiKey);
    const defaultModel = AI_PROVIDERS[provider].models.find(m => m.recommended)?.id || AI_PROVIDERS[provider].models[0].id;
    const modelToUse = model || defaultModel;

    console.log(`Trying provider: ${provider} with model: ${modelToUse}`);

    // Construct the full messages array for the AI
    // Note: AI models sometimes have strict requirements for message role alternation.
    // Anthropic and Gemini (via history) handle this differently.

    // CRITICAL: Sanitize message history to prevent "tool_calls without tool response" errors.
    // We apply a two-pass sanitization:
    // 1. Filter out orphaned 'tool' messages that don't follow an assistant message with 'toolCalls'.
    // 2. Map through the cleaned history and strip 'tool_calls' from assistant messages that are not
    //    followed by the correct number of 'tool' responses.

    // Pass 1: Filter out orphaned tool responses.
    // A tool message is valid if there's a preceding assistant message (possibly with other tool messages
    // in between) that has toolCalls containing this tool's tool_call_id.
    const cleanHistory = recentMessages.filter((msg, idx) => {
      if (msg.role === 'tool') {
        // Walk backwards to find the nearest assistant message (skipping other tool messages)
        let assistantMsg = null;
        for (let i = idx - 1; i >= 0; i--) {
          if (recentMessages[i].role === 'tool') continue; // Skip sibling tool messages
          if (recentMessages[i].role === 'assistant') {
            assistantMsg = recentMessages[i];
          }
          break; // Stop at first non-tool message
        }
        if (!assistantMsg || !assistantMsg.toolCalls || assistantMsg.toolCalls.length === 0) {
          console.log(`Sanitizer Pass 1: Filtering out orphaned tool response for tool_call_id: ${msg.tool_call_id}`);
          return false;
        }
      }
      return true;
    });

    const currentIsToolResponse = currentMessages.length > 0 && 'tool_call_id' in currentMessages[0];

    // Pass 2: Sanitize tool_calls on assistant messages based on the cleaned history.
    const sanitizedMessages = cleanHistory.map((msg, idx) => {
      const message: Record<string, any> = {
        role: msg.role,
        content: msg.content || '',
      };
      
      if (msg.role === 'tool') {
        message.tool_call_id = msg.tool_call_id;
      }

      if (msg.role === 'assistant' && msg.toolCalls && Array.isArray(msg.toolCalls) && msg.toolCalls.length > 0) {
        const toolCallCount = msg.toolCalls.length;
        let followingToolResponses = 0;
        // Count contiguous tool messages immediately following this assistant message.
        for (let i = idx + 1; i < cleanHistory.length; i++) {
          if (cleanHistory[i].role === 'tool') {
            followingToolResponses++;
          } else {
            break; // Stop counting at the first non-tool message.
          }
        }

        // If the current request is providing tool responses, and this is the last message
        // in the history, add the new responses to our count.
        const isLastMsgInHistory = idx === cleanHistory.length - 1;
        if (isLastMsgInHistory && currentIsToolResponse) {
          followingToolResponses += currentMessages.length;
        }

        // If we have a response for every call, keep the tool_calls.
        if (followingToolResponses >= toolCallCount) {
          if (!message.content) {
            message.content = null; // OpenAI requires content to be null, not empty, for tool_calls
          }
          // Normalize tool_calls to OpenAI format { id, type, function: { name, arguments } }
          // DB may store them in either OpenAI format or simplified { id, name, arguments } format
          message.tool_calls = msg.toolCalls.map((tc: any) => {
            if (tc.type === 'function' && tc.function) {
              return tc; // Already in OpenAI format
            }
            return {
              id: tc.id,
              type: 'function',
              function: {
                name: tc.name,
                arguments: typeof tc.arguments === 'string' ? tc.arguments : JSON.stringify(tc.arguments || {}),
              },
            };
          });
        } else {
          // Not enough responses, so we must strip the tool_calls to prevent an API error.
          console.log(`Sanitizer Pass 2: Stripping tool_calls from assistant message (expected ${toolCallCount}, found ${followingToolResponses})`);
          // We keep the text content if it exists, otherwise provide a placeholder.
          message.content = msg.content || '(The DM processed an action but the tool results were incomplete.)';
        }
      }

      return message;
    });

    // Deduplicate consecutive identical user messages (prevents spam loops)
    const dedupedMessages: typeof sanitizedMessages = [];
    for (const msg of sanitizedMessages) {
      const prev = dedupedMessages[dedupedMessages.length - 1];
      if (prev && msg.role === 'user' && prev.role === 'user' && msg.content === prev.content) {
        // Skip duplicate consecutive user message
        continue;
      }
      dedupedMessages.push(msg);
    }

    const allMessagesRaw: any[] = [
      // Always start with system prompt
      { role: 'system', content: systemPrompt },
      // Add sanitized, deduplicated recent messages
      ...dedupedMessages,
      // Append the current message/tool response as the latest interaction
      ...currentMessages,
    ].filter(msg => {
      // Always keep system messages
      if (msg.role === 'system') return true;
      // Keep tool messages
      if ((msg as any).tool_call_id) return true;
      // Keep assistant messages with tool_calls (even if content is null)
      if ((msg as any).tool_calls) return true;
      // Keep messages with actual content
      if (msg.content && typeof msg.content === 'string' && msg.content.trim() !== '') return true;
      // Filter out empty messages
      return false;
    });

    // Pass 3: Final strict validation of tool messages.
    // Rules enforced:
    // a) Each tool message must follow an assistant with tool_calls
    // b) Each tool message's tool_call_id must match one of the assistant's tool_calls
    // c) Only one tool response per tool_call_id (dedup — keeps first)
    // d) Number of tool responses must not exceed number of tool_calls
    const allMessagesForAI: any[] = [];
    const seenToolCallIds = new Set<string>();
    let currentAssistantToolCallIds: Set<string> | null = null;
    let currentAssistantToolCallCount = 0;
    let toolResponsesForCurrentAssistant = 0;

    for (const msg of allMessagesRaw) {
      const isToolMsg = msg.role === 'tool' || (msg as any).tool_call_id;

      if (!isToolMsg) {
        // Reset tool tracking when we hit a new non-tool message
        if (msg.role === 'assistant' && (msg as any).tool_calls) {
          currentAssistantToolCallIds = new Set(
            ((msg as any).tool_calls as any[]).map((tc: any) => tc.id)
          );
          currentAssistantToolCallCount = (msg as any).tool_calls.length;
          toolResponsesForCurrentAssistant = 0;
        } else {
          currentAssistantToolCallIds = null;
          currentAssistantToolCallCount = 0;
          toolResponsesForCurrentAssistant = 0;
        }
        allMessagesForAI.push(msg);
        continue;
      }

      // This is a tool message — validate it
      const toolCallId = (msg as any).tool_call_id;

      // Check: has a preceding assistant with matching tool_call_id
      if (!currentAssistantToolCallIds || !currentAssistantToolCallIds.has(toolCallId)) {
        console.log(`Sanitizer Pass 3: Removing tool message with unmatched tool_call_id: ${toolCallId}`);
        continue;
      }

      // Check: not a duplicate
      if (seenToolCallIds.has(toolCallId)) {
        console.log(`Sanitizer Pass 3: Removing duplicate tool response for tool_call_id: ${toolCallId}`);
        continue;
      }

      // Check: don't exceed the number of tool_calls
      if (toolResponsesForCurrentAssistant >= currentAssistantToolCallCount) {
        console.log(`Sanitizer Pass 3: Removing excess tool response (${toolResponsesForCurrentAssistant + 1} > ${currentAssistantToolCallCount}) for tool_call_id: ${toolCallId}`);
        continue;
      }

      seenToolCallIds.add(toolCallId);
      toolResponsesForCurrentAssistant++;
      allMessagesForAI.push(msg);
    }

    // Pass 4: Strip tool_calls from any assistant message that still doesn't have
    // the correct number of tool responses following it (final safety net).
    for (let i = 0; i < allMessagesForAI.length; i++) {
      const msg = allMessagesForAI[i];
      if (msg.role === 'assistant' && (msg as any).tool_calls) {
        const expectedCount = (msg as any).tool_calls.length;
        let actualCount = 0;
        for (let j = i + 1; j < allMessagesForAI.length; j++) {
          if (allMessagesForAI[j].role === 'tool' || (allMessagesForAI[j] as any).tool_call_id) {
            actualCount++;
          } else {
            break;
          }
        }
        if (actualCount !== expectedCount) {
          console.log(`Sanitizer Pass 4: Stripping tool_calls from assistant (expected ${expectedCount} responses, found ${actualCount})`);
          const { tool_calls, ...rest } = msg;
          rest.content = rest.content || '(The DM processed an action.)';
          allMessagesForAI[i] = rest;
          // Also remove the orphaned tool responses that follow
          let removeCount = 0;
          for (let j = i + 1; j < allMessagesForAI.length; j++) {
            if (allMessagesForAI[j].role === 'tool' || (allMessagesForAI[j] as any).tool_call_id) {
              removeCount++;
            } else {
              break;
            }
          }
          if (removeCount > 0) {
            allMessagesForAI.splice(i + 1, removeCount);
          }
        }
      }
    }


    if (provider === 'anthropic') {
      // Anthropic does not directly support 'tool' role in messages for stream API,
      // and expects alternating user/assistant. Tool responses must be formatted
      // as part of a user message. This is a simplification.
      let anthropicMessages: { role: 'user' | 'assistant'; content: string | Anthropic.Messages.TextBlock[] }[] = [];
      let lastRole: 'user' | 'assistant' | null = null;

      for (const msg of allMessagesForAI) {
        if (msg.role === 'system') {
            // Anthropic typically expects a 'system' parameter, not a message role.
            // Since we pass 'systemPrompt' separately to streamAnthropic, we can skip adding it here
            // or convert it to an initial user message if needed.
            // For now, it's handled by streamAnthropic directly.
            continue;
        }

        let content: string | Anthropic.Messages.TextBlock[] = '';
        if (typeof msg.content === 'string') {
            content = msg.content;
        } else if (Array.isArray(msg.content)) {
            // Handle complex content types if necessary
            content = msg.content as Anthropic.Messages.TextBlock[];
        }

        if (msg.role === 'tool') {
            // Format tool response as a user message for Anthropic
            let toolResponseParsed: unknown;
            try {
              toolResponseParsed = JSON.parse((msg as { content: string }).content);
            } catch {
              toolResponseParsed = (msg as { content: string }).content;
            }
            const toolResponseName = (msg as { tool_call_id: string }).tool_call_id;
            const formattedToolResponse = `Tool_Result: <tool_code tool_name="${toolResponseName}">${typeof toolResponseParsed === 'string' ? toolResponseParsed : JSON.stringify(toolResponseParsed)}</tool_code>`;
            anthropicMessages.push({ role: 'user', content: formattedToolResponse });
            lastRole = 'user';
        } else if (msg.role === 'assistant') {
            if (lastRole === 'assistant') { // Merge consecutive assistant messages
                anthropicMessages[anthropicMessages.length - 1].content += `\n${content}`;
            } else {
                anthropicMessages.push({ role: 'assistant', content: content });
                lastRole = 'assistant';
            }
        } else if (msg.role === 'user') {
            if (lastRole === 'user') { // Merge consecutive user messages
                anthropicMessages[anthropicMessages.length - 1].content += `\n${content}`;
            } else {
                anthropicMessages.push({ role: 'user', content: content });
                lastRole = 'user';
            }
        }
      }
      // Ensure the *last* message is always from 'user' for Anthropic's API if it's expecting a prompt.
      // If the last message in allMessagesForAI was a tool response, it's converted to user.
      // If the last message in allMessagesForAI was an assistant tool_call, then the next user message is the tool response.

      const response = await streamAnthropic(client as Anthropic, modelToUse, systemPrompt, anthropicMessages, temperature, maxTokens, campaignId);

      // Check if response indicates rate limit or billing issue
      if (response.status === 429 || response.status === 402) {
        return { rateLimited: true };
      }
      return { response };
    } else if (provider === 'gemini') {
      // Gemini expects a 'history' of alternating 'user' and 'model' messages.
      // System prompt is handled by startChat's system instruction (or as first user message).
      // Tool responses need to be represented as functionResponse within a 'model' role.
      let geminiHistory: { role: 'user' | 'model', parts: ({ text: string } | { functionCall: any } | { functionResponse: any })[] }[] = [];

      for (const msg of allMessagesForAI) {
        if (msg.role === 'system') {
          // System prompt is handled separately or becomes first user message.
          // We already pass it to buildSystemPrompt, and it's included in startChat.
          continue;
        }
        
        if (msg.role === 'tool') {
            // Gemini function responses are part of the 'model' role, after a function call
            geminiHistory.push({
                role: 'model', // Tool responses are effectively part of the model's turn
                parts: [{
                    functionResponse: {
                        name: (msg as any).tool_call_id, // tool_call_id becomes the function name for response
                        response: JSON.parse((msg as { content: string }).content), // Assuming content is JSON
                    },
                }],
            });
        } else if (msg.role === 'user') {
            geminiHistory.push({ role: 'user', parts: [{ text: msg.content as string }] });
        } else if (msg.role === 'assistant') {
            if ((msg as any).tool_calls && (msg as any).tool_calls.length > 0) {
                // Assistant's tool call
                const functionCalls = (msg as any).tool_calls.map((tc: any) => ({
                    functionCall: {
                        name: tc.function.name,
                        args: JSON.parse(tc.function.arguments),
                    },
                }));
                geminiHistory.push({ role: 'model', parts: functionCalls });
            } else {
                // Assistant's text response
                geminiHistory.push({ role: 'model', parts: [{ text: msg.content as string }] });
            }
        }
      }
      
      // The last message in history for sendMessageStream must be from 'user'.
      // The actual current message to be sent via sendMessageStream is `allMessagesForAI[allMessagesForAI.length - 1]`.
      // If currentMessage was a tool_response, it should have been processed into geminiHistory.
      // If currentMessage was a user message, it should be the one sent.
      const lastMessage = allMessagesForAI[allMessagesForAI.length - 1];
      if (lastMessage.role !== 'user') {
          // This scenario needs careful handling. If the last message isn't user,
          // it means we're trying to send a tool response *after* a model message
          // or starting with a tool response. For Gemini's sendMessageStream,
          // the last one must be user.
          console.error('Gemini history error: Last message for sendMessageStream is not user. This might indicate an invalid conversation flow.');
          // Attempt to correct by finding the last user message, or returning error
          const lastUserMsgInHistory = geminiHistory.findLast(msg => msg.role === 'user');
          if (lastUserMsgInHistory) {
              console.warn('Attempting to recover by using last user message in history for sendMessageStream.');
              // This might still be incorrect if the user message was not the "current" message.
              // A more robust solution involves always ensuring the last message passed to
              // sendMessageStream is the *actual* user input that initiated the turn.
              // For now, will use a placeholder or error out.
              // Returning an error for now to force correct flow or indicate API limitation.
              return { error: "Gemini API requires the last message to sendMessageStream to be a user message, but the current flow is incorrect." };
          } else {
              return { error: "Gemini API requires the last message to sendMessageStream to be a user message. No user message found." };
          }
      }

      const response = await streamGemini(
        client as GoogleGenerativeAI,
        modelToUse,
        systemPrompt, // Passed as system instruction
        geminiHistory, // Use the carefully constructed history (last message extracted inside)
        temperature,
        maxTokens,
        campaignId,
        provider
      );

      if (response.status === 429 || response.status === 402) {
        return { rateLimited: true };
      }
      return { response };
    } else { // OpenAI compatible
      const openaiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = allMessagesForAI as OpenAI.Chat.ChatCompletionMessageParam[];

      const response = await streamOpenAICompatible(client as OpenAI, modelToUse, openaiMessages, temperature, maxTokens, campaignId, provider, forceNextTool);

      if (response.status === 429 || response.status === 402) {
        return { rateLimited: true };
      }
      return { response };
    }
  } catch (error: any) {
    console.error(`Error with provider ${provider}:`, error);
    // Treat rate limits (429), payment required (402), and billing/credit issues as retriable with fallback
    const status = error?.status || error?.response?.status;
    const errorMessage = error?.message || error?.error?.message || '';
    const isBillingIssue = (
      status === 400 || status === 402
    ) && (
      errorMessage.includes('credit balance') ||
      errorMessage.includes('billing') ||
      errorMessage.includes('quota') ||
      errorMessage.includes('payment')
    );

    if (status === 429 || status === 402 || isBillingIssue) {
      console.log(`Provider ${provider} unavailable (${isBillingIssue || status === 402 ? 'billing/credits issue' : 'rate limited'})`);
      return { rateLimited: true };
    }
    return { error: error.message || 'Unknown error' };
  }
}

export async function POST(request: NextRequest) {
  try {
    // Defensive check for empty body
    const contentLength = request.headers.get('content-length');
    if (!contentLength || parseInt(contentLength) === 0) {
      console.warn('Received POST request to /api/chat with empty or missing content-length header.');
      return new Response(JSON.stringify({ success: false, error: 'Request body is missing or empty.' }), { status: 400 });
    }

    const body = await request.json();
    const validation = postChatSchema.safeParse(body);

    if (!validation.success) {
      return new Response(JSON.stringify({ success: false, error: validation.error.issues }), { status: 400 });
    }

    const { campaignId, message, characterId, isWhisper, toolResponses, forceNextTool } = validation.data;

    let currentMessagesForAI: (OpenAI.Chat.ChatCompletionMessageParam | { role: 'tool', tool_call_id: string, content: string })[] = [];

    if (message) {
      // This is a regular user message
      const finalUserMessageContent = message.trim();
      currentMessagesForAI.push({ role: 'user', content: finalUserMessageContent });
      // Save user message first
      await messageService.createMessage({
        campaignId,
        role: 'user',
        content: finalUserMessageContent,
      });
    } else if (toolResponses) {
      // This is a set of tool responses
      // First check if these tool responses already exist in DB (from a previous retry)
      const existingMessages = await messageService.getRecentMessages(campaignId, 20);
      const existingToolCallIds = new Set(
        existingMessages
          .filter(m => m.role === 'tool' && m.tool_call_id)
          .map(m => m.tool_call_id)
      );

      const toolMessagesToSave = toolResponses
        .filter(toolResponse => !existingToolCallIds.has(toolResponse.tool_call_id))
        .map(toolResponse => ({
          campaignId,
          role: 'tool' as const,
          content: toolResponse.content,
          tool_call_id: toolResponse.tool_call_id,
        }));

      for (const toolResponse of toolResponses) {
        currentMessagesForAI.push({
          role: 'tool' as const,
          tool_call_id: toolResponse.tool_call_id,
          content: toolResponse.content,
        });
      }

      // Only save tool messages that don't already exist (prevents duplicates on retry)
      if (toolMessagesToSave.length > 0) {
        await Promise.all(toolMessagesToSave.map(msg => messageService.createMessage(msg)));
      } else {
        console.log('Tool responses already exist in DB — skipping save (retry detected)');
      }

    } else {
      // Should not happen due to refine(), but as a fallback
      return new Response(JSON.stringify({ success: false, error: 'Invalid chat input. Neither message nor tool response provided.' }), { status: 400 });
    }

    const [appSettings, campaign, characters, gameState, recentMessagesRaw, campaignContentSummary] = await Promise.all([
      settingsService.getSettings(true), // Decrypt keys
      campaignService.getCampaign(campaignId),
      characterService.getCharactersByCampaign(campaignId),
      campaignService.getGameState(campaignId),
      messageService.getRecentMessages(campaignId, 50),
      contentService.buildContentSummaryForAI(campaignId),
    ]);

    // Since we save messages to DB BEFORE loading recentMessages, the just-saved
    // messages are already in recentMessagesRaw. Clear currentMessagesForAI to
    // avoid duplicating them in the final message array. The sanitizer will
    // handle tool messages properly since they're already in the history.
    const recentMessages = recentMessagesRaw;
    currentMessagesForAI = [];

    const systemPrompt = buildSystemPrompt(campaign, characters, gameState, appSettings.globalPrompt, campaignContentSummary);

    // Extract settings for provider selection (MOVED HERE)
    const provider = (appSettings.defaultProvider || 'openai') as AIProvider;
    const savedModel = appSettings.defaultModel;
    const temperature = appSettings.temperature || 0.8;
    const maxTokens = appSettings.maxTokens || 4096;
    const autoFallback = appSettings.autoFallback ?? true; // Default to true

    // Validate that the saved model exists in the provider's available models
    const providerConfig = AI_PROVIDERS[provider];
    const modelExists = providerConfig?.models.some(m => m.id === savedModel);
    const model = modelExists
      ? savedModel
      : (providerConfig?.models.find(m => m.recommended)?.id || providerConfig?.models[0]?.id || savedModel);

    if (!modelExists) {
      console.log(`--- WARNING: Saved model "${savedModel}" not found in provider "${provider}", using fallback: ${model} ---`);
    }

    console.log('--- CHAT API: Fetched App Settings ---');
    console.log('Default Provider:', provider);
    console.log('Auto Fallback:', autoFallback);
    console.log('API Keys object:', Object.keys(appSettings.apiKeys || {}).reduce((acc, k) => {
      acc[k] = appSettings.apiKeys?.[k as AIProvider] ? 'SET' : 'NOT SET';
      return acc;
    }, {} as Record<string, string>));

    const apiKey = appSettings.apiKeys?.[provider];
    console.log(`API Key for ${provider}:`, apiKey ? 'Found' : 'NOT FOUND');

    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: `No API key configured for ${provider}. Please add one in Settings.` }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }



    // Try primary provider first
    const primaryResult = await tryProvider(
      provider, model, apiKey, systemPrompt, recentMessages,
      currentMessagesForAI, temperature, maxTokens, campaignId, forceNextTool
    );

    if (primaryResult.response && !primaryResult.rateLimited) {
      return primaryResult.response;
    }

    // If rate limited and auto-fallback is enabled, try other configured providers
    if (primaryResult.rateLimited && autoFallback) {
      console.log(`Provider ${provider} rate limited. Attempting fallback...`);

      // Get list of configured providers (excluding the primary one)
      const fallbackProviders: AIProvider[] = ['gemini', 'openai', 'anthropic', 'deepseek', 'openrouter']
        .filter((p): p is AIProvider => p !== provider && !!appSettings.apiKeys?.[p as AIProvider]);

      for (const fallbackProvider of fallbackProviders) {
        const fallbackApiKey = appSettings.apiKeys?.[fallbackProvider];
        if (!fallbackApiKey) continue;

        console.log(`Trying fallback provider: ${fallbackProvider}`);
        const fallbackModel = AI_PROVIDERS[fallbackProvider].models.find(m => m.recommended)?.id
          || AI_PROVIDERS[fallbackProvider].models[0].id;

        const fallbackResult = await tryProvider(
          fallbackProvider, fallbackModel, fallbackApiKey, systemPrompt, recentMessages,
          currentMessagesForAI, temperature, maxTokens, campaignId, forceNextTool
        );

        if (fallbackResult.response && !fallbackResult.rateLimited) {
          console.log(`Fallback to ${fallbackProvider} successful!`);
          return fallbackResult.response;
        }

        if (fallbackResult.rateLimited) {
          console.log(`Fallback provider ${fallbackProvider} also rate limited.`);
        }
      }

      // All providers rate limited
      return new Response(
        JSON.stringify({
          success: false,
          error: 'All configured AI providers are rate limited. Please wait a moment and try again.'
        }),
        { status: 429 }
      );
    }

    // Primary provider failed (not rate limited)
    if (primaryResult.error) {
      return new Response(
        JSON.stringify({ success: false, error: primaryResult.error }),
        { status: 500 }
      );
    }

    // Rate limited but no fallback
    return new Response(
      JSON.stringify({
        success: false,
        error: `${AI_PROVIDERS[provider].name} is rate limited. Enable auto-fallback in settings or wait a moment.`
      }),
      { status: 429 }
    );

  } catch (error) {
    console.error('Chat error:', error);
    return new Response(JSON.stringify({ success: false, error: 'Failed to process message' }), { status: 500 });
  }
}



// Get message history
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const validation = getChatHistorySchema.safeParse(Object.fromEntries(searchParams));

    if (!validation.success) {
      return new Response(
        JSON.stringify({ success: false, error: validation.error.issues }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    const { campaignId, limit = 50 } = validation.data;

    const messages = await messageService.getMessages(campaignId, limit);

    return new Response(
      JSON.stringify({ success: true, data: messages }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching messages:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to fetch messages' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// Clear all messages for a campaign (used to purge poisoned message history)
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = deleteChatSchema.safeParse(body);

    if (!validation.success) {
      return new Response(
        JSON.stringify({ success: false, error: validation.error.issues }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { campaignId } = validation.data;

    // Verify campaign exists
    const campaign = await campaignService.getCampaign(campaignId);
    if (!campaign) {
      return new Response(
        JSON.stringify({ success: false, error: 'Campaign not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    await messageService.clearMessages(campaignId);
    console.log(`[CHAT DELETE] Cleared all messages for campaign ${campaignId}`);

    return new Response(
      JSON.stringify({ success: true, message: 'All messages cleared' }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error clearing messages:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to clear messages' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
