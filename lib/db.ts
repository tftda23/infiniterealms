import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';

// ============================================
// Database Connection Pool
// ============================================

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/dndsolo',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

// ============================================
// Query Helpers
// ============================================

// Add imports for necessary types if needed, although Error and Promise are built-in
// import { DatabaseError } from 'pg'; // If we want to check for specific pg errors

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 500; // 500ms

export async function query<T extends Record<string, any> = Record<string, any>>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  const start = Date.now();

  for (let i = 0; i <= MAX_RETRIES; i++) {
    try {
      const result = await pool.query<T>(text, params);
      const duration = Date.now() - start;
      if (process.env.NODE_ENV === 'development') {
        console.log('Executed query', { text: text.substring(0, 50), duration, rows: result.rowCount });
      }
      return result;
    } catch (error: any) {
      console.error(`Query error (attempt ${i + 1}/${MAX_RETRIES + 1}):`, { text: text.substring(0, 100), error });

      // Check if it's a retriable connection error
      // In a real application, you might want to check for specific error codes
      // e.g., if (error.code === 'ECONNREFUSED' || error.code === '57P01')
      const isRetriable = error && (error.code === 'ECONNREFUSED' || error.code === '57P01' || error.code === '57P03'); // Example codes

      if (isRetriable && i < MAX_RETRIES) {
        console.log(`Retrying query after ${RETRY_DELAY_MS}ms...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
        continue; // Continue to the next retry attempt
      } else {
        throw error; // Re-throw non-retriable errors or if max retries reached
      }
    }
  }
  // This line should technically be unreachable, but good for completeness
  throw new Error('Max retries reached without successful query.');
}

export async function getClient(): Promise<PoolClient> {
  return pool.connect();
}

export async function transaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// ============================================
// Health Check
// ============================================

export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await query('SELECT 1');
    return true;
  } catch {
    return false;
  }
}

// ============================================
// Schema Setup
// ============================================

export const SCHEMA = `
-- Campaigns table
CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT DEFAULT '',
  world_setting TEXT DEFAULT 'Generic Fantasy',
  current_scene TEXT DEFAULT '',
  current_location VARCHAR(255) DEFAULT '',
  themes TEXT[] DEFAULT '{}',
  difficulty_level VARCHAR(20) DEFAULT 'normal',
  rules_enforcement VARCHAR(20) DEFAULT 'moderate',
  npcs JSONB DEFAULT '[]',
  quests JSONB DEFAULT '[]',
  locations JSONB DEFAULT '[]',
  factions JSONB DEFAULT '[]',
  session_count INTEGER DEFAULT 0,
  total_playtime INTEGER DEFAULT 0,
  ai_model VARCHAR(100) DEFAULT 'gpt-4o',
  dm_personality TEXT DEFAULT 'A wise and fair Dungeon Master who creates immersive adventures.',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_played_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Characters table
CREATE TABLE IF NOT EXISTS characters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  race VARCHAR(100) NOT NULL,
  class VARCHAR(100) NOT NULL,
  subclass VARCHAR(100),
  level INTEGER DEFAULT 1,
  background VARCHAR(100) DEFAULT '',
  alignment VARCHAR(50) DEFAULT 'True Neutral',
  experience INTEGER DEFAULT 0,
  ability_scores JSONB NOT NULL DEFAULT '{"strength":10,"dexterity":10,"constitution":10,"intelligence":10,"wisdom":10,"charisma":10}',
  max_hp INTEGER NOT NULL DEFAULT 10,
  current_hp INTEGER NOT NULL DEFAULT 10,
  temp_hp INTEGER DEFAULT 0,
  armor_class INTEGER DEFAULT 10,
  initiative INTEGER DEFAULT 0,
  speed INTEGER DEFAULT 30,
  proficiency_bonus INTEGER DEFAULT 2,
  saving_throws JSONB DEFAULT '{}',
  skills JSONB DEFAULT '{}',
  hit_dice VARCHAR(20) DEFAULT '1d8',
  hit_dice_remaining INTEGER DEFAULT 1,
  death_saves JSONB DEFAULT '{"successes":0,"failures":0}',
  spellcasting_ability VARCHAR(20),
  spell_save_dc INTEGER,
  spell_attack_bonus INTEGER,
  spell_slots JSONB DEFAULT '{}',
  dndbeyond_id VARCHAR(100),
  dndbeyond_url VARCHAR(500),
  last_synced_at TIMESTAMP WITH TIME ZONE,
  sync_enabled BOOLEAN DEFAULT false,
  portrait_url VARCHAR(500),
  notes TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inventory table
CREATE TABLE IF NOT EXISTS inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID REFERENCES characters(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) DEFAULT 'other',
  quantity INTEGER DEFAULT 1,
  weight DECIMAL(10,2) DEFAULT 0,
  value INTEGER DEFAULT 0,
  description TEXT DEFAULT '',
  equipped BOOLEAN DEFAULT false,
  attuned BOOLEAN DEFAULT false,
  requires_attunement BOOLEAN DEFAULT false,
  magical BOOLEAN DEFAULT false,
  rarity VARCHAR(50),
  properties TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Spells table
CREATE TABLE IF NOT EXISTS spells (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID REFERENCES characters(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  level INTEGER NOT NULL DEFAULT 0,
  school VARCHAR(50) NOT NULL,
  casting_time VARCHAR(100) NOT NULL,
  range VARCHAR(100) NOT NULL,
  components VARCHAR(100) NOT NULL,
  duration VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  prepared BOOLEAN DEFAULT false,
  ritual BOOLEAN DEFAULT false,
  concentration BOOLEAN DEFAULT false
);

-- Game state table
CREATE TABLE IF NOT EXISTS game_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID UNIQUE REFERENCES campaigns(id) ON DELETE CASCADE,
  in_combat BOOLEAN DEFAULT false,
  initiative_order JSONB DEFAULT '[]',
  current_turn INTEGER DEFAULT 0,
  round INTEGER DEFAULT 0,
  current_scene TEXT DEFAULT '',
  current_scene_image_url VARCHAR(500),
  time_of_day VARCHAR(20) DEFAULT 'midday',
  weather VARCHAR(100) DEFAULT 'clear',
  party_gold INTEGER DEFAULT 0,
  party_inventory JSONB DEFAULT '[]',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chat messages table
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL,
  content TEXT NOT NULL,
  tool_calls JSONB,
  tool_results JSONB,
  dice_rolls JSONB,
  scene_change BOOLEAN DEFAULT false,
  tool_call_id VARCHAR(255), -- Add this line
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Session logs table
CREATE TABLE IF NOT EXISTS session_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  session_number INTEGER NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  summary TEXT,
  highlights TEXT[] DEFAULT '{}',
  message_count INTEGER DEFAULT 0
);

-- Rule violations table
CREATE TABLE IF NOT EXISTS rule_violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  type VARCHAR(50) NOT NULL,
  description TEXT NOT NULL,
  severity VARCHAR(20) DEFAULT 'info',
  resolved BOOLEAN DEFAULT false,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- API keys table (encrypted storage)
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_name VARCHAR(100) UNIQUE NOT NULL,
  encrypted_value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Campaign content table (for ingesting PDFs, text, URLs, API data)
CREATE TABLE IF NOT EXISTS campaign_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(20) NOT NULL DEFAULT 'text',
  content TEXT NOT NULL,
  summary TEXT,
  source VARCHAR(500),
  category VARCHAR(50) NOT NULL DEFAULT 'other',
  is_hidden BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_characters_campaign ON characters(campaign_id);
CREATE INDEX IF NOT EXISTS idx_inventory_character ON inventory(character_id);
CREATE INDEX IF NOT EXISTS idx_spells_character ON spells(character_id);
CREATE INDEX IF NOT EXISTS idx_messages_campaign ON messages(campaign_id);
CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_session_logs_campaign ON session_logs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_rule_violations_campaign ON rule_violations(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_content_campaign ON campaign_content(campaign_id);
`;

export async function setupDatabase(): Promise<void> {
  console.log('Setting up database schema...');

  // Split schema into individual statements and execute each
  const statements = SCHEMA
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  for (const statement of statements) {
    try {
      await pool.query(statement);
      console.log('Executed:', statement.substring(0, 60) + '...');
    } catch (error) {
      console.error('Schema statement failed:', statement.substring(0, 100));
      throw error;
    }
  }

  // Idempotently add the new tool_call_id column to the messages table
  console.log('Attempting to add tool_call_id column to messages table if it does not exist...');
  try {
    const alterStatement = 'ALTER TABLE messages ADD COLUMN tool_call_id VARCHAR(255);';
    await pool.query(alterStatement);
    console.log('Successfully added tool_call_id column to messages table.');
  } catch (error: any) {
    // Ignore "column already exists" error (code 42701 for PostgreSQL)
    if (error.code !== '42701') {
      console.error('Failed to add tool_call_id column:', error);
      throw error;
    } else {
      console.log('Column tool_call_id already exists. Skipping migration.');
    }
  }

  console.log('Database schema setup complete.');
}

export default pool;
