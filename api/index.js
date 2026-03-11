// ============================================================
// api/index.js — Router principal da API
// Registra todas as sub-rotas em /api/*
// ============================================================
import { Router } from 'express';
import authRoutes      from './auth.js';
import studentsRoutes  from './students.js';
import worksRoutes     from './works.js';
import paymentsRoutes  from './payments.js';
import filesRoutes     from './files.js';
import dashboardRoutes from './dashboard.js';
import teamRoutes      from './team.js';

const router = Router();

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), service: 'Academic Work Manager API' });
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
