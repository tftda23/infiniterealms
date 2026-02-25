import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import crypto from 'crypto';

// ============================================
// Style Utilities
// ============================================

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ============================================
// Security Utilities
// ============================================

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;

function getKey(salt: Buffer): Buffer {
  const secret = process.env.ENCRYPTION_KEY;
  if (!secret) {
    throw new Error('ENCRYPTION_KEY environment variable is not set.');
  }
  return crypto.pbkdf2Sync(secret, salt, 100000, KEY_LENGTH, 'sha512');
}

export function encrypt(text: string): string {
  if (!text) {
    return '';
  }

  const salt = crypto.randomBytes(SALT_LENGTH);
  const key = getKey(salt);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return Buffer.concat([salt, iv, tag, encrypted]).toString('hex');
}

export function decrypt(encryptedText: string): string {
  if (!encryptedText) {
    return '';
  }

  try {
    const data = Buffer.from(encryptedText, 'hex');
    const salt = data.subarray(0, SALT_LENGTH);
    const iv = data.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const tag = data.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
    const encrypted = data.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);

    const key = getKey(salt);
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString('utf8');
  } catch (error) {
    console.error('Decryption failed:', error);
    // Return empty string on failure to avoid leaking error details
    return '';
  }
}

// ============================================
// D&D Utilities
// ============================================

export function getAbilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

export function formatModifier(modifier: number): string {
  return modifier >= 0 ? `+${modifier}` : `${modifier}`;
}

export function getProficiencyBonus(level: number): number {
  return Math.ceil(level / 4) + 1;
}

export function calculateXpForLevel(level: number): number {
  const xpThresholds = [
    0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000,
    85000, 100000, 120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000
  ];
  return xpThresholds[Math.min(level - 1, 19)];
}

export function getLevelFromXp(xp: number): number {
  const xpThresholds = [
    0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000,
    85000, 100000, 120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000
  ];
  for (let i = 19; i >= 0; i--) {
    if (xp >= xpThresholds[i]) return i + 1;
  }
  return 1;
}

// ============================================
// Dice Rolling
// ============================================

export interface RollResult {
  notation: string;
  rolls: number[];
  modifier: number;
  total: number;
  criticalHit?: boolean;
  criticalMiss?: boolean;
}

export function rollDice(notation: string): RollResult {
  // Parse notation like "2d6+3", "1d20", "4d6kh3" (keep highest 3)
  const match = notation.toLowerCase().match(/^(\d+)?d(\d+)(kh(\d+)|kl(\d+))?([+-]\d+)?$/);

  if (!match) {
    throw new Error(`Invalid dice notation: ${notation}`);
  }

  const count = parseInt(match[1] || '1');
  const sides = parseInt(match[2]);
  const keepHighest = match[4] ? parseInt(match[4]) : null;
  const keepLowest = match[5] ? parseInt(match[5]) : null;
  const modifier = match[6] ? parseInt(match[6]) : 0;

  // Roll the dice
  let rolls: number[] = [];
  for (let i = 0; i < count; i++) {
    rolls.push(Math.floor(Math.random() * sides) + 1);
  }

  // Handle keep highest/lowest
  let keptRolls = [...rolls];
  if (keepHighest) {
    keptRolls = rolls.sort((a, b) => b - a).slice(0, keepHighest);
  } else if (keepLowest) {
    keptRolls = rolls.sort((a, b) => a - b).slice(0, keepLowest);
  }

  const sum = keptRolls.reduce((a, b) => a + b, 0);
  const total = sum + modifier;

  return {
    notation,
    rolls,
    modifier,
    total,
    criticalHit: sides === 20 && count === 1 && rolls[0] === 20,
    criticalMiss: sides === 20 && count === 1 && rolls[0] === 1,
  };
}

export function rollWithAdvantage(): RollResult {
  const roll1 = Math.floor(Math.random() * 20) + 1;
  const roll2 = Math.floor(Math.random() * 20) + 1;
  const higher = Math.max(roll1, roll2);

  return {
    notation: '2d20kh1 (advantage)',
    rolls: [roll1, roll2],
    modifier: 0,
    total: higher,
    criticalHit: higher === 20,
    criticalMiss: higher === 1,
  };
}

export function rollWithDisadvantage(): RollResult {
  const roll1 = Math.floor(Math.random() * 20) + 1;
  const roll2 = Math.floor(Math.random() * 20) + 1;
  const lower = Math.min(roll1, roll2);

  return {
    notation: '2d20kl1 (disadvantage)',
    rolls: [roll1, roll2],
    modifier: 0,
    total: lower,
    criticalHit: lower === 20,
    criticalMiss: lower === 1,
  };
}

// ============================================
// Formatting Utilities
// ============================================

export function formatGold(copperPieces: number): string {
  const gold = Math.floor(copperPieces / 100);
  const silver = Math.floor((copperPieces % 100) / 10);
  const copper = copperPieces % 10;

  const parts = [];
  if (gold > 0) parts.push(`${gold} gp`);
  if (silver > 0) parts.push(`${silver} sp`);
  if (copper > 0 || parts.length === 0) parts.push(`${copper} cp`);

  return parts.join(', ');
}

export function formatWeight(pounds: number): string {
  return `${pounds} lb${pounds !== 1 ? 's' : ''}`;
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length - 3) + '...';
}

// ============================================
// ID Generation
// ============================================

export function generateId(): string {
  return crypto.randomUUID();
}

// ============================================
// Date Utilities
// ============================================

export function formatRelativeTime(date: Date | string): string {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return then.toLocaleDateString();
}

// ============================================
// Validation
// ============================================

export function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}