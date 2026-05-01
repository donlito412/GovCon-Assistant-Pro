'use client';
export const dynamic = 'force-dynamic';


import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import useSWR from 'swr';
import {
  useCommunityProfile, useConnections, type CommunityProfile, type ConnectionRequest,
} from '@/lib/api/community';
import { BusinessProfileFull } from '@/components/community/BusinessProfileFull';

// ============================================================
// BUSINESS PROFILE PAGE — /community/[profileId]
// ============================================================

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function CommunityProfilePage() {
  const { profileId } = useParams<{ profileId: string }>();
  const router = useRouter();

  const { data: profile, isLoading, error } = useCommunityProfile(profileId ? parseInt(profileId) : null);
  const { data: myProfileData } = useSWR('/api/community/profiles/me', fetcher, { revalidateOnFocus: false });
  const { data: connData } = useConnections();

  const myProfileId: number | undefined = myProfileData?.id;
  const connections: ConnectionRequest[] = connData?.connections ?? [];
  const pendingOut: ConnectionRequest[]  = connData?.pending_out ?? [];

  const isConnected = connections.some(
    (c) => c.from_profile_id === parseInt(profileId) || c.to_profile_id === parseInt(profileId)
  );
  const connectionPending = pendingOut.some((c) => c.to_profile_id === parseInt(profileId));

  if (isLoading) return (
    <div className="flex items-center justify-center py-20 text-gray-400">
      <Loader2 className="w-5 h-5 animate-spin mr-2" />
      <span className="text-sm">Loading profile…</span>
    </div>
  );

  if (error || !profile) return (
    <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 max-w-lg">
      <AlertCircle className="w-5 h-5" />
      <span className="text-sm">Profile not found.</span>
    </div>
  );

  return (
    <div className="space-y-5">
      <button onClick={() => router.back()}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition">
        <ArrowLeft className="w-4 h-4" />Back to Community
      </button>

      <BusinessProfileFull
        profile={profile}
        myProfileId={myProfileId}
        isConnected={isConnected}
        connectionPending={connectionPending}
      />
    </div>
  );
}
