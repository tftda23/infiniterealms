import { NextResponse } from 'next/server';
import { query } from '../../../../lib/db';

// POST - Create campaign_content table if it doesn't exist
export async function POST() {
  try {
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

    return NextResponse.json({
      success: true,
      message: 'Campaign content table created successfully',
    });
  } catch (error) {
    console.error('Error creating campaign_content table:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create campaign content table' },
      { status: 500 }
    );
  }
}

// GET - Check if table exists
export async function GET() {
  try {
    const result = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'campaign_content'
      ) as exists
    `);

    return NextResponse.json({
      success: true,
      tableExists: result.rows[0]?.exists || false,
    });
  } catch (error) {
    console.error('Error checking campaign_content table:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to check table' },
      { status: 500 }
    );
  }
}
