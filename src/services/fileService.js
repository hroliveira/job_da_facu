// ============================================================
// fileService.js — Upload e gestão de arquivos via Supabase Storage
// ============================================================
import { supabase } from './supabaseClient.js';

const BUCKET = 'work-files';

/**
 * Faz upload de um arquivo e registra no banco
 * @param {string} workId
 * @param {File} file - objeto File do input
 * @returns {object} registro inserido em files
 */
export async function uploadFile(workId, file) {
  const { data: { user } } = await supabase.auth.getUser();
  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const filePath = `${user.id}/${workId}/${timestamp}_${safeName}`;

  // Upload para o Storage
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, file, { upsert: false });

  if (uploadError) throw uploadError;

  // Registra na tabela files
  const { data, error } = await supabase
    .from('files')
    .insert({
      work_id: workId,
      file_name: file.name,
      file_path: filePath,
    })
    .select()
    .single();

  if (error) {
    // Limpa o arquivo do storage em caso de erro no banco
    await supabase.storage.from(BUCKET).remove([filePath]);
    throw error;
  }

  return data;
}

/**
 * Lista os arquivos de um trabalho
 * @param {string} workId
 */
export async function listFiles(workId) {
  const { data, error } = await supabase
    .from('files')
    .select('*')
    .eq('work_id', workId)
    .order('uploaded_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Lista todos os arquivos do usuário (join via works)
 */
export async function listAllFiles({ page = 1, limit = 20 } = {}) {
  const start = (page - 1) * limit;
  const end = start + limit - 1;

  const { data, error, count } = await supabase
    .from('files')
    .select(`
      *,
      works ( id, title, students ( id, name ) )
    `, { count: 'exact' })
    .order('uploaded_at', { ascending: false })
    .range(start, end);

  if (error) throw error;
  return { data: data || [], count: count || 0 };
}

/**
 * Gera URL temporária para download
 * @param {string} filePath - caminho no Storage
 * @param {number} expiresIn - segundos (padrão: 60)
 */
export async function getDownloadUrl(filePath, expiresIn = 60) {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(filePath, expiresIn);

  if (error) throw error;
  return data.signedUrl;
}

/**
 * Deleta um arquivo do Storage e do banco
 * @param {string} fileId
 * @param {string} filePath
 */
export async function deleteFile(fileId, filePath) {
  // Remove do Storage
  const { error: storageError } = await supabase.storage
    .from(BUCKET)
    .remove([filePath]);

  if (storageError) throw storageError;

  // Remove do banco
  const { error } = await supabase
    .from('files')
    .delete()
    .eq('id', fileId);

  if (error) throw error;
}
