'use client';

import React, { useState, useCallback, useTransition } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Search, X } from 'lucide-react';
import { updateSearchParam } from '../../lib/api/contracts';

// ============================================================
// SEARCH BAR
// Full-text search input — updates URL ?q= param on submit.
// Debounced live search via useTransition.
// ============================================================

interface SearchBarProps {
  placeholder?: string;
  className?: string;
}

export function SearchBar({
  placeholder = 'Search contracts by title, agency, or keyword…',
  className = '',
}: SearchBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [value, setValue] = useState(searchParams.get('q') ?? '');

  const applySearch = useCallback(
    (q: string) => {
      const qs = updateSearchParam(new URLSearchParams(searchParams.toString()), { q: q || null });
      startTransition(() => {
        router.push(`${pathname}?${qs}`);
      });
    },
    [router, pathname, searchParams],
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    applySearch(value.trim());
  };

  const handleClear = () => {
    setValue('');
    applySearch('');
  };

  return (
    <form onSubmit={handleSubmit} className={`relative flex items-center ${className}`}>
      <div className="relative w-full">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-gray-300 bg-white text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
          aria-label="Search contracts"
        />
        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
            aria-label="Clear search"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      <button
        type="submit"
        className="ml-2 px-4 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition flex-shrink-0 disabled:opacity-60"
        disabled={isPending}
      >
        {isPending ? 'Searching…' : 'Search'}
      </button>
    </form>
  );
}
