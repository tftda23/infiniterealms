-- Solo D&D Adventure - Database Schema
-- Run with: psql -d dndsolo -f scripts/setup-schema.sql

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
  dm_personality TEXT DEFAULT 'A wise and fair Dungeon Master who creates immersive adventures.',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_played_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- App Settings table (for global AI keys and other settings)
CREATE TABLE IF NOT EXISTS app_settings (
  id INT PRIMARY KEY, -- Enforce a single row
  settings JSONB NOT NULL
);

-- Insert default global settings
INSERT INTO app_settings (id, settings)
VALUES (1, '{
  "defaultProvider": "openai",
  "defaultModel": "gpt-4o",
  "temperature": 0.8,
  "maxTokens": 2000,
  "apiKeys": {}
}')
ON CONFLICT (id) DO NOTHING;

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
  tool_call_id VARCHAR(255), -- Added for tool call responses
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add tool_call_id column if it doesn't exist (for existing installations)
ALTER TABLE IF EXISTS messages ADD COLUMN IF NOT EXISTS tool_call_id VARCHAR(255);

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

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_characters_campaign ON characters(campaign_id);
CREATE INDEX IF NOT EXISTS idx_inventory_character ON inventory(character_id);
CREATE INDEX IF NOT EXISTS idx_spells_character ON spells(character_id);
CREATE INDEX IF NOT EXISTS idx_messages_campaign ON messages(campaign_id);
CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_session_logs_campaign ON session_logs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_rule_violations_campaign ON rule_violations(campaign_id);


-- Done
SELECT 'Schema setup complete!' as status;
