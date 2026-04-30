'use client';

import React from 'react';
import {
  FileSearch, Users, BarChart2, Trophy, Clock, DollarSign, HelpCircle, Briefcase,
} from 'lucide-react';

// ============================================================
// QUICK PROMPTS — shown on a fresh (empty) chat
// ============================================================

interface Prompt {
  icon: React.ElementType;
  label: string;
  prompt: string;
  color: string;
  triggerUpload?: boolean;
}

const QUICK_PROMPTS: Prompt[] = [
  {
    icon: FileSearch,
    label: 'Analyze an RFP',
    prompt: 'I want to analyze a solicitation document. Please let me upload a PDF or paste in the text.',
    color: 'text-blue-600 bg-blue-50 border-blue-200 hover:bg-blue-100',
    triggerUpload: true,
  },
  {
    icon: Users,
    label: 'Find companies for my bid',
    prompt: 'Help me find subcontractors or teaming partners for my current bid. What type of company do you need?',
    color: 'text-indigo-600 bg-indigo-50 border-indigo-200 hover:bg-indigo-100',
  },
  {
    icon: DollarSign,
    label: 'What did similar contracts go for?',
    prompt: 'I want to research pricing intelligence. What NAICS code or type of contract should I look up?',
    color: 'text-green-600 bg-green-50 border-green-200 hover:bg-green-100',
  },
  {
    icon: Trophy,
    label: "Who's winning in my space?",
    prompt: "Who are the top companies winning government contracts in Pittsburgh in my industry? Let's look at the competitive landscape.",
    color: 'text-amber-600 bg-amber-50 border-amber-200 hover:bg-amber-100',
  },
  {
    icon: Clock,
    label: 'Contracts expiring soon',
    prompt: 'Show me contracts expiring in the next 6 months that I should be watching for recompete opportunities.',
    color: 'text-orange-600 bg-orange-50 border-orange-200 hover:bg-orange-100',
  },
  {
    icon: Briefcase,
    label: 'What grants am I eligible for?',
    prompt: "What grants am I eligible for as a small business in Pittsburgh? Show me what's available with deadlines coming up.",
    color: 'text-purple-600 bg-purple-50 border-purple-200 hover:bg-purple-100',
  },
  {
    icon: BarChart2,
    label: 'Analyze my pipeline',
    prompt: "Give me an analysis of my current bid pipeline. What stage am I in for each opportunity and what should I focus on?",
    color: 'text-teal-600 bg-teal-50 border-teal-200 hover:bg-teal-100',
  },
  {
    icon: HelpCircle,
    label: 'Ask anything about contracting',
    prompt: 'I have a question about government contracting. Here it is: ',
    color: 'text-gray-600 bg-gray-50 border-gray-200 hover:bg-gray-100',
  },
];

interface Props {
  onSelect: (prompt: string, triggerUpload?: boolean) => void;
}

export function QuickPrompts({ onSelect }: Props) {
  return (
    <div className="flex flex-col items-center py-8 px-4 max-w-2xl mx-auto">
      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mb-4 shadow-md">
        <svg viewBox="0 0 24 24" className="w-6 h-6 text-white fill-current">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
        </svg>
      </div>
      <h2 className="text-xl font-bold text-gray-900 mb-1">AI Government Contracting Advisor</h2>
      <p className="text-sm text-gray-500 text-center mb-8 max-w-md">
        Ask me anything about contracts, pricing, competitors, subcontractors, or strategy.
        I use real data — no guessing.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
        {QUICK_PROMPTS.map((p) => {
          const Icon = p.icon;
          return (
            <button
              key={p.label}
              onClick={() => onSelect(p.prompt, p.triggerUpload)}
              className={`flex items-center gap-3 text-left border rounded-xl px-4 py-3 transition ${p.color}`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm font-medium">{p.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
