#!/usr/bin/env python3
"""
PA State & Local Opportunities Ingestion
=========================================
Sources:
  1. PA eMarketplace (BidContracts.aspx) — Export All to Excel
  2. PA eMarketplace (Search.aspx) — Active solicitations page
  3. City of Pittsburgh / Allegheny BonfireHub public solicitations
  4. PA Treasury contracts API (contracts.patreasury.gov)

Inserts into Supabase `opportunities` table.
"""

import sys, os, re, json, hashlib, io, time
from datetime import datetime, timezone

# Read .env.local
def load_env(path):
    env = {}
    with open(path) as f:
        for line in f:
            line = line.strip()
            if '=' in line and not line.startswith('#'):
                k, v = line.split('=', 1)
                env[k.strip()] = v.strip().strip('"').strip("'")
    return env

env_path = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), 'govcon-app/.env.local')
env = load_env(env_path)

SUPABASE_URL = env.get('NEXT_PUBLIC_SUPABASE_URL', '').rstrip('/')
SERVICE_KEY  = env.get('SUPABASE_SERVICE_ROLE_KEY', '')

if not SUPABASE_URL or not SERVICE_KEY:
    print("ERROR: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing from .env.local")
    sys.exit(1)

import requests

HEADERS_WEB = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
}

def compute_dedup_hash(title, agency, deadline_date):
    s = f"{title.lower()}{(agency or '').lower()}{deadline_date or ''}"
    return hashlib.sha256(s.encode()).hexdigest()

def parse_date(s):
    """Try multiple date formats, return ISO string or None."""
    if not s:
        return None
    s = s.strip()
    for fmt in ['%m/%d/%Y', '%m/%d/%y', '%Y-%m-%d', '%B %d, %Y', '%b %d, %Y',
                '%m-%d-%Y', '%Y/%m/%d']:
        try:
            dt = datetime.strptime(s, fmt)
            return dt.strftime('%Y-%m-%dT00:00:00Z')
        except:
            pass
    return None

def dollars_to_cents(s):
    if not s:
        return None
    try:
        return int(float(re.sub(r'[^0-9.]', '', str(s))) * 100)
    except:
        return None

# ============================================================
# SUPABASE UPSERT
# ============================================================
def upsert_batch(records):
    if not records:
        return 0
    url = f"{SUPABASE_URL}/rest/v1/opportunities?on_conflict=dedup_hash"
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {SERVICE_KEY}',
        'apikey': SERVICE_KEY,
        'Prefer': 'resolution=merge-duplicates,return=minimal',
    }
    try:
        r = requests.post(url, json=records, headers=headers, timeout=30)
        if r.status_code in (200, 201):
            return len(records)
        else:
            print(f"  Upsert error {r.status_code}: {r.text[:200]}")
            return 0
    except Exception as e:
        print(f"  Upsert exception: {e}")
        return 0

def batch_upsert_all(records, source_label, batch_size=100):
    total = 0
    for i in range(0, len(records), batch_size):
        batch = records[i:i+batch_size]
        inserted = upsert_batch(batch)
        total += inserted
        print(f"  [{source_label}] Batch {i//batch_size + 1}: {inserted}/{len(batch)} upserted")
    return total

