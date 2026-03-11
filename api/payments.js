// ============================================================
// api/payments.js — Gestão de pagamentos
// GET    /api/payments              — Listar todos (paginado)
// GET    /api/payments/work/:workId — Listar de um trabalho
// POST   /api/payments              — Criar
// PATCH  /api/payments/:id/status   — Atualizar status
// DELETE /api/payments/:id          — Deletar
// ============================================================
import { Router } from 'express';
import { authMiddleware } from './middleware/auth.js';

const router = Router();
router.use(authMiddleware);

// GET /api/payments
router.get('/', async (req, res) => {
  try {
    const { status = '', page = 1, limit = 20 } = req.query;
    const start = (Number(page) - 1) * Number(limit);
    const end   = start + Number(limit) - 1;

    let query = req.supabase
      .from('payments')
      .select(`*, works(id, title, students(id, name))`, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(start, end);

    if (status) query = query.eq('status', status);

    const { data, error, count } = await query;
    if (error) throw error;
    res.json({ data: data || [], count: count || 0, page: Number(page), limit: Number(limit) });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/payments/work/:workId
router.get('/work/:workId', async (req, res) => {
  try {
    const { data, error } = await req.supabase
      .from('payments')
      .select('*, works(id, title, students(name))')
      .eq('work_id', req.params.workId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/payments
router.post('/', async (req, res) => {
  try {
    const { work_id, amount, payment_method, status, payment_date } = req.body;
    if (!work_id || amount === undefined) return res.status(400).json({ error: 'work_id e amount são obrigatórios.' });

    const { data, error } = await req.supabase
      .from('payments')
      .insert({ work_id, amount, payment_method, status, payment_date })
      .select()
      .single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PATCH /api/payments/:id/status
router.patch('/:id/status', async (req, res) => {
  try {
    const { status, payment_date } = req.body;
    if (!status) return res.status(400).json({ error: 'Status é obrigatório.' });

    const updates = { status };
    if (status === 'paid' && !payment_date) {
      updates.payment_date = new Date().toISOString().slice(0, 10);
    } else if (payment_date) {
      updates.payment_date = payment_date;
    }

    const { data, error } = await req.supabase
      .from('payments')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/payments/:id
router.delete('/:id', async (req, res) => {
  try {
    const { error } = await req.supabase.from('payments').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ message: 'Pagamento excluído com sucesso.' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
