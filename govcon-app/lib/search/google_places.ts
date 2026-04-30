// ============================================================
// GOOGLE PLACES API CLIENT — Find local businesses
// API: https://developers.google.com/maps/documentation/places/web-service
// Auth: GOOGLE_PLACES_API_KEY env var
// Finds companies NOT necessarily SAM-registered
// ============================================================

export interface GooglePlacesResult {
  company_name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone?: string;
  website?: string;
  category?: string;
  rating?: number;
  sam_registered: false;
  source: 'google_places';
  place_id: string;
  score: number;
}

const PLACES_TEXT_URL  = 'https://maps.googleapis.com/maps/api/place/textsearch/json';
const PLACES_DETAIL_URL = 'https://maps.googleapis.com/maps/api/place/details/json';

function parseAddressParts(components: any[]): { address: string; city: string; state: string; zip: string } {
  const get = (type: string) =>
    components.find((c: any) => c.types?.includes(type))?.long_name ?? '';
  const getShort = (type: string) =>
    components.find((c: any) => c.types?.includes(type))?.short_name ?? '';

  return {
    address: [get('street_number'), get('route')].filter(Boolean).join(' '),
    city:    get('locality') || get('sublocality') || get('administrative_area_level_3'),
    state:   getShort('administrative_area_level_1'),
    zip:     get('postal_code'),
  };
}

export async function searchGooglePlaces(params: {
  query: string;
  location?: string;
  limit?: number;
}): Promise<{ results: GooglePlacesResult[]; errors: string[] }> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY ?? '';
  if (!apiKey) {
    return { results: [], errors: ['GOOGLE_PLACES_API_KEY not set'] };
  }

  const errors: string[] = [];
  const results: GooglePlacesResult[] = [];

  const location = params.location ?? 'Pittsburgh, PA';
  const fullQuery = `${params.query} ${location}`;

  try {
    // Text search for initial results
    const searchParams = new URLSearchParams({
      query:  fullQuery,
      region: 'us',
      key:    apiKey,
    });

    const res = await fetch(`${PLACES_TEXT_URL}?${searchParams.toString()}`, {
      signal: AbortSignal.timeout(20_000),
    });

    if (!res.ok) {
      errors.push(`Google Places HTTP ${res.status}`);
      return { results, errors };
    }

    const json = await res.json();
    if (json.status !== 'OK' && json.status !== 'ZERO_RESULTS') {
      errors.push(`Google Places API status: ${json.status} — ${json.error_message ?? ''}`);
      return { results, errors };
    }

    const places: any[] = (json.results ?? []).slice(0, params.limit ?? 20);

    // Fetch details for phone + website (batch, max 5 to limit quota)
    const detailPromises = places.slice(0, 5).map(async (place: any) => {
      try {
        const dp = new URLSearchParams({
          place_id: place.place_id,
          fields:   'formatted_phone_number,website,address_components',
          key:      apiKey,
        });
        const dr = await fetch(`${PLACES_DETAIL_URL}?${dp.toString()}`, {
          signal: AbortSignal.timeout(10_000),
        });
        if (!dr.ok) return null;
        const dj = await dr.json();
        return { place_id: place.place_id, detail: dj.result };
      } catch {
        return null;
      }
    });

    const detailMap = new Map<string, any>();
    const detailResults = await Promise.allSettled(detailPromises);
    detailResults.forEach((r) => {
      if (r.status === 'fulfilled' && r.value) {
        detailMap.set(r.value.place_id, r.value.detail);
      }
    });

    places.forEach((place: any, idx: number) => {
      const detail = detailMap.get(place.place_id);
      const addrComponents = detail?.address_components ?? place?.address_components ?? [];
      const parsed = addrComponents.length > 0
        ? parseAddressParts(addrComponents)
        : { address: place.formatted_address ?? '', city: location.split(',')[0].trim(), state: 'PA', zip: '' };

      const types: string[] = place.types ?? [];
      const category = types.filter((t: string) => t !== 'establishment' && t !== 'point_of_interest')[0];

      results.push({
        company_name:   place.name ?? '',
        address:        parsed.address,
        city:           parsed.city,
        state:          parsed.state || 'PA',
        zip:            parsed.zip,
        phone:          detail?.formatted_phone_number || undefined,
        website:        detail?.website || undefined,
        category:       category?.replace(/_/g, ' ') || undefined,
        rating:         place.rating || undefined,
        sam_registered: false,
        source:         'google_places',
        place_id:       place.place_id,
        score:          Math.max(0, 80 - idx * 3), // relevance decreases with position
      });
    });
  } catch (err) {
    errors.push(`Google Places fatal: ${err instanceof Error ? err.message : String(err)}`);
  }

  return { results, errors };
}
