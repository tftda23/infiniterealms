import { z } from 'zod';
import { tool } from 'ai';
import * as campaignService from '../services/campaign-service';
import * as characterService from '../services/character-service';
import * as messageService from '../services/message-service';
import { rollDice } from '../utils';

// ============================================
// Tool Definitions for AI DM
// ============================================

export function createDMTools(campaignId: string) {
  return {
    // ==========================================
    // Dice Rolling
    // ==========================================
    rollDice: tool({
      description: 'Roll dice using standard D&D notation (e.g., "2d6+3", "1d20", "4d6kh3")',
      parameters: z.object({
        notation: z.string().describe('Dice notation like "1d20+5" or "2d6"'),
        purpose: z.string().describe('What the roll is for (attack, damage, saving throw, etc.)'),
      }),
      execute: async ({ notation, purpose }) => {
        try {
          const result = rollDice(notation);
          return {
            success: true,
            notation,
            purpose,
            rolls: result.rolls,
            modifier: result.modifier,
            total: result.total,
            criticalHit: result.criticalHit,
            criticalMiss: result.criticalMiss,
          };
        } catch (error) {
          return { success: false, error: String(error) };
        }
      },
    }),

    requestDiceRoll: tool({
      description: 'Request a dice roll from the player for a skill check, saving throw, or attack roll. This tool signals to the UI that a player-initiated roll is required.',
      parameters: z.object({
        skill: z.string().describe('The skill or ability to roll for (e.g., "Investigation", "Strength", "Initiative").'),
        dc: z.number().optional().describe('The difficulty class (DC) of the check. If not applicable (like for Initiative), omit.'),
        isGroupRoll: z.boolean().optional().describe('Whether this is a group roll for all players (e.g., group stealth or initiative).'),
      }),
      execute: async ({ skill, dc, isGroupRoll }) => {
        // This tool simply signals the front-end to prompt the player for a roll.
        // The actual roll execution will happen on the client-side.
        return {
          success: true,
          message: `Player has been requested to roll for ${skill}${dc ? ` (DC ${dc})` : ''}.`,
          requestedRoll: { skill, dc, isGroupRoll },
        };
      },
    }),

    // ==========================================
    // NPC Management
    // ==========================================
    addNpc: tool({
      description: 'Add a new NPC to the campaign that the party has encountered',
      parameters: z.object({
        name: z.string().describe('Name of the NPC'),
        race: z.string().describe('Race of the NPC (Human, Elf, Dwarf, etc.)'),
        occupation: z.string().describe('What the NPC does (Blacksmith, Guard, Wizard, etc.)'),
        location: z.string().describe('Where the NPC can typically be found'),
        disposition: z.enum(['friendly', 'neutral', 'hostile', 'unknown']).describe('NPC attitude toward the party'),
        description: z.string().describe('Physical description and notable features'),
      }),
      execute: async ({ name, race, occupation, location, disposition, description }) => {
        await campaignService.addNpc(campaignId, {
          name,
          race,
          occupation,
          location,
          disposition,
          description,
          notes: '',
          isAlive: true,
          firstMetAt: new Date(),
        });
        return { success: true, message: `NPC "${name}" has been added to your campaign.` };
      },
    }),

    updateNpc: tool({
      description: 'Update information about an existing NPC',
      parameters: z.object({
        npcId: z.string().describe('ID of the NPC to update'),
        updates: z.object({
          disposition: z.enum(['friendly', 'neutral', 'hostile', 'unknown']).optional(),
          location: z.string().optional(),
          notes: z.string().optional(),
          isAlive: z.boolean().optional(),
        }),
      }),
      execute: async ({ npcId, updates }) => {
        await campaignService.updateNpc(campaignId, npcId, updates);
        return { success: true, message: 'NPC updated.' };
      },
    }),

    // ==========================================
    // Quest Management
    // ==========================================
    addQuest: tool({
      description: 'Add a new quest that the party has discovered or been given',
      parameters: z.object({
        name: z.string().describe('Name/title of the quest'),
        description: z.string().describe('What the quest involves'),
        objectives: z.array(z.object({
          description: z.string(),
          optional: z.boolean().default(false),
        })).describe('List of quest objectives'),
        priority: z.enum(['main', 'side', 'personal']).describe('Quest importance'),
        rewards: z.string().optional().describe('Expected rewards'),
      }),
      execute: async ({ name, description, objectives, priority, rewards }) => {
        await campaignService.addQuest(campaignId, {
          name,
          description,
          status: 'active',
          objectives: objectives.map((obj, i) => ({
            id: `obj-${i}`,
            description: obj.description,
            completed: false,
            optional: obj.optional,
          })),
          priority,
          rewards: rewards || '',
        });
        return { success: true, message: `Quest "${name}" has been added to your journal.` };
      },
    }),

    updateQuestStatus: tool({
      description: 'Update the status of a quest or complete objectives',
      parameters: z.object({
        questId: z.string().describe('ID of the quest'),
        status: z.enum(['available', 'active', 'completed', 'failed', 'abandoned']).optional(),
        completedObjectiveIds: z.array(z.string()).optional().describe('IDs of objectives to mark complete'),
      }),
      execute: async ({ questId, status, completedObjectiveIds }) => {
        const campaign = await campaignService.getCampaign(campaignId);
        if (!campaign) return { success: false, error: 'Campaign not found' };

        const quest = campaign.quests.find(q => q.id === questId);
        if (!quest) return { success: false, error: 'Quest not found' };

        const updates: Record<string, unknown> = {};
        if (status) {
          updates.status = status;
          if (status === 'completed') updates.completedAt = new Date();
        }
        if (completedObjectiveIds) {
          updates.objectives = quest.objectives.map(obj => ({
            ...obj,
            completed: completedObjectiveIds.includes(obj.id) || obj.completed,
          }));
        }

        await campaignService.updateQuest(campaignId, questId, updates);
        return { success: true, message: 'Quest updated.' };
      },
    }),

    // ==========================================
    // Inventory Management
    // ==========================================
    addItem: tool({
      description: 'Add an item to a character\'s inventory',
      parameters: z.object({
        characterId: z.string().describe('ID of the character receiving the item'),
        name: z.string().describe('Name of the item'),
        type: z.enum(['weapon', 'armor', 'potion', 'scroll', 'wondrous', 'gear', 'treasure', 'other']),
        quantity: z.number().default(1),
        description: z.string().optional(),
        magical: z.boolean().default(false),
        value: z.number().optional().describe('Value in copper pieces'),
      }),
      execute: async ({ characterId, name, type, quantity, description, magical, value }) => {
        await characterService.addInventoryItem(characterId, {
          name,
          type,
          quantity,
          description: description || '',
          magical,
          value: value || 0,
          weight: 0,
          equipped: false,
          attuned: false,
          requiresAttunement: false,
        });
        return { success: true, message: `${name} (x${quantity}) added to inventory.` };
      },
    }),

    removeItem: tool({
      description: 'Remove an item from a character\'s inventory',
      parameters: z.object({
        itemId: z.string().describe('ID of the item to remove'),
        quantity: z.number().optional().describe('Amount to remove (removes all if not specified)'),
      }),
      execute: async ({ itemId, quantity }) => {
        await characterService.removeInventoryItem(itemId);
        return { success: true, message: 'Item removed from inventory.' };
      },
    }),

    // ==========================================
    // Gold/Currency
    // ==========================================
    modifyGold: tool({
      description: 'Add or remove gold from the party treasury',
      parameters: z.object({
        amount: z.number().describe('Amount to add (positive) or remove (negative)'),
        reason: z.string().describe('Why the gold is being added/removed'),
      }),
      execute: async ({ amount, reason }) => {
        const gameState = await campaignService.getGameState(campaignId);
        if (!gameState) return { success: false, error: 'Game state not found' };

        const newGold = Math.max(0, gameState.partyGold + amount);
        await campaignService.updateGameState(campaignId, { partyGold: newGold });

        const action = amount >= 0 ? 'gained' : 'spent';
        return {
          success: true,
          message: `Party ${action} ${Math.abs(amount)} gold. (${reason}) Total: ${newGold} gp`,
        };
      },
    }),

    // ==========================================
    // Character HP
    // ==========================================
    modifyHp: tool({
      description: 'Deal damage or heal a character',
      parameters: z.object({
        characterId: z.string().describe('ID of the character'),
        amount: z.number().describe('Positive for healing, negative for damage'),
        source: z.string().describe('What caused the HP change'),
      }),
      execute: async ({ characterId, amount, source }) => {
        let result;
        if (amount >= 0) {
          result = await characterService.healCharacter(characterId, amount);
        } else {
          result = await characterService.damageCharacter(characterId, Math.abs(amount));
        }

        if (!result) return { success: false, error: 'Character not found' };

        const action = amount >= 0 ? 'healed' : 'took';
        const absAmount = Math.abs(amount);
        return {
          success: true,
          message: `${result.name} ${action} ${absAmount} HP (${source}). HP: ${result.currentHp}/${result.maxHp}`,
          currentHp: result.currentHp,
          maxHp: result.maxHp,
        };
      },
    }),

    // ==========================================
    // Combat Management
    // ==========================================
    startCombat: tool({
      description: 'Start combat encounter and set up initiative order',
      parameters: z.object({
        enemies: z.array(z.object({
          name: z.string(),
          initiative: z.number(),
          hp: z.number(),
          maxHp: z.number(),
        })).describe('List of enemies with their initiative and HP'),
      }),
      execute: async ({ enemies }) => {
        const characters = await characterService.getCharactersByCampaign(campaignId);

        // Build initiative order
        const initiativeOrder = [
          ...characters.map(c => ({
            id: c.id,
            name: c.name,
            initiative: rollDice('1d20').total + Math.floor((c.abilityScores.dexterity - 10) / 2),
            isPlayer: true,
            characterId: c.id,
            hp: c.currentHp,
            maxHp: c.maxHp,
            conditions: [],
          })),
          ...enemies.map((e, i) => ({
            id: `enemy-${i}`,
            name: e.name,
            initiative: e.initiative,
            isPlayer: false,
            hp: e.hp,
            maxHp: e.maxHp,
            conditions: [],
          })),
        ].sort((a, b) => b.initiative - a.initiative);

        await campaignService.updateGameState(campaignId, {
          inCombat: true,
          initiativeOrder,
          currentTurn: 0,
          round: 1,
        });

        const order = initiativeOrder.map((e, i) => `${i + 1}. ${e.name} (${e.initiative})`).join('\n');
        return {
          success: true,
          message: `Combat started!\n\nInitiative Order:\n${order}`,
          initiativeOrder,
        };
      },
    }),

    startEncounter: tool({
      description: 'Signals the start of a combat encounter, optionally specifying the initial combatants. This tool primarily informs the UI.',
      parameters: z.object({
        combatants: z.array(z.string()).optional().describe('Names of the initial combatants in the encounter (e.g., "Goblin Sentry", "James").'),
      }),
      execute: async ({ combatants }) => {
        // This tool simply signals the front-end to begin an encounter
        // The actual detailed combat setup (initiative, HP, etc.) will be handled client-side.
        return {
          success: true,
          message: `Encounter initiated with combatants: ${combatants?.join(', ') || 'unknown'}.`,
          initiatedCombatants: combatants,
        };
      },
    }),

    endEncounter: tool({
      description: 'Signals the end of a combat encounter. Call this when all enemies are defeated. This tool primarily informs the UI.',
      parameters: z.object({}),
      execute: async () => {
        // This tool simply signals the front-end that the encounter has ended.
        // The actual detailed combat cleanup (like setting outcome) will be handled client-side.
        return {
          success: true,
          message: 'Encounter has ended.',
        };
      },
    }),

    endCombat: tool({
      description: 'End the current combat encounter',
      parameters: z.object({
        outcome: z.enum(['victory', 'defeat', 'fled', 'negotiated']),
        summary: z.string().optional(),
      }),
      execute: async ({ outcome, summary }) => {
        await campaignService.updateGameState(campaignId, {
          inCombat: false,
          initiativeOrder: [],
          currentTurn: 0,
          round: 0,
        });

        return {
          success: true,
          message: `Combat ended: ${outcome}. ${summary || ''}`,
        };
      },
    }),

    nextTurn: tool({
      description: 'Advance to the next turn in combat',
      parameters: z.object({}),
      execute: async () => {
        const gameState = await campaignService.getGameState(campaignId);
        if (!gameState || !gameState.inCombat) {
          return { success: false, error: 'Not in combat' };
        }

        const nextTurn = (gameState.currentTurn + 1) % gameState.initiativeOrder.length;
        const newRound = nextTurn === 0 ? gameState.round + 1 : gameState.round;

        await campaignService.updateGameState(campaignId, {
          currentTurn: nextTurn,
          round: newRound,
        });

        const current = gameState.initiativeOrder[nextTurn];
        return {
          success: true,
          message: `Round ${newRound}, ${current.name}'s turn.`,
          currentTurn: current,
          round: newRound,
        };
      },
    }),

    // ==========================================
    // Scene Management
    // ==========================================
    setScene: tool({
      description: 'Update the current scene description and location',
      parameters: z.object({
        scene: z.string().describe('Description of the current scene'),
        location: z.string().optional().describe('Name of the current location'),
        timeOfDay: z.enum(['dawn', 'morning', 'midday', 'afternoon', 'evening', 'night']).optional(),
        weather: z.string().optional(),
      }),
      execute: async ({ scene, location, timeOfDay, weather }) => {
        const updates: Record<string, unknown> = { currentScene: scene };
        if (timeOfDay) updates.timeOfDay = timeOfDay;
        if (weather) updates.weather = weather;

        await campaignService.updateGameState(campaignId, updates);

        if (location) {
          await campaignService.updateCampaign(campaignId, { currentLocation: location });
        }

        return { success: true, message: 'Scene updated.', sceneChange: true };
      },
    }),

    // ==========================================
    // Rule Violation Tracking
    // ==========================================
    flagRuleViolation: tool({
      description: 'Flag a potential rule violation or inconsistency in gameplay',
      parameters: z.object({
        type: z.enum(['combat', 'spell', 'ability', 'item', 'other']),
        description: z.string().describe('What rule was potentially violated'),
        severity: z.enum(['info', 'warning', 'error']),
      }),
      execute: async ({ type, description, severity }) => {
        await messageService.createRuleViolation({
          campaignId,
          type,
          description,
          severity,
        });

        return {
          success: true,
          message: `Rule note recorded: ${description}`,
        };
      },
    }),
  };
}

export type DMTools = ReturnType<typeof createDMTools>;
