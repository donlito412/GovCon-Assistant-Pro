// ============================================================
// USASPENDING AWARDS API CLIENT
// Endpoint: https://api.usaspending.gov/api/v2/search/spending_by_award/
// Auth: None required
// Filters: PA recipient location, last 24 months
// ============================================================

const USASPENDING_BASE_URL = 'https://api.usaspending.gov/api/v2/search/spending_by_award/';

export interface USASpendingAward {
  internal_id: number;
  Award_ID: string;
  Recipient_Name: string;
  Recipient_UEI: string;
  Awarding_Agency: string;
  Award_Amount: number;
  Award_Date: string;
  Description: string;
  naics_code: string;
  piid: string; // Contract number
}

/**
 * Builds the date strings for the last 24 months.
 */
function get24MonthDateRange() {
  const end = new Date();
  const start = new Date();
  start.setFullYear(start.getFullYear() - 2);

  const formatDate = (d: Date) => d.toISOString().split('T')[0];

  return {
    startDate: formatDate(start),
    endDate: formatDate(end),
  };
}

/**
 * Fetches contract awards from USASpending for PA recipients.
 */
export async function fetchPAAwards(): Promise<USASpendingAward[]> {
  const { startDate, endDate } = get24MonthDateRange();

  const payload = {
    filters: {
      time_period: [
        {
          start_date: startDate,
          end_date: endDate,
        },
      ],
      award_type_codes: ['A', 'B', 'C', 'D'], // Contracts
      recipient_locations: [
        {
          country: 'USA',
          state: 'PA',
        },
      ],
    },
    fields: [
      'Award ID',
      'Recipient Name',
      'Recipient UEI',
      'Awarding Agency',
      'Award Amount',
      'Award Date',
      'Description',
      'naics_code',
      'piid'
    ],
    limit: 100, // Fetch up to 100 recent awards (API max is 100)
    page: 1,
    sort: 'Award Date',
    order: 'desc'
  };

  try {
    const response = await fetch(USASPENDING_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(`USASpending 422 Body:`, text);
      throw new Error(`USASpending API error: HTTP ${response.status}`);
    }

    const data = await response.json();
    return data.results as USASpendingAward[];
  } catch (error) {
    console.error('[usaspending] Error fetching awards:', error);
    return [];
  }
}
