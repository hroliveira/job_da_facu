// ============================================================
// api/works.js — CRUD de trabalhos acadêmicos
// GET    /api/works              — Listar (filters, paginate)
// GET    /api/works/kanban       — Agrupado por status
// GET    /api/works/deadlines    — Próximos prazos
// GET    /api/works/:id          — Buscar por ID
// POST   /api/works              — Criar
// PUT    /api/works/:id          — Atualizar
// PATCH  /api/works/:id/status   — Atualizar somente status
// DELETE /api/works/:id          — Deletar
// ============================================================
import { Router } from 'express';
import { authMiddleware } from './middleware/auth.js';

const router = Router();
router.use(authMiddleware);

// GET /api/works
router.get('/', async (req, res) => {
  try {
    const { search = '', status = '', page = 1, limit = 20 } = req.query;
    const start = (Number(page) - 1) * Number(limit);
    const end   = start + Number(limit) - 1;

    let query = req.supabase
      .from('works')
      .select(`*, students(id, name, institution), payments(id, status, amount)`, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(start, end);

    if (status) query = query.eq('status', status);
    if (search.trim()) query = query.or(`title.ilike.%${search}%,subject.ilike.%${search}%`);

    const { data, error, count } = await query;
    if (error) throw error;
    res.json({ data: data || [], count: count || 0, page: Number(page), limit: Number(limit) });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/works/kanban
router.get('/kanban', async (req, res) => {
  try {
    const { search = '' } = req.query;
    let query = req.supabase
      .from('works')
      .select(`*, students(id, name), payments(id, status, amount)`)
      .order('created_at', { ascending: false });

    if (search.trim()) query = query.or(`title.ilike.%${search}%,subject.ilike.%${search}%`);

    const { data, error } = await query;
    if (error) throw error;

    const grouped = { pending: [], in_progress: [], review: [], delivered: [], cancelled: [] };
    (data || []).forEach(w => { if (grouped[w.status]) grouped[w.status].push(w); });
    res.json(grouped);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/works/deadlines
router.get('/deadlines', async (req, res) => {
  try {
    const daysAhead = Number(req.query.days || 7);
    const future = new Date();
    future.setDate(future.getDate() + daysAhead);

    const { data, error } = await req.supabase
      .from('works')
      .select('*, students(id, name)')
      .not('status', 'in', '("delivered","cancelled")')
      .not('delivery_date', 'is', null)
      .lte('delivery_date', future.toISOString().slice(0, 10))
      .order('delivery_date', { ascending: true });

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/works/:id
router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await req.supabase
      .from('works')
      .select(`*, students(id, name, email, course, institution), payments(*), files(*)`)
      .eq('id', req.params.id)
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

// POST /api/works
router.post('/', async (req, res) => {
  try {
    const { title, student_id, subject, type, description, delivery_date, status, price } = req.body;
    if (!title) return res.status(400).json({ error: 'Título é obrigatório.' });

    const { data, error } = await req.supabase
      .from('works')
      .insert({ title, student_id, subject, type, description, delivery_date, status, price, user_id: req.user.id })
      .select()
      .single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/works/:id
router.put('/:id', async (req, res) => {
  try {
    const { title, student_id, subject, type, description, delivery_date, status, price } = req.body;
    const { data, error } = await req.supabase
      .from('works')
      .update({ title, student_id, subject, type, description, delivery_date, status, price })
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PATCH /api/works/:id/status
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: 'Status é obrigatório.' });

    const { data, error } = await req.supabase
      .from('works')
      .update({ status })
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/works/:id
router.delete('/:id', async (req, res) => {
  try {
    const { error } = await req.supabase.from('works').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ message: 'Trabalho excluído com sucesso.' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
