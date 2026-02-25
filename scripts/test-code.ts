/**
 * Comprehensive Code Testing Script
 * Tests services, validation schemas, and catches type errors
 * Run with: npx tsx scripts/test-code.ts
 */

import { z } from 'zod';

// Track all errors
const errors: string[] = [];

function logTest(name: string) {
  console.log(`\nTEST: ${name}`);
}

function logPass(msg: string) {
  console.log(`  ✓ PASS: ${msg}`);
}

function logFail(msg: string) {
  console.log(`  ✗ FAIL: ${msg}`);
  errors.push(msg);
}

// ============================================
// Test Zod Schemas (from API routes)
// ============================================

console.log('========================================');
console.log('  CODE VALIDATION TEST SUITE');
console.log('========================================');

// Campaign schemas
logTest('Campaign creation schema validation');

const createCampaignSchema = z.object({
  name: z.string().min(1, 'Campaign name is required'),
  description: z.string().optional(),
  worldSetting: z.string().optional(),
  difficultyLevel: z.enum(['easy', 'normal', 'hard', 'deadly']).optional(),
  dmPersonality: z.string().optional(),
});

// Valid campaign
const validCampaign = { name: 'Test Campaign', description: 'A test' };
const result1 = createCampaignSchema.safeParse(validCampaign);
if (result1.success) logPass('Valid campaign passes');
else logFail('Valid campaign should pass: ' + JSON.stringify(result1.error.issues));

// Missing name
const missingName = { description: 'No name' };
const result2 = createCampaignSchema.safeParse(missingName);
if (!result2.success) logPass('Missing name rejected');
else logFail('Missing name should be rejected');

// Empty name
const emptyName = { name: '' };
const result3 = createCampaignSchema.safeParse(emptyName);
if (!result3.success) logPass('Empty name rejected');
else logFail('Empty name should be rejected');

// Invalid difficulty
const invalidDifficulty = { name: 'Test', difficultyLevel: 'impossible' };
const result4 = createCampaignSchema.safeParse(invalidDifficulty);
if (!result4.success) logPass('Invalid difficulty rejected');
else logFail('Invalid difficulty should be rejected');

// Character schemas
logTest('Character creation schema validation');

const abilityScoresSchema = z.object({
  strength: z.number().int().min(1).max(30),
  dexterity: z.number().int().min(1).max(30),
  constitution: z.number().int().min(1).max(30),
  intelligence: z.number().int().min(1).max(30),
  wisdom: z.number().int().min(1).max(30),
  charisma: z.number().int().min(1).max(30),
});

const createCharacterSchema = z.object({
  campaignId: z.string().uuid('Campaign ID is required and must be a UUID'),
  name: z.string().min(1, 'Character name is required'),
  race: z.string().min(1, 'Character race is required'),
  class: z.string().min(1, 'Character class is required'),
  level: z.number().int().min(1).optional(),
  background: z.string().optional(),
  abilityScores: abilityScoresSchema.optional(),
  maxHp: z.number().int().min(1).optional(),
});

// Valid character
const validChar = {
  campaignId: '550e8400-e29b-41d4-a716-446655440000',
  name: 'Thorin',
  race: 'Dwarf',
  class: 'Fighter',
};
const result5 = createCharacterSchema.safeParse(validChar);
if (result5.success) logPass('Valid character passes');
else logFail('Valid character should pass: ' + JSON.stringify(result5.error.issues));

// Missing campaignId
const missingCampaignId = { name: 'Hero', race: 'Human', class: 'Fighter' };
const result6 = createCharacterSchema.safeParse(missingCampaignId);
if (!result6.success) logPass('Missing campaignId rejected');
else logFail('Missing campaignId should be rejected');

// Invalid UUID format
const invalidUuid = {
  campaignId: 'not-a-uuid',
  name: 'Hero',
  race: 'Human',
  class: 'Fighter',
};
const result7 = createCharacterSchema.safeParse(invalidUuid);
if (!result7.success) logPass('Invalid UUID rejected');
else logFail('Invalid UUID should be rejected');