# ============================================================
# SOURCE 1: PA eMarketplace — Contracts Export (Excel)
# ============================================================
def fetch_pa_emarketplace_contracts():
    print("\n📋 PA eMarketplace — Contract Export...")
    records = []
    BASE = 'https://www.emarketplace.state.pa.us'

    session = requests.Session()
    session.headers.update(HEADERS_WEB)

    try:
        # Step 1: GET the contracts page to get ViewState
        r = session.get(f'{BASE}/BidContracts.aspx', timeout=20)
        if r.status_code != 200:
            print(f"  Failed to load BidContracts.aspx: HTTP {r.status_code}")
            return records

        html = r.text

        # Extract form fields
        def extract_hidden(name):
            m = re.search(rf'name="{name}"[^>]*value="([^"]*)"', html)
            if not m:
                m = re.search(rf'id="{name}"[^>]*value="([^"]*)"', html)
            return m.group(1) if m else ''

        viewstate = extract_hidden('__VIEWSTATE')
        viewstate_gen = extract_hidden('__VIEWSTATEGENERATOR')
        event_validation = extract_hidden('__EVENTVALIDATION')

        if not viewstate:
            print("  Could not extract ViewState")
            return records

        print(f"  Got ViewState ({len(viewstate)} chars). Submitting export...")

        # Step 2: POST to export all contracts as Excel
        # Select "Both" (open + archived) and "ALL" entries, then Export
        post_data = {
            '__EVENTTARGET': '',
            '__EVENTARGUMENT': '',
            '__LASTFOCUS': '',
            '__VIEWSTATE': viewstate,
            '__VIEWSTATEGENERATOR': viewstate_gen,
            '__SCROLLPOSITIONX': '0',
            '__SCROLLPOSITIONY': '0',
            '__VIEWSTATEENCRYPTED': '',
            '__EVENTVALIDATION': event_validation,
            'ctl00$MainBody$ddlSearch': 'All Items',
            'ctl00$MainBody$ddlPages': 'ALL',
            'ctl00$MainBody$grprdo': 'rdoBoth',  # Both open and archived
            'ctl00$MainBody$hdnAdmin': 'False',
            'ctl00$MainBody$btnExport': 'Export All to Excel',
        }

        r2 = session.post(f'{BASE}/BidContracts.aspx', data=post_data, timeout=60)

        content_type = r2.headers.get('Content-Type', '')
        print(f"  Response: HTTP {r2.status_code}, Content-Type: {content_type}, Size: {len(r2.content)} bytes")

        if r2.status_code == 200 and (
            'spreadsheet' in content_type or 'excel' in content_type or
            'octet-stream' in content_type or len(r2.content) > 5000
        ):
            try:
                import openpyxl
                wb = openpyxl.load_workbook(io.BytesIO(r2.content), read_only=True)
                ws = wb.active
                rows = list(ws.iter_rows(values_only=True))

                if len(rows) < 2:
                    print(f"  Excel had only {len(rows)} rows")
                    return records

                headers = [str(h).strip() if h else '' for h in rows[0]]
                print(f"  Excel columns: {headers}")
                print(f"  Total rows: {len(rows) - 1}")

                # Map column names (flexible)
                col = {}
                for i, h in enumerate(headers):
                    hl = h.lower()
                    if 'contract' in hl and 'no' in hl: col['sol_num'] = i
                    elif 'description' in hl: col['title'] = i
                    elif 'agency' in hl: col['agency'] = i
                    elif 'supplier' in hl and 'name' in hl: col['vendor'] = i
                    elif 'start' in hl and 'date' in hl: col['start'] = i
                    elif 'end' in hl and 'date' in hl: col['end'] = i
                    elif 'amount' in hl or 'value' in hl: col['value'] = i
                    elif 'category' in hl or 'commodity' in hl: col['category'] = i
                    elif 'status' in hl: col['status'] = i

                for row in rows[1:]:
                    if not any(row):
                        continue

                    def cell(key, default=''):
                        idx = col.get(key)
                        if idx is None or idx >= len(row):
                            return default
                        v = row[idx]
                        return str(v).strip() if v is not None else default

                    title = cell('title') or cell('category', 'PA State Contract')
                    if not title or len(title) < 3:
                        continue

                    agency = cell('agency') or 'Commonwealth of Pennsylvania'
                    sol_num = cell('sol_num')
                    end_date_str = cell('end')
                    start_date_str = cell('start')
                    value_str = cell('value')
                    status_raw = cell('status', 'active').lower()

                    deadline = parse_date(end_date_str)
                    posted = parse_date(start_date_str)
                    value_cents = dollars_to_cents(value_str)

                    # Determine status: if end_date is past, it's awarded/expired
                    status = 'active'
                    if deadline:
                        try:
                            end_dt = datetime.strptime(deadline[:10], '%Y-%m-%d')
                            if end_dt < datetime.now():
                                status = 'awarded'
                        except:
                            pass

                    deadline_date = deadline[:10] if deadline else None
                    dedup_hash = compute_dedup_hash(title, agency, deadline_date)

                    records.append({
                        'title': title[:500],
                        'agency_name': agency[:300],
                        'source': 'state_pa_emarketplace',
                        'status': status,
                        'solicitation_number': sol_num[:100] if sol_num else None,
                        'deadline': deadline,
                        'posted_date': posted,
                        'value_max': value_cents,
                        'place_of_performance_state': 'PA',
                        'url': f'{BASE}/BidContracts.aspx',
                        'dedup_hash': dedup_hash,
                        'canonical_sources': ['state_pa_emarketplace'],
                        'threshold_category': 'unknown',
                        'description': f"Vendor: {cell('vendor')}" if cell('vendor') else None,
                    })

                print(f"  ✓ Parsed {len(records)} contracts from Excel")

            except Exception as e:
                print(f"  Excel parsing failed: {e}")
                # Try as HTML if Excel fails
                try:
                    from html.parser import HTMLParser
                    # Parse HTML table if it returned HTML instead
                    rows_html = re.findall(r'<tr[^>]*>(.*?)</tr>', r2.text, re.DOTALL | re.IGNORECASE)
                    print(f"  Falling back to HTML parsing: {len(rows_html)} rows")
                except:
                    pass
        else:
            print(f"  Got HTML response instead of Excel — trying to parse table")
            # Parse the HTML table for any visible contracts
            rows_html = re.findall(r'<tr[^>]*>(.*?)</tr>', r2.text, re.DOTALL | re.IGNORECASE)
            for row in rows_html[1:]:
                cells = re.findall(r'<td[^>]*>(.*?)</td>', row, re.DOTALL | re.IGNORECASE)
                cells = [re.sub(r'<[^>]+>', '', c).strip() for c in cells]
                if len(cells) >= 3 and cells[1] and len(cells[1]) > 5:
                    title = cells[1]
                    agency = cells[2] if len(cells) > 2 else 'Commonwealth of Pennsylvania'
                    sol_num = cells[0] if cells[0] else None
                    dedup_hash = compute_dedup_hash(title, agency, None)
                    records.append({
                        'title': title[:500],
                        'agency_name': agency[:300],
                        'source': 'state_pa_emarketplace',
                        'status': 'active',
                        'solicitation_number': sol_num,
                        'place_of_performance_state': 'PA',
                        'url': f'{BASE}/BidContracts.aspx',
                        'dedup_hash': dedup_hash,
                        'canonical_sources': ['state_pa_emarketplace'],
                        'threshold_category': 'unknown',
                    })
            print(f"  HTML table parse: {len(records)} rows")

    except Exception as e:
        print(f"  Error: {e}")

    return records


