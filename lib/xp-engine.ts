/**
 * XP Engine — D&D 5e experience system with anti-grind diminishing returns.
 *
 * Core principles:
 *   1. Standard 5e XP thresholds for leveling
 *   2. XP awarded for encounters, puzzles, quests, roleplay, exploration, story milestones
 *   3. Diminishing returns: repeating the same activity category without story progress yields less XP
 *   4. Story milestone multiplier: progressing quests/story resets the diminishing returns
 */

// ─── 5e XP Thresholds ────────────────────────────────────────────
export const XP_THRESHOLDS: Record<number, number> = {
  1: 0,
  2: 300,
  3: 900,
  4: 2700,
  5: 6500,
  6: 14000,
  7: 23000,
  8: 34000,
  9: 48000,
  10: 64000,
  11: 85000,
  12: 100000,
  13: 120000,
  14: 140000,
  15: 165000,
  16: 195000,
  17: 225000,
  18: 265000,
  19: 305000,
  20: 355000,
};

// ─── XP Event Categories ─────────────────────────────────────────
export type XPCategory =
  | 'combat'        // Defeating enemies
  | 'puzzle'        // Solving puzzles/traps
  | 'quest'         // Completing quest objectives
  | 'roleplay'      // Good roleplay moments
  | 'exploration'   // Discovering new areas
  | 'milestone'     // Major story milestones
  | 'skillCheck';   // Overcoming challenges via skill

// ─── XP Award Scale ──────────────────────────────────────────────
// Base XP for each category at character level 1, scaled by level
export const BASE_XP_AWARDS: Record<XPCategory, { min: number; max: number }> = {
  combat:      { min: 25,  max: 200 },   // per enemy CR-scaled
  puzzle:      { min: 50,  max: 150 },
  quest:       { min: 100, max: 500 },
  roleplay:    { min: 15,  max: 75 },
  exploration: { min: 25,  max: 100 },
  milestone:   { min: 200, max: 1000 },
  skillCheck:  { min: 10,  max: 50 },
};

// ─── Diminishing Returns Tracker ─────────────────────────────────
export interface XPTracker {
  /** How many times each category has been triggered since last story progression */
  categoryCounts: Record<XPCategory, number>;
  /** Total encounters since last story beat */
  encountersSinceStoryBeat: number;
  /** Last story event timestamp */
  lastStoryProgressionAt: number;
  /** Total XP awarded this session (for session summary) */
  sessionXP: number;
}

export function createXPTracker(): XPTracker {
  return {
    categoryCounts: {
      combat: 0,
      puzzle: 0,
      quest: 0,
      roleplay: 0,
      exploration: 0,
      milestone: 0,
      skillCheck: 0,
    },
    encountersSinceStoryBeat: 0,
    lastStoryProgressionAt: Date.now(),
    sessionXP: 0,
  };
}

// ─── Diminishing Returns Multiplier ──────────────────────────────
// After N repeats of the same category without story progression,
// XP received for that category decreases.
//
// Repeat 1 = 100%, 2 = 80%, 3 = 60%, 4 = 40%, 5+ = 25% (floor)
//
// Story progression (quest/milestone) resets ALL category counts.
function getDiminishingMultiplier(repeatCount: number): number {
  if (repeatCount <= 1) return 1.0;
  if (repeatCount === 2) return 0.80;
  if (repeatCount === 3) return 0.60;
  if (repeatCount === 4) return 0.40;
  return 0.25; // Floor — you always get something
}

// ─── Story Stagnation Penalty ────────────────────────────────────
// If the player hasn't hit a story beat (quest/milestone) in a while,
// all non-story XP gets an additional penalty.
// 0-5 encounters: no penalty
// 6-10 encounters: 80%
// 11-15: 60%
// 16+: 40%
function getStagnationMultiplier(encountersSinceStoryBeat: number): number {
  if (encountersSinceStoryBeat <= 5) return 1.0;
  if (encountersSinceStoryBeat <= 10) return 0.80;
  if (encountersSinceStoryBeat <= 15) return 0.60;
  return 0.40;
}

// ─── Level-Scaled XP ─────────────────────────────────────────────
// Scale base XP by character level so higher-level characters get
// proportionally more XP (but thresholds also rise).
function getLevelScaler(level: number): number {
  if (level <= 3) return 1.0;
  if (level <= 6) return 1.5;
  if (level <= 10) return 2.0;
  if (level <= 15) return 3.0;
  return 4.0;
}

// ─── Enemy CR to XP ─────────────────────────────────────────────
const CR_XP_TABLE: Record<string, number> = {
  '0': 10, '1/8': 25, '1/4': 50, '1/2': 100,
  '1': 200, '2': 450, '3': 700, '4': 1100,
  '5': 1800, '6': 2300, '7': 2900, '8': 3900,
  '9': 5000, '10': 5900, '11': 7200, '12': 8400,
  '13': 10000, '14': 11500, '15': 13000, '16': 15000,
  '17': 18000, '18': 20000, '19': 22000, '20': 25000,
};

export function getXPForCR(cr: string | number): number {
  const key = String(cr);
  return CR_XP_TABLE[key] || 100; // Default 100 if unknown
}

// ─── Core XP Award Function ──────────────────────────────────────
export interface XPAwardResult {
  baseXP: number;
  diminishingMultiplier: number;
  stagnationMultiplier: number;
  levelScaler: number;
  finalXP: number;
  /** Human-readable explanation */
  breakdown: string;
  /** Whether this triggered a level up */
  levelUp: boolean;
  /** New level after award (if leveled) */
  newLevel: number;
  /** Current total XP after award */
  newTotalXP: number;
}

