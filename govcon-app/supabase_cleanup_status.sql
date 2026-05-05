-- ============================================================
-- DATABASE CLEANUP: Fix Incorrect Status Values
-- Run this in Supabase SQL Editor to clean up stale data
-- ============================================================

-- 1. Update all opportunities with past deadlines to status='closed'
-- These are NOT opportunities anymore - they're expired solicitations
UPDATE opportunities
SET status = 'closed',
    updated_at = NOW()
WHERE deadline < NOW()
  AND status = 'active';

-- 2. Verify how many records we fixed
SELECT 
  status,
  COUNT(*) as count
FROM opportunities
GROUP BY status;

-- 3. Check if any records have null/invalid status and fix them
UPDATE opportunities
SET status = 'active',
    updated_at = NOW()
WHERE status IS NULL OR status = '';

-- 4. Log the cleanup
-- After running this, the Opportunities page should only show
-- contracts you can actually bid on (deadline in future)
