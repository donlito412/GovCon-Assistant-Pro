'use client';

import React, { useState } from 'react';
import { Bell, BellOff, Loader2 } from 'lucide-react';
import { toggleAlert } from '@/lib/api/saved-searches';

// ============================================================
// ALERT PREFERENCES TOGGLE
// Per-search inline toggle for enabling/disabling email alerts.
// ============================================================

interface AlertPreferencesProps {
  searchId: number;
  alertEnabled: boolean;
  onChanged?: (newValue: boolean) => void;
}

export function AlertPreferences({ searchId, alertEnabled, onChanged }: AlertPreferencesProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleToggle() {
    setLoading(true);
    setError(null);
    const next = !alertEnabled;
    try {
      await toggleAlert(searchId, next);
      onChanged?.(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleToggle}
        disabled={loading}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border transition
          ${alertEnabled
            ? 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100'
            : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
          } disabled:opacity-50`}
        title={alertEnabled ? 'Disable email alerts' : 'Enable email alerts'}
        aria-label={alertEnabled ? 'Disable alerts' : 'Enable alerts'}
      >
        {loading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : alertEnabled ? (
          <Bell className="w-3.5 h-3.5" />
        ) : (
          <BellOff className="w-3.5 h-3.5" />
        )}
        {alertEnabled ? 'Alerts On' : 'Alerts Off'}
      </button>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
