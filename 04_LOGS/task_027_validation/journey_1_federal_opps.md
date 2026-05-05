# Journey 1: Find federal opportunities posted in PA in the last 14 days

**GovTribe:** A user navigates to the Opportunities search, sets the Status to "Active", the Source to "Federal", and adds a "Place of Performance State: Pennsylvania" filter. They can then sort by Posted Date to see the most recent ones.

**Our App:** The ingestion layer (`samgov.ts`) is now hardcoded at the API request level to only fetch `state='PA'` opportunities within the last 30 days. When a user navigates to the generic `/dashboard/contracts` (or opportunities) list view, they are natively seeing exactly this dataset. It is no longer attempting to fetch the entire US and dropping records due to timeouts. The data is fresh and specifically scoped to PA at the source.
