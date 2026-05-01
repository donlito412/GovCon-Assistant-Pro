// ============================================================
// SAM.gov ENTITY API SCRAPER
// Source: https://api.sam.gov/entity-information/v3/entities
// Type: REST API (JSON)
// Auth: SAMGOV_API_KEY
// Purpose: Fetch Pittsburgh-area registered federal contractors
// ============================================================

interface SamGovEntity {
  entityIdentification: {
    samIdentifier: string;
    cageCode?: string;
    legalBusinessName: string;
    dbaName?: string;
    physicalAddress: {
      line1?: string;
      city?: string;
      stateOrProvinceCode?: string;
      zipCode?: string;
      zipCodePlus4?: string;
      countryCode?: string;
    };
    mailingAddress?: {
      line1?: string;
      city?: string;
      stateOrProvinceCode?: string;
      zipCode?: string;
      countryCode?: string;
    };
    purposeOfRegistration?: string;
  };
  coreData: {
    naics?: Array<{
      naicsCode: string;
      isPrimaryNaics: boolean;
    }>;
    smallBusiness?: {
      isSmallBusiness: boolean;
      is8aProgramParticipant: boolean;
      isHubzoneOwned: boolean;
      isSdvosb: boolean;
      isWosb: boolean;
      isEconomicallyDisadvantagedWosb: boolean;
    };
    businessTypes?: Array<{
      businessType: string;
    }>;
  };
  contacts?: Array<{
    firstName?: string;
    lastName?: string;
    phone?: string;
      email?: string;
    title?: string;
  }>;
  registration?: {
    registrationDate?: string;
    expirationDate?: string;
    lastUpdateDate?: string;
  };
}

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

const SOURCE = 'samgov_entities' as const;
const BASE_URL = 'https://api.sam.gov/entity-information/v3/entities';
const PAGE_SIZE = 100;
const MAX_PAGES = 10; // Limit to prevent excessive API calls

// Pittsburgh area ZIP prefixes (15xxx covers Pittsburgh region)
const PITTSBURGH_ZIP_PREFIXES = ['150', '151', '152', '153', '154', '155', '156', '157', '158', '159'];

// Relevant NAICS codes for Pittsburgh economy
const RELEVANT_NAICS = [
  '236115', '236116', '236117', '236118', // Construction
  '237990', // Heavy and Civil Engineering
  '238110', '238120', '238130', '238140', '238150', '238160', '238170', '238190', // Specialty Trade Contractors
  '311', '312', // Food Manufacturing
  '321', '322', '323', '324', '325', '326', '327', '332', '333', '334', '335', '336', '339', // Manufacturing
  '423', '424', '425', // Wholesale Trade
  '481', '482', '483', '484', '485', '486', '487', '488', // Transportation
  '511', '512', '515', '517', '518', '519', // Information
  '521', '522', '523', '524', // Finance
  '531', '532', // Real Estate
  '541', // Professional Services
  '541330', '541511', '541512', '541513', '541519', // Engineering/IT Services
  '551', // Management of Companies
  '561', // Administrative Services
  '611', // Educational Services
  '621', '622', '623', '624', // Health Care
  '711', // Arts and Entertainment
  '721', '722', // Accommodation and Food Services
  '811', // Repair and Maintenance
];

/**
 * Fetches a single page of entities from SAM.gov Entity API
 */
