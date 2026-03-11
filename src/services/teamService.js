import { supabase } from './supabaseClient.js';
import { getSession } from './authService.js';

const API_BASE = '/api/team';

async function getAuthHeaders() {
  const session = await getSession();
  if (!session) throw new Error('Não autenticado');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session.access_token}`
  };
}

export async function fetchTeam(params = {}) {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${API_BASE}?${query}`, {
    headers: await getAuthHeaders()
  });
  
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Erro ao buscar equipe');
  return data; // { data: [...], meta: {...} }
}

export async function changeRole(userId, newRole) {
  const res = await fetch(`${API_BASE}/${userId}/role`, {
    method: 'PATCH',
    headers: await getAuthHeaders(),
    body: JSON.stringify({ role: newRole })
  });
  
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Erro ao alterar papel');
  return data;
}

export async function removeMember(userId) {
  const res = await fetch(`${API_BASE}/${userId}`, {
    method: 'DELETE',
    headers: await getAuthHeaders()
  });
  
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Erro ao remover membro');
  return data;
}

export async function addMember(memberData) {
  const res = await fetch(`${API_BASE}`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify(memberData)
  });
  
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Erro ao adicionar membro');
  return data;
}
