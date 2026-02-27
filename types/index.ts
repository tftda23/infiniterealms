// ============================================
// Core D&D Types
// ============================================

export interface AbilityScores {
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
}

export interface SavingThrows {
  strength: boolean;
  dexterity: boolean;
  constitution: boolean;
  intelligence: boolean;
  wisdom: boolean;
  charisma: boolean;
}

export interface Skills {
  acrobatics: boolean;
  animalHandling: boolean;
  arcana: boolean;
  athletics: boolean;
  deception: boolean;
  history: boolean;
  insight: boolean;
  intimidation: boolean;
  investigation: boolean;
  medicine: boolean;
  nature: boolean;
  perception: boolean;
  performance: boolean;
  persuasion: boolean;
  religion: boolean;
  sleightOfHand: boolean;
  stealth: boolean;
  survival: boolean;
}

export interface Character {
  id: string;
  campaignId: string;
  name: string;
  race: string;
  class: string;
  subclass?: string;
  level: number;
  background: string;
  alignment: string;
  experience: number;

  // Stats
  abilityScores: AbilityScores;
  maxHp: number;
  currentHp: number;
  tempHp: number;
  armorClass: number;
  initiative: number;
  speed: number;
  proficiencyBonus: number;

  // Proficiencies
  savingThrows: SavingThrows;
  skills: Skills;

  // Resources
  hitDice: string;
  hitDiceRemaining: number;
  deathSaves: { successes: number; failures: number };

  // Spellcasting (optional)
  spellcastingAbility?: string;
  spellSaveDC?: number;
  spellAttackBonus?: number;
  spellSlots?: Record<number, { max: number; used: number }>;

  // D&D Beyond sync
  dndbeyondId?: string;
  dndbeyondUrl?: string;
  lastSyncedAt?: Date;
  syncEnabled: boolean;

  // Meta
  portraitUrl?: string;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface InventoryItem {
  id: string;
  characterId: string;
  name: string;
  type: 'weapon' | 'armor' | 'potion' | 'scroll' | 'wondrous' | 'gear' | 'treasure' | 'other';
  quantity: number;
  weight: number;
  value: number; // in copper pieces
  description: string;
  equipped: boolean;
  attuned: boolean;
  requiresAttunement: boolean;
  magical: boolean;
  rarity?: 'common' | 'uncommon' | 'rare' | 'very_rare' | 'legendary' | 'artifact';
  properties?: string[];
  createdAt: Date;
}

export interface Spell {
  id: string;
  characterId: string;
  name: string;
  level: number;
  school: string;
  castingTime: string;
  range: string;
  components: string;
  duration: string;
  description: string;
  prepared: boolean;
  ritual: boolean;
  concentration: boolean;
}

// ============================================
// Campaign & Game State Types
// ============================================

export interface Campaign {
  id: string;
  name: string;
  description: string;
  worldSetting: string;
  currentScene: string;
  currentLocation: string;
  themes: string[];
  difficultyLevel: 'easy' | 'normal' | 'hard' | 'deadly';
  rulesEnforcement: 'strict' | 'moderate' | 'loose';

  // World state
  npcs: NPC[];
  quests: Quest[];
  locations: Location[];
  factions: Faction[];

  // Session tracking
  sessionCount: number;
  totalPlaytime: number; // minutes

  // AI settings
  dmPersonality: string;
  aiModel?: string;

  createdAt: Date;
  updatedAt: Date;
  lastPlayedAt: Date;
}

export interface NPC {
  id: string;
  name: string;
  race: string;
  occupation: string;
  location: string;
  disposition: 'friendly' | 'neutral' | 'hostile' | 'unknown';
  description: string;
  notes: string;
  isAlive: boolean;
  firstMetAt?: Date;
}

export interface Quest {
  id: string;
  name: string;
  description: string;
  giverNpcId?: string;
  status: 'available' | 'active' | 'completed' | 'failed' | 'abandoned';
  objectives: QuestObjective[];
  rewards: string;
  priority: 'main' | 'side' | 'personal';
  createdAt: Date;
  completedAt?: Date;
}

export interface QuestObjective {
  id: string;
  description: string;
  completed: boolean;
  optional: boolean;
}

export interface Location {
  id: string;
  name: string;
  type: 'city' | 'town' | 'village' | 'dungeon' | 'wilderness' | 'building' | 'landmark';
  description: string;
  discovered: boolean;
  visited: boolean;
  notes: string;
  connectedTo: string[];
}

export interface Faction {
  id: string;
  name: string;
  description: string;
  reputation: number; // -100 to 100
  leader?: string;
  headquarters?: string;
}

export interface GameState {
  id: string;
  campaignId: string;

  // Combat state
  inCombat: boolean;
  initiativeOrder: InitiativeEntry[];
  currentTurn: number;
  round: number;

  // Environment
  currentScene: string;
  currentSceneImageUrl?: string;
  timeOfDay: 'dawn' | 'morning' | 'midday' | 'afternoon' | 'evening' | 'night';
  weather: string;

  // Party resources
  partyGold: number;
  partyInventory: InventoryItem[];

  // XP tracker state (persisted for diminishing returns)
  xpTracker?: {
    categoryCounts: Record<string, number>;
    encountersSinceStoryBeat: number;
    lastStoryProgressionAt: number;
    sessionXP: number;
  };

