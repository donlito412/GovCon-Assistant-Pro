// ============================================================
// GRANTS.GOV API CLIENT
// API: https://grants.gov/api/common/search2
// POST, no auth, filter PA + small business eligibility
// source = "federal_grantsgov"
// ============================================================

import { createHash } from 'crypto';
import type { GrantRecord, GrantIngestionResult } from './types';

const SOURCE = 'federal_grantsgov' as const;
const API_URL = 'https://grants.gov/api/common/search2';
const PAGE_SIZE = 25;
const MAX_PAGES = 10; // up to 250 grants

function dedupHash(title: string, agency: string, deadline: string | null): string {
  const t = (title ?? '').toLowerCase().trim();
  const a = (agency ?? '').toLowerCase().trim();
  const d = deadline ? deadline.split('T')[0] : '';
  return createHash('sha256').update(`${t}${a}${d}`, 'utf8').digest('hex');
}

function parseCloseDate(raw: string | null | undefined): string | undefined {
  if (!raw) return undefined;
  // Grants.gov returns dates as "MM/DD/YYYY"
  const mdyMatch = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdyMatch) {
    const [, m, d, y] = mdyMatch;
    return new Date(parseInt(y), parseInt(m) - 1, parseInt(d)).toISOString();
  }
  const d = new Date(raw);
  return isNaN(d.getTime()) ? undefined : d.toISOString();
}

function parseCents(val: string | number | null | undefined): number | undefined {
  if (val == null || val === '') return undefined;
  const n = typeof val === 'number' ? val : parseFloat(String(val).replace(/[^0-9.]/g, ''));
  return isNaN(n) || n <= 0 ? undefined : Math.round(n * 100);
}

function mapEligibility(raw: string[] | string | null | undefined): string[] {
  if (!raw) return ['any'];
  const arr = Array.isArray(raw) ? raw : [raw];
  const result = new Set<string>();
  for (const e of arr) {
    const lower = e.toLowerCase();
    if (lower.includes('small') || lower.includes('business')) result.add('small_business');
    if (lower.includes('nonprofit') || lower.includes('non-profit')) result.add('nonprofit');
    if (lower.includes('individual')) result.add('individual');
    if (lower.includes('government') || lower.includes('municipality')) result.add('municipality');
  }
  return result.size > 0 ? [...result] : ['any'];
}

export async function ingestGrantsGov(): Promise<GrantIngestionResult> {
  const start = Date.now();
  const grants: GrantRecord[] = [];
  const errors: string[] = [];
  let page = 0;

  while (page < MAX_PAGES) {
    try {
      const body = {
        rows: PAGE_SIZE,
        startRecordNum: page * PAGE_SIZE,
        oppStatuses: 'forecasted|posted',
        sortBy: 'openDate|desc',
        // Filter to PA or national eligibility (no state restriction to catch national programs)
        // We'll post-filter to include PA-eligible + national
        eligibilities: 'small_business',
      };

      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(30_000),
      });

      if (!res.ok) {
        errors.push(`Grants.gov HTTP ${res.status} on page ${page}`);
        break;
      }

      const json = await res.json();
      const hits: any[] = json?.data?.oppHits ?? json?.oppHits ?? [];
      if (!hits.length) break;

      for (const hit of hits) {
        try {
          const title    = (hit.title ?? hit.opportunityTitle ?? '').trim();
          const agency   = (hit.agencyName ?? hit.agencyCode ?? '').trim();
          const deadline = parseCloseDate(hit.closeDate ?? hit.applicationDeadline);
          if (!title) continue;

          const hash = dedupHash(title, agency, deadline ?? null);
          grants.push({
            source:               SOURCE,
            category:             'federal',
            title,
            agency,
            grant_type:           'grant',
            eligible_entities:    mapEligibility(hit.eligibilities ?? hit.eligibility),
            min_amount:           parseCents(hit.awardFloor ?? hit.awardFloorFormatted),
            max_amount:           parseCents(hit.awardCeiling ?? hit.awardCeilingFormatted),
            application_deadline: deadline,
            posted_date:          parseCloseDate(hit.openDate ?? hit.postDate),
            description:          (hit.synopsis ?? hit.description ?? '').slice(0, 3000) || undefined,
            requirements:         undefined,
            how_to_apply:         hit.applicantTypes ? `Apply via Grants.gov. Eligible applicants: ${hit.applicantTypes}` : 'Apply at grants.gov',
            url:                  hit.opportunityId ? `https://www.grants.gov/web/grants/view-opportunity.html?oppId=${hit.opportunityId}` : 'https://www.grants.gov',
            dedup_hash:           hash,
            external_id:          String(hit.opportunityId ?? hit.id ?? ''),
            status:               'active',
          });
        } catch (rowErr) {
          errors.push(`Row parse: ${rowErr instanceof Error ? rowErr.message : String(rowErr)}`);
        }
      }

      if (hits.length < PAGE_SIZE) break; // last page
      page++;
    } catch (err) {
      errors.push(`Page ${page} fatal: ${err instanceof Error ? err.message : String(err)}`);
      break;
    }
  }

  console.log(`[grantsgov] ${grants.length} fetched, ${errors.length} errors (${Date.now() - start}ms)`);
  return { source: SOURCE, grants, errors, durationMs: Date.now() - start };
}