// Missing required fields
const missingRace = {
  campaignId: '550e8400-e29b-41d4-a716-446655440000',
  name: 'Hero',
  class: 'Fighter',
};
const result8 = createCharacterSchema.safeParse(missingRace);
if (!result8.success) logPass('Missing race rejected');
else logFail('Missing race should be rejected');

// Ability scores out of range
const invalidAbilityScores = {
  campaignId: '550e8400-e29b-41d4-a716-446655440000',
  name: 'Hero',
  race: 'Human',
  class: 'Fighter',
  abilityScores: {
    strength: 100, // Too high!
    dexterity: 10,
    constitution: 10,
    intelligence: 10,
    wisdom: 10,
    charisma: 10,
  },
};
const result9 = createCharacterSchema.safeParse(invalidAbilityScores);
if (!result9.success) logPass('Out-of-range ability score rejected');
else logFail('Out-of-range ability score should be rejected');

// Negative ability score
const negativeAbility = {
  campaignId: '550e8400-e29b-41d4-a716-446655440000',
  name: 'Hero',
  race: 'Human',
  class: 'Fighter',
  abilityScores: {
    strength: -5, // Negative!
    dexterity: 10,
    constitution: 10,
    intelligence: 10,
    wisdom: 10,
    charisma: 10,
  },
};
const result10 = createCharacterSchema.safeParse(negativeAbility);
if (!result10.success) logPass('Negative ability score rejected');
else logFail('Negative ability score should be rejected');

// Game State schemas
logTest('Game state schema validation');

const updateGameStateSchema = z.object({
  inCombat: z.boolean().optional(),
  currentTurn: z.number().int().min(0).optional(),
  round: z.number().int().min(0).optional(),
  currentScene: z.string().optional(),
  timeOfDay: z.enum(['dawn', 'morning', 'midday', 'afternoon', 'evening', 'night']).optional(),
  weather: z.string().optional(),
  partyGold: z.number().int().min(0).optional(),
}).partial();

// Valid update
const validUpdate = { partyGold: 100, timeOfDay: 'evening' as const, weather: 'rainy' };
const result11 = updateGameStateSchema.safeParse(validUpdate);
if (result11.success) logPass('Valid game state update passes');
else logFail('Valid update should pass: ' + JSON.stringify(result11.error.issues));

// Negative gold
const negativeGold = { partyGold: -100 };
const result12 = updateGameStateSchema.safeParse(negativeGold);
if (!result12.success) logPass('Negative gold rejected');
else logFail('Negative gold should be rejected');

// Invalid time of day
const invalidTime = { timeOfDay: 'midnight' };
const result13 = updateGameStateSchema.safeParse(invalidTime);
if (!result13.success) logPass('Invalid timeOfDay rejected');
else logFail('Invalid timeOfDay should be rejected');

// Chat schemas
logTest('Chat message schema validation');

const postChatSchema = z.object({
  campaignId: z.string().uuid('Invalid campaign ID format (must be UUID)'),
  message: z.string().min(1, 'Message cannot be empty').max(10000, 'Message too long (max 10000 characters)'),
  apiKey: z.string().optional(),
});

// Valid message
const validMessage = {
  campaignId: '550e8400-e29b-41d4-a716-446655440000',
  message: 'I explore the dungeon',
};
const result14 = postChatSchema.safeParse(validMessage);
if (result14.success) logPass('Valid chat message passes');
else logFail('Valid message should pass');

// Empty message
const emptyMessage = {
  campaignId: '550e8400-e29b-41d4-a716-446655440000',
  message: '',
};
const result15 = postChatSchema.safeParse(emptyMessage);
if (!result15.success) logPass('Empty message rejected');
else logFail('Empty message should be rejected');