# ============================================================
# SOURCE 2: PA eMarketplace — Active Solicitations (Search.aspx)
# ============================================================
def fetch_pa_emarketplace_solicitations():
    print("\n📋 PA eMarketplace — Active Solicitations...")
    records = []
    BASE = 'https://www.emarketplace.state.pa.us'

    session = requests.Session()
    session.headers.update(HEADERS_WEB)

    # Try the direct solicitations page
    search_urls = [
        f'{BASE}/Search.aspx',
        f'{BASE}/Solicitations/SolicitationSearch.aspx',
    ]

    for url in search_urls:
        try:
            r = session.get(url, timeout=20, allow_redirects=True)
            if r.status_code != 200:
                continue

            html = r.text

            # Look for data table rows
            table_match = re.search(r'<table[^>]*>.*?</table>', html, re.DOTALL | re.IGNORECASE)
            if not table_match:
                continue

            rows = re.findall(r'<tr[^>]*>(.*?)</tr>', html, re.DOTALL | re.IGNORECASE)
            found = 0
            for row in rows:
                cells = re.findall(r'<td[^>]*>(.*?)</td>', row, re.DOTALL | re.IGNORECASE)
                if len(cells) < 3:
                    continue
                cells = [re.sub(r'<[^>]+>', '', c).strip() for c in cells]
                # Filter out header rows and empty rows
                if cells[0].lower() in ('solicitation', 'number', 'sol', ''):
                    continue
                title = cells[1] if len(cells) > 1 else cells[0]
                if not title or len(title) < 5:
                    continue

                sol_num = cells[0]
                agency = cells[2] if len(cells) > 2 else 'Commonwealth of Pennsylvania'
                due_date = cells[-1] if len(cells) > 3 else None

                deadline = parse_date(due_date)
                deadline_date = deadline[:10] if deadline else None
                dedup_hash = compute_dedup_hash(title, agency, deadline_date)

                records.append({
                    'title': title[:500],
                    'agency_name': agency[:300],
                    'source': 'state_pa_emarketplace',
                    'status': 'active',
                    'solicitation_number': sol_num[:100] if sol_num else None,
                    'deadline': deadline,
                    'place_of_performance_state': 'PA',
                    'url': url,
                    'dedup_hash': dedup_hash,
                    'canonical_sources': ['state_pa_emarketplace'],
                    'threshold_category': 'unknown',
                })
                found += 1

            if found > 0:
                print(f"  ✓ Found {found} solicitations from {url}")
                break

        except Exception as e:
            print(f"  Error for {url}: {e}")

    if not records:
        print("  No solicitations found (PA eMarketplace may require POST/ViewState)")

    return records


