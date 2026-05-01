export const dynamic = 'force-dynamic';

import React from 'react';
import { notFound } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase';
import { ContractDetail } from '@/components/contracts/ContractDetail';
import type { Metadata } from 'next';

// ============================================================
// CONTRACT DETAIL PAGE — /contracts/[id]
// Server component: fetches data at render time.
// Renders ContractDetail client component with full data.
// ============================================================

interface PageProps {
  params: { id: string };
}

async function getContract(id: number) {
  try {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from('opportunities')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;
    return data;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const id = parseInt(params.id, 10);
  if (isNaN(id)) return { title: 'Contract Not Found' };

  const contract = await getContract(id);
  if (!contract) return { title: 'Contract Not Found' };

  return {
    title: `${contract.title} — GovCon Assistant Pro`,
    description: contract.description
      ? String(contract.description).slice(0, 160)
      : `Contract opportunity from ${contract.agency_name ?? 'Unknown Agency'}`,
  };
}

export default async function ContractDetailPage({ params }: PageProps) {
  const id = parseInt(params.id, 10);
  if (isNaN(id)) notFound();

  const contract = await getContract(id);
  if (!contract) notFound();

  return (
    <div className="max-w-4xl mx-auto">
      <ContractDetail contract={contract as any} />
    </div>
  );
}
