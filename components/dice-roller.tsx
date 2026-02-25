'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { DiceRoll } from '@/types';

interface DiceRollerProps {
  onRollComplete?: (roll: DiceRoll) => void;
  initialNotation?: string;
  autoRoll?: boolean;
  showControls?: boolean;
}

type DieType = 'd4' | 'd6' | 'd8' | 'd10' | 'd12' | 'd20' | 'd100';

const DIE_FACES: Record<DieType, number> = {
  d4: 4, d6: 6, d8: 8, d10: 10, d12: 12, d20: 20, d100: 100,
};

// ─── Color schemes per die type ──────────────────────────────────
const DIE_THEME: Record<DieType, {
  base: string; dark: string; light: string; specular: string;
  stroke: string; glow: string;
}> = {
  d4:   { base: '#ef4444', dark: '#991b1b', light: '#fca5a5', specular: '#fecaca', stroke: '#7f1d1d', glow: 'rgba(239,68,68,0.5)' },
  d6:   { base: '#3b82f6', dark: '#1e3a8a', light: '#93c5fd', specular: '#bfdbfe', stroke: '#1e40af', glow: 'rgba(59,130,246,0.5)' },
  d8:   { base: '#22c55e', dark: '#14532d', light: '#86efac', specular: '#bbf7d0', stroke: '#166534', glow: 'rgba(34,197,94,0.5)' },
  d10:  { base: '#a855f7', dark: '#581c87', light: '#d8b4fe', specular: '#e9d5ff', stroke: '#6b21a8', glow: 'rgba(168,85,247,0.5)' },
  d12:  { base: '#eab308', dark: '#713f12', light: '#fde047', specular: '#fef08a', stroke: '#854d0e', glow: 'rgba(234,179,8,0.5)' },
  d20:  { base: '#c026d3', dark: '#701a75', light: '#e879f9', specular: '#f0abfc', stroke: '#86198f', glow: 'rgba(192,38,211,0.5)' },
  d100: { base: '#6b7280', dark: '#1f2937', light: '#d1d5db', specular: '#e5e7eb', stroke: '#374151', glow: 'rgba(107,114,128,0.5)' },
};

// ─── Shape geometry ──────────────────────────────────────────────
function getShapePoints(type: DieType): string {
  switch (type) {
    case 'd4':   return '50,8 92,88 8,88';
    case 'd6':   return '14,14 86,14 86,86 14,86';
    case 'd8':   return '50,4 96,50 50,96 4,50';
    case 'd10':  return '50,4 92,28 92,72 50,96 8,72 8,28';
    case 'd12':  return '50,3 79,13 96,42 88,76 60,96 28,90 6,64 6,34 24,12';
    case 'd20':  return '50,2 88,20 98,56 78,90 22,90 2,56 12,20';
    case 'd100': return '50,4 92,28 92,72 50,96 8,72 8,28';
    default:     return '50,2 88,20 98,56 78,90 22,90 2,56 12,20';
  }
}

function getHighlightPoints(type: DieType): string {
  switch (type) {
    case 'd4':   return '50,8 72,48 28,48';
    case 'd6':   return '14,14 60,14 40,50 14,50';
    case 'd8':   return '50,4 75,27 50,50 25,27';
    case 'd10':
    case 'd100': return '50,4 80,20 70,48 30,48 20,20';
    case 'd12':  return '50,3 79,13 75,38 50,50 25,38 24,12';
    case 'd20':  return '50,2 88,20 70,50 30,50 12,20';
    default:     return '50,2 88,20 70,50 30,50 12,20';
  }
}

