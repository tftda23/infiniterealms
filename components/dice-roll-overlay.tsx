'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { DiceCanvas, type DieConfig, type DiePosition } from './dice-renderer';
import type { DiceRoll } from '@/types';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export type RollDisplayType =
  | 'player_attack' | 'player_damage' | 'player_check' | 'player_save'
  | 'npc_attack' | 'npc_damage'
  | 'secret';

export interface RollDisplay {
  id: string;
  label: string;
  type: RollDisplayType;
  dice: DieConfig[];
  rolls: number[];
  modifier: number;
  total: number;
  advantage?: boolean;
  disadvantage?: boolean;
  isNPC?: boolean;
  autoTime?: number;
}

interface DiceRollOverlayProps {
  roll?: DiceRoll | null;
  rollQueue?: RollDisplay[];
  description?: string;
  onComplete?: () => void;
  onQueueItemComplete?: (id: string) => void;
  duration?: number;
}

// ─── Dice Sound Manager ─────────────────────────────────────────
class DiceSoundManager {
  private audioCtx: AudioContext | null = null;
  private buffers: Map<string, AudioBuffer> = new Map();
  private loaded = false;
  private volume = 0.5;

  private soundFiles = {
    hit: [
      '/dice/sounds/dicehit/dicehit_plastic1.mp3',
      '/dice/sounds/dicehit/dicehit_plastic2.mp3',
      '/dice/sounds/dicehit/dicehit_plastic3.mp3',
      '/dice/sounds/dicehit/dicehit_plastic4.mp3',
    ],
    land: [
      '/dice/sounds/surfaces/surface_wood_table1.mp3',
      '/dice/sounds/surfaces/surface_wood_table2.mp3',
      '/dice/sounds/surfaces/surface_wood_table3.mp3',
    ],
  };

  async init() {
    if (this.loaded) return;
    try {
      this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const allFiles = [...this.soundFiles.hit, ...this.soundFiles.land];
      await Promise.allSettled(
        allFiles.map(async (url) => {
          try {
            const response = await fetch(url);
            if (!response.ok) return;
            const arrayBuf = await response.arrayBuffer();
            const audioBuf = await this.audioCtx!.decodeAudioData(arrayBuf);
            this.buffers.set(url, audioBuf);
          } catch { /* skip */ }
        })
      );
      this.loaded = true;
    } catch { /* Web Audio not available */ }
  }

  private playBuffer(url: string) {
    if (!this.audioCtx || !this.buffers.has(url)) return;
    try {
      const source = this.audioCtx.createBufferSource();
      source.buffer = this.buffers.get(url)!;
      const gain = this.audioCtx.createGain();
      gain.gain.value = this.volume;
      source.connect(gain);
      gain.connect(this.audioCtx.destination);
      source.start(0);
    } catch { /* ignore */ }
  }

  playHit() {
    const urls = this.soundFiles.hit.filter(u => this.buffers.has(u));
    if (urls.length === 0) return;
    this.playBuffer(urls[Math.floor(Math.random() * urls.length)]);
  }

  playLand() {
    const urls = this.soundFiles.land.filter(u => this.buffers.has(u));
    if (urls.length === 0) return;
    this.playBuffer(urls[Math.floor(Math.random() * urls.length)]);
  }

  setVolume(v: number) { this.volume = Math.max(0, Math.min(1, v)); }
}

let soundManager: DiceSoundManager | null = null;
function getSoundManager(): DiceSoundManager {
  if (!soundManager) soundManager = new DiceSoundManager();
  return soundManager;
}

// ═══════════════════════════════════════════════════════════════
// HELPER: Convert legacy DiceRoll to RollDisplay
// ═══════════════════════════════════════════════════════════════

