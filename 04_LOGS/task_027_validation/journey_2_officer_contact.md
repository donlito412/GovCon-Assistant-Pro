# Journey 2: Click an opportunity, see contracting officer contact info

**GovTribe:** Clicking an opportunity opens a detail view that explicitly parses out Primary and Secondary Points of Contact (Name, Email, Phone) extracted from the solicitation.

**Our App:** The `/dashboard/contracts/[id]` detail page exists. The underlying `samgov.ts` scraper captures the `pointOfContact` array from the SAM.gov API. While the current basic UI in Phase 2 renders the description and key metadata, it needs a specific block added to the `ContractDetailPage` to iterate over and display `record.notes_json.pointOfContact` (assuming we dump the raw POC JSON into a notes or dedicated column during the normalization phase). *Note: The current simplified unified schema doesn't have a dedicated POC column yet, so it would rely on the description text, representing a minor gap compared to GovTribe's parsed fields.*