function getInnerEdges(type: DieType) {
  switch (type) {
    case 'd4': return (
      <>
        <line x1="50" y1="8" x2="50" y2="58" />
        <line x1="50" y1="58" x2="8" y2="88" />
        <line x1="50" y1="58" x2="92" y2="88" />
      </>
    );
    case 'd6': return (
      <>
        <line x1="14" y1="14" x2="86" y2="86" opacity="0.12" />
        <line x1="86" y1="14" x2="14" y2="86" opacity="0.12" />
      </>
    );
    case 'd8': return (
      <>
        <line x1="50" y1="4" x2="50" y2="96" />
        <line x1="4" y1="50" x2="96" y2="50" />
      </>
    );
    case 'd10':
    case 'd100': return (
      <>
        <line x1="50" y1="4" x2="50" y2="96" />
        <line x1="8" y1="28" x2="92" y2="72" />
        <line x1="92" y1="28" x2="8" y2="72" />
      </>
    );
    case 'd12': return (
      <>
        <line x1="50" y1="3" x2="50" y2="50" />
        <line x1="50" y1="50" x2="96" y2="42" />
        <line x1="50" y1="50" x2="6" y2="34" />
        <line x1="50" y1="50" x2="88" y2="76" />
        <line x1="50" y1="50" x2="6" y2="64" />
      </>
    );
    case 'd20': default: return (
      <>
        <line x1="50" y1="2" x2="78" y2="90" />
        <line x1="50" y1="2" x2="22" y2="90" />
        <line x1="88" y1="20" x2="2" y2="56" />
        <line x1="12" y1="20" x2="98" y2="56" />
        <line x1="22" y1="90" x2="98" y2="56" />
        <line x1="78" y1="90" x2="2" y2="56" />
      </>
    );
  }
}

interface RollingDie {
  id: string;
  type: DieType;
  value: number;
  isRolling: boolean;
  finalValue: number;
}

// ─── 3D Die Shape Component ──────────────────────────────────────
function DieShape3D({ type, value, isRolling, id }: {
  type: DieType; value: number; isRolling: boolean; id: string;
}) {
  const theme = DIE_THEME[type];
  const gradId = `roller-grad-${id}`;
  const specId = `roller-spec-${id}`;
  const filtId = `roller-filt-${id}`;
  const outerPts = getShapePoints(type);
  const highlightPts = getHighlightPoints(type);

  return (
    <div className={cn(
      "relative flex items-center justify-center transition-transform",
      type === 'd6' ? 'w-14 h-14' : 'w-16 h-16',
      isRolling && 'dice-3d-tumble',
    )}>
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={theme.light} />
            <stop offset="40%" stopColor={theme.base} />
            <stop offset="100%" stopColor={theme.dark} />
          </linearGradient>
          <radialGradient id={specId} cx="0.35" cy="0.25" r="0.5">
            <stop offset="0%" stopColor={theme.specular} stopOpacity="0.6" />
            <stop offset="60%" stopColor={theme.light} stopOpacity="0.1" />
            <stop offset="100%" stopColor={theme.base} stopOpacity="0" />
          </radialGradient>
          <filter id={filtId}>
            <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="rgba(0,0,0,0.4)" />
            <feDropShadow dx="0" dy="0" stdDeviation="1" floodColor={theme.glow} />
          </filter>
        </defs>

        {/* Body */}
        <polygon
          points={outerPts}
          fill={`url(#${gradId})`}
          stroke={theme.stroke}
          strokeWidth="1.5"
          strokeLinejoin="round"
          filter={`url(#${filtId})`}
        />
        {/* Inner edges */}
        <g stroke={theme.stroke} strokeWidth="0.6" opacity="0.25" strokeLinecap="round">
          {getInnerEdges(type)}
        </g>
        {/* Specular highlight */}
        <polygon points={highlightPts} fill={`url(#${specId})`} stroke="none" />
        {/* Rim light */}
        <polygon
          points={outerPts}
          fill="none"
          stroke="rgba(255,255,255,0.15)"
          strokeWidth="0.8"
          strokeLinejoin="round"
          strokeDasharray="6,16"
        />
      </svg>
      {/* Number */}
      <span className={cn(
        "absolute text-white font-bold drop-shadow-lg transition-all duration-100",
        type === 'd4' ? 'text-sm top-[55%] -translate-y-1/2' : type === 'd100' ? 'text-xs' : 'text-lg',
        isRolling && 'opacity-50',
      )} style={{ textShadow: '0 1px 3px rgba(0,0,0,0.6)' }}>
        {isRolling ? '?' : value}
      </span>
    </div>
  );
}

