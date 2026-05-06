import { fetchPAAwards } from '../lib/ingestion/usaspending';
import { upsertAwards } from '../lib/db/upsert';

async function run() {
  console.log("Starting local USASpending ingestion...");
  const awards = await fetchPAAwards();
  console.log(`Fetched ${awards.length} awards.`);
  
  if (awards.length > 0) {
    const scrapedAwards = awards.map((raw: any) => {
        const amount = raw['Award Amount'] ?? raw.Award_Amount;
        const date = raw['Start Date'] ?? raw.Start_Date;
        const recipient = raw['Recipient Name'] ?? raw.Recipient_Name;
        const agency = raw['Awarding Agency'] ?? raw.Awarding_Agency;
        const description = raw['Description'] ?? raw.Description;
        const id = raw['Award ID'] ?? raw.Award_ID;
        const uei = raw['Recipient UEI'] ?? raw.Recipient_UEI;
        
        return {
            source: 'federal_usaspending',
            title: description?.toString().substring(0, 200) || `Award ${id}`,
            agency_name: agency?.toString() || 'Unknown Agency',
            solicitation_number: undefined,
            dedup_hash: id?.toString() || Date.now().toString(),
            canonical_sources: ['federal_usaspending'],
            naics_code: undefined,
            naics_sector: undefined,
            contract_type: 'contract',
            award_date: date || undefined,
            contract_start_date: undefined,
            contract_end_date: undefined,
            vendor_name: recipient?.toString() || undefined,
            vendor_uei: uei?.toString() || undefined,
            place_of_performance_city: '',
            place_of_performance_state: 'PA',
            description: description?.toString() || '',
            url: id ? `https://www.usaspending.gov/award/${encodeURIComponent(id.toString())}` : '',
            status: 'awarded',
            total_value: amount ? Math.round(parseFloat(amount) * 100) : undefined,
        };
    });

    console.log(`Upserting ${scrapedAwards.length} awards...`);
    const upsertRes = await upsertAwards(scrapedAwards as any, 'federal_usaspending');
    console.log("Upsert result:", upsertRes);
  }
}

run();
