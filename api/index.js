// ============================================================
// api/index.js — Router principal da API
// Registra todas as sub-rotas em /api/*
// ============================================================
import { Router } from 'express';
import authRoutes from './auth.js';
import dashboardRoutes from './dashboard.js';
import filesRoutes from './files.js';
import paymentsRoutes from './payments.js';
import studentsRoutes from './students.js';
import teamRoutes from './team.js';
import worksRoutes from './works.js';

const router = Router();

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), service: 'Academic Work Manager API' });
});

// Config (Credenciais públicas do Supabase)
router.get('/config', (req, res) => {
  res.json({
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY
  });
});

// Sub-rotas
router.use('/auth',      authRoutes);
router.use('/students',  studentsRoutes);
router.use('/works',     worksRoutes);
router.use('/payments',  paymentsRoutes);
router.use('/files',     filesRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/team',      teamRoutes);

export default router;
