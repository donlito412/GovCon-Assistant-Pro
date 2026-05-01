'use client';
export const dynamic = 'force-dynamic';


import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { Loader2, UserCircle2, AlertCircle, Bell } from 'lucide-react';
import { ProfileSetupForm } from '@/components/community/ProfileSetupForm';
import { ConnectionRequestRespond } from '@/components/community/ConnectionRequest';
import { useConnections, type CommunityProfile, type ConnectionRequest } from '@/lib/api/community';

// ============================================================
// MY COMMUNITY PROFILE PAGE — /community/my-profile
// ============================================================

const fetcher = (url: string) => fetch(url).then((r) => {
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
});

export default function MyProfilePage() {
  const router = useRouter();
  const [saved, setSaved] = useState(false);

  const { data: profile, isLoading, error, mutate } = useSWR<CommunityProfile | null>(
    '/api/community/profiles/me', fetcher, { revalidateOnFocus: false }
  );

  const { data: connData, mutate: mutateConn } = useConnections();
  const pendingIn: ConnectionRequest[] = connData?.pending_in ?? [];

  if (isLoading) return (
    <div className="flex items-center justify-center py-20 text-gray-400">
      <Loader2 className="w-5 h-5 animate-spin mr-2" />
      <span className="text-sm">Loading…</span>
    </div>
  );

  if (error) return (
    <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 max-w-lg">
      <AlertCircle className="w-5 h-5" />
      <span className="text-sm">{error.message}</span>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <UserCircle2 className="w-6 h-6 text-blue-600" />
          {profile ? 'My Community Profile' : 'Set Up Community Profile'}
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {profile
            ? 'Update how other Pittsburgh businesses see you'
            : 'Join the Pittsburgh business community to find teaming partners and collaborate on bids'}
        </p>
      </div>

      {/* Pending connection requests */}
      {pendingIn.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-4 space-y-3">
          <h2 className="text-sm font-bold text-amber-800 flex items-center gap-2">
            <Bell className="w-4 h-4" />{pendingIn.length} Pending Connection Request{pendingIn.length !== 1 ? 's' : ''}
          </h2>
          {pendingIn.map((req) => (
            <div key={req.id} className="bg-white rounded-lg border border-amber-100 px-3 py-2">
              <ConnectionRequestRespond request={req} onResponded={() => mutateConn()} />
            </div>
          ))}
        </div>
      )}

      {saved && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-green-700 text-sm font-semibold">
          ✓ Profile saved successfully
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-5">
        <ProfileSetupForm
          existing={profile ?? undefined}
          onSaved={(p) => { setSaved(true); mutate(p, false); setTimeout(() => setSaved(false), 3000); }}
        />
      </div>

      {profile && (
        <div className="text-center">
          <button onClick={() => router.push(`/community/${profile.id}`)}
            className="text-sm text-blue-600 hover:text-blue-800 underline">
            View my public profile →
          </button>
        </div>
      )}
    </div>
  );
}
