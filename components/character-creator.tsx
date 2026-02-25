'use client';

import React, { useState, useMemo } from 'react';
import {
  Loader2,
  Dice6,
  RefreshCw,
  Info,
  Shield,
  Swords,
  Heart,
  Zap,
  CheckCircle2,
  ChevronRight,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { cn, getAbilityModifier } from '../lib/utils';
import {
  DND_RACES,
  DND_CLASSES,
  DND_BACKGROUNDS,
  DND_ALIGNMENTS,
  STANDARD_ARRAY,
  ABILITY_NAMES,
  SKILL_ABILITY_MAP,
  SKILL_DISPLAY_NAMES,
  calculateHP,
  getProficiencyBonus,
  calculateBaseAC,
  calculateSpellSaveDC,
  calculateSpellAttackBonus,
  getHitDiceString,
  applyRacialBonuses,
} from '../lib/dnd-data';
import type { AbilityName } from '../lib/dnd-data';
import type { AbilityScores, SavingThrows, Skills } from '../types';

// ─── Types ────────────────────────────────────────────────────────

interface CharacterCreatorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateCharacter: (character: NewCharacterData) => Promise<void>;
}

export interface NewCharacterData {
  name: string;
  race: string;
  class: string;
  level: number;
  background: string;
  alignment: string;
  abilityScores: AbilityScores;
  maxHp: number;
  armorClass: number;
  proficiencyBonus: number;
  speed: number;
  savingThrows: SavingThrows;
  skills: Skills;
  hitDice: string;
  startingEquipment: string[];
  spellcastingAbility?: string;
  spellSaveDC?: number;
  spellAttackBonus?: number;
}

// ─── Defaults ─────────────────────────────────────────────────────

const DEFAULT_ABILITY_SCORES: AbilityScores = {
  strength: 10, dexterity: 10, constitution: 10,
  intelligence: 10, wisdom: 10, charisma: 10,
};

const DEFAULT_SAVING_THROWS: SavingThrows = {
  strength: false, dexterity: false, constitution: false,
  intelligence: false, wisdom: false, charisma: false,
};

const DEFAULT_SKILLS: Skills = {
  acrobatics: false, animalHandling: false, arcana: false, athletics: false,
  deception: false, history: false, insight: false, intimidation: false,
  investigation: false, medicine: false, nature: false, perception: false,
  performance: false, persuasion: false, religion: false, sleightOfHand: false,
  stealth: false, survival: false,
};

const TOTAL_STEPS = 5;

// ─── Component ────────────────────────────────────────────────────

