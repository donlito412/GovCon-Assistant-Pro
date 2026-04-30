'use client';

import React, { useState } from 'react';
import { Key, Eye, EyeOff, Loader2, CheckCircle2, AlertCircle, ShieldCheck } from 'lucide-react';

// ============================================================
// API KEYS PANEL
// SAM.gov API key input — stored encrypted via Supabase Vault.
// Key is NEVER returned in API responses (server-side only).
// Shows masked hint of the last 4 chars if already set.
// ============================================================

interface ApiKeysPanelProps {
  hasSamApiKey: boolean;
  samApiKeyHint?: string; // e.g. "****cdef"
}

export function ApiKeysPanel({ hasSamApiKey, samApiKeyHint }: ApiKeysPanelProps) {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!apiKey.trim()) return;
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sam_api_key: apiKey.trim() }),
      });
      if (!res.ok) {
        const j = await res.json();
        throw new Error(j.error ?? 'Failed to save');
      }
      setSuccess(true);
      setApiKey('');
      setTimeout(() => setSuccess(false), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error saving key');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Security note */}
      <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
        <ShieldCheck className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-green-800">
          <p className="font-semibold mb-0.5">Encrypted storage</p>
          <p className="text-xs text-green-700">
            Your SAM.gov API key is encrypted using Supabase Vault (pgsodium) before storage.
            It is never returned in API responses or exposed to client-side code.
          </p>
        </div>
      </div>

      {/* SAM.gov API key */}
      <form onSubmit={handleSave} className="space-y-3">
        <div>
          <label htmlFor="sam-api-key" className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-1.5">
            <Key className="w-4 h-4 text-gray-400" />
            SAM.gov API Key
            {hasSamApiKey && (
              <span className="ml-1 text-xs font-normal text-green-600 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Configured
              </span>
            )}
          </label>

          {/* Current key hint */}
          {hasSamApiKey && samApiKeyHint && (
            <div className="mb-2 text-xs text-gray-500 font-mono bg-gray-50 border border-gray-200 rounded px-3 py-1.5">
              Current key: <span className="tracking-widest">{samApiKeyHint}</span>
            </div>
          )}

          <div className="relative">
            <input
              id="sam-api-key"
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={hasSamApiKey ? 'Enter new key to replace existing…' : 'Paste your SAM.gov API key…'}
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2.5 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              disabled={loading}
              autoComplete="off"
            />
            <button
              type="button"
              onClick={() => setShowKey((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
              tabIndex={-1}
              aria-label={showKey ? 'Hide key' : 'Show key'}
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Get your free API key at{' '}
            <a href="https://sam.gov/content/entity-information/api" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
              sam.gov
            </a>
            . Required for federal contract ingestion (TASK_002).
          </p>
        </div>

        {error && (
          <p className="text-xs text-red-500 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" /> {error}
          </p>
        )}
        {success && (
          <p className="text-xs text-green-600 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> API key encrypted and saved
          </p>
        )}

        <button
          type="submit"
          disabled={loading || !apiKey.trim()}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {loading ? 'Saving…' : hasSamApiKey ? 'Update Key' : 'Save Key'}
        </button>
      </form>
    </div>
  );
}
