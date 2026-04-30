// ============================================================
// AUTH LAYOUT — centered card, no sidebar, no header
// Wraps /login and any future auth pages (/forgot-password, etc.)
// ============================================================

import React from 'react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      {/* Subtle grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
        aria-hidden="true"
      />
      <div className="relative z-10 w-full max-w-md">
        {children}
      </div>
    </div>
  );
}
