'use client';

import React, { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import {
  Settings, User, Bell, Key, Database,
  LogOut, Loader2, AlertCircle,
} from 'lucide-react';
import { ProfileForm } from '@/components/settings/ProfileForm';
import { NotificationPreferences } from '@/components/settings/NotificationPreferences';
import { ApiKeysPanel } from '@/components/settings/ApiKeysPanel';
import { DataRefreshStatus } from '@/components/settings/DataRefreshStatus';

// ============================================================
// SETTINGS PAGE — /settings
// Tabbed: Profile | Notifications | API Keys | Data Refresh
// ============================================================

type Tab = 'profile' | 'notifications' | 'api-keys' | 'data';

const TABS: Array<{ key: Tab; label: string; icon: React.ElementType }> = [
  { key: 'profile',        label: 'Profile',         icon: User },
  { key: 'notifications',  label: 'Notifications',   icon: Bell },
  { key: 'api-keys',       label: 'API Keys',        icon: Key },
  { key: 'data',           label: 'Data Refresh',    icon: Database },
];

interface UserSettings {
  display_name: string;
  alert_email: string;
  alert_frequency: 'immediate' | 'daily';
  has_sam_api_key: boolean;
  sam_api_key_hint?: string;
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="text-sm font-bold text-gray-900">{title}</h2>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [userEmail, setUserEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClientComponentClient();
  const router = useRouter();

  useEffect(() => {
    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUserEmail(user?.email ?? '');

        const res = await fetch('/api/settings');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setSettings(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load settings');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [supabase]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Page header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Settings className="w-6 h-6 text-blue-600" />
            Settings
          </h1>
          {userEmail && (
            <p className="text-sm text-gray-500 mt-0.5">Signed in as <strong>{userEmail}</strong></p>
          )}
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-red-600 hover:bg-red-50 px-3 py-2 rounded-lg border border-gray-200 transition"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1 border-b border-gray-200 overflow-x-auto">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition whitespace-nowrap -mb-px ${
              activeTab === key
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center gap-2 justify-center py-12 text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Loading settings…</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Tab content */}
      {!loading && !error && settings && (
        <>
          {activeTab === 'profile' && (
            <SectionCard title="Profile">
              <ProfileForm
                displayName={settings.display_name}
                email={userEmail}
                onSaved={() => {}}
              />
            </SectionCard>
          )}

          {activeTab === 'notifications' && (
            <SectionCard title="Notification Preferences">
              <NotificationPreferences
                alertEmail={settings.alert_email}
                alertFrequency={settings.alert_frequency}
              />
            </SectionCard>
          )}

          {activeTab === 'api-keys' && (
            <SectionCard title="API Keys">
              <ApiKeysPanel
                hasSamApiKey={settings.has_sam_api_key}
                samApiKeyHint={settings.sam_api_key_hint}
              />
            </SectionCard>
          )}

          {activeTab === 'data' && (
            <SectionCard title="Data Refresh Status">
              <DataRefreshStatus />
            </SectionCard>
          )}
        </>
      )}
    </div>
  );
}
