// ============================================================
// api/files.js — Gestão de arquivos
// GET    /api/files              — Listar todos (paginado)
// GET    /api/files/work/:workId — Listar de um trabalho
// POST   /api/files/upload       — Upload de arquivo (multipart)
// GET    /api/files/:id/download — URL assinada para download
// DELETE /api/files/:id          — Deletar arquivo
// ============================================================
import { Router } from 'express';
import multer from 'multer';
import { authMiddleware } from './middleware/auth.js';

const router   = Router();
const upload   = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } }); // 20MB max
const BUCKET   = 'work-files';

router.use(authMiddleware);

// GET /api/files
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const start = (Number(page) - 1) * Number(limit);
    const end   = start + Number(limit) - 1;

    const { data, error, count } = await req.supabase
      .from('files')
      .select(`*, works(id, title, students(id, name))`, { count: 'exact' })
      .order('uploaded_at', { ascending: false })
      .range(start, end);

    if (error) throw error;
    res.json({ data: data || [], count: count || 0, page: Number(page), limit: Number(limit) });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/files/work/:workId
router.get('/work/:workId', async (req, res) => {
  try {
    const { data, error } = await req.supabase
      .from('files')
      .select('*')
      .eq('work_id', req.params.workId)
      .order('uploaded_at', { ascending: false });
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/files/upload — Upload via multipart/form-data
// Body: work_id (field), file (file)
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const { work_id } = req.body;
    if (!work_id) return res.status(400).json({ error: 'work_id é obrigatório.' });
    if (!req.file)  return res.status(400).json({ error: 'Arquivo não enviado.' });

    const timestamp = Date.now();
    const safeName  = req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filePath  = `${req.user.id}/${work_id}/${timestamp}_${safeName}`;

    // Upload para o Supabase Storage
    const { error: uploadError } = await req.supabase.storage
      .from(BUCKET)
      .upload(filePath, req.file.buffer, { contentType: req.file.mimetype, upsert: false });

    if (uploadError) throw uploadError;

    // Registra no banco
    const { data, error } = await req.supabase
      .from('files')
      .insert({ work_id, file_name: req.file.originalname, file_path: filePath })
      .select()
      .single();

    if (error) {
      await req.supabase.storage.from(BUCKET).remove([filePath]);
      throw error;
    }
    res.status(201).json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/files/:id/download — Gera URL assinada (60 segundos)
router.get('/:id/download', async (req, res) => {
  try {
    const { data: fileRec, error: dbErr } = await req.supabase
      .from('files')
      .select('file_path, file_name')
      .eq('id', req.params.id)
      .single();
    if (dbErr) throw dbErr;

    const { data, error } = await req.supabase.storage
      .from(BUCKET)
      .createSignedUrl(fileRec.file_path, 60);
    if (error) throw error;
    res.json({ url: data.signedUrl, file_name: fileRec.file_name });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/files/:id
router.delete('/:id', async (req, res) => {
  try {
    const { data: fileRec, error: dbErr } = await req.supabase
      .from('files')
      .select('file_path')
      .eq('id', req.params.id)
      .single();
    if (dbErr) throw dbErr;

    const { error: storageErr } = await req.supabase.storage.from(BUCKET).remove([fileRec.file_path]);
    if (storageErr) throw storageErr;

    const { error } = await req.supabase.from('files').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ message: 'Arquivo excluído com sucesso.' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
