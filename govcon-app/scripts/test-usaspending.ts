import * as fs from 'fs';

const envFile = fs.readFileSync('.env.production.local', 'utf8');
const envParams = envFile.split('\n').reduce((acc: any, line) => {
  const match = line.match(/^([^=]+)="?(.*)"?$/);
  if (match) {
    let val = match[2];
    if (val.endsWith('"')) val = val.slice(0, -1);
    acc[match[1]] = val;
  }
  return acc;
}, {});

async function testSam() {
  const url = `https://api.sam.gov/opportunities/v2/search?api_key=${envParams.SAMGOV_API_KEY}&limit=1&postedFrom=01/01/2026&postedTo=12/31/2026`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  const data = await res.json();
  if (data?.opportunitiesData?.length > 0) {
    const opp = data.opportunitiesData[0];
    console.log("Found opp:", opp.noticeId, opp.title);
    
    // Now fetch by solnum
    if (opp.solicitationNumber) {
      const url2 = `https://api.sam.gov/opportunities/v2/search?api_key=${envParams.SAMGOV_API_KEY}&solnum=${opp.solicitationNumber}&limit=1`;
      const res2 = await fetch(url2, { headers: { Accept: 'application/json' } });
      const data2 = await res2.json();
      console.log("By solnum:", data2.opportunitiesData?.[0]?.solicitationNumber, data2.opportunitiesData?.[0]?.pointOfContact);
    } else {
      console.log("No solnum to test");
    }
  } else {
    console.log("No opps found", data);
  }
}
testSam();
