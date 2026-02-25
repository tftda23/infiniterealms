'use client';

import React, { useState, useCallback, useRef } from 'react';
import {
  Swords,
  Plus,
  Trash2,
  Shield,
  ChevronRight,
  ChevronDown,
  X,
  Skull,
  ScrollText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn, getAbilityModifier } from '@/lib/utils';
import type { Character, InitiativeEntry, GameState } from '@/types';

interface EncounterTrackerProps {
  gameState: GameState | null;
  characters: Character[];
  onUpdateGameState: (updates: Partial<GameState>) => Promise<void>;
  onSendToChatAction?: (message: string) => void;
  /** Trigger the dramatic death save overlay for a player character */
  onDeathSaveOverlay?: (combatantId: string, combatantName: string) => void;
}

interface CombatantInput {
  name: string;
  initiative: number;
  hp: number;
  maxHp: number;
  ac: number;
  isPlayer: boolean;
  characterId?: string;
}

interface CombatLogEntry {
  id: number;
  timestamp: number;
  type: 'start' | 'end' | 'turn' | 'round' | 'damage' | 'heal' | 'condition' | 'death_save' | 'death' | 'revive' | 'add' | 'remove';
  message: string;
}

const COMMON_CONDITIONS = [
  'Blinded', 'Charmed', 'Deafened', 'Frightened', 'Grappled',
  'Incapacitated', 'Invisible', 'Paralyzed', 'Petrified', 'Poisoned',
  'Prone', 'Restrained', 'Stunned', 'Unconscious', 'Exhaustion',
];