export function awardXP(
  category: XPCategory,
  rawAmount: number,
  characterLevel: number,
  currentXP: number,
  tracker: XPTracker,
): XPAwardResult {
  // Increment category count
  tracker.categoryCounts[category]++;
  tracker.encountersSinceStoryBeat++;

  // Story events reset diminishing returns
  const isStoryEvent = category === 'quest' || category === 'milestone';
  if (isStoryEvent) {
    // Reset ALL category counts — story progress refreshes the grind meter
    for (const cat of Object.keys(tracker.categoryCounts) as XPCategory[]) {
      tracker.categoryCounts[cat] = 0;
    }
    tracker.encountersSinceStoryBeat = 0;
    tracker.lastStoryProgressionAt = Date.now();
  }

  const repeatCount = tracker.categoryCounts[category];
  const dimMult = getDiminishingMultiplier(repeatCount);

  // Story events are immune to stagnation penalty
  const stagMult = isStoryEvent ? 1.0 : getStagnationMultiplier(tracker.encountersSinceStoryBeat);

  const lvlScaler = getLevelScaler(characterLevel);

  // Calculate final XP
  const baseXP = Math.round(rawAmount * lvlScaler);
  const finalXP = Math.max(1, Math.round(baseXP * dimMult * stagMult));

  const newTotalXP = currentXP + finalXP;

  // Check level up
  const currentLevelThreshold = XP_THRESHOLDS[characterLevel] || 0;
  const nextLevel = characterLevel + 1;
  const nextLevelThreshold = XP_THRESHOLDS[nextLevel] || Infinity;
  const levelUp = characterLevel < 20 && newTotalXP >= nextLevelThreshold;
  const newLevel = levelUp ? nextLevel : characterLevel;

  // Track session XP
  tracker.sessionXP += finalXP;

  // Build breakdown string
  const parts: string[] = [];
  parts.push(`${rawAmount} base`);
  if (lvlScaler !== 1.0) parts.push(`×${lvlScaler} level`);
  if (dimMult < 1.0) parts.push(`×${dimMult} (repeated activity)`);
  if (stagMult < 1.0) parts.push(`×${stagMult} (story stagnation)`);

  return {
    baseXP,
    diminishingMultiplier: dimMult,
    stagnationMultiplier: stagMult,
    levelScaler: lvlScaler,
    finalXP,
    breakdown: parts.join(' '),
    levelUp,
    newLevel,
    newTotalXP,
  };
}

// ─── Helper: XP to Next Level ────────────────────────────────────
export function xpToNextLevel(currentXP: number, currentLevel: number): {
  current: number;
  needed: number;
  percent: number;
  remaining: number;
} {
  if (currentLevel >= 20) {
    return { current: currentXP, needed: 0, percent: 100, remaining: 0 };
  }
  const currentThreshold = XP_THRESHOLDS[currentLevel] || 0;
  const nextThreshold = XP_THRESHOLDS[currentLevel + 1] || currentXP;
  const levelRange = nextThreshold - currentThreshold;
  const progress = currentXP - currentThreshold;
  const percent = levelRange > 0 ? Math.min(100, Math.round((progress / levelRange) * 100)) : 100;
  const remaining = Math.max(0, nextThreshold - currentXP);

  return { current: currentXP, needed: nextThreshold, percent, remaining };
}

// ─── Helper: Suggest XP for encounter based on enemies ───────────
export function suggestCombatXP(enemyNames: string[], partySize: number): number {
  // Simple estimation: each enemy name is worth 50-150 XP base
  // In a real implementation, this would look up CR from a monster database
  const ROUGH_ENEMY_XP: Record<string, number> = {
    goblin: 50, wolf: 50, rat: 25, skeleton: 50, zombie: 50,
    orc: 100, bandit: 100, gnoll: 100,
    ogre: 200, troll: 450, owlbear: 200,
    dragon: 1000, beholder: 5000,
  };

  let totalXP = 0;
  for (const name of enemyNames) {
    const lower = name.toLowerCase();
    const key = Object.keys(ROUGH_ENEMY_XP).find(k => lower.includes(k));
    totalXP += key ? ROUGH_ENEMY_XP[key] : 75; // Default 75 per unknown enemy
  }

  // Divide among party (5e style)
  return Math.max(10, Math.round(totalXP / Math.max(1, partySize)));
}

// ─── Category Labels for UI ──────────────────────────────────────
export const XP_CATEGORY_LABELS: Record<XPCategory, { label: string; icon: string; color: string }> = {
  combat:      { label: 'Combat Victory',  icon: '⚔️', color: 'text-red-400' },
  puzzle:      { label: 'Puzzle Solved',   icon: '🧩', color: 'text-purple-400' },
  quest:       { label: 'Quest Progress',  icon: '📜', color: 'text-yellow-400' },
  roleplay:    { label: 'Roleplay',        icon: '🎭', color: 'text-blue-400' },
  exploration: { label: 'Discovery',       icon: '🗺️', color: 'text-green-400' },
  milestone:   { label: 'Story Milestone', icon: '⭐', color: 'text-amber-400' },
  skillCheck:  { label: 'Skill Challenge', icon: '🎯', color: 'text-cyan-400' },
};
