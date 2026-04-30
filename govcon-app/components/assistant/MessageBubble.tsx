'use client';

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Bot, User, Copy, Check, Wrench } from 'lucide-react';
import { ApprovalCard } from './ApprovalCard';
import type { ChatMessage } from '@/lib/ai/assistant';

// ============================================================
// MESSAGE BUBBLE — renders user + assistant messages
// Supports markdown, code blocks, approval blocks, tool use
// ============================================================

interface Props {
  message: ChatMessage & { isStreaming?: boolean; toolsUsed?: string[] };
  onApprove?: (type: string, data: any) => void;
}

function parseApprovalBlocks(text: string): { parts: string[]; approvals: any[] } {
  const parts: string[] = [];
  const approvals: any[] = [];
  const regex = /```approval\n([\s\S]*?)```/g;
  let last = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    parts.push(text.slice(last, match.index));
    try {
      approvals.push({ index: parts.length - 1, data: JSON.parse(match[1]) });
    } catch {
      parts[parts.length - 1] += match[0]; // keep raw if invalid JSON
    }
    last = match.index + match[0].length;
  }
  parts.push(text.slice(last));
  return { parts, approvals };
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy} className="opacity-0 group-hover:opacity-100 transition text-gray-400 hover:text-gray-700 ml-1">
      {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

const MarkdownComponents: any = {
  h1: ({ children }: any) => <h1 className="text-lg font-bold text-gray-900 mt-4 mb-2 first:mt-0">{children}</h1>,
  h2: ({ children }: any) => <h2 className="text-base font-bold text-gray-900 mt-3 mb-1.5 first:mt-0">{children}</h2>,
  h3: ({ children }: any) => <h3 className="text-sm font-bold text-gray-800 mt-2 mb-1 first:mt-0">{children}</h3>,
  p:  ({ children }: any) => <p className="text-sm text-gray-700 leading-relaxed mb-2 last:mb-0">{children}</p>,
  ul: ({ children }: any) => <ul className="list-disc list-inside space-y-1 mb-2 text-sm text-gray-700">{children}</ul>,
  ol: ({ children }: any) => <ol className="list-decimal list-inside space-y-1 mb-2 text-sm text-gray-700">{children}</ol>,
  li: ({ children }: any) => <li className="leading-relaxed">{children}</li>,
  strong: ({ children }: any) => <strong className="font-semibold text-gray-900">{children}</strong>,
  em: ({ children }: any) => <em className="italic text-gray-600">{children}</em>,
  blockquote: ({ children }: any) => (
    <blockquote className="border-l-3 border-blue-300 bg-blue-50 pl-3 py-1 my-2 text-sm text-gray-600 italic rounded-r">
      {children}
    </blockquote>
  ),
  code: ({ inline, children }: any) => inline
    ? <code className="text-xs font-mono bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded">{children}</code>
    : <code className="block text-xs font-mono bg-gray-900 text-gray-100 p-3 rounded-lg overflow-x-auto my-2">{children}</code>,
  pre: ({ children }: any) => <div className="relative group">{children}<CopyButton text={String(children)} /></div>,
  table: ({ children }: any) => (
    <div className="overflow-x-auto my-2">
      <table className="text-xs border-collapse w-full">{children}</table>
    </div>
  ),
  th: ({ children }: any) => <th className="border border-gray-300 bg-gray-100 px-2 py-1 text-left font-semibold text-gray-700">{children}</th>,
  td: ({ children }: any) => <td className="border border-gray-300 px-2 py-1 text-gray-700">{children}</td>,
  a:  ({ children, href }: any) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{children}</a>
  ),
};

export function MessageBubble({ message, onApprove }: Props) {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <div className="flex items-start gap-3 justify-end">
        <div className="max-w-[80%] bg-blue-600 text-white rounded-2xl rounded-tr-sm px-4 py-2.5">
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
        </div>
        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center mt-0.5">
          <User className="w-4 h-4 text-blue-600" />
        </div>
      </div>
    );
  }

  // Assistant message
  const { parts, approvals } = parseApprovalBlocks(message.content);

  return (
    <div className="flex items-start gap-3">
      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center mt-0.5">
        <Bot className="w-4 h-4 text-indigo-600" />
      </div>
      <div className="flex-1 min-w-0 space-y-2">
        {/* Tool use indicators */}
        {message.toolsUsed && message.toolsUsed.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {message.toolsUsed.map((t) => (
              <span key={t} className="flex items-center gap-1 text-[10px] font-medium text-indigo-600 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
                <Wrench className="w-2.5 h-2.5" />{t.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        )}

        {/* Message content with approval blocks */}
        {parts.map((part, i) => (
          <React.Fragment key={i}>
            {part.trim() && (
              <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={MarkdownComponents}>
                  {part}
                </ReactMarkdown>
                {message.isStreaming && i === parts.length - 1 && (
                  <span className="inline-block w-1.5 h-4 bg-indigo-500 animate-pulse ml-0.5 rounded-sm" />
                )}
              </div>
            )}
            {approvals.find((a) => a.index === i) && (
              <ApprovalCard
                key={`approval-${i}`}
                approval={approvals.find((a) => a.index === i)!.data}
                onApprove={onApprove}
              />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
