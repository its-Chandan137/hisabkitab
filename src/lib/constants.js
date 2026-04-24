export const APP_NAME = 'HisabKitab';
export const STORAGE_KEY = 'hisabkitab_data';
export const SESSION_KEY = 'hisabkitab_session';
export const PENDING_SYNC_KEY = 'hisabkitab_pending_sync';
export const DATA_VERSION = 3;

export const AUTH_USERNAME = import.meta.env.VITE_APP_USERNAME || '';
export const AUTH_PASSWORD = import.meta.env.VITE_APP_PASSWORD || '';
export const ENCRYPTION_KEY =
  import.meta.env.VITE_ENCRYPTION_KEY || 'hisabkitab-local-dev-key-32chars';
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
export const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY || '';
