'use client';

import React from 'react';
import { FileText, Database, Globe, Building2, X, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import type { AssistantContext } from '../../lib/ai/prompts';

// ============================================================
// CONTEXT PANEL — shows what data the AI is referencing
// ============================================================

interface ToolCall {
  name: string;
  input: Record<string, any>;
  result_summary?: string;
}

interface Props {
  context: AssistantContext;
  toolCalls: ToolCall[];
  documentTitle?: string;
  onClearDocument?: () => void;
  onClearContext?: () => void;
}

const TOOL_ICONS: Record<string, React.ElementType> = {
  search_contracts:      Database,
  get_contract_detail:   FileText,
  get_agency_profile:    Building2,
  get_pipeline_status:   Database,
  search_grants:         Database,
  get_saved_contacts:    Database,
  get_award_history:     Globe,
  get_incumbent:         Globe,
  get_expiring_contracts: Database,
  search_companies:      Globe,
  analyze_solicitation:  FileText,
};

function ToolBadge({ call }: { call: ToolCall }) {
  const Icon = TOOL_ICONS[call.name] ?? Globe;
  const label = call.name.replace(/_/g, ' ');
  return (
    <div className="flex items-start gap-2 text-xs">
      <Icon className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
      <div>
        <span className="font-medium text-gray-700 capitalize">{label}</span>
        {call.input && Object.keys(call.input).length > 0 && (
          <p className="text-gray-400 truncate max-w-[180px]">
            {Object.entries(call.input).slice(0, 2).map(([k, v]) => `${k}: ${String(v).slice(0, 30)}`).join(', ')}
          </p>
        )}
      </div>
    </div>
  );
}

export function ContextPanel({ context, toolCalls, documentTitle, onClearDocument, onClearContext }: Props) {
  const hasContent = context.currentContractTitle || documentTitle || toolCalls.length > 0;

  if (!hasContent) return null;

  return (
    <div className="bg-gray-50 border-b border-gray-200 px-4 py-2.5 text-xs">
      <div className="flex items-center gap-4 flex-wrap">
        {/* Contract context */}
        {context.currentContractTitle && (
          <div className="flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-blue-500" />
            <span className="font-medium text-gray-700">Context:</span>
            <span className="text-blue-600 truncate max-w-[200px]">{context.currentContractTitle}</span>
            {context.currentContractId && (
              <Link href={`/contracts/${context.currentContractId}`}
                className="text-gray-400 hover:text-blue-600">
                <ChevronRight className="w-3 h-3" />
              </Link>
            )}
            {onClearContext && (
              <button onClick={onClearContext} className="text-gray-400 hover:text-gray-600">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        )}

        {/* Document being analyzed */}
        {documentTitle && (
          <div className="flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-purple-500" />
            <span className="font-medium text-gray-700">Document:</span>
            <span className="text-purple-600 truncate max-w-[200px]">{documentTitle}</span>
            {onClearDocument && (
              <button onClick={onClearDocument} className="text-gray-400 hover:text-gray-600">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        )}

        {/* Recent tool calls */}
        {toolCalls.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-gray-500">Data sources:</span>
            {[...new Set(toolCalls.slice(-5).map((t) => t.name))].map((name) => {
              const Icon = TOOL_ICONS[name] ?? Globe;
              return (
                <span key={name} className="flex items-center gap-1 bg-white border border-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
                  <Icon className="w-3 h-3" />
                  {name.replace(/_/g, ' ')}
                </span>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
