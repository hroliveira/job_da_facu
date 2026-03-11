// ============================================================
// dashboardService.js — Métricas consolidadas do Dashboard
// ============================================================
import { supabase } from './supabaseClient.js';
import { getLastNMonths } from '../utils/dateHelpers.js';
import { getRevenueByMonth, getMonthlyRevenue, getPendingTotal, getTotalRevenue, getPaidWorksCount } from './paymentService.js';

/**
 * Retorna todas as métricas do dashboard em uma única chamada
 */
export async function getDashboardMetrics() {
  const today = new Date().toISOString().slice(0, 10);
  const { year, month } = { year: new Date().getFullYear(), month: new Date().getMonth() + 1 };

  // Executa todas as queries em paralelo
  const [
    studentsResult,
    worksResult,
    monthlyRevenue,
    pendingTotal,
    totalRevenue,
    paidWorksCount,
  ] = await Promise.all([
    supabase.from('students').select('*', { count: 'exact', head: true }),
    supabase.from('works').select('id, status, delivery_date'),
    getMonthlyRevenue(year, month),
    getPendingTotal(),
    getTotalRevenue(),
    getPaidWorksCount(),
  ]);

  if (studentsResult.error) throw studentsResult.error;
  if (worksResult.error) throw worksResult.error;

  const works = worksResult.data || [];
  const activeStatuses = ['pending', 'in_progress', 'review'];
  const active_works     = works.filter(w => activeStatuses.includes(w.status)).length;
  const in_progress      = works.filter(w => w.status === 'in_progress').length;
  const delivered_works  = works.filter(w => w.status === 'delivered').length;
  const cancelled_works  = works.filter(w => w.status === 'cancelled').length;
  const overdue_works    = works.filter(w => {
    return activeStatuses.includes(w.status) && w.delivery_date && w.delivery_date < today;
  }).length;

  return {
    total_students:  studentsResult.count || 0,
    active_works,
    works_in_progress: in_progress,
    delivered_works,
    cancelled_works,
    overdue_works,
    monthly_revenue: monthlyRevenue,
    pending_payment_total: pendingTotal,
    total_revenue: totalRevenue,
    paid_works_count: paidWorksCount,
  };
}

/**
 * Retorna os próximos deadlines (trabalhos com entrega em até 7 dias ou atrasados)
 * @param {number} limit
 */
export async function getUpcomingDeadlines(limit = 10) {
  const future = new Date();
  future.setDate(future.getDate() + 7);

  const { data, error } = await supabase
    .from('works')
    .select('*, students(id, name)')
    .not('status', 'in', '("delivered","cancelled")')
    .not('delivery_date', 'is', null)
    .lte('delivery_date', future.toISOString().slice(0, 10))
    .order('delivery_date', { ascending: true })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

/**
 * Retorna os estudantes mais recentemente criados
 * @param {number} limit
 */
export async function getRecentStudents(limit = 5) {
  const { data, error } = await supabase
    .from('students')
    .select('*, works(count)')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

/**
 * Dados de receita para o gráfico de barras (últimos 6 meses)
 */
export async function getRevenueChartData(months = 6) {
  const monthList = getLastNMonths(months);
  return getRevenueByMonth(monthList);
}
