const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env.production.local', 'utf8');
const envParams = envFile.split('\n').reduce((acc, line) => {
  const match = line.match(/^([^=]+)="?(.*)"?$/);
  if (match) {
    let val = match[2];
    if (val.endsWith('"')) val = val.slice(0, -1);
    acc[match[1]] = val;
  }
  return acc;
}, {});

const supabase = createClient(envParams.NEXT_PUBLIC_SUPABASE_URL, envParams.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  console.log("Fetching agencies...");
  const { data: agencies, error: errAgencies } = await supabase.from('agencies').select('id, name');
  if (errAgencies) return console.error(errAgencies);

  const agencyMap = {};
  for (const a of agencies) {
    agencyMap[a.name.toLowerCase()] = a.id;
  }

  async function fixTable(tableName) {
    console.log(`Fixing ${tableName}...`);
    const { data: rows, error } = await supabase.from(tableName).select('id, agency_name').is('agency_id', null);
    if (error) return console.error(error);
    
    console.log(`Found ${rows.length} rows in ${tableName} missing agency_id.`);
    
    let updated = 0;
    for (const row of rows) {
      if (!row.agency_name) continue;
      const lowerName = row.agency_name.toLowerCase();
      let agencyId = agencyMap[lowerName];
      
      if (!agencyId) {
        // Create it
        const { data: newAgency, error: createErr } = await supabase.from('agencies')
          .insert({ name: row.agency_name, level: 'federal' })
          .select('id')
          .single();
        if (createErr) {
          console.error("Error creating agency:", createErr.message);
          continue;
        }
        agencyId = newAgency.id;
        agencyMap[lowerName] = agencyId;
      }
      
      await supabase.from(tableName).update({ agency_id: agencyId }).eq('id', row.id);
      updated++;
    }
    console.log(`Updated ${updated} rows in ${tableName}.`);
  }

  console.log("Triggering USASpending cron...");
  try {
    const res = await fetch('https://gov-con-assistant-pro.vercel.app/api/cron/usaspending', {
      headers: {
        'Authorization': `Bearer ${envParams.CRON_SECRET}`
      }
    });
    const json = await res.json();
    console.log("USASpending cron response:", json);
  } catch (err) {
    console.error("USASpending cron error:", err);
  }

  await fixTable('opportunities');
  await fixTable('contract_awards');
}

run();
