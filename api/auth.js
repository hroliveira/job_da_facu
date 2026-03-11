// ============================================================
// api/auth.js — Rotas de autenticação
// POST /api/auth/signup
// POST /api/auth/signin
// POST /api/auth/signout
// GET  /api/auth/me
// ============================================================
import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import { authMiddleware } from './middleware/auth.js';

const router = Router();
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// POST /api/auth/signup — Cadastro
router.post('/signup', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email e senha são obrigatórios.' });

    const { data, error } = await supabaseAdmin.auth.signUp({
      email, password,
      options: { data: { full_name: name || '' } },
    });
    if (error) throw error;
    res.json({ user: data.user, session: data.session });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/auth/signin — Login
router.post('/signin', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email e senha são obrigatórios.' });

    const { data, error } = await supabaseAdmin.auth.signInWithPassword({ email, password });
    if (error) throw error;
    res.json({ user: data.user, session: data.session, access_token: data.session?.access_token });
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
});

// POST /api/auth/signout — Logout
router.post('/signout', authMiddleware, async (req, res) => {
  try {
    const { error } = await req.supabase.auth.signOut();
    if (error) throw error;
    res.json({ message: 'Logout realizado com sucesso.' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/auth/me — Dados do usuário atual
router.get('/me', authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

export default router;
