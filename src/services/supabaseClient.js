// ============================================================
// supabaseClient.js — Inicialização do Supabase client
// Credenciais são obtidas da API /api/config (do arquivo .env)
// ============================================================

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// Fetch das credenciais da API
const configResponse = await fetch('/api/config');
const config = await configResponse.json();

export const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);
