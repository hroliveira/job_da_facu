// ============================================================
// settings.js — View de Perfil / Configurações
// ============================================================
import { getUser, updateProfile, updatePassword, signOut } from '../services/authService.js';
import { getDashboardMetrics } from '../services/dashboardService.js';
import { formatMoney } from '../utils/uiHelpers.js';
import { getInitials } from '../utils/uiHelpers.js';

export async function renderSettings(container) {
  container.innerHTML = `
    <div class="p-8 space-y-8 max-w-3xl mx-auto">
      <div>
        <h2 class="text-2xl font-bold tracking-tight">Perfil & Configurações</h2>
        <p class="text-slate-500">Gerencie seus dados pessoais e preferências.</p>
      </div>
      <div id="settings-content" class="flex items-center justify-center py-16">
        <div class="w-8 h-8 border-2 border-primary border-t-transparent rounded-full spin"></div>
      </div>
    </div>`;

  window._viewSearch = () => {};

  try {
    const [user, metrics] = await Promise.all([getUser(), getDashboardMetrics()]);
    renderContent(user, metrics, container.querySelector('#settings-content'));
  } catch(e) {
    container.querySelector('#settings-content').innerHTML = `<p class="text-rose-500">Erro: ${e.message}</p>`;
  }
}

function renderContent(user, metrics, el) {
  // Reset the loading flex container so children can stack properly
  el.className = 'w-full animate-fade-in block';

  const name  = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuário';
  const email = user?.email || '';
  const initials = getInitials(name);

  const rolesMap = {
    'admin': 'Administrador',
    'academico': 'Acadêmico',
    'aluno': 'Aluno'
  };
  const roleName = rolesMap[user?.user_metadata?.role] || 'Aluno'; // Padrão

  el.innerHTML = `
    <!-- Profile Card -->
    <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 flex flex-col md:flex-row md:items-center gap-8 mb-8">
      <div class="size-24 shrink-0 rounded-2xl bg-primary/10 text-primary flex items-center justify-center text-4xl font-black">
        ${initials}
      </div>
      <div class="flex-1 min-w-0">
        <h3 class="font-bold text-2xl text-slate-900 mb-1 break-words">${name}</h3>
        <p class="text-slate-500 text-base break-words">${email}</p>
        <div class="flex flex-wrap items-center gap-2 mt-3">
          <span class="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-primary bg-primary/10 px-3 py-1.5 rounded-full">
            <span class="material-symbols-outlined text-[14px]">shield_person</span>${roleName}
          </span>
          <span class="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full">
            <span class="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-pulse"></span>Conta Ativada
          </span>
        </div>
      </div>
    </div>

    <!-- Stats summary -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
      ${[
        { label: 'Alunos',    value: metrics.total_students },
        { label: 'Trabalhos', value: metrics.active_works + metrics.delivered_works },
        { label: 'Receita',   value: formatMoney(metrics.total_revenue) },
      ].map(s => `
        <div class="text-center p-4 bg-slate-50 rounded-xl">
          <p class="text-2xl font-black text-primary">${s.value}</p>
          <p class="text-xs text-slate-500 font-medium mt-1">${s.label}</p>
        </div>`).join('')}
    </div>

    <!-- Edit Blocks Stack -->
    <div class="space-y-8 mb-8">
      <!-- Edit profile section -->
      <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 flex flex-col">
        <h4 class="font-semibold text-slate-700 mb-4">Editar Perfil</h4>
        <form id="profile-form" onsubmit="saveProfileName(event)" class="space-y-4 flex flex-col">
          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1.5">Nome Completo</label>
            <input id="pf-name" type="text" value="${name}"
              class="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all"/>
          </div>
          <div id="pf-name-msg" class="hidden text-xs px-3 py-2 rounded-lg mt-2"></div>
          <div>
             <button type="submit"
               class="bg-primary hover:bg-blue-600 text-white font-semibold text-sm px-5 py-2 rounded-xl transition-all shadow-lg shadow-primary/20">
               Salvar Nome
             </button>
          </div>
        </form>
      </div>

      <!-- Change Password -->
      <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 flex flex-col">
        <h4 class="font-semibold text-slate-700 mb-4">Alterar Senha</h4>
        <form id="pw-form" onsubmit="savePassword(event)" class="space-y-4 flex flex-col">
          <div class="space-y-4">
            <div>
              <label class="block text-xs font-semibold text-slate-600 mb-1.5">Nova Senha</label>
              <input id="pw-new" type="password" minlength="6"
                class="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all"
                placeholder="mínimo 6 caracteres"/>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-600 mb-1.5">Confirmar Senha</label>
              <input id="pw-confirm" type="password" minlength="6"
                class="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all"
                placeholder="repita a nova senha"/>
            </div>
          </div>
          <div id="pw-msg" class="hidden text-xs px-3 py-2 rounded-lg mt-2"></div>
          <div>
             <button type="submit"
               class="bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm px-5 py-2 rounded-xl transition-all">
               Alterar Senha
             </button>
          </div>
        </form>
      </div>
    </div>

    <div class="space-y-8">
      <!-- Danger zone -->
      <div class="bg-white rounded-2xl border border-rose-200 shadow-sm p-8">
        <h4 class="font-semibold text-rose-600 mb-2">Zona de Perigo</h4>
        <p class="text-sm text-slate-500 mb-4">Encerre sua sessão em todos os dispositivos.</p>
        <button onclick="handleLogout()"
          class="flex items-center gap-2 bg-rose-50 hover:bg-rose-100 text-rose-600 font-semibold text-sm px-5 py-2 rounded-xl transition-colors border border-rose-200">
          <span class="material-symbols-outlined text-lg">logout</span>Sair da Conta
        </button>
      </div>
    </div>`;

  window.saveProfileName = async (e) => {
    e.preventDefault();
    const msgEl = document.getElementById('pf-name-msg');
    const name  = document.getElementById('pf-name').value.trim();
    if (!name) return;
    try {
      await updateProfile({ full_name: name });
      msgEl.textContent = 'Nome atualizado com sucesso!';
      msgEl.className = 'text-xs px-3 py-2 rounded-lg text-emerald-600 bg-emerald-50';
      msgEl.classList.remove('hidden');
      // Update sidebar
      document.getElementById('sidebar-name').textContent = name;
      document.getElementById('sidebar-avatar').textContent = getInitials(name);
    } catch(err) {
      msgEl.textContent = err.message;
      msgEl.className = 'text-xs px-3 py-2 rounded-lg text-rose-600 bg-rose-50';
      msgEl.classList.remove('hidden');
    }
    setTimeout(() => msgEl.classList.add('hidden'), 3000);
  };

  window.savePassword = async (e) => {
    e.preventDefault();
    const msgEl = document.getElementById('pw-msg');
    const pw1 = document.getElementById('pw-new').value;
    const pw2 = document.getElementById('pw-confirm').value;
    if (pw1 !== pw2) {
      msgEl.textContent = 'As senhas não coincidem.';
      msgEl.className = 'text-xs px-3 py-2 rounded-lg text-rose-600 bg-rose-50';
      msgEl.classList.remove('hidden'); return;
    }
    try {
      await updatePassword(pw1);
      msgEl.textContent = 'Senha alterada com sucesso!';
      msgEl.className = 'text-xs px-3 py-2 rounded-lg text-emerald-600 bg-emerald-50';
      msgEl.classList.remove('hidden');
      document.getElementById('pw-form').reset();
    } catch(err) {
      msgEl.textContent = err.message;
      msgEl.className = 'text-xs px-3 py-2 rounded-lg text-rose-600 bg-rose-50';
      msgEl.classList.remove('hidden');
    }
    setTimeout(() => msgEl.classList.add('hidden'), 3000);
  };
}
