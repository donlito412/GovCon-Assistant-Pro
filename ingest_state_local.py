#!/usr/bin/env python3
"""
PA State & Local Opportunities Ingestion
=========================================
Sources:
  1. PA eMarketplace — BidContracts.aspx Excel export
  2. PA eMarketplace — active solicitations pages
  3. City of Pittsburgh — IonWave procurement portal (pittsburgh.ionwave.net)
  4. Allegheny County — PAVNextGen REST API (documents.alleghenycounty.us)
  5. SAM.gov — PA active solicitations (if API key provided)

Uses Supabase anon key for inserts (RLS disabled, anon key works).
Run via INGEST_STATE_LOCAL.command or: python3 ingest_state_local.py [path/to/.env.local]
"""

import sys, os, re, json, hashlib, io, traceback, time
from datetime import datetime

# ── Load .env.local ──────────────────────────────────────────────────────────
def load_env(path):
    env = {}
    try:
        with open(path) as f:
            for line in f:
                line = line.strip()
                if '=' in line and not line.startswith('#'):
                    k, v = line.split('=', 1)
                    env[k.strip()] = v.strip().strip('"').strip("'")
    except Exception as e:
        print(f"ERROR reading env file: {e}")
        sys.exit(1)
    return env

# Find env file
env_path = None
if len(sys.argv) > 1:
    env_path = sys.argv[1]
else:
    script_dir = os.path.dirname(os.path.abspath(__file__))
    for candidate in [
        os.path.join(script_dir, 'govcon-app/.env.local'),
        os.path.join(script_dir, '.env.local'),
        os.path.join(script_dir, 'govcon-app/.env'),
    ]:
        if os.path.exists(candidate):
            env_path = candidate
            break

if not env_path or not os.path.exists(env_path):
    print("ERROR: .env.local not found. Expected at govcon-app/.env.local")
    print("Create it by copying govcon-app/.env.example and filling in values.")
    sys.exit(1)

print(f"Loading env: {env_path}")
env = load_env(env_path)

SUPABASE_URL = env.get('NEXT_PUBLIC_SUPABASE_URL', '').rstrip('/')
# Use anon key — works for inserts when RLS is disabled
ANON_KEY     = env.get('NEXT_PUBLIC_SUPABASE_ANON_KEY', '')
# Fall back to service role key if anon key not present
INSERT_KEY   = ANON_KEY or env.get('SUPABASE_SERVICE_ROLE_KEY', '')
SAMGOV_KEY   = env.get('SAMGOV_API_KEY', '')

if not SUPABASE_URL or not INSERT_KEY or INSERT_KEY.startswith('your_'):
    print("ERROR: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set in .env.local")
    sys.exit(1)

print(f"Supabase: {SUPABASE_URL}")
print(f"Insert key: {INSERT_KEY[:30]}...")

# ── Install dependencies quietly ─────────────────────────────────────────────
import subprocess
subprocess.run(
    [sys.executable, '-m', 'pip', 'install', '--quiet', '--user', 'requests', 'openpyxl'],
    capture_output=True
)
try:
    import requests
except ImportError:
    print("ERROR: 'requests' not installed. Run: pip3 install requests")
    sys.exit(1)

# ── Helpers ───────────────────────────────────────────────────────────────────
BROWSER_HEADERS = {
    'User-Agent': (
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) '
        'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    ),
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
}

def dedup(title, agency, deadline_date):
    s = f"{(title or '').lower()}{(agency or '').lower()}{deadline_date or ''}"
    return hashlib.sha256(s.encode()).hexdigest()

def parse_date(s):
    if not s: return None
    s = str(s).strip()
    for fmt in ['%m/%d/%Y', '%m/%d/%y', '%Y-%m-%d', '%B %d, %Y', '%b %d, %Y', '%m-%d-%Y']:
        try:
            return datetime.strptime(s, fmt).strftime('%Y-%m-%dT00:00:00Z')
        except:
            pass
    return None

def cents(s):
    if not s: return None
    try:
        return int(float(re.sub(r'[^0-9.]', '', str(s))) * 100)
    except:
        return None

