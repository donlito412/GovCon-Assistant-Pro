# Journey 3: Click the agency, see their award history

**GovTribe:** From an opportunity or award, clicking the Agency name takes you to an Agency Profile. This profile aggregates total spending, shows a graph over time, and lists their top vendors.

**Our App:** The `/dashboard/agencies/[id]` page now exists and is linked from the contract detail page. It successfully queries the unified `records` table for all `record_type = 'award'` where the `agency_id` matches. It aggregates the `awarded_value` to show "Total Awarded (Last 24 Mo)" and displays a list of "Top Vendors" sorted by total dollars won, replicating the core GovTribe agency intelligence loop.
