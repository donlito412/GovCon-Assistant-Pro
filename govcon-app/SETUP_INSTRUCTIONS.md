# GovCon Assistant Pro — Setup Instructions (Option B)

## What I Just Built For You

### ✅ COMPLETED (Ready to Use)

1. **Separate Awards Table** — Historical contracts now go to `contract_awards` table, not mixed with active opportunities
2. **Allegheny County Fix** — Historical county contracts moved to Awards page (where they belong)
3. **SAM.gov Pittsburgh MSA Filter** — Now filters to 6-county metro area (not all of PA)
4. **Re-enabled All Source Filters** — State (PA eMarketplace, Treasury, etc.) + Education (Pitt, CMU, etc.)
5. **Status Filter Added** — Default shows only "Active" opportunities
6. **Awards Page Updated** — Now pulls from awards table (shows both USASpending + Allegheny County)

---

## STEP 1: Run the Database Migration (DO THIS FIRST)

### Option A: Using Supabase Dashboard (Easiest)

1. Go to https://app.supabase.com
2. Click your project
3. Go to "SQL Editor" in left sidebar
4. Click "New Query"
5. Copy ALL the contents of `supabase_awards_schema.sql` (in this folder)
6. Paste into the SQL Editor
7. Click "Run"
8. You should see "Success" with no errors

### What This Does:
- Creates new `contract_awards` table
- Moves Allegheny County historical data out of opportunities
- Adds proper indexes for fast searching
- Fixes status from 'expired' to 'awarded'

---

## STEP 2: Add Your SAM.gov API Key

1. Open `.env.local` file (if it doesn't exist, copy from `.env.example`)
2. Find the line: `SAMGOV_API_KEY=your_samgov_api_key`
3. Replace with your actual key: `SAMGOV_API_KEY=paste_your_key_here`
4. Save the file

---

## STEP 3: Rebuild & Redeploy

### In your terminal (or ask me to do this):

```bash
# Navigate to the project folder
cd "/Volumes/Lito's Hard Drive/Murphree Enterprises/PGH-Gov-Contracts/govcon-app"

# Install any new dependencies
npm install

# Build the project
npm run build

# Deploy to Netlify (if not auto-deploying)
# Or just push to GitHub if Netlify auto-deploy is set up
git add .
git commit -m "Fix: Separate awards table, Pittsburgh MSA filtering, re-enabled all sources"
git push origin main
```

---

## STEP 4: Test the Ingestion

### Run the SAM.gov ingestion manually:

1. Go to your Netlify site dashboard
2. Go to "Functions" tab
3. Look for function logs when you visit:
   `https://YOUR-SITE.netlify.app/api/ingest/samgov`

### Or locally:
```bash
npm run dev
# Then visit: http://localhost:3000/api/ingest/samgov
```

### Expected Results:
- **Before fix**: ~348 PA statewide records
- **After fix**: ~50-150 Pittsburgh MSA only records (this is correct!)

---

## STEP 5: What's Still Pending (Need Your Help)

### 🔄 Pittsburgh City Scraper (NEEDS REBUILD)

**Problem**: All 5 URL fallbacks are failing
**Need from you**: 
- What URL do you currently use to check City of Pittsburgh RFPs?
- Are you using Bonfire, OpenGov, or something else?

**Common Pittsburgh sources you mentioned**:
- Bonfire Hub
- Doing Business with Pitt
- URA (Urban Redevelopment Authority)
- Housing Authority of Pittsburgh

**Action**: Tell me which sites you actually check manually, and I'll build scrapers for those.

---

## WHAT YOU'LL SEE AFTER THIS FIX

### Contracts Page (Opportunities)
- **Filters now show**: Federal, State (PA eMarketplace, Treasury, Bulletin, DCED), Local (Allegheny Active, Pittsburgh, URA), Education (Pitt, CMU, CCAC, PPS, Duquesne)
- **Status filter**: Defaults to "Active" only (no more closed contracts cluttering results)
- **SAM.gov results**: Now Pittsburgh MSA only (no more Harrisburg/Philly contracts)

### Awards Page
- Shows both: Federal awards (USASpending) + Local awards (Allegheny County historical)
- 1,833+ Allegheny County awards properly categorized
- Search by awardee name (see who won what)

---

## NEXT PHASE (After You Test This)

Once this is working, we can add:
1. Pittsburgh City scraper (once you tell me the current URL)
2. Bonfire scraper (if that's what you use)
3. Agency search (type to search, not just checkboxes)
4. Contract vehicle filters (IDIQ, BPA, etc.)
5. Geographic radius filter (25/50/100 miles from Pittsburgh)

---

## NEED HELP?

If any step fails:
1. Screenshot the error
2. Tell me exactly which step
3. I'll fix it immediately

**Your API key is safe**: It's only stored in `.env.local` (never committed to GitHub)
