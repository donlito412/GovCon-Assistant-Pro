import { createServerSupabaseClient } from '@/lib/supabase/server';
import Link from 'next/link';

export default async function ContractDetailPage({ params }: { params: { id: string } }) {
  const supabase = createServerSupabaseClient();
  const recordId = parseInt(params.id, 10);

  // Fetch the record (can be opportunity or award)
  const { data: record } = await supabase
    .from('records')
    .select('*, agency:agencies(id, name)')
    .eq('id', recordId)
    .single();

  if (!record) return <div className="p-8">Record not found</div>;

  // If this is an opportunity that is active, check if it's a recompete
  // by looking for past awards with a similar title/NAICS/agency.
  // This is a simplified proxy for "recompete radar" until we have contract lineage IDs.
  let pastAwards: any[] = [];
  if (record.record_type === 'opportunity' && record.agency_id) {
     const { data } = await supabase
        .from('records')
        .select('id, vendor_name, vendor_uei, awarded_date, awarded_value, contract_number')
        .eq('record_type', 'award')
        .eq('agency_id', record.agency_id)
        .eq('naics_code', record.naics_code)
        .order('awarded_date', { ascending: false })
        .limit(5);
     pastAwards = data || [];
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="bg-white p-6 rounded shadow border border-gray-200">
        <div className="flex justify-between items-start">
            <div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize mb-2 ${
                    record.record_type === 'award' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                }`}>
                    {record.record_type}
                </span>
                <h1 className="text-2xl font-bold text-gray-900">{record.title}</h1>
                <p className="text-gray-500 mt-1 flex items-center gap-2">
                    {record.agency_id ? (
                       <Link href={`/dashboard/agencies/${record.agency_id}`} className="text-blue-600 hover:underline">
                           {(record as any).agency?.name || 'Unknown Agency'}
                       </Link>
                    ) : (
                       <span>{record.agency_name || 'Unknown Agency'}</span>
                    )}
                    <span>•</span>
                    <span className="uppercase">{record.source}</span>
                </p>
            </div>
            <div className="text-right">
                {record.record_type === 'award' && record.awarded_value ? (
                    <div className="text-2xl font-bold text-green-600">${(record.awarded_value / 100).toLocaleString()}</div>
                ) : null}
                {record.record_type === 'opportunity' && record.value_max ? (
                    <div className="text-sm font-medium text-gray-600">
                        Up to ${(record.value_max / 100).toLocaleString()}
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
                          <dd className="font-medium capitalize">{record.status}</dd>
                      </div>
                      {record.deadline && (
                          <div>
                              <dt className="text-gray-500">Deadline</dt>
                              <dd className="font-medium text-red-600">{new Date(record.deadline).toLocaleString()}</dd>
                          </div>
                      )}
                      {record.awarded_date && (
                          <div>
                              <dt className="text-gray-500">Awarded On</dt>
                              <dd className="font-medium">{new Date(record.awarded_date).toLocaleDateString()}</dd>
                          </div>
                      )}
                      {record.solicitation_number && (
                          <div>
                              <dt className="text-gray-500">Solicitation #</dt>
                              <dd className="font-medium font-mono">{record.solicitation_number}</dd>
                          </div>
                      )}
                      {record.contract_number && (
                          <div>
                              <dt className="text-gray-500">Contract #</dt>
                              <dd className="font-medium font-mono">{record.contract_number}</dd>
                          </div>
                      )}
                      {record.naics_code && (
                          <div>
                              <dt className="text-gray-500">NAICS</dt>
                              <dd className="font-medium">{record.naics_code}</dd>
                          </div>
                      )}
                  </dl>
              </div>

              {/* Vendor Info (if award) */}
              {record.record_type === 'award' && record.vendor_uei && (
                  <div className="bg-white p-4 rounded shadow border border-gray-200 border-l-4 border-l-green-500">
                      <h3 className="font-semibold mb-3 border-b pb-2">Awarded To</h3>
                      <div className="text-sm">
                          <Link href={`/dashboard/vendors/${record.vendor_uei}`} className="font-bold text-blue-600 hover:underline block mb-1">
                              {record.vendor_name || 'Unknown Vendor'}
                          </Link>
                          <span className="text-gray-500 font-mono text-xs">UEI: {record.vendor_uei}</span>
                      </div>
                  </div>
              )}
          </div>

          {/* Main Content */}
          <div className="space-y-6 md:col-span-2">
              <div className="bg-white p-6 rounded shadow border border-gray-200">
                  <h2 className="text-lg font-bold mb-4">Description</h2>
                  <div className="prose max-w-none text-sm text-gray-700 whitespace-pre-wrap">
                      {record.description || 'No description provided.'}
                  </div>
                  {record.url && (
                      <div className="mt-6 pt-4 border-t">
                          <a href={record.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium inline-flex items-center">
                              View Original Source 
                              <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
                          </a>
                      </div>
                  )}
              </div>

              {/* Incumbent / Past Awards Logic */}
              {record.record_type === 'opportunity' && pastAwards.length > 0 && (
                  <div className="bg-white p-6 rounded shadow border border-gray-200">
                      <h2 className="text-lg font-bold mb-2 flex items-center gap-2">
                          <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                          Potential Recompetes / Past Work
                      </h2>
                      <p className="text-sm text-gray-500 mb-4">Past awards from this agency in the same NAICS code ({record.naics_code}).</p>
                      
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