  updatedAt: Date;
}

export interface InitiativeEntry {
  id: string;
  name: string;
  initiative: number;
  isPlayer: boolean;
  characterId?: string;
  hp?: number;
  maxHp?: number;
  ac?: number; // Armor Class — used by npcAction tool for hit/miss resolution
  dexMod?: number; // DEX modifier for initiative tie-breaking (NPCs/enemies)
  conditions: string[];
  deathSaves?: { successes: number; failures: number };
  // Legacy grid fields (unused in Theater of the Mind mode)
  x?: number;
  y?: number;
  speed?: number;
}

// ============================================
// Chat & Session Types
// ============================================

export type MessageRole = 'user' | 'assistant' | 'system' | 'tool';

// Chat mode determines how messages are sent
export type ChatMode = 'character' | 'whisper';

export interface ChatContext {
  mode: ChatMode;
  characterId?: string;
  characterName?: string;
}

export interface ChatMessage {
  id: string;
  campaignId: string;
  role: MessageRole;
  content: string;

  // Character context for user messages
  characterId?: string;
  characterName?: string;
  isWhisper?: boolean; // True if this is a meta/OOC message to the DM

  // Tool calls (for AI function calling)
  toolCalls?: ToolCall[];
  tool_call_id?: string; // For tool responses
  toolResults?: ToolResult[];

  // Metadata
  diceRolls?: DiceRoll[];
  sceneChange?: boolean;
  timestamp: Date;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface ToolResult {
  toolCallId: string;
  result: unknown;
}

export interface DiceRoll {
  notation: string;
  rolls: number[];
  modifier: number;
  total: number;
  type: 'attack' | 'damage' | 'saving_throw' | 'ability_check' | 'initiative' | 'other';
  advantage?: boolean;
  disadvantage?: boolean;
}

export interface SessionLog {
  id: string;
  campaignId: string;
  sessionNumber: number;
  startedAt: Date;
  endedAt?: Date;
  summary?: string;
  highlights: string[];
  messageCount: number;
}

export interface RuleViolation {
  id: string;
  campaignId: string;
  messageId?: string;
  type: 'combat' | 'spell' | 'ability' | 'item' | 'other';
  description: string;
  severity: 'info' | 'warning' | 'error';
  resolved: boolean;
  timestamp: Date;
}

// ============================================
// Scene & Image Generation Types
// ============================================

export type SceneTheme =
  | 'tavern' | 'forest' | 'dungeon' | 'castle' | 'cave'
  | 'village' | 'city' | 'battlefield' | 'temple' | 'ruins'
  | 'mountain' | 'swamp' | 'desert' | 'ocean' | 'underground'
  | 'library' | 'throne_room' | 'marketplace' | 'graveyard' | 'portal';

export interface SceneImageRequest {
  campaignId: string;
  description: string;
  theme: SceneTheme;
  timeOfDay: string;
  weather?: string;
  characters?: string[];
  mood?: string;
}

// ============================================
// API Types
// ============================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  pageSize: number;
}

// ============================================
// AI Provider Types
// ============================================

export type AIProvider = 'openai' | 'anthropic' | 'gemini' | 'deepseek' | 'openrouter';

export interface AIProviderConfig {
  id: AIProvider;
  name: string;
  description: string;
  baseUrl: string;
  models: AIModel[];
  requiresApiKey: boolean;
  apiKeyEnvVar: string;
  supportsStreaming: boolean;
  isOpenAICompatible: boolean;
  docsUrl?: string;
}

export interface AIModel {
  id: string;
  name: string;
  description: string;
  contextWindow: number;
  maxOutput: number;
  inputPricePerMillion: number;  // USD per 1M tokens
  outputPricePerMillion: number; // USD per 1M tokens
  supportsStreaming: boolean;
  recommended?: boolean;
  supportsToolUse?: boolean;
}

export interface AISettings {
  defaultProvider: AIProvider;
  defaultModel: string;
  apiKeys: Partial<Record<AIProvider, string>>;
  temperature: number;
  maxTokens: number;
  globalPrompt?: string;
  autoFallback?: boolean;
  fallbackOrder?: AIProvider[];
  // Image generation settings
  imageProvider?: 'openai' | 'none';
  imageModel?: string;
  // Image storage settings
  imageStoragePath?: string; // Custom storage path, defaults to './public/images'
}

// ============================================
// D&D Beyond Integration Types
// ============================================

export interface DndBeyondCharacter {
  id: number;
  name: string;
  avatarUrl?: string;
  race: { fullName: string };
  classes: Array<{ definition: { name: string }; level: number; subclassDefinition?: { name: string } }>;
  stats: Array<{ id: number; value: number }>;
  baseHitPoints: number;
  bonusHitPoints: number;
  temporaryHitPoints: number;
  removedHitPoints: number;
  background?: { definition?: { name: string } };
  alignment?: string;
  currentXp: number;
}

export interface DndBeyondSyncResult {
  success: boolean;
  character?: Partial<Character>;
  changes?: string[];
  error?: string;
}

// ============================================
// Campaign Content Types
// ============================================

export type ContentType = 'text' | 'pdf' | 'url' | 'api';

export type ContentCategory = 'lore' | 'rules' | 'locations' | 'npcs' | 'items' | 'monsters' | 'other';

export interface CampaignContent {
  id: string;
  campaignId: string;
  name: string;
  type: ContentType;
  content: string;
  summary?: string;
  source?: string;
  category: ContentCategory;
  isHidden: boolean;
  createdAt: Date;
  updatedAt: Date;
}
