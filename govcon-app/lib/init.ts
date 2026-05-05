// ============================================================
// APPLICATION INITIALIZATION
// Runs on server startup
// Handles database migrations and initial setup
// ============================================================

import { runStartupMigration } from './db/migrate';

let initialized = false;

export async function initializeApp(): Promise<void> {
  if (initialized) return;
  
  console.log('[init] Starting GovCon Assistant Pro initialization...');
  
  // Run database migrations
  const migrationResult = await runStartupMigration();
  console.log('[init] Migration result:', migrationResult.message);
  
  if (!migrationResult.success) {
    console.warn('[init] Migration issues detected. App may not function correctly.');
  }
  
  initialized = true;
  console.log('[init] Initialization complete.');
}
