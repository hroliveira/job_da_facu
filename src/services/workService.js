// ============================================================
// workService.js — CRUD de trabalhos acadêmicos
// ============================================================
import { supabase } from './supabaseClient.js';

/**
 * Lista trabalhos com filtros e paginação
 * @param {object} opts - { search, status, page, limit }
 */
export async function listWorks({ search = '', status = '', page = 1, limit = 20 } = {}) {
  const start = (page - 1) * limit;
  const end = start + limit - 1;

  let query = supabase
    .from('works')
    .select(`
      *,
      students ( id, name, institution ),
      payments ( id, status, amount )
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(start, end);

  if (status) {
    query = query.eq('status', status);
  }
  if (search.trim()) {
    query = query.or(`title.ilike.%${search}%,subject.ilike.%${search}%`);
  }

  const { data, error, count } = await query;
  if (error) throw error;
  return { data: data || [], count: count || 0 };
}

/**
 * Lista trabalhos agrupados por status (para o Kanban)
 * @param {string} search - termo de busca opcional
 */
export async function listWorksForKanban(search = '') {
  let query = supabase
    .from('works')
    .select(`
      *,
      students ( id, name ),
      payments ( id, status, amount )
    `)
    .order('created_at', { ascending: false });

  if (search.trim()) {
    query = query.or(`title.ilike.%${search}%,subject.ilike.%${search}%`);
  }

  const { data, error } = await query;
  if (error) throw error;

  // Agrupa por status
  const grouped = {
    pending:     [],
    in_progress: [],
    review:      [],
    delivered:   [],
    cancelled:   [],
  };
  (data || []).forEach(w => {
    if (grouped[w.status]) grouped[w.status].push(w);
  });
  return grouped;
}

/**
 * Busca um trabalho pelo ID (com arquivos e pagamentos)
 */
export async function getWork(id) {
  const { data, error } = await supabase
    .from('works')
    .select(`
      *,
      students ( id, name, email, course, institution ),
      payments ( * ),
      files ( * )
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Cria um novo trabalho
 */
export async function createWork(workData) {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('works')
    .insert({ ...workData, user_id: user.id })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Atualiza um trabalho
 */
export async function updateWork(id, updates) {
  const { data, error } = await supabase
    .from('works')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Atualiza apenas o status
 */
export async function updateWorkStatus(id, status) {
  return updateWork(id, { status });
}

/**
 * Deleta um trabalho
 */
export async function deleteWork(id) {
  const { error } = await supabase
    .from('works')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

/**
 * Retorna trabalhos com deadline próximo ou atrasado
 * @param {number} daysAhead - dias para considerar "próximo"
 */
export async function getDeadlines(daysAhead = 7) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const future = new Date(today);
  future.setDate(today.getDate() + daysAhead);

  const { data, error } = await supabase
    .from('works')
    .select('*, students(id, name)')
    .not('status', 'in', '("delivered","cancelled")')
    .not('delivery_date', 'is', null)
    .lte('delivery_date', future.toISOString().slice(0, 10))
    .order('delivery_date', { ascending: true });

  if (error) throw error;
  return data || [];
}
