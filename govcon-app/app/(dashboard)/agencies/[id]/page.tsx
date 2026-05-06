import { createServerSupabaseClient } from '@/lib/supabase';
import Link from 'next/link';

export default async function AgencyProfilePage({ params }: { params: { id: string } }) {
  const supabase = createServerSupabaseClient();
  const agencyId = parseInt(params.id, 10);

  // 1. Fetch Agency Info
  const { data: agency } = await supabase
    .from('agencies')
    .select('*')
    .eq('id', agencyId)
    .single();

  if (!agency) return <div>Agency not found</div>;

  // 2. Fetch Active Opportunities
  const { data: activeOpps } = await supabase
    .from('opportunities')
    .select('id, title, solicitation_number, deadline, value_max')
    .eq('agency_name', agency.name)
    .eq('status', 'active')
    .order('deadline', { ascending: true })
    .limit(10);

  // 3. Fetch Past Awards
  const { data: awards } = await supabase
    .from('contract_awards')
    .select('vendor_name, vendor_uei, total_value')
    .eq('agency_name', agency.name);

  const totalSpend = awards?.reduce((sum: number, award: any) => sum + (award.total_value || 0), 0) || 0;

  // Calculate top vendors
  const vendorTotals: Record<string, { name: string; uei: string; total: number }> = {};
  awards?.forEach((award: any) => {
    if (award.vendor_uei && award.vendor_name) {
      if (!vendorTotals[award.vendor_uei]) {
         vendorTotals[award.vendor_uei] = { name: award.vendor_name, uei: award.vendor_uei, total: 0 };
      }
      vendorTotals[award.vendor_uei].total += (award.total_value || 0);
    }
  });

  const topVendors = Object.values(vendorTotals)
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{agency.name}</h1>
        <p className="text-gray-500 capitalize">{agency.level} Agency</p>
        <div className="mt-4 bg-white p-4 rounded shadow border border-gray-200">
           <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Total Awarded (Last 24 Mo)</h2>
           <p className="text-2xl font-semibold text-green-600">${(totalSpend / 100).toLocaleString()}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
         {/* Active Opportunities */}
         <div className="bg-white rounded shadow border border-gray-200 p-6">
            <h2 className="text-xl font-bold mb-4">Active Opportunities</h2>
            {activeOpps && activeOpps.length > 0 ? (
               <ul className="divide-y divide-gray-200">
                  {activeOpps.map((opp: any) => (
                     <li key={opp.id} className="py-3">
                        <Link href={`/dashboard/contracts/${opp.id}`} className="text-blue-600 hover:underline font-medium">
                           {opp.title}
                        </Link>
                        <p className="text-sm text-gray-500 mt-1">Deadline: {opp.deadline ? new Date(opp.deadline).toLocaleDateString() : 'N/A'}</p>
                     </li>
                  ))}
               </ul>
            ) : (
               <p className="text-gray-500 italic">No active opportunities found.</p>
            )}
         </div>

         {/* Top Vendors */}
         <div className="bg-white rounded shadow border border-gray-200 p-6">
            <h2 className="text-xl font-bold mb-4">Top Vendors</h2>
            {topVendors.length > 0 ? (
               <ul className="divide-y divide-gray-200">
                  {topVendors.map((vendor: any) => (
                     <li key={vendor.uei} className="py-3 flex justify-between">
                        <Link href={`/dashboard/vendors/${vendor.uei}`} className="text-blue-600 hover:underline font-medium truncate pr-4">
                           {vendor.name}
                        </Link>
                        <span className="text-sm font-semibold text-gray-700">${(vendor.total / 100).toLocaleString()}</span>
                     </li>
                  ))}
               </ul>
            ) : (
               <p className="text-gray-500 italic">No vendor award history found.</p>
            )}
         </div>
      </div>
    </div>
  );
}

