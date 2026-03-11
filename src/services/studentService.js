// ============================================================
// studentService.js — CRUD de estudantes
// ============================================================
import { supabase } from './supabaseClient.js';

/**
 * Lista estudantes com suporte a busca e paginação
 * @param {object} opts - { search, page, limit }
 * @returns {{ data: [], count: number }}
 */
export async function listStudents({ search = '', page = 1, limit = 10 } = {}) {
  const start = (page - 1) * limit;
  const end = start + limit - 1;

  let query = supabase
    .from('students')
    .select('*, works(count)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(start, end);

  if (search.trim()) {
    query = query.ilike('name', `%${search}%`);
  }

  const { data, error, count } = await query;
  if (error) throw error;
  return { data: data || [], count: count || 0 };
}

/**
 * Busca um estudante pelo ID (inclui seus trabalhos)
 */
export async function getStudent(id) {
  const { data, error } = await supabase
    .from('students')
    .select(`
      *,
      works (
        id, title, subject, status, delivery_date, price, created_at,
        payments ( id, status, amount )
      )
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Cria um novo estudante
 * @param {object} studentData
 */
export async function createStudent(studentData) {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('students')
    .insert({ ...studentData, user_id: user.id })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Atualiza um estudante
 * @param {string} id
 * @param {object} updates
 */
export async function updateStudent(id, updates) {
  const { data, error } = await supabase
    .from('students')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Deleta um estudante
 * @param {string} id
 */
export async function deleteStudent(id) {
  const { error } = await supabase
    .from('students')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

/**
 * Lista todos os estudantes (para selects/dropdowns)
 */
export async function listStudentsAll() {
  const { data, error } = await supabase
    .from('students')
    .select('id, name')
    .order('name');

  if (error) throw error;
  return data || [];
}
