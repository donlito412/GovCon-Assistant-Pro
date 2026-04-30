'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Calendar, Tag, Mail, Phone, ExternalLink, Eye, User, PlusCircle,
  ChevronDown, ChevronUp, Clock, LinkIcon,
} from 'lucide-react';
import {
  daysUntilSolicitation, formatForecastValue, solicitationLabel, statusColor,
  type ForecastOpportunity,
} from '../../lib/api/forecasts';

// ============================================================
// FORECAST CARD — pre-solicitation forecast opportunity
// ============================================================

interface Props {
  forecast: ForecastOpportunity;
  onWatch?: (f: ForecastOpportunity) => void;
  onAddToPipeline?: (f: ForecastOpportunity) => void;
}

export function ForecastCard({ forecast, onWatch, onAddToPipeline }: Props) {
  const [expanded, setExpanded] = useState(false);
  const days     = daysUntilSolicitation(forecast.estimated_solicitation_date);
  const solLabel = solicitationLabel(forecast.estimated_solicitation_date);
  const value    = formatForecastValue(forecast.estimated_value);
  const sColor   = statusColor(forecast.status);

  const awardDateStr = forecast.estimated_award_date
    ? new Date(forecast.estimated_award_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : null;

  const outreachUrl = forecast.poc_email || forecast.poc_name
    ? `/outreach?prefill_company=${encodeURIComponent(forecast.agency_name ?? '')}&prefill_name=${encodeURIComponent(forecast.poc_name ?? '')}&prefill_email=${encodeURIComponent(forecast.poc_email ?? '')}&context=${encodeURIComponent(forecast.title)}`
    : null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition">
      <div className="h-1 bg-gradient-to-r from-indigo-500 to-purple-500" />

      <div className="px-4 pt-3 pb-2">
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <div className="flex flex-wrap gap-1">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${sColor}`}>
              {forecast.status.charAt(0).toUpperCase() + forecast.status.slice(1)}
            </span>
            {forecast.set_aside_type && (
              <span className="text-[10px] font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                {forecast.set_aside_type}
              </span>
            )}
          </div>
          {forecast.naics_code && (
            <span className="text-[10px] font-mono bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
              {forecast.naics_code}
            </span>
          )}
        </div>
        <h3 className="text-sm font-bold text-gray-900 leading-snug">{forecast.title}</h3>
        {forecast.agency_name && (
          <p className="text-xs text-gray-500 mt-0.5">{forecast.agency_name}</p>
        )}
      </div>

      <div className="px-4 pb-2 space-y-1">
        <div className={`flex items-center gap-1.5 text-xs font-medium ${
          days !== null && days <= 60 ? 'text-amber-600' : 'text-indigo-600'
        }`}>
          <Clock className="w-3.5 h-3.5" />{solLabel}
        </div>
        {awardDateStr && (
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Calendar className="w-3 h-3 text-gray-400" />Award estimated {awardDateStr}
          </div>
        )}
        <div className="flex items-center gap-1.5 text-xs text-gray-700 font-medium">
          <Tag className="w-3 h-3 text-gray-400" />{value}
        </div>
        {(forecast.place_of_performance_city || forecast.place_of_performance_state) && (
          <div className="text-xs text-gray-400">
            {[forecast.place_of_performance_city, forecast.place_of_performance_state].filter(Boolean).join(', ')}
          </div>
        )}
      </div>

      {/* POC (always visible) */}
      {(forecast.poc_name || forecast.poc_email) && (
        <div className="px-4 pb-2">
          <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
            <User className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              {forecast.poc_name && <p className="text-xs font-semibold text-gray-800">{forecast.poc_name}</p>}
              {forecast.poc_email && (
                <a href={`mailto:${forecast.poc_email}`} className="text-xs text-blue-600 hover:underline truncate block">
                  {forecast.poc_email}
                </a>
              )}
              {forecast.poc_phone && (
                <a href={`tel:${forecast.poc_phone}`} className="text-xs text-gray-500 hover:text-blue-600">
                  {forecast.poc_phone}
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Description (expanded) */}
      {expanded && forecast.description && (
        <div className="border-t border-gray-100 px-4 py-3 bg-gray-50">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Description</p>
          <p className="text-xs text-gray-600 leading-relaxed line-clamp-6">{forecast.description}</p>
          {forecast.linked_opportunity_id && (
            <Link href={`/contracts/${forecast.linked_opportunity_id}`}
              className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 mt-2">
              <LinkIcon className="w-3 h-3" />Live solicitation posted →
            </Link>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="border-t border-gray-100 px-4 py-2.5 flex items-center gap-2 flex-wrap">
        <button onClick={() => onWatch?.(forecast)}
          className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-indigo-700 border border-gray-200 hover:border-indigo-300 px-2.5 py-1.5 rounded-lg transition">
          <Eye className="w-3.5 h-3.5" />Watch
        </button>
        {outreachUrl && (
          <Link href={outreachUrl}
            className="flex items-center gap-1.5 text-xs font-semibold text-purple-600 hover:text-purple-800 border border-purple-200 hover:border-purple-400 px-2.5 py-1.5 rounded-lg transition">
            <Mail className="w-3.5 h-3.5" />Contact POC
          </Link>
        )}
        <button onClick={() => onAddToPipeline?.(forecast)}
          className="flex items-center gap-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 px-2.5 py-1.5 rounded-lg transition">
          <PlusCircle className="w-3.5 h-3.5" />Add to Pipeline
        </button>
        <button onClick={() => setExpanded((s) => !s)}
          className="ml-auto flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700">
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          {expanded ? 'Less' : 'Details'}
        </button>
      </div>
    </div>
  );
}
