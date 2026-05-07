// ============================================================
// CONSOLIDATED INGESTION RUNNER
//
// Runs every data source for the discovery pipeline:
//   FEDERAL: SAM.gov API
//   STATE:   PA eMarketplace, PA Treasury
//   LOCAL:   Allegheny County API, City of Pittsburgh (Bonfire),
//            URA, Housing Authority
//   EDU:     Pitt, CMU, CCAC, Pittsburgh Public Schools, Duquesne
//
// Each source runs in isolation — one failure can't take down the rest.
// ============================================================

import { scrapeSAMGov } from './samgov';
import { scrapeAlleghenyCounty } from './allegheny_county';
import { scrapeEMarketplace } from './pa_emarketplace';
import { scrapePaTreasury } from './pa_treasury';
import { scrapePittsburghCity } from './pittsburgh_city';
import { scrapeURA } from './ura';
import { scrapeHousingAuthority } from './housing_authority';
import { scrapeEducationSite } from './education/_helpers';
import { upsertOpportunities, upsertAwards } from '@/lib/db/upsert';
import type { ScraperResult } from './shared/normalize_shared';

export interface IngestionRunResult {
  timestamp: string;
  results: ScraperResult[];
  totalOpportunities: number;
  totalAwards: number;
  errors: string[];
  durationMs: number;
  perSource: Record<string, { opportunities: number; awards: number; errors: number }>;
}

async function runOne(
  label: string,
  source: string,
  perSource: IngestionRunResult['perSource'],
  totalErrors: string[],
  fn: () => Promise<ScraperResult | { source: string; opportunities: any[]; errors: string[]; durationMs: number }>,
  saveOpportunities: boolean,
): Promise<{ opps: number; awards: number }> {
  let opps = 0;
  let awards = 0;
  try {
    const result = await fn();
    if (saveOpportunities && Array.isArray(result.opportunities) && result.opportunities.length > 0) {
      const { inserted, errors } = await upsertOpportunities(result.opportunities as any, source as any);
      opps += inserted;
      totalErrors.push(...result.errors, ...errors);
      console.log(`[ingestion] ${label}: ${inserted} opportunities saved (errors: ${errors.length})`);
    } else {
      totalErrors.push(...result.errors);
      console.log(`[ingestion] ${label}: 0 opportunities (errors: ${result.errors.length})`);
    }
    perSource[source] = { opportunities: opps, awards, errors: result.errors.length };
  } catch (err) {
    const msg = `${label} failed: ${err instanceof Error ? err.message : String(err)}`;
    console.error(`[ingestion] ${msg}`);
    totalErrors.push(msg);
    perSource[source] = { opportunities: 0, awards: 0, errors: 1 };
  }
  return { opps, awards };
}

