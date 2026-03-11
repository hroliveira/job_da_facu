// ============================================================
// paymentService.js — Gestão de pagamentos
// ============================================================
import { supabase } from './supabaseClient.js';

/**
 * Lista pagamentos de um trabalho específico
 */
export async function listPayments(workId) {
  const { data, error } = await supabase
    .from('payments')
    .select('*, works(id, title, students(name))')
    .eq('work_id', workId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Lista todos os pagamentos do usuário com filtro opcional por status
 */
export async function listAllPayments({ status = '', page = 1, limit = 20 } = {}) {
  const start = (page - 1) * limit;
  const end = start + limit - 1;

  let query = supabase
    .from('payments')
    .select(`
      *,
      works ( id, title, students ( id, name ) )
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(start, end);

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error, count } = await query;
  if (error) throw error;
  return { data: data || [], count: count || 0 };
}

/**
 * Cria um novo pagamento
 */
export async function createPayment(paymentData) {
  const { data, error } = await supabase
    .from('payments')
    .insert(paymentData)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Atualiza um pagamento (qualquer campo)
 */
export async function updatePayment(id, updates) {
  const { data, error } = await supabase
    .from('payments')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Atualiza o status de um pagamento
 */
export async function updatePaymentStatus(id, status, paymentDate = null) {
  const updates = { status };
  if (status === 'paid' && !paymentDate) {
    updates.payment_date = new Date().toISOString().slice(0, 10);
  } else if (paymentDate) {
    updates.payment_date = paymentDate;
  }
  return updatePayment(id, updates);
}

/**
 * Deleta um pagamento
 */
export async function deletePayment(id) {
  const { error } = await supabase
    .from('payments')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

/**
 * Retorna a receita de um mês específico (soma de pagamentos 'paid')
 */
export async function getMonthlyRevenue(year, month) {
  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const end = new Date(year, month, 0).toISOString().slice(0, 10); // último dia do mês

  const { data, error } = await supabase
    .from('payments')
    .select('amount')
    .eq('status', 'paid')
    .gte('payment_date', start)
    .lte('payment_date', end);

  if (error) throw error;
  return (data || []).reduce((sum, p) => sum + Number(p.amount), 0);
}

/**
 * Retorna dados de receita para os últimos N meses (para gráfico)
 */
export async function getRevenueByMonth(months = []) {
  // months = [{year, month, label}, ...]
  const results = await Promise.all(
    months.map(async ({ year, month, label }) => {
      const revenue = await getMonthlyRevenue(year, month);
      return { year, month, label, revenue };
    })
  );
  return results;
}

/**
 * Total de pagamentos pendentes (Baseado no valor faltante de todos os trabalhos)
 */
export async function getPendingTotal() {
  const { data: works, error } = await supabase
    .from('works')
    .select('price, payments(amount, status)');

  if (error) throw error;
  
  let pendingSum = 0;
  for (const w of works || []) {
    const totalPaid = (w.payments || []).filter(p => p.status === 'paid').reduce((sum, p) => sum + Number(p.amount), 0);
    const workPrice = Number(w.price) || 0;
    if (workPrice > totalPaid) {
      pendingSum += (workPrice - totalPaid);
    }
  }
  
  return pendingSum;
}

/**
 * Total de receita de todos os tempos
 */
export async function getTotalRevenue() {
  const { data, error } = await supabase
    .from('payments')
    .select('amount')
    .eq('status', 'paid');

  if (error) throw error;
  return (data || []).reduce((sum, p) => sum + Number(p.amount), 0);
}

/**
 * Conta trabalhos que estão totalmente pagos (soma dos pagamentos >= preço do trabalho)
 */
export async function getPaidWorksCount() {
  const { data: works, error } = await supabase
    .from('works')
    .select('price, payments(amount, status)');

  if (error) throw error;
  
  let paidCount = 0;
  for (const w of works || []) {
    const totalPaid = (w.payments || []).filter(p => p.status === 'paid').reduce((sum, p) => sum + Number(p.amount), 0);
    const workPrice = Number(w.price) || 0;
    if (workPrice > 0 && totalPaid >= workPrice) {
      paidCount++;
    }
  }

  return paidCount;
}
