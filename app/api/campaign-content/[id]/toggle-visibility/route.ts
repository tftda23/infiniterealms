import { NextRequest, NextResponse } from 'next/server';
import * as contentService from '@/lib/services/campaign-content-service';

type RouteParams = {
  params: Promise<{ id: string }>;
};

// POST - Toggle content visibility
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const content = await contentService.toggleContentVisibility(id);

    if (!content) {
      return NextResponse.json(
        { success: false, error: 'Content not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: content });
  } catch (error) {
    console.error('Error toggling content visibility:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to toggle visibility' },
      { status: 500 }
    );
  }
}
