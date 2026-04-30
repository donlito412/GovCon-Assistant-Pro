'use client';

import React from 'react';
import Link from 'next/link';
import { FileText, Building2, Calendar, DollarSign, Tag, ExternalLink } from 'lucide-react';

// ============================================================
// CONTRACT CONTEXT CARD — shown when AI responses reference a contract
// ============================================================

interface ContractRef {
  id?: number;
  title: string;
  agency?: string;
  due_date?: string;
  naics?: string;
  set_aside?: string;
  value?: string;
  source?: string;
}

interface Props {
  contract: ContractRef;
  compact?: boolean;
}

export function ContractContextCard({ contract, compact = false }: Props) {
  const dueDateStr = contract.due_date
    ? new Date(contract.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null;

  const daysUntilDue = contract.due_date
    ? Math.ceil((new Date(contract.due_date).getTime() - Date.now()) / 86400000)
    : null;

  const urgencyColor = daysUntilDue !== null
    ? daysUntilDue <= 7  ? 'text-red-600'
    : daysUntilDue <= 14 ? 'text-amber-600'
    : 'text-gray-500'
    : 'text-gray-500';

  if (compact) {
    return (
      <div className="inline-flex items-center gap-1.5 text-xs bg-gray-100 text-gray-700 border border-gray-200 rounded-lg px-2 py-1">
        <FileText className="w-3 h-3 text-gray-400" />
        <span className="font-medium truncate max-w-[200px]">{contract.title}</span>
        {contract.agency && <span className="text-gray-400">· {contract.agency}</span>}
        {contract.id && (
          <Link href={`/contracts/${contract.id}`} className="text-blue-500 hover:text-blue-700 flex-shrink-0">
            <ExternalLink className="w-3 h-3" />
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />
      <div className="px-4 py-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-start gap-2">
            <FileText className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
            <h3 className="text-sm font-bold text-gray-900 leading-snug">{contract.title}</h3>
          </div>
          {contract.id && (
            <Link href={`/contracts/${contract.id}`}
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 flex-shrink-0 border border-blue-200 px-2 py-1 rounded-lg">
              <ExternalLink className="w-3 h-3" />View
            </Link>
          )}
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-500">
          {contract.agency && (
            <div className="flex items-center gap-1.5">
              <Building2 className="w-3 h-3 text-gray-400" />{contract.agency}
            </div>
          )}
          {dueDateStr && (
            <div className={`flex items-center gap-1.5 ${urgencyColor}`}>
              <Calendar className="w-3 h-3" />
              {dueDateStr}
              {daysUntilDue !== null && daysUntilDue > 0 && ` (${daysUntilDue}d)`}
              {daysUntilDue !== null && daysUntilDue <= 0 && ' (closed)'}
            </div>
          )}
          {contract.naics && (
            <div className="flex items-center gap-1.5">
              <Tag className="w-3 h-3 text-gray-400" />NAICS {contract.naics}
            </div>
          )}
          {contract.value && (
            <div className="flex items-center gap-1.5">
              <DollarSign className="w-3 h-3 text-gray-400" />{contract.value}
            </div>
          )}
        </div>

        {contract.set_aside && (
          <div className="mt-1.5">
            <span className="text-[10px] font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
              {contract.set_aside}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
