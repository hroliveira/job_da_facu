// ============================================================
// api/middleware/auth.js — Middleware de autenticação JWT via Supabase
// Valida o Bearer token e disponibiliza req.user e req.supabase
// ============================================================
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL     = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

/**
 * Middleware que verifica o JWT do Supabase no header Authorization.
 * Injeta req.user (dados do usuário autenticado) e req.supabase
 * (client já configurado com o token do usuário para que o RLS funcione).
 */
export async function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Token de autenticação ausente.' });
  }

  // Cria um client autenticado com o token do usuário
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return res.status(401).json({ error: 'Token inválido ou expirado.' });
  }

  req.user     = user;
  req.supabase = supabase;
  next();
}
