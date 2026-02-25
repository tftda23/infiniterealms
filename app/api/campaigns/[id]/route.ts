import { NextRequest, NextResponse } from 'next/server';
import * as campaignService from '@/lib/services/campaign-service';
import { z } from 'zod';
import type { Campaign } from '@/types';

const campaignIdSchema = z.object({
  id: z.string().uuid('Invalid campaign ID format (must be UUID)'),
});

const updateCampaignSchema = z.object({
  name: z.string().min(1, 'Campaign name cannot be empty').optional(),
  description: z.string().optional(),
  worldSetting: z.string().optional(),
  difficultyLevel: z.enum(['easy', 'normal', 'hard', 'deadly']).optional(),
  rulesEnforcement: z.enum(['strict', 'moderate', 'loose']).optional(),
  dmPersonality: z.string().optional(),
  currentScene: z.string().optional(),
  currentLocation: z.string().optional(),
  themes: z.array(z.string()).optional(),
}).partial(); // Allow partial updates

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: rawId } = await params;
    const idValidation = campaignIdSchema.safeParse({ id: rawId });

    if (!idValidation.success) {
      return NextResponse.json(
        { success: false, error: idValidation.error.issues },
        { status: 400 }
      );
    }
    const { id } = idValidation.data;

    const campaign = await campaignService.getCampaign(id);

    if (!campaign) {
      return NextResponse.json(
        { success: false, error: 'Campaign not found' },
        { status: 404 }
      );
    }

    // Update last played
    await campaignService.updateLastPlayed(id);

    return NextResponse.json({ success: true, data: campaign });
  } catch (error) {
    console.error('Error fetching campaign:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch campaign' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: rawId } = await params;
    const idValidation = campaignIdSchema.safeParse({ id: rawId });

    if (!idValidation.success) {
      return NextResponse.json(
        { success: false, error: idValidation.error.issues },
        { status: 400 }
      );
    }
    const { id } = idValidation.data;

    const body = await request.json();
    const updatesValidation = updateCampaignSchema.safeParse(body);

    if (!updatesValidation.success) {
      return NextResponse.json(
        { success: false, error: updatesValidation.error.issues },
        { status: 400 }
      );
    }
    const updates = updatesValidation.data;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No update fields provided' },
        { status: 400 }
      );
    }

    const campaign = await campaignService.updateCampaign(id, updates as Partial<Campaign>);

    if (!campaign) {
      return NextResponse.json(
        { success: false, error: 'Campaign not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: campaign });
  } catch (error) {
    console.error('Error updating campaign:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update campaign' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: rawId } = await params;
    const idValidation = campaignIdSchema.safeParse({ id: rawId });

    if (!idValidation.success) {
      return NextResponse.json(
        { success: false, error: idValidation.error.issues },
        { status: 400 }
      );
    }
    const { id } = idValidation.data;

    const deleted = await campaignService.deleteCampaign(id);

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Campaign not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting campaign:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete campaign' },
      { status: 500 }
    );
  }
}
