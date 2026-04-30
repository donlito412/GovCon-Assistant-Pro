'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { useBid, type BidRecord } from '../../../lib/api/bids';
import { BidDetailPanel } from '../../../components/bids/BidDetailPanel';

// ============================================================
// BID DETAIL PAGE — /bids/[bidId]
// ============================================================

export default function BidDetailPage() {
  const { bidId } = useParams<{ bidId: string }>();
  const router = useRouter();

  const { bid, isLoading, error, mutate } = useBid(bidId ? parseInt(bidId) : null);

  if (isLoading) return (
    <div className="flex items-center justify-center py-20 text-gray-400">
      <Loader2 className="w-5 h-5 animate-spin mr-2" />
      <span className="text-sm">Loading bid…</span>
    </div>
  );

  if (error || !bid) return (
    <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 max-w-lg">
      <AlertCircle className="w-5 h-5" />
      <span className="text-sm">Bid not found.</span>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <button onClick={() => router.back()}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition">
        <ArrowLeft className="w-4 h-4" />Back to Bids
      </button>

      <BidDetailPanel
        bid={bid}
        onUpdated={(updated: BidRecord) => mutate(updated, false)}
      />
    </div>
  );
}
