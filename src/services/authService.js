// ============================================================
// authService.js — Autenticação com Supabase Auth
// ============================================================
import { supabase } from './supabaseClient.js';

/**
 * Cadastra um novo usuário
 * @param {string} email
 * @param {string} password
 * @param {string} name
 */
export async function signUp(email, password, name) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: name } }
  });
  if (error) throw error;
  return data;
}

/**
 * Faz login com email e senha
 */
export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

/**
 * Faz logout do usuário atual
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/**
 * Retorna a sessão atual (ou null)
 */
export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

/**
 * Retorna o usuário atual
 */
export async function getUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

/**
 * Retorna o perfil do usuário na tabela profiles
 */
export async function getProfile(userId) {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
  if (error) throw error;
  return data;
}

/**
 * Assina o evento de mudança de estado de autenticação
 * @param {Function} callback
 */
export function onAuthStateChange(callback) {
  return supabase.auth.onAuthStateChange(callback);
}

/**
 * Atualiza dados do perfil do usuário
 */
export async function updateProfile(data) {
  const { error } = await supabase.auth.updateUser({ data });
  if (error) throw error;
}

/**
 * Atualiza a senha do usuário
 */
export async function updatePassword(newPassword) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}
