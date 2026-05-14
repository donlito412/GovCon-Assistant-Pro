export const dynamic = 'force-dynamic';

// ============================================================
// POST /api/ingest/state-local
//
// Restores the live state/local procurement ingest path:
//   STATE: PA eMarketplace, PA Treasury
//   LOCAL: Allegheny County, City of Pittsburgh, URA, HACP
//
// Each source runs independently so one broken site does not stop the
// rest of the procurement refresh.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { scrapeAlleghenyCounty } from '@/lib/ingestion/allegheny_county';
import { scrapeEMarketplace } from '@/lib/ingestion/pa_emarketplace';
import { scrapePaTreasury } from '@/lib/ingestion/pa_treasury';
import { scrapePittsburghCity } from '@/lib/ingestion/pittsburgh_city';
import { scrapeURA } from '@/lib/ingestion/ura';
import { scrapeHousingAuthority } from '@/lib/ingestion/housing_authority';
import { upsertAwards, upsertOpportunities } from '@/lib/db/upsert';
import type { ScraperResult } from '@/lib/ingestion/shared/normalize_shared';

interface ScraperSummary {
  source: string;
  totalScraped: number;
  totalSaved: number;
  dataType: 'opportunities' | 'awards';
  errors: string[];
  durationMs: number;
}

interface IngestSummary {
  success: boolean;
  scrapers: ScraperSummary[];
  totals: {
    opportunitiesScraped: number;
    opportunitiesSaved: number;
    awardsScraped: number;
    awardsSaved: number;
  };
  totalErrors: number;
  durationMs: number;
  note: string;
}

async function runOpportunitySource(
  scrape: () => Promise<ScraperResult>,
): Promise<ScraperSummary> {
  const result = await scrape();
  let totalSaved = 0;
  const errors = [...result.errors];

  if (result.opportunities.length > 0) {
    const saveResult = await upsertOpportunities(result.opportunities, result.source);
    totalSaved = saveResult.inserted;
    errors.push(...saveResult.errors);
  }

  return {
    source: result.source,
    totalScraped: result.opportunities.length,
    totalSaved,
    dataType: 'opportunities',
    errors,
    durationMs: result.durationMs,
  };
}

async function runAwardSource(
  scrape: () => Promise<ScraperResult>,
): Promise<ScraperSummary> {
  const result = await scrape();
  const awards = (result as ScraperResult & { awards?: unknown[] }).awards;
  const normalizedAwards = Array.isArray(awards) ? awards : [];
  let totalSaved = 0;
  const errors = [...result.errors];

  if (normalizedAwards.length > 0) {
    const saveResult = await upsertAwards(normalizedAwards as any[], result.source);
    totalSaved = saveResult.inserted;
    errors.push(...saveResult.errors);
  }

  return {
    source: result.source,
    totalScraped: normalizedAwards.length,
    totalSaved,
    dataType: 'awards',
    errors,
    durationMs: result.durationMs,
  };
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const startMs = Date.now();

  const ingestSecret = process.env.INGEST_SECRET;
  if (!ingestSecret) {
    return NextResponse.json({ error: 'INGEST_SECRET missing.' }, { status: 500 });
  }

  if (req.headers.get('x-ingest-secret') !== ingestSecret) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const summaries: ScraperSummary[] = [];

  const scrapers: Array<{
    label: string;
    run: () => Promise<ScraperSummary>;
    fallbackSource: string;
    dataType: ScraperSummary['dataType'];
  }> = [
    {
      label: 'PA eMarketplace',
      run: () => runOpportunitySource(scrapeEMarketplace),
      fallbackSource: 'state_pa_emarketplace',
      dataType: 'opportunities',
    },
    {
      label: 'PA Treasury',
      run: () => runOpportunitySource(scrapePaTreasury),
      fallbackSource: 'state_pa_treasury',
      dataType: 'opportunities',
    },
    {
      label: 'Allegheny County',
      run: () => runAwardSource(scrapeAlleghenyCounty),
      fallbackSource: 'local_allegheny',
      dataType: 'awards',
    },
    {
      label: 'City of Pittsburgh',
      run: () => runOpportunitySource(scrapePittsburghCity),
      fallbackSource: 'local_pittsburgh',
      dataType: 'opportunities',
    },
    {
      label: 'URA',
      run: () => runOpportunitySource(scrapeURA),
      fallbackSource: 'local_ura',
      dataType: 'opportunities',
    },
    {
      label: 'Housing Authority',
      run: () => runOpportunitySource(scrapeHousingAuthority),
      fallbackSource: 'local_housing_authority',
      dataType: 'opportunities',
    },
  ];

  for (const scraper of scrapers) {
    try {
      summaries.push(await scraper.run());
    } catch (err) {
      summaries.push({
        source: scraper.fallbackSource,
        totalScraped: 0,
        totalSaved: 0,
        dataType: scraper.dataType,
        errors: [`${scraper.label} threw: ${err instanceof Error ? err.message : String(err)}`],
        durationMs: 0,
      });
    }
  }

  const opportunitySummaries = summaries.filter((summary) => summary.dataType === 'opportunities');
  const awardSummaries = summaries.filter((summary) => summary.dataType === 'awards');
  const totalErrors = summaries.reduce((sum, summary) => sum + summary.errors.length, 0);

  const summary: IngestSummary = {
    success: totalErrors === 0,
    scrapers: summaries,
    totals: {
      opportunitiesScraped: opportunitySummaries.reduce((sum, summary) => sum + summary.totalScraped, 0),
      opportunitiesSaved: opportunitySummaries.reduce((sum, summary) => sum + summary.totalSaved, 0),
      awardsScraped: awardSummaries.reduce((sum, summary) => sum + summary.totalScraped, 0),
      awardsSaved: awardSummaries.reduce((sum, summary) => sum + summary.totalSaved, 0),
    },
    totalErrors,
    durationMs: Date.now() - startMs,
    note: 'Live procurement ingest restored for PA eMarketplace, PA Treasury, City of Pittsburgh, URA, Housing Authority, and Allegheny County.',
  };

  return NextResponse.json(summary, { status: 200 });
}
