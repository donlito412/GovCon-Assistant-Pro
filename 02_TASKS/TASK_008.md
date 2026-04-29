TASK ID: 008

STATUS: PENDING

GOAL:
Build the Analytics Dashboard — spending trends, contract volume by source, deadline radar, and pipeline performance stats. Gives Jon a real-time market intelligence view of the Pittsburgh government contracting landscape.

ASSIGNED TO: Claude

INPUTS:
- /01_BRIEF/project.md
- /03_OUTPUTS/TASK_001_scaffold/lib/types.ts
- /03_OUTPUTS/TASK_004_discovery_ui/ (contracts data)
- /03_OUTPUTS/TASK_005_pipeline/ (pipeline data)

OUTPUT:
/03_OUTPUTS/TASK_008_analytics/
  - /app/(dashboard)/analytics/page.tsx — analytics dashboard page
  - /components/analytics/StatCard.tsx — KPI metric card
  - /components/analytics/ContractsBySourceChart.tsx — pie/donut chart by source (Federal/State/Local)
  - /components/analytics/ContractVolumeChart.tsx — line chart of new contracts posted per week
  - /components/analytics/SpendingByNaicsChart.tsx — horizontal bar chart, top NAICS by total value
  - /components/analytics/DeadlineRadar.tsx — timeline view of upcoming deadlines (next 30/60/90 days)
  - /components/analytics/PipelineValueChart.tsx — stacked bar chart, pipeline $ by stage
  - /components/analytics/TopAgenciesTable.tsx — top 10 agencies by active opportunity count
  - /lib/api/analytics.ts — analytics data hooks
  - /app/api/analytics/route.ts — aggregate stats endpoint

DASHBOARD METRICS:
Top KPI cards:
- Total active opportunities (Pittsburgh area, all sources)
- New opportunities this week
- Total $ value tracked (all active)
- Soonest deadline (days remaining)
- Pipeline total value (all stages)
- Win rate (won / (won + lost) × 100%)

Charts:
- Contracts by Source: Federal vs PA State vs Local (donut chart)
- Contract Volume Over Time: new contracts posted per week (last 12 weeks, line chart)
- Top NAICS Codes by Total Value: top 10 codes in active opportunities (horizontal bar)
- Deadline Radar: calendar/timeline showing contracts due in next 90 days
- Pipeline by Stage: $ value in each pipeline stage (stacked bar)
- Top 10 Active Agencies: table with agency, active count, avg value

STEPS:
1. Build /api/analytics route that returns all dashboard data in one call
2. Aggregate from Supabase:
   - COUNT + SUM by source
   - Weekly contract post counts (last 12 weeks)
   - Top 10 NAICS codes by SUM(value)
   - Opportunities grouped by deadline bucket
   - Pipeline $ by stage
3. Build each chart component using recharts
4. Build DeadlineRadar as horizontal timeline (grouped by week)
5. Auto-refresh every 5 minutes via SWR

CONSTRAINTS:
- All computations done in Supabase SQL (not in JS) for performance
- Charts must have clear labels, tooltips, and a legend
- Dashboard must load in < 2 seconds (single aggregation API call)
- All recharts components fully responsive (resize with window)
- Win rate calculation only appears once there are >= 3 outcomes tracked

AFTER COMPLETION:
- Update /04_LOGS/project_log.md
- Change STATUS to DONE
- Next task: TASK_009
