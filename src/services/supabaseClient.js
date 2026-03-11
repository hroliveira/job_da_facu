// ============================================================
// supabaseClient.js — Inicialização do Supabase client
// Credenciais são obtidas da API /api/config (do arquivo .env)
// ============================================================

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// Função para obter as credenciais com retry e fallback
async function getSupabaseConfig() {
  try {
    // Tenta com URL absoluta por segurança em Vercel
    const origin = window.location.origin;
    const url = `${origin}/api/config`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store'
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const config = await response.json();
    
    if (!config.SUPABASE_URL || !config.SUPABASE_ANON_KEY) {
      throw new Error('Credenciais inválidas retornadas do servidor');
    }

    return config;
  } catch (error) {
    console.error('[Supabase Config Error]', error.message);
    throw new Error(`Falha ao carregar configuração do Supabase: ${error.message}`);
  }
}

// Inicializar cliente com tratamento de erro
const config = await getSupabaseConfig();
export const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);