# ============================================================
# SOURCE 3: PA Treasury Contracts (contracts.patreasury.gov)
# ============================================================
def fetch_pa_treasury_contracts():
    print("\n🏛️ PA Treasury Contracts...")
    records = []

    session = requests.Session()
    session.headers.update(HEADERS_WEB)

    try:
        # PA Treasury has a search API used by their frontend
        # Try common API patterns
        api_urls = [
            'https://contracts.patreasury.gov/api/contracts?limit=500&offset=0',
            'https://contracts.patreasury.gov/contract/search?format=json&limit=500',
            'https://www.patreasury.gov/Transparency/api/contracts?limit=500',
        ]

        for api_url in api_urls:
            try:
                r = session.get(api_url, timeout=15,
                               headers={**HEADERS_WEB, 'Accept': 'application/json'})
                if r.status_code == 200:
                    data = r.json()
                    print(f"  Found API at {api_url}: {type(data)}")
                    if isinstance(data, list) and len(data) > 0:
                        print(f"  Keys: {list(data[0].keys())}")
                        for row in data:
                            title = (row.get('description') or row.get('contract_description') or
                                    row.get('project_name') or row.get('title') or '')
                            if not title:
                                continue
                            agency = row.get('agency') or row.get('department') or 'Commonwealth of Pennsylvania'
                            value_str = row.get('amount') or row.get('value') or row.get('contract_amount')
                            dedup_hash = compute_dedup_hash(title, agency, None)
                            records.append({
                                'title': str(title)[:500],
                                'agency_name': str(agency)[:300],
                                'source': 'state_pa_emarketplace',
                                'status': 'awarded',
                                'value_max': dollars_to_cents(value_str),
                                'place_of_performance_state': 'PA',
                                'url': api_url,
                                'dedup_hash': dedup_hash,
                                'canonical_sources': ['state_pa_emarketplace'],
                                'threshold_category': 'unknown',
                            })
                        print(f"  ✓ {len(records)} records from Treasury API")
                        break
            except Exception as e:
                pass  # Try next URL

        if not records:
            # Try fetching the search page and extracting table data
            r = session.get('https://contracts.patreasury.gov/search.aspx', timeout=20)
            if r.status_code == 200:
                # Extract any visible contract rows
                rows = re.findall(r'<tr[^>]*class="[^"]*(?:odd|even|row)[^"]*"[^>]*>(.*?)</tr>',
                                 r.text, re.DOTALL | re.IGNORECASE)
                for row in rows[:500]:
                    cells = re.findall(r'<td[^>]*>(.*?)</td>', row, re.DOTALL | re.IGNORECASE)
                    cells = [re.sub(r'<[^>]+>', '', c).strip() for c in cells]
                    if len(cells) >= 2 and cells[0] and len(cells[0]) > 3:
                        title = cells[0]
                        agency = cells[1] if len(cells) > 1 else 'Commonwealth of Pennsylvania'
                        dedup_hash = compute_dedup_hash(title, agency, None)
                        records.append({
                            'title': title[:500],
                            'agency_name': agency[:300],
                            'source': 'state_pa_emarketplace',
                            'status': 'awarded',
                            'place_of_performance_state': 'PA',
                            'url': 'https://contracts.patreasury.gov/search.aspx',
                            'dedup_hash': dedup_hash,
                            'canonical_sources': ['state_pa_emarketplace'],
                            'threshold_category': 'unknown',
                        })
                print(f"  HTML table: {len(records)} records from Treasury page")

    except Exception as e:
        print(f"  Error: {e}")

    return records


