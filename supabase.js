import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://gktehkfaiqutjrunfyah.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_vDVciGc-1-vg0HXe3MmHAg_V6Ea90hQ';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
