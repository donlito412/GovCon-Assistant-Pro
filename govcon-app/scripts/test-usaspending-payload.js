const fetch = require('node-fetch'); // or just use global fetch in Node 18+

async function test() {
  const payload = {
    filters: {
      time_period: [
        {
          start_date: '2024-05-01',
          end_date: '2026-05-05',
        },
      ],
      award_type_codes: ['A', 'B', 'C', 'D'],
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
    limit: 100,
    page: 1,
    sort: 'Award Date',
    order: 'desc'
  };

  const res = await fetch('https://api.usaspending.gov/api/v2/search/spending_by_award/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    console.error("400 Error:", await res.text());
  } else {
    console.log("Success");
  }
}
test();
