'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Skull, Heart, ShieldAlert, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface DeathSaveOverlayProps {
  characterName: string;
  /** Called when the death save sequence ends (stabilized, nat 20, or dead). */
  onComplete: (result: DeathSaveResult) => void;
  /** Called to dismiss the overlay early. */
  onDismiss?: () => void;
}

export interface DeathSaveResult {
  outcome: 'stabilized' | 'dead' | 'revived';
  successes: number;
  failures: number;
  /** If revived by nat 20, character should get 1 HP */
  revivedHp?: number;
}

export function DeathSaveOverlay({
  characterName,
  onComplete,
  onDismiss,
}: DeathSaveOverlayProps) {
  const [successes, setSuccesses] = useState(0);
  const [failures, setFailures] = useState(0);
  const [rolling, setRolling] = useState(false);
  const [lastRoll, setLastRoll] = useState<number | null>(null);
  const [rollMessage, setRollMessage] = useState('');
  const [rollClass, setRollClass] = useState('');
  const [outcome, setOutcome] = useState<'stabilized' | 'dead' | 'revived' | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [animatingDie, setAnimatingDie] = useState(false);
  const rollCount = useRef(0);

  // Animated die face values during roll
  const [dieFace, setDieFace] = useState(20);

  const rollDeathSave = useCallback(() => {
    if (rolling || outcome) return;

    setRolling(true);
    setAnimatingDie(true);
    setLastRoll(null);
    setRollMessage('');
    setRollClass('');
    rollCount.current += 1;

    // Animate the die face rapidly
    const animInterval = setInterval(() => {
      setDieFace(Math.floor(Math.random() * 20) + 1);
    }, 60);

    // After animation, resolve the roll
    setTimeout(() => {
      clearInterval(animInterval);
      const roll = Math.floor(Math.random() * 20) + 1;
      setDieFace(roll);
      setLastRoll(roll);
      setAnimatingDie(false);

      let newSuccesses = successes;
      let newFailures = failures;
      let message = '';
      let cls = '';

      if (roll === 1) {
        // Nat 1: two failures
        newFailures = Math.min(3, failures + 2);
        message = 'Critical Failure — Two death marks!';
        cls = 'text-red-400';
      } else if (roll === 20) {
        // Nat 20: revive with 1 HP!
        message = 'NATURAL 20 — You cling to life!';
        cls = 'text-yellow-400';
        setRollMessage(message);
        setRollClass(cls);
        setRolling(false);
        setOutcome('revived');
        return;
      } else if (roll < 10) {
        newFailures = Math.min(3, failures + 1);
        message = 'Failure...';
        cls = 'text-red-400';
      } else {
        newSuccesses = Math.min(3, successes + 1);
        message = 'Success!';
        cls = 'text-green-400';
      }

      setSuccesses(newSuccesses);
      setFailures(newFailures);
      setRollMessage(message);
      setRollClass(cls);

      // Check for outcome
      if (newSuccesses >= 3) {
        setOutcome('stabilized');
      } else if (newFailures >= 3) {
        setOutcome('dead');
      }

      setRolling(false);
    }, 1200);
  }, [rolling, outcome, successes, failures]);

  // Show result screen after outcome is determined
  useEffect(() => {
    if (outcome) {
      const timer = setTimeout(() => setShowResult(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [outcome]);

  const handleFinish = useCallback(() => {
    onComplete({
      outcome: outcome!,
      successes,
      failures,
      revivedHp: outcome === 'revived' ? 1 : undefined,
    });
  }, [outcome, successes, failures, onComplete]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      {/* Backdrop */}
      <div className={cn(
        "absolute inset-0 transition-all duration-1000",
        outcome === 'dead'
          ? "bg-black/90"
          : outcome === 'revived'
            ? "bg-yellow-900/60 backdrop-blur-sm"
            : outcome === 'stabilized'
              ? "bg-green-950/60 backdrop-blur-sm"
              : "bg-black/80 backdrop-blur-sm"
      )} />

      {/* Dismiss button */}
      {onDismiss && !outcome && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 right-4 z-[61] text-muted-foreground hover:text-white"
          onClick={onDismiss}
        >
          <X className="w-5 h-5" />
        </Button>
      )}

      {/* Content */}
      <div className="relative z-[61] flex flex-col items-center gap-6 px-6 max-w-md text-center">
        {/* Title */}
        <div className="animate-fade-in">
          <Skull className={cn(
            "w-12 h-12 mx-auto mb-2 transition-colors duration-500",
            outcome === 'dead' ? "text-red-500" :
            outcome === 'revived' ? "text-yellow-400" :
            outcome === 'stabilized' ? "text-green-400" :
            "text-red-500/80"
          )} />
          <h2 className="text-2xl font-bold font-medieval tracking-wide text-white">
            {outcome === 'dead' ? `${characterName} Has Fallen` :
             outcome === 'revived' ? `${characterName} Rises!` :
             outcome === 'stabilized' ? `${characterName} is Stabilized` :
             `${characterName} is Dying`}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {!outcome && 'The thread between life and death grows thin...'}
          </p>
        </div>

        {/* Death Save Pips */}
        <div className="flex items-center gap-8">
          {/* Successes */}
          <div className="flex flex-col items-center gap-2">
            <span className="text-xs uppercase tracking-wider text-green-400 font-semibold">
              Saves
            </span>
            <div className="flex gap-2">
              {[0, 1, 2].map(i => (
                <div
                  key={`s-${i}`}
                  className={cn(
                    "w-5 h-5 rounded-full border-2 transition-all duration-500",
                    i < successes
                      ? "bg-green-500 border-green-400 shadow-lg shadow-green-500/50 scale-110"
                      : "border-muted-foreground/40"
                  )}
                />
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="w-px h-8 bg-muted-foreground/30" />

          {/* Failures */}
          <div className="flex flex-col items-center gap-2">
            <span className="text-xs uppercase tracking-wider text-red-400 font-semibold">
              Fails
            </span>
            <div className="flex gap-2">
              {[0, 1, 2].map(i => (
                <div
                  key={`f-${i}`}
                  className={cn(
                    "w-5 h-5 rounded-full border-2 transition-all duration-500",
                    i < failures
                      ? "bg-red-500 border-red-400 shadow-lg shadow-red-500/50 scale-110"
                      : "border-muted-foreground/40"
                  )}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Die Display */}
        <div className="relative">
          <div
            className={cn(
              "w-24 h-24 rounded-2xl border-2 flex items-center justify-center text-4xl font-bold transition-all duration-300",
              animatingDie && "animate-pulse border-primary/50 bg-primary/10 scale-105",
              !animatingDie && lastRoll === 20 && "border-yellow-400 bg-yellow-500/20 text-yellow-300 shadow-xl shadow-yellow-500/30",
              !animatingDie && lastRoll === 1 && "border-red-500 bg-red-500/20 text-red-400 shadow-xl shadow-red-500/30",
              !animatingDie && lastRoll && lastRoll > 1 && lastRoll < 10 && "border-red-400/50 bg-red-500/10 text-red-300",
              !animatingDie && lastRoll && lastRoll >= 10 && lastRoll < 20 && "border-green-400/50 bg-green-500/10 text-green-300",
              !lastRoll && !animatingDie && "border-muted-foreground/30 bg-muted/20 text-muted-foreground"
            )}
          >
            <span className={cn(animatingDie && "blur-[1px]")}>
              {lastRoll || dieFace}
            </span>
          </div>
          <span className="absolute -bottom-1 -right-1 text-xs bg-muted/80 rounded px-1.5 py-0.5 border border-border/50 text-muted-foreground">
            d20
          </span>
        </div>

        {/* Roll Message */}
        {rollMessage && (
          <p className={cn(
            "text-lg font-bold animate-fade-in",
            rollClass
          )}>
            {rollMessage}
          </p>
        )}

        {/* Roll Button or Result */}
        {!outcome ? (
          <Button
            onClick={rollDeathSave}
            disabled={rolling}
            size="lg"
            className={cn(
              "px-8 text-base shadow-lg",
              rolling && "opacity-50"
            )}
            variant="destructive"
          >
            {rolling ? (
              <>Rolling...</>
            ) : rollCount.current === 0 ? (
              <>
                <ShieldAlert className="w-5 h-5 mr-2" />
                Roll Death Save
              </>
            ) : (
              <>
                <ShieldAlert className="w-5 h-5 mr-2" />
                Roll Again
              </>
            )}
          </Button>
        ) : showResult ? (
          <div className="animate-fade-in space-y-4">
            {outcome === 'dead' && (
              <div className="space-y-2">
                <p className="text-red-400 text-lg font-bold">
                  The light fades from {characterName}&apos;s eyes...
                </p>
                <p className="text-sm text-muted-foreground">
                  Three failures. The character has perished.
                </p>
              </div>
            )}
            {outcome === 'stabilized' && (
              <div className="space-y-2">
                <p className="text-green-400 text-lg font-bold">
                  {characterName} stabilizes!
                </p>
                <p className="text-sm text-muted-foreground">
                  Three successes. Unconscious but no longer dying.
                </p>
              </div>
            )}
            {outcome === 'revived' && (
              <div className="space-y-2">
                <Heart className="w-8 h-8 text-yellow-400 mx-auto animate-pulse" />
                <p className="text-yellow-300 text-lg font-bold">
                  {characterName} surges back to life!
                </p>
                <p className="text-sm text-muted-foreground">
                  Natural 20! Restored to 1 HP.
                </p>
              </div>
            )}
            <Button onClick={handleFinish} size="lg" className="px-8">
              Continue
            </Button>
          </div>
        ) : (
          <p className="text-muted-foreground animate-pulse">
            Determining fate...
          </p>
        )}
      </div>
    </div>
  );
}
