// ============================================================
// UNIFIED COMPANY SEARCH
// Queries SAM.gov + Google Places + Brave Web Search in parallel.
// Merges, deduplicates, and ranks results.
// source priority: SAM first if certification required, else relevance.
// ============================================================

import { searchSamGovEntities, type SamGovEntity } from './samgov_entities';
import { searchGooglePlaces, type GooglePlacesResult } from './google_places';

// ---- Shared result type ----

export interface CompanyResult {
  id: string;             // synthetic: `${source}:${uei||place_id||idx}`
  company_name: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  website?: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  source: 'samgov' | 'google_places' | 'web_search' | 'manual';
  sam_registered: boolean;
  uei?: string;
  naics_codes?: string[];
  certifications?: Record<string, boolean>;
  category?: string;
  rating?: number;
  score: number;
}

export interface CompanySearchParams {
  query: string;
  naicsCode?: string;
  location?: string;
  requireCertified?: boolean;
  certificationTypes?: string[];  // ['8a','hubzone',...]
  limit?: number;
}

// ---- Brave/Web search fallback ----

interface WebSearchResult {
  company_name: string;
  website?: string;
  description?: string;
  source: 'web_search';
  sam_registered: false;
  score: number;
}

async function searchWeb(query: string, location: string): Promise<{ results: WebSearchResult[]; errors: string[] }> {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY ?? process.env.SEARCH_API_KEY ?? '';
  if (!apiKey) return { results: [], errors: ['BRAVE_SEARCH_API_KEY not set — web search skipped'] };

  const errors: string[] = [];
  const results: WebSearchResult[] = [];

  try {
    const res = await fetch(
      `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(`${query} ${location} company`)}`,
      {
        headers: { Accept: 'application/json', 'Accept-Encoding': 'gzip', 'X-Subscription-Token': apiKey },
        signal: AbortSignal.timeout(15_000),
      }
    );

    if (!res.ok) {
      errors.push(`Brave Search HTTP ${res.status}`);
      return { results, errors };
    }

    const json = await res.json();
    const hits: any[] = json?.web?.results ?? [];

    hits.slice(0, 10).forEach((hit: any, idx: number) => {
      const name = hit.title?.replace(/\s*[|-].*$/, '').trim() ?? '';
      if (!name || name.length < 4) return;
      results.push({
        company_name: name,
        website:      hit.url || undefined,
        description:  hit.description?.slice(0, 200) || undefined,
        source:       'web_search',
        sam_registered: false,
        score:        Math.max(0, 50 - idx * 5),
      });
    });
  } catch (err) {
    errors.push(`Brave fatal: ${err instanceof Error ? err.message : String(err)}`);
  }

  return { results, errors };
}

// ---- Deduplication ----

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
}

function deduplicate(results: CompanyResult[]): CompanyResult[] {
  const seen = new Map<string, CompanyResult>();
  for (const r of results) {
    const key = normalize(r.company_name).split(' ').slice(0, 3).join(' ');
    const existing = seen.get(key);
    if (!existing) {
      seen.set(key, r);
    } else if (r.score > existing.score || r.sam_registered) {
      // Merge extra data from higher-scored / SAM result
      seen.set(key, { ...existing, ...r, score: Math.max(r.score, existing.score) });
    }
  }
  return [...seen.values()];
}

// ---- Main unified search ----

export async function searchCompanies(params: CompanySearchParams): Promise<{
  results: CompanyResult[];
  errors: string[];
  sources: { samgov: number; google_places: number; web_search: number };
}> {
  const location = params.location ?? 'Pittsburgh, PA';
  const allErrors: string[] = [];

  // Run all sources in parallel
  const [samResult, placesResult, webResult] = await Promise.allSettled([
    searchSamGovEntities({
      query:                params.query,
      naicsCode:            params.naicsCode,
      state:                'PA',
      requireCertification: params.certificationTypes?.[0],
      limit:                params.limit ?? 20,
    }),
    searchGooglePlaces({
      query:    params.query,
      location,
      limit:    params.limit ?? 20,
    }),
    searchWeb(params.query, location),
  ]);

  const samEntities:   SamGovEntity[]    = samResult.status    === 'fulfilled' ? samResult.value.results    : [];
  const placesEntities: GooglePlacesResult[] = placesResult.status === 'fulfilled' ? placesResult.value.results : [];
  const webEntities:   WebSearchResult[] = webResult.status    === 'fulfilled' ? webResult.value.results    : [];

  if (samResult.status === 'fulfilled')    allErrors.push(...samResult.value.errors);
  if (placesResult.status === 'fulfilled') allErrors.push(...placesResult.value.errors);
  if (webResult.status === 'fulfilled')    allErrors.push(...webResult.value.errors);
  if (samResult.status === 'rejected')     allErrors.push(`SAM.gov rejected: ${samResult.reason}`);
  if (placesResult.status === 'rejected')  allErrors.push(`Google Places rejected: ${placesResult.reason}`);
  if (webResult.status === 'rejected')     allErrors.push(`Web search rejected: ${webResult.reason}`);

  // Normalize to CompanyResult[]
  const combined: CompanyResult[] = [
    ...samEntities.map((e, idx): CompanyResult => ({
      id:             `samgov:${e.uei || idx}`,
      company_name:   e.company_name,
      contact_name:   e.contact_name,
      email:          e.email,
      phone:          e.phone,
      website:        e.website,
      address:        e.address,
      city:           e.city,
      state:          e.state,
      zip:            e.zip,
      source:         'samgov',
      sam_registered: true,
      uei:            e.uei,
      naics_codes:    e.naics_codes,
      certifications: e.certifications,
      score:          e.score,
    })),

    ...placesEntities.map((p, idx): CompanyResult => ({
      id:             `google_places:${p.place_id}`,
      company_name:   p.company_name,
      address:        p.address,
      city:           p.city,
      state:          p.state,
      zip:            p.zip,
      phone:          p.phone,
      website:        p.website,
      category:       p.category,
      rating:         p.rating,
      source:         'google_places',
      sam_registered: false,
      score:          p.score,
    })),

    ...webEntities.map((w, idx): CompanyResult => ({
      id:             `web_search:${idx}`,
      company_name:   w.company_name,
      address:        '',
      city:           location.split(',')[0].trim(),
      state:          'PA',
      zip:            '',
      website:        w.website,
      source:         'web_search',
      sam_registered: false,
      score:          w.score,
    })),
  ];

  const deduped = deduplicate(combined);

  // Sort: if certification required → SAM first, then by score
  const sorted = deduped.sort((a, b) => {
    if (params.requireCertified) {
      if (a.sam_registered && !b.sam_registered) return -1;
      if (!a.sam_registered && b.sam_registered) return 1;
    }
    return b.score - a.score;
  });

  return {
    results: sorted.slice(0, params.limit ?? 20),
    errors:  allErrors,
    sources: {
      samgov:        samEntities.length,
      google_places: placesEntities.length,
      web_search:    webEntities.length,
    },
  };
}
