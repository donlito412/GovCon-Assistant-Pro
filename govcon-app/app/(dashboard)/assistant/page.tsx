'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Bot, Plus, MessageSquare, Loader2, ChevronLeft, ChevronRight, Trash2,
} from 'lucide-react';
import { ChatWindow } from '../../../components/assistant/ChatWindow';
import type { ChatMessage } from '../../../lib/ai/assistant';
import type { AssistantContext } from '../../../lib/ai/prompts';

// ============================================================
// AI ASSISTANT PAGE — /assistant
// ============================================================

interface ConversationMeta {
  id: number;
  title: string;
  updated_at: string;
  context?: AssistantContext;
}

export default function AssistantPage() {
  const searchParams = useSearchParams();
  const contractId    = searchParams.get('contract_id');
  const contractTitle = searchParams.get('contract_title');
  const autoPrompt    = searchParams.get('prompt');

  const [conversations,    setConversations]    = useState<ConversationMeta[]>([]);
  const [activeConvId,     setActiveConvId]     = useState<number | null>(null);
  const [activeMessages,   setActiveMessages]   = useState<ChatMessage[]>([]);
  const [sidebarOpen,      setSidebarOpen]      = useState(true);
  const [loadingConv,      setLoadingConv]      = useState(false);

  // Build context from URL params
  const context: AssistantContext = {
    ...(contractId    ? { currentContractId: parseInt(contractId) }     : {}),
    ...(contractTitle ? { currentContractTitle: contractTitle }          : {}),
  };

  // Load conversation list
  const loadList = useCallback(async () => {
    const res = await fetch('/api/assistant').catch(() => null);
    if (!res?.ok) return;
    const { conversations: list } = await res.json();
    setConversations(list ?? []);
  }, []);

  useEffect(() => { loadList(); }, [loadList]);

  // If arriving from a contract page with autoPrompt, start a fresh conversation
  useEffect(() => {
    if (autoPrompt && activeMessages.length === 0) {
      setActiveMessages([]);
      setActiveConvId(null);
    }
  }, [autoPrompt]);

  const loadConversation = useCallback(async (id: number) => {
    setLoadingConv(true);
    setActiveConvId(id);
    const res = await fetch(`/api/assistant?load=${id}`).catch(() => null);
    if (res?.ok) {
      const { messages } = await res.json();
      setActiveMessages(messages ?? []);
    }
    setLoadingConv(false);
  }, []);

  const newConversation = () => {
    setActiveConvId(null);
    setActiveMessages([]);
  };

  const relativeTime = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    if (diff < 60_000)   return 'just now';
    if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`;
    if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h ago`;
    return `${Math.floor(diff / 86400_000)}d ago`;
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden -mx-4 -my-4 md:-mx-6 md:-my-6">
      {/* Sidebar */}
      <div className={`flex-shrink-0 border-r border-gray-200 bg-gray-50 flex flex-col transition-all duration-200 ${sidebarOpen ? 'w-64' : 'w-0 overflow-hidden'}`}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <Bot className="w-4 h-4 text-indigo-600" />Conversations
          </h2>
          <button onClick={newConversation}
            className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 border border-blue-200 hover:border-blue-400 px-2 py-1 rounded-lg transition">
            <Plus className="w-3 h-3" />New
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-1">
          {conversations.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-6">No saved conversations</p>
          ) : (
            conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => loadConversation(conv.id)}
                className={`w-full text-left px-4 py-2.5 hover:bg-gray-100 transition border-b border-gray-100 last:border-0 ${
                  activeConvId === conv.id ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''
                }`}
              >
                <div className="flex items-start gap-2">
                  <MessageSquare className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-gray-900 truncate">{conv.title}</p>
                    <p className="text-[10px] text-gray-400">{relativeTime(conv.updated_at)}</p>
                    {conv.context?.currentContractTitle && (
                      <p className="text-[10px] text-blue-500 truncate">{conv.context.currentContractTitle}</p>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Toggle sidebar button */}
      <button
        onClick={() => setSidebarOpen((s) => !s)}
        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white border border-gray-200 shadow-sm rounded-r-lg p-1 text-gray-400 hover:text-gray-700 transition"
        style={{ left: sidebarOpen ? '256px' : '0' }}
      >
        {sidebarOpen ? <ChevronLeft className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
      </button>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-gray-900">AI Contracting Advisor</h1>
              <p className="text-[10px] text-gray-400">
                {contractTitle ? `Context: ${contractTitle}` : 'Expert government contracting analysis'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {activeConvId && (
              <button onClick={newConversation}
                className="text-xs text-gray-500 hover:text-gray-800 border border-gray-200 px-2.5 py-1.5 rounded-lg transition">
                New Chat
              </button>
            )}
          </div>
        </div>

        {/* Chat */}
        {loadingConv ? (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            <span className="text-sm">Loading conversation…</span>
          </div>
        ) : (
          <ChatWindow
            key={activeConvId ?? 'new'}
            context={context}
            initialMessages={activeMessages}
            conversationId={activeConvId}
            onConversationSaved={(id) => { setActiveConvId(id); loadList(); }}
          />
        )}
      </div>
    </div>
  );
}