export async function runFullIngestion(): Promise<IngestionRunResult> {
  const start = Date.now();
  const results: ScraperResult[] = [];
  const allErrors: string[] = [];
  let totalOpportunities = 0;
  let totalAwards = 0;
  const perSource: IngestionRunResult['perSource'] = {};

  console.log('[ingestion] Starting full ingestion run...');

  // ---- FEDERAL: SAM.gov ----
  const sam = await runOne('SAM.gov', 'federal_samgov', perSource, allErrors, scrapeSAMGov, true);
  totalOpportunities += sam.opps;

  // ---- LOCAL: Allegheny County (writes to contract_awards) ----
  try {
    const alleghenyResult = await scrapeAlleghenyCounty();
    results.push(alleghenyResult);
    const awards = (alleghenyResult as any).awards || [];
    if (awards.length > 0) {
      const { inserted, errors } = await upsertAwards(awards, 'local_allegheny');
      totalAwards += inserted;
      allErrors.push(...alleghenyResult.errors, ...errors);
      perSource['local_allegheny'] = { opportunities: 0, awards: inserted, errors: errors.length };
      console.log(`[ingestion] Allegheny County: ${inserted} awards saved`);
    } else {
      allErrors.push(...alleghenyResult.errors);
      perSource['local_allegheny'] = { opportunities: 0, awards: 0, errors: alleghenyResult.errors.length };
    }
  } catch (err) {
    allErrors.push(`Allegheny County: ${err instanceof Error ? err.message : String(err)}`);
    perSource['local_allegheny'] = { opportunities: 0, awards: 0, errors: 1 };
  }

  // ---- STATE ----
  totalOpportunities += (await runOne('PA eMarketplace', 'state_pa_emarketplace', perSource, allErrors, scrapeEMarketplace, true)).opps;
  totalOpportunities += (await runOne('PA Treasury', 'state_pa_treasury', perSource, allErrors, scrapePaTreasury, true)).opps;

  // ---- LOCAL (active solicitations) ----
  totalOpportunities += (await runOne('City of Pittsburgh (Bonfire)', 'local_pittsburgh', perSource, allErrors, scrapePittsburghCity, true)).opps;
  totalOpportunities += (await runOne('URA', 'local_ura', perSource, allErrors, scrapeURA, true)).opps;
  totalOpportunities += (await runOne('Housing Authority', 'local_housing_authority', perSource, allErrors, scrapeHousingAuthority, true)).opps;

  // ---- EDUCATION ----
  const eduSites = [
    {
      label: 'University of Pittsburgh',
      source: 'education_pitt',
      agency: 'University of Pittsburgh',
      urls: [
        'https://www.cfo.pitt.edu/pexpress/business/bid_opportunities.html',
        'https://www.pitt.edu/business',
      ],
      city: 'Pittsburgh',
      zip: '15260',
    },
    {
      label: 'Carnegie Mellon University',
      source: 'education_cmu',
      agency: 'Carnegie Mellon University',
      urls: [
        'https://www.cmu.edu/finance/procurement/suppliers/index.html',
        'https://www.cmu.edu/finance/procurement/',
      ],
      city: 'Pittsburgh',
      zip: '15213',
    },
    {
      label: 'CCAC',
      source: 'education_ccac',
      agency: 'Community College of Allegheny County',
      urls: [
        'https://www.ccac.edu/about/purchasing.aspx',
        'https://www.ccac.edu/business/purchasing.aspx',
      ],
      city: 'Pittsburgh',
      zip: '15212',
    },
    {
      label: 'Pittsburgh Public Schools',
      source: 'education_pgh_schools',
      agency: 'Pittsburgh Public Schools',
      urls: [
        'https://www.pghschools.org/Page/8',
        'https://www.pghschools.org/Page/35',
      ],
      city: 'Pittsburgh',
      zip: '15213',
    },
    {
      label: 'Duquesne University',
      source: 'education_duquesne',
      agency: 'Duquesne University',
      urls: [
        'https://www.duq.edu/about/administration/finance-and-business-operations/procurement-services',
      ],
      city: 'Pittsburgh',
      zip: '15282',
    },
  ];

  for (const site of eduSites) {
    try {
      const result = await scrapeEducationSite({
        source: site.source as any,
        agency: site.agency,
        urls: site.urls,
        city: site.city,
        zip: site.zip,
      });
      if (result.opportunities.length > 0) {
        const { inserted, errors } = await upsertOpportunities(result.opportunities as any, site.source as any);
        totalOpportunities += inserted;
        allErrors.push(...result.errors, ...errors);
        perSource[site.source] = { opportunities: inserted, awards: 0, errors: errors.length };
        console.log(`[ingestion] ${site.label}: ${inserted} opportunities saved`);
      } else {
        allErrors.push(...result.errors);
        perSource[site.source] = { opportunities: 0, awards: 0, errors: result.errors.length };
        console.log(`[ingestion] ${site.label}: 0 opportunities`);
      }
    } catch (err) {
      const msg = `${site.label} failed: ${err instanceof Error ? err.message : String(err)}`;
      console.error(`[ingestion] ${msg}`);
      allErrors.push(msg);
      perSource[site.source] = { opportunities: 0, awards: 0, errors: 1 };
    }
  }

  const durationMs = Date.now() - start;
  console.log(`[ingestion] Run complete: ${totalOpportunities} opps, ${totalAwards} awards, ${allErrors.length} errors, ${durationMs}ms`);

  return {
    timestamp: new Date().toISOString(),
    results,
    totalOpportunities,
    totalAwards,
    errors: allErrors,
    durationMs,
    perSource,
  };
}

export async function runFederalIngestion(): Promise<ScraperResult> {
  return await scrapeSAMGov();
}

export async function runLocalIngestion(): Promise<IngestionRunResult> {
  return runFullIngestion();
}