def strip_tags(s):
    return re.sub(r'<[^>]+>', '', str(s or '')).strip()

def is_past(dt_str):
    if not dt_str: return False
    try:
        return datetime.strptime(dt_str[:10], '%Y-%m-%d') < datetime.now()
    except:
        return False

# ── Supabase upsert ───────────────────────────────────────────────────────────
def upsert(records, label):
    if not records:
        print(f"  [{label}] No records to upsert")
        return 0

    url = f"{SUPABASE_URL}/rest/v1/opportunities?on_conflict=dedup_hash"
    hdrs = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {INSERT_KEY}',
        'apikey': INSERT_KEY,
        'Prefer': 'resolution=merge-duplicates,return=minimal',
    }
    total = 0
    BATCH = 50
    for i in range(0, len(records), BATCH):
        batch = records[i:i+BATCH]
        try:
            r = requests.post(url, json=batch, headers=hdrs, timeout=30)
            if r.status_code in (200, 201, 204):
                total += len(batch)
            else:
                print(f"  [{label}] Batch {i//BATCH+1} HTTP {r.status_code}: {r.text[:200]}")
        except Exception as e:
            print(f"  [{label}] Batch {i//BATCH+1} error: {e}")
    print(f"  [{label}] ✓ {total}/{len(records)} upserted")
    return total