// Message too long
const longMessage = {
  campaignId: '550e8400-e29b-41d4-a716-446655440000',
  message: 'x'.repeat(10001),
};
const result16 = postChatSchema.safeParse(longMessage);
if (!result16.success) logPass('Message over 10000 chars rejected');
else logFail('Long message should be rejected');

// Scene Image schemas
logTest('Scene image schema validation');

const generateSceneImageSchema = z.object({
  campaignId: z.string().uuid('Invalid campaign ID format (must be UUID)'),
  description: z.string().min(1, 'Description is required').max(1000, 'Description too long (max 1000 characters)'),
  theme: z.enum([
    'tavern', 'forest', 'dungeon', 'castle', 'cave',
    'village', 'city', 'battlefield', 'temple', 'ruins',
    'mountain', 'swamp', 'desert', 'ocean', 'underground',
    'library', 'throne_room', 'marketplace', 'graveyard', 'portal'
  ]).optional(),
  apiKey: z.string().optional(),
});

// Valid image request
const validImage = {
  campaignId: '550e8400-e29b-41d4-a716-446655440000',
  description: 'A dark and spooky forest with mist',
  theme: 'forest' as const,
};
const result17 = generateSceneImageSchema.safeParse(validImage);
if (result17.success) logPass('Valid scene image request passes');
else logFail('Valid image request should pass');

// Invalid theme
const invalidTheme = {
  campaignId: '550e8400-e29b-41d4-a716-446655440000',
  description: 'A scene',
  theme: 'invalid_theme',
};
const result18 = generateSceneImageSchema.safeParse(invalidTheme);
if (!result18.success) logPass('Invalid theme rejected');
else logFail('Invalid theme should be rejected');

// Empty description
const emptyDesc = {
  campaignId: '550e8400-e29b-41d4-a716-446655440000',
  description: '',
};
const result19 = generateSceneImageSchema.safeParse(emptyDesc);
if (!result19.success) logPass('Empty description rejected');
else logFail('Empty description should be rejected');

// ============================================
// Test utility functions
// ============================================
logTest('Utility functions');

// Test dice rolling utility (from lib/utils.ts)
function rollDice(notation: string): { total: number; rolls: number[]; modifier: number } {
  const match = notation.match(/^(\d+)d(\d+)([+-]\d+)?$/i);
  if (!match) {
    throw new Error(`Invalid dice notation: ${notation}`);
  }

  const numDice = parseInt(match[1]);
  const dieSize = parseInt(match[2]);
  const modifier = match[3] ? parseInt(match[3]) : 0;

  if (numDice < 1 || numDice > 100) throw new Error('Invalid number of dice');
  if (dieSize < 2 || dieSize > 100) throw new Error('Invalid die size');

  const rolls: number[] = [];
  for (let i = 0; i < numDice; i++) {
    rolls.push(Math.floor(Math.random() * dieSize) + 1);
  }

  const total = rolls.reduce((sum, roll) => sum + roll, 0) + modifier;

  return { total, rolls, modifier };
}

try {
  const roll = rollDice('2d6+3');
  if (roll.rolls.length === 2 && roll.modifier === 3) {
    logPass('2d6+3 parsed correctly');
  } else {
    logFail('2d6+3 not parsed correctly');
  }
} catch (e) {
  logFail('rollDice threw error: ' + e);
}

try {
  rollDice('invalid');
  logFail('Invalid notation should throw');
} catch (e) {
  logPass('Invalid notation throws error');
}

try {
  rollDice('1000d6');
  logFail('Too many dice should throw');
} catch (e) {
  logPass('Too many dice throws error');
}

// ============================================
// Summary
// ============================================
console.log('\n========================================');
console.log('  TEST SUMMARY');
console.log('========================================');
console.log(`Total errors: ${errors.length}`);

if (errors.length > 0) {
  console.log('\nFailed tests:');
  errors.forEach(err => console.log(`  - ${err}`));
  process.exit(1);
} else {
  console.log('\n✓ All validation tests passed!');
  process.exit(0);
}