# ============================================================
# SOURCE 4: City of Pittsburgh (BonfireHub public solicitations)
# ============================================================
def fetch_pittsburgh_city():
    print("\n🏙️ City of Pittsburgh Solicitations...")
    records = []

    session = requests.Session()
    session.headers.update({**HEADERS_WEB, 'Accept': 'application/json'})

    bonfire_urls = [
        'https://pittsburghpa.bonfirehub.com/api/opportunities/public?page=1&perPage=100&status=open',
        'https://pittsburghpa.bonfirehub.com/portal/opportunities/public?format=json',
        'https://pittsburghpa.ionwave.net/CurrentSolicitations.aspx',
    ]

    for url in bonfire_urls:
        try:
            r = session.get(url, timeout=15)
            if r.status_code == 200:
                content_type = r.headers.get('Content-Type', '')

                if 'json' in content_type:
                    data = r.json()
                    items = data if isinstance(data, list) else data.get('data', data.get('opportunities', []))
                    for item in items:
                        title = item.get('title') or item.get('name') or item.get('description') or ''
                        if not title:
                            continue
                        agency = 'City of Pittsburgh'
                        deadline_str = item.get('closingDate') or item.get('deadline') or item.get('due_date')
                        deadline = parse_date(str(deadline_str)[:20] if deadline_str else None)
                        deadline_date = deadline[:10] if deadline else None
                        dedup_hash = compute_dedup_hash(title, agency, deadline_date)
                        records.append({
                            'title': str(title)[:500],
                            'agency_name': agency,
                            'source': 'local_pittsburgh',
                            'status': 'active',
                            'deadline': deadline,
                            'place_of_performance_city': 'Pittsburgh',
                            'place_of_performance_state': 'PA',
                            'url': url,
                            'dedup_hash': dedup_hash,
                            'canonical_sources': ['local_pittsburgh'],
                            'threshold_category': 'unknown',
                        })
                    if records:
                        print(f"  ✓ {len(records)} from BonfireHub JSON")
                        break
                else:
                    # HTML parse
                    rows = re.findall(r'<tr[^>]*>(.*?)</tr>', r.text, re.DOTALL | re.IGNORECASE)
                    for row in rows[1:]:
                        cells = re.findall(r'<td[^>]*>(.*?)</td>', row, re.DOTALL | re.IGNORECASE)
                        cells = [re.sub(r'<[^>]+>', '', c).strip() for c in cells]
                        if len(cells) >= 2 and cells[0] and len(cells[0]) > 5:
                            title = cells[0]
                            agency = 'City of Pittsburgh'
                            dedup_hash = compute_dedup_hash(title, agency, None)
                            records.append({
                                'title': title[:500],
                                'agency_name': agency,
                                'source': 'local_pittsburgh',
                                'status': 'active',
                                'place_of_performance_city': 'Pittsburgh',
                                'place_of_performance_state': 'PA',
                                'url': url,
                                'dedup_hash': dedup_hash,
                                'canonical_sources': ['local_pittsburgh'],
                                'threshold_category': 'unknown',
                            })
                    if records:
                        print(f"  ✓ {len(records)} from Pittsburgh HTML")
                        break
        except Exception as e:
            pass

    if not records:
        print("  No Pittsburgh data found (BonfireHub may require login)")
    return records


