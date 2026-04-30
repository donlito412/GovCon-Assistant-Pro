'use client';

import React, { useState } from 'react';
import { Plus, Trash2, Users, ChevronDown, ChevronUp } from 'lucide-react';
import type { TeamMember } from '../../lib/api/bids';

// ============================================================
// BID TEAM BUILDER — assemble subcontractor team for a bid
// ============================================================

interface Props {
  value: TeamMember[];
  onChange: (members: TeamMember[]) => void;
}

const ROLE_OPTIONS = ['prime', 'sub', 'joint_venture'] as const;

const CERT_OPTIONS = ['8(a)', 'HUBZone', 'SDVOSB', 'WOSB', 'EDWOSB', 'MBE/WBE'];

function MemberRow({
  member, index, onChange, onRemove,
}: {
  member: TeamMember; index: number;
  onChange: (m: TeamMember) => void;
  onRemove: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const upd = (patch: Partial<TeamMember>) => onChange({ ...member, ...patch });

  const toggleCert = (cert: string) => {
    const certs = member.certifications ?? [];
    upd({ certifications: certs.includes(cert) ? certs.filter((c) => c !== cert) : [...certs, cert] });
  };

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2.5 bg-gray-50">
        <span className="text-xs font-bold text-gray-400 w-5">{index + 1}</span>
        <input
          type="text"
          placeholder="Company name *"
          value={member.company_name}
          onChange={(e) => upd({ company_name: e.target.value })}
          className="flex-1 text-sm border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <select
          value={member.role}
          onChange={(e) => upd({ role: e.target.value as TeamMember['role'] })}
          className="text-sm border border-gray-300 rounded px-2 py-1.5 focus:outline-none"
        >
          {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r === 'joint_venture' ? 'JV' : r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
        </select>
        <div className="flex items-center gap-1">
          <input
            type="number"
            min={0} max={100}
            placeholder="%"
            value={member.percentage_of_work || ''}
            onChange={(e) => upd({ percentage_of_work: parseFloat(e.target.value) || 0 })}
            className="w-16 text-sm border border-gray-300 rounded px-2 py-1.5 text-center focus:outline-none"
          />
          <span className="text-xs text-gray-400">%</span>
        </div>
        <button
          onClick={() => setExpanded((e) => !e)}
          className="text-gray-400 hover:text-gray-700 p-1"
          title="Expand details"
        >
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
        <button onClick={onRemove} className="text-gray-300 hover:text-red-500 p-1">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {expanded && (
        <div className="px-4 py-3 space-y-3 border-t border-gray-100">
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">NAICS Code</label>
            <input
              type="text"
              placeholder="e.g. 541512"
              value={member.naics ?? ''}
              onChange={(e) => upd({ naics: e.target.value })}
              className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Certifications</label>
            <div className="flex flex-wrap gap-2">
              {CERT_OPTIONS.map((cert) => (
                <label key={cert} className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={(member.certifications ?? []).includes(cert)}
                    onChange={() => toggleCert(cert)}
                    className="accent-blue-600"
                  />
                  {cert}
                </label>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function BidTeamBuilder({ value, onChange }: Props) {
  const addMember = () => {
    onChange([...value, { company_name: '', role: 'sub', percentage_of_work: 0 }]);
  };

  const updateMember = (idx: number, m: TeamMember) => {
    const next = [...value];
    next[idx] = m;
    onChange(next);
  };

  const removeMember = (idx: number) => {
    onChange(value.filter((_, i) => i !== idx));
  };

  const totalPct = value.reduce((s, m) => s + (m.percentage_of_work || 0), 0);
  const allCerts = [...new Set(value.flatMap((m) => m.certifications ?? []))];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-gray-500 flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5" />Team Composition
        </label>
        <div className="flex items-center gap-3">
          {value.length > 0 && (
            <span className={`text-xs font-semibold ${totalPct > 100 ? 'text-red-500' : totalPct === 100 ? 'text-green-600' : 'text-gray-400'}`}>
              {totalPct}% allocated
            </span>
          )}
          <button
            type="button"
            onClick={addMember}
            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-semibold"
          >
            <Plus className="w-3.5 h-3.5" />Add Member
          </button>
        </div>
      </div>

      {value.length === 0 && (
        <p className="text-xs text-gray-400 text-center py-4 border border-dashed border-gray-200 rounded-xl">
          No team members yet — click "Add Member"
        </p>
      )}

      {value.map((m, idx) => (
        <MemberRow
          key={idx}
          member={m}
          index={idx}
          onChange={(updated) => updateMember(idx, updated)}
          onRemove={() => removeMember(idx)}
        />
      ))}

      {allCerts.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          <span className="text-xs text-gray-400 mr-1">Team certs:</span>
          {allCerts.map((c) => (
            <span key={c} className="text-xs bg-indigo-100 text-indigo-700 font-semibold px-2 py-0.5 rounded-full">{c}</span>
          ))}
        </div>
      )}
    </div>
  );
}
