// ============================================================
// PITTSBURGH AREA ZIP CODES + COUNTY FILTER
// Used to secondary-filter SAM.gov results after fetching PA-wide
// SAM.gov does not natively filter by zip — we apply this post-fetch
// ============================================================

// Allegheny County — Pittsburgh proper + all suburbs
export const ALLEGHENY_ZIPS: string[] = [
  '15201', '15202', '15203', '15204', '15205', '15206', '15207', '15208', '15209', '15210',
  '15211', '15212', '15213', '15214', '15215', '15216', '15217', '15218', '15219', '15220',
  '15221', '15222', '15223', '15224', '15225', '15226', '15227', '15228', '15229', '15230',
  '15231', '15232', '15233', '15234', '15235', '15236', '15237', '15238', '15239', '15240',
  '15241', '15242', '15243', '15244', '15250', '15251', '15252', '15253', '15254', '15255',
  '15257', '15258', '15259', '15260', '15261', '15262', '15263', '15264', '15265', '15267',
  '15268', '15270', '15272', '15274', '15275', '15276', '15277', '15278', '15279', '15281',
  '15282', '15283', '15285', '15286', '15289', '15290',
];

// Butler County
export const BUTLER_ZIPS: string[] = ['16001', '16002', '16003'];

// Washington County
export const WASHINGTON_ZIPS: string[] = ['15301'];

// Westmoreland County
export const WESTMORELAND_ZIPS: string[] = ['15601', '15626', '15650'];

// Beaver County
export const BEAVER_ZIPS: string[] = ['15001', '15009', '15010'];

// All Pittsburgh-area zips combined (Allegheny + surrounding counties)
export const PITTSBURGH_AREA_ZIPS: string[] = [
  ...ALLEGHENY_ZIPS,
  ...BUTLER_ZIPS,
  ...WASHINGTON_ZIPS,
  ...WESTMORELAND_ZIPS,
  ...BEAVER_ZIPS,
];

// Fast O(1) lookup set
export const PITTSBURGH_AREA_ZIP_SET: Set<string> = new Set(PITTSBURGH_AREA_ZIPS);

/**
 * Returns true if the given zip code falls within the Pittsburgh metro area.
 * Normalizes to 5-digit zip (strips ZIP+4 suffix if present).
 */
export function isPittsburghAreaZip(zip: string | undefined | null): boolean {
  if (!zip) return false;
  const normalized = zip.trim().slice(0, 5);
  return PITTSBURGH_AREA_ZIP_SET.has(normalized);
}

/**
 * Returns true if any of the provided zips fall within the Pittsburgh metro area.
 */
export function hasPittsburghAreaZip(zips: (string | undefined | null)[]): boolean {
  return zips.some(isPittsburghAreaZip);
}

export const PITTSBURGH_COUNTY_NAMES: string[] = [
  'Allegheny',
  'Butler',
  'Washington',
  'Westmoreland',
  'Beaver',
];

/**
 * Returns true if the county name (case-insensitive) is in the Pittsburgh metro area.
 */
export function isPittsburghAreaCounty(county: string | undefined | null): boolean {
  if (!county) return false;
  const lower = county.trim().toLowerCase();
  return PITTSBURGH_COUNTY_NAMES.some((c) => lower.includes(c.toLowerCase()));
}
