'use client';

import React, { useState, useRef, useCallback } from 'react';
import {
  Heart,
  Shield,
  Footprints,
  Sparkles,
  Swords,
  Moon,
  Sun,
  Dice6,
  Camera,
  User,
  BookOpen,
  Save,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { cn, getAbilityModifier, formatModifier } from '../lib/utils';
import { xpToNextLevel, XP_THRESHOLDS } from '../lib/xp-engine';
import { getClassFeaturesAtLevel } from '../lib/dnd-data';
import type { Character, InventoryItem, Spell, DiceRoll } from '../types';
import { ChevronDown, ChevronRight, Zap, Star } from 'lucide-react';

// Skill to ability mapping
const SKILL_ABILITIES: Record<string, keyof Character['abilityScores']> = {
  acrobatics: 'dexterity',
  animalHandling: 'wisdom',
  arcana: 'intelligence',
  athletics: 'strength',
  deception: 'charisma',
  history: 'intelligence',
  insight: 'wisdom',
  intimidation: 'charisma',
  investigation: 'intelligence',
  medicine: 'wisdom',
  nature: 'intelligence',
  perception: 'wisdom',
  performance: 'charisma',
  persuasion: 'charisma',
  religion: 'intelligence',
  sleightOfHand: 'dexterity',
  stealth: 'dexterity',
  survival: 'wisdom',
};

const SKILL_DISPLAY_NAMES: Record<string, string> = {
  acrobatics: 'Acrobatics',
  animalHandling: 'Animal Handling',
  arcana: 'Arcana',
  athletics: 'Athletics',
  deception: 'Deception',
  history: 'History',
  insight: 'Insight',
  intimidation: 'Intimidation',
  investigation: 'Investigation',
  medicine: 'Medicine',
  nature: 'Nature',
  perception: 'Perception',
  performance: 'Performance',
  persuasion: 'Persuasion',
  religion: 'Religion',
  sleightOfHand: 'Sleight of Hand',
  stealth: 'Stealth',
  survival: 'Survival',
};

const ABILITY_DISPLAY_NAMES: Record<string, string> = {
  strength: 'Strength',
  dexterity: 'Dexterity',
  constitution: 'Constitution',
  intelligence: 'Intelligence',
  wisdom: 'Wisdom',
  charisma: 'Charisma',
};

interface CharacterSheetProps {
  character: Character;
  inventory?: InventoryItem[];
  spells?: Spell[];
  gold?: number;
  onHeal?: (amount: number) => void;
  onDamage?: (amount: number) => void;
  onShortRest?: (hitDiceUsed: number) => Promise<void>;
  onLongRest?: () => Promise<void>;
  onRoll?: (roll: DiceRoll, description: string) => void;
  onUpdatePortrait?: (portraitUrl: string) => void;
  onUpdateNotes?: (notes: string) => Promise<void>;
  onToggleEquip?: (itemId: string, equipped: boolean) => Promise<void>;
  onExpendSpellSlot?: (level: number) => Promise<void>;
  onRestoreSpellSlot?: (level: number) => Promise<void>;
}

export const CharacterSheet = React.memo(function CharacterSheet({
  character,
  inventory = [],
  spells = [],
  gold = 0,
  onHeal,
  onDamage,
  onShortRest,
  onLongRest,
  onRoll,
  onUpdatePortrait,
  onUpdateNotes,
  onToggleEquip,
  onExpendSpellSlot,
  onRestoreSpellSlot,
}: CharacterSheetProps) {
  const [lastRoll, setLastRoll] = useState<{ result: number; description: string } | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [shortRestOpen, setShortRestOpen] = useState(false);
  const [shortRestDice, setShortRestDice] = useState(1);
  const [resting, setResting] = useState(false);
  const [journalText, setJournalText] = useState(character.notes || '');
  const [journalSaving, setJournalSaving] = useState(false);
  const [journalDirty, setJournalDirty] = useState(false);
  // #20: Track class feature usage (resets on rest)
  const [featureUses, setFeatureUses] = useState<Record<string, number>>({});
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-save journal after 1.5s of inactivity
  const handleJournalChange = useCallback((text: string) => {
    setJournalText(text);
    setJournalDirty(true);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      if (onUpdateNotes) {
        setJournalSaving(true);
        try {
          await onUpdateNotes(text);
          setJournalDirty(false);
        } finally {
          setJournalSaving(false);
        }
      }
    }, 1500);
  }, [onUpdateNotes]);

  // Prevent division by zero
  const maxHp = character.maxHp || 1;
  const currentHp = character.currentHp ?? 0;
  const hpPercentage = (currentHp / maxHp) * 100;
  const hpColor =
    hpPercentage > 50
      ? 'bg-green-500'
      : hpPercentage > 25
      ? 'bg-yellow-500'
      : 'bg-red-500';

  // Roll a d20 with modifier
  const rollD20 = (modifier: number, description: string, type: DiceRoll['type'] = 'ability_check') => {
    const roll = Math.floor(Math.random() * 20) + 1;
    const total = roll + modifier;

    const diceRoll: DiceRoll = {
      notation: `1d20${modifier >= 0 ? '+' : ''}${modifier}`,
      rolls: [roll],
      modifier,
      total,
      type,
    };

    setLastRoll({ result: total, description });
    onRoll?.(diceRoll, description);
  };

  // Roll ability check
  const rollAbilityCheck = (ability: keyof Character['abilityScores']) => {
    const score = character.abilityScores[ability];
    const modifier = getAbilityModifier(score);
    const abilityName = ABILITY_DISPLAY_NAMES[ability];
    rollD20(modifier, `${character.name} rolls ${abilityName} check`);
  };

  // Roll saving throw
  const rollSavingThrow = (ability: keyof Character['abilityScores']) => {
    const score = character.abilityScores[ability];
    let modifier = getAbilityModifier(score);

    // Add proficiency bonus if proficient
    if (character.savingThrows?.[ability]) {
      modifier += character.proficiencyBonus || 2;
    }

    const abilityName = ABILITY_DISPLAY_NAMES[ability];
    rollD20(modifier, `${character.name} rolls ${abilityName} saving throw`, 'saving_throw');
  };

  // Roll skill check
  const rollSkillCheck = (skill: string) => {
    const ability = SKILL_ABILITIES[skill];
    const score = character.abilityScores[ability];
    let modifier = getAbilityModifier(score);

    // Add proficiency bonus if proficient
    if (character.skills?.[skill as keyof Character['skills']]) {
      modifier += character.proficiencyBonus || 2;
    }

    const skillName = SKILL_DISPLAY_NAMES[skill];
    rollD20(modifier, `${character.name} rolls ${skillName} check`);
  };

  // Roll initiative
  const rollInitiative = () => {
    const modifier = getAbilityModifier(character.abilityScores.dexterity);
    rollD20(modifier, `${character.name} rolls Initiative`, 'initiative');
  };

  return (
    <Card className="h-full overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl font-medieval">
              {character.name}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Level {character.level} {character.race} {character.class}
              {character.subclass && ` (${character.subclass})`}
            </p>
          </div>
          <div className="relative group">
            {character.portraitUrl ? (
              <img
                src={character.portraitUrl}
                alt={character.name}
                className="w-14 h-14 rounded-full object-cover border-2 border-primary/30"
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center border-2 border-dashed border-muted-foreground/30">
                <User className="w-6 h-6 text-muted-foreground" />
              </div>
            )}
            {onUpdatePortrait && (
              <label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                <Camera className="w-4 h-4 text-white" />
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setUploadingAvatar(true);
                    try {
                      const formData = new FormData();
                      formData.append('file', file);
                      formData.append('type', 'avatar');
                      const res = await fetch('/api/images', { method: 'POST', body: formData });
                      const data = await res.json();
                      if (data.success) {
                        onUpdatePortrait(data.data.url);
                      }
                    } catch (err) {
                      console.error('Avatar upload failed:', err);
                    } finally {
                      setUploadingAvatar(false);
                    }
                  }}
                />
              </label>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <Tabs defaultValue="stats">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="stats">Stats</TabsTrigger>
            <TabsTrigger value="skills">Skills</TabsTrigger>
            <TabsTrigger value="inventory">Inv</TabsTrigger>
            <TabsTrigger value="spells">Spells</TabsTrigger>
            <TabsTrigger value="journal" className="relative">
              <BookOpen className="w-3 h-3 mr-1" />
              Log
              {journalDirty && <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-amber-500" />}
            </TabsTrigger>
          </TabsList>

          {/* Last Roll Display */}
          {lastRoll && (
            <div className="mt-2 p-2 bg-primary/10 rounded-lg text-center animate-in fade-in duration-300">
              <div className="text-xs text-muted-foreground">{lastRoll.description}</div>
              <div className="text-2xl font-bold">{lastRoll.result}</div>
            </div>
          )}

          <TabsContent value="stats" className="space-y-4">
            {/* HP Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Heart className="w-4 h-4 text-red-500" />
                  <span className="text-sm font-medium">Hit Points</span>
                </div>
                <span className="text-sm">
                  {character.currentHp} / {character.maxHp}
                  {character.tempHp > 0 && (
                    <span className="text-blue-500"> (+{character.tempHp})</span>
                  )}
                </span>
              </div>
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn('h-full transition-all', hpColor)}
                  style={{ width: `${hpPercentage}%` }}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onHeal?.(1)}
                  className="flex-1"
                >
                  Heal +1
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onDamage?.(1)}
                  className="flex-1"
                >
                  Damage -1
                </Button>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-muted rounded-lg p-3 text-center">
                <Shield className="w-4 h-4 mx-auto mb-1" />
                <div className="text-xl font-bold">{character.armorClass}</div>
                <div className="text-xs text-muted-foreground">AC</div>
              </div>
              <button
                onClick={rollInitiative}
                className="bg-muted rounded-lg p-3 text-center hover:bg-primary/20 hover:ring-2 hover:ring-primary/50 transition-all cursor-pointer"
                title="Click to roll initiative"
              >
                <Swords className="w-4 h-4 mx-auto mb-1" />
                <div className="text-xl font-bold">
                  {formatModifier(
                    getAbilityModifier(character.abilityScores.dexterity)
                  )}
                </div>
                <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                  <Dice6 className="w-3 h-3" />
                  Initiative
                </div>
              </button>
              <div className="bg-muted rounded-lg p-3 text-center">
                <Footprints className="w-4 h-4 mx-auto mb-1" />
                <div className="text-xl font-bold">{character.speed}</div>
                <div className="text-xs text-muted-foreground">Speed</div>
              </div>
            </div>

            {/* Ability Scores - Clickable */}
            <div>
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                Ability Scores
                <span className="text-xs text-muted-foreground font-normal">(click to roll)</span>
              </h4>
              <div className="grid grid-cols-6 gap-1">
                {Object.entries(character.abilityScores).map(([ability, score]) => (
                  <button
                    key={ability}
                    onClick={() => rollAbilityCheck(ability as keyof Character['abilityScores'])}
                    className="bg-muted rounded p-2 text-center hover:bg-primary/20 hover:ring-2 hover:ring-primary/50 transition-all cursor-pointer"
                    title={`Click to roll ${ABILITY_DISPLAY_NAMES[ability]} check`}
                  >
                    <div className="text-xs uppercase text-muted-foreground">
                      {ability.slice(0, 3)}
                    </div>
                    <div className="text-lg font-bold">{score}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatModifier(getAbilityModifier(score))}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Saving Throws */}
            <div>
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                Saving Throws
                <span className="text-xs text-muted-foreground font-normal">(click to roll)</span>
              </h4>
              <div className="grid grid-cols-3 gap-1">
                {Object.entries(character.abilityScores).map(([ability, score]) => {
                  const isProficient = character.savingThrows?.[ability as keyof Character['savingThrows']];
                  let modifier = getAbilityModifier(score);
                  if (isProficient) modifier += character.proficiencyBonus || 2;

                  return (
                    <button
                      key={ability}
                      onClick={() => rollSavingThrow(ability as keyof Character['abilityScores'])}
                      className={cn(
                        "rounded p-2 text-center transition-all cursor-pointer text-xs",
                        isProficient
                          ? "bg-primary/20 hover:bg-primary/30"
                          : "bg-muted hover:bg-muted/80"
                      )}
                      title={`Click to roll ${ABILITY_DISPLAY_NAMES[ability]} save`}
                    >
                      <span className="uppercase">{ability.slice(0, 3)}</span>
                      <span className="ml-1 font-bold">{formatModifier(modifier)}</span>
                      {isProficient && <span className="ml-1">●</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Hit Dice Tracker */}
            <div className="p-3 rounded-lg bg-muted/50">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-muted-foreground">Hit Dice</span>
                <span className="text-xs font-mono">
                  {character.hitDiceRemaining ?? character.level}/{character.level} ({character.hitDice?.split('d')[1] ? `d${character.hitDice.split('d')[1]}` : 'd8'})
                </span>
              </div>
              <div className="flex gap-0.5">
                {Array.from({ length: character.level }, (_, i) => (
                  <div
                    key={i}
                    className={cn(
                      'flex-1 h-2 rounded-full',
                      i < (character.hitDiceRemaining ?? character.level)
                        ? 'bg-amber-500'
                        : 'bg-muted-foreground/20'
                    )}
                  />
                ))}
              </div>
            </div>

            {/* Rest Buttons */}
            <div className="space-y-2">
              {shortRestOpen ? (
                <div className="p-3 rounded-lg border bg-amber-500/5 border-amber-500/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Short Rest</span>
                    <button onClick={() => setShortRestOpen(false)} className="text-xs text-muted-foreground hover:text-foreground">Cancel</button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Spend hit dice to recover HP. Each die heals d{character.hitDice?.split('d')[1] || 8} + CON mod.
                  </p>
                  <div className="flex items-center gap-3">
                    <label className="text-sm">Hit Dice to spend:</label>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm" variant="outline" className="h-7 w-7 p-0"
                        onClick={() => setShortRestDice(Math.max(0, shortRestDice - 1))}
                        disabled={shortRestDice <= 0}
                      >−</Button>
                      <span className="w-8 text-center font-bold">{shortRestDice}</span>
                      <Button
                        size="sm" variant="outline" className="h-7 w-7 p-0"
                        onClick={() => setShortRestDice(Math.min(character.hitDiceRemaining ?? 0, shortRestDice + 1))}
                        disabled={shortRestDice >= (character.hitDiceRemaining ?? 0)}
                      >+</Button>
                    </div>
                    <span className="text-xs text-muted-foreground">/ {character.hitDiceRemaining ?? 0} available</span>
                  </div>
                  <Button
                    size="sm" className="w-full"
                    disabled={resting}
                    onClick={async () => {
                      setResting(true);
                      try {
                        await onShortRest?.(shortRestDice);
                        setShortRestOpen(false);
                        setShortRestDice(1);
                      } finally {
                        setResting(false);
                      }
                    }}
                  >
                    <Sun className="w-4 h-4 mr-2" />
                    {resting ? 'Resting...' : `Rest${shortRestDice > 0 ? ` (spend ${shortRestDice} HD)` : ' (no dice)'}`}
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    disabled={resting}
                    onClick={() => {
                      setShortRestDice(Math.min(1, character.hitDiceRemaining ?? 0));
                      setShortRestOpen(true);
                    }}
                  >
                    <Sun className="w-4 h-4 mr-2" />
                    Short Rest
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    disabled={resting}
                    onClick={async () => {
                      if (!confirm('Take a long rest? This restores all HP, half your hit dice, and resets spell slots.')) return;
                      setResting(true);
                      try {
                        await onLongRest?.();
                      } finally {
                        setResting(false);
                      }
                    }}
                  >
                    <Moon className="w-4 h-4 mr-2" />
                    Long Rest
                  </Button>
                </div>
              )}
            </div>

            {/* XP Progress */}
            <div className="p-3 rounded-lg bg-muted/50">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-muted-foreground">Experience</span>
                <span className="text-xs text-muted-foreground">
                  Level {character.level}
                  {character.level < 20 && ` → ${character.level + 1}`}
                </span>
              </div>
              {(() => {
                const xpInfo = xpToNextLevel(character.experience || 0, character.level);
                return (
                  <>
                    <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full transition-all duration-500"
                        style={{ width: `${xpInfo.percent}%` }}
                      />
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-xs text-muted-foreground">
                        {(character.experience || 0).toLocaleString()} XP
                      </span>
                      {character.level < 20 ? (
                        <span className="text-xs text-muted-foreground">
                          {xpInfo.remaining.toLocaleString()} to next level
                        </span>
                      ) : (
                        <span className="text-xs text-amber-400 font-medium">MAX LEVEL</span>
                      )}
                    </div>
                  </>
                );
              })()}
            </div>
          </TabsContent>

          {/* Skills Tab */}
          <TabsContent value="skills" className="space-y-2">
            <div className="text-xs text-muted-foreground mb-2">
              Click a skill to roll. ● = proficient
            </div>
            <div className="grid grid-cols-2 gap-1">
              {Object.entries(SKILL_DISPLAY_NAMES).map(([skill, displayName]) => {
                const ability = SKILL_ABILITIES[skill];
                const score = character.abilityScores[ability];
                const isProficient = character.skills?.[skill as keyof Character['skills']];
                let modifier = getAbilityModifier(score);
                if (isProficient) modifier += character.proficiencyBonus || 2;

                return (
                  <button
                    key={skill}
                    onClick={() => rollSkillCheck(skill)}
                    className={cn(
                      "rounded p-2 text-left transition-all cursor-pointer text-xs flex items-center justify-between",
                      isProficient
                        ? "bg-primary/20 hover:bg-primary/30"
                        : "bg-muted hover:bg-muted/80"
                    )}
                    title={`Click to roll ${displayName} (${ABILITY_DISPLAY_NAMES[ability]})`}
                  >
                    <span className="flex items-center gap-1">
                      {isProficient && <span className="text-primary">●</span>}
                      <span className="truncate">{displayName}</span>
                    </span>
                    <span className="font-bold ml-1">{formatModifier(modifier)}</span>
                  </button>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="inventory" className="space-y-2">
            {/* Gold Display */}
            <div className="flex items-center justify-between p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <div className="flex items-center gap-2">
                <span className="text-amber-500 text-lg">🪙</span>
                <span className="font-medium text-amber-300">Gold</span>
              </div>
              <span className="font-bold text-amber-400">{gold} gp</span>
            </div>

            {inventory.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No items in inventory
              </p>
            ) : (
              inventory.map((item) => {
                const isEquippable = item.type === 'weapon' || item.type === 'armor' || item.type === 'wondrous';
                return (
                  <div
                    key={item.id}
                    className={cn(
                      "flex items-center justify-between p-2 rounded-lg",
                      item.equipped ? "bg-primary/10 border border-primary/20" : "bg-muted"
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{item.name}</span>
                        {item.magical && (
                          <Sparkles className="w-3 h-3 text-purple-500 flex-shrink-0" />
                        )}
                        {item.equipped && (
                          <Badge variant="secondary" className="text-[10px] h-4 flex-shrink-0">
                            Equipped
                          </Badge>
                        )}
                      </div>
                      {item.description && (
                        <p className="text-xs text-muted-foreground truncate">
                          {item.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                      <span className="text-xs text-muted-foreground">
                        x{item.quantity}
                      </span>
                      {isEquippable && onToggleEquip && (
                        <Button
                          variant={item.equipped ? "outline" : "secondary"}
                          size="sm"
                          className="h-6 text-[10px] px-2"
                          onClick={() => onToggleEquip(item.id, !item.equipped)}
                        >
                          {item.equipped ? 'Unequip' : 'Equip'}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </TabsContent>

          <TabsContent value="spells" className="space-y-3">
            {/* Class Features / Abilities */}
            {(() => {
              const features = getClassFeaturesAtLevel(character.class, character.level);
              if (features.length === 0) return null;
              return (
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
                    <Star className="w-3 h-3" /> Class Features
                  </h4>
                  <div className="space-y-1">
                    {features.map((feat, i) => {
                      const usedCount = featureUses[feat.name] || 0;
                      return (
                        <details key={i} className="group">
                          <summary className="flex items-center justify-between p-2 bg-muted rounded-lg cursor-pointer hover:bg-muted/80 text-sm">
                            <div className="flex items-center gap-2">
                              <ChevronRight className="w-3 h-3 group-open:hidden" />
                              <ChevronDown className="w-3 h-3 hidden group-open:block" />
                              <span className="font-medium">{feat.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {feat.uses && usedCount > 0 && (
                                <Badge variant="secondary" className="text-[10px] h-4 px-1">
                                  Used {usedCount}×
                                </Badge>
                              )}
                              <span className="text-xs text-muted-foreground">Lvl {feat.level}</span>
                            </div>
                          </summary>
                          <div className="px-3 py-2 text-xs text-muted-foreground leading-relaxed">
                            {feat.description}
                            {feat.uses && (
                              <div className="flex items-center gap-2 mt-2">
                                <span className="text-primary/70 font-medium">Uses: {feat.uses}</span>
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    setFeatureUses(prev => ({ ...prev, [feat.name]: (prev[feat.name] || 0) + 1 }));
                                  }}
                                  className="px-2 py-0.5 text-[10px] rounded bg-red-500/20 hover:bg-red-500/40 text-red-300 font-medium transition-colors"
                                >
                                  Use
                                </button>
                                {usedCount > 0 && (
                                  <button
                                    onClick={(e) => {
                                      e.preventDefault();
                                      setFeatureUses(prev => ({ ...prev, [feat.name]: Math.max(0, (prev[feat.name] || 0) - 1) }));
                                    }}
                                    className="px-2 py-0.5 text-[10px] rounded bg-green-500/20 hover:bg-green-500/40 text-green-300 font-medium transition-colors"
                                  >
                                    Restore
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </details>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* Spell Slots */}
            {character.spellSlots && Object.keys(character.spellSlots).length > 0 && (
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
                  <Zap className="w-3 h-3" /> Spell Slots
                </h4>
                <div className="flex gap-2 flex-wrap">
                  {Object.entries(character.spellSlots)
                    .filter(([, slot]) => slot.max > 0)
                    .map(([level, slot]) => {
                      const remaining = slot.max - slot.used;
                      const canExpend = remaining > 0 && !!onExpendSpellSlot;
                      const canRestore = slot.used > 0 && !!onRestoreSpellSlot;
                      return (
                        <div
                          key={level}
                          className={cn(
                            "rounded-lg px-2.5 py-1.5 text-xs border flex items-center gap-1.5",
                            remaining > 0
                              ? "bg-violet-500/10 border-violet-500/20 text-violet-300"
                              : "bg-muted border-border text-muted-foreground line-through"
                          )}
                        >
                          {canRestore && (
                            <button
                              onClick={() => onRestoreSpellSlot(Number(level))}
                              className="w-4 h-4 rounded-full bg-green-600/30 hover:bg-green-600/60 text-green-300 text-[10px] font-bold flex items-center justify-center transition-colors"
                              title={`Restore level ${level} slot`}
                            >+</button>
                          )}
                          <span>
                            <span className="font-medium">Lvl {level}:</span>{' '}
                            <span className="font-bold">{remaining}</span>/{slot.max}
                          </span>
                          {canExpend && (
                            <button
                              onClick={() => onExpendSpellSlot(Number(level))}
                              className="w-4 h-4 rounded-full bg-red-600/30 hover:bg-red-600/60 text-red-300 text-[10px] font-bold flex items-center justify-center transition-colors"
                              title={`Expend level ${level} slot`}
                            >−</button>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Spells by Level */}
            {spells.length === 0 && !getClassFeaturesAtLevel(character.class, character.level).length ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No spells or abilities known
              </p>
            ) : spells.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Spells Known
                </h4>
                {/* Group spells by level */}
                {(() => {
                  const grouped: Record<number, Spell[]> = {};
                  for (const s of spells) {
                    if (!grouped[s.level]) grouped[s.level] = [];
                    grouped[s.level].push(s);
                  }
                  return Object.entries(grouped)
                    .sort(([a], [b]) => Number(a) - Number(b))
                    .map(([level, levelSpells]) => (
                      <div key={level} className="mb-2">
                        <div className="text-xs font-semibold text-muted-foreground mb-1">
                          {Number(level) === 0 ? 'Cantrips' : `Level ${level}`}
                        </div>
                        <div className="space-y-1">
                          {levelSpells.map((spell) => (
                            <details key={spell.id} className="group">
                              <summary className="flex items-center justify-between p-2 bg-muted rounded-lg cursor-pointer hover:bg-muted/80 text-sm">
                                <div className="flex items-center gap-2">
                                  <ChevronRight className="w-3 h-3 group-open:hidden" />
                                  <ChevronDown className="w-3 h-3 hidden group-open:block" />
                                  <span className="font-medium">{spell.name}</span>
                                  {spell.concentration && (
                                    <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">C</Badge>
                                  )}
                                  {spell.ritual && (
                                    <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">R</Badge>
                                  )}
                                </div>
                                <span className="text-[10px] text-muted-foreground">{spell.school}</span>
                              </summary>
                              <div className="px-3 py-2 text-xs text-muted-foreground leading-relaxed space-y-1">
                                <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                                  <span><strong>Cast:</strong> {spell.castingTime}</span>
                                  <span><strong>Range:</strong> {spell.range}</span>
                                  <span><strong>Duration:</strong> {spell.duration}</span>
                                </div>
                                {spell.components && (
                                  <div><strong>Components:</strong> {spell.components}</div>
                                )}
                                {spell.description && (
                                  <p className="mt-1">{spell.description}</p>
                                )}
                              </div>
                            </details>
                          ))}
                        </div>
                      </div>
                    ));
                })()}
              </div>
            )}
          </TabsContent>

          {/* Journal Tab */}
          <TabsContent value="journal" className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Auto-saves as you type</span>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                {journalSaving && <><Save className="w-3 h-3 animate-pulse" /> Saving...</>}
                {!journalSaving && journalDirty && 'Unsaved'}
                {!journalSaving && !journalDirty && journalText && <><Save className="w-3 h-3" /> Saved</>}
              </span>
            </div>
            <textarea
              value={journalText}
              onChange={e => handleJournalChange(e.target.value)}
              placeholder="Jot down NPC names, plot threads, clues, plans..."
              className="w-full min-h-[300px] p-3 text-sm bg-muted/50 rounded-lg border border-border resize-y focus:outline-none focus:ring-1 focus:ring-primary/30"
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
});
