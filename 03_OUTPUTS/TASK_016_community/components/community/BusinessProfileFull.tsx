'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  MapPin, Globe, Mail, Phone, Building2, Users, CheckCircle2,
  UserPlus, MessageSquare, Handshake, ExternalLink,
} from 'lucide-react';
import { activeCertLabels, LOOKING_FOR_LABELS, type CommunityProfile } from '../../lib/api/community';
import { ConnectionRequest } from './ConnectionRequest';
import { MessageThread } from './MessageThread';

// ============================================================
// BUSINESS PROFILE FULL VIEW — /community/[profileId]
// ============================================================

interface Props {
  profile: CommunityProfile;
  myProfileId?: number;
  isConnected?: boolean;
  connectionPending?: boolean;
}

export function BusinessProfileFull({ profile, myProfileId, isConnected, connectionPending }: Props) {
  const [showConnect,  setShowConnect]  = useState(false);
  const [showMessage,  setShowMessage]  = useState(false);
  const certs = activeCertLabels(profile.certifications);
  const isOwn = myProfileId === profile.id;

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-5">
        <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
          <div>
            <div className="flex flex-wrap gap-2 mb-1.5">
              {profile.is_verified && (
                <span className="flex items-center gap-1 text-xs font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                  <CheckCircle2 className="w-3 h-3" />Verified
                </span>
              )}
              {profile.sam_registered && (
                <span className="text-xs font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">SAM Registered</span>
              )}
              {profile.source === 'pa_corps_import' && !profile.is_verified && (
                <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">PA Corps Import — Unclaimed</span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-gray-900">{profile.business_name}</h1>
            {profile.owner_name && <p className="text-sm text-gray-500 mt-0.5">{profile.owner_name}</p>}
          </div>

          {!isOwn && myProfileId && (
            <div className="flex gap-2 flex-wrap">
              {isConnected ? (
                <button onClick={() => setShowMessage((s) => !s)}
                  className="flex items-center gap-1.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded-lg transition">
                  <MessageSquare className="w-4 h-4" />Message
                </button>
              ) : connectionPending ? (
                <span className="text-sm text-gray-400 border border-gray-200 px-3 py-2 rounded-lg">Request Pending</span>
              ) : (
                <button onClick={() => setShowConnect((s) => !s)}
                  className="flex items-center gap-1.5 text-sm font-semibold text-blue-600 border border-blue-200 hover:border-blue-400 px-3 py-2 rounded-lg transition">
                  <UserPlus className="w-4 h-4" />Connect
                </button>
              )}
              {profile.sam_uei && !profile.sam_uei.startsWith('PACORPS-') && (
                <Link href={`/contacts?uei=${profile.sam_uei}`}
                  className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 border border-gray-200 px-3 py-2 rounded-lg transition">
                  <ExternalLink className="w-4 h-4" />Sub Profile
                </Link>
              )}
            </div>
          )}
          {isOwn && (
            <Link href="/community/my-profile"
              className="text-sm text-blue-600 hover:text-blue-800 border border-blue-200 px-3 py-2 rounded-lg">
              Edit Profile
            </Link>
          )}
        </div>

        {showConnect && myProfileId && (
          <div className="mt-3 border-t border-gray-100 pt-3">
            <ConnectionRequest toProfile={profile} fromProfileId={myProfileId}
              onSent={() => setShowConnect(false)} onCancel={() => setShowConnect(false)} />
          </div>
        )}

        {/* Contact info (visible only to connected users or owner) */}
        <div className="mt-3 flex flex-wrap gap-4">
          {(isOwn || isConnected) && profile.email && (
            <a href={`mailto:${profile.email}`} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-blue-600">
              <Mail className="w-3.5 h-3.5 text-gray-400" />{profile.email}
            </a>
          )}
          {(isOwn || isConnected) && profile.phone && (
            <a href={`tel:${profile.phone}`} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-blue-600">
              <Phone className="w-3.5 h-3.5 text-gray-400" />{profile.phone}
            </a>
          )}
          {profile.website && (
            <a href={profile.website} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-blue-600">
              <Globe className="w-3.5 h-3.5 text-gray-400" />{profile.website.replace(/^https?:\/\//, '')}
            </a>
          )}
          {(profile.neighborhood || profile.city) && (
            <span className="flex items-center gap-1.5 text-xs text-gray-500">
              <MapPin className="w-3.5 h-3.5 text-gray-400" />
              {[profile.neighborhood, profile.city, profile.zip].filter(Boolean).join(', ')}
            </span>
          )}
        </div>
      </div>

      {/* Message thread (if connected and shown) */}
      {showMessage && myProfileId && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden h-80">
          <MessageThread withProfileId={profile.id} withProfileName={profile.business_name} myProfileId={myProfileId} />
        </div>
      )}

      {/* Details grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {profile.business_type && (
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">Business Type</p>
            <p className="text-sm font-bold text-gray-900">{profile.business_type === 'sole_prop' ? 'Sole Proprietor' : profile.business_type}</p>
          </div>
        )}
        {profile.employee_count_range && (
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">Employees</p>
            <p className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-gray-400" />{profile.employee_count_range}
            </p>
          </div>
        )}
        {profile.years_in_business && (
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">Years in Business</p>
            <p className="text-sm font-bold text-gray-900">{profile.years_in_business} yr{profile.years_in_business !== 1 ? 's' : ''}</p>
          </div>
        )}
      </div>

      {/* Bio */}
      {profile.bio && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-4">
          <h2 className="text-sm font-bold text-gray-900 mb-2">About</h2>
          <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{profile.bio}</p>
        </div>
      )}

      {/* Services */}
      {profile.services_offered?.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-4">
          <h2 className="text-sm font-bold text-gray-900 mb-3">Services Offered</h2>
          <div className="flex flex-wrap gap-2">
            {profile.services_offered.map((s) => (
              <span key={s} className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full font-medium">{s}</span>
            ))}
          </div>
        </div>
      )}

      {/* Certifications + Looking For */}
      {(certs.length > 0 || profile.looking_for?.length > 0 || profile.naics_codes?.length > 0) && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-4 space-y-3">
          {certs.length > 0 && (
            <div>
              <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Certifications</h2>
              <div className="flex flex-wrap gap-1.5">
                {certs.map((c) => (
                  <span key={c} className="text-xs font-bold bg-purple-100 text-purple-700 px-2.5 py-1 rounded-full">{c}</span>
                ))}
              </div>
            </div>
          )}
          {profile.naics_codes?.length > 0 && (
            <div>
              <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">NAICS Codes</h2>
              <div className="flex flex-wrap gap-1.5">
                {profile.naics_codes.map((n) => (
                  <span key={n} className="text-xs font-mono bg-gray-100 text-gray-700 px-2.5 py-1 rounded">{n}</span>
                ))}
              </div>
            </div>
          )}
          {profile.looking_for?.length > 0 && (
            <div>
              <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Looking For</h2>
              <div className="flex flex-wrap gap-1.5">
                {profile.looking_for.map((l) => (
                  <span key={l} className="text-xs text-gray-700 bg-gray-100 px-2.5 py-1 rounded-full">
                    <Handshake className="w-3 h-3 inline mr-1 text-gray-400" />
                    {LOOKING_FOR_LABELS[l] ?? l}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
