
import { getSession, getUser, signOut } from './src/services/authService.js';
import { renderDashboard } from './src/views/dashboard.js';
import { renderStudents } from './src/views/students.js';
import { renderWorks } from './src/views/works.js';
import { renderFinance } from './src/views/finance.js';
import { renderSettings } from './src/views/settings.js';
import { renderTeam } from './src/views/team.js';

import * as uiHelpers from './src/utils/uiHelpers.js';
import { getDeadlines } from './src/services/workService.js';

let currentRole = 'aluno'; // Mapeamento basico do perfil

// ── View Registry ───────────────────────────────────
const views = {
  dashboard: renderDashboard,
  students:  renderStudents,
  works:     renderWorks,
  finance:   renderFinance,
  team:      renderTeam,
  settings:  renderSettings,
};

// ── Router ───────────────────────────────────────────
window.navigate = async function(page) {
  const container = document.getElementById('view-container');
  container.innerHTML = `<div class="flex items-center justify-center h-64">
    <div class="w-8 h-8 border-2 border-primary border-t-transparent rounded-full spin"></div>
  </div>`;

  // Update sidebar active state
  document.querySelectorAll('.sidebar-link').forEach(el => el.classList.remove('active'));
  const navEl = document.getElementById(`nav-${page}`);
  if (navEl) navEl.classList.add('active');

  // Update hash without scroll
  window.history.replaceState(null, '', `#${page}`);

  try {
    const renderer = views[page] || views.dashboard;
    await renderer(container);
  } catch(e) {
    console.error(e);
    container.innerHTML = `<div class="flex items-center justify-center h-64 text-rose-500">
      <div class="text-center"><span class="material-symbols-outlined text-4xl">error</span>
      <p class="mt-2">${e.message}</p></div>
    </div>`;
  }
};

// ── Logout ───────────────────────────────────────────
window.handleLogout = async function() {
  try {
    await signOut();
    window.location.href = './index.html';
  } catch(e) {
    showToast('Erro ao sair: ' + e.message, 'error');
  }
};

// Auth Guard
(async () => {
  try {
    const session = await getSession();
    if (!session) {
      window.location.href = './index.html';
      return;
    }

    const user = await getUser();
    currentRole = user?.user_metadata?.role || 'aluno';

    // Aplicar regras de UI de acordo com a Role
    aplicarPermissoesDeRole();

    // Set user info no sidebar
    const name = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
    document.getElementById('sidebar-name').textContent = name;
    document.getElementById('sidebar-email').textContent = user?.email || '';
    document.getElementById('sidebar-avatar').textContent = uiHelpers.getInitials(name);

    // Load initial route
    navigate(window.location.hash.slice(1) || 'dashboard');
  } catch (err) {
    console.error("Auth Guard falhou. Redirecionando para login:", err);
    // Limpar o storage possivelmente corrompido ou token invalido do supabase
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = './index.html';
  }
})();

function aplicarPermissoesDeRole() {
  // Se não for admin, oculta equipe
  if (currentRole !== 'admin') {
    document.getElementById('nav-team').style.display = 'none';
  }
  // Se for aluno, oculta financeiro e dashboard completo (ou limita o view internamente)
  if (currentRole === 'aluno') {
    document.getElementById('nav-finance').style.display = 'none';
  }
}

// ── Deadline badge ──────────────────────────────────
async function checkDeadlines() {
  try {
    const deadlines = await getDeadlines(7);
    const overdue = deadlines.filter(w => w.delivery_date < new Date().toISOString().slice(0,10));
    const badge = document.getElementById('deadline-badge');
    if (deadlines.length > 0) badge.classList.remove('hidden');
    else badge.classList.add('hidden');
  } catch(e) {}
}
checkDeadlines();

// ── Global search ────────────────────────────────────
let searchTimeout;
document.getElementById('global-search').addEventListener('input', (e) => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    const q = e.target.value.trim();
    if (q.length >= 2) {
      const hash = window.location.hash.replace('#', '') || 'dashboard';
      if (window._viewSearch) window._viewSearch(q);
    } else if (q === '') {
      if (window._viewSearch) window._viewSearch('');
    }
  }, 300);
});

// ── Modal helpers (global) ───────────────────────────
window.openModal = function(title, bodyHTML, footerHTML = '') {
  document.getElementById('modal-title').innerHTML = title;
  document.getElementById('modal-body').innerHTML = bodyHTML;
  const footer = document.getElementById('modal-footer');
  if (footerHTML) {
    footer.innerHTML = footerHTML;
    footer.classList.remove('hidden');
  } else {
    footer.innerHTML = '';
    footer.classList.add('hidden');
  }
  document.getElementById('modal-overlay').classList.remove('hidden');
};

window.closeModal = function() {
  document.getElementById('modal-overlay').classList.add('hidden');
};

document.getElementById('modal-overlay').addEventListener('click', (e) => {
  if (e.target === document.getElementById('modal-overlay')) closeModal();
});

// ── Toast helper (global) ────────────────────────────
window.showToast = function(message, type = 'success') {
  const colors = { success: 'bg-emerald-600', error: 'bg-rose-600', info: 'bg-blue-600', warning: 'bg-amber-500' };
  const icons  = { success: 'check_circle', error: 'error', info: 'info', warning: 'warning' };
  const toast = document.getElementById('toast');
  toast.className = `fixed bottom-6 right-6 z-[9999] ${colors[type]||colors.info} text-white px-5 py-3 rounded-xl shadow-2xl text-sm font-semibold flex items-center gap-3`;
  toast.innerHTML = `<span class="material-symbols-outlined text-lg">${icons[type]||'info'}</span>${message}`;
  toast.classList.remove('hidden');
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => toast.classList.add('hidden'), 3500);
};

// ── Init: navigate to hash or dashboard (já efetuado pelo auth guard se bem sucedido)
// Removida chamada redundante aqui que corria junto com o guard e travava a UI se desse race condition.

