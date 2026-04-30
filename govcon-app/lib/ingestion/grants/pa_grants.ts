// ============================================================
// PA GRANTS — PA.gov + PA DCED Scraper
// Sources:
//   PA.gov grants portal: https://www.pa.gov/grants
//   PA DCED: https://dced.pa.gov/
// source = "state_pa_grants" / "state_pa_dced"
// ============================================================

import { createHash } from 'crypto';
import * as cheerio from 'cheerio';
import type { GrantRecord, GrantIngestionResult } from './types';

function dedupHash(title: string, agency: string, deadline: string | null): string {
  const t = (title ?? '').toLowerCase().trim();
  const a = (agency ?? '').toLowerCase().trim();
  const d = deadline ? deadline.split('T')[0] : '';
  return createHash('sha256').update(`${t}${a}${d}`, 'utf8').digest('hex');
}

function parseDate(raw: string | undefined | null): string | undefined {
  if (!raw) return undefined;
  const d = new Date(raw.trim());
  return isNaN(d.getTime()) ? undefined : d.toISOString();
}

function detectGrantType(text: string): 'grant' | 'loan' | 'tax_credit' | 'rebate' | 'other' {
  const t = text.toLowerCase();
  if (t.includes('loan')) return 'loan';
  if (t.includes('tax credit') || t.includes('tax incentive')) return 'tax_credit';
  if (t.includes('rebate')) return 'rebate';
  if (t.includes('grant') || t.includes('fund')) return 'grant';
  return 'other';
}

async function scrapePaGov(): Promise<GrantRecord[]> {
  const grants: GrantRecord[] = [];
  const BASE = 'https://www.pa.gov';
  const URL  = `${BASE}/grants`;
  const seen = new Set<string>();

  try {
    const res = await fetch(URL, {
      headers: { 'User-Agent': 'GovConBot/1.0 (+https://govconassistant.pro)' },
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const $ = cheerio.load(await res.text());

    // PA.gov uses card/list layout for programs
    const selectors = ['.card', '.grant-item', 'article', '.views-row', 'li:has(a[href])'];
    for (const sel of selectors) {
      $(sel).each((_, el) => {
        const $el = $(el);
        const linkEl = $el.find('a').first();
        const href = linkEl.attr('href') ?? '';
        const title = linkEl.text().trim() || $el.find('h2,h3,h4').first().text().trim();
        if (!title || title.length < 8) return;
        if (seen.has(title.toLowerCase())) return;
        seen.add(title.toLowerCase());

        const desc = $el.find('p').first().text().trim().slice(0, 1000);
        const dateText = $el.text().match(/deadline[:\s]+([A-Za-z0-9\/,\s]+)/i)?.[1]?.trim();
        const deadline = parseDate(dateText);
        const url = href ? (href.startsWith('http') ? href : `${BASE}${href}`) : URL;

        grants.push({
          source: 'state_pa_grants',
          category: 'state',
          title,
          agency: 'Commonwealth of Pennsylvania',
          grant_type: detectGrantType(title + desc),
          eligible_entities: ['small_business', 'any'],
          application_deadline: deadline,
          description: desc || undefined,
          how_to_apply: `Apply at ${url}`,
          url,
          dedup_hash: dedupHash(title, 'Commonwealth of Pennsylvania', deadline ?? null),
          status: 'active',
        });
      });
      if (grants.length > 0) break;
    }

    // Fallback: link scan
    if (grants.length === 0) {
      $('a[href]').each((_, el) => {
        const $a = $(el);
        const href = $a.attr('href') ?? '';
        const text = $a.text().trim();
        if (!text || text.length < 8) return;
        if (!/grant|fund|loan|incentive|program/i.test(text + href)) return;
        if (seen.has(text.toLowerCase())) return;
        seen.add(text.toLowerCase());
        const url = href.startsWith('http') ? href : `${BASE}${href}`;
        grants.push({
          source: 'state_pa_grants',
          category: 'state',
          title: text,
          agency: 'Commonwealth of Pennsylvania',
          grant_type: detectGrantType(text),
          eligible_entities: ['any'],
          url,
          dedup_hash: dedupHash(text, 'Commonwealth of Pennsylvania', null),
          status: 'active',
        });
      });
    }
  } catch (err) {
    console.error('[pa_grants] pa.gov error:', err instanceof Error ? err.message : err);
  }

  return grants;
}

async function scrapePaDced(): Promise<GrantRecord[]> {
  const grants: GrantRecord[] = [];
  const BASE = 'https://dced.pa.gov';
  const URLS = [
    `${BASE}/business-assistance/`,
    `${BASE}/programs/`,
  ];
  const seen = new Set<string>();

  for (const url of URLS) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'GovConBot/1.0 (+https://govconassistant.pro)' },
        signal: AbortSignal.timeout(30_000),
      });
      if (!res.ok) continue;

      const $ = cheerio.load(await res.text());

      $('a[href]').each((_, el) => {
        const $a = $(el);
        const href = $a.attr('href') ?? '';
        const text = $a.text().trim();
        if (!text || text.length < 10) return;
        if (!/grant|loan|fund|program|assistance|incentive|tax credit/i.test(text + href)) return;
        if (seen.has(text.toLowerCase())) return;
        seen.add(text.toLowerCase());

        // Get surrounding context for description
        const $parent = $a.closest('p, li, div');
        const context = $parent.text().replace(text, '').trim().slice(0, 500);
        const fullUrl = href.startsWith('http') ? href : `${BASE}${href}`;

        grants.push({
          source: 'state_pa_dced',
          category: 'state',
          title: text,
          agency: 'PA Department of Community & Economic Development',
          grant_type: detectGrantType(text + context),
          eligible_entities: ['small_business', 'any'],
          description: context || undefined,
          how_to_apply: `Visit ${fullUrl}`,
          url: fullUrl,
          dedup_hash: dedupHash(text, 'PA DCED', null),
          status: 'active',
        });
      });
    } catch (err) {
      console.error(`[pa_grants] DCED ${url} error:`, err instanceof Error ? err.message : err);
    }
  }

  return grants;
}

export async function ingestPaGrants(): Promise<GrantIngestionResult[]> {
  const start = Date.now();
  const [paGovGrants, dcedGrants] = await Promise.all([scrapePaGov(), scrapePaDced()]);

  console.log(`[pa_grants] pa.gov: ${paGovGrants.length}, dced: ${dcedGrants.length} (${Date.now() - start}ms)`);

  return [
    { source: 'state_pa_grants', grants: paGovGrants, errors: [], durationMs: Date.now() - start },
    { source: 'state_pa_dced',   grants: dcedGrants,  errors: [], durationMs: Date.now() - start },
  ];
}
