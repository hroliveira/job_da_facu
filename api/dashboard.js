// ============================================================
// api/dashboard.js — Métricas do Dashboard
// GET /api/dashboard/metrics          — Métricas consolidadas
// GET /api/dashboard/deadlines        — Próximos prazos
// GET /api/dashboard/students/recent  — Alunos recentes
// GET /api/dashboard/revenue/chart    — Dados do gráfico de receita
// ============================================================
import { Router } from 'express';
import { authMiddleware } from './middleware/auth.js';

const router = Router();
router.use(authMiddleware);

// Helper: últimos N meses
function getLastNMonths(n) {
  const months = [];
  const labels = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    months.push({ year: d.getFullYear(), month: d.getMonth() + 1, label: labels[d.getMonth()] });
  }
  return months;
}

// Helper: receita de um mês
async function getMonthlyRevenue(supabase, year, month) {
  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const end   = new Date(year, month, 0).toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from('payments')
    .select('amount')
    .eq('status', 'paid')
    .gte('payment_date', start)
    .lte('payment_date', end);
  if (error) throw error;
  return (data || []).reduce((sum, p) => sum + Number(p.amount), 0);
}

// GET /api/dashboard/metrics
router.get('/metrics', async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const year  = new Date().getFullYear();
    const month = new Date().getMonth() + 1;

    const [studentsResult, worksResult, allPayments, paidPayments] = await Promise.all([
      req.supabase.from('students').select('*', { count: 'exact', head: true }),
      req.supabase.from('works').select('id, status, delivery_date'),
      req.supabase.from('payments').select('amount').eq('status', 'pending'),
      req.supabase.from('payments').select('amount').eq('status', 'paid'),
    ]);

    if (studentsResult.error) throw studentsResult.error;
    if (worksResult.error) throw worksResult.error;

    const works           = worksResult.data || [];
    const activeStatuses  = ['pending', 'in_progress', 'review'];
    const monthlyRevenue  = await getMonthlyRevenue(req.supabase, year, month);

    res.json({
      total_students:        studentsResult.count || 0,
      active_works:          works.filter(w => activeStatuses.includes(w.status)).length,
      works_in_progress:     works.filter(w => w.status === 'in_progress').length,
      delivered_works:       works.filter(w => w.status === 'delivered').length,
      cancelled_works:       works.filter(w => w.status === 'cancelled').length,
      overdue_works:         works.filter(w => activeStatuses.includes(w.status) && w.delivery_date && w.delivery_date < today).length,
      monthly_revenue:       monthlyRevenue,
      pending_payment_total: (allPayments.data || []).reduce((s, p) => s + Number(p.amount), 0),
      total_revenue:         (paidPayments.data || []).reduce((s, p) => s + Number(p.amount), 0),
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/dashboard/deadlines
router.get('/deadlines', async (req, res) => {
  try {
    const limit = Number(req.query.limit || 10);
    const future = new Date();
    future.setDate(future.getDate() + 7);

    const { data, error } = await req.supabase
      .from('works')
      .select('*, students(id, name)')
      .not('status', 'in', '("delivered","cancelled")')
      .not('delivery_date', 'is', null)
      .lte('delivery_date', future.toISOString().slice(0, 10))
      .order('delivery_date', { ascending: true })
      .limit(limit);

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/dashboard/students/recent
router.get('/students/recent', async (req, res) => {
  try {
    const limit = Number(req.query.limit || 5);
    const { data, error } = await req.supabase
      .from('students')
      .select('*, works(count)')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/dashboard/revenue/chart
router.get('/revenue/chart', async (req, res) => {
  try {
    const months = Number(req.query.months || 6);
    const monthList = getLastNMonths(months);
    const results = await Promise.all(
      monthList.map(async ({ year, month, label }) => ({
        year, month, label,
        revenue: await getMonthlyRevenue(req.supabase, year, month),
      }))
    );
    res.json(results);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
