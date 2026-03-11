// ============================================================
// api/students.js — CRUD de alunos
// GET    /api/students        — Listar (search, page, limit)
// GET    /api/students/all    — Todos (para dropdowns)
// GET    /api/students/:id    — Buscar por ID
// POST   /api/students        — Criar
// PUT    /api/students/:id    — Atualizar
// DELETE /api/students/:id    — Deletar
// ============================================================
import { Router } from 'express';
import { authMiddleware } from './middleware/auth.js';

const router = Router();
router.use(authMiddleware);

// GET /api/students
router.get('/', async (req, res) => {
  try {
    const { search = '', page = 1, limit = 10 } = req.query;
    const start = (Number(page) - 1) * Number(limit);
    const end   = start + Number(limit) - 1;

    let query = req.supabase
      .from('students')
      .select('*, works(count)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(start, end);

    if (search.trim()) query = query.ilike('name', `%${search}%`);

    const { data, error, count } = await query;
    if (error) throw error;
    res.json({ data: data || [], count: count || 0, page: Number(page), limit: Number(limit) });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/students/all — todos (para dropdown)
router.get('/all', async (req, res) => {
  try {
    const { data, error } = await req.supabase
      .from('students')
      .select('id, name')
      .order('name');
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/students/:id
router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await req.supabase
      .from('students')
      .select(`
        *,
        works (
          id, title, subject, status, delivery_date, price, created_at,
          payments ( id, status, amount )
        )
      `)
      .eq('id', req.params.id)
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

// POST /api/students
router.post('/', async (req, res) => {
  try {
    const { name, email, phone, course, institution, notes } = req.body;
    if (!name) return res.status(400).json({ error: 'Nome é obrigatório.' });

    const { data, error } = await req.supabase
      .from('students')
      .insert({ name, email, phone, course, institution, notes, user_id: req.user.id })
      .select()
      .single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/students/:id
router.put('/:id', async (req, res) => {
  try {
    const { name, email, phone, course, institution, notes } = req.body;
    const { data, error } = await req.supabase
      .from('students')
      .update({ name, email, phone, course, institution, notes })
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/students/:id
router.delete('/:id', async (req, res) => {
  try {
    const { error } = await req.supabase
      .from('students')
      .delete()
      .eq('id', req.params.id);
    if (error) throw error;
    res.json({ message: 'Aluno excluído com sucesso.' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
