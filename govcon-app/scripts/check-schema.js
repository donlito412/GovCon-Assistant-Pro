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
  const { data, error } = await supabase.from('opportunities').select('*').limit(1);
  if (error) console.error("Error opportunities:", error.message);
  else console.log("Opportunities keys:", Object.keys(data[0] || {}));

  const { data: awards, error: e2 } = await supabase.from('contract_awards').select('*').limit(1);
  if (e2) console.error("Error contract_awards:", e2.message);
  else console.log("Awards keys:", Object.keys(awards[0] || {}));
}

run();