export function CharacterCreator({ open, onOpenChange, onCreateCharacter }: CharacterCreatorProps) {
  const [step, setStep] = useState(1);
  const [creating, setCreating] = useState(false);

  // Step 1 — Basic Info
  const [name, setName] = useState('');
  const [race, setRace] = useState('human');
  const [characterClass, setCharacterClass] = useState('fighter');
  const [background, setBackground] = useState('soldier');
  const [alignment, setAlignment] = useState('neutral-good');
  const [level, setLevel] = useState(1);

  // Step 2 — Ability Scores
  const [abilityScores, setAbilityScores] = useState<AbilityScores>({ ...DEFAULT_ABILITY_SCORES });
  const [assignedScores, setAssignedScores] = useState<Record<string, number | null>>({
    strength: null, dexterity: null, constitution: null,
    intelligence: null, wisdom: null, charisma: null,
  });
  // Half-Elf bonus ability choices
  const [bonusChoices, setBonusChoices] = useState<AbilityName[]>([]);

  // Step 3 — Class Skill Selections
  const [selectedClassSkills, setSelectedClassSkills] = useState<string[]>([]);

  // Looked-up data
  const selectedClass = useMemo(() => DND_CLASSES.find(c => c.id === characterClass), [characterClass]);
  const selectedRace = useMemo(() => DND_RACES.find(r => r.id === race), [race]);
  const selectedBackground = useMemo(() => DND_BACKGROUNDS.find(b => b.id === background), [background]);
  const selectedAlignment = useMemo(() => DND_ALIGNMENTS.find(a => a.id === alignment), [alignment]);

  // Reset class skills when class changes
  const handleClassChange = (newClass: string) => {
    setCharacterClass(newClass);
    setSelectedClassSkills([]);
  };

  // Reset bonus choices when race changes
  const handleRaceChange = (newRace: string) => {
    setRace(newRace);
    setBonusChoices([]);
  };

  // ─── Ability Scores with Racial Bonuses ──────────────────────
  const finalAbilityScores = useMemo(() => {
    return applyRacialBonuses(abilityScores as Record<AbilityName, number>, race, bonusChoices);
  }, [abilityScores, race, bonusChoices]);

  // ─── Derived Stats ───────────────────────────────────────────
  const derivedStats = useMemo(() => {
    const hp = calculateHP(characterClass, level, finalAbilityScores.constitution);
    const ac = calculateBaseAC(finalAbilityScores.dexterity);
    const profBonus = getProficiencyBonus(level);
    const speed = selectedRace?.speed || 30;
    const hitDice = getHitDiceString(characterClass, level);

    let spellSaveDC: number | undefined;
    let spellAttackBonus: number | undefined;
    const spellAbility = selectedClass?.spellcastingAbility;
    if (spellAbility) {
      const abilityScore = finalAbilityScores[spellAbility];
      spellSaveDC = calculateSpellSaveDC(level, abilityScore);
      spellAttackBonus = calculateSpellAttackBonus(level, abilityScore);
    }

    return { hp, ac, profBonus, speed, hitDice, spellSaveDC, spellAttackBonus };
  }, [characterClass, finalAbilityScores, level, selectedRace, selectedClass]);

  // ─── Equipment List ──────────────────────────────────────────
  const allEquipment = useMemo(() => {
    const classEquip = selectedClass?.startingEquipment || [];
    const bgEquip = selectedBackground?.equipment || [];
    return [...classEquip, ...bgEquip];
  }, [selectedClass, selectedBackground]);

  // ─── Standard Array Helpers ──────────────────────────────────
  const availableScores = useMemo(() => {
    const used = Object.values(assignedScores).filter(s => s !== null) as number[];
    return STANDARD_ARRAY.filter(score => {
      const useCount = used.filter(s => s === score).length;
      const totalCount = STANDARD_ARRAY.filter(s => s === score).length;
      return useCount < totalCount;
    });
  }, [assignedScores]);

  const allScoresAssigned = Object.values(assignedScores).every(s => s !== null);

  const roll4d6DropLowest = () => {
    const rolls = Array.from({ length: 4 }, () => Math.floor(Math.random() * 6) + 1);
    rolls.sort((a, b) => b - a);
    return rolls.slice(0, 3).reduce((sum, r) => sum + r, 0);
  };

  const rollAllScores = () => {
    const newScores: AbilityScores = {
      strength: roll4d6DropLowest(), dexterity: roll4d6DropLowest(),
      constitution: roll4d6DropLowest(), intelligence: roll4d6DropLowest(),
      wisdom: roll4d6DropLowest(), charisma: roll4d6DropLowest(),
    };
    setAbilityScores(newScores);
    setAssignedScores({
      strength: newScores.strength, dexterity: newScores.dexterity,
      constitution: newScores.constitution, intelligence: newScores.intelligence,
      wisdom: newScores.wisdom, charisma: newScores.charisma,
    });
  };

  const useStandardArray = () => {
    setAssignedScores({
      strength: null, dexterity: null, constitution: null,
      intelligence: null, wisdom: null, charisma: null,
    });
    setAbilityScores({ ...DEFAULT_ABILITY_SCORES });
  };

  const assignScore = (ability: string, score: number | null) => {
    const newAssigned = { ...assignedScores, [ability]: score };
    setAssignedScores(newAssigned);
    const newAbilityScores = { ...abilityScores };
    ABILITY_NAMES.forEach(ab => {
      newAbilityScores[ab] = newAssigned[ab] ?? 10;
    });
    setAbilityScores(newAbilityScores);
  };

  // ─── Skill toggle ────────────────────────────────────────────
  const toggleClassSkill = (skill: string) => {
    const maxSkills = selectedClass?.numSkillChoices || 2;
    if (selectedClassSkills.includes(skill)) {
      setSelectedClassSkills(selectedClassSkills.filter(s => s !== skill));
    } else if (selectedClassSkills.length < maxSkills) {
      setSelectedClassSkills([...selectedClassSkills, skill]);
    }
  };

  // Background skills that are automatically granted
  const backgroundSkills = selectedBackground?.skills || [];

  // Check if a skill is already taken by background (can't double-pick)
  const isBackgroundSkill = (skill: string) => backgroundSkills.includes(skill);

  // ─── Half-Elf bonus choice toggle ────────────────────────────
  const toggleBonusChoice = (ability: AbilityName) => {
    const max = selectedRace?.bonusChoices?.count || 0;
    if (bonusChoices.includes(ability)) {
      setBonusChoices(bonusChoices.filter(a => a !== ability));
    } else if (bonusChoices.length < max) {
      setBonusChoices([...bonusChoices, ability]);
    }
  };

  // ─── Handle Creation ─────────────────────────────────────────
  const handleCreate = async () => {
    if (!name.trim()) return;
    setCreating(true);
    try {
      // Build saving throws from class
      const savingThrows = { ...DEFAULT_SAVING_THROWS };
      (selectedClass?.savingThrows || []).forEach(save => {
        savingThrows[save] = true;
      });

      // Build skills from background + class selections
      const skills = { ...DEFAULT_SKILLS };
      backgroundSkills.forEach(skill => {
        if (skill in skills) skills[skill as keyof Skills] = true;
      });
      selectedClassSkills.forEach(skill => {
        if (skill in skills) skills[skill as keyof Skills] = true;
      });

      const characterData: NewCharacterData = {
        name: name.trim(),
        race: selectedRace?.name || 'Human',
        class: selectedClass?.name || 'Fighter',
        level,
        background: selectedBackground?.name || 'Soldier',
        alignment: selectedAlignment?.name || 'Neutral Good',
        abilityScores: finalAbilityScores as AbilityScores,
        maxHp: Math.max(1, derivedStats.hp),
        armorClass: derivedStats.ac,
        proficiencyBonus: derivedStats.profBonus,
        speed: derivedStats.speed,
        savingThrows,
        skills,
        hitDice: derivedStats.hitDice,
        startingEquipment: allEquipment,
        ...(selectedClass?.spellcastingAbility && {
          spellcastingAbility: selectedClass.spellcastingAbility,
          spellSaveDC: derivedStats.spellSaveDC,
          spellAttackBonus: derivedStats.spellAttackBonus,
        }),
      };

      await onCreateCharacter(characterData);

      // Reset form
      setStep(1);
      setName('');
      setRace('human');
      setCharacterClass('fighter');
      setBackground('soldier');
      setAlignment('neutral-good');
      setLevel(1);
      setAbilityScores({ ...DEFAULT_ABILITY_SCORES });
      setAssignedScores({ strength: null, dexterity: null, constitution: null, intelligence: null, wisdom: null, charisma: null });
      setSelectedClassSkills([]);
      setBonusChoices([]);
    } finally {
      setCreating(false);
    }
  };

  // ─── Step validation ─────────────────────────────────────────
  const canProceed = () => {
    switch (step) {
      case 1: return name.trim().length > 0;
      case 2: {
        if (!allScoresAssigned) return false;
        // If race has bonus choices, they must all be selected
        if (selectedRace?.bonusChoices) {
          return bonusChoices.length === selectedRace.bonusChoices.count;
        }
        return true;
      }
      case 3: return selectedClassSkills.length === (selectedClass?.numSkillChoices || 2);
      case 4: return true; // Equipment is auto-granted
      case 5: return true;
      default: return false;
    }
  };

  // ─── Render ──────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Create New Character
            <Badge variant="outline">Step {step} of {TOTAL_STEPS}</Badge>
          </DialogTitle>
          <DialogDescription>
            {step === 1 && 'Choose your identity.'}
            {step === 2 && 'Assign your ability scores.'}
            {step === 3 && 'Pick your skill proficiencies.'}
            {step === 4 && 'Review your starting equipment.'}
            {step === 5 && 'Confirm your character.'}
          </DialogDescription>
        </DialogHeader>

        {/* Step Indicators */}
        <div className="flex gap-1.5 mb-2">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map(s => (
            <button
              key={s}
              onClick={() => s < step && setStep(s)}
              className={cn(
                'flex-1 h-1.5 rounded-full transition-colors',
                s < step ? 'bg-primary/60 cursor-pointer' : s === step ? 'bg-primary' : 'bg-muted',
              )}
            />
          ))}
        </div>

        {/* ═══════════════════════════════════════════════════════════
            STEP 1: Basic Info
           ═══════════════════════════════════════════════════════════ */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Character Name</label>
              <Input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Enter your hero's name"
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Race</label>
                <Select value={race} onValueChange={handleRaceChange}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DND_RACES.map(r => (
                      <SelectItem key={r.id} value={r.id}>
                        <div className="flex flex-col">
                          <span>{r.name}</span>
                          <span className="text-xs text-muted-foreground">{r.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Class</label>
                <Select value={characterClass} onValueChange={handleClassChange}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DND_CLASSES.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        <div className="flex flex-col">
                          <span>{c.name}</span>
                          <span className="text-xs text-muted-foreground">{c.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Background</label>
                <Select value={background} onValueChange={setBackground}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DND_BACKGROUNDS.map(b => (
                      <SelectItem key={b.id} value={b.id}>
                        <span>{b.name} — <span className="text-muted-foreground text-xs">{b.description}</span></span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Alignment</label>
                <Select value={alignment} onValueChange={setAlignment}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DND_ALIGNMENTS.map(a => (
                      <SelectItem key={a.id} value={a.id}>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="font-mono text-xs">{a.short}</Badge>
                          <span>{a.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Starting Level</label>
              <Input
                type="number" min={1} max={20}
                value={level}
                onChange={e => setLevel(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
                className="mt-1 w-24"
              />
            </div>

            {/* Race + Class Quick Info */}
            <div className="grid grid-cols-2 gap-3">
              {selectedRace && (
                <div className="p-3 bg-muted rounded-lg text-sm">
                  <div className="font-medium mb-1">{selectedRace.name}</div>
                  <div className="text-muted-foreground text-xs space-y-0.5">
                    <div>Speed: {selectedRace.speed}ft • {selectedRace.size}</div>
                    <div>
                      ASI: {Object.entries(selectedRace.abilityBonuses).map(([ab, val]) =>
                        `${ab.slice(0, 3).toUpperCase()} +${val}`
                      ).join(', ')}
                      {selectedRace.bonusChoices && ` + choose ${selectedRace.bonusChoices.count}×+${selectedRace.bonusChoices.amount}`}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedRace.traits.map(t => (
                        <Badge key={t} variant="outline" className="text-[10px] py-0">{t}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              {selectedClass && (
                <div className="p-3 bg-muted rounded-lg text-sm">
                  <div className="font-medium mb-1">{selectedClass.name}</div>
                  <div className="text-muted-foreground text-xs space-y-0.5">
                    <div>Hit Die: d{selectedClass.hitDie} • Primary: <span className="capitalize">{selectedClass.primaryAbility}</span></div>
                    <div>Saves: {selectedClass.savingThrows.map(s => s.slice(0, 3).toUpperCase()).join(', ')}</div>
                    {selectedClass.spellcastingAbility && (
                      <div>Spellcasting: <span className="capitalize">{selectedClass.spellcastingAbility}</span></div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════
            STEP 2: Ability Scores
           ═══════════════════════════════════════════════════════════ */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="flex gap-2 mb-2">
              <Button variant="outline" size="sm" onClick={useStandardArray}>
                <RefreshCw className="w-4 h-4 mr-2" />Standard Array
              </Button>
              <Button variant="outline" size="sm" onClick={rollAllScores}>
                <Dice6 className="w-4 h-4 mr-2" />Roll 4d6 Drop Lowest
              </Button>
            </div>

            {/* Available Scores Pool */}
            <div className="p-3 bg-muted rounded-lg">
              <label className="text-sm font-medium mb-2 block">Available Scores</label>
              <div className="flex gap-2 flex-wrap">
                {availableScores.length > 0 ? (
                  availableScores.map((score, i) => (
                    <Badge key={`${score}-${i}`} variant="secondary" className="text-lg px-3 py-1">{score}</Badge>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">All scores assigned</span>
                )}
              </div>
            </div>

            {/* Ability Score Assignment Grid */}
            <div className="grid grid-cols-2 gap-3">
              {ABILITY_NAMES.map(ability => {
                const baseScore = assignedScores[ability];
                const racialBonus = (selectedRace?.abilityBonuses[ability] || 0)
                  + (bonusChoices.includes(ability) ? (selectedRace?.bonusChoices?.amount || 0) : 0);
                const finalScore = baseScore ? baseScore + racialBonus : null;
                const mod = finalScore ? getAbilityModifier(finalScore) : 0;
                const isPrimary = selectedClass?.primaryAbility === ability;

                return (
                  <div
                    key={ability}
                    className={cn(
                      'p-3 rounded-lg border',
                      isPrimary && 'border-primary bg-primary/5',
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium capitalize flex items-center gap-2">
                        {ability}
                        {isPrimary && <Badge variant="default" className="text-xs">Primary</Badge>}
                      </label>
                      <div className="flex items-center gap-1.5">
                        {racialBonus > 0 && (
                          <span className="text-xs text-amber-500 font-medium">+{racialBonus}</span>
                        )}
                        {finalScore && (
                          <span className={cn('text-sm font-mono font-bold', mod >= 0 ? 'text-green-600' : 'text-red-500')}>
                            {finalScore} ({mod >= 0 ? '+' : ''}{mod})
                          </span>
                        )}
                      </div>
                    </div>
                    <Select
                      value={baseScore?.toString() || ''}
                      onValueChange={v => assignScore(ability, v && v !== 'unassigned' ? parseInt(v) : null)}
                    >
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                        {[...new Set([...availableScores, baseScore].filter(Boolean))].sort((a, b) => (b || 0) - (a || 0)).map(s => (
                          <SelectItem key={s} value={s!.toString()}>
                            {s} ({getAbilityModifier(s!) >= 0 ? '+' : ''}{getAbilityModifier(s!)})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                );
              })}
            </div>

            {/* Half-Elf (or similar) bonus ability choices */}
            {selectedRace?.bonusChoices && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <label className="text-sm font-medium mb-2 block">
                  Choose {selectedRace.bonusChoices.count} abilities for +{selectedRace.bonusChoices.amount}
                  <span className="text-muted-foreground ml-2">({bonusChoices.length}/{selectedRace.bonusChoices.count} selected)</span>
                </label>
                <div className="flex gap-2 flex-wrap">
                  {selectedRace.bonusChoices.from.map(ability => {
                    const chosen = bonusChoices.includes(ability);
                    return (
                      <button
                        key={ability}
                        onClick={() => toggleBonusChoice(ability)}
                        className={cn(
                          'px-3 py-1.5 rounded-md text-sm capitalize border transition-colors',
                          chosen
                            ? 'bg-amber-500/20 border-amber-500/40 text-amber-200 font-medium'
                            : 'border-border hover:bg-muted',
                        )}
                      >
                        {ability} {chosen && <CheckCircle2 className="w-3 h-3 inline ml-1" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {!allScoresAssigned && (
              <p className="text-sm text-amber-600">Assign all ability scores to continue.</p>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════
            STEP 3: Skills & Proficiencies
           ═══════════════════════════════════════════════════════════ */}
        {step === 3 && (
          <div className="space-y-4">
            {/* Background skills (auto-granted) */}
            <div>
              <h4 className="text-sm font-medium mb-2">Background Skills ({selectedBackground?.name})</h4>
              <div className="flex gap-2 flex-wrap">
                {backgroundSkills.map(skill => (
                  <Badge key={skill} variant="secondary" className="text-sm">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    {SKILL_DISPLAY_NAMES[skill] || skill}
                    <span className="text-muted-foreground ml-1 text-xs capitalize">
                      ({SKILL_ABILITY_MAP[skill]?.slice(0, 3)})
                    </span>
                  </Badge>
                ))}
              </div>
            </div>

            {/* Class skill choices */}
            <div>
              <h4 className="text-sm font-medium mb-2">
                Class Skills ({selectedClass?.name}) — Choose {selectedClass?.numSkillChoices || 2}
                <span className="text-muted-foreground ml-2">
                  ({selectedClassSkills.length}/{selectedClass?.numSkillChoices || 2} selected)
                </span>
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {(selectedClass?.skillChoices || []).map(skill => {
                  const isBg = isBackgroundSkill(skill);
                  const isSelected = selectedClassSkills.includes(skill);
                  const ability = SKILL_ABILITY_MAP[skill];
                  const abilityScore = ability ? finalAbilityScores[ability] : 10;
                  const mod = getAbilityModifier(abilityScore);
                  const profBonus = derivedStats.profBonus;
                  const totalBonus = mod + (isSelected || isBg ? profBonus : 0);

                  return (
                    <button
                      key={skill}
                      onClick={() => !isBg && toggleClassSkill(skill)}
                      disabled={isBg}
                      className={cn(
                        'flex items-center justify-between px-3 py-2 rounded-lg border text-sm text-left transition-colors',
                        isBg
                          ? 'bg-muted/50 border-muted cursor-not-allowed opacity-60'
                          : isSelected
                          ? 'bg-primary/10 border-primary/30 font-medium'
                          : 'hover:bg-muted border-border cursor-pointer',
                      )}
                    >
                      <span className="flex items-center gap-2">
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-primary" />}
                        {SKILL_DISPLAY_NAMES[skill] || skill}
                        {isBg && <span className="text-xs text-muted-foreground">(background)</span>}
                      </span>
                      <span className={cn('font-mono text-xs', totalBonus >= 0 ? 'text-green-600' : 'text-red-500')}>
                        {totalBonus >= 0 ? '+' : ''}{totalBonus}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Saving Throw Proficiencies */}
            <div>
              <h4 className="text-sm font-medium mb-2">Saving Throws</h4>
              <div className="flex gap-2 flex-wrap">
                {(selectedClass?.savingThrows || []).map(save => (
                  <Badge key={save} variant="secondary" className="capitalize">{save}</Badge>
                ))}
              </div>
            </div>

            {/* Armor & Weapon Proficiencies */}
            <div className="grid grid-cols-2 gap-4">
              {selectedClass && selectedClass.armorProficiencies.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-1 flex items-center gap-1">
                    <Shield className="w-3.5 h-3.5" /> Armor
                  </h4>
                  <div className="text-sm text-muted-foreground">
                    {selectedClass.armorProficiencies.join(', ')}
                  </div>
                </div>
              )}
              {selectedClass && selectedClass.weaponProficiencies.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-1 flex items-center gap-1">
                    <Swords className="w-3.5 h-3.5" /> Weapons
                  </h4>
                  <div className="text-sm text-muted-foreground">
                    {selectedClass.weaponProficiencies.join(', ')}
                  </div>
                </div>
              )}
            </div>

            {selectedClassSkills.length < (selectedClass?.numSkillChoices || 2) && (
              <p className="text-sm text-amber-600">
                Select {(selectedClass?.numSkillChoices || 2) - selectedClassSkills.length} more skill{(selectedClass?.numSkillChoices || 2) - selectedClassSkills.length !== 1 ? 's' : ''} to continue.
              </p>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════
            STEP 4: Equipment
           ═══════════════════════════════════════════════════════════ */}
        {step === 4 && (
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium mb-2">Class Equipment ({selectedClass?.name})</h4>
              <div className="space-y-1">
                {(selectedClass?.startingEquipment || []).map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm py-1.5 px-3 bg-muted/50 rounded-md">
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium mb-2">Background Equipment ({selectedBackground?.name})</h4>
              <div className="space-y-1">
                {(selectedBackground?.equipment || []).map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm py-1.5 px-3 bg-muted/50 rounded-md">
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                    {item}
                  </div>
                ))}
              </div>
            </div>

            {/* Tool proficiencies from class & background */}
            {((selectedClass?.toolProficiencies.length || 0) > 0 || (selectedBackground?.toolProficiencies.length || 0) > 0) && (
              <div>
                <h4 className="text-sm font-medium mb-2">Tool Proficiencies</h4>
                <div className="flex gap-2 flex-wrap">
                  {[...(selectedClass?.toolProficiencies || []), ...(selectedBackground?.toolProficiencies || [])].map((tool, i) => (
                    <Badge key={i} variant="outline">{tool}</Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Background feature */}
            {selectedBackground?.feature && (
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Info className="w-4 h-4" />
                  <span className="text-sm font-medium">Background Feature: {selectedBackground.feature}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════
            STEP 5: Summary
           ═══════════════════════════════════════════════════════════ */}
        {step === 5 && (
          <div className="space-y-4">
            {/* Header */}
            <div className="text-center p-4 border rounded-lg">
              <h3 className="text-2xl font-bold">{name || 'Unnamed Hero'}</h3>
              <p className="text-muted-foreground">
                Level {level} {selectedRace?.name} {selectedClass?.name}
              </p>
              <p className="text-sm">{selectedBackground?.name} • {selectedAlignment?.name}</p>
            </div>

            {/* Core Stats */}
            <div className="grid grid-cols-5 gap-2">
              <div className="text-center p-2.5 bg-red-500/10 rounded-lg">
                <Heart className="w-4 h-4 mx-auto mb-1 text-red-500" />
                <div className="text-xl font-bold text-red-600">{derivedStats.hp}</div>
                <div className="text-[10px] text-muted-foreground">HP</div>
              </div>
              <div className="text-center p-2.5 bg-blue-500/10 rounded-lg">
                <Shield className="w-4 h-4 mx-auto mb-1 text-blue-500" />
                <div className="text-xl font-bold text-blue-600">{derivedStats.ac}</div>
                <div className="text-[10px] text-muted-foreground">AC</div>
              </div>
              <div className="text-center p-2.5 bg-green-500/10 rounded-lg">
                <div className="text-xl font-bold text-green-600">+{derivedStats.profBonus}</div>
                <div className="text-[10px] text-muted-foreground">Prof</div>
              </div>
              <div className="text-center p-2.5 bg-purple-500/10 rounded-lg">
                <div className="text-xl font-bold text-purple-600">{derivedStats.speed}ft</div>
                <div className="text-[10px] text-muted-foreground">Speed</div>
              </div>
              <div className="text-center p-2.5 bg-orange-500/10 rounded-lg">
                <Dice6 className="w-4 h-4 mx-auto mb-1 text-orange-500" />
                <div className="text-xl font-bold text-orange-600">{derivedStats.hitDice}</div>
                <div className="text-[10px] text-muted-foreground">Hit Dice</div>
              </div>
            </div>

            {/* Spellcasting */}
            {derivedStats.spellSaveDC && (
              <div className="flex gap-3 justify-center">
                <Badge variant="secondary" className="text-sm">
                  <Zap className="w-3 h-3 mr-1" />
                  Spell Save DC: {derivedStats.spellSaveDC}
                </Badge>
                <Badge variant="secondary" className="text-sm">
                  Spell Attack: +{derivedStats.spellAttackBonus}
                </Badge>
                <Badge variant="outline" className="text-sm capitalize">
                  {selectedClass?.spellcastingAbility}
                </Badge>
              </div>
            )}

            {/* Ability Scores with Racial Bonuses */}
            <div className="grid grid-cols-6 gap-2">
              {ABILITY_NAMES.map(ability => {
                const baseScore = abilityScores[ability];
                const finalScore = finalAbilityScores[ability];
                const racialBonus = finalScore - baseScore;
                const mod = getAbilityModifier(finalScore);
                return (
                  <div key={ability} className="text-center p-2 bg-muted rounded">
                    <div className="text-xs uppercase text-muted-foreground">{ability.slice(0, 3)}</div>
                    <div className="text-lg font-bold">{finalScore}</div>
                    {racialBonus > 0 && (
                      <div className="text-[10px] text-amber-500">({baseScore}+{racialBonus})</div>
                    )}
                    <div className="text-xs">{mod >= 0 ? '+' : ''}{mod}</div>
                  </div>
                );
              })}
            </div>

            {/* Proficiencies Summary */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Saving Throws</h4>
              <div className="flex gap-2 flex-wrap">
                {(selectedClass?.savingThrows || []).map(save => (
                  <Badge key={save} variant="secondary" className="capitalize">{save}</Badge>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-medium">Skill Proficiencies</h4>
              <div className="flex gap-2 flex-wrap">
                {[...backgroundSkills, ...selectedClassSkills].map(skill => (
                  <Badge key={skill} variant="outline" className="text-sm">
                    {SKILL_DISPLAY_NAMES[skill] || skill}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Racial Traits */}
            {selectedRace && selectedRace.traits.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Racial Traits</h4>
                <div className="flex gap-2 flex-wrap">
                  {selectedRace.traits.map(t => (
                    <Badge key={t} variant="outline" className="text-xs">{t}</Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Equipment summary (condensed) */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Starting Equipment</h4>
              <div className="text-sm text-muted-foreground">
                {allEquipment.join(' • ')}
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════
            Footer Navigation
           ═══════════════════════════════════════════════════════════ */}
        <DialogFooter className="flex justify-between">
          <div>
            {step > 1 && (
              <Button variant="outline" onClick={() => setStep(step - 1)}>Back</Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            {step < TOTAL_STEPS ? (
              <Button onClick={() => setStep(step + 1)} disabled={!canProceed()}>Next</Button>
            ) : (
              <Button onClick={handleCreate} disabled={creating || !name.trim()}>
                {creating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Create Character
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