# ══════════════════════════════════════════════════════════════════════════════
# SOURCE 1: PA eMarketplace — BidContracts.aspx Excel export
# ══════════════════════════════════════════════════════════════════════════════
def pa_emarketplace_contracts():
    print("\n━━━━ SOURCE 1: PA eMarketplace BidContracts ━━━━")
    records = []
    BASE = 'https://www.emarketplace.state.pa.us'

    try:
        sess = requests.Session()
        sess.headers.update(BROWSER_HEADERS)

        # Check if site is up
        r = sess.get(f'{BASE}/BidContracts.aspx', timeout=20)
        print(f"  GET BidContracts.aspx → {r.status_code}, {len(r.text)} chars")

        if r.status_code != 200 or 'offline' in r.text.lower() or 'unavailable' in r.text.lower():
            print("  ⚠ Site appears down or returning error page — skipping")
            return records

        html = r.text

        def hidden(name):
            for attr in ['name', 'id']:
                m = re.search(rf'{attr}="{re.escape(name)}"[^>]*value="([^"]*)"', html, re.IGNORECASE)
                if m: return m.group(1)
                m = re.search(rf'value="([^"]*)"[^>]*{attr}="{re.escape(name)}"', html, re.IGNORECASE)
                if m: return m.group(1)
            return ''

        vs  = hidden('__VIEWSTATE')
        vsg = hidden('__VIEWSTATEGENERATOR')
        ev  = hidden('__EVENTVALIDATION')

        print(f"  ViewState: {len(vs)} chars, EventValidation: {len(ev)} chars")
        if not vs:
            print("  ERROR: Could not extract ViewState — page structure may have changed")
            return records

        print("  POSTing Export All to Excel...")
        post_data = {
            '__EVENTTARGET': '',
            '__EVENTARGUMENT': '',
            '__LASTFOCUS': '',
            '__VIEWSTATE': vs,
            '__VIEWSTATEGENERATOR': vsg,
            '__SCROLLPOSITIONX': '0',
            '__SCROLLPOSITIONY': '0',
            '__VIEWSTATEENCRYPTED': '',
            '__EVENTVALIDATION': ev,
            'ctl00$MainBody$ddlSearch': 'All Items',
            'ctl00$MainBody$ddlPages': 'ALL',
            'ctl00$MainBody$grprdo': 'rdoBoth',
            'ctl00$MainBody$hdnAdmin': 'False',
            'ctl00$MainBody$btnExport': 'Export All to Excel',
        }

        r2 = sess.post(f'{BASE}/BidContracts.aspx', data=post_data, timeout=90)
        ct = r2.headers.get('Content-Type', '')
        print(f"  Response: {r2.status_code}, Content-Type: {ct}, Size: {len(r2.content)} bytes")

        is_excel = (
            'spreadsheet' in ct or 'excel' in ct or 'octet' in ct or
            r2.content[:4] in (b'PK\x03\x04', b'\xd0\xcf\x11\xe0')
        )

        if is_excel:
            try:
                import openpyxl
                wb = openpyxl.load_workbook(io.BytesIO(r2.content), read_only=True, data_only=True)
                ws = wb.active
                all_rows = list(ws.iter_rows(values_only=True))
                print(f"  Excel: {len(all_rows)} rows")
                if len(all_rows) < 2:
                    print("  Excel too short — no data rows")
                    return records

                hdrs = [str(h or '').strip().lower() for h in all_rows[0]]
                print(f"  Columns: {hdrs[:10]}")

                def col(*keywords):
                    for kw in keywords:
                        for i, h in enumerate(hdrs):
                            if kw in h: return i
                    return None

                i_title  = col('description', 'subject', 'title', 'commodity', 'bid')
                i_agency = col('agency', 'department', 'org', 'bureau')
                i_vendor = col('supplier', 'vendor', 'contractor', 'awardee')
                i_solnum = col('contract no', 'contract number', 'number', 'solicit', 'bid no')
                i_end    = col('end date', 'expir', 'close', 'deadline', 'due')
                i_start  = col('start date', 'award date', 'effective', 'posted')
                i_value  = col('amount', 'value', 'total', 'price')

                def cell(row, idx, default=''):
                    if idx is None or idx >= len(row): return default
                    v = row[idx]
                    return str(v).strip() if v is not None else default

                for row in all_rows[1:]:
                    if not any(row): continue
                    title = cell(row, i_title)
                    if not title or len(title) < 3:
                        title = next((str(c).strip() for c in row if c and len(str(c).strip()) > 5), '')
                    if not title: continue

                    agency   = cell(row, i_agency) or 'Commonwealth of Pennsylvania'
                    sol_num  = cell(row, i_solnum)
                    end_str  = cell(row, i_end)
                    start_str= cell(row, i_start)
                    val_str  = cell(row, i_value)
                    vendor   = cell(row, i_vendor)
                    deadline = parse_date(end_str)
                    posted   = parse_date(start_str)
                    dd_date  = deadline[:10] if deadline else None
                    status   = 'awarded' if dd_date and is_past(dd_date) else 'active'
                    desc     = f"Vendor/Supplier: {vendor}" if vendor else None

                    records.append({
                        'title': title[:500],
                        'agency_name': agency[:300],
                        'source': 'state_pa_emarketplace',
                        'status': status,
                        'solicitation_number': sol_num[:100] if sol_num else None,
                        'deadline': deadline,
                        'posted_date': posted,
                        'value_max': cents(val_str),
                        'description': desc,
                        'place_of_performance_state': 'PA',
                        'url': f'{BASE}/BidContracts.aspx',
                        'dedup_hash': dedup(title, agency, dd_date),
                        'canonical_sources': ['state_pa_emarketplace'],
                        'threshold_category': 'state',
                    })

                print(f"  ✓ Parsed {len(records)} contracts from Excel")

            except ImportError:
                print("  openpyxl not installed — run: pip3 install openpyxl")
            except Exception as e:
                print(f"  Excel parse error: {e}")
                traceback.print_exc()
        else:
            # Got HTML back — parse table
            print("  Got HTML response — parsing table rows")
            all_rows_html = re.findall(r'<tr[^>]*>(.*?)</tr>', r2.text, re.DOTALL | re.IGNORECASE)
            print(f"  Found {len(all_rows_html)} table rows")
            for row in all_rows_html[1:]:
                cells = [strip_tags(c) for c in re.findall(r'<td[^>]*>(.*?)</td>', row, re.DOTALL)]
                if len(cells) < 2: continue
                title = cells[1] if len(cells) > 1 else cells[0]
                if not title or len(title) < 4: continue
                agency = cells[2] if len(cells) > 2 else 'Commonwealth of Pennsylvania'
                sol    = cells[0] if cells[0] else None
                records.append({
                    'title': title[:500],
                    'agency_name': agency[:300],
                    'source': 'state_pa_emarketplace',
                    'status': 'active',
                    'solicitation_number': sol,
                    'place_of_performance_state': 'PA',
                    'url': f'{BASE}/BidContracts.aspx',
                    'dedup_hash': dedup(title, agency, None),
                    'canonical_sources': ['state_pa_emarketplace'],
                    'threshold_category': 'state',
                })
            print(f"  HTML parse: {len(records)} rows")

    except requests.exceptions.ConnectionError as e:
        print(f"  Cannot connect to PA eMarketplace: {e}")
    except requests.exceptions.Timeout:
        print("  Timeout connecting to PA eMarketplace")
    except Exception as e:
        print(f"  Exception: {e}")
        traceback.print_exc()

    return records


