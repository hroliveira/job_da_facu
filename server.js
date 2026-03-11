// ============================================================
// server.js — Servidor Express principal
// Serve os arquivos estáticos e expõe a API REST em /api/*
// ============================================================
import 'dotenv/config';
import express    from 'express';
import helmet     from 'helmet';
import cors       from 'cors';
import { fileURLToPath } from 'url';
import path       from 'path';
import apiRouter  from './api/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Segurança e parsers ──────────────────────────────────────
// CSP desativado: o frontend usa onclick/onsubmit/type=module inline
// Helmet ainda ativa: X-Frame-Options, X-Content-Type-Options, etc.
app.use(helmet({ contentSecurityPolicy: false }));

app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── API REST ─────────────────────────────────────────────────
app.use('/api', apiRouter);

// ── Arquivos estáticos (frontend) ────────────────────────────
// Serve todos os assets: JS, CSS, HTML, etc.
app.use(express.static(__dirname, {
  // Não cacheia HTML em desenvolvimento
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache');
    }
  },
}));

// SPA fallback: qualquer rota não-API serve o index.html
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  // Rota /app → app.html, qualquer outra → index.html
  if (req.path === '/app' || req.path === '/app.html') {
    res.sendFile(path.join(__dirname, 'app.html'));
  } else {
    res.sendFile(path.join(__dirname, 'index.html'));
  }
});

// ── Tratamento de erros ──────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message);
  res.status(err.status || 500).json({ error: err.message || 'Erro interno do servidor.' });
});

// ── Start ────────────────────────────────────────────────────
// Se está rodando localmente (não em Vercel), inicia o servidor
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`\n🎓 Academic Work Manager`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`🌐 Frontend: http://localhost:${PORT}`);
    console.log(`🔌 API:      http://localhost:${PORT}/api`);
    console.log(`❤️  Health:   http://localhost:${PORT}/api/health`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
  });
}

// Exportar app para Vercel (serverless handler)
export default app;
