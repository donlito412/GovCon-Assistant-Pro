'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserSupabaseClient } from '@/lib/supabase';

export default function AddOpportunityPage() {
    const router = useRouter();
    const supabase = createBrowserSupabaseClient();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setIsSubmitting(true);
        setError(null);

        const formData = new FormData(event.currentTarget);
        const opportunityData = {
            title: formData.get('title') as string,
            agency_name: formData.get('agency_name') as string,
            url: formData.get('url') as string,
            deadline: formData.get('deadline') ? new Date(formData.get('deadline') as string).toISOString() : null,
            description: formData.get('description') as string,
            record_type: 'opportunity', // Hardcoded as this form is for manual opportunities
            source: 'manual', // Hardcoded source
        };

        const { error } = await supabase.from('records').insert([opportunityData]);

        if (error) {
            setError(error.message);
            setIsSubmitting(false);
        } else {
            router.push('/dashboard/opportunities');
            router.refresh();
        }
    }

    return (
        <div className="max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold mb-6">Add Manual Opportunity</h1>
            <form onSubmit={handleSubmit} className="space-y-6 bg-white p-8 rounded-lg shadow">
                <div>
                    <label htmlFor="title" className="block text-sm font-medium text-gray-700">Title</label>
                    <input type="text" name="title" id="title" required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
                </div>
                <div>
                    <label htmlFor="agency_name" className="block text-sm font-medium text-gray-700">Agency Name</label>
                    <input type="text" name="agency_name" id="agency_name" required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
                </div>
                <div>
                    <label htmlFor="url" className="block text-sm font-medium text-gray-700">URL</label>
                    <input type="url" name="url" id="url" required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
                </div>
                <div>
                    <label htmlFor="deadline" className="block text-sm font-medium text-gray-700">Deadline</label>
                    <input type="datetime-local" name="deadline" id="deadline" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
                </div>
                <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
                    <textarea name="description" id="description" rows={4} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"></textarea>
                </div>
                
                {error && <p className="text-sm text-red-600">{error}</p>}

                <div className="flex justify-end">
                    <button type="submit" disabled={isSubmitting} className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50">
                        {isSubmitting ? 'Submitting...' : 'Add Opportunity'}
                    </button>
                </div>
            </form>
        </div>
    );
}
