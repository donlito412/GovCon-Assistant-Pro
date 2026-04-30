'use client';

import React, { useState } from 'react';
import { Loader2, UserCircle2, Plus, X } from 'lucide-react';
import { createCommunityProfile, updateCommunityProfile, type CommunityProfile } from '../../lib/api/community';

// ============================================================
// PROFILE SETUP FORM — create or edit community profile
// ============================================================

interface Props {
  existing?: CommunityProfile;
  onSaved?: (profile: CommunityProfile) => void;
}

const LOOKING_FOR_OPTIONS = [
  { value: 'subcontractor_work', label: 'Subcontractor Work' },
  { value: 'prime_teaming',      label: 'Prime Teaming Partners' },
  { value: 'suppliers',          label: 'Suppliers' },
  { value: 'mentorship',         label: 'Mentorship' },
  { value: 'partnerships',       label: 'Strategic Partnerships' },
];

const CERT_OPTIONS = [
  { key: 'mwbe',          label: 'MBE/WBE' },
  { key: 'veteran_owned', label: 'Veteran Owned' },
  { key: 'minority_owned', label: 'Minority Owned' },
  { key: 'woman_owned',   label: 'Woman Owned' },
  { key: 'disabled_owned', label: 'Disability Owned' },
];

const BIZ_TYPES = ['LLC', 'sole_prop', 'corp', 'partnership', 'nonprofit', 'other'] as const;
const EMP_RANGES = ['1', '2-5', '6-10', '11-50', '50+'] as const;