# ══════════════════════════════════════════════════════════════════════════════
# SOURCE 2: PA eMarketplace — Active Solicitations
# ══════════════════════════════════════════════════════════════════════════════
def pa_emarketplace_solicitations():
    print("\n━━━━ SOURCE 2: PA eMarketplace Active Solicitations ━━━━")
    records = []
    BASE = 'https://www.emarketplace.state.pa.us'
    sess = requests.Session()
    sess.headers.update(BROWSER_HEADERS)

    for path in ['/ActiveSolicitations.aspx', '/Solicitations/SolicitationSearch.aspx',
                 '/Search.aspx', '/Solicitations/']:
        try:
            url = BASE + path
            r = sess.get(url, timeout=20, allow_redirects=True)
            print(f"  {path} → {r.status_code}")
            if r.status_code != 200: continue
            if 'unavailable' in r.text.lower() or 'offline' in r.text.lower():
                print("  Site unavailable")
                break

            rows_html = re.findall(r'<tr[^>]*>(.*?)</tr>', r.text, re.DOTALL | re.IGNORECASE)
            found = 0
            for row in rows_html:
                cells = [strip_tags(c) for c in re.findall(r'<td[^>]*>(.*?)</td>', row, re.DOTALL)]
                if len(cells) < 3: continue
                title = cells[1] if cells[1] and len(cells[1]) > 4 else cells[0]
                if not title or len(title) < 4: continue
                if title.lower() in ('description', 'solicitation', 'title', 'bid', 'subject'): continue
                agency = cells[2] if len(cells) > 2 else 'Commonwealth of Pennsylvania'
                sol    = cells[0]
                due    = cells[-1] if len(cells) > 3 else None
                dl     = parse_date(due)
                dd_date = dl[:10] if dl else None
                records.append({
                    'title': title[:500],
                    'agency_name': agency[:300],
                    'source': 'state_pa_emarketplace',
                    'status': 'active',
                    'solicitation_number': sol[:100] if sol else None,
                    'deadline': dl,
                    'place_of_performance_state': 'PA',
                    'url': url,
                    'dedup_hash': dedup(title, agency, dd_date),
                    'canonical_sources': ['state_pa_emarketplace'],
                    'threshold_category': 'state',
                })
                found += 1

            print(f"  Parsed {found} solicitations")
            if found > 0: break  # got data, don't try other paths

        except requests.exceptions.ConnectionError:
            print(f"  Cannot connect to {path}")
            break
        except requests.exceptions.Timeout:
            print(f"  Timeout on {path}")
            continue
        except Exception as e:
            print(f"  Error on {path}: {e}")

    return records


