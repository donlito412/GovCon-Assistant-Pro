import { createServerSupabaseClient } from '@/lib/supabase';
import Link from 'next/link';

export default async function VendorProfilePage({ params }: { params: { uei: string } }) {
  const supabase = createServerSupabaseClient();
  const uei = params.uei;

  // Fetch all awards for this vendor
  const { data: awards } = await supabase
    .from('records')
    .select('*, agency:agencies(id, name)')
    .eq('vendor_uei', uei)
    .eq('record_type', 'award')
    .order('awarded_date', { ascending: false });

  if (!awards || awards.length === 0) {
      return <div className="p-8">Vendor not found or has no award history in our system.</div>;
  }

  // Assuming vendor name is consistent across their awards
  const vendorName = awards[0].vendor_name;
  const totalWon = awards.reduce((sum: number, a: any) => sum + (a.awarded_value || 0), 0);

  // Aggregate by agency
  const agencyTotals: Record<string, { id: number; name: string; total: number }> = {};
  awards.forEach((award: any) => {
      const agencyId = award.agency_id;
      const agencyName = (award as any).agency?.name || 'Unknown Agency';
      if (agencyId) {
          if (!agencyTotals[agencyId]) {
              agencyTotals[agencyId] = { id: agencyId, name: agencyName, total: 0 };
          }
          agencyTotals[agencyId].total += (award.awarded_value || 0);
      }
  });

  const topAgencies = Object.values(agencyTotals).sort((a, b) => b.total - a.total);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{vendorName}</h1>
        <p className="text-gray-500 font-mono">UEI: {uei}</p>
        <div className="mt-4 bg-white p-4 rounded shadow border border-gray-200">
           <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Total Won (Last 24 Mo)</h2>
           <p className="text-2xl font-semibold text-green-600">${(totalWon / 100).toLocaleString()}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
         {/* Top Agencies */}
         <div className="bg-white rounded shadow border border-gray-200 p-6 md:col-span-1">
            <h2 className="text-xl font-bold mb-4">Wins by Agency</h2>
            <ul className="divide-y divide-gray-200">
                {topAgencies.map(ag => (
                    <li key={ag.id} className="py-2 flex justify-between text-sm">
                        <Link href={`/dashboard/agencies/${ag.id}`} className="text-blue-600 hover:underline truncate pr-2">
                           {ag.name}
                        </Link>
                        <span className="text-gray-700 font-medium">${(ag.total / 100).toLocaleString()}</span>
                    </li>
                ))}
            </ul>
         </div>

         {/* Recent Awards List */}
         <div className="bg-white rounded shadow border border-gray-200 p-6 md:col-span-2">
            <h2 className="text-xl font-bold mb-4">Recent Awards</h2>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Contract</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Agency</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200 text-sm">
                        {awards.map((award: any) => (
                            <tr key={award.id}>
                                <td className="px-4 py-2 whitespace-nowrap text-gray-500">
                                    {award.awarded_date ? new Date(award.awarded_date).toLocaleDateString() : 'N/A'}
                                </td>
                                <td className="px-4 py-2 whitespace-nowrap font-medium text-blue-600">
                                    <Link href={`/dashboard/contracts/${award.id}`}>
                                        {award.contract_number || award.title || 'Unknown Contract'}
                                    </Link>
                                </td>
                                <td className="px-4 py-2 text-gray-700">
                                    {(award as any).agency?.name || 'Unknown Agency'}
                                </td>
                                <td className="px-4 py-2 whitespace-nowrap text-right font-medium text-green-600">
                                    ${((award.awarded_value || 0) / 100).toLocaleString()}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
         </div>
      </div>
    </div>
  );
}