export function ProfileSetupForm({ existing, onSaved }: Props) {
  const e = existing;

  const [businessName, setBusinessName] = useState(e?.business_name ?? '');
  const [ownerName,    setOwnerName]    = useState(e?.owner_name ?? '');
  const [email,        setEmail]        = useState(e?.email ?? '');
  const [phone,        setPhone]        = useState(e?.phone ?? '');
  const [website,      setWebsite]      = useState(e?.website ?? '');
  const [neighborhood, setNeighborhood] = useState(e?.neighborhood ?? '');
  const [zip,          setZip]          = useState(e?.zip ?? '');
  const [bizType,      setBizType]      = useState<string>(e?.business_type ?? 'LLC');
  const [industry,     setIndustry]     = useState(e?.industry ?? '');
  const [years,        setYears]        = useState<string>(String(e?.years_in_business ?? ''));
  const [empRange,     setEmpRange]     = useState<string>(e?.employee_count_range ?? '');
  const [bio,          setBio]          = useState(e?.bio ?? '');
  const [services,     setServices]     = useState<string[]>(e?.services_offered ?? []);
  const [serviceInput, setServiceInput] = useState('');
  const [lookingFor,   setLookingFor]   = useState<string[]>(e?.looking_for ?? []);
  const [certs,        setCerts]        = useState<Record<string, boolean>>(e?.certifications ?? {});
  const [samReg,       setSamReg]       = useState(e?.sam_registered ?? false);
  const [samUei,       setSamUei]       = useState(e?.sam_uei ?? '');
  const [saving,       setSaving]       = useState(false);
  const [error,        setError]        = useState<string | null>(null);

  const addService = () => {
    const s = serviceInput.trim();
    if (s && !services.includes(s)) setServices((prev) => [...prev, s]);
    setServiceInput('');
  };

  const toggleLooking = (v: string) => setLookingFor((prev) =>
    prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]
  );

  const toggleCert = (k: string) => setCerts((prev) => ({ ...prev, [k]: !prev[k] }));

  const handleSave = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!businessName.trim()) { setError('Business name is required'); return; }
    setSaving(true);
    setError(null);
    try {
      const payload: Partial<CommunityProfile> = {
        business_name:       businessName.trim(),
        owner_name:          ownerName.trim() || null,
        email:               email.trim() || null,
        phone:               phone.trim() || null,
        website:             website.trim() || null,
        neighborhood:        neighborhood.trim() || null,
        city:                'Pittsburgh',
        zip:                 zip.trim() || null,
        business_type:       bizType as CommunityProfile['business_type'],
        industry:            industry.trim() || null,
        years_in_business:   years ? parseInt(years) : null,
        employee_count_range: empRange as CommunityProfile['employee_count_range'] || null,
        bio:                 bio.trim() || null,
        services_offered:    services,
        looking_for:         lookingFor,
        certifications:      certs,
        sam_registered:      samReg,
        sam_uei:             samReg && samUei ? samUei.trim() : null,
      };

      const saved = existing
        ? await updateCommunityProfile(existing.id, payload)
        : await createCommunityProfile(payload);
      onSaved?.(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
        <UserCircle2 className="w-5 h-5 text-blue-600" />
        <h2 className="text-base font-bold text-gray-900">
          {existing ? 'Edit Community Profile' : 'Create Community Profile'}
        </h2>
      </div>

      {/* Basic info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="text-xs font-semibold text-gray-500 mb-1 block">Business Name *</label>
          <input type="text" value={businessName} onChange={(e) => setBusinessName(e.target.value)} required
            className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500" />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1 block">Owner / Contact Name</label>
          <input type="text" value={ownerName} onChange={(e) => setOwnerName(e.target.value)}
            className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none" />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1 block">Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none" />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1 block">Phone</label>
          <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
            className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none" />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1 block">Website</label>
          <input type="url" value={website} onChange={(e) => setWebsite(e.target.value)}
            placeholder="https://"
            className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none" />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1 block">Neighborhood / Area</label>
          <input type="text" value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)}
            placeholder="e.g. Shadyside, East End, North Shore"
            className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none" />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1 block">ZIP Code</label>
          <input type="text" value={zip} onChange={(e) => setZip(e.target.value)}
            className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none" />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1 block">Business Type</label>
          <select value={bizType} onChange={(e) => setBizType(e.target.value)}
            className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none">
            {BIZ_TYPES.map((t) => <option key={t} value={t}>{t === 'sole_prop' ? 'Sole Proprietor' : t}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1 block">Industry</label>
          <input type="text" value={industry} onChange={(e) => setIndustry(e.target.value)}
            placeholder="e.g. IT Consulting, Construction, Catering"
            className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none" />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1 block">Years in Business</label>
          <input type="number" value={years} onChange={(e) => setYears(e.target.value)} min={0}
            className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none" />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1 block">Employees</label>
          <select value={empRange} onChange={(e) => setEmpRange(e.target.value)}
            className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none">
            <option value="">Select…</option>
            {EMP_RANGES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
      </div>

      {/* Bio */}
      <div>
        <label className="text-xs font-semibold text-gray-500 mb-1 block">Bio / About</label>
        <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={4}
          placeholder="What does your business do? What are you looking for?"
          className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 resize-y focus:outline-none focus:ring-1 focus:ring-blue-500" />
      </div>

      {/* Services */}
      <div>
        <label className="text-xs font-semibold text-gray-500 mb-1 block">Services Offered</label>
        <div className="flex gap-2">
          <input type="text" value={serviceInput} onChange={(e) => setServiceInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addService())}
            placeholder="e.g. Network Security, Grant Writing"
            className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none" />
          <button type="button" onClick={addService}
            className="text-xs font-semibold text-blue-600 border border-blue-200 px-3 py-2 rounded-lg hover:bg-blue-50">
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {services.map((s) => (
            <span key={s} className="flex items-center gap-1 text-xs bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full">
              {s}
              <button type="button" onClick={() => setServices((p) => p.filter((x) => x !== s))}
                className="text-gray-400 hover:text-red-500"><X className="w-3 h-3" /></button>
            </span>
          ))}
        </div>
      </div>

      {/* Looking for */}
      <div>
        <label className="text-xs font-semibold text-gray-500 mb-2 block">What are you looking for?</label>
        <div className="flex flex-wrap gap-2">
          {LOOKING_FOR_OPTIONS.map((o) => (
            <label key={o.value} className="flex items-center gap-1.5 text-sm cursor-pointer text-gray-700">
              <input type="checkbox" checked={lookingFor.includes(o.value)} onChange={() => toggleLooking(o.value)}
                className="accent-blue-600" />
              {o.label}
            </label>
          ))}
        </div>
      </div>

      {/* Certifications */}
      <div>
        <label className="text-xs font-semibold text-gray-500 mb-2 block">Certifications</label>
        <div className="flex flex-wrap gap-3">
          {CERT_OPTIONS.map((c) => (
            <label key={c.key} className="flex items-center gap-1.5 text-sm cursor-pointer text-gray-700">
              <input type="checkbox" checked={!!certs[c.key]} onChange={() => toggleCert(c.key)} className="accent-blue-600" />
              {c.label}
            </label>
          ))}
        </div>
      </div>

      {/* SAM registration */}
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm cursor-pointer text-gray-700">
          <input type="checkbox" checked={samReg} onChange={(e) => setSamReg(e.target.checked)} className="accent-blue-600" />
          I am registered on SAM.gov
        </label>
        {samReg && (
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">SAM UEI (optional)</label>
            <input type="text" value={samUei} onChange={(e) => setSamUei(e.target.value)} placeholder="12-character UEI"
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none" />
          </div>
        )}
      </div>

      {error && <div className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</div>}

      <button type="submit" disabled={saving}
        className="flex items-center gap-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg disabled:opacity-50 transition">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        {saving ? 'Saving…' : existing ? 'Save Changes' : 'Create Profile'}
      </button>
    </form>
  );
}
