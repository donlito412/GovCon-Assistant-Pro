import React from 'react';
import Link from 'next/link';
import {
  LayoutDashboard, FileSearch, KanbanSquare, Bell,
  BarChart3, Building2, Users, Menu, Bot,
} from 'lucide-react';

// ============================================================
// DASHBOARD LAYOUT
// Sidebar nav shell wrapping all dashboard routes.
// Sidebar collapses on mobile (hamburger toggling handled client-side).
// ============================================================

const NAV_ITEMS = [
  { href: '/',              label: 'Dashboard',     icon: LayoutDashboard },
  { href: '/contracts',     label: 'Contracts',     icon: FileSearch },
  { href: '/pipeline',      label: 'Pipeline',      icon: KanbanSquare },
  { href: '/assistant',     label: 'AI Assistant',  icon: Bot },
  { href: '/saved-searches',label: 'Saved Searches',icon: Bell },
  { href: '/analytics',     label: 'Analytics',     icon: BarChart3 },
  { href: '/agencies',      label: 'Agencies',      icon: Building2 },
  { href: '/subcontractors',label: 'Subcontractors',icon: Users },
];

function SidebarLink({ href, label, icon: Icon }: { href: string; label: string; icon: React.ElementType }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-blue-50 hover:text-blue-700 transition group"
    >
      <Icon className="w-5 h-5 flex-shrink-0 text-gray-400 group-hover:text-blue-600 transition" />
      {label}
    </Link>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">
          {/* Sidebar */}
          <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-gray-200 fixed inset-y-0 left-0 z-30">
            {/* Logo */}
            <div className="px-5 py-5 border-b border-gray-100">
              <Link href="/" className="flex items-center gap-2.5 group">
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
                  <FileSearch className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900 leading-tight">GovCon Assistant</p>
                  <p className="text-xs text-gray-400">Pittsburgh Intelligence</p>
                </div>
              </Link>
            </div>

            {/* Nav */}
            <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
              {NAV_ITEMS.map((item) => (
                <SidebarLink key={item.href} {...item} />
              ))}
            </nav>

            {/* Footer */}
            <div className="px-4 py-3 border-t border-gray-100">
              <p className="text-xs text-gray-400 text-center">
                © {new Date().getFullYear()} Murphree Enterprises
              </p>
            </div>
          </aside>

          {/* Main content area */}
          <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
            {/* Top header (mobile + desktop) */}
            <header className="sticky top-0 z-20 bg-white border-b border-gray-200 px-4 sm:px-6 py-3 flex items-center justify-between">
              {/* Mobile hamburger (sidebar toggle handled via JS in a client wrapper if needed) */}
              <button className="lg:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition" aria-label="Open menu">
                <Menu className="w-5 h-5" />
              </button>

              {/* Mobile logo */}
              <Link href="/" className="lg:hidden text-sm font-bold text-blue-600">
                GovCon Assistant Pro
              </Link>

              {/* Desktop: breadcrumb placeholder */}
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
              GovCon Assistant Pro · Internal Tool · Pittsburgh, PA
            </footer>
          </div>
        </div>
  );
}