# ══════════════════════════════════════════════════════════════════════════════
# SOURCE 3: City of Pittsburgh — IonWave Procurement Portal
# Portal: https://pittsburgh.ionwave.net/Bids.aspx
# Note: IonWave works from Mac IPs; cloud IPs may be blocked.
# ══════════════════════════════════════════════════════════════════════════════
def pittsburgh_city():
    print("\n━━━━ SOURCE 3: City of Pittsburgh (IonWave) ━━━━")
    records = []

    pages = [
        ('https://pittsburgh.ionwave.net/Bids.aspx',   'Active Bids'),
        ('https://pittsburgh.ionwave.net/Awards.aspx',  'Awards'),
    ]

    for page_url, label in pages:
        page_records = []
        try:
            r = requests.get(page_url, headers=BROWSER_HEADERS, timeout=30)
            print(f"  {label} → {r.status_code} ({len(r.text)} chars)")
            if r.status_code != 200:
                continue

            rows = re.findall(r'<tr[^>]*>(.*?)</tr>', r.text, re.DOTALL | re.IGNORECASE)
            for row in rows:
                cells = [strip_tags(c).strip() for c in re.findall(r'<td[^>]*>(.*?)</td>', row, re.DOTALL)]
                if len(cells) < 2:
                    continue
                title = cells[0] if len(cells[0]) > 4 else ''
                if not title:
                    continue

                # Try to find a deadline in any cell
                dl = None
                for cell in reversed(cells):
                    parsed = parse_date(cell)
                    if parsed:
                        dl = parsed
                        break
                dd  = dl[:10] if dl else None
                sol = cells[1].strip() if len(cells) > 1 else ''

                page_records.append({
                    'title': title[:500],
                    'agency_name': 'City of Pittsburgh',
                    'source': 'local_pittsburgh',
                    'status': 'active',
                    'solicitation_number': sol[:100] if sol else None,
                    'deadline': dl,
                    'place_of_performance_state': 'PA',
                    'place_of_performance_city': 'Pittsburgh',
                    'url': page_url,
                    'dedup_hash': dedup(title, 'City of Pittsburgh', dd),
                    'canonical_sources': ['local_pittsburgh'],
                    'threshold_category': 'local',
                })

            print(f"  ✓ {len(page_records)} rows from {label}")
            records.extend(page_records)

        except requests.exceptions.ConnectionError:
            print(f"  Cannot connect: {page_url}")
        except requests.exceptions.Timeout:
            print(f"  Timeout: {page_url}")
        except Exception as e:
            print(f"  Error on {label}: {e}")

    print(f"  Pittsburgh total: {len(records)} records")
    return records


