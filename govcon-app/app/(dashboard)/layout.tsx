import React from 'react';
import Link from 'next/link';
import { Bell, Menu, Globe } from 'lucide-react';
import { Sidebar } from '@/components/layout/Sidebar';

// ============================================================
// DASHBOARD LAYOUT
// GovTribe-style dark sidebar + light content area.
// ============================================================

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Dark Sidebar */}
      <Sidebar />

      {/* Main content area */}
      <div className="flex-1 lg:ml-60 flex flex-col min-h-screen">
        {/* Top header */}
        <header className="sticky top-0 z-20 bg-white border-b border-gray-200 px-4 sm:px-6 py-3 flex items-center justify-between shadow-sm">
          {/* Mobile hamburger */}
          <button
            className="lg:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Mobile logo */}
          <Link href="/" className="lg:hidden flex items-center gap-2 text-sm font-bold text-blue-600">
            <Globe className="w-4 h-4" />
            GovCon Assistant
          </Link>

          {/* Desktop: page context placeholder */}
          <div className="hidden lg:block" />

          {/* Right side */}
          <div className="flex items-center gap-3">
            <Link
              href="/saved-searches"
              className="relative p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-blue-600 transition"
              title="Saved Searches & Alerts"
            >
              <Bell className="w-5 h-5" />
            </Link>
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold select-none">
              J
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </main>

        <footer className="px-6 py-3 border-t border-gray-100 text-center text-xs text-gray-400">
          GovCon Assistant Pro · Pittsburgh, PA · Internal Tool
        </footer>
      </div>
    </div>
  );
}
