import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { authMiddleware } from './middleware/auth.js';

const router = express.Router();
router.use(authMiddleware);

// Helper para criar admin client
const getAdminClient = () => {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    throw new Error('A variável SUPABASE_SERVICE_ROLE_KEY não está configurada no .env do servidor. É obrigatória para criar membros da equipe.');
  }

  return createClient(
    process.env.SUPABASE_URL, 
    serviceKey
  );
};

// GET /api/team - Listar todos os perfis
router.get('/', async (req, res) => {
  try {
    const { search, role, page = 1, limit = 50 } = req.query;
    let query = req.supabase.from('profiles').select('*', { count: 'exact' });

    if (search) {
      query = query.ilike('full_name', `%${search}%`);
    }
    if (role) {
      query = query.eq('role', role);
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to).order('created_at', { ascending: false });

    const { data: team, error, count } = await query;

    if (error) throw error;
    
    // Obter count de works por student/user_id se for academico ou aluno
    const usersWithStats = await Promise.all(team.map(async (member) => {
      let activeWorks = 0;
      if (member.role === 'academico') {
         // Obras vinculadas a este user_id que não estão entregues ou canceladas
         const { count } = await req.supabase
           .from('works')
           .select('*', { count: 'exact', head: true })
           .eq('user_id', member.id)
           .in('status', ['pending', 'in_progress', 'review']);
         activeWorks = count || 0;
      } else if (member.role === 'aluno') {
         const { data: student } = await req.supabase.from('students').select('id').eq('user_id', member.id).single();
         if (student) {
           const { count } = await req.supabase
             .from('works')
             .select('*', { count: 'exact', head: true })
             .eq('student_id', student.id)
             .in('status', ['pending', 'in_progress', 'review']);
           activeWorks = count || 0;
         }
      }
      return { ...member, activeWorks };
    }));

    res.json({
      data: usersWithStats,
      meta: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/team/:id/role - Mudar role de um usuário (Apenas admins)
router.patch('/:id/role', async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    const { data: callerProfile, error: profileErr } = await req.supabase
      .from('profiles')
      .select('role')
      .eq('id', req.user.id)
      .single();

    if (profileErr) throw profileErr;
    if (callerProfile.role !== 'admin') {
      return res.status(403).json({ error: 'Apenas administradores podem alterar perfis.' });
    }

    if (!['admin', 'academico', 'aluno'].includes(role)) {
      return res.status(400).json({ error: 'Role inválida.' });
    }

    const supabaseAdmin = getAdminClient();
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update({ role })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// DELETE /api/team/:id - Remover usuário (Apenas Admin pode deletar auth)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data: callerProfile, error: profileErr } = await req.supabase
      .from('profiles')
      .select('role')
      .eq('id', req.user.id)
      .single();

    if (profileErr) throw profileErr;
    if (callerProfile.role !== 'admin') {
      return res.status(403).json({ error: 'Apenas administradores podem remover usuários.' });
    }

    const supabaseAdmin = getAdminClient();

    const { error: dbErr } = await supabaseAdmin.from('profiles').delete().eq('id', id);
    if (dbErr) throw dbErr;

    const { error: authErr } = await supabaseAdmin.auth.admin.deleteUser(id);
    if (authErr) {
       console.error("Erro deletando auth user:", authErr);
    }

    res.json({ message: 'Membro removido com sucesso' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// POST /api/team - Criar novo usuário e associar ao perfil (Apenas Admin)
router.post('/', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'Preencha todos os campos obrigatórios.' });
    }

    // Validação de Role
    if (!['admin', 'academico'].includes(role)) {
      return res.status(400).json({ error: 'Perfis suportados para criação via equipe: admin ou academico.' });
    }

    // 1) Checar se o requisitante é admin
    const { data: callerProfile, error: profileErr } = await req.supabase
      .from('profiles')
      .select('role')
      .eq('id', req.user.id)
      .single();

    if (profileErr) throw profileErr;
    if (callerProfile.role !== 'admin') {
      return res.status(403).json({ error: 'Apenas administradores podem adicionar membros.' });
    }

    const supabaseAdmin = getAdminClient();

    // 2) Criar usuário no Auth com o email_confirm: true 
    // Isso evita e-mail pendente e loga direto
    const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: name, role: role }
    });

    if (authErr) throw authErr;

    const userId = authData.user.id;

    // 3) Atualizar o perfil forçadamente caso a trigger defina um papel padrão
    const { error: updateErr } = await supabaseAdmin
      .from('profiles')
      .update({ role: role, full_name: name })
      .eq('id', userId);

    if (updateErr) {
      console.warn("Criado login, mas erro no update de role do perfil:", updateErr);
    }

    res.json({ message: 'Membro adicionado com sucesso', user: authData.user });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
