// ============================================================
// supabaseClient.js — Inicialização do Supabase client
// As credenciais são lidas do arquivo /env.js na raiz do projeto.
// Para trocar o projeto Supabase, edite apenas o env.js.
// ============================================================

import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../../env.js';
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
