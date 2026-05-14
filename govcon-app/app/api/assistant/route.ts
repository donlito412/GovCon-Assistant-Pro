export const dynamic = 'force-dynamic';

// ============================================================
// POST /api/assistant — streaming chat endpoint
// Accepts: { messages, conversationId?, context?, saveHistory? }
// Returns: text/event-stream SSE
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { getRouteUser } from '@/lib/auth/route';
import { isAuthEnabled } from '@/lib/auth/mode';
import { streamChatResponse, saveConversation, type ChatMessage } from '@/lib/ai/assistant';
import type { AssistantContext } from '@/lib/ai/prompts';

export const maxDuration = 120;

export async function POST(req: NextRequest): Promise<NextResponse | Response> {
  const user = await getRouteUser();
  if (isAuthEnabled() && !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = user?.id ?? 'local';

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const messages: ChatMessage[] = body.messages ?? [];
  const context: AssistantContext = body.context ?? {};
  const conversationId: number | null = body.conversation_id ?? null;
  const saveHistory: boolean = body.save_history !== false;

  if (!messages.length) return NextResponse.json({ error: 'messages required' }, { status: 400 });

  // Save conversation (async, non-blocking)
  if (saveHistory && messages.length > 0) {
    const title = messages[0]?.content?.slice(0, 60) ?? 'Conversation';
    saveConversation(userId, conversationId, messages, title, context).catch(() => {});
  }

  const stream = await streamChatResponse(messages, context);

  return new Response(stream, {
    headers: {
      'Content-Type':  'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection':    'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}

// GET — list conversations
export async function GET(req: NextRequest): Promise<NextResponse> {
  const user = await getRouteUser();
  if (isAuthEnabled() && !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = user?.id ?? 'local';

  const { listConversations, loadConversation } = await import('../../../lib/ai/assistant');
  const { searchParams } = new URL(req.url);
  const loadId = searchParams.get('load');

  if (loadId) {
    const messages = await loadConversation(userId, parseInt(loadId));
    return NextResponse.json({ messages });
  }

  const conversations = await listConversations(userId);
  return NextResponse.json({ conversations });
}
