'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Bot, LayoutDashboard, FileSearch, DollarSign, Gift,
  CalendarDays, TrendingUp, KanbanSquare, Briefcase,
  Mail, Bell, Building2, Users, BarChart3, RefreshCw,
  ChevronDown, ChevronRight, Award, MapPin, Tag,
  Globe,
} from 'lucide-react';

// ============================================================
// GOVTRIBE-STYLE COLLAPSIBLE SIDEBAR
// ============================================================

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  badge?: string;
  badgeColor?: string;
}

interface NavSection {
  id: string;
  label: string;
  icon: React.ElementType;
  items: NavItem[];
  defaultOpen?: boolean;
}

const NAV_SECTIONS: NavSection[] = [
  {
    id: 'opportunities',
    label: 'Opportunities',
    icon: FileSearch,
    defaultOpen: true,
    items: [
      { href: '/contracts', label: 'Federal Contract Opps', icon: FileSearch },
      { href: '/grants', label: 'Federal Grant Opps', icon: Gift },
      { href: '/forecasts', label: 'Federal Forecasts', icon: TrendingUp },
    ],
  },
  {
    id: 'awards',
    label: 'Awards',
    icon: Award,
    defaultOpen: true,
    items: [
      { href: '/awards', label: 'Federal Contract Awards', icon: DollarSign },
    ],
  },
  {
    id: 'manage',
    label: 'Manage',
    icon: KanbanSquare,
    defaultOpen: false,
    items: [
      { href: '/pipeline', label: 'Pipeline', icon: KanbanSquare },
      { href: '/bids', label: 'Bid Tracker', icon: Briefcase },
      { href: '/outreach', label: 'Outreach', icon: Mail },
      { href: '/saved-searches', label: 'Saved Searches', icon: Bell },
      { href: '/recompetes', label: 'Recompetes', icon: RefreshCw },
    ],
  },
  {
    id: 'participants',
    label: 'Participants',
    icon: Users,
    defaultOpen: false,
    items: [
      { href: '/agencies', label: 'Federal Agencies', icon: Building2 },
      { href: '/agencies?type=local', label: 'Jurisdictions', icon: MapPin },
      { href: '/contacts', label: 'Vendors & Subcontractors', icon: Users },
    ],
  },
  {
    id: 'intelligence',
    label: 'Intelligence',
    icon: BarChart3,
    defaultOpen: false,
    items: [
      { href: '/analytics', label: 'Reports & Analytics', icon: BarChart3 },
      { href: '/events', label: 'Events & Meetings', icon: CalendarDays },
    ],
  },
];

function useOpenSections(sections: NavSection[]) {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => {
    const defaults: Record<string, boolean> = {};
    sections.forEach((s) => {
      defaults[s.id] = s.defaultOpen ?? false;
    });
    return defaults;
  });

  const toggle = (id: string) => {
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return { openSections, toggle };
}

function NavLink({ href, label, icon: Icon, isActive }: {
  href: string;
  label: string;
  icon: React.ElementType;
  isActive: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all group ${
        isActive
          ? 'bg-blue-600 text-white font-medium shadow-sm'
          : 'text-gray-400 hover:bg-[#1e2d4a] hover:text-white'
      }`}
    >
      <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-white' : 'text-gray-500 group-hover:text-blue-400'}`} />
      <span className="truncate">{label}</span>
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { openSections, toggle } = useOpenSections(NAV_SECTIONS);

  // Auto-open section that contains the active route
  useEffect(() => {
    // Already handled by defaultOpen, but could also auto-expand on navigation
  }, [pathname]);

  const isActive = (href: string) => {
    const cleanHref = href.split('?')[0];
    return pathname === cleanHref;
  };

  return (
    <aside className="hidden lg:flex flex-col w-60 bg-[#0f1e35] border-r border-[#1a2d47] fixed inset-y-0 left-0 z-30 overflow-y-auto">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-[#1a2d47]">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0 shadow-lg">
            <Globe className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-white leading-tight">GovCon Assistant</p>
            <p className="text-[10px] text-gray-500">Pittsburgh Intelligence</p>
          </div>
        </Link>
      </div>

      {/* AI Assistant — top feature like GovTribe AI */}
      <div className="px-3 pt-3 pb-1">
        <Link
          href="/assistant"
          className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
            pathname === '/assistant'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-[#1a2d47] text-blue-300 hover:bg-blue-600 hover:text-white border border-[#2a4060]'
          }`}
        >
          <Bot className="w-4 h-4" />
          <span>GovCon AI</span>
          <span className="ml-auto text-[10px] bg-blue-500/30 text-blue-300 px-1.5 py-0.5 rounded-full font-medium">AI</span>
        </Link>
      </div>

      {/* Dashboard */}
      <div className="px-3 pb-1">
        <Link
          href="/"
          className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all group ${
            pathname === '/'
              ? 'bg-blue-600 text-white font-medium'
              : 'text-gray-400 hover:bg-[#1e2d4a] hover:text-white'
          }`}
        >
          <LayoutDashboard className={`w-4 h-4 flex-shrink-0 ${pathname === '/' ? 'text-white' : 'text-gray-500 group-hover:text-blue-400'}`} />
          <span>Dashboard</span>
        </Link>
      </div>

      {/* Divider */}
      <div className="mx-3 mb-2 border-t border-[#1a2d47]" />

      {/* Collapsible Sections */}
      <nav className="flex-1 px-3 pb-4 space-y-1">
        {NAV_SECTIONS.map((section) => {
          const isOpen = openSections[section.id];
          const SectionIcon = section.icon;
          // Check if any child is active
          const hasActiveChild = section.items.some((item) => isActive(item.href));

          return (
            <div key={section.id}>
              <button
                onClick={() => toggle(section.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  hasActiveChild
                    ? 'text-blue-300 bg-[#1a2d47]'
                    : 'text-gray-400 hover:bg-[#1e2d4a] hover:text-white'
                }`}
              >
                <SectionIcon className={`w-4 h-4 flex-shrink-0 ${hasActiveChild ? 'text-blue-400' : 'text-gray-500'}`} />
                <span className="flex-1 text-left">{section.label}</span>
                {isOpen
                  ? <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
                  : <ChevronRight className="w-3.5 h-3.5 text-gray-500" />
                }
              </button>

              {isOpen && (
                <div className="mt-0.5 ml-3 pl-3 border-l border-[#1e3050] space-y-0.5">
                  {section.items.map((item) => (
                    <NavLink
                      key={item.href}
                      href={item.href}
                      label={item.label}
                      icon={item.icon}
                      isActive={isActive(item.href)}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-[#1a2d47]">
        <p className="text-[10px] text-gray-600 text-center">© {new Date().getFullYear()} Murphree Enterprises</p>
      </div>
    </aside>
  );
}
