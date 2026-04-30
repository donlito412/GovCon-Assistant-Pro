'use client';

import React, { useState } from 'react';
import { Bell, Mail, Clock, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

// ============================================================
// NOTIFICATION PREFERENCES
// Alert email address + frequency (immediate / daily digest)
// ============================================================

interface NotificationPreferencesProps {
  alertEmail: string;
  alertFrequency: 'immediate' | 'daily';
}

const FREQUENCY_OPTIONS = [
  {
    value: 'daily',
    label: 'Daily Digest',
    description: 'One email each morning at 8:00 AM ET with all new matches',
    icon: Clock,
  },
  {
    value: 'immediate',
    label: 'Immediate',
    description: 'Email as soon as new matches are found after ingestion runs',
    icon: Bell,
  },
] as const;

export function NotificationPreferences({ alertEmail, alertFrequency }: NotificationPreferencesProps) {
  const [email, setEmail] = useState(alertEmail);
  const [frequency, setFrequency] = useState<'immediate' | 'daily'>(alertFrequency);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDirty = email !== alertEmail || frequency !== alertFrequency;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alert_email: email, alert_frequency: frequency }),
      });
      if (!res.ok) {
        const j = await res.json();
        throw new Error(j.error ?? 'Failed to save');
      }
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error saving');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-5">
      {/* Alert email */}
      <div>
        <label htmlFor="alert-email" className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-1.5">
          <Mail className="w-4 h-4 text-gray-400" />
          Alert Email Address
        </label>
        <input
          id="alert-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={loading}
          placeholder="jon@example.com"
        />
        <p className="text-xs text-gray-400 mt-1">New contract match alerts will be sent to this address.</p>
      </div>

      {/* Frequency */}
      <div>
        <p className="text-sm font-semibold text-gray-700 mb-2">Alert Frequency</p>
        <div className="space-y-2">
          {FREQUENCY_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const selected = frequency === opt.value;
            return (
              <label
                key={opt.value}
                className={`flex items-start gap-3 border rounded-lg px-4 py-3 cursor-pointer transition
                  ${selected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
              >
                <input
                  type="radio"
                  name="frequency"
                  value={opt.value}
                  checked={selected}
                  onChange={() => setFrequency(opt.value)}
                  className="mt-0.5 accent-blue-600"
                  disabled={loading}
                />
                <div>
                  <div className="flex items-center gap-1.5">
                    <Icon className={`w-4 h-4 ${selected ? 'text-blue-600' : 'text-gray-400'}`} />
                    <span className={`text-sm font-semibold ${selected ? 'text-blue-700' : 'text-gray-700'}`}>
                      {opt.label}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{opt.description}</p>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {/* Feedback */}
      {error && (
        <p className="text-xs text-red-500 flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5" /> {error}
        </p>
      )}
      {success && (
        <p className="text-xs text-green-600 flex items-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5" /> Notification preferences saved
        </p>
      )}

      <button
        type="submit"
        disabled={loading || !isDirty}
        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition"
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        {loading ? 'Saving…' : 'Save Preferences'}
      </button>
    </form>
  );
}
