import { NextResponse } from 'next/server';
import { setupDatabase, checkDatabaseConnection, query } from '../../../../lib/db';

// Run any pending migrations
async function runMigrations() {
  // Check if campaign_content table exists, create if not
  const result = await query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = 'campaign_content'
    ) as exists
  `);

  if (!result.rows[0]?.exists) {
    console.log('Creating campaign_content table...');
    await query(`
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
      )
    `);
    await query(`
      CREATE INDEX IF NOT EXISTS idx_campaign_content_campaign
      ON campaign_content(campaign_id)
    `);
    console.log('campaign_content table created successfully');
  }
}

export async function POST() {
  try {
    // Check connection first
    const connected = await checkDatabaseConnection();
    if (!connected) {
      return NextResponse.json(
        { success: false, error: 'Cannot connect to database' },
        { status: 500 }
      );
    }

    // Run schema setup
    await setupDatabase();

    return NextResponse.json({
      success: true,
      message: 'Database schema created successfully',
    });
  } catch (error) {
    console.error('Database setup error:', error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const connected = await checkDatabaseConnection();

    // Run migrations on health check if connected
    if (connected) {
      try {
        await runMigrations();
      } catch (migrationError) {
        console.error('Migration error (non-fatal):', migrationError);
      }
    }

    return NextResponse.json({
      success: true,
      connected,
      status: connected ? 'healthy' : 'disconnected',
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      connected: false,
      status: 'error',
      error: String(error),
    });
  }
}
