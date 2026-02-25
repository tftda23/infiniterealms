import { NextRequest, NextResponse } from 'next/server';
import * as campaignService from '../../../lib/services/campaign-service';
import { z } from 'zod';

const createCampaignSchema = z.object({
  name: z.string().min(1, 'Campaign name is required'),
  description: z.string().optional(),
  worldSetting: z.string().optional(),
  difficultyLevel: z.enum(['easy', 'normal', 'hard', 'deadly']).optional(),
  dmPersonality: z.string().optional(),
});

export async function GET() {
  try {
    const campaigns = await campaignService.getAllCampaigns();
    return NextResponse.json({ success: true, data: campaigns });
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch campaigns' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const validation = createCampaignSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues },
        { status: 400 }
      );
    }

    const { name, description, worldSetting, difficultyLevel, dmPersonality } = validation.data;

    const campaign = await campaignService.createCampaign({
      name,
      description,
      worldSetting,
      difficultyLevel,
      dmPersonality,
    });

    return NextResponse.json({ success: true, data: campaign }, { status: 201 });
  } catch (error) {
    console.error('Error creating campaign:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create campaign' },
      { status: 500 }
    );
  }
}
