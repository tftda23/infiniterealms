import { NextRequest, NextResponse } from 'next/server';
import * as contentService from '@/lib/services/campaign-content-service';
import { z } from 'zod';

type RouteParams = {
  params: Promise<{ id: string }>;
};

// Validation schema for updates
const updateContentSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  type: z.enum(['text', 'pdf', 'url', 'api']).optional(),
  content: z.string().min(1).optional(),
  summary: z.string().max(1000).optional(),
  source: z.string().max(500).optional(),
  category: z.enum(['lore', 'rules', 'locations', 'npcs', 'items', 'monsters', 'other']).optional(),
  isHidden: z.boolean().optional(),
});

// GET - Get single content item
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const content = await contentService.getContentById(id);

    if (!content) {
      return NextResponse.json(
        { success: false, error: 'Content not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: content });
  } catch (error) {
    console.error('Error fetching content:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch content' },
      { status: 500 }
    );
  }
}

// PATCH - Update content
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validation = updateContentSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues },
        { status: 400 }
      );
    }

    const content = await contentService.updateContent(id, validation.data);

    if (!content) {
      return NextResponse.json(
        { success: false, error: 'Content not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: content });
  } catch (error) {
    console.error('Error updating content:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update content' },
      { status: 500 }
    );
  }
}

// DELETE - Delete content
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const deleted = await contentService.deleteContent(id);

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Content not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting content:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete content' },
      { status: 500 }
    );
  }
}
