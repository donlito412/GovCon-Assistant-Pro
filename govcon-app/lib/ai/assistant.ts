// ============================================================
// AI ASSISTANT — CHAT LOGIC + STREAMING HANDLER
// ============================================================

import Anthropic from '@anthropic-ai/sdk';
import { buildSystemPrompt, type AssistantContext } from './prompts';
import { TOOL_DEFINITIONS, executeTool } from './tools';

const MODEL = 'claude-sonnet-4-5'; // claude-sonnet-4-6 maps to claude-sonnet-4-5 in SDK

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  created_at?: string;
}

// ── Streaming chat handler ─────────────────────────────────
// Returns a ReadableStream of Server-Sent Events (text/event-stream).
// Each chunk is: data: {"type":"text","text":"..."}\n\n
// or:            data: {"type":"tool_use","name":"...","input":{...}}\n\n
// Terminates with: data: [DONE]\n\n

export async function streamChatResponse(
  messages: ChatMessage[],
  context: AssistantContext,
): Promise<ReadableStream<Uint8Array>> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const systemPrompt = buildSystemPrompt(context);

  // Convert to Anthropic message format (last 20 for context window)
  const history = messages.slice(-20).map((m) => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }));

  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (obj: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
      };

      try {
        // Agentic loop: keep going until no more tool calls
        let currentMessages = [...history];
        let iterations = 0;
        const MAX_ITERATIONS = 8;

        while (iterations < MAX_ITERATIONS) {
          iterations++;
          let fullText = '';
          const toolUses: { id: string; name: string; input: Record<string, any> }[] = [];
          let stopReason: string = 'end_turn';

          // Stream from Anthropic
          const stream = await client.messages.stream({
            model: MODEL,
            max_tokens: 4096,
            system: systemPrompt,
            messages: currentMessages,
            tools: TOOL_DEFINITIONS,
          });

          for await (const event of stream) {
            if (event.type === 'content_block_delta') {
              if (event.delta.type === 'text_delta') {
                fullText += event.delta.text;
                send({ type: 'text', text: event.delta.text });
              } else if (event.delta.type === 'input_json_delta') {
                // Accumulate tool input — handled at content_block_stop
              }
            } else if (event.type === 'content_block_start') {
              if (event.content_block.type === 'tool_use') {
                send({ type: 'tool_start', name: event.content_block.name });
              }
            } else if (event.type === 'content_block_stop') {
              // Handled via message finalMessage
            } else if (event.type === 'message_stop') {
              stopReason = 'end_turn';
            }
          }

          // Get the final message to extract tool calls
          const finalMessage = await stream.finalMessage();
          stopReason = finalMessage.stop_reason ?? 'end_turn';

          // Collect tool use blocks
          for (const block of finalMessage.content) {
            if (block.type === 'tool_use') {
              toolUses.push({ id: block.id, name: block.name, input: block.input as Record<string, any> });
            }
          }

          if (toolUses.length === 0 || stopReason === 'end_turn') {
            break; // no more tool calls
          }

          // Execute all tool calls
          const toolResults: Anthropic.MessageParam = {
            role: 'user',
            content: [],
          };

          for (const tool of toolUses) {
            send({ type: 'tool_use', name: tool.name, input: tool.input });
            const result = await executeTool(tool.name, tool.input);
            send({ type: 'tool_result', name: tool.name });

            (toolResults.content as Anthropic.ToolResultBlockParam[]).push({
              type: 'tool_result',
              tool_use_id: tool.id,
              content: result,
            });
          }

          // Add assistant response + tool results to history for next iteration
          currentMessages = [
            ...currentMessages,
            { role: 'assistant', content: finalMessage.content },
            toolResults,
          ] as any;
        }
      } catch (err) {
        send({ type: 'error', message: err instanceof Error ? err.message : 'Unknown error' });
      } finally {
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      }
    },
  });
}

// ── Conversation persistence helpers ──────────────────────

import { createClient } from '@supabase/supabase-js';

function supaAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  );
}

export async function saveConversation(
  userId: string,
  conversationId: number | null,
  messages: ChatMessage[],
  title?: string,
  context?: AssistantContext,
): Promise<number> {
  const db = supaAdmin();

  if (conversationId) {
    await db.from('assistant_conversations').update({
      messages, ...(title ? { title } : {}),
    }).eq('id', conversationId).eq('user_id', userId);
    return conversationId;
  }

  const { data } = await db.from('assistant_conversations').insert({
    user_id: userId,
    title:   title ?? 'New Conversation',
    messages,
    context: context ?? {},
  }).select('id').single();

  return data?.id ?? 0;
}

export async function listConversations(userId: string) {
  const db = supaAdmin();
  const { data } = await db.from('assistant_conversations')
    .select('id,title,updated_at,context')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(30);
  return data ?? [];
}

export async function loadConversation(userId: string, id: number): Promise<ChatMessage[]> {
  const db = supaAdmin();
  const { data } = await db.from('assistant_conversations')
    .select('messages')
    .eq('id', id).eq('user_id', userId).maybeSingle();
  return (data?.messages as ChatMessage[]) ?? [];
}
