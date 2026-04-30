'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MessageBubble } from './MessageBubble';
import { ChatInput } from './ChatInput';
import { ContextPanel } from './ContextPanel';
import { QuickPrompts } from './QuickPrompts';
import type { ChatMessage } from '../../lib/ai/assistant';
import type { AssistantContext } from '../../lib/ai/prompts';

// ============================================================
// CHAT WINDOW — full message thread + streaming handler
// ============================================================

interface RichMessage extends ChatMessage {
  isStreaming?: boolean;
  toolsUsed?: string[];
}

interface ToolCall {
  name: string;
  input: Record<string, any>;
}

interface Props {
  context?: AssistantContext;
  initialMessages?: ChatMessage[];
  conversationId?: number | null;
  documentTitle?: string;
  onClearDocument?: () => void;
  onClearContext?: () => void;
  onConversationSaved?: (id: number) => void;
}

export function ChatWindow({
  context = {},
  initialMessages = [],
  conversationId,
  documentTitle,
  onClearDocument,
  onClearContext,
  onConversationSaved,
}: Props) {
  const [messages,   setMessages]   = useState<RichMessage[]>(initialMessages);
  const [isLoading,  setIsLoading]  = useState(false);
  const [toolCalls,  setToolCalls]  = useState<ToolCall[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Re-init if initialMessages change (loading saved conversation)
  useEffect(() => {
    if (initialMessages.length > 0) setMessages(initialMessages);
  }, [initialMessages]);

  const analyzeDocument = useCallback(async (file: File): Promise<string | null> => {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch('/api/assistant/analyze-document', { method: 'POST', body: form });
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      throw new Error(e.error ?? `Document analysis failed (HTTP ${res.status})`);
    }
    const { analysis, title } = await res.json();
    return `## Document Analysis: ${title}\n\n${analysis}`;
  }, []);

  const sendMessage = useCallback(async (userText: string, file?: File) => {
    if (isLoading) return;

    // If file attached, analyze it first
    let docAnalysis: string | null = null;
    if (file) {
      setIsLoading(true);
      const analysisMsg: RichMessage = {
        role: 'assistant',
        content: `📄 Analyzing **${file.name}**…`,
        created_at: new Date().toISOString(),
        isStreaming: true,
      };
      setMessages((prev) => [...prev, { role: 'user', content: userText || `Please analyze this document: ${file.name}`, created_at: new Date().toISOString() }, analysisMsg]);
      try {
        docAnalysis = await analyzeDocument(file);
        setMessages((prev) => prev.map((m, i) =>
          i === prev.length - 1 ? { ...m, content: docAnalysis!, isStreaming: false } : m
        ));
      } catch (err) {
        setMessages((prev) => prev.map((m, i) =>
          i === prev.length - 1 ? { ...m, content: `❌ ${err instanceof Error ? err.message : 'Document analysis failed'}`, isStreaming: false } : m
        ));
        setIsLoading(false);
        return;
      }
      // For document analysis, we're done (full analysis is already shown)
      setIsLoading(false);
      return;
    }

    if (!userText.trim()) return;

    const userMsg: RichMessage = { role: 'user', content: userText, created_at: new Date().toISOString() };
    const allMessages = [...messages, userMsg];
    setMessages(allMessages);
    setIsLoading(true);

    // Placeholder streaming message
    const assistantMsg: RichMessage = {
      role: 'assistant',
      content: '',
      created_at: new Date().toISOString(),
      isStreaming: true,
      toolsUsed: [],
    };
    setMessages((prev) => [...prev, assistantMsg]);

    try {
      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: allMessages.map(({ role, content }) => ({ role, content })),
          context,
          conversation_id: conversationId ?? null,
        }),
      });

      if (!res.ok || !res.body) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error ?? `API error (HTTP ${res.status})`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';
      const usedTools: string[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const payload = line.slice(6).trim();
          if (payload === '[DONE]') break;

          try {
            const event = JSON.parse(payload);
            if (event.type === 'text') {
              fullText += event.text;
              setMessages((prev) => prev.map((m, i) =>
                i === prev.length - 1 ? { ...m, content: fullText, isStreaming: true } : m
              ));
            } else if (event.type === 'tool_use' || event.type === 'tool_start') {
              const toolName = event.name;
              if (toolName && !usedTools.includes(toolName)) {
                usedTools.push(toolName);
                setToolCalls((prev) => [...prev, { name: toolName, input: event.input ?? {} }]);
                setMessages((prev) => prev.map((m, i) =>
                  i === prev.length - 1 ? { ...m, toolsUsed: [...usedTools] } : m
                ));
              }
            } else if (event.type === 'error') {
              fullText += `\n\n⚠️ ${event.message}`;
            }
          } catch {}
        }
      }

      // Finalize message
      setMessages((prev) => prev.map((m, i) =>
        i === prev.length - 1 ? { ...m, content: fullText || '(No response)', isStreaming: false, toolsUsed: usedTools } : m
      ));

    } catch (err) {
      setMessages((prev) => prev.map((m, i) =>
        i === prev.length - 1
          ? { ...m, content: `⚠️ Error: ${err instanceof Error ? err.message : 'Unknown error'}`, isStreaming: false }
          : m
      ));
    } finally {
      setIsLoading(false);
    }
  }, [messages, context, conversationId, analyzeDocument, isLoading]);

  const handleQuickPrompt = (prompt: string, triggerUpload?: boolean) => {
    if (triggerUpload) {
      // Pre-fill the draft with the prompt text — upload handled in ChatInput
      sendMessage(prompt);
      return;
    }
    sendMessage(prompt);
  };

  return (
    <div className="flex flex-col h-full">
      <ContextPanel
        context={context}
        toolCalls={toolCalls.slice(-10)}
        documentTitle={documentTitle}
        onClearDocument={onClearDocument}
        onClearContext={onClearContext}
      />

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0">
        {messages.length === 0 ? (
          <QuickPrompts onSelect={handleQuickPrompt} />
        ) : (
          messages.map((msg, i) => (
            <MessageBubble
              key={i}
              message={msg}
              onApprove={(type, data) => {
                // Append confirmation to conversation
                setMessages((prev) => [...prev, {
                  role: 'assistant',
                  content: `✅ Action approved and executed: **${type.replace(/_/g, ' ')}**`,
                  created_at: new Date().toISOString(),
                }]);
              }}
            />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <div className="px-4 py-3 border-t border-gray-100">
        <ChatInput
          onSend={sendMessage}
          isLoading={isLoading}
          disabled={false}
          placeholder={context.currentContractTitle
            ? `Ask about ${context.currentContractTitle}…`
            : 'Ask me anything about government contracting…'}
        />
        <p className="text-[10px] text-gray-400 text-center mt-2">
          AI informs — you decide. All actions require your approval before executing.
        </p>
      </div>
    </div>
  );
}