function legacyToRollDisplay(roll: DiceRoll, description?: string): RollDisplay {
  const faces = parseInt(roll.notation.match(/d(\d+)/)?.[1] || '20');
  return {
    id: `legacy-${Date.now()}-${Math.random()}`,
    label: description || roll.notation,
    type: roll.type === 'damage' ? 'player_damage'
      : roll.type === 'saving_throw' ? 'player_save'
      : roll.type === 'attack' ? 'player_attack'
      : 'player_check',
    dice: roll.rolls.map((val, i) => {
      const isAdvDis = roll.advantage || roll.disadvantage;
      const kept = roll.advantage ? Math.max(...roll.rolls) : roll.disadvantage ? Math.min(...roll.rolls) : val;
      return {
        faces,
        value: val,
        dimmed: isAdvDis && roll.rolls.length === 2 && val !== kept && i !== roll.rolls.indexOf(kept),
      };
    }),
    rolls: roll.rolls,
    modifier: roll.modifier,
    total: roll.total,
    advantage: roll.advantage,
    disadvantage: roll.disadvantage,
    isNPC: false,
  };
}

// ═══════════════════════════════════════════════════════════════
// Generate random scattered positions for dice on screen
// ═══════════════════════════════════════════════════════════════

function generateDiePositions(count: number): DiePosition[] {
  const positions: DiePosition[] = [];
  // Dice are thrown from bottom-center (the player's hand)
  // They arc upward and land scattered across the center of the screen
  const throwOriginX = 0.5 + (Math.random() - 0.5) * 0.1; // near center-bottom
  const throwOriginY = 1.1; // just below viewport

  for (let i = 0; i < count; i++) {
    // Start position: clustered at the throw origin with slight spread
    const startX = throwOriginX + (Math.random() - 0.5) * 0.06;
    const startY = throwOriginY + Math.random() * 0.05;

    // Target: fan out across the center of the screen
    const baseTargetX = count === 1
      ? 0.5
      : 0.3 + (i / (count - 1)) * 0.4; // Spread from 0.3 to 0.7
    const jitterX = (Math.random() - 0.5) * 0.14;
    const jitterY = (Math.random() - 0.5) * 0.08;

    positions.push({
      x: startX,
      y: startY,
      targetX: Math.max(0.2, Math.min(0.8, baseTargetX + jitterX)),
      targetY: Math.max(0.3, Math.min(0.55, 0.42 + jitterY)),
      spinSpeed: [
        (Math.random() - 0.5) * 8 + (Math.random() > 0.5 ? 3 : -3), // biased spin
        (Math.random() - 0.5) * 8 + (Math.random() > 0.5 ? 3 : -3),
        (Math.random() - 0.5) * 5,
      ],
      bounceHeight: 70 + Math.random() * 50, // 70-120px bounce arc
      settleRz: (Math.random() - 0.5) * Math.PI * 0.6, // random z-twist for variety
    });
  }
  return positions;
}

// ═══════════════════════════════════════════════════════════════
// MAIN OVERLAY COMPONENT — FULL SCREEN
// ═══════════════════════════════════════════════════════════════