// ─── Main DiceRoller Component ───────────────────────────────────
export function DiceRoller({
  onRollComplete,
  initialNotation = '1d20',
  autoRoll = false,
  showControls = true,
}: DiceRollerProps) {
  const [dice, setDice] = useState<RollingDie[]>([]);
  const [modifier, setModifier] = useState(0);
  const [isRolling, setIsRolling] = useState(false);
  const [total, setTotal] = useState<number | null>(null);
  const [selectedDieType, setSelectedDieType] = useState<DieType>('d20');

  const parseNotation = useCallback((notation: string): { count: number; type: DieType; mod: number } => {
    const match = notation.match(/^(\d+)?d(\d+)([+-]\d+)?$/i);
    if (!match) return { count: 1, type: 'd20', mod: 0 };
    const count = parseInt(match[1] || '1');
    const faces = parseInt(match[2]);
    const mod = parseInt(match[3] || '0');
    let type: DieType = 'd20';
    if (faces === 4) type = 'd4';
    else if (faces === 6) type = 'd6';
    else if (faces === 8) type = 'd8';
    else if (faces === 10) type = 'd10';
    else if (faces === 12) type = 'd12';
    else if (faces === 20) type = 'd20';
    else if (faces === 100) type = 'd100';
    return { count: Math.min(count, 10), type, mod };
  }, []);

  const rollDie = (type: DieType): number => {
    return Math.floor(Math.random() * DIE_FACES[type]) + 1;
  };

  const performRoll = useCallback((diceToRoll: RollingDie[]) => {
    setIsRolling(true);
    setTotal(null);

    let animationFrames = 0;
    const maxFrames = 15;

    const animate = () => {
      animationFrames++;
      setDice(prev => prev.map(die => ({
        ...die,
        value: rollDie(die.type),
        isRolling: animationFrames < maxFrames,
      })));

      if (animationFrames < maxFrames) {
        setTimeout(animate, 80);
      } else {
        setDice(prev => prev.map(die => ({
          ...die,
          value: die.finalValue,
          isRolling: false,
        })));

        const rollTotal = diceToRoll.reduce((sum, die) => sum + die.finalValue, 0) + modifier;
        setTotal(rollTotal);
        setIsRolling(false);

        if (onRollComplete) {
          const notation = `${diceToRoll.length}d${DIE_FACES[diceToRoll[0].type]}${modifier >= 0 ? '+' : ''}${modifier}`;
          const roll: DiceRoll = {
            notation,
            rolls: diceToRoll.map(d => d.finalValue),
            modifier,
            total: rollTotal,
            type: 'other',
          };
          onRollComplete(roll);
        }
      }
    };

    animate();
  }, [modifier, onRollComplete]);

  const roll = useCallback(() => {
    const newDice: RollingDie[] = dice.map(die => ({
      ...die,
      finalValue: rollDie(die.type),
      isRolling: true,
    }));
    setDice(newDice);
    performRoll(newDice);
  }, [dice, performRoll]);

  const addDie = (type: DieType) => {
    if (dice.length >= 10) return;
    const finalValue = rollDie(type);
    const newDie: RollingDie = {
      id: `die-${Date.now()}-${Math.random()}`,
      type,
      value: finalValue,
      isRolling: false,
      finalValue,
    };
    setDice(prev => [...prev, newDie]);
  };

  const removeDie = (id: string) => {
    setDice(prev => prev.filter(d => d.id !== id));
  };

  const clearDice = () => {
    setDice([]);
    setTotal(null);
    setModifier(0);
  };

  useEffect(() => {
    if (initialNotation && dice.length === 0) {
      const { count, type, mod } = parseNotation(initialNotation);
      const newDice: RollingDie[] = Array.from({ length: count }, () => {
        const finalValue = rollDie(type);
        return {
          id: `die-${Date.now()}-${Math.random()}`,
          type,
          value: finalValue,
          isRolling: false,
          finalValue,
        };
      });
      setDice(newDice);
      setModifier(mod);
      setSelectedDieType(type);

      if (autoRoll) {
        setTimeout(() => performRoll(newDice), 100);
      }
    }
  }, [initialNotation, autoRoll, parseNotation, performRoll, dice.length]);

  return (
    <div className="p-4 rounded-lg bg-muted/50 border">
      {/* Dice Display Area */}
      <div className="flex flex-wrap gap-2 justify-center min-h-[80px] mb-4">
        {dice.map(die => (
          <div key={die.id} className="relative group">
            <DieShape3D
              type={die.type}
              value={die.value}
              isRolling={die.isRolling}
              id={die.id}
            />
            {!isRolling && (
              <button
                onClick={() => removeDie(die.id)}
                className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        ))}
        {dice.length === 0 && (
          <div className="text-muted-foreground text-sm flex items-center">
            Click a die type to add it
          </div>
        )}
      </div>

      {/* Total Display */}
      {total !== null && (
        <div className="text-center mb-4">
          <div className="text-4xl font-bold">
            {total}
            {dice.length > 0 && dice[0].finalValue === DIE_FACES[dice[0].type] && (
              <span className="ml-2 text-yellow-500">🎉 MAX!</span>
            )}
            {dice.length > 0 && dice[0].type === 'd20' && dice[0].finalValue === 1 && (
              <span className="ml-2 text-red-500">💀 NAT 1!</span>
            )}
            {dice.length > 0 && dice[0].type === 'd20' && dice[0].finalValue === 20 && (
              <span className="ml-2 text-yellow-500">🎉 NAT 20!</span>
            )}
          </div>
          <div className="text-sm text-muted-foreground">
            {dice.map(d => d.finalValue).join(' + ')}
            {modifier !== 0 && ` ${modifier >= 0 ? '+' : ''}${modifier}`}
          </div>
        </div>
      )}

      {/* Controls */}
      {showControls && (
        <div className="space-y-3">
          {/* Die Type Buttons */}
          <div className="flex flex-wrap gap-1 justify-center">
            {(Object.keys(DIE_FACES) as DieType[]).map(type => (
              <Button
                key={type}
                variant={selectedDieType === type ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setSelectedDieType(type);
                  addDie(type);
                }}
                disabled={isRolling}
              >
                {type}
              </Button>
            ))}
          </div>

          {/* Modifier */}
          <div className="flex items-center justify-center gap-2">
            <span className="text-sm">Modifier:</span>
            <Button variant="outline" size="sm" onClick={() => setModifier(m => m - 1)} disabled={isRolling}>-</Button>
            <Badge variant="secondary" className="min-w-[40px] justify-center">
              {modifier >= 0 ? '+' : ''}{modifier}
            </Badge>
            <Button variant="outline" size="sm" onClick={() => setModifier(m => m + 1)} disabled={isRolling}>+</Button>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 justify-center">
            <Button onClick={roll} disabled={isRolling || dice.length === 0} className="flex-1 max-w-[120px]">
              {isRolling ? 'Rolling...' : 'Roll!'}
            </Button>
            <Button variant="outline" onClick={clearDice} disabled={isRolling}>
              Clear
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Compact dice roll result display ────────────────────────────
export function DiceRollResult({ roll, className }: { roll: DiceRoll; className?: string }) {
  const is20 = roll.rolls.some(r => r === 20);
  const is1 = roll.rolls.every(r => r === 1) && roll.rolls.length === 1;

  return (
    <div className={cn("inline-flex items-center gap-2 p-2 rounded-lg bg-muted/50", className)}>
      <Badge variant={is20 ? 'default' : is1 ? 'destructive' : 'secondary'}>
        {roll.notation}
      </Badge>
      <span className="text-muted-foreground">→</span>
      <span className="font-bold text-lg">
        {roll.total}
        {is20 && <span className="ml-1">🎉</span>}
        {is1 && <span className="ml-1">💀</span>}
      </span>
      <span className="text-xs text-muted-foreground">
        ({roll.rolls.join('+')}
        {roll.modifier !== 0 && `${roll.modifier >= 0 ? '+' : ''}${roll.modifier}`})
      </span>
    </div>
  );
}
