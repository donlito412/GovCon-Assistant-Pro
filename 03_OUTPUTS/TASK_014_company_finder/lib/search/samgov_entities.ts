// ============================================================
// SAM.GOV ENTITY API CLIENT — Live search (not batch ingest)
// API docs: https://open.gsa.gov/api/entity-api/
// Auth: SAMGOV_API_KEY env var (already in use for TASK_002)
// Returns top 20 results per query
// ============================================================

export interface SamGovEntity {
  uei: string;
  company_name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  naics_codes: string[];
  certifications: Record<string, boolean>;
  contact_name?: string;
  email?: string;
  phone?: string;
  website?: string;
  sam_registered: true;
  source: 'samgov';
  score: number; // relevance rank 0–100
}

const SAM_BASE = 'https://api.sam.gov/entity-information/v3/entities';

function parseCerts(entity: any): Record<string, boolean> {
  const certs: Record<string, boolean> = {};
  const biz = entity?.coreData?.businessTypes?.businessTypeList ?? [];
  const sba  = entity?.coreData?.businessTypes?.sbaBusinessTypeList ?? [];

  const all = [...biz, ...sba].map((b: any) => (b?.businessTypeCode ?? b?.sbaBusinessTypeCode ?? '').toLowerCase());
  certs['8a']       = all.includes('a6') || all.some((c: string) => c.includes('8a'));
  certs['hubzone']  = all.includes('qf') || all.some((c: string) => c.includes('hubzone'));
  certs['sdvosb']   = all.includes('qe') || all.some((c: string) => c.includes('sdvosb') || c.includes('veteran'));
  certs['wosb']     = all.includes('a5') || all.some((c: string) => c.includes('wosb') || c.includes('women'));
  certs['edwosb']   = all.some((c: string) => c.includes('edwosb'));
  certs['mwdbe']    = all.some((c: string) => c.includes('mbe') || c.includes('disadvantaged'));
  return certs;
}

function parseNaics(entity: any): string[] {
  const naicsList = entity?.assertions?.goodsAndServices?.naicsList ?? [];
  return naicsList.map((n: any) => String(n?.naicsCode ?? '')).filter(Boolean);
}

function parsePoc(entity: any): { name?: string; email?: string; phone?: string } {
  const pocs = entity?.pointsOfContact ?? {};
  const gov = pocs?.governmentBusinessPOC ?? pocs?.electronicBusinessPOC ?? {};
  return {
    name:  [gov?.firstName, gov?.lastName].filter(Boolean).join(' ') || undefined,
    email: gov?.emailAddress || undefined,
    phone: gov?.usPhone || undefined,
  };
}

export async function searchSamGovEntities(params: {
  query: string;
  naicsCode?: string;
  state?: string;
  requireCertification?: string; // '8a' | 'hubzone' | 'sdvosb' | 'wosb'
  limit?: number;
}): Promise<{ results: SamGovEntity[]; errors: string[] }> {
  const apiKey = process.env.SAMGOV_API_KEY ?? '';
  if (!apiKey) {
    return { results: [], errors: ['SAMGOV_API_KEY not set'] };
  }

  const errors: string[] = [];
  const results: SamGovEntity[] = [];

  try {
    const sp = new URLSearchParams({
      api_key:              apiKey,
      legalBusinessName:    params.query,
      physicalAddressStateCode: params.state ?? 'PA',
      entityEFTIndicator:   'null',
      includeSections:      'entityRegistration,coreData,assertions,pointsOfContact',
      pageSize:             String(Math.min(params.limit ?? 20, 100)),
      page:                 '0',
    });

    if (params.naicsCode) sp.set('naicsCode', params.naicsCode);

    // Certification filters
    if (params.requireCertification) {
      const certMap: Record<string, string> = {
        '8a':      'A6',
        'hubzone': 'QF',
        'sdvosb':  'QE',
        'wosb':    'A5',
      };
      const code = certMap[params.requireCertification];
      if (code) sp.set('businessTypeCode', code);
    }

    const res = await fetch(`${SAM_BASE}?${sp.toString()}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(20_000),
    });

    if (!res.ok) {
      errors.push(`SAM.gov API HTTP ${res.status}`);
      return { results, errors };
    }

    const json = await res.json();
    const entities: any[] = json?.entityData ?? [];

    entities.forEach((entity, idx) => {
      try {
        const reg   = entity?.entityRegistration ?? {};
        const addr  = entity?.coreData?.physicalAddress ?? {};
        const poc   = parsePoc(entity);
        const certs = parseCerts(entity);

        const name = reg?.legalBusinessName ?? '';
        if (!name) return;

        results.push({
          uei:            reg?.ueiSAM ?? '',
          company_name:   name,
          address:        addr?.addressLine1 ?? '',
          city:           addr?.city ?? '',
          state:          addr?.stateOrProvinceCode ?? 'PA',
          zip:            addr?.zipCode ?? '',
          naics_codes:    parseNaics(entity),
          certifications: certs,
          contact_name:   poc.name,
          email:          poc.email,
          phone:          poc.phone,
          sam_registered: true,
          source:         'samgov',
          score:          100 - idx, // first result is most relevant
        });
      } catch (rowErr) {
        errors.push(`Entity parse: ${rowErr instanceof Error ? rowErr.message : String(rowErr)}`);
      }
    });
  } catch (err) {
    errors.push(`SAM.gov fatal: ${err instanceof Error ? err.message : String(err)}`);
  }

  return { results, errors };
}
