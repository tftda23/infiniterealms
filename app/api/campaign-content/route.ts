import { NextRequest, NextResponse } from 'next/server';
import * as contentService from '../../../lib/services/campaign-content-service';
import { z } from 'zod';

// Validation schemas
const createContentSchema = z.object({
  campaignId: z.string().uuid('Invalid campaign ID format'),
  name: z.string().min(1, 'Name is required').max(255),
  type: z.enum(['text', 'pdf', 'url', 'api']),
  content: z.string().min(1, 'Content is required'),
  summary: z.string().max(1000).optional(),
  source: z.string().max(500).optional(),
  category: z.enum(['lore', 'rules', 'locations', 'npcs', 'items', 'monsters', 'other']),
  isHidden: z.boolean().optional(),
});

const getContentSchema = z.object({
  campaignId: z.string().uuid('Invalid campaign ID format'),
});

// GET - Get all content for a campaign
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const validation = getContentSchema.safeParse(Object.fromEntries(searchParams));

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues },
        { status: 400 }
      );
    }

    const { campaignId } = validation.data;
    const content = await contentService.getCampaignContent(campaignId);

    return NextResponse.json({ success: true, data: content });
  } catch (error) {
    console.error('Error fetching campaign content:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch campaign content' },
      { status: 500 }
    );
  }
}

// POST - Create new content
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = createContentSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues },
        { status: 400 }
      );
    }

    const content = await contentService.createContent(validation.data);

    return NextResponse.json({ success: true, data: content }, { status: 201 });
  } catch (error) {
    console.error('Error creating campaign content:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create campaign content' },
      { status: 500 }
    );
  }
}
