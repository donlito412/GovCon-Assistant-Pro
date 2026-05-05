# Journey 5: Click a vendor, see what else they've won

**GovTribe:** Clicking a vendor name takes you to a Vendor Profile. This page shows their total footprint in the federal market: total dollars won, which agencies they work with most, and a list of their recent prime contract awards.

**Our App:** The `/dashboard/vendors/[uei]` page is now implemented. When a user clicks a vendor from the Agency profile or Contract detail page, they arrive here. The page queries the unified `records` table for all awards matching that `vendor_uei`. It calculates their total dollars won, aggregates their wins by agency to show their best customers, and lists out their recent awards with links back to the specific contract detail pages. This completes the circular value loop (Opportunity -> Agency -> Vendor -> Contract).
