// ============================================================
// POST /api/assistant — streaming chat endpoint
// Accepts: { messages, conversationId?, context?, saveHistory? }
// Returns: text/event-stream SSE
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '../../../../../03_OUTPUTS/TASK_001_scaffold/lib/supabase';
import { streamChatResponse, saveConversation, type ChatMessage } from '../../../lib/ai/assistant';
import type { AssistantContext } from '../../../lib/ai/prompts';

export const maxDuration = 120;

export async function POST(req: NextRequest): Promise<NextResponse | Response> {
  const supabase = createServerSupabaseClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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
    saveConversation(user.id, conversationId, messages, title, context).catch(() => {});
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
  const supabase = createServerSupabaseClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { listConversations, loadConversation } = await import('../../../lib/ai/assistant');
  const { searchParams } = new URL(req.url);
  const loadId = searchParams.get('load');

  if (loadId) {
    const messages = await loadConversation(user.id, parseInt(loadId));
    return NextResponse.json({ messages });
  }

  const conversations = await listConversations(user.id);
  return NextResponse.json({ conversations });
}
