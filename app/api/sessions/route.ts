import { NextRequest, NextResponse } from 'next/server';
import * as messageService from '@/lib/services/message-service';

// GET /api/sessions?campaignId=xxx — get session logs + current session
export async function GET(request: NextRequest) {
  const campaignId = request.nextUrl.searchParams.get('campaignId');
  if (!campaignId) {
    return NextResponse.json({ success: false, error: 'campaignId required' }, { status: 400 });
  }

  try {
    const [current, logs] = await Promise.all([
      messageService.getCurrentSession(campaignId),
      messageService.getSessionLogs(campaignId),
    ]);

    return NextResponse.json({
      success: true,
      data: { current, logs },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST /api/sessions — create or end a session
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, campaignId, sessionId, summary, highlights } = body;

    if (action === 'start') {
      if (!campaignId) {
        return NextResponse.json({ success: false, error: 'campaignId required' }, { status: 400 });
      }

      // Check if there's already an active session
      const existing = await messageService.getCurrentSession(campaignId);
      if (existing) {
        return NextResponse.json({ success: true, data: existing });
      }

      const session = await messageService.createSessionLog(campaignId);
      return NextResponse.json({ success: true, data: session });
    }

    if (action === 'end') {
      if (!sessionId) {
        return NextResponse.json({ success: false, error: 'sessionId required' }, { status: 400 });
      }

      // Update message count before ending
      await messageService.updateSessionMessageCount(sessionId);
      const session = await messageService.endSession(sessionId, summary, highlights);
      return NextResponse.json({ success: true, data: session });
    }

    // Generate summary from recent messages
    if (action === 'summarize') {
      if (!campaignId) {
        return NextResponse.json({ success: false, error: 'campaignId required' }, { status: 400 });
      }

      // Get last 30 messages for summarization
      const messages = await messageService.getRecentMessages(campaignId, 30);
      const narrative = messages
        .filter(m => m.role === 'assistant' || m.role === 'user')
        .map(m => `${m.role === 'user' ? 'Player' : 'DM'}: ${m.content}`)
        .join('\n');

      // Return the narrative text for client-side AI summarization
      return NextResponse.json({
        success: true,
        data: { narrative, messageCount: messages.length },
      });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