export function DiceRollOverlay({
  roll,
  rollQueue = [],
  description,
  onComplete,
  onQueueItemComplete,
  duration = 3200,
}: DiceRollOverlayProps) {
  const [currentRoll, setCurrentRoll] = useState<RollDisplay | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [rolling, setRolling] = useState(false);
  const [settled, setSettled] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [viewportSize, setViewportSize] = useState({ w: 1200, h: 800 });
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const lastRollIdRef = useRef<string | null>(null);
  const onCompleteRef = useRef(onComplete);
  const onQueueItemCompleteRef = useRef(onQueueItemComplete);
  onCompleteRef.current = onComplete;
  onQueueItemCompleteRef.current = onQueueItemComplete;

  // Track viewport size
  useEffect(() => {
    const update = () => setViewportSize({ w: window.innerWidth, h: window.innerHeight });
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // Init sounds
  useEffect(() => {
    getSoundManager().init();
  }, []);

  // Stable die positions per roll (memoized on currentRoll id)
  const diePositions = useMemo(() => {
    if (!currentRoll) return [];
    return generateDiePositions(currentRoll.dice.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentRoll?.id]);

  // Handle legacy roll prop
  useEffect(() => {
    if (roll && !rollQueue.length) {
      const display = legacyToRollDisplay(roll, description);
      showRollFn(display);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roll, description]);

  // Handle roll queue
  useEffect(() => {
    if (rollQueue.length > 0 && !currentRoll) {
      const next = rollQueue[0];
      if (next.id !== lastRollIdRef.current) {
        showRollFn(next);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rollQueue, currentRoll]);

  const showRollFn = useCallback((display: RollDisplay) => {
    timersRef.current.forEach(t => clearTimeout(t));
    timersRef.current = [];

    lastRollIdRef.current = display.id;
    setCurrentRoll(display);
    setIsVisible(true);
    setRolling(true);
    setSettled(false);
    setShowResult(false);

    const isNPC = display.isNPC;
    const rollTime = isNPC ? duration * 0.6 : duration;
    const autoTime = display.autoTime || rollTime;

    const mgr = getSoundManager();

    const hit1 = setTimeout(() => mgr.playHit(), 150);
    const hit2 = setTimeout(() => mgr.playHit(), 400);
    const hit3 = setTimeout(() => mgr.playHit(), 650);

    const settleTime = Math.min(autoTime * 0.55, 1200);
    const settleT = setTimeout(() => {
      setSettled(true);
      setRolling(false);
      mgr.playLand();
    }, settleTime);

    const resultT = setTimeout(() => {
      setShowResult(true);
    }, settleTime + 250);

    const dismissT = setTimeout(() => {
      setIsVisible(false);
      setRolling(false);
      setSettled(false);
      setShowResult(false);
      setCurrentRoll(null);
      onCompleteRef.current?.();
      onQueueItemCompleteRef.current?.(display.id);
    }, autoTime);

    timersRef.current = [hit1, hit2, hit3, settleT, resultT, dismissT];
  }, [duration]);

  if (!isVisible || !currentRoll) return null;

  const { dice, rolls, modifier, total, advantage, disadvantage, label, type, isNPC } = currentRoll;
  const isAdvDis = advantage || disadvantage;
  const faces = dice[0]?.faces || 20;
  const keptDie = isAdvDis && rolls.length === 2
    ? (advantage ? Math.max(...rolls) : Math.min(...rolls))
    : rolls[0] ?? 0;
  const isNat20 = faces === 20 && keptDie === 20;
  const isNat1 = faces === 20 && keptDie === 1;

  const isAttack = type === 'player_attack' || type === 'npc_attack';
  const isDamage = type === 'player_damage' || type === 'npc_damage';
  const labelColor = isNPC ? 'text-red-300' : 'text-blue-200';
  const labelBg = isNPC ? 'bg-red-900/60' : 'bg-black/60';
  const typeIcon = isAttack ? '\u2694\uFE0F' : isDamage ? '\uD83D\uDCA5' : type === 'player_save' ? '\uD83D\uDEE1\uFE0F' : '\uD83C\uDFB2';

  return (
    <div className="fixed inset-0 z-[60]" style={{ pointerEvents: 'none' }}>
      {/* Full-screen backdrop */}
      <div
        className={cn(
          'absolute inset-0 transition-opacity duration-300',
          isVisible ? 'opacity-100' : 'opacity-0',
        )}
        style={{
          background: isNat20 && showResult
            ? 'radial-gradient(circle, rgba(234,179,8,0.25) 0%, rgba(0,0,0,0.6) 60%)'
            : isNat1 && showResult
            ? 'radial-gradient(circle, rgba(220,38,38,0.25) 0%, rgba(0,0,0,0.6) 60%)'
            : 'radial-gradient(circle, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.65) 60%)',
          backdropFilter: 'blur(2px)',
        }}
      />

      {/* Full-viewport canvas — dice scattered across screen */}
      <DiceCanvas
        dice={dice}
        positions={diePositions}
        rolling={rolling}
        settled={settled}
        width={viewportSize.w}
        height={viewportSize.h}
      />

      {/* Label banner — top of screen */}
      <div className="absolute top-8 left-0 right-0 flex justify-center">
        <div className={cn(
          'flex items-center gap-2 text-white text-lg font-medium px-6 py-2.5 rounded-full backdrop-blur-md border border-white/10 animate-in fade-in slide-in-from-top-4 duration-400',
          labelBg, labelColor,
        )}>
          <span className="text-xl">{typeIcon}</span>
          <span>{label}</span>
          {isNPC && <span className="text-xs uppercase tracking-wider opacity-60 ml-1">(NPC)</span>}
          {isAdvDis && (
            <span className={cn(
              'text-xs font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ml-2',
              advantage
                ? 'text-emerald-300 bg-emerald-500/15 border-emerald-500/30'
                : 'text-rose-300 bg-rose-500/15 border-rose-500/30',
            )}>
              {advantage ? 'ADV' : 'DIS'}
            </span>
          )}
        </div>
      </div>

      {/* Result area — bottom of screen */}
      {showResult && (
        <div className="absolute bottom-12 left-0 right-0 flex flex-col items-center gap-2 animate-in fade-in slide-in-from-bottom-6 duration-500">
          {/* Grand total */}
          <div
            className={cn(
              'text-7xl font-black text-white tracking-tight',
              isNat20 && 'text-yellow-300 animate-pulse',
              isNat1 && 'text-red-400',
            )}
            style={{
              textShadow: isNat20
                ? '0 0 40px rgba(255,215,0,0.7), 0 4px 12px rgba(0,0,0,0.5)'
                : isNat1
                ? '0 0 30px rgba(239,68,68,0.6), 0 4px 12px rgba(0,0,0,0.5)'
                : '0 4px 16px rgba(0,0,0,0.6)',
            }}
          >
            {total}
          </div>

          {/* Breakdown pill */}
          <div className="text-white/70 text-sm bg-white/10 backdrop-blur-sm px-5 py-2 rounded-full border border-white/10">
            {isAdvDis && rolls.length === 2 ? (
              <>
                {rolls.map((val, i) => {
                  const keptIndex = rolls[0] === rolls[1] ? 0
                    : advantage ? (rolls[0] > rolls[1] ? 0 : 1)
                    : (rolls[0] < rolls[1] ? 0 : 1);
                  const thisIsKept = i === keptIndex;
                  return (
                    <span key={i}>
                      {i > 0 && <span className="mx-1 text-white/40">/</span>}
                      <span className={thisIsKept ? 'font-bold text-white' : 'line-through opacity-40'}>{val}</span>
                    </span>
                  );
                })}
              </>
            ) : (
              <>{rolls.join(' + ')}</>
            )}
            {modifier !== 0 && ` ${modifier >= 0 ? '+' : ''}${modifier}`}
            {' = '}
            <span className="font-bold text-white">{total}</span>
          </div>

          {/* Nat 20 / Nat 1 */}
          {isNat20 && (
            <div className="text-yellow-300 text-3xl font-black tracking-wide animate-bounce mt-1"
              style={{ textShadow: '0 0 25px rgba(255,215,0,0.6)' }}>
              NATURAL 20!
            </div>
          )}
          {isNat1 && (
            <div className="text-red-400 text-3xl font-black tracking-wide mt-1"
              style={{ textShadow: '0 0 20px rgba(239,68,68,0.5)' }}>
              Critical Failure!
            </div>
          )}

          {isDamage && (
            <div className="text-orange-300/80 text-xs uppercase tracking-wider font-semibold">
              Damage
            </div>
          )}
        </div>
      )}
    </div>
  );
}
