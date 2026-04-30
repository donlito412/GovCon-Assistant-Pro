'use client';

import React, { useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { User, Mail, KeyRound, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

// ============================================================
// PROFILE FORM — update display name + change password
// Email is read-only (managed by Supabase Auth).
// Password change sends confirmation via Supabase Auth email.
// ============================================================

interface ProfileFormProps {
  displayName: string;
  email: string;
  onSaved?: () => void;
}

export function ProfileForm({ displayName, email, onSaved }: ProfileFormProps) {
  const supabase = createClientComponentClient();

  const [name, setName] = useState(displayName);
  const [saving, setSaving] = useState(false);
  const [nameSuccess, setNameSuccess] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setNameError(null);
    setNameSuccess(false);
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ display_name: name.trim() }),
      });
      if (!res.ok) {
        const j = await res.json();
        throw new Error(j.error ?? 'Failed to save');
      }
      setNameSuccess(true);
      onSaved?.();
      setTimeout(() => setNameSuccess(false), 3000);
    } catch (err) {
      setNameError(err instanceof Error ? err.message : 'Error saving name');
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 8) { setPwError('Password must be at least 8 characters.'); return; }
    if (newPassword !== confirmPassword) { setPwError('Passwords do not match.'); return; }
    setPwLoading(true);
    setPwError(null);
    setPwSuccess(false);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setPwError(error.message);
    } else {
      setPwSuccess(true);
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPwSuccess(false), 4000);
    }
    setPwLoading(false);
  }

  return (
    <div className="space-y-6">
      {/* Display name */}
      <form onSubmit={handleSaveName} className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <User className="w-4 h-4 text-gray-400" />
          Display Name
        </h3>
        <div className="flex gap-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            maxLength={60}
            className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={saving}
          />
          <button
            type="submit"
            disabled={saving || name.trim() === displayName}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
        {nameSuccess && (
          <p className="text-xs text-green-600 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Name updated
          </p>
        )}
        {nameError && (
          <p className="text-xs text-red-500 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" /> {nameError}
          </p>
        )}
      </form>

      {/* Email (read-only) */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <Mail className="w-4 h-4 text-gray-400" />
          Email Address
        </h3>
        <input
          type="email"
          value={email}
          readOnly
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 text-gray-500 cursor-not-allowed"
        />
        <p className="text-xs text-gray-400">Email is managed by Supabase Auth and cannot be changed here.</p>
      </div>

      {/* Password change */}
      <form onSubmit={handleChangePassword} className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-gray-400" />
          Change Password
        </h3>
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="New password (min 8 characters)"
          className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={pwLoading}
          autoComplete="new-password"
        />
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Confirm new password"
          className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={pwLoading}
          autoComplete="new-password"
        />
        {pwError && (
          <p className="text-xs text-red-500 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" /> {pwError}
          </p>
        )}
        {pwSuccess && (
          <p className="text-xs text-green-600 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Password updated successfully
          </p>
        )}
        <button
          type="submit"
          disabled={pwLoading || !newPassword || !confirmPassword}
          className="flex items-center gap-2 bg-gray-800 hover:bg-gray-900 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
        >
          {pwLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {pwLoading ? 'Updating…' : 'Update Password'}
        </button>
      </form>
    </div>
  );
}