export function EncounterTracker({
  gameState,
  characters,
  onUpdateGameState,
  onSendToChatAction,
  onDeathSaveOverlay,
}: EncounterTrackerProps) {
  const [addCombatantOpen, setAddCombatantOpen] = useState(false);
  const [newCombatant, setNewCombatant] = useState<CombatantInput>({
    name: '',
    initiative: 10,
    hp: 10,
    maxHp: 10,
    ac: 10,
    isPlayer: false,
  });
  // Death saves are now persisted on combatant.deathSaves in gameState — no local state needed
  const [combatLog, setCombatLog] = useState<CombatLogEntry[]>([]);
  const [logOpen, setLogOpen] = useState(false);
  const logIdRef = useRef(0);
  const logEndRef = useRef<HTMLDivElement>(null);

  const addLogEntry = useCallback((type: CombatLogEntry['type'], message: string) => {
    logIdRef.current += 1;
    setCombatLog(prev => [...prev, { id: logIdRef.current, timestamp: Date.now(), type, message }]);
    // Auto-scroll to bottom
    setTimeout(() => logEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  }, []);

  const inCombat = gameState?.inCombat || false;
  const initiativeOrder = gameState?.initiativeOrder || [];
  const currentTurn = gameState?.currentTurn || 0;
  const round = gameState?.round || 1;

  // Roll initiative for all party members
  const rollPartyInitiative = useCallback(() => {
    const partyEntries: InitiativeEntry[] = characters.map(char => {
      const dexMod = getAbilityModifier(char.abilityScores?.dexterity || 10);
      const roll = Math.floor(Math.random() * 20) + 1;
      return {
        id: char.id,
        name: char.name,
        initiative: roll + dexMod,
        isPlayer: true,
        characterId: char.id,
        hp: char.currentHp,
        maxHp: char.maxHp,
        conditions: [],
      };
    });

    return partyEntries;
  }, [characters]);

  // Start combat
  const startCombat = async () => {
    const partyEntries = rollPartyInitiative();

    // Sort by initiative (highest first)
    const sorted = [...partyEntries].sort((a, b) => b.initiative - a.initiative);

    await onUpdateGameState({
      inCombat: true,
      initiativeOrder: sorted,
      currentTurn: 0,
      round: 1,
    });

    // Log combat start
    setCombatLog([]);
    addLogEntry('start', 'Combat started!');
    sorted.forEach(c => addLogEntry('start', `${c.name} rolls ${c.initiative} initiative`));

    if (onSendToChatAction) {
      const initiativeReport = sorted
        .map((c, i) => `${i + 1}. ${c.name}: ${c.initiative}`)
        .join('\n');
      onSendToChatAction(`[COMBAT STARTED]\nInitiative Order:\n${initiativeReport}`);
    }
  };

  // End combat
  const endCombat = async () => {
    addLogEntry('end', `Combat ended after ${round} rounds`);
    await onUpdateGameState({
      inCombat: false,
      initiativeOrder: [],
      currentTurn: 0,
      round: 1,
    });
    if (onSendToChatAction) {
      onSendToChatAction('[COMBAT ENDED]');
    }
  };

  // Next turn
  const handleNextTurn = async () => {
    const nextTurn = (currentTurn + 1) % initiativeOrder.length;
    const newRound = nextTurn === 0 ? round + 1 : round;

    await onUpdateGameState({
      currentTurn: nextTurn,
      round: newRound,
    });

    const nextCombatant = initiativeOrder[nextTurn];
    if (nextCombatant) {
      if (nextTurn === 0) {
        addLogEntry('round', `Round ${newRound} begins`);
      }
      addLogEntry('turn', `${nextCombatant.name}'s turn`);
    }
    if (onSendToChatAction && nextCombatant) {
      if (nextTurn === 0) {
        onSendToChatAction(`[ROUND ${newRound}] ${nextCombatant.name}'s turn`);
      } else {
        onSendToChatAction(`${nextCombatant.name}'s turn`);
      }
    }
  };

  // Add combatant (enemy/NPC)
  const addCombatant = async () => {
    if (!newCombatant.name.trim()) return;

    const entry: InitiativeEntry = {
      id: `enemy-${Date.now()}`,
      name: newCombatant.name,
      initiative: newCombatant.initiative,
      isPlayer: newCombatant.isPlayer,
      characterId: newCombatant.characterId,
      hp: newCombatant.hp,
      maxHp: newCombatant.maxHp,
      ac: newCombatant.ac,
      conditions: [],
    };

    // Insert in correct initiative order
    const newOrder = [...initiativeOrder, entry].sort(
      (a, b) => b.initiative - a.initiative
    );

    await onUpdateGameState({ initiativeOrder: newOrder });
    addLogEntry('add', `${entry.name} joins combat (Init: ${entry.initiative})`);
    setAddCombatantOpen(false);
    setNewCombatant({
      name: '',
      initiative: 10,
      hp: 10,
      maxHp: 10,
      ac: 10,
      isPlayer: false,
    });
  };

  // Remove combatant
  const removeCombatant = async (id: string) => {
    const combatant = initiativeOrder.find(c => c.id === id);
    const newOrder = initiativeOrder.filter(c => c.id !== id);
    const newTurn = currentTurn >= newOrder.length ? 0 : currentTurn;
    await onUpdateGameState({
      initiativeOrder: newOrder,
      currentTurn: newTurn,
    });
    if (combatant) addLogEntry('remove', `${combatant.name} removed from combat`);
  };

  // Update combatant HP
  const updateCombatantHP = async (id: string, newHp: number) => {
    const combatant = initiativeOrder.find(c => c.id === id);
    const oldHp = combatant?.hp || 0;
    const clampedHp = Math.max(0, Math.min(newHp, combatant?.maxHp || 999));
    const diff = clampedHp - oldHp;
    const newOrder = initiativeOrder.map(c =>
      c.id === id ? { ...c, hp: clampedHp } : c
    );
    await onUpdateGameState({ initiativeOrder: newOrder });
    if (combatant && diff !== 0) {
      if (diff < 0) {
        addLogEntry('damage', `${combatant.name} takes ${Math.abs(diff)} damage (${clampedHp}/${combatant.maxHp} HP)`);
      } else {
        addLogEntry('heal', `${combatant.name} heals ${diff} HP (${clampedHp}/${combatant.maxHp} HP)`);
      }
      if (clampedHp === 0 && oldHp > 0) {
        addLogEntry('damage', `${combatant.name} drops to 0 HP!`);
      }
    }
  };

  // Toggle condition
  const toggleCondition = async (id: string, condition: string) => {
    const combatant = initiativeOrder.find(c => c.id === id);
    const newOrder = initiativeOrder.map(c => {
      if (c.id !== id) return c;
      const conditions = c.conditions || [];
      const hasCondition = conditions.includes(condition);
      return {
        ...c,
        conditions: hasCondition
          ? conditions.filter(cond => cond !== condition)
          : [...conditions, condition],
      };
    });
    await onUpdateGameState({ initiativeOrder: newOrder });
    if (combatant) {
      const had = (combatant.conditions || []).includes(condition);
      addLogEntry('condition', `${combatant.name} ${had ? 'loses' : 'gains'} ${condition}`);
    }
  };

  // Roll death save for a combatant (inline fallback when overlay isn't used)
  // Now persists to gameState via onUpdateGameState
  const rollDeathSave = async (id: string) => {
    const combatant = initiativeOrder.find(c => c.id === id);
    if (!combatant) return;
    const roll = Math.floor(Math.random() * 20) + 1;
    const current = combatant.deathSaves || { successes: 0, failures: 0 };
    let newDeathSaves = { ...current };

    if (roll === 1) {
      newDeathSaves.failures = Math.min(3, current.failures + 2);
      addLogEntry('death_save', `${combatant.name} rolls Nat 1 — two failures!`);
    } else if (roll === 20) {
      // Nat 20 — revive with 1 HP, clear death saves & Unconscious
      const newOrder = initiativeOrder.map(c =>
        c.id === id ? { ...c, hp: 1, deathSaves: undefined, conditions: (c.conditions || []).filter(cnd => cnd !== 'Unconscious') } : c
      );
      await onUpdateGameState({ initiativeOrder: newOrder });
      addLogEntry('revive', `${combatant.name} rolls Nat 20 — revived with 1 HP!`);
      return;
    } else if (roll < 10) {
      newDeathSaves.failures = Math.min(3, current.failures + 1);
      addLogEntry('death_save', `${combatant.name} rolls ${roll} — failure (${newDeathSaves.failures}/3)`);
    } else {
      newDeathSaves.successes = Math.min(3, current.successes + 1);
      addLogEntry('death_save', `${combatant.name} rolls ${roll} — success (${newDeathSaves.successes}/3)`);
    }

    if (newDeathSaves.successes >= 3) {
      // Stabilized — clear death saves, add Unconscious condition
      const newOrder = initiativeOrder.map(c =>
        c.id === id ? { ...c, deathSaves: undefined, conditions: [...new Set([...(c.conditions || []), 'Unconscious'])] } : c
      );
      await onUpdateGameState({ initiativeOrder: newOrder });
      addLogEntry('condition', `${combatant.name} stabilized!`);
    } else if (newDeathSaves.failures >= 3) {
      // Dead — store final saves, add Dead condition
      const newOrder = initiativeOrder.map(c =>
        c.id === id ? { ...c, deathSaves: newDeathSaves, conditions: [...(c.conditions || []).filter(cnd => cnd !== 'Unconscious'), 'Dead'] } : c
      );
      await onUpdateGameState({ initiativeOrder: newOrder });
      addLogEntry('death', `${combatant.name} has died.`);
    } else {
      // In progress — store current saves
      const newOrder = initiativeOrder.map(c =>
        c.id === id ? { ...c, deathSaves: newDeathSaves } : c
      );
      await onUpdateGameState({ initiativeOrder: newOrder });
    }
  };

  // Handle taking damage at 0 HP — persists death save failures to gameState
  const updateCombatantHPWithDeathSaves = async (id: string, newHp: number) => {
    const combatant = initiativeOrder.find(c => c.id === id);
    if (!combatant) return;

    // If at 0 HP and taking damage, add death save failures
    if ((combatant.hp || 0) === 0 && newHp < 0 && combatant.isPlayer) {
      const current = combatant.deathSaves || { successes: 0, failures: 0 };
      const newDeathSaves = { ...current };

      // Critical damage (damage >= 10) = 2 failures per D&D 5e rules
      if (Math.abs(newHp) >= 10) {
        newDeathSaves.failures = Math.min(3, current.failures + 2);
      } else {
        newDeathSaves.failures = Math.min(3, current.failures + 1);
      }

      const newOrder = initiativeOrder.map(c => {
        if (c.id !== id) return c;
        if (newDeathSaves.failures >= 3) {
          return { ...c, deathSaves: newDeathSaves, conditions: [...(c.conditions || []).filter(cnd => cnd !== 'Unconscious'), 'Dead'] };
        }
        return { ...c, deathSaves: newDeathSaves };
      });
      await onUpdateGameState({ initiativeOrder: newOrder });
      if (newDeathSaves.failures >= 3) {
        addLogEntry('death', `${combatant.name} has died from damage while unconscious.`);
      } else {
        addLogEntry('death_save', `${combatant.name} takes damage at 0 HP — auto failure (${newDeathSaves.failures}/3)`);
      }
      return;
    }

    // Normal HP update
    const clampedHp = Math.max(0, Math.min(newHp, combatant.maxHp || 999));
    const newOrder = initiativeOrder.map(c =>
      c.id === id ? { ...c, hp: clampedHp } : c
    );
    await onUpdateGameState({ initiativeOrder: newOrder });
  };

  // Not in combat - show start combat button
  if (!inCombat) {
    return (
      <Card className="border-dashed">
        <CardHeader className="text-center">
          <Swords className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
          <CardTitle>No Active Encounter</CardTitle>
          <CardDescription>
            Start an encounter to track initiative and combat
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center gap-2">
          <Button onClick={startCombat} disabled={characters.length === 0}>
            <Swords className="w-4 h-4 mr-2" />
            Start Encounter
          </Button>
        </CardContent>
      </Card>
    );
  }

  // In combat - show initiative tracker
  const currentCombatant = initiativeOrder[currentTurn];

  return (
    <Card className="border-red-500/50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Swords className="w-5 h-5 text-red-500" />
            <CardTitle className="text-red-500">Combat Active</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">Round {round}</Badge>
            <Button variant="destructive" size="sm" onClick={endCombat}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Current Turn Highlight */}
        {currentCombatant && (
          <div className={cn(
            "p-3 rounded-lg border",
            currentCombatant.isPlayer
              ? "bg-blue-500/10 border-blue-500"
              : "bg-red-500/10 border-red-500/50"
          )}>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <span className={cn(
                  "text-xs font-bold uppercase tracking-wider",
                  currentCombatant.isPlayer ? "text-blue-400" : "text-red-400"
                )}>
                  {currentCombatant.isPlayer ? 'Your Turn' : 'NPC Turn'}
                </span>
                <h3 className="text-lg font-bold">{currentCombatant.name}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {currentCombatant.isPlayer
                    ? 'Describe your action in the chat'
                    : 'DM is resolving...'}
                </p>
              </div>
              {currentCombatant.ac && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Shield className="w-4 h-4" />
                  <span className="text-sm font-medium">{currentCombatant.ac}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Initiative Order */}
        <div className="space-y-2">
          {initiativeOrder.map((combatant, index) => {
            const isCurrent = index === currentTurn;
            const isDead = (combatant.hp || 0) <= 0;
            const hpPercent = combatant.maxHp
              ? ((combatant.hp || 0) / combatant.maxHp) * 100
              : 100;

            return (
              <div
                key={combatant.id}
                className={cn(
                  "p-2 rounded-lg border transition-all",
                  isCurrent && "bg-primary/10 border-primary",
                  isDead && "opacity-50",
                  !isCurrent && !isDead && "bg-muted/50"
                )}
              >
                <div className="flex items-center gap-2">
                  {/* Turn Indicator */}
                  {isCurrent && (
                    <ChevronRight className="w-4 h-4 text-primary flex-shrink-0" />
                  )}
                  {!isCurrent && <div className="w-4" />}

                  {/* Initiative */}
                  <Badge
                    variant={combatant.isPlayer ? 'default' : 'destructive'}
                    className="w-8 text-center"
                  >
                    {combatant.initiative}
                  </Badge>

                  {/* Name & HP */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={cn("font-medium truncate", isDead && "line-through")}>
                        {combatant.name}
                      </span>
                      {combatant.isPlayer && (
                        <Badge variant="outline" className="text-xs">PC</Badge>
                      )}
                      {combatant.ac && (
                        <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                          <Shield className="w-3 h-3" />{combatant.ac}
                        </span>
                      )}
                    </div>

                    {/* HP Bar or Death Saves */}
                    {isDead && combatant.isPlayer ? (
                      // Death Saves for player characters at 0 HP — reads from persisted combatant.deathSaves
                      <div className="mt-2 space-y-2">
                        <div className="text-xs font-semibold text-red-500">Death Saves</div>
                        <div className="flex items-center gap-3">
                          {/* Successes */}
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-muted-foreground">S:</span>
                            <div className="flex gap-1">
                              {[0, 1, 2].map(i => (
                                <div
                                  key={`success-${i}`}
                                  className={cn(
                                    "w-3 h-3 rounded-full border",
                                    i < (combatant.deathSaves?.successes || 0)
                                      ? "bg-green-500 border-green-600"
                                      : "border-muted-foreground"
                                  )}
                                />
                              ))}
                            </div>
                          </div>
                          {/* Failures */}
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-muted-foreground">F:</span>
                            <div className="flex gap-1">
                              {[0, 1, 2].map(i => (
                                <div
                                  key={`failure-${i}`}
                                  className={cn(
                                    "w-3 h-3 rounded-full border",
                                    i < (combatant.deathSaves?.failures || 0)
                                      ? "bg-red-500 border-red-600"
                                      : "border-muted-foreground"
                                  )}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                        {/* Status Badge */}
                        {(combatant.deathSaves?.successes || 0) >= 3 && (
                          <Badge className="bg-green-600 text-white text-xs">
                            Stabilized
                          </Badge>
                        )}
                        {(combatant.deathSaves?.failures || 0) >= 3 && (
                          <Badge className="bg-black text-white text-xs flex items-center gap-1">
                            <Skull className="w-3 h-3" />
                            Dead
                          </Badge>
                        )}
                      </div>
                    ) : combatant.maxHp ? (
                      <div className="flex items-center gap-2 mt-1">
                        <div className="h-1.5 flex-1 bg-muted rounded-full overflow-hidden">
                          <div
                            className={cn(
                              "h-full transition-all",
                              hpPercent > 50 ? "bg-green-500" :
                              hpPercent > 25 ? "bg-yellow-500" : "bg-red-500"
                            )}
                            style={{ width: `${Math.max(0, hpPercent)}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground w-12">
                          {combatant.hp}/{combatant.maxHp}
                        </span>
                      </div>
                    ) : null}

                    {/* Conditions */}
                    {combatant.conditions && combatant.conditions.length > 0 && (
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {combatant.conditions.map(condition => (
                          <Badge
                            key={condition}
                            variant="secondary"
                            className="text-xs cursor-pointer"
                            onClick={() => toggleCondition(combatant.id, condition)}
                          >
                            {condition} ×
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* HP Adjustment */}
                  {isDead && combatant.isPlayer && (combatant.deathSaves?.failures || 0) < 3 && !(combatant.conditions || []).includes('Dead') ? (
                    // Show death save button — uses dramatic overlay if available
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 text-xs border-red-500/50 text-red-400 hover:bg-red-500/10"
                      onClick={() => {
                        if (onDeathSaveOverlay) {
                          onDeathSaveOverlay(combatant.id, combatant.name);
                        } else {
                          rollDeathSave(combatant.id);
                        }
                      }}
                    >
                      Roll Save
                    </Button>
                  ) : (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => updateCombatantHPWithDeathSaves(combatant.id, (combatant.hp || 0) - 1)}
                      >
                        -
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => updateCombatantHPWithDeathSaves(combatant.id, (combatant.hp || 0) + 1)}
                      >
                        +
                      </Button>
                    </div>
                  )}

                  {/* Remove (non-player only) */}
                  {!combatant.isPlayer && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-destructive"
                      onClick={() => removeCombatant(combatant.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Add Combatant Button */}
        <Button
          variant="outline"
          className="w-full"
          onClick={() => setAddCombatantOpen(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Enemy/NPC
        </Button>

        {/* Quick Conditions */}
        {currentCombatant && (
          <div className="pt-2 border-t">
            <span className="text-xs text-muted-foreground mb-2 block">
              Quick Conditions for {currentCombatant.name}:
            </span>
            <div className="flex gap-1 flex-wrap">
              {COMMON_CONDITIONS.slice(0, 8).map(condition => (
                <Badge
                  key={condition}
                  variant={currentCombatant.conditions?.includes(condition) ? 'default' : 'outline'}
                  className="cursor-pointer text-xs"
                  onClick={() => toggleCondition(currentCombatant.id, condition)}
                >
                  {condition}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Combat Log */}
        {combatLog.length > 0 && (
          <div className="pt-2 border-t">
            <button
              onClick={() => setLogOpen(!logOpen)}
              className="flex items-center gap-1.5 w-full text-left text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ScrollText className="w-3.5 h-3.5" />
              <span className="font-semibold uppercase tracking-wider">Combat Log</span>
              <Badge variant="secondary" className="text-[10px] h-4 px-1 ml-1">{combatLog.length}</Badge>
              <ChevronDown className={cn("w-3 h-3 ml-auto transition-transform", logOpen && "rotate-180")} />
            </button>
            {logOpen && (
              <div className="mt-2 max-h-40 overflow-y-auto space-y-0.5 text-xs font-mono rounded bg-muted/30 p-2">
                {combatLog.map(entry => (
                  <div
                    key={entry.id}
                    className={cn(
                      "py-0.5 border-l-2 pl-2",
                      entry.type === 'start' && "border-blue-500 text-blue-400",
                      entry.type === 'end' && "border-muted-foreground text-muted-foreground",
                      entry.type === 'round' && "border-yellow-500 text-yellow-400 font-bold",
                      entry.type === 'turn' && "border-primary text-foreground",
                      entry.type === 'damage' && "border-red-500 text-red-400",
                      entry.type === 'heal' && "border-green-500 text-green-400",
                      entry.type === 'condition' && "border-purple-500 text-purple-400",
                      entry.type === 'death_save' && "border-orange-500 text-orange-400",
                      entry.type === 'death' && "border-red-700 text-red-500 font-bold",
                      entry.type === 'revive' && "border-yellow-400 text-yellow-300 font-bold",
                      entry.type === 'add' && "border-blue-400 text-blue-300",
                      entry.type === 'remove' && "border-muted-foreground text-muted-foreground",
                    )}
                  >
                    {entry.message}
                  </div>
                ))}
                <div ref={logEndRef} />
              </div>
            )}
          </div>
        )}
      </CardContent>

      {/* Add Combatant Dialog */}
      <Dialog open={addCombatantOpen} onOpenChange={setAddCombatantOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Combatant</DialogTitle>
            <DialogDescription>
              Add an enemy or NPC to the initiative order.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Name</label>
              <Input
                value={newCombatant.name}
                onChange={e => setNewCombatant({ ...newCombatant, name: e.target.value })}
                placeholder="Goblin, Orc, etc."
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium">Initiative</label>
                <Input
                  type="number"
                  value={newCombatant.initiative}
                  onChange={e => setNewCombatant({ ...newCombatant, initiative: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">HP</label>
                <Input
                  type="number"
                  value={newCombatant.hp}
                  onChange={e => {
                    const hp = parseInt(e.target.value) || 1;
                    setNewCombatant({ ...newCombatant, hp, maxHp: hp });
                  }}
                />
              </div>
              <div>
                <label className="text-sm font-medium">AC</label>
                <Input
                  type="number"
                  value={newCombatant.ac}
                  onChange={e => setNewCombatant({ ...newCombatant, ac: parseInt(e.target.value) || 10 })}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddCombatantOpen(false)}>
              Cancel
            </Button>
            <Button onClick={addCombatant} disabled={!newCombatant.name.trim()}>
              Add to Initiative
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
