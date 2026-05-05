# Journey 4: Find the top 5 vendors winning from that agency

**GovTribe:** On the Agency Profile, there is a "Top Vendors" tab or section that lists the companies that have won the most contract dollars from this specific agency over a given timeframe.

**Our App:** On the `/dashboard/agencies/[id]` page, the code aggregates all awards for that agency by `vendor_uei`, sums the `awarded_value`, and renders the top 10 vendors in a dedicated card. Each vendor name is a clickable link to their specific vendor profile, perfectly mirroring GovTribe's entity relationship navigation.
