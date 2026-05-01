// ============================================================
// AGENCIES SEED MIGRATION
// Populates the agencies table with real Pittsburgh-area government agencies
// Run once to seed initial data for the Agency Directory
// ============================================================

import { createServerSupabaseClient } from '@/lib/supabase';

interface Agency {
  name: string;
  level: 'federal' | 'state' | 'local' | 'education';
  website: string | null;
  total_spend: number | null;
}

const AGENCIES: Agency[] = [
  // Federal Agencies
  {
    name: 'VA Pittsburgh Healthcare System',
    level: 'federal',
    website: 'https://www.pittsburgh.va.gov/',
    total_spend: null,
  },
  {
    name: 'U.S. Army Corps of Engineers - Pittsburgh District',
    level: 'federal',
    website: 'https://www.lrp.usace.army.mil/',
    total_spend: null,
  },
  {
    name: 'U.S. Environmental Protection Agency - Region 3',
    level: 'federal',
    website: 'https://www.epa.gov/aboutepa/epa-region-3',
    total_spend: null,
  },
  {
    name: 'U.S. General Services Administration - Region 3',
    level: 'federal',
    website: 'https://www.gsa.gov/region-3',
    total_spend: null,
  },
  {
    name: 'U.S. Department of Housing and Urban Development - Pittsburgh Field Office',
    level: 'federal',
    website: 'https://www.hud.gov/program_offices/public_indian_housing/regions/pittsburgh',
    total_spend: null,
  },
  {
    name: 'U.S. Small Business Administration - Pittsburgh District Office',
    level: 'federal',
    website: 'https://www.sba.gov/pa/pittsburgh-pa',
    total_spend: null,
  },
  {
    name: 'U.S. Department of Defense - Defense Logistics Agency - Pittsburgh',
    level: 'federal',
    website: 'https://www.dla.mil/',
    total_spend: null,
  },
  {
    name: 'U.S. Department of Transportation - Federal Highway Administration - Pennsylvania',
    level: 'federal',
    website: 'https://www.fhwa.dot.gov/pennsylvania',
    total_spend: null,
  },

  // State Agencies
  {
    name: 'Pennsylvania Department of General Services',
    level: 'state',
    website: 'https://www.dgs.pa.gov/',
    total_spend: null,
  },
  {
    name: 'Pennsylvania Department of Transportation - District 11',
    level: 'state',
    website: 'https://www.penndot.gov/Districts/Pages/Region-1-District-11.aspx',
    total_spend: null,
  },
  {
    name: 'Pennsylvania Department of Community and Economic Development',
    level: 'state',
    website: 'https://dced.pa.gov/',
    total_spend: null,
  },
  {
    name: 'Pennsylvania Department of Environmental Protection - Southwest Region',
    level: 'state',
    website: 'https://www.dep.pa.gov/About/RegionalOffices/Southwest/Pages/default.aspx',
    total_spend: null,
  },
  {
    name: 'Pennsylvania Department of Human Services - Southwest Region',
    level: 'state',
    website: 'https://www.dhs.pa.gov/Topics/Offices/Pages/Southwest-Office.aspx',
    total_spend: null,
  },
  {
    name: 'Pennsylvania Department of Education',
    level: 'state',
    website: 'https://www.education.pa.gov/',
    total_spend: null,
  },
  {
    name: 'Pennsylvania Department of Health',
    level: 'state',
    website: 'https://www.health.pa.gov/',
    total_spend: null,
  },

  // Local Agencies
  {
    name: 'City of Pittsburgh - Department of Finance',
    level: 'local',
    website: 'https://pittsburghpa.gov/finance/',
    total_spend: null,
  },
  {
    name: 'City of Pittsburgh - Office of Management and Budget',
    level: 'local',
    website: 'https://pittsburghpa.gov/omb/',
    total_spend: null,
  },
  {
    name: 'Allegheny County - Department of Administrative Services',
    level: 'local',
    website: 'https://www.alleghenycounty.us/administrative-services.aspx',
    total_spend: null,
  },
  {
    name: 'Port Authority of Allegheny County',
    level: 'local',
    website: 'https://www.portauthority.org/',
    total_spend: null,
  },
  {
    name: 'Urban Redevelopment Authority of Pittsburgh',
    level: 'local',
    website: 'https://ura.org/',
    total_spend: null,
  },
  {
    name: 'Pittsburgh Water and Sewer Authority',
    level: 'local',
    website: 'https://pgh2o.com/',
    total_spend: null,
  },
  {
    name: 'Pittsburgh Housing Authority',
    level: 'local',
    website: 'https://www.housingauthority.org/',
    total_spend: null,
  },
  {
    name: 'Allegheny County Sanitary Authority',
    level: 'local',
    website: 'https://www.alleghenycounty.us/ sanitary-authority.aspx',
    total_spend: null,
  },

  // Educational Institutions
  {
    name: 'University of Pittsburgh',
    level: 'education',
    website: 'https://www.pitt.edu/',
    total_spend: null,
  },
  {
    name: 'Carnegie Mellon University',
    level: 'education',
    website: 'https://www.cmu.edu/',
    total_spend: null,
  },
  {
    name: 'Community College of Allegheny County',
    level: 'education',
    website: 'https://www.ccac.edu/',
    total_spend: null,
  },
  {
    name: 'Pittsburgh Public Schools',
    level: 'education',
    website: 'https://www.pghschools.org/',
    total_spend: null,
  },
  {
    name: 'Duquesne University',
    level: 'education',
    website: 'https://www.duq.edu/',
    total_spend: null,
  },
  {
    name: 'Robert Morris University',
    level: 'education',
    website: 'https://www.rmu.edu/',
    total_spend: null,
  },
  {
    name: 'Point Park University',
    level: 'education',
    website: 'https://www.pointpark.edu/',
    total_spend: null,
  },
  {
    name: 'Carlow University',
    level: 'education',
    website: 'https://www.carlow.edu/',
    total_spend: null,
  },
];

