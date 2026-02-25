'use client';

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';
import {
  Sword,
  ArrowLeft,
  Settings,
  Loader2,
  Bot,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  BookOpen,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { DMChat, THEME_STYLES } from '@/components/dm-chat';
import type { EnvironmentTheme, ToolCallResult } from '@/components/dm-chat';
import { CharacterSheet } from '@/components/character-sheet';
import { GameStatePanel } from '@/components/game-state-panel';
import { EncounterTracker } from '@/components/encounter-tracker';
// CombatGrid removed — combat is now AI-driven Theater of the Mind
import { DiceRollOverlay, type RollDisplay } from '@/components/dice-roll-overlay';
import { DeathSaveOverlay } from '@/components/death-save-overlay';
import type { DeathSaveResult } from '@/components/death-save-overlay';
import { AmbientAudio } from '@/components/ambient-audio';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { Campaign, Character, GameState, InventoryItem, Spell, DiceRoll, InitiativeEntry, SessionLog } from '@/types';
import { awardXP, createXPTracker, xpToNextLevel, suggestCombatXP, XPCategory, XPAwardResult, XP_CATEGORY_LABELS } from '@/lib/xp-engine';
import type { XPTracker } from '@/lib/xp-engine';

// Enemy stat blocks for common creatures
const ENEMY_STAT_BLOCKS: Record<string, { hp: number; ac: number; speed: number }> = {
  goblin: { hp: 7, ac: 15, speed: 30 },
  sentry: { hp: 7, ac: 15, speed: 30 },
  wolf: { hp: 11, ac: 13, speed: 40 },
  orc: { hp: 15, ac: 13, speed: 30 },
  skeleton: { hp: 13, ac: 13, speed: 30 },
  zombie: { hp: 22, ac: 8, speed: 20 },
  bandit: { hp: 11, ac: 12, speed: 30 },
};

// Grid size constant kept for backward compatibility with encounter data
const GRID_SIZE_CONST = 20;

// ─── CONTEXT-AWARE QUICK ACTIONS ────────────────────────────────
function getContextActions(
  gameState: GameState | null,
  character: Character | null,
  envTheme: EnvironmentTheme,
): string[] {
  if (!gameState || !character) return ['Look around', 'What do I see?'];

  const scene = (gameState.currentScene || '').toLowerCase();
  const hpPct = character.maxHp > 0 ? character.currentHp / character.maxHp : 1;
  const isLowHp = hpPct <= 0.35;
  const hasSpells = character.spellcastingAbility && character.spellcastingAbility !== '';

  // ── COMBAT ───────────────────────────────────────────────
  if (gameState.inCombat) {
    const actions: string[] = [
      'I attack the nearest enemy',
      'I want to disengage and move to safety',
    ];
    if (hasSpells) {
      actions.push('I cast a spell');
    } else {
      actions.push('I use a ranged attack');
    }
    if (isLowHp) {
      actions.push('I take the Dodge action');
    } else {
      actions.push('I try to help an ally');
    }
    return actions;
  }

  // ── PENDING ROLL (not in combat) ─────────────────────────
  // (handled separately in the caller)

  // ── LOW HP — always suggest rest ─────────────────────────
  if (isLowHp) {
    return [
      'Find a safe place to rest',
      'Search for healing supplies',
      'Look around cautiously',
      'Check my inventory',
    ];
  }

  // ── ENVIRONMENT-THEMED EXPLORATION ───────────────────────
  switch (envTheme) {
    case 'tavern':
      return [
        'Talk to the barkeep',
        'Listen for rumors',
        'Look for a notice board',
        'Order food and drink',
      ];
    case 'dungeon':
    case 'cave':
      return [
        'Search for traps',
        'Investigate the area carefully',
        'Listen at the next door',
        'Light a torch and press on',
      ];
    case 'forest':
      return [
        'Follow the trail deeper',
        'Forage for supplies',
        'Climb a tree to scout ahead',
        'Search for tracks',
      ];
    case 'city':
      return [
        'Ask a local for directions',
        'Visit the market',
        'Look for a tavern or inn',
        'Search for rumors or bounties',
      ];
    case 'ocean':
      return [
        'Scan the horizon',
        'Check the ship\'s supplies',
        'Talk to the crew',
        'Look for land or another vessel',
      ];
    case 'temple':
      return [
        'Examine the altar',
        'Search for hidden passages',
        'Read the inscriptions',
        'Offer a prayer',
      ];
    case 'desert':
      return [
        'Search for shade or shelter',
        'Look for water',
        'Scan the dunes for movement',
        'Press forward carefully',
      ];
    case 'mountain':
      return [
        'Scout the path ahead',
        'Look for a cave or shelter',
        'Climb higher for a vantage point',
        'Search for mountain herbs',
      ];
    case 'swamp':
      return [
        'Test the ground before stepping',
        'Look for solid footing',
        'Search for useful herbs',
        'Listen for creatures nearby',
      ];
    case 'snow':
      return [
        'Search for shelter from the cold',
        'Follow tracks in the snow',
        'Look for firewood',
        'Press onward through the storm',
      ];
    case 'fire':
      return [
        'Search for a safe path',
        'Look for something heat-resistant',
        'Investigate the source of the flames',
        'Find a way around',
      ];
    case 'sky':
      return [
        'Look for a landing spot',
        'Scan the clouds for threats',
        'Check our course and heading',
        'Talk to my companions',
      ];
    case 'night':
      return [
        'Set up camp for the night',
        'Keep watch in the darkness',
        'Search by torchlight',
        'Rest until dawn',
      ];
    case 'dawn':
      return [
        'Break camp and prepare to move',
        'Scout the area in the morning light',
        'Look around the area',
        'Check my equipment',
      ];
    default:
      break;
  }

  // ── SCENE-KEYWORD FALLBACKS ──────────────────────────────
  if (scene.includes('battle') || scene.includes('enemy') || scene.includes('hostile')) {
    return ['Prepare for combat', 'Try to negotiate', 'Look for cover', 'Scout their numbers'];
  }
  if (scene.includes('npc') || scene.includes('merchant') || scene.includes('villager') || scene.includes('guard')) {
    return ['Talk to them', 'Ask for information', 'Trade goods', 'Move along'];
  }
  if (scene.includes('chest') || scene.includes('treasure') || scene.includes('loot')) {
    return ['Open it carefully', 'Check for traps first', 'Search the room for more', 'Take the loot and move on'];
  }
  if (scene.includes('door') || scene.includes('gate') || scene.includes('passage')) {
    return ['Open the door', 'Listen at the door', 'Check for traps', 'Look for another way'];
  }

  // ── DEFAULT EXPLORATION ──────────────────────────────────
  return [
    'Look around the area',
    'Talk to nearby NPCs',
    'Check my inventory',
    'Rest for a while',
  ];
}

// Detect environment theme from location, scene, and time of day
function detectEnvironmentTheme(campaign?: Campaign | null, gameState?: GameState | null): EnvironmentTheme {
  if (!campaign || !gameState) return 'default';

  const location = (campaign.currentLocation || '').toLowerCase();
  const scene = (gameState.currentScene || '').toLowerCase();
  const combined = `${location} ${scene}`;
  const timeOfDay = gameState.timeOfDay;

  // Check for specific environments (order matters - more specific first)
  if (combined.includes('cave') || combined.includes('cavern') || combined.includes('underground') || combined.includes('mine')) return 'cave';
  if (combined.includes('dungeon') || combined.includes('crypt') || combined.includes('tomb') || combined.includes('prison') || combined.includes('cell')) return 'dungeon';
  if (combined.includes('temple') || combined.includes('church') || combined.includes('shrine') || combined.includes('cathedral') || combined.includes('altar')) return 'temple';
  if (combined.includes('tavern') || combined.includes('inn') || combined.includes('pub') || combined.includes('bar') || combined.includes('alehouse')) return 'tavern';
  if (combined.includes('forest') || combined.includes('woods') || combined.includes('grove') || combined.includes('glade') || combined.includes('jungle') || combined.includes('tree')) return 'forest';
  if (combined.includes('ocean') || combined.includes('sea') || combined.includes('river') || combined.includes('lake') || combined.includes('waterfall') || combined.includes('coast') || combined.includes('ship') || combined.includes('boat') || combined.includes('port') || combined.includes('harbor')) return 'ocean';
  if (combined.includes('desert') || combined.includes('sand') || combined.includes('dune') || combined.includes('oasis') || combined.includes('arid')) return 'desert';
  if (combined.includes('mountain') || combined.includes('peak') || combined.includes('cliff') || combined.includes('summit') || combined.includes('hill') || combined.includes('pass')) return 'mountain';
  if (combined.includes('swamp') || combined.includes('marsh') || combined.includes('bog') || combined.includes('fen') || combined.includes('mire')) return 'swamp';
  if (combined.includes('snow') || combined.includes('ice') || combined.includes('frost') || combined.includes('frozen') || combined.includes('tundra') || combined.includes('blizzard') || combined.includes('glacier')) return 'snow';
  if (combined.includes('fire') || combined.includes('lava') || combined.includes('volcano') || combined.includes('inferno') || combined.includes('flame') || combined.includes('forge')) return 'fire';
  if (combined.includes('sky') || combined.includes('cloud') || combined.includes('flying') || combined.includes('airship') || combined.includes('tower')) return 'sky';
  if (combined.includes('city') || combined.includes('town') || combined.includes('village') || combined.includes('market') || combined.includes('castle') || combined.includes('palace') || combined.includes('street')) return 'city';

  // Fall back to time of day
  if (timeOfDay === 'night') return 'night';
  if (timeOfDay === 'dawn') return 'dawn';

  return 'default';
}

function GamePageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const campaignId = searchParams.get('campaignId');

  const [loading, setLoading] = useState(true);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const campaignRef = useRef<Campaign | null>(null);
  useEffect(() => {
    campaignRef.current = campaign;
  }, [campaign]);

  const [characters, setCharacters] = useState<Character[]>([]);
  const charactersRef = useRef<Character[]>(characters);
  useEffect(() => {
    charactersRef.current = characters;
  }, [characters]);

  const [gameState, setGameState] = useState<GameState | null>(null);
  const gameStateRef = useRef<GameState | null>(null);
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [spells, setSpells] = useState<Spell[]>([]);
  const [suggestedActions, setSuggestedActions] = useState<string[]>([]);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [pendingRoll, setPendingRoll] = useState<{ roll: DiceRoll; description: string } | null>(null);
  const [diceQueue, setDiceQueue] = useState<RollDisplay[]>([]);
  const [requestedRoll, setRequestedRoll] = useState<{ skill: string; dc?: number; isGroupRoll?: boolean; advantage?: 'normal' | 'advantage' | 'disadvantage'; toolCallId: string } | null>(null);
  const [requestedSavingThrow, setRequestedSavingThrow] = useState<{ ability: string; dc: number; characterName?: string; source?: string; advantage?: 'normal' | 'advantage' | 'disadvantage'; toolCallId: string } | null>(null);
  const [systemMessage, setSystemMessage] = useState<{ content: string; timestamp: number } | undefined>();
  const openingSceneSent = useRef(false);
  const [xpTracker] = useState<XPTracker>(() => createXPTracker());
  const [lastXPAward, setLastXPAward] = useState<{ result: XPAwardResult; category: XPCategory; reason: string } | null>(null);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [deathSaveTarget, setDeathSaveTarget] = useState<{ id: string; name: string } | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [lastSessionSummary, setLastSessionSummary] = useState<string | null>(null);
  const [sessionNumber, setSessionNumber] = useState(1);

  // Stable callback for DiceRollOverlay — avoids re-triggering the roll effect
  const handleDiceOverlayComplete = useCallback(() => {
    setPendingRoll(null);
  }, []);

  // Death save overlay — trigger handler
  const handleDeathSaveOverlay = useCallback((combatantId: string, combatantName: string) => {
    setDeathSaveTarget({ id: combatantId, name: combatantName });
  }, []);

  // Handle game state updates (for combat tracker)
  const handleUpdateGameState = async (updates: Partial<GameState>) => {
    const currentState = gameStateRef.current;
    if (!currentState || !campaignId) return;
    try {
      const res = await fetch(`/api/game-state?campaignId=${campaignId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (data.success) {
        gameStateRef.current = data.data;
        setGameState(data.data);
      }
    } catch (error) {
      toast.error('Failed to update game state');
    }
  };

  // Death save overlay — result handler (must be after handleUpdateGameState)
  const handleDeathSaveComplete = useCallback(async (result: DeathSaveResult) => {
    if (!deathSaveTarget || !gameState) {
      setDeathSaveTarget(null);
      return;
    }

    const deathSaveData = { successes: result.successes, failures: result.failures };

    if (result.outcome === 'revived') {
      // Nat 20: set HP to 1, clear death saves
      const newOrder = gameState.initiativeOrder.map(c =>
        c.id === deathSaveTarget.id ? { ...c, hp: 1, deathSaves: undefined, conditions: (c.conditions || []).filter(cnd => cnd !== 'Unconscious') } : c
      );
      await handleUpdateGameState({ initiativeOrder: newOrder });
      toast.success(`${deathSaveTarget.name} surges back with 1 HP!`);
    } else if (result.outcome === 'dead') {
      // Store final death saves, add Dead condition
      const newOrder = gameState.initiativeOrder.map(c =>
        c.id === deathSaveTarget.id ? { ...c, deathSaves: deathSaveData, conditions: [...(c.conditions || []).filter(cnd => cnd !== 'Unconscious'), 'Dead'] } : c
      );
      await handleUpdateGameState({ initiativeOrder: newOrder });
      toast.error(`${deathSaveTarget.name} has perished...`);
    } else if (result.outcome === 'stabilized') {
      // Store stabilized state, keep Unconscious
      const newOrder = gameState.initiativeOrder.map(c =>
        c.id === deathSaveTarget.id ? { ...c, deathSaves: deathSaveData, conditions: [...new Set([...(c.conditions || []), 'Unconscious'])] } : c
      );
      await handleUpdateGameState({ initiativeOrder: newOrder });
      toast.success(`${deathSaveTarget.name} is stabilized.`);
    }

    setDeathSaveTarget(null);
  }, [deathSaveTarget, gameState]);

  // End session — save summary
  const handleEndSession = useCallback(async () => {
    if (!currentSessionId || !campaignId) return;
    try {
      // Fetch recent messages for a quick summary
      const summaryRes = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'summarize', campaignId }),
      });
      const summaryData = await summaryRes.json();

      // Build a simple extractive summary from assistant messages
      let summary = 'An adventurous session of exploration and discovery.';
      if (summaryData.success && summaryData.data?.narrative) {
        const lines = summaryData.data.narrative.split('\n')
          .filter((l: string) => l.startsWith('DM:'))
          .map((l: string) => l.replace('DM: ', ''));
        // Take the last 3 DM messages as a rough recap
        const recentNarrative = lines.slice(-3).join(' ');
        if (recentNarrative.length > 30) {
          summary = recentNarrative.length > 300
            ? recentNarrative.slice(0, 297) + '...'
            : recentNarrative;
        }
      }

      await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'end',
          sessionId: currentSessionId,
          summary,
          highlights: [],
        }),
      });

      toast.success(`Session ${sessionNumber} ended!`);
      setCurrentSessionId(null);
    } catch {
      toast.error('Failed to end session');
    }
  }, [currentSessionId, campaignId, sessionNumber]);

  // Import rollDice utility
  const { rollDice } = require('@/lib/utils');

  // Detect environment theme
  const environmentTheme = useMemo(
    () => detectEnvironmentTheme(campaign, gameState),
    [campaign?.currentLocation, gameState?.currentScene, gameState?.timeOfDay]
  );

  const theme = useMemo(
    () => THEME_STYLES[environmentTheme] || THEME_STYLES.default,
    [environmentTheme]
  );

  // Refresh game state and campaign data from API
  const refreshGameData = useCallback(async () => {
    if (!campaignId) return;
    try {
      const [campaignRes, gameStateRes, charactersRes] = await Promise.all([
        fetch(`/api/campaigns/${campaignId}`),
        fetch(`/api/game-state?campaignId=${campaignId}`),
        fetch(`/api/characters?campaignId=${campaignId}`),
      ]);
      const [campaignData, gameStateData, charactersData] = await Promise.all([
        campaignRes.json(),
        gameStateRes.json(),
        charactersRes.json(),
      ]);
      if (campaignData.success) setCampaign(campaignData.data);
      if (gameStateData.success) setGameState(gameStateData.data);
      if (charactersData.success) {
        setCharacters(charactersData.data);
        // Update selected character if it exists in new data
        const charId = selectedCharacter?.id;
        if (charId) {
          const updated = charactersData.data.find((c: Character) => c.id === charId);
          if (updated) setSelectedCharacter(updated);
          // Also refresh inventory and spells
          try {
            const extrasRes = await fetch(`/api/characters/${charId}?include=inventory,spells`);
            const extrasData = await extrasRes.json();
            if (extrasData.success) {
              if (extrasData.data.inventory) setInventory(extrasData.data.inventory);
              if (extrasData.data.spells) setSpells(extrasData.data.spells);
            }
          } catch { /* non-critical */ }
        }
      }
    } catch (error) {
      console.error('Failed to refresh game data:', error);
    }
  }, [campaignId, selectedCharacter?.id]);

  // Handle XP award
  const handleAwardXP = useCallback(async (category: XPCategory, amount: number, reason: string) => {
    if (!characters.length) return;
    const char = characters[0]; // Primary character
    const result = awardXP(category, amount, char.level, char.experience, xpTracker);

    // Update character XP in database
    try {
      const updateData: any = { experience: result.newTotalXP };

      if (result.levelUp) {
        updateData.level = result.newLevel;
        // Recalculate proficiency bonus
        updateData.proficiencyBonus = Math.floor((result.newLevel - 1) / 4) + 2;
      }

      await fetch(`/api/characters/${char.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      // Update local character state
      setCharacters(prev => prev.map(c =>
        c.id === char.id
          ? { ...c, experience: result.newTotalXP, level: result.newLevel, proficiencyBonus: updateData.proficiencyBonus || c.proficiencyBonus }
          : c
      ));

      // Show XP notification
      setLastXPAward({ result, category, reason });

      // Auto-hide after 4 seconds
      setTimeout(() => setLastXPAward(null), 4000);

      if (result.levelUp) {
        setShowLevelUp(true);
        setTimeout(() => setShowLevelUp(false), 6000);
      }
    } catch (err) {
      console.error('Failed to award XP:', err);
    }
  }, [characters, xpTracker]);

  // Handle AI Tool Calls — returns results for tool calls that need AI continuation
  const handleToolCall = useCallback(async (toolCalls: any[]): Promise<ToolCallResult[]> => {
    const results: ToolCallResult[] = [];

    for (const toolCall of toolCalls) {
      const funcName = toolCall.function?.name || toolCall.name;
      const toolId = toolCall.id || `tool-${Date.now()}`;
      const args = typeof toolCall.function?.arguments === 'string'
        ? JSON.parse(toolCall.function.arguments)
        : toolCall.function?.arguments || toolCall.args || {};

      console.log(`Handling tool call: ${funcName}`, args);

      const currentGameState = gameStateRef.current;
      const currentCharacters = charactersRef.current;

      switch (funcName) {
        // ── Dice rolls: show overlay for player to click, return result to prevent orphaned tool calls ──
        case 'requestDiceRoll':
          setRequestedRoll({ skill: args.skill, dc: args.dc, isGroupRoll: args.isGroupRoll, advantage: args.advantage || 'normal', toolCallId: toolCall.id });
          // Return a result so the tool call isn't orphaned in conversation history.
          // The AI should tell the player it's time to roll, then STOP and wait.
          // The actual roll result will come via systemMessage after the player clicks.
          results.push({
            id: toolId,
            result: `Dice roll requested for ${args.skill}. The player is now rolling dice. STOP HERE — do NOT narrate any outcome yet. Wait for the [ROLL RESULT] message with the actual numbers before continuing.`,
          });
          break;

        case 'requestSavingThrow':
          setRequestedSavingThrow({
            ability: args.ability,
            dc: args.dc,
            characterName: args.characterName,
            source: args.source,
            advantage: args.advantage || 'normal',
            toolCallId: toolCall.id,
          });
          results.push({
            id: toolId,
            result: `Saving throw requested: ${args.ability} DC ${args.dc}. The player is now rolling. STOP HERE — do NOT narrate any outcome yet. Wait for the [SAVING THROW RESULT] message before continuing.`,
          });
          break;

        // ── These tool calls auto-continue — return results to trigger AI narration ──

        case 'startEncounter': {
          const combatantNames = args.combatants || [];
          toast.info(`Combat begins! Combatants: ${combatantNames.join(', ')}`);

          const initiativeEntries: InitiativeEntry[] = [];

          // Add player characters — roll initiative with visible dice
          for (const char of currentCharacters) {
            const dexMod = Math.floor(((char.abilityScores?.dexterity || 10) - 10) / 2);
            const initRoll = Math.floor(Math.random() * 20) + 1;
            const initTotal = initRoll + dexMod;

            // Show the player's initiative roll on screen
            const initRollDisplay: RollDisplay = {
              id: `init-${char.id}-${Date.now()}`,
              label: `${char.name} rolls Initiative`,
              type: 'player_check',
              dice: [{ faces: 20, value: initRoll }],
              rolls: [initRoll],
              modifier: dexMod,
              total: initTotal,
              isNPC: false,
              autoTime: 2500,
            };
            setDiceQueue(prev => [...prev, initRollDisplay]);

            initiativeEntries.push({
              id: char.id,
              name: char.name,
              initiative: initTotal,
              isPlayer: true,
              characterId: char.id,
              hp: char.currentHp,
              maxHp: char.maxHp,
              ac: char.armorClass || 10,
              conditions: [],
              speed: char.speed || 30,
            });
          }

          // Add enemies from combatant names (filter out player names)
          const playerNames = currentCharacters.map(c => c.name.toLowerCase());
          let enemyIndex = 0;
          for (const name of combatantNames) {
            if (playerNames.includes(name.toLowerCase())) continue;

            // Look up stats
            const lowerName = name.toLowerCase();
            const statsKey = Object.keys(ENEMY_STAT_BLOCKS).find(k => lowerName.includes(k));
            const stats = statsKey ? ENEMY_STAT_BLOCKS[statsKey] : { hp: 10, ac: 12, speed: 30 };

            const initRoll = Math.floor(Math.random() * 20) + 1 + 1; // +1 dex mod default
            initiativeEntries.push({
              id: `enemy-${Date.now()}-${enemyIndex}`,
              name: name,
              initiative: initRoll,
              isPlayer: false,
              hp: stats.hp,
              maxHp: stats.hp,
              ac: stats.ac,
              conditions: [],
              speed: stats.speed,
            });
            enemyIndex++;
          }

          // Sort by initiative
          initiativeEntries.sort((a, b) => b.initiative - a.initiative);

          await handleUpdateGameState({
            inCombat: true,
            initiativeOrder: initiativeEntries,
            currentTurn: 0,
            round: 1,
          });

          const initSummary = initiativeEntries.map(e =>
            `${e.name} (Init ${e.initiative}, HP ${e.hp}/${e.maxHp}, AC ${e.ac || '?'}${e.isPlayer ? ', PLAYER' : ', NPC'})`
          ).join(' | ');
          const firstUp = initiativeEntries[0];
          const firstIsNPC = !firstUp.isPlayer;
          results.push({
            id: toolId,
            result: `Combat started! Initiative: ${initSummary}. Round 1 — ${firstUp.name} goes first.${firstIsNPC ? ' This is an NPC — handle their turn immediately with npcAction.' : ' This is a player — describe the situation and await their action.'}`,
            forceNextTool: firstIsNPC ? 'npcAction' : undefined,
          });
          break;
        }

        case 'endEncounter':
        case 'endCombat': {
          toast.info(`Encounter ended.`);
          // Sync all player HP from initiative order back to character records before clearing
          if (currentGameState?.initiativeOrder) {
            for (const entry of currentGameState.initiativeOrder) {
              if (entry.isPlayer && entry.characterId) {
                try {
                  const syncRes = await fetch(`/api/characters/${entry.characterId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ currentHp: Math.max(0, entry.hp || 0) }),
                  });
                  const syncData = await syncRes.json();
                  if (syncData.success) {
                    setSelectedCharacter(syncData.data);
                    setCharacters(prev => prev.map(c => c.id === syncData.data.id ? syncData.data : c));
                  }
                } catch (e) { console.error('Failed to sync player HP at end of combat:', e); }
              }
            }
          }
          await handleUpdateGameState({ inCombat: false, initiativeOrder: [] });
          // Auto-award combat XP based on defeated enemies
          const defeated: string[] = [];
          if (currentGameState?.initiativeOrder) {
            const defeatedEnemies = currentGameState.initiativeOrder
              .filter(e => !e.isPlayer && (e.hp || 0) <= 0)
              .map(e => e.name);
            defeated.push(...defeatedEnemies);
            if (defeatedEnemies.length > 0) {
              const combatXP = suggestCombatXP(defeatedEnemies, currentCharacters.length);
              handleAwardXP('combat', combatXP, `Defeated ${defeatedEnemies.join(', ')}`);
            }
          }
          results.push({
            id: toolId,
            result: defeated.length > 0
              ? `Combat ended. Defeated: ${defeated.join(', ')}. XP awarded. Continue the story — describe what happens after the fight.`
              : `Combat ended. Continue the narrative — what does the party see now that the dust has settled?`,
          });
          break;
        }

        // ── AI-Driven Combat Tools (Theater of the Mind) ──

        case 'npcAction': {
          const { attackerName, targetName, attackBonus, damageDice, description: actionDesc, damageType, advantage: npcAdvantage } = args;

          if (!currentGameState?.initiativeOrder) {
            results.push({ id: toolId, result: 'Error: Not in combat.' });
            break;
          }

          const attacker = currentGameState.initiativeOrder.find(e => e.name.toLowerCase() === attackerName?.toLowerCase());
          const target = currentGameState.initiativeOrder.find(e => e.name.toLowerCase() === targetName?.toLowerCase());

          if (!attacker || !target) {
            results.push({
              id: toolId,
              result: `Error: Could not find combatant "${!attacker ? attackerName : targetName}" in initiative order.`,
            });
            break;
          }

          // Roll attack: d20 + attackBonus vs target AC (with advantage/disadvantage)
          const hasAdvantage = npcAdvantage === 'advantage';
          const hasDisadvantage = npcAdvantage === 'disadvantage';
          let attackRoll: number;
          let attackRolls: number[];
          if (hasAdvantage || hasDisadvantage) {
            const die1 = Math.floor(Math.random() * 20) + 1;
            const die2 = Math.floor(Math.random() * 20) + 1;
            attackRoll = hasAdvantage ? Math.max(die1, die2) : Math.min(die1, die2);
            attackRolls = [die1, die2];
          } else {
            attackRoll = Math.floor(Math.random() * 20) + 1;
            attackRolls = [attackRoll];
          }
          const isCritical = attackRoll === 20;
          const isCritFail = attackRoll === 1;
          const totalAttack = attackRoll + (attackBonus || 0);
          const targetAC = target.ac || 10;
          const isHit = isCritical || (!isCritFail && totalAttack >= targetAC);

          // Show NPC attack roll on screen
          const attackRollDisplay: RollDisplay = {
            id: `npc-atk-${Date.now()}`,
            label: `${attackerName} attacks ${targetName}`,
            type: 'npc_attack',
            dice: attackRolls.map((val) => ({
              faces: 20,
              value: val,
              dimmed: (hasAdvantage || hasDisadvantage) && val !== attackRoll,
            })),
            rolls: attackRolls,
            modifier: attackBonus || 0,
            total: totalAttack,
            advantage: hasAdvantage,
            disadvantage: hasDisadvantage,
            isNPC: true,
            autoTime: 2200,
          };
          setDiceQueue(prev => [...prev, attackRollDisplay]);

          let damageDealt = 0;
          let damageRolls: number[] = [];
          let damageMod = 0;
          let damageDieSize = 6;
          if (isHit) {
            // Roll damage using rollDice utility
            try {
              const dmgResult = rollDice(damageDice || '1d6');
              if (isCritical) {
                // Critical: double the dice (roll again and add)
                const critExtra = rollDice(damageDice || '1d6');
                damageDealt = dmgResult.total + critExtra.rolls.reduce((a: number, b: number) => a + b, 0);
                damageRolls = [...dmgResult.rolls, ...critExtra.rolls];
              } else {
                damageDealt = dmgResult.total;
                damageRolls = dmgResult.rolls;
              }
              damageMod = dmgResult.total - dmgResult.rolls.reduce((a: number, b: number) => a + b, 0);
            } catch {
              const m = (damageDice || '1d6').match(/(\d+)d(\d+)([\+\-]\d+)?/);
              if (m) {
                const numDice = parseInt(m[1]);
                damageDieSize = parseInt(m[2]);
                damageMod = m[3] ? parseInt(m[3]) : 0;
                const multiplier = isCritical ? 2 : 1;
                for (let i = 0; i < numDice * multiplier; i++) {
                  const r = Math.floor(Math.random() * damageDieSize) + 1;
                  damageRolls.push(r);
                }
                damageDealt = damageRolls.reduce((a, b) => a + b, 0) + damageMod;
              }
            }

            // Parse die size from notation for display
            const dieMatch = (damageDice || '1d6').match(/d(\d+)/);
            if (dieMatch) damageDieSize = parseInt(dieMatch[1]);

            // Show NPC damage roll on screen
            const damageRollDisplay: RollDisplay = {
              id: `npc-dmg-${Date.now()}`,
              label: `${attackerName} deals ${damageType || ''} damage`,
              type: 'npc_damage',
              dice: damageRolls.map(val => ({ faces: damageDieSize, value: val })),
              rolls: damageRolls,
              modifier: damageMod,
              total: damageDealt,
              isNPC: true,
              autoTime: 1800,
            };
            setDiceQueue(prev => [...prev, damageRollDisplay]);

            // Apply damage to target
            const newHp = Math.max(0, (target.hp || 0) - damageDealt);
            const updatedOrder = currentGameState.initiativeOrder.map(e =>
              e.id === target.id ? { ...e, hp: newHp } : e
            );
            await handleUpdateGameState({ initiativeOrder: updatedOrder });

            // Sync player character HP back to character record
            if (target.isPlayer && target.characterId) {
              try {
                const syncRes = await fetch(`/api/characters/${target.characterId}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ currentHp: newHp }),
                });
                const syncData = await syncRes.json();
                if (syncData.success) {
                  setSelectedCharacter(syncData.data);
                  setCharacters(prev => prev.map(c => c.id === syncData.data.id ? syncData.data : c));
                }
              } catch (e) { console.error('Failed to sync player HP:', e); }
            }
          }

          const targetNewHp = isHit ? Math.max(0, (target.hp || 0) - damageDealt) : (target.hp || 0);
          const advText = hasAdvantage ? ' (Advantage)' : hasDisadvantage ? ' (Disadvantage)' : '';
          results.push({
            id: toolId,
            result: `${attackerName} attacks ${targetName} (AC ${targetAC}): d20(${attackRoll})${advText} + ${attackBonus} = ${totalAttack} → ${isHit ? 'HIT' : 'MISS'}${isCritical ? ' (CRITICAL HIT!)' : ''}${isCritFail ? ' (CRITICAL MISS!)' : ''}${isHit ? `. Deals ${damageDealt} ${damageType || ''} damage. ${targetName}: ${targetNewHp}/${target.maxHp} HP${targetNewHp === 0 ? ' — DEFEATED!' : ''}.` : '.'} Action: ${actionDesc}. Call advanceTurn NOW.`,
            forceNextTool: 'advanceTurn',
          });
          break;
        }

        case 'updateCombatant': {
          const { name: combatantName, damage, healing, hp: absoluteHp, addCondition, removeCondition } = args;

          if (!currentGameState?.initiativeOrder) {
            results.push({ id: toolId, result: 'Error: Not in combat.' });
            break;
          }

          const combatant = currentGameState.initiativeOrder.find(e => e.name.toLowerCase() === combatantName?.toLowerCase());
          if (!combatant) {
            results.push({ id: toolId, result: `Error: Combatant "${combatantName}" not found.` });
            break;
          }

          let newHp = combatant.hp || 0;
          if (absoluteHp !== undefined) {
            newHp = Math.max(0, Math.min(absoluteHp, combatant.maxHp || 999));
          } else if (damage !== undefined) {
            newHp = Math.max(0, newHp - damage);
          } else if (healing !== undefined) {
            newHp = Math.min(combatant.maxHp || 999, newHp + healing);
          }

          let newConditions = [...(combatant.conditions || [])];
          if (addCondition && !newConditions.includes(addCondition)) {
            newConditions.push(addCondition);
          }
          if (removeCondition) {
            newConditions = newConditions.filter((c: string) => c !== removeCondition);
          }

          const updatedOrder = currentGameState.initiativeOrder.map(e =>
            e.id === combatant.id ? { ...e, hp: newHp, conditions: newConditions } : e
          );
          await handleUpdateGameState({ initiativeOrder: updatedOrder });

          // Sync player character HP back to character record
          if (combatant.isPlayer && combatant.characterId) {
            try {
              const syncRes = await fetch(`/api/characters/${combatant.characterId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ currentHp: newHp }),
              });
              const syncData = await syncRes.json();
              if (syncData.success) {
                setSelectedCharacter(syncData.data);
                setCharacters(prev => prev.map(c => c.id === syncData.data.id ? syncData.data : c));
              }
            } catch (e) { console.error('Failed to sync player HP:', e); }
          }

          const defeated = newHp === 0;
          // Check if ALL enemies are now defeated
          const updatedAliveEnemies = updatedOrder.filter(e => !e.isPlayer && (e.hp || 0) > 0);
          const allEnemiesDefeated = updatedAliveEnemies.length === 0 && updatedOrder.some(e => !e.isPlayer);

          results.push({
            id: toolId,
            result: `${combatantName} updated. HP: ${newHp}/${combatant.maxHp}${newConditions.length > 0 ? `. Conditions: ${newConditions.join(', ')}` : ''}${defeated ? '. DEFEATED!' : ''}.${allEnemiesDefeated ? ' ALL ENEMIES DEFEATED — call endEncounter NOW, then awardXP.' : ' Call advanceTurn NOW to continue combat.'}`,
            forceNextTool: allEnemiesDefeated ? 'endEncounter' : 'advanceTurn',
          });
          break;
        }

        case 'advanceTurn': {
          if (!currentGameState?.inCombat || !currentGameState?.initiativeOrder?.length) {
            results.push({ id: toolId, result: 'Not in combat or no combatants.' });
            break;
          }

          const order = currentGameState.initiativeOrder;
          const orderLen = order.length;

          // Skip defeated combatants locally — don't burn a continuation for each dead NPC
          let nextTurnIndex = (currentGameState.currentTurn + 1) % orderLen;
          let newRound = nextTurnIndex === 0 ? currentGameState.round + 1 : currentGameState.round;
          let skipped = 0;
          while ((order[nextTurnIndex].hp || 0) <= 0 && skipped < orderLen) {
            nextTurnIndex = (nextTurnIndex + 1) % orderLen;
            if (nextTurnIndex === 0) newRound++;
            skipped++;
          }

          // Safety: if ALL combatants are defeated somehow, bail out
          if (skipped >= orderLen) {
            results.push({
              id: toolId,
              result: 'All combatants are defeated. Call endEncounter NOW.',
              forceNextTool: 'endEncounter',
            });
            break;
          }

          await handleUpdateGameState({
            currentTurn: nextTurnIndex,
            round: newRound,
          });

          const nextCombatant = order[nextTurnIndex];
          const isNPC = !nextCombatant.isPlayer;

          // Determine which tool to force next based on who's up
          // No force for player turns — that's where the NPC chain stops
          const nextForcedTool = isNPC ? 'npcAction' : undefined;

          // Build a status summary of all combatants for context
          const combatStatus = order
            .filter(c => (c.hp || 0) > 0)
            .map(c => `${c.name}(${c.isPlayer ? 'PC' : 'NPC'} HP:${c.hp}/${c.maxHp})`)
            .join(', ');

          results.push({
            id: toolId,
            result: `Round ${newRound}, Turn: ${nextCombatant.name} (${isNPC ? 'NPC' : 'PLAYER'}, HP ${nextCombatant.hp}/${nextCombatant.maxHp}). Combat status: [${combatStatus}].${skipped > 0 ? ` Skipped ${skipped} defeated combatant(s).` : ''} ${isNPC ? 'This is an NPC — call npcAction NOW. Do NOT wait for user input.' : 'This is the PLAYER — describe the tactical situation and WAIT for their action. Do NOT call any tools.'}`,
            forceNextTool: nextForcedTool,
          });
          break;
        }

        case 'setScene': {
          // Fire state updates in background — don't block the tool result
          // so the AI can continue narrating immediately
          const sceneUpdates: Promise<void>[] = [];
          if (args.description) {
            sceneUpdates.push(handleUpdateGameState({
              currentScene: args.description,
            }));
          }
          if (args.location) {
            sceneUpdates.push(
              fetch(`/api/campaigns/${campaignId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ currentLocation: args.location }),
              }).then(() => {}).catch(e => console.error('Failed to update location', e))
            );
          }
          // Wait for essential writes but refresh data in background
          await Promise.all(sceneUpdates);
          refreshGameData(); // non-blocking background refresh

          // Fire a visible scene-change notification in chat
          const sceneLabel = args.location || 'New Area';
          setSystemMessage({
            content: `[SCENE CHANGE: ${sceneLabel}] ${args.description || ''}`,
            timestamp: Date.now(),
          });

          results.push({
            id: toolId,
            result: `Scene updated to ${sceneLabel}. ${args.description || ''}. Continue narrating — describe what the characters see, hear, and can interact with in this new scene.`,
          });
          break;
        }

        case 'awardXP': {
          const category = args.category as XPCategory;
          const amount = args.amount || 50;
          const reason = args.reason || 'Adventure progress';
          handleAwardXP(category, amount, reason);
          results.push({
            id: toolId,
            result: `Awarded ${amount} ${category} XP for: ${reason}. Continue the story.`,
          });
          break;
        }

        case 'modifyGold': {
          const goldAmount = args.amount || 0;
          const goldReason = args.reason || '';
          const currentGold = currentGameState?.partyGold || 0;
          const newGold = Math.max(0, currentGold + goldAmount);
          await handleUpdateGameState({ partyGold: newGold });
          const goldAction = goldAmount >= 0 ? 'gained' : 'spent';
          toast.info(`${goldAction === 'gained' ? '💰' : '🪙'} ${goldAction} ${Math.abs(goldAmount)} gold${goldReason ? ` — ${goldReason}` : ''}`);
          results.push({
            id: toolId,
            result: `Party ${goldAction} ${Math.abs(goldAmount)} gold (${goldReason}). Total: ${newGold} gp. Continue narrating.`,
          });
          break;
        }

        case 'addItem': {
          const charId = currentCharacters[0]?.id;
          if (!charId) {
            results.push({ id: toolId, result: 'No character found to add item to.' });
            break;
          }
          const itemName = args.name || 'Unknown Item';
          const itemType = args.type || 'gear';
          const itemQty = args.quantity || 1;
          const itemDesc = args.description || '';
          const itemMagical = args.magical || false;
          try {
            const addRes = await fetch(`/api/characters/${charId}?include=inventory`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'addItem',
                name: itemName,
                type: itemType,
                quantity: itemQty,
                description: itemDesc,
                magical: itemMagical,
              }),
            });
            // Refresh inventory regardless
            try {
              const invRes = await fetch(`/api/characters/${charId}?include=inventory`);
              const invData = await invRes.json();
              if (invData.success && invData.data.inventory) setInventory(invData.data.inventory);
            } catch { /* refresh later */ }
          } catch (e) { console.error('Failed to add item:', e); }
          toast.info(`📦 Received: ${itemName}${itemQty > 1 ? ` x${itemQty}` : ''}`);
          results.push({
            id: toolId,
            result: `${itemName}${itemQty > 1 ? ` (x${itemQty})` : ''} added to inventory. Continue narrating.`,
          });
          break;
        }

        case 'removeItem': {
          const removeCharId = currentCharacters[0]?.id;
          const removeName = args.itemName || '';
          const removeReason = args.reason || '';
          if (!removeCharId) {
            results.push({ id: toolId, result: 'No character found.' });
            break;
          }
          // Find the item by name in current inventory
          const matchingItem = inventory.find(i => i.name.toLowerCase() === removeName.toLowerCase());
          if (matchingItem) {
            try {
              await fetch(`/api/characters/${removeCharId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'removeItem', itemId: matchingItem.id }),
              });
              // Refresh inventory
              const invRes = await fetch(`/api/characters/${removeCharId}?include=inventory`);
              const invData = await invRes.json();
              if (invData.success && invData.data.inventory) setInventory(invData.data.inventory);
            } catch (e) { console.error('Failed to remove item:', e); }
          }
          toast.info(`${removeName} removed${removeReason ? ` — ${removeReason}` : ''}`);
          results.push({
            id: toolId,
            result: `${removeName} removed from inventory${removeReason ? ` (${removeReason})` : ''}. Continue narrating.`,
          });
          break;
        }

        // Other fire-and-forget tool calls — refresh in background, return immediately
        case 'addNpc':
        case 'addQuest':
        case 'modifyHp':
          refreshGameData(); // non-blocking
          results.push({
            id: toolId,
            result: `Game state updated (${funcName}). Continue narrating.`,
          });
          break;

        default:
          // Unknown tool call — still let the AI continue
          if (toolId) {
            results.push({
              id: toolId,
              result: `Tool ${funcName} completed. Continue the narrative.`,
            });
          }
          break;
      }
    }

    return results;
  }, [refreshGameData, handleUpdateGameState, campaignId, handleAwardXP]);
    // Refresh suggestions and game data after chat completion
  const handleRefreshSuggestions = useCallback(async () => {
    await refreshGameData();
    if (!campaignId) return;
    const contextActions = getContextActions(gameState, selectedCharacter, environmentTheme);
    if (pendingRoll) {
      const rollSuggestions = [
        `I rolled a ${pendingRoll.roll.total} for ${pendingRoll.description.replace(selectedCharacter?.name + ' rolls ', '')}`,
        ...contextActions.slice(0, 2),
      ];
      setSuggestedActions(rollSuggestions);
    } else {
      setSuggestedActions(contextActions);
    }
  }, [campaignId, pendingRoll, selectedCharacter, gameState, environmentTheme, refreshGameData]);

  // Perform a dice roll when the player clicks "Perform Roll"
  const performRequestedRoll = useCallback(() => {
    if (!requestedRoll || !selectedCharacter) return;

    let abilityModifier = 0;
    const abilityScores = selectedCharacter.abilityScores;

    const skill = requestedRoll.skill.toLowerCase();
    if (['athletics', 'strength'].includes(skill)) {
      abilityModifier = Math.floor((abilityScores.strength - 10) / 2);
    } else if (['acrobatics', 'stealth', 'sleight of hand', 'dexterity'].includes(skill)) {
      abilityModifier = Math.floor((abilityScores.dexterity - 10) / 2);
    } else if (['endurance', 'constitution'].includes(skill)) {
      abilityModifier = Math.floor((abilityScores.constitution - 10) / 2);
    } else if (['investigation', 'arcana', 'history', 'religion', 'nature', 'intelligence'].includes(skill)) {
      abilityModifier = Math.floor((abilityScores.intelligence - 10) / 2);
    } else if (['perception', 'insight', 'medicine', 'survival', 'animal handling', 'wisdom'].includes(skill)) {
      abilityModifier = Math.floor((abilityScores.wisdom - 10) / 2);
    } else if (['persuasion', 'deception', 'intimidation', 'performance', 'charisma'].includes(skill)) {
      abilityModifier = Math.floor((abilityScores.charisma - 10) / 2);
    } else {
      const mods = [abilityScores.dexterity, abilityScores.strength, abilityScores.intelligence].map(s => Math.floor((s - 10) / 2));
      abilityModifier = Math.max(...mods);
    }

    const hasAdvantage = requestedRoll.advantage === 'advantage';
    const hasDisadvantage = requestedRoll.advantage === 'disadvantage';
    const advLabel = hasAdvantage ? ' (Advantage)' : hasDisadvantage ? ' (Disadvantage)' : '';
    const modStr = abilityModifier >= 0 ? `+${abilityModifier}` : `${abilityModifier}`;

    try {
      let result: DiceRoll;
      if (hasAdvantage || hasDisadvantage) {
        const die1 = Math.floor(Math.random() * 20) + 1;
        const die2 = Math.floor(Math.random() * 20) + 1;
        const kept = hasAdvantage ? Math.max(die1, die2) : Math.min(die1, die2);
        result = { notation: `2d20${hasAdvantage ? 'kh1' : 'kl1'}${modStr}`, rolls: [die1, die2], modifier: abilityModifier, total: kept + abilityModifier, type: 'ability_check', advantage: hasAdvantage, disadvantage: hasDisadvantage };
      } else {
        const rawResult = rollDice(`1d20${modStr}`);
        result = { ...rawResult, type: 'ability_check' };
      }

      const dc = requestedRoll.dc;
      const success = dc ? result.total >= dc : true;
      const description = `${selectedCharacter.name} rolls ${requestedRoll.skill}${dc ? ` (DC ${dc})` : ''}${advLabel}`;

      // Show dice animation
      setPendingRoll({ roll: result, description });

      // After animation, send result to chat
      setTimeout(() => {
        const kept = hasAdvantage ? Math.max(...result.rolls) : hasDisadvantage ? Math.min(...result.rolls) : result.rolls[0];
        const advInfo = (hasAdvantage || hasDisadvantage)
          ? ` [${hasAdvantage ? 'Advantage' : 'Disadvantage'}: rolled ${result.rolls[0]} and ${result.rolls[1]}, kept ${kept}]`
          : '';
        const modInfo = result.modifier !== 0 ? (result.modifier > 0 ? `+${result.modifier}` : `${result.modifier}`) : '';
        const resultMessage = `[ROLL RESULT] ${description}: rolled ${result.total} (${kept}${modInfo})${advInfo}${dc ? `. DC ${dc}: ${success ? 'SUCCESS' : 'FAILURE'}` : ''}. Continue the story based on this result.`;
        setSystemMessage({ content: resultMessage, timestamp: Date.now() });
      }, 2800);

      setRequestedRoll(null);
    } catch (error: any) {
      toast.error(`Failed to roll: ${error.message}`);
      setRequestedRoll(null);
    }
  }, [requestedRoll, selectedCharacter, rollDice]);

  // Perform a saving throw when the player clicks "Make Save"
  const performRequestedSavingThrow = useCallback(() => {
    if (!requestedSavingThrow || !selectedCharacter) return;

    let abilityModifier = 0;
    const abilityScores = selectedCharacter.abilityScores;
    switch (requestedSavingThrow.ability.toLowerCase()) {
      case 'strength': abilityModifier = Math.floor((abilityScores.strength - 10) / 2); break;
      case 'dexterity': abilityModifier = Math.floor((abilityScores.dexterity - 10) / 2); break;
      case 'constitution': abilityModifier = Math.floor((abilityScores.constitution - 10) / 2); break;
      case 'intelligence': abilityModifier = Math.floor((abilityScores.intelligence - 10) / 2); break;
      case 'wisdom': abilityModifier = Math.floor((abilityScores.wisdom - 10) / 2); break;
      case 'charisma': abilityModifier = Math.floor((abilityScores.charisma - 10) / 2); break;
      default: abilityModifier = 0;
    }

    const hasAdvantage = requestedSavingThrow.advantage === 'advantage';
    const hasDisadvantage = requestedSavingThrow.advantage === 'disadvantage';
    const advLabel = hasAdvantage ? ' (Advantage)' : hasDisadvantage ? ' (Disadvantage)' : '';
    const modStr = abilityModifier >= 0 ? `+${abilityModifier}` : `${abilityModifier}`;

    try {
      let result: DiceRoll;
      if (hasAdvantage || hasDisadvantage) {
        const die1 = Math.floor(Math.random() * 20) + 1;
        const die2 = Math.floor(Math.random() * 20) + 1;
        const kept = hasAdvantage ? Math.max(die1, die2) : Math.min(die1, die2);
        result = { notation: `2d20${hasAdvantage ? 'kh1' : 'kl1'}${modStr}`, rolls: [die1, die2], modifier: abilityModifier, total: kept + abilityModifier, type: 'saving_throw', advantage: hasAdvantage, disadvantage: hasDisadvantage };
      } else {
        const rawResult = rollDice(`1d20${modStr}`);
        result = { ...rawResult, type: 'saving_throw' };
      }

      const dc = requestedSavingThrow.dc;
      const success = result.total >= dc;
      const sourceInfo = requestedSavingThrow.source ? ` vs ${requestedSavingThrow.source}` : '';
      const description = `${selectedCharacter.name} makes a ${requestedSavingThrow.ability} saving throw (DC ${dc})${sourceInfo}${advLabel}`;

      setPendingRoll({ roll: result, description });

      setTimeout(() => {
        const kept = hasAdvantage ? Math.max(...result.rolls) : hasDisadvantage ? Math.min(...result.rolls) : result.rolls[0];
        const advInfo = (hasAdvantage || hasDisadvantage)
          ? ` [${hasAdvantage ? 'Advantage' : 'Disadvantage'}: rolled ${result.rolls[0]} and ${result.rolls[1]}, kept ${kept}]`
          : '';
        const modInfo = result.modifier !== 0 ? (result.modifier > 0 ? `+${result.modifier}` : `${result.modifier}`) : '';
        const resultMessage = `[SAVING THROW RESULT] ${description}: rolled ${result.total} (${kept}${modInfo})${advInfo}. DC ${dc}: ${success ? 'SUCCESS' : 'FAILURE'}. Continue the story based on this result.`;
        setSystemMessage({ content: resultMessage, timestamp: Date.now() });
      }, 2800);

      setRequestedSavingThrow(null);
    } catch (error: any) {
      toast.error(`Failed to perform saving throw: ${error.message}`);
      setRequestedSavingThrow(null);
    }
  }, [requestedSavingThrow, selectedCharacter, rollDice]);

  // Load campaign data and check for auto-trigger opening scene
  useEffect(() => {
    if (!campaignId) {
      router.push('/');
      return;
    }

    const loadData = async () => {
      try {
        const [campaignRes, charactersRes, gameStateRes, messagesRes] = await Promise.all([
          fetch(`/api/campaigns/${campaignId}`),
          fetch(`/api/characters?campaignId=${campaignId}`),
          fetch(`/api/game-state?campaignId=${campaignId}`),
          fetch(`/api/chat?campaignId=${campaignId}&limit=1`),
        ]);

        const [campaignData, charactersData, gameStateData, messagesData] = await Promise.all([
          campaignRes.json(),
          charactersRes.json(),
          gameStateRes.json(),
          messagesRes.json(),
        ]);

        if (campaignData.success) setCampaign(campaignData.data);
        if (charactersData.success) {
          setCharacters(charactersData.data);
          if (charactersData.data.length > 0) {
            const primaryChar = charactersData.data[0];
            setSelectedCharacter(primaryChar);
            // Fetch inventory and spells for the primary character
            try {
              const extrasRes = await fetch(`/api/characters/${primaryChar.id}?include=inventory,spells`);
              const extrasData = await extrasRes.json();
              if (extrasData.success) {
                if (extrasData.data.inventory) setInventory(extrasData.data.inventory);
                if (extrasData.data.spells) setSpells(extrasData.data.spells);
              }
            } catch (e) { console.error('Failed to load inventory/spells:', e); }
          }
        }
        if (gameStateData.success) setGameState(gameStateData.data);

        // Session tracking — start a session and check for last session recap
        try {
          const sessionRes = await fetch('/api/sessions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'start', campaignId }),
          });
          const sessionData = await sessionRes.json();
          if (sessionData.success && sessionData.data) {
            setCurrentSessionId(sessionData.data.id);
            setSessionNumber(sessionData.data.sessionNumber);
          }

          // Fetch last completed session for recap
          const logsRes = await fetch(`/api/sessions?campaignId=${campaignId}`);
          const logsData = await logsRes.json();
          if (logsData.success && logsData.data?.logs?.length > 0) {
            const completedSessions = logsData.data.logs.filter((s: SessionLog) => s.endedAt && s.summary);
            if (completedSessions.length > 0) {
              setLastSessionSummary(completedSessions[0].summary || null);
            }
          }
        } catch {
          // Session tracking is non-critical, don't block game load
        }
      } catch (error) {
        toast.error('Failed to load game data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [campaignId, router]);

  // Refresh suggested actions
  const refreshSuggestions = useCallback(async () => {
    if (!campaignId) return;
    try {
      const contextActions = getContextActions(gameState, selectedCharacter, environmentTheme);

      if (pendingRoll) {
        const rollSuggestions = [
          `I rolled a ${pendingRoll.roll.total} for ${pendingRoll.description.replace(selectedCharacter?.name + ' rolls ', '')}`,
          ...contextActions.slice(0, 2),
        ];
        setSuggestedActions(rollSuggestions);
      } else {
        setSuggestedActions(contextActions);
      }
    } catch (error) {
      console.error('Failed to get suggestions:', error);
    }
  }, [campaignId, pendingRoll, selectedCharacter, gameState, environmentTheme]);

  useEffect(() => {
    if (campaign) {
      refreshSuggestions();
    }
  }, [campaign, refreshSuggestions, pendingRoll, gameState?.inCombat, environmentTheme]);

  // When pendingRoll completes, the DiceRollOverlay will be shown.
  // The logic for sending the result back to the AI is now handled
  // directly in performRequestedRoll and performRequestedSavingThrow.

  // Generate scene image
  const handleGenerateImage = async () => {
    if (!campaignId || !gameState?.currentScene) {
      toast.error('No scene to generate image for');
      return;
    }

    setGeneratingImage(true);
    try {
      const res = await fetch('/api/scene-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId,
          description: gameState.currentScene,
          theme: environmentTheme,
          imageType: 'scene',
        }),
      });

      const data = await res.json();
      if (data.success) {
        setGameState((prev) =>
          prev ? { ...prev, currentSceneImageUrl: data.data.imageUrl } : null
        );
        toast.success('Scene image generated!');
      } else {
        toast.error(data.error || 'Failed to generate image');
      }
    } catch (error) {
      toast.error('Failed to generate image');
    } finally {
      setGeneratingImage(false);
    }
  };

  // Character actions
  const handleHeal = async (amount: number) => {
    if (!selectedCharacter) return;
    try {
      const res = await fetch(`/api/characters/${selectedCharacter.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentHp: Math.min(
            selectedCharacter.currentHp + amount,
            selectedCharacter.maxHp
          ),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSelectedCharacter(data.data);
        setCharacters((prev) =>
          prev.map((c) => (c.id === data.data.id ? data.data : c))
        );
      }
    } catch (error) {
      toast.error('Failed to update HP');
    }
  };

  const handleDamage = async (amount: number) => {
    if (!selectedCharacter) return;
    try {
      const res = await fetch(`/api/characters/${selectedCharacter.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentHp: Math.max(0, selectedCharacter.currentHp - amount),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSelectedCharacter(data.data);
        setCharacters((prev) =>
          prev.map((c) => (c.id === data.data.id ? data.data : c))
        );
      }
    } catch (error) {
      toast.error('Failed to update HP');
    }
  };

  // Handle dice roll from character sheet — show the dice animation and auto-send to DM
  const handleRoll = useCallback((roll: DiceRoll, description: string) => {
    setPendingRoll({ roll, description });
    // Auto-send the roll result to the DM so they can narrate the outcome
    // Brief delay to let the dice animation start first
    setTimeout(() => {
      const rollDesc = description.replace(selectedCharacter?.name + ' rolls ', '');
      const resultMsg = `[ROLL RESULT] ${rollDesc}: rolled ${roll.total} (${roll.rolls.join(', ')}${roll.modifier ? ` + ${roll.modifier} modifier` : ''}) — What happens?`;
      setSystemMessage({ content: resultMsg, timestamp: Date.now() });
    }, 300);
  }, [selectedCharacter?.name]);

  const handleSendToChat = (message: string) => {
    setSystemMessage({ content: message, timestamp: Date.now() });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!campaign || !gameState) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Campaign not found</p>
          <Button asChild>
            <Link href="/">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  // Theme label mapping
  const THEME_LABELS: Record<string, string> = {
    default: '', cave: 'Cave', forest: 'Forest', ocean: 'Ocean', desert: 'Desert',
    mountain: 'Mountains', tavern: 'Tavern', dungeon: 'Dungeon', temple: 'Temple',
    city: 'City', night: 'Night', dawn: 'Dawn', swamp: 'Swamp', snow: 'Snow',
    fire: 'Fire', sky: 'Sky',
  };

  return (
    <div className={cn('min-h-screen flex flex-col relative', `game-theme-${environmentTheme}`)}>
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-md relative z-10">
        <div className="container mx-auto px-4 py-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                <Link href="/">
                  <ArrowLeft className="w-4 h-4" />
                </Link>
              </Button>
              <div className="flex items-center gap-2">
                <Sword className="w-5 h-5 text-primary" />
                <h1 className="font-semibold font-medieval text-sm">{campaign.name}</h1>
              </div>
              {/* Theme indicator */}
              {THEME_LABELS[environmentTheme] && (
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-medium hidden sm:block">
                  {THEME_LABELS[environmentTheme]}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <AmbientAudio theme={environmentTheme} inCombat={gameState?.inCombat} />
              <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                <Link href="/settings">
                  <Bot className="w-4 h-4" />
                </Link>
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                <Link href={`/setup?campaignId=${campaignId}`}>
                  <Settings className="w-4 h-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Last Session Recap Banner */}
      {lastSessionSummary && (
        <div className="border-b bg-amber-500/5">
          <div className="container mx-auto px-4 py-2 flex items-start gap-3">
            <BookOpen className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="text-xs font-semibold text-amber-500 uppercase tracking-wider">Last Session Recap</span>
              <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">{lastSessionSummary}</p>
            </div>
            <button
              onClick={() => setLastSessionSummary(null)}
              className="text-muted-foreground hover:text-foreground p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Main Game Area */}
      <main className="flex-1 container mx-auto p-4 overflow-hidden">
        <div className="flex gap-2 h-[calc(100vh-8rem)]">
          {/* Left Toggle */}
          {!leftPanelOpen && (
            <button
              onClick={() => setLeftPanelOpen(true)}
              className={cn("flex-shrink-0 flex flex-col items-center gap-1 px-1.5 py-3 rounded-lg border transition-all duration-700 h-fit mt-0", theme.bg, theme.border, theme.glow, "hover:opacity-80")}
              title="Show character sheet"
            >
              <PanelLeftOpen className="w-4 h-4" />
              <span className="text-[10px]" style={{ writingMode: 'vertical-rl' }}>Character</span>
            </button>
          )}

          {/* Left Panel - Character Sheet */}
          {leftPanelOpen && (
          <div 
            className={cn("w-[25%] flex-shrink-0 flex flex-col border rounded-lg overflow-hidden transition-all duration-700", theme.bg, theme.border, theme.glow)}
            style={theme.vars as React.CSSProperties}
          >
            {/* Panel Header with tabs + close button */}
            <div className={cn("flex items-center border-b transition-colors duration-700", theme.accent.replace('border-', 'bg-') || 'bg-muted/30')}>
              {characters.length > 1 ? (
                <div className="flex-1 flex overflow-x-auto">
                  {characters.map((char) => (
                    <button
                      key={char.id}
                      className={cn(
                        'flex-shrink-0 px-3 py-2 text-sm font-medium border-b-2 transition-colors',
                        selectedCharacter?.id === char.id
                          ? 'border-primary text-primary bg-background'
                          : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50'
                      )}
                      onClick={() => setSelectedCharacter(char)}
                    >
                      <span className="truncate max-w-[80px] inline-block">{char.name}</span>
                      <span className="ml-1 text-xs opacity-60">{char.currentHp}/{char.maxHp}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex-1 px-3 py-2 text-sm font-medium text-muted-foreground">
                  {selectedCharacter?.name || 'Character'}
                </div>
              )}
              <button
                onClick={() => setLeftPanelOpen(false)}
                className="p-2 hover:bg-muted transition-colors"
                title="Hide character sheet"
              >
                <PanelLeftClose className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>

            <div className="flex-1 overflow-hidden">
              {selectedCharacter ? (
                <CharacterSheet
                  character={selectedCharacter}
                  inventory={inventory}
                  spells={spells}
                  gold={gameState?.partyGold || 0}
                  onHeal={handleHeal}
                  onDamage={handleDamage}
                  onShortRest={async (hitDiceUsed: number) => {
                    if (!selectedCharacter) return;
                    try {
                      const res = await fetch(`/api/characters/${selectedCharacter.id}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'shortRest', hitDiceUsed }),
                      });
                      const data = await res.json();
                      if (data.success) {
                        setSelectedCharacter(data.data);
                        setCharacters(prev => prev.map(c => c.id === data.data.id ? data.data : c));
                        const healed = data.data.currentHp - selectedCharacter.currentHp;
                        toast.success(`Short rest complete${healed > 0 ? ` — healed ${healed} HP` : ''} (${hitDiceUsed} HD spent)`);
                      } else {
                        toast.error(data.error || 'Short rest failed');
                      }
                    } catch { toast.error('Failed to short rest'); }
                  }}
                  onLongRest={async () => {
                    if (!selectedCharacter) return;
                    try {
                      const res = await fetch(`/api/characters/${selectedCharacter.id}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'longRest' }),
                      });
                      const data = await res.json();
                      if (data.success) {
                        setSelectedCharacter(data.data);
                        setCharacters(prev => prev.map(c => c.id === data.data.id ? data.data : c));
                        toast.success('Long rest complete — HP restored, hit dice recovered, spell slots reset');
                      } else {
                        toast.error(data.error || 'Long rest failed');
                      }
                    } catch { toast.error('Failed to long rest'); }
                  }}
                  onRoll={handleRoll}
                  onUpdatePortrait={async (url: string) => {
                    if (!selectedCharacter) return;
                    try {
                      const res = await fetch(`/api/characters/${selectedCharacter.id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ portraitUrl: url }),
                      });
                      const data = await res.json();
                      if (data.success) {
                        setSelectedCharacter(data.data);
                        setCharacters(prev => prev.map(c => c.id === data.data.id ? data.data : c));
                        toast.success('Avatar updated!');
                      }
                    } catch {
                      toast.error('Failed to update avatar');
                    }
                  }}
                  onUpdateNotes={async (notes: string) => {
                    if (!selectedCharacter) return;
                    try {
                      await fetch(`/api/characters/${selectedCharacter.id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ notes }),
                      });
                    } catch { /* silent auto-save fail */ }
                  }}
                  onToggleEquip={async (itemId: string, equipped: boolean) => {
                    if (!selectedCharacter) return;
                    try {
                      const res = await fetch(`/api/characters/${selectedCharacter.id}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'equipItem', itemId, equipped }),
                      });
                      const data = await res.json();
                      if (data.success) {
                        if (data.data.character) {
                          setSelectedCharacter(data.data.character);
                          setCharacters(prev => prev.map(c => c.id === data.data.character.id ? data.data.character : c));
                        }
                        if (data.data.inventory) {
                          setInventory(data.data.inventory);
                        }
                        const item = data.data.inventory?.find((i: any) => i.id === itemId);
                        toast.success(`${item?.name || 'Item'} ${equipped ? 'equipped' : 'unequipped'}${data.data.character?.armorClass !== selectedCharacter.armorClass ? ` (AC → ${data.data.character.armorClass})` : ''}`);
                      }
                    } catch { toast.error('Failed to update equipment'); }
                  }}
                />
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <p>No character selected</p>
                    <Button asChild className="mt-2">
                      <Link href={`/setup?campaignId=${campaignId}`}>
                        Create Character
                      </Link>
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
          )}

          {/* Center Panel - DM Chat (flexible width) */}
          <div className="flex-1 min-w-0 overflow-hidden flex flex-col">
            <div 
              className="h-full overflow-hidden"
              style={theme.vars as React.CSSProperties}
            >
              <DMChat
                campaignId={campaignId!}
                characters={characters}
                campaign={campaign}
                selectedCharacter={selectedCharacter}
                onSelectCharacter={setSelectedCharacter}
                suggestedActions={suggestedActions}
                onRefreshSuggestions={handleRefreshSuggestions}
                systemMessage={systemMessage}
                onToolCall={handleToolCall}
                environmentTheme={environmentTheme}
              />
            </div>
          </div>

          {/* Right Panel - Game State & Encounter Tracker */}
          {rightPanelOpen && (
          <div 
            className={cn("w-[25%] flex-shrink-0 flex flex-col border rounded-lg overflow-hidden transition-all duration-700", theme.bg, theme.border, theme.glow)}
            style={theme.vars as React.CSSProperties}
          >
            {/* Panel header with close button */}
            <div className={cn("flex items-center justify-between border-b px-3 py-2 transition-colors duration-700", theme.accent.replace('border-', 'bg-') || 'bg-muted/30')}>
              <span className="text-sm font-medium text-muted-foreground">
                {gameState?.inCombat ? 'Combat' : 'Game State'}
              </span>
              <button
                onClick={() => setRightPanelOpen(false)}
                className="p-1 hover:bg-muted rounded transition-colors"
                title="Hide game state"
              >
                <PanelRightClose className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>
            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto p-2 space-y-3">
              <EncounterTracker
                gameState={gameState}
                characters={characters}
                onUpdateGameState={handleUpdateGameState}
                onSendToChatAction={handleSendToChat}
                onDeathSaveOverlay={handleDeathSaveOverlay}
              />
              <GameStatePanel
                campaign={campaign}
                gameState={gameState}
                isGeneratingImage={generatingImage}
                onGenerateImage={handleGenerateImage}
              />
            </div>
          </div>
          )}

          {/* Right Toggle */}
          {!rightPanelOpen && (
            <button
              onClick={() => setRightPanelOpen(true)}
              className={cn("flex-shrink-0 flex flex-col items-center gap-1 px-1.5 py-3 rounded-lg border transition-all duration-700 h-fit mt-0", theme.bg, theme.border, theme.glow, "hover:opacity-80")}
              title="Show game state"
            >
              <PanelRightOpen className="w-4 h-4" />
              <span className="text-[10px]" style={{ writingMode: 'vertical-rl' }}>Game State</span>
            </button>
          )}
        </div>
      </main>

      {/* Overlay for AI Requested Roll */}
      {requestedRoll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-card text-card-foreground p-8 rounded-lg shadow-xl text-center border border-primary/20 animate-in zoom-in-95 duration-300 max-w-sm">
            <h3 className="text-2xl font-bold mb-4 font-medieval">Roll for {requestedRoll.skill}!</h3>
            {requestedRoll.advantage === 'advantage' && (
              <p className="mb-3 text-sm font-semibold text-emerald-400">Rolling with Advantage</p>
            )}
            {requestedRoll.advantage === 'disadvantage' && (
              <p className="mb-3 text-sm font-semibold text-rose-400">Rolling with Disadvantage</p>
            )}
            <Button
              onClick={performRequestedRoll}
              disabled={!selectedCharacter}
              size="lg"
              className="px-8 py-4 text-lg w-full"
            >
              {selectedCharacter ? '🎲 Roll Dice' : 'Select a Character'}
            </Button>
          </div>
        </div>
      )}

      {/* Overlay for AI Requested Saving Throw */}
      {requestedSavingThrow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-card text-card-foreground p-8 rounded-lg shadow-xl text-center border border-purple-500/20 animate-in zoom-in-95 duration-300 max-w-sm">
            <h3 className="text-2xl font-bold mb-2 font-medieval">{requestedSavingThrow.ability} Save!</h3>
            {requestedSavingThrow.source && (
              <p className="text-sm text-muted-foreground mb-3">{requestedSavingThrow.source}</p>
            )}
            {requestedSavingThrow.advantage === 'advantage' && (
              <p className="mb-3 text-sm font-semibold text-emerald-400">Rolling with Advantage</p>
            )}
            {requestedSavingThrow.advantage === 'disadvantage' && (
              <p className="mb-3 text-sm font-semibold text-rose-400">Rolling with Disadvantage</p>
            )}
            <Button
              onClick={performRequestedSavingThrow}
              disabled={!selectedCharacter}
              size="lg"
              className="px-8 py-4 text-lg w-full"
            >
              {selectedCharacter ? '🎲 Make Save' : 'Select a Character'}
            </Button>
          </div>
        </div>
      )}

      {/* Dice Roll Overlay */}
      <DiceRollOverlay
        roll={pendingRoll?.roll || null}
        rollQueue={diceQueue}
        description={pendingRoll?.description}
        onComplete={handleDiceOverlayComplete}
        onQueueItemComplete={(id) => setDiceQueue(prev => prev.filter(r => r.id !== id))}
      />

      {/* Death Save Overlay */}
      {deathSaveTarget && (
        <DeathSaveOverlay
          characterName={deathSaveTarget.name}
          onComplete={handleDeathSaveComplete}
          onDismiss={() => setDeathSaveTarget(null)}
        />
      )}

      {/* XP Award Notification */}
      {lastXPAward && (
        <div className="fixed bottom-6 right-6 z-40 animate-in slide-in-from-bottom-4 fade-in duration-300">
          <div className="bg-black/80 backdrop-blur-md text-white rounded-lg px-5 py-3 shadow-2xl border border-white/10 max-w-xs">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{XP_CATEGORY_LABELS[lastXPAward.category].icon}</span>
              <div>
                <div className="font-bold text-lg">+{lastXPAward.result.finalXP} XP</div>
                <div className="text-xs text-white/60">{lastXPAward.reason}</div>
                {lastXPAward.result.diminishingMultiplier < 1.0 && (
                  <div className="text-xs text-yellow-400/80 mt-0.5">
                    Diminished ({Math.round(lastXPAward.result.diminishingMultiplier * 100)}%) — progress the story for full XP
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Level Up Overlay */}
      {showLevelUp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative flex flex-col items-center gap-4 animate-in zoom-in-95 duration-500">
            <div className="text-6xl animate-bounce">🎉</div>
            <div className="text-4xl font-black text-yellow-300 tracking-wide"
              style={{ textShadow: '0 0 30px rgba(255,215,0,0.6)' }}>
              LEVEL UP!
            </div>
            <div className="text-white text-xl font-medium bg-black/60 px-6 py-2 rounded-full border border-yellow-500/30">
              Level {characters[0]?.level}
            </div>
            <div className="text-white/60 text-sm">
              New proficiency bonus: +{Math.floor(((characters[0]?.level || 1) - 1) / 4) + 2}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function GamePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    }>
      <GamePageContent />
    </Suspense>
  );
}
