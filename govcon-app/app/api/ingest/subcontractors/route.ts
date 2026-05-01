export const dynamic = 'force-dynamic';

// ============================================================
// POST /api/ingest/subcontractors
// Runs all subcontractor scrapers, upserts to contacts table.
// Secured by x-ingest-secret header.
// Sources: SAM.gov Entity API, SBA DSBS, PA MWBE directory
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { scrapeSamGovEntities } from '@/lib/ingestion/subcontractors/samgov_entities';
import { scrapeSbaDsbs } from '@/lib/ingestion/subcontractors/sba_dsbs';
import { scrapePaMwbe } from '@/lib/ingestion/subcontractors/pa_mwbe';

interface SubcontractorContact {
  company_name: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  naics_codes: number[];
  sam_registered: boolean;
  cage_code?: string;
  certifications: string[];
  capabilities?: string;
  website?: string;
  city?: string;
  state?: string;
  zip?: string;
  source: string;
}

interface ScraperResult {
  source: string;
  contacts: SubcontractorContact[];
  errors: string[];
  durationMs: number;
}

const INGEST_SECRET = process.env.INGEST_SECRET ?? '';
const UPSERT_BATCH = 50;

/**
 * Upserts a batch of contacts to the database
 */
async function upsertBatch(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  batch: SubcontractorContact[],
): Promise<{ inserted: number; updated: number; errors: string[] }> {
  const errors: string[] = [];
  let inserted = 0;
  let updated = 0;

  for (const contact of batch) {
    try {
      // Check for existing record by dedup criteria
      let existingQuery = supabase
        .from('contacts')
        .select('id')
        .eq('company_name', contact.company_name);

      // If we have a CAGE code, use that as primary dedup
      if (contact.cage_code) {
        existingQuery = existingQuery.eq('cage_code', contact.cage_code);
      } else {
        // Otherwise use company_name + zip for dedup
        existingQuery = existingQuery.eq('zip', contact.zip || '');
      }

      const { data: existing, error: existingError } = await existingQuery.maybeSingle();

      if (existingError) {
        errors.push(`Query error (${contact.company_name.slice(0, 40)}): ${existingError.message}`);
        continue;
      }

      if (existing) {
        // Update existing record
        const updateData: any = {
          contact_name: contact.contact_name || null,
          email: contact.email || null,
          phone: contact.phone || null,
          naics_codes: contact.naics_codes.length > 0 ? contact.naics_codes : null,
          sam_registered: contact.sam_registered,
          cage_code: contact.cage_code || null,
          certifications: contact.certifications.length > 0 ? contact.certifications : null,
          capabilities: contact.capabilities || null,
          website: contact.website || null,
          city: contact.city || null,
          state: contact.state || null,
          zip: contact.zip || null,
          updated_at: new Date().toISOString(),
        };

        const { error: updateError } = await supabase
          .from('contacts')
          .update(updateData)
          .eq('id', existing.id);

        if (updateError) {
          if (updateError.code === '23505') {
            // Unique constraint violation - treat as update
            updated++;
          } else {
            errors.push(`Update error (${contact.company_name.slice(0, 40)}): ${updateError.message}`);
          }
        } else {
          updated++;
        }
      } else {
        // Insert new record
        const insertData: any = {
          company_name: contact.company_name,
          contact_name: contact.contact_name || null,
          email: contact.email || null,
          phone: contact.phone || null,
          naics_codes: contact.naics_codes.length > 0 ? contact.naics_codes : null,
          sam_registered: contact.sam_registered,
          cage_code: contact.cage_code || null,
          certifications: contact.certifications.length > 0 ? contact.certifications : null,
          capabilities: contact.capabilities || null,
          website: contact.website || null,
          city: contact.city || null,
          state: contact.state || null,
          zip: contact.zip || null,
          source: contact.source,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const { error: insertError } = await supabase.from('contacts').insert(insertData);

        if (insertError) {
          if (insertError.code === '23505') {
            // Unique constraint violation - treat as update
            updated++;
          } else {
            errors.push(`Insert error (${contact.company_name.slice(0, 40)}): ${insertError.message}`);
          }
        } else {
          inserted++;
        }
      }
    } catch (err) {
      errors.push(`Upsert fatal (${contact.company_name.slice(0, 40)}): ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return { inserted, updated, errors };
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Auth check
  const secret = req.headers.get('x-ingest-secret') ?? '';
  if (INGEST_SECRET && secret !== INGEST_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServerSupabaseClient();
  const runStart = Date.now();

  console.log('[ingest/subcontractors] Starting all subcontractor scrapers…');

  // Run all 3 scrapers in parallel — one failure doesn't block others
  const [samGovResult, sbaResult, paResult] = await Promise.allSettled([
    scrapeSamGovEntities(),
    scrapeSbaDsbs(),
    scrapePaMwbe(),
  ]);

  const results: ScraperResult[] = [samGovResult, sbaResult, paResult].map((r) =>
    r.status === 'fulfilled' ? r.value : {
      source: 'unknown',
      contacts: [],
      errors: [r.reason instanceof Error ? r.reason.message : String(r.reason)],
      durationMs: 0,
    }
  );

  // Aggregate all contacts
  const allContacts: SubcontractorContact[] = results.flatMap((r) => r.contacts);
  console.log(`[ingest/subcontractors] Total scraped: ${allContacts.length}`);

  // Remove duplicates across sources (same company_name + cage_code or company_name + zip)
  const uniqueContacts = new Map<string, SubcontractorContact>();
  for (const contact of allContacts) {
    const key = contact.cage_code 
      ? `${contact.company_name}:${contact.cage_code}`
      : `${contact.company_name}:${contact.zip || ''}`;
    
    // Keep the most complete record (prefer SAM.gov data)
    if (!uniqueContacts.has(key) || contact.source === 'samgov_entities') {
      uniqueContacts.set(key, contact);
    }
  }

  const dedupedContacts = Array.from(uniqueContacts.values());
  console.log(`[ingest/subcontractors] After deduplication: ${dedupedContacts.length}`);

  // Upsert in batches
  let totalInserted = 0;
  let totalUpdated = 0;
  const allErrors: string[] = [];

  for (let i = 0; i < dedupedContacts.length; i += UPSERT_BATCH) {
    const batch = dedupedContacts.slice(i, i + UPSERT_BATCH);
    const { inserted, updated, errors } = await upsertBatch(supabase, batch);
    totalInserted += inserted;
    totalUpdated += updated;
    allErrors.push(...errors);
  }

  // Per-source summary
  const summary = results.map((r) => ({
    source: r.source,
    scraped: r.contacts.length,
    errors: r.errors,
    durationMs: r.durationMs,
  }));

  const totalMs = Date.now() - runStart;
  console.log(`[ingest/subcontractors] Done — inserted: ${totalInserted}, updated: ${totalUpdated}, errors: ${allErrors.length} (${totalMs}ms)`);

  return NextResponse.json({
    records_inserted: totalInserted,
    records_updated: totalUpdated,
    scrape_errors: allErrors.length,
    total_duration_ms: totalMs,
    sources: summary,
    total_scraped: allContacts.length,
    unique_contacts: dedupedContacts.length,
  }, { status: 200 });
}

// Also support GET for manual testing
export async function GET(req: NextRequest): Promise<NextResponse> {
  return POST(req);
}