/**
 * Seeds the agencies table with Pittsburgh-area government agencies
 */
export async function seedAgencies(): Promise<{
  inserted: number;
  updated: number;
  errors: string[];
}> {
  const supabase = createServerSupabaseClient();
  const errors: string[] = [];
  let inserted = 0;
  let updated = 0;

  console.log(`[seed-agencies] Starting to seed ${AGENCIES.length} agencies...`);

  for (const agency of AGENCIES) {
    try {
      // Check if agency already exists
      const { data: existing, error: fetchError } = await supabase
        .from('agencies')
        .select('id')
        .eq('name', agency.name)
        .maybeSingle();

      if (fetchError) {
        errors.push(`Error checking existing agency "${agency.name}": ${fetchError.message}`);
        continue;
      }

      if (existing) {
        // Update existing agency
        const { error: updateError } = await supabase
          .from('agencies')
          .update({
            level: agency.level,
            website: agency.website,
            total_spend: agency.total_spend,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);

        if (updateError) {
          errors.push(`Error updating agency "${agency.name}": ${updateError.message}`);
        } else {
          updated++;
          console.log(`[seed-agencies] Updated: ${agency.name}`);
        }
      } else {
        // Insert new agency
        const { error: insertError } = await supabase
          .from('agencies')
          .insert({
            name: agency.name,
            level: agency.level,
            website: agency.website,
            total_spend: agency.total_spend,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });

        if (insertError) {
          if (insertError.code === '23505') {
            // Unique constraint violation - treat as update
            updated++;
            console.log(`[seed-agencies] Skipped duplicate: ${agency.name}`);
          } else {
            errors.push(`Error inserting agency "${agency.name}": ${insertError.message}`);
          }
        } else {
          inserted++;
          console.log(`[seed-agencies] Inserted: ${agency.name}`);
        }
      }
    } catch (error) {
      const errorMsg = `Fatal error processing agency "${agency.name}": ${error instanceof Error ? error.message : String(error)}`;
      console.error(`[seed-agencies] ${errorMsg}`);
      errors.push(errorMsg);
    }
  }

  console.log(`[seed-agencies] Done. Inserted: ${inserted}, Updated: ${updated}, Errors: ${errors.length}`);
  return { inserted, updated, errors };
}

/**
 * API endpoint to trigger agency seeding
 */
export async function POST() {
  try {
    const result = await seedAgencies();
    
    return Response.json({
      success: result.errors.length === 0,
      agencies_inserted: result.inserted,
      agencies_updated: result.updated,
      errors: result.errors,
    }, { status: result.errors.length === 0 ? 200 : 500 });
  } catch (error) {
    console.error('[seed-agencies] API error:', error);
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}

// For running as a script (e.g., in development)
if (require.main === module) {
  seedAgencies()
    .then((result) => {
      console.log('\nSeed completed successfully!');
      console.log(`Inserted: ${result.inserted}, Updated: ${result.updated}, Errors: ${result.errors.length}`);
      if (result.errors.length > 0) {
        console.log('Errors:', result.errors);
      }
      process.exit(0);
    })
    .catch((error) => {
      console.error('Seed failed:', error);
      process.exit(1);
    });
}
