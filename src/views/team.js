// ============================================================
// team.js — View de Gerenciamento da Equipe e Roles
// ============================================================
import { fetchTeam, changeRole, removeMember, addMember } from '../services/teamService.js';
import { getUser, getProfile } from '../services/authService.js';
import { showToast, showConfirmModal, getInitials } from '../utils/uiHelpers.js';

let state = {
  members: [],
  meta: { total: 0, page: 1, limit: 10, totalPages: 1 },
  search: '',
  currentUserProfile: null
};

// Mapeamento de Papéis (Roles)
const ROLE_MAP = {
  'admin': { label: 'Admin', color: 'bg-primary/10 text-primary' },
  'academico': { label: 'Acadêmico', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-500' },
  'aluno': { label: 'Aluno', color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' }
};

export async function renderTeam(container) {
  container.innerHTML = `
    <div class="p-8 space-y-8 flex-1 min-h-0 flex flex-col">
      <!-- Header -->
      <div>
        <h2 class="text-2xl font-bold tracking-tight text-slate-900">Equipe</h2>
        <p class="text-slate-500">Gerencie sua equipe acadêmica, redatores e administradores na plataforma.</p>
      </div>

      <!-- Stats Cards (Simulados p/ design original) -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 shrink-0" id="team-stats-container">
        <!-- Renderizado dinamicamente -->
      </div>

      <!-- Main Panel -->
      <div class="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col min-h-[400px]">
        
        <!-- Toolbar -->
        <div class="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50/50 rounded-t-xl shrink-0">
          <h3 class="font-bold text-lg text-slate-800">Diretório da Equipe</h3>
          <div class="flex gap-2">
            <button onclick="openCreateMemberModal()" class="bg-primary hover:bg-blue-600 text-white font-semibold text-sm px-4 py-2 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-primary/20">
              <span class="material-symbols-outlined text-lg">person_add</span>Adicionar Membro
            </button>
          </div>
        </div>

        <!-- Table Container -->
        <div class="flex-1 overflow-auto relative min-h-[300px]">
          <table class="w-full text-left border-collapse">
            <thead class="sticky top-0 bg-slate-50 z-10 shadow-sm">
              <tr class="text-slate-500 text-xs uppercase tracking-wider">
                <th class="px-6 py-4 font-bold w-[40%]">Membro / Email</th>
                <th class="px-6 py-4 font-bold w-[20%]">Perfil</th>
                <th class="px-6 py-4 font-bold text-center w-[15%]">Obras Ativas</th>
                <th class="px-6 py-4 font-bold text-center w-[15%]">Status Conta</th>
                <th class="px-6 py-4 font-bold text-right w-[10%]">Ações</th>
              </tr>
            </thead>
            <tbody id="team-table-body" class="divide-y divide-slate-100 bg-white">
              <!-- Loading state -->
              <tr><td colspan="5" class="px-6 py-12 text-center text-slate-500"><div class="w-6 h-6 border-2 border-primary border-t-transparent rounded-full spin mx-auto"></div></td></tr>
            </tbody>
          </table>
        </div>

        <!-- Call to action ou pagination na base -->
        <div id="team-pagination" class="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between rounded-b-xl shrink-0 text-xs text-slate-500">
        </div>
      </div>
    </div>
  `;

  // Define função global de busca 
  window._viewSearch = (q) => { 
    state.search = q;
    state.meta.page = 1;
    loadTeamData(container); 
  };

  await loadTeamData(container);

  // Expõe helpers globais se precisar interagir com modais
  window.changeMemberRole = async (userId, userName, currentRole) => {
    if (state.currentUserProfile?.role !== 'admin') {
      return showToast('Apenas administradores podem alterar perfis', 'error');
    }
    const html = `
      <select id="new-role-select" class="w-full px-3 py-2 border rounded text-sm mb-4">
        <option value="admin" ${currentRole === 'admin' ? 'selected' : ''}>Administrador</option>
        <option value="academico" ${currentRole === 'academico' ? 'selected' : ''}>Acadêmico</option>
        <option value="aluno" ${currentRole === 'aluno' ? 'selected' : ''}>Aluno</option>
      </select>
    `;
    showConfirmModal('Alterar Papel', `Selecione o novo papel para <b>${userName}</b>:<br><br>${html}`, async () => {
      const select = document.getElementById('new-role-select');
      if(select && select.value !== currentRole) {
         try {
           await changeRole(userId, select.value);
           showToast('Papel atualizado com sucesso!', 'success');
           loadTeamData(container);
         } catch(e) { showToast(e.message, 'error'); }
      }
    });
  };

  window.deleteMemberRequest = (userId, userName) => {
    if (state.currentUserProfile?.role !== 'admin') {
      return showToast('Apenas administradores podem remover membros', 'error');
    }
    showConfirmModal('Atenção', `Tem certeza de que deseja banir/deletar <b>${userName}</b> e limpar os dados de sua conta? Essa ação é perigosa.`, async () => {
      try {
        await removeMember(userId);
        showToast('Membro removido permanentemente.', 'success');
        loadTeamData(container);
      } catch (e) {
        showToast(e.message, 'error');
      }
    }, 'Deletar Permanentemente', true);
  };

  window.openCreateMemberModal = () => {
    if (state.currentUserProfile?.role !== 'admin') {
      return showToast('Apenas administradores podem adicionar membros', 'error');
    }
    const html = `
      <form id="create-member-form" class="space-y-4">
        <div>
          <label class="block text-xs font-semibold text-slate-600 mb-1">Nome Completo <span class="text-rose-500">*</span></label>
          <input type="text" id="cm-name" required class="w-full px-3 py-2 border rounded-lg text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-primary/20 outline-none transition-all">
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-600 mb-1">Email <span class="text-rose-500">*</span></label>
          <input type="email" id="cm-email" required class="w-full px-3 py-2 border rounded-lg text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-primary/20 outline-none transition-all">
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-600 mb-1">Senha Provisória <span class="text-rose-500">*</span></label>
          <input type="password" id="cm-password" required minlength="6" class="w-full px-3 py-2 border rounded-lg text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-primary/20 outline-none transition-all">
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-600 mb-1">Papel / Perfil <span class="text-rose-500">*</span></label>
          <select id="cm-role" required class="w-full px-3 py-2 border rounded-lg text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-primary/20 outline-none transition-all">
            <option value="academico">Acadêmico (Redator/Revisor)</option>
            <option value="admin">Administrador</option>
          </select>
        </div>
        <p class="text-xs text-slate-500 mt-2">Dica: Alunos são criados automaticamente via checkout ou no menu Alunos.</p>
      </form>
    `;
    const footerHtml = `
      <button onclick="closeModal()" class="px-5 py-2 text-sm font-semibold border rounded-xl hover:bg-slate-50 text-slate-600">Cancelar</button>
      <button onclick="submitCreateMember()" class="px-5 py-2 text-sm font-semibold bg-primary text-white rounded-xl shadow-lg shadow-primary/20 hover:bg-blue-600 flex items-center gap-2">
        <span class="material-symbols-outlined text-lg">save</span> Criar
      </button>
    `;
    window.openModal('Adicionar Novo Membro', html, footerHtml);
  };

  window.submitCreateMember = async () => {
    const form = document.getElementById('create-member-form');
    if (!form.reportValidity()) return;
    
    const name = document.getElementById('cm-name').value;
    const email = document.getElementById('cm-email').value;
    const password = document.getElementById('cm-password').value;
    const role = document.getElementById('cm-role').value;
    
    // Mostra loading no botão
    const submitBtn = document.querySelector('button[onclick="submitCreateMember()"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full spin"></div> Criando...';
    submitBtn.disabled = true;

    try {
      await addMember({ name, email, password, role });
      showToast('Novo membro adicionado com sucesso!', 'success');
      window.closeModal();
      loadTeamData(container);
    } catch(err) {
      showToast(err.message, 'error');
      submitBtn.innerHTML = originalText;
      submitBtn.disabled = false;
    }
  };
}


async function loadTeamData(container) {
  try {
    const authUser = await getUser();
    // Identificar a role atual do user para habilitar ações
    // (A fetchTeam já requer JWT, mas podemos validar o UI tb)
    
    const data = await fetchTeam({ search: state.search, page: state.meta.page, limit: state.meta.limit });
    state.members = data.data;
    state.meta = data.meta;
    
    // Obter o profile atual do response (já que estamos listando todos)
    state.currentUserProfile = state.members.find(m => m.id === authUser.id);
    
    // Fallback: se a pagina é grande e ele nao ta na pag 1, listamos do banco!
    if (!state.currentUserProfile && authUser) {
        state.currentUserProfile = await getProfile(authUser.id);
    }

    renderTable(container);
    renderStats(container);
  } catch (error) {
    console.error(error);
    container.querySelector('#team-table-body').innerHTML = `<tr><td colspan="5" class="py-12 text-center text-rose-500">Erro: ${error.message}</td></tr>`;
  }
}

function renderStats(container) {
  const st = document.getElementById('team-stats-container');
  if(!st) return;
  const adminCount = state.members.filter(m => m.role === 'admin').length;
  const acadCount = state.members.filter(m => m.role === 'academico').length;
  
  st.innerHTML = `
    <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
      <div class="p-3 bg-blue-100 text-blue-600 rounded-lg">
        <span class="material-symbols-outlined">groups</span>
      </div>
      <div>
        <p class="text-sm font-medium text-slate-500">Total Equipe na Página</p>
        <p class="text-2xl font-bold">${state.members.length}</p>
      </div>
    </div>
    <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
      <div class="p-3 bg-emerald-100 text-emerald-600 rounded-lg">
        <span class="material-symbols-outlined">shield_person</span>
      </div>
      <div>
        <p class="text-sm font-medium text-slate-500">Administradores</p>
        <p class="text-2xl font-bold">${adminCount}</p>
      </div>
    </div>
    <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
      <div class="p-3 bg-amber-100 text-amber-600 rounded-lg">
        <span class="material-symbols-outlined">edit_note</span>
      </div>
      <div>
        <p class="text-sm font-medium text-slate-500">Equipe Acadêmica</p>
        <p class="text-2xl font-bold">${acadCount}</p>
      </div>
    </div>
  `;
}

function renderTable(container) {
  const tbody = document.getElementById('team-table-body');
  const isAdmin = state.currentUserProfile?.role === 'admin';

  if (!state.members.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="py-12 text-center text-slate-500">Nenhum membro encontrado.</td></tr>`;
    return;
  }

  tbody.innerHTML = state.members.map(member => {
    const name = member.full_name || 'Usuário Não Nomeado';
    // Se o email não estiver no profile, precisaria da auth table. Usualmente deixamos NULL no frontend p/ segurança
    // O Supabase oculta email dos outros (ou vc o expõe via RPC no backend, se for req). 
    // Para simplificar, vou mostrar "Membro Registrado" onde o email falta
    const emailStr = member.email || '— Mantenido Privado —';
    const init = getInitials(name);
    
    const roleMap = ROLE_MAP[member.role] || ROLE_MAP['aluno'];
    const worksText = member.activeWorks > 0 ? `<b class="text-slate-900">${member.activeWorks}</b> trab.` : `<span class="text-slate-400">0</span>`;

    // Only Admin can edit/delete roles other than their own, except superadmins
    const canEdit = isAdmin && member.id !== state.currentUserProfile?.id;

    return `
      <tr class="hover:bg-slate-50 transition-colors group">
        <td class="px-6 py-4">
          <div class="flex items-center gap-3">
             <div class="w-10 h-10 rounded-full flex shrink-0 items-center justify-center font-bold text-sm bg-slate-100 text-slate-600">
               ${init}
             </div>
             <div class="min-w-0">
               <p class="font-semibold text-sm text-slate-900 truncate">${name}</p>
               <p class="text-xs text-slate-500 truncate mt-0.5">Membro ID: ...${member.id.substring( member.id.length - 6 )}</p>
             </div>
          </div>
        </td>
        <td class="px-6 py-4">
          <span class="px-2.5 py-1 ${roleMap.color} text-[11px] font-bold rounded-full uppercase tracking-tight whitespace-nowrap">
            ${roleMap.label}
          </span>
        </td>
        <td class="px-6 py-4 text-center text-sm font-medium">
          ${worksText}
        </td>
        <td class="px-6 py-4 text-center">
          <div class="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full whitespace-nowrap">
            <span class="w-1.5 h-1.5 bg-emerald-600 rounded-full"></span> Ativo no Supabase
          </div>
        </td>
        <td class="px-6 py-4 text-right">
          ${canEdit ? `
             <div class="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
               <button onclick="changeMemberRole('${member.id}', '${name}', '${member.role}')" class="p-1.5 text-slate-400 hover:text-primary transition-colors hover:bg-slate-100 rounded-lg" title="Mudar Papel">
                 <span class="material-symbols-outlined text-lg">admin_panel_settings</span>
               </button>
               <button onclick="deleteMemberRequest('${member.id}', '${name}')" class="p-1.5 text-slate-400 hover:text-rose-500 transition-colors hover:bg-rose-50 rounded-lg" title="Excluir Perfil">
                 <span class="material-symbols-outlined text-lg">delete</span>
               </button>
             </div>
          ` : `
            <span class="text-xs text-slate-400 font-medium px-2 py-1 bg-slate-50 rounded truncate max-w-[80px] inline-block">Limitado</span>
          `}
        </td>
      </tr>
    `;
  }).join('');
}
