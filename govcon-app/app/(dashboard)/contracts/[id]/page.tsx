import { createServerSupabaseClient } from '@/lib/supabase';
import Link from 'next/link';

export default async function ContractDetailPage({ params }: { params: { id: string } }) {
  const supabase = createServerSupabaseClient();
  const recordId = parseInt(params.id, 10);

  // Fetch the record from opportunities.
  // NOTE: do NOT join agencies — opportunities has no agency_id column;
  // a join here causes the entire query to error out and the detail page
  // to render "Record not found" for every record. We fall back to the
  // agency_name text field below.
  const { data: record, error: recordError } = await supabase
    .from('opportunities')
    .select('*')
    .eq('id', recordId)
    .maybeSingle();

  if (recordError) {
    console.error('[contracts/[id]] supabase error:', recordError);
  }
  if (!record) return <div className="p-8">Record not found</div>;

  // Add dummy record_type since this is an opportunity
  const oppRecord = { ...record, record_type: 'opportunity' };

  // If this is an opportunity that is active, check if it's a recompete
  let pastAwards: any[] = [];
  if (oppRecord.agency_name) {
     const { data } = await supabase
        .from('contract_awards')
        .select('id, vendor_name, vendor_uei, date_signed, total_value, contract_number')
        .eq('agency_name', oppRecord.agency_name)
        .eq('naics_code', oppRecord.naics_code)
        .order('date_signed', { ascending: false })
        .limit(5);
     
     // Map contract_awards columns to match what the UI expects
     pastAwards = (data || []).map(a => ({
         ...a,
         awarded_date: a.date_signed,
         awarded_value: a.total_value,
     }));
  }

  // Fetch POC from SAM.gov dynamically
  let pocs: any[] = [];
  if (oppRecord.source === 'federal_samgov' && oppRecord.solicitation_number) {
    const apiKey = process.env.SAMGOV_API_KEY;
    if (apiKey) {
      try {
        const url = `https://api.sam.gov/opportunities/v2/search?api_key=${apiKey}&solnum=${oppRecord.solicitation_number}&limit=1`;
        const res = await fetch(url, { headers: { Accept: 'application/json' }, next: { revalidate: 3600 } });
        if (res.ok) {
          const data = await res.json();
          if (data?.opportunitiesData?.[0]?.pointOfContact) {
            pocs = data.opportunitiesData[0].pointOfContact;
          }
        }
      } catch (e) {
        console.error("Failed to fetch SAM.gov POC", e);
      }
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="bg-white p-6 rounded shadow border border-gray-200">
        <div className="flex justify-between items-start">
            <div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize mb-2 bg-blue-100 text-blue-800`}>
                    Opportunity
                </span>
                <h1 className="text-2xl font-bold text-gray-900">{oppRecord.title}</h1>
                <p className="text-gray-500 mt-1 flex items-center gap-2">
                    <span>{oppRecord.agency_name || 'Unknown Agency'}</span>
                    <span>•</span>
                    <span className="uppercase">{oppRecord.source}</span>
                </p>
            </div>
            <div className="text-right">
                {oppRecord.value_max ? (
                    <div className="text-sm font-medium text-gray-600">
                        Up to ${(oppRecord.value_max / 100).toLocaleString()}
                    </div>
                ) : null}
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Details Sidebar */}
          <div className="space-y-6 md:col-span-1">
              <div className="bg-white p-4 rounded shadow border border-gray-200">
                  <h3 className="font-semibold mb-3 border-b pb-2">Key Details</h3>
                  <dl className="space-y-2 text-sm">
                      <div>
                          <dt className="text-gray-500">Status</dt>
                          <dd className="font-medium capitalize">{oppRecord.status}</dd>
                      </div>
                      {oppRecord.deadline && (
                          <div>
                              <dt className="text-gray-500">Deadline</dt>
                              <dd className="font-medium text-red-600">{new Date(oppRecord.deadline).toLocaleString()}</dd>
                          </div>
                      )}
                      {oppRecord.solicitation_number && (
                          <div>
                              <dt className="text-gray-500">Solicitation #</dt>
                              <dd className="font-medium font-mono">{oppRecord.solicitation_number}</dd>
                          </div>
                      )}
                      {oppRecord.naics_code && (
                          <div>
                              <dt className="text-gray-500">NAICS</dt>
                              <dd className="font-medium">{oppRecord.naics_code}</dd>
                          </div>
                      )}
                  </dl>
              </div>

              {pocs.length > 0 && (
                  <div className="bg-white p-4 rounded shadow border border-gray-200">
                      <h3 className="font-semibold mb-3 border-b pb-2">Points of Contact</h3>
                      <div className="space-y-4">
                          {pocs.map((poc, i) => (
                              <div key={i} className="text-sm">
                                  <div className="font-medium">{poc.fullName || poc.title || 'Contact'} <span className="text-gray-500 text-xs ml-1 capitalize">({poc.type || 'Primary'})</span></div>
                                  {poc.email && <div className="text-gray-600"><a href={`mailto:${poc.email}`} className="text-blue-600 hover:underline">{poc.email}</a></div>}
                                  {poc.phone && <div className="text-gray-600">{poc.phone}</div>}
                              </div>
                          ))}
                      </div>
                  </div>
              )}
          </div>

          {/* Main Content */}
          <div className="space-y-6 md:col-span-2">
              <div className="bg-white p-6 rounded shadow border border-gray-200">
                  <h2 className="text-lg font-bold mb-4">Description</h2>
                  <div className="prose max-w-none text-sm text-gray-700 whitespace-pre-wrap">
                      {oppRecord.description && !/^https?:\/\//i.test(oppRecord.description.trim())
                        ? oppRecord.description
                        : <span className="text-gray-400 italic">No description in our DB. Use "View Original Source" below to read the full solicitation on SAM.gov.</span>}
                  </div>
                  {oppRecord.url && (
                      <div className="mt-6 pt-4 border-t">
                          <a href={oppRecord.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium inline-flex items-center">
                              View Original Source 
                              <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
                          </a>
                      </div>
                  )}
              </div>

              {/* Incumbent / Past Awards Logic */}
              {pastAwards.length > 0 && (
                  <div className="bg-white p-6 rounded shadow border border-gray-200">
                      <h2 className="text-lg font-bold mb-2 flex items-center gap-2">
                          <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                          Potential Recompetes / Past Work
                      </h2>
                      <p className="text-sm text-gray-500 mb-4">Past awards from this agency in the same NAICS code ({oppRecord.naics_code}).</p>
                      
                      <div className="space-y-3">
                          {pastAwards.map(award => (
                              <div key={award.id} className="p-3 bg-gray-50 rounded flex justify-between items-center text-sm border">
                                  <div>
                                      <Link href={`/dashboard/vendors/${award.vendor_uei}`} className="font-semibold text-blue-600 hover:underline">
                                          {award.vendor_name}
                                      </Link>
                                      <div className="text-gray-500 mt-1">
                                          Awarded {new Date(award.awarded_date).toLocaleDateString()}
                                          {award.contract_number && <span className="ml-2 font-mono">#{award.contract_number}</span>}
                                      </div>
                                  </div>
                                  <div className="font-bold text-green-600">
                                      ${((award.awarded_value || 0) / 100).toLocaleString()}
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
              )}
          </div>
      </div>
    </div>
  );
}