# ══════════════════════════════════════════════════════════════════════════════
# SOURCE 4: Allegheny County — PAVNextGen REST API
# Portal: https://documents.alleghenycounty.us/PAVClient/ContractSearch/index.html
# API:    https://documents.alleghenycounty.us/PAVNextGen/api/CustomQuery/KeywordSearch
# Query ID 232 = "Contracts - 2015" — all contracts since 2015
# Uses date-range windows to overcome the server-side 2,000-record truncation.
# Works from any IP (no cloud blocking) — confirmed returning 3,200+ records.
# ══════════════════════════════════════════════════════════════════════════════
def allegheny_pavnextgen():
    print("\n━━━━ SOURCE 4: Allegheny County (PAVNextGen API) ━━━━")
    records = []

    API_URL  = 'https://documents.alleghenycounty.us/PAVNextGen/api/CustomQuery/KeywordSearch'
    PORTAL   = 'https://documents.alleghenycounty.us/PAVClient/ContractSearch/index.html'
    QUERY_ID = 232  # "Contracts - 2015"
    today    = datetime.now().strftime('%Y-%m-%d')

    # Date ranges to work around 2,000-record server-side truncation per call
    date_ranges = [
        ('01/01/2015', '12/31/2020'),
        ('01/01/2021', '12/31/2022'),
        ('01/01/2023', '12/31/2024'),
        ('01/01/2025', '12/31/2030'),
    ]

    seen = set()

    for from_date, to_date in date_ranges:
        print(f"  Fetching {from_date} → {to_date}...")
        try:
            r = requests.post(
                API_URL,
                json={
                    'QueryID':   QUERY_ID,
                    'Keywords':  [],
                    'FromDate':  from_date,
                    'ToDate':    to_date,
                    'QueryLimit': 0,
                },
                headers={
                    'Content-Type': 'application/json',
                    'Accept':       'application/json',
                    'User-Agent':   'GovConAssistantBot/1.0',
                    'Referer':      PORTAL,
                    'Origin':       'https://documents.alleghenycounty.us',
                },
                timeout=60,
            )
            print(f"    → {r.status_code}, {len(r.content)} bytes")
            if r.status_code != 200:
                print(f"    HTTP {r.status_code} — skipping range")
                continue

            parsed = json.loads(r.content.decode('utf-8', errors='replace'))
            batch  = parsed.get('Data', [])
            print(f"    {len(batch)} records (Truncated={parsed.get('Truncated', '?')})")

            for rec in batch:
                cols   = rec.get('DisplayColumnValues', [])
                dept   = cols[0].get('Value', '').strip() if len(cols) > 0 else ''
                vendor = cols[1].get('Value', '').strip() if len(cols) > 1 else ''
                agree  = cols[2].get('Value', '').strip() if len(cols) > 2 else ''
                start  = cols[3].get('Value', '').strip() if len(cols) > 3 else ''
                end    = cols[4].get('Value', '').strip() if len(cols) > 4 else ''

                if not dept and not agree:
                    continue

                parts  = [p for p in [vendor, dept, f'Agreement #{agree}' if agree else ''] if p]
                title  = ' — '.join(parts) or f'Allegheny County Contract {agree}'
                agency = f'Allegheny County - {dept}' if dept else 'Allegheny County'

                dl_raw = parse_date(end)
                dd     = dl_raw[:10] if dl_raw else None
                posted = parse_date(start)
                status = 'active' if (not dd or dd >= today) else 'expired'

                h = dedup(title, agency, dd)
                if h in seen:
                    continue
                seen.add(h)

                records.append({
                    'title':       title[:500],
                    'agency_name': agency[:255],
                    'source':      'local_allegheny',
                    'status':      status,
                    'solicitation_number': agree or None,
                    'deadline':    dl_raw,
                    'posted_date': posted,
                    'place_of_performance_state': 'PA',
                    'place_of_performance_city':  'Pittsburgh',
                    'url':         PORTAL,
                    'description': (
                        f'Allegheny County contract. Vendor: {vendor or "N/A"}. '
                        f'Department: {dept or "N/A"}. Agreement #{agree}. '
                        f'Period: {start} to {end}'
                    )[:1000],
                    'dedup_hash':       h,
                    'canonical_sources': ['local_allegheny'],
                    'threshold_category': 'local',
                    'contract_type': 'contract',
                })

        except requests.exceptions.Timeout:
            print(f"    Timeout on {from_date}–{to_date}")
        except Exception as e:
            print(f"    Error on {from_date}–{to_date}: {e}")

    active = sum(1 for rec in records if rec.get('status') == 'active')
    print(f"  ✓ Allegheny County: {len(records)} total ({active} active)")
    return records


