import type { NextRequest } from 'next/server';

export function isAuthorizedCronRequest(req: NextRequest, cronSecret: string | undefined): boolean {
  if (!cronSecret) return false;
  const authHeader = req.headers.get('authorization') ?? '';
  return authHeader === `Bearer ${cronSecret}`;
}
