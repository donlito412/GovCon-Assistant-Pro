'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { MapPin, Building2, CheckCircle2, Users, ChevronRight, UserPlus } from 'lucide-react';
import {
  activeCertLabels, LOOKING_FOR_LABELS,
  type CommunityProfile,
} from '@/lib/api/community';
import { ConnectionRequest } from './ConnectionRequest';

// ============================================================
// BUSINESS PROFILE CARD — directory listing card
// ============================================================

interface Props {
  profile: CommunityProfile;
  myProfileId?: number;
}

export function BusinessProfileCard({ profile, myProfileId }: Props) {
  const [showConnect, setShowConnect] = useState(false);
  const certs = activeCertLabels(profile.certifications);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition overflow-hidden">
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-start justify-between gap-2 mb-1">
          <div className="flex flex-wrap gap-1">
            {profile.is_verified && (
              <span className="flex items-center gap-1 text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                <CheckCircle2 className="w-2.5 h-2.5" />Verified
              </span>
            )}
            {profile.sam_registered && (
              <span className="text-[10px] font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">SAM</span>
            )}
          </div>
          <Link href={`/community/${profile.id}`}
            className="text-gray-300 hover:text-gray-600 transition flex-shrink-0">
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <h3 className="text-sm font-bold text-gray-900 leading-tight">{profile.business_name}</h3>
        {profile.owner_name && (
          <p className="text-xs text-gray-500 mt-0.5">{profile.owner_name}</p>
        )}
      </div>

      <div className="px-4 pb-2 space-y-1">
        {(profile.neighborhood || profile.city) && (
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <MapPin className="w-3.5 h-3.5 text-gray-400" />
            {profile.neighborhood ?? profile.city}
          </div>
        )}
        {profile.industry && (
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Building2 className="w-3.5 h-3.5 text-gray-400" />
            {profile.industry}
          </div>
        )}
        {profile.employee_count_range && (
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Users className="w-3.5 h-3.5 text-gray-400" />
            {profile.employee_count_range} employee{profile.employee_count_range !== '1' ? 's' : ''}
          </div>
        )}
      </div>

      {certs.length > 0 && (
        <div className="px-4 pb-2 flex flex-wrap gap-1">
          {certs.map((c) => (
            <span key={c} className="text-[10px] font-bold bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full">{c}</span>
          ))}
        </div>
      )}

      {profile.looking_for?.length > 0 && (
        <div className="px-4 pb-2 flex flex-wrap gap-1">
          {profile.looking_for.slice(0, 2).map((l) => (
            <span key={l} className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-full">
              {LOOKING_FOR_LABELS[l] ?? l}
            </span>
          ))}
        </div>
      )}

      {myProfileId && myProfileId !== profile.id && (
        <div className="border-t border-gray-100 px-4 py-2.5">
          {showConnect ? (
            <ConnectionRequest
              toProfile={profile}
              fromProfileId={myProfileId}
              onSent={() => setShowConnect(false)}
              onCancel={() => setShowConnect(false)}
            />
          ) : (
            <button
              onClick={() => setShowConnect(true)}
              className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-blue-700 border border-gray-200 hover:border-blue-300 px-3 py-1.5 rounded-lg transition w-full justify-center"
            >
              <UserPlus className="w-3.5 h-3.5" />Connect
            </button>
          )}
        </div>
      )}
    </div>
  );
}
