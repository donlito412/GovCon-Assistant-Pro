# DATA SOURCES — PGH Gov Contracts
# Updated: 2026-04-29

---

## FEDERAL CONTRACTS

| Source | URL | API? | Auth | Notes |
|--------|-----|------|------|-------|
| SAM.gov Opportunities | https://open.gsa.gov/api/get-opportunities-public-api/ | Yes | API Key (free) | Primary federal source. Jon already registered. |
| SAM.gov Contract Awards | https://open.gsa.gov/api/contract-awards/ | Yes | API Key (free) | Past award data |
| USASpending.gov | https://api.usaspending.gov/ | Yes | None (open) | Spending analysis, award history |
| FPDS (via SAM.gov) | https://sam.gov/fpds | Yes | API Key | Federal Procurement Data System |

---

## STATE CONTRACTS (PENNSYLVANIA)

| Source | URL | API? | Auth | Notes |
|--------|-----|------|------|-------|
| PA eMarketplace | https://www.emarketplace.state.pa.us/ | No | None | Scraper required. Daily cron. |
| PA Treasury e-Library | https://contracts.patreasury.gov/ | No | None | Scraper required |
| PA Bulletin | https://www.pacodeandbulletin.gov/ | RSS | None | Weekly contract notices |

---

## LOCAL CONTRACTS

| Source | URL | API? | Auth | Notes |
|--------|-----|------|------|-------|
| Allegheny County Purchasing | https://www.alleghenycounty.us/Projects-and-Initiatives/Doing-Business-with-Allegheny-County-Bids-and-Solicitations/Purchasing-Bids-and-Proposals | No | None | Scraper required |
| Allegheny County Public Works | https://www.alleghenycounty.us/Projects-and-Initiatives/Doing-Business-with-Allegheny-County-Bids-and-Solicitations/Public-Works-Bids-and-Proposals | No | None | Construction/infrastructure bids |
| City of Pittsburgh | https://procurement.opengov.com/portal/pittsburghpa | No | None | OpenGov portal — scraper required |
| BidNet Direct PA | https://www.bidnetdirect.com/pennsylvania | Possible | Registration | Aggregates many PA municipalities |
| URA Proposals & Bids | https://www.ura.org/pages/proposals-bids | No | None | Urban Redevelopment Authority solicitations |

---

## EDUCATIONAL INSTITUTIONS

| Source | URL | API? | Auth | Notes |
|--------|-----|------|------|-------|
| University of Pittsburgh | https://www.ppt.pitt.edu/suppliers/info-suppliers/rfps | No | None | Scraper — Solicitations page (RFPs/RFQs) |
| Carnegie Mellon University | https://www.cmu.edu/finance/procurementservices/doing-business/index.html | No | None | Scraper — CMU procurement, PaymentWorks vendor system |
| CCAC | https://www.ccac.edu/about/procurement.php | No | None | Community College of Allegheny County bids + RFPs |
| Pittsburgh Public Schools | https://www.pghschools.org/community/business-opportunities/bids-proposals | No | None | Uses Beacon Bid platform — scraper or RSS |
| Duquesne University | https://www.duq.edu/about/administration/finance/procurement | No | None | Scraper required |

---

## GRANTS

| Source | URL | API? | Auth | Notes |
|--------|-----|------|------|-------|
| Grants.gov | https://grants.gov/api/common/search2 | Yes | None (open) | Federal grants API — no key needed. Filter by eligibility + Pittsburgh area. |
| PA Grants Portal | https://www.pa.gov/grants | No | None | Commonwealth of PA all grants — scraper |
| PA DCED | https://dced.pa.gov/ | No | None | Dept of Community & Economic Development — small business grants |
| URA Financial Assistance | https://www.ura.org/pages/financial-assistance-resources | No | None | Loans $5k–$500k, below-market rates. Grants + façade programs. |
| URA State & County Grants | https://www.ura.org/pages/state-and-county-development-grants | No | None | Aggregated PA + county development grants |
| Allegheny County Grants | https://www.alleghenycounty.us/ | No | None | County-level grant programs — scraper |
| SBA Grants & SBIR | https://www.sba.gov/funding-programs/grants | No | None | Small Business Innovation Research + other SBA programs |
| Duquesne SBDC | https://www.sbdc.duq.edu/grants | No | None | Aggregated grant list for Pittsburgh-area small businesses |

---

## BUSINESS MEETINGS & EVENTS

| Source | URL | API? | Auth | Notes |
|--------|-----|------|------|-------|
| Pittsburgh City Council | https://www.pittsburghpa.gov/City-Government/City-Council/Clerks-Office/Council-Meeting-Schedule | No | None | Official council meeting schedule — scraper |
| City Planning Meetings | https://www.pittsburghpa.gov/Business-Development/City-Planning/City-Planning-Meetings | No | None | Planning board, commissions, DAM meetings |
| Allegheny County Council | https://www.alleghenycounty.us/ | No | None | County council meeting calendar |
| Downtown PGH Dev Meetings | https://downtownpittsburgh.com/get-involved/development-activities-meetings/ | No | None | Downtown Development Activity Meetings |
| URA Board Meetings | https://www.ura.org/ | No | None | URA public board meetings — investment decisions |
| Pittsburgh Chamber | https://www.pittsburghregional.org/ | No | None | Pittsburgh Regional Alliance events |
| Pittsburgh Business Collective | https://pghbusinesscollective.com/events | No | None | Networking events + C-suite connections |
| Eventbrite Pittsburgh Business | https://www.eventbrite.com/b/pa--pittsburgh/business/ | Yes | None | API available — filter by Pittsburgh + business category |
| NAIOP Pittsburgh | https://www.naioppittsburgh.com/events | No | None | Real estate / development industry events |
| Pittsburgh Business Exchange | https://www.pittsburghbusinessexchange.com/ | No | None | B2B networking + executive speaker series |

---

## PITTSBURGH AREA ZIP CODE FILTER
Use when calling SAM.gov API with placeOfPerformance filter:

Allegheny County (Pittsburgh proper + suburbs):
15201, 15202, 15203, 15204, 15205, 15206, 15207, 15208, 15209, 15210,
15211, 15212, 15213, 15214, 15215, 15216, 15217, 15218, 15219, 15220,
15221, 15222, 15223, 15224, 15225, 15226, 15227, 15228, 15229, 15230,
15231, 15232, 15233, 15234, 15235, 15236, 15237, 15238, 15239, 15240,
15241, 15242, 15243, 15244, 15250, 15251, 15252, 15253, 15254, 15255,
15257, 15258, 15259, 15260, 15261, 15262, 15263, 15264, 15265, 15267,
15268, 15270, 15272, 15274, 15275, 15276, 15277, 15278, 15279, 15281,
15282, 15283, 15285, 15286, 15289, 15290

Surrounding counties:
- Butler County: 16001–16003
- Washington County: 15301
- Westmoreland County: 15601, 15626, 15650
- Beaver County: 15001, 15009, 15010