# ══════════════════════════════════════════════════════════════════════════════
# SOURCE 5: SAM.gov — PA Active Solicitations
# ══════════════════════════════════════════════════════════════════════════════
def samgov_pa_solicitations():
    print("\n━━━━ SOURCE 5: SAM.gov PA Solicitations ━━━━")
    records = []

    if not SAMGOV_KEY or SAMGOV_KEY.startswith('your_'):
        print("  Skipping — SAMGOV_API_KEY not set in .env.local")
        return records

    try:
        from datetime import timedelta
        today  = datetime.now()
        # Fetch last 365 days — captures all active PA federal solicitations
        from_dt = (today - timedelta(days=365)).strftime('%m/%d/%Y')
        to_dt   = today.strftime('%m/%d/%Y')
        today_s = today.strftime('%Y-%m-%d')

        # Paginate through all results (SAM.gov max 1,000 per page)
        PAGE_LIMIT = 1000
        offset = 0
        all_opps = []

        while True:
            url = (
                f"https://api.sam.gov/opportunities/v2/search"
                f"?api_key={SAMGOV_KEY}"
                f"&postedFrom={from_dt}&postedTo={to_dt}"
                f"&ptype=o,k,r,s,p,u,a"
                f"&state=PA"
                f"&status=active"
                f"&limit={PAGE_LIMIT}"
                f"&offset={offset}"
            )
            r = requests.get(url, timeout=60)
            print(f"  SAM.gov offset={offset} → {r.status_code}, {len(r.text)} chars")
            if r.status_code != 200:
                print(f"  SAM.gov error: {r.text[:200]}")
                break
            data     = r.json()
            page_ops = data.get('opportunitiesData', [])
            total    = data.get('totalRecords', 0)
            all_opps.extend(page_ops)
            print(f"    Got {len(page_ops)} | Running total: {len(all_opps)} / {total}")
            if len(all_opps) >= total or len(page_ops) == 0:
                break
            offset += PAGE_LIMIT
            time.sleep(0.3)  # courtesy delay

        print(f"  SAM.gov: {len(all_opps)} total PA active opportunities")

        for opp in all_opps:
            title   = (opp.get('title') or '')[:500]
            if not title: continue
            agency  = (opp.get('fullParentPathName') or opp.get('organizationName') or 'US Federal Government')[:300]
            sol_num = (opp.get('solicitationNumber') or '')[:100]
            dl_str  = opp.get('responseDeadLine') or opp.get('archiveDate')
            dl      = parse_date(dl_str)
            dd      = dl[:10] if dl else None
            posted  = parse_date(opp.get('postedDate'))
            opp_url = f"https://sam.gov/opp/{opp.get('noticeId', '')}/view"
            naics   = opp.get('naicsCode', '')
            pop     = opp.get('placeOfPerformance', {}) or {}
            pop_state = (pop.get('state', {}) or {}).get('code', 'PA')
            pop_city  = (pop.get('city', {}) or {}).get('name', '')
            pop_zip   = (pop.get('zip') or '')[:10]
            # Determine status: active only if deadline is in future or unknown
            status = 'expired' if (dd and dd < today_s) else 'active'

            records.append({
                'title': title,
                'agency_name': agency,
                'source': 'federal_samgov',
                'status': status,
                'solicitation_number': sol_num or None,
                'naics_code': int(naics) if naics and str(naics).isdigit() else None,
                'deadline': dl,
                'posted_date': posted,
                'place_of_performance_state': pop_state or 'PA',
                'place_of_performance_city': pop_city or None,
                'place_of_performance_zip': pop_zip or None,
                'url': opp_url,
                'description': (opp.get('description') or '')[:1000] or None,
                'set_aside_type': (opp.get('typeOfSetAsideDescription') or '')[:100] or None,
                'dedup_hash': dedup(title, agency, dd),
                'canonical_sources': ['federal_samgov'],
                'threshold_category': 'federal',
            })

        # Only keep active records
        records = [r for r in records if r.get('status') == 'active']
        print(f"  ✓ {len(records)} active SAM.gov PA opportunities")

    except Exception as e:
        print(f"  SAM.gov exception: {e}")
        traceback.print_exc()

    return records


# ══════════════════════════════════════════════════════════════════════════════
# MAIN
# ══════════════════════════════════════════════════════════════════════════════
if __name__ == '__main__':
    print("\n" + "═"*60)
    print(" PA State & Local Opportunities Ingestion")
    print("═"*60)

    grand_total = 0
    seen_hashes = set()

    def run_and_upsert(fn, label):
        global grand_total
        try:
            recs = fn()
            # Deduplicate within session
            unique = []
            for r in recs:
                h = r.get('dedup_hash', '')
                if h and h not in seen_hashes:
                    seen_hashes.add(h)
                    unique.append(r)
            if unique:
                grand_total += upsert(unique, label)
            else:
                print(f"  [{label}] 0 unique records")
        except Exception as e:
            print(f"  [{label}] FATAL: {e}")
            traceback.print_exc()

    run_and_upsert(pa_emarketplace_contracts,    "PA eMarketplace Contracts")
    run_and_upsert(pa_emarketplace_solicitations,"PA eMarketplace Solicitations")
    run_and_upsert(pittsburgh_city,               "Pittsburgh City (IonWave)")
    run_and_upsert(allegheny_pavnextgen,          "Allegheny County (PAVNextGen)")
    run_and_upsert(samgov_pa_solicitations,       "SAM.gov PA")

    print("\n" + "═"*60)
    print(f" ✅ Total upserted this run: {grand_total}")
    print("═"*60)