# ============================================================
# SOURCE 5: Allegheny County Purchasing
# ============================================================
def fetch_allegheny_county():
    print("\n🏛️ Allegheny County Purchasing...")
    records = []

    session = requests.Session()
    session.headers.update(HEADERS_WEB)

    urls_to_try = [
        # IonWave is common for county procurement
        'https://allegheny.ionwave.net/CurrentSolicitations.aspx',
        'https://www.alleghenycounty.us/county-services/county-purchasing/purchasing-bids',
        # BonfireHub
        'https://allegheny.bonfirehub.com/api/opportunities/public?page=1&perPage=200',
    ]

    for url in urls_to_try:
        try:
            r = session.get(url, timeout=20)
            if r.status_code != 200:
                continue

            content_type = r.headers.get('Content-Type', '')

            if 'json' in content_type:
                data = r.json()
                items = data if isinstance(data, list) else data.get('data', data.get('opportunities', []))
                for item in items:
                    title = item.get('title') or item.get('name') or item.get('description') or ''
                    if not title:
                        continue
                    agency = 'Allegheny County'
                    deadline_str = item.get('closingDate') or item.get('deadline') or item.get('due_date')
                    deadline = parse_date(str(deadline_str)[:20] if deadline_str else None)
                    deadline_date = deadline[:10] if deadline else None
                    dedup_hash = compute_dedup_hash(title, agency, deadline_date)
                    records.append({
                        'title': str(title)[:500],
                        'agency_name': agency,
                        'source': 'local_allegheny',
                        'status': 'active',
                        'deadline': deadline,
                        'place_of_performance_city': 'Pittsburgh',
                        'place_of_performance_state': 'PA',
                        'url': url,
                        'dedup_hash': dedup_hash,
                        'canonical_sources': ['local_allegheny'],
                        'threshold_category': 'unknown',
                    })
                if records:
                    print(f"  ✓ {len(records)} from Allegheny JSON API")
                    break
            else:
                # Parse HTML table
                html = r.text
                rows = re.findall(r'<tr[^>]*>(.*?)</tr>', html, re.DOTALL | re.IGNORECASE)
                found = 0
                for row in rows:
                    cells = re.findall(r'<td[^>]*>(.*?)</td>', row, re.DOTALL | re.IGNORECASE)
                    if len(cells) < 2:
                        continue
                    cells = [re.sub(r'<[^>]+>', '', c).strip() for c in cells]

                    # Look for bid/solicitation rows
                    title = cells[0] if cells[0] and len(cells[0]) > 5 else None
                    if not title:
                        continue
                    # Skip header rows
                    title_lower = title.lower()
                    if any(word in title_lower for word in ['bid number', 'solicitation', 'description', 'header']):
                        continue

                    agency = 'Allegheny County'
                    deadline_str = cells[-1] if len(cells) > 1 else None
                    deadline = parse_date(deadline_str)
                    deadline_date = deadline[:10] if deadline else None
                    dedup_hash = compute_dedup_hash(title, agency, deadline_date)

                    records.append({
                        'title': title[:500],
                        'agency_name': agency,
                        'source': 'local_allegheny',
                        'status': 'active',
                        'deadline': deadline,
                        'place_of_performance_city': 'Pittsburgh',
                        'place_of_performance_state': 'PA',
                        'url': url,
                        'dedup_hash': dedup_hash,
                        'canonical_sources': ['local_allegheny'],
                        'threshold_category': 'unknown',
                    })
                    found += 1

                if found > 0:
                    print(f"  ✓ {found} rows from {url}")
                    break

        except Exception as e:
            print(f"  Error for {url}: {e}")

    if not records:
        print("  No Allegheny County data found")
    return records


# ============================================================
# MAIN
# ============================================================
def main():
    print("=" * 60)
    print("PA State & Local Opportunities Ingestion")
    print(f"Supabase: {SUPABASE_URL}")
    print("=" * 60)

    grand_total = 0

    # Source 1: PA eMarketplace contracts (Excel export)
    contracts = fetch_pa_emarketplace_contracts()
    if contracts:
        n = batch_upsert_all(contracts, 'PA eMarketplace Contracts')
        grand_total += n
        print(f"  → {n} contracts inserted")

    # Source 2: PA eMarketplace active solicitations
    solicitations = fetch_pa_emarketplace_solicitations()
    if solicitations:
        n = batch_upsert_all(solicitations, 'PA eMarketplace Solicitations')
        grand_total += n
        print(f"  → {n} solicitations inserted")

    # Source 3: PA Treasury
    treasury = fetch_pa_treasury_contracts()
    if treasury:
        n = batch_upsert_all(treasury, 'PA Treasury')
        grand_total += n
        print(f"  → {n} treasury contracts inserted")

    # Source 4: City of Pittsburgh
    pgh = fetch_pittsburgh_city()
    if pgh:
        n = batch_upsert_all(pgh, 'Pittsburgh City')
        grand_total += n
        print(f"  → {n} Pittsburgh records inserted")

    # Source 5: Allegheny County
    allegheny = fetch_allegheny_county()
    if allegheny:
        n = batch_upsert_all(allegheny, 'Allegheny County')
        grand_total += n
        print(f"  → {n} Allegheny records inserted")

    print("\n" + "=" * 60)
    print(f"✅ TOTAL INSERTED: {grand_total} state/local records")
    print("=" * 60)

if __name__ == '__main__':
    main()