async function fetchEntityPage(apiKey: string, page: number): Promise<SamGovEntity[]> {
  const params = new URLSearchParams({
    api_key: apiKey,
    pageSize: String(PAGE_SIZE),
    pageNumber: String(page),
    // Filter by Pennsylvania state
    'physicalAddress.stateOrProvinceCode': 'PA',
    // Filter by relevant NAICS codes (comma-separated)
    naicsCodes: RELEVANT_NAICS.join(','),
    // Only active registrations
    registrationStatus: 'A',
    // Sort by registration date (newest first)
    sortField: 'registrationDate',
    sortOrder: 'DESC',
  });

  const url = `${BASE_URL}?${params}`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'GovConAssistant/1.0 (+https://github.com/donlito412/GovCon-Assistant-Pro)',
      },
    });

    if (!response.ok) {
      throw new Error(`SAM.gov API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as {
      entityData?: SamGovEntity[];
      totalRecords?: number;
      pageNumber?: number;
      pageSize?: number;
    };

    return data?.entityData || [];
  } catch (error) {
    console.error(`[samgov_entities] Page ${page} fetch failed:`, error);
    throw error;
  }
}

/**
 * Checks if a ZIP code is in the Pittsburgh area (15xxx)
 */
function isPittsburghAreaZip(zip?: string): boolean {
  if (!zip) return false;
  const zip5 = zip.substring(0, 3);
  return PITTSBURGH_ZIP_PREFIXES.includes(zip5);
}

/**
 * Extracts certifications from SAM.gov small business data
 */
function extractCertifications(smallBusiness?: SamGovEntity['coreData']['smallBusiness']): string[] {
  if (!smallBusiness || !smallBusiness.isSmallBusiness) return [];
  
  const certs: string[] = ['small_business'];
  
  if (smallBusiness.is8aProgramParticipant) certs.push('8a');
  if (smallBusiness.isHubzoneOwned) certs.push('hubzone');
  if (smallBusiness.isSdvosb) certs.push('sdvosb');
  if (smallBusiness.isWosb) certs.push('wosb');
  if (smallBusiness.isEconomicallyDisadvantagedWosb) certs.push('edwosb');
  
  return certs;
}

/**
 * Normalizes SAM.gov entity data to our contact format
 */
function normalizeEntity(entity: SamGovEntity): SubcontractorContact | null {
  const identification = entity.entityIdentification;
  const core = entity.coreData;
  
  if (!identification?.legalBusinessName) return null;
  
  // Filter to Pittsburgh area only
  const physicalZip = identification.physicalAddress?.zipCode;
  if (!isPittsburghAreaZip(physicalZip)) return null;
  
  const naicsCodes = (core?.naics || [])
    .map(n => parseInt(n.naicsCode))
    .filter(code => !isNaN(code));
  
  const certifications = extractCertifications(core?.smallBusiness);
  
  // Get primary contact info
  const primaryContact = entity.contacts?.[0];
  const contactName = primaryContact 
    ? `${primaryContact.firstName || ''} ${primaryContact.lastName || ''}`.trim()
    : undefined;
  
  return {
    company_name: identification.legalBusinessName,
    contact_name: contactName || undefined,
    email: primaryContact?.email || undefined,
    phone: primaryContact?.phone || undefined,
    naics_codes: naicsCodes,
    sam_registered: true,
    cage_code: identification.cageCode || undefined,
    certifications,
    capabilities: identification.purposeOfRegistration || undefined,
    city: identification.physicalAddress?.city || undefined,
    state: identification.physicalAddress?.stateOrProvinceCode || undefined,
    zip: physicalZip || undefined,
    website: undefined, // SAM.gov doesn't provide website in entity API
    source: SOURCE,
  };
}

/**
 * Main scraper function for SAM.gov entities
 */
export async function scrapeSamGovEntities(): Promise<{
  source: string;
  contacts: SubcontractorContact[];
  errors: string[];
  durationMs: number;
}> {
  const start = Date.now();
  const contacts: SubcontractorContact[] = [];
  const errors: string[] = [];
  
  const apiKey = process.env.SAMGOV_API_KEY;
  if (!apiKey) {
    const error = 'SAMGOV_API_KEY environment variable is not set';
    console.error(`[samgov_entities] ${error}`);
    return {
      source: SOURCE,
      contacts: [],
      errors: [error],
      durationMs: Date.now() - start,
    };
  }
  
  console.log('[samgov_entities] Starting SAM.gov Entity API scrape...');
  
  let totalProcessed = 0;
  let hasMoreData = true;
  let page = 1;
  
  while (hasMoreData && page <= MAX_PAGES) {
    try {
      console.log(`[samgov_entities] Fetching page ${page}...`);
      const entities = await fetchEntityPage(apiKey, page);
      
      if (entities.length === 0) {
        console.log(`[samgov_entities] No more entities found on page ${page}`);
        hasMoreData = false;
        break;
      }
      
      console.log(`[samgov_entities] Processing ${entities.length} entities from page ${page}...`);
      
      for (const entity of entities) {
        try {
          const contact = normalizeEntity(entity);
          if (contact) {
            contacts.push(contact);
          }
        } catch (error) {
          const errorMsg = `Error normalizing entity ${entity.entityIdentification.samIdentifier}: ${error instanceof Error ? error.message : String(error)}`;
          console.error(`[samgov_entities] ${errorMsg}`);
          errors.push(errorMsg);
        }
      }
      
      totalProcessed += entities.length;
      
      // If we got fewer than page size, we're probably at the end
      if (entities.length < PAGE_SIZE) {
        hasMoreData = false;
      }
      
      page++;
    } catch (error) {
      const errorMsg = `Page ${page} fetch failed: ${error instanceof Error ? error.message : String(error)}`;
      console.error(`[samgov_entities] ${errorMsg}`);
      errors.push(errorMsg);
      hasMoreData = false;
    }
  }
  
  const durationMs = Date.now() - start;
  console.log(`[samgov_entities] Done. ${contacts.length} Pittsburgh-area contacts | ${totalProcessed} total processed | ${errors.length} errors | ${durationMs}ms`);
  
  return {
    source: SOURCE,
    contacts,
    errors,
    durationMs,
  };
}
