// ============================================================
// uiHelpers.js — Utilitários de UI / DOM
// ============================================================

/**
 * Exibe um toast de notificação
 */
export function showToast(message, type = 'success') {
  const existingToast = document.getElementById('toast');
  if (existingToast) existingToast.remove();

  const colors = {
    success: 'bg-emerald-600',
    error:   'bg-rose-600',
    info:    'bg-blue-600',
    warning: 'bg-amber-500',
  };

  const toast = document.createElement('div');
  toast.id = 'toast';
  toast.className = `fixed bottom-6 right-6 z-[9999] ${colors[type] || colors.info} text-white px-5 py-3 rounded-xl shadow-2xl text-sm font-semibold flex items-center gap-3 transition-all duration-300 translate-y-2 opacity-0`;

  const icons = { success: 'check_circle', error: 'error', info: 'info', warning: 'warning' };
  toast.innerHTML = `<span class="material-symbols-outlined text-lg">${icons[type] || 'info'}</span>${message}`;

  document.body.appendChild(toast);
  requestAnimationFrame(() => {
    toast.classList.remove('translate-y-2', 'opacity-0');
  });
  setTimeout(() => {
    toast.classList.add('translate-y-2', 'opacity-0');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

/**
 * Abre o modal principal
 */
export function showModal(titleText, bodyHTML, footerHTML = '') {
  let overlay = document.getElementById('modal-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'modal-overlay';
    overlay.className = 'fixed inset-0 z-[9000] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4';
    document.body.appendChild(overlay);
  }

  overlay.innerHTML = `
    <div class="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col" id="modal-box">
      <div class="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
        <h3 class="font-bold text-lg text-slate-900 dark:text-white">${titleText}</h3>
        <button id="modal-close" class="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>
      <div class="p-6 overflow-y-auto flex-1">${bodyHTML}</div>
      ${footerHTML ? `<div class="p-6 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">${footerHTML}</div>` : ''}
    </div>
  `;

  overlay.style.display = 'flex';
  overlay.querySelector('#modal-close').addEventListener('click', hideModal);
  overlay.addEventListener('click', e => { if (e.target === overlay) hideModal(); });
}

/**
 * Exibe um alerta/modal de confirmação (wrapper para showModal)
 */
export function showConfirmModal(title, text, confirmCallback, confirmText = 'Confirmar', isDanger = false) {
  const confirmBtnClass = isDanger 
    ? 'bg-rose-500 hover:bg-rose-600 text-white font-semibold text-sm px-5 py-2 rounded-xl transition-all shadow-lg shadow-rose-500/20'
    : 'bg-primary hover:bg-blue-600 text-white font-semibold text-sm px-5 py-2 rounded-xl transition-all shadow-lg shadow-primary/20';

  const bodyRaw = `<p class="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">${text}</p>`;

  const footerRaw = `
    <button id="confirm-cancel-btn" class="border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-semibold text-sm px-5 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">Cancelar</button>
    <button id="confirm-ok-btn" class="${confirmBtnClass}">${confirmText}</button>
  `;

  showModal(title, bodyRaw, footerRaw);

  const overlay = document.getElementById('modal-overlay');
  if(overlay) {
    const cancelBtn = overlay.querySelector('#confirm-cancel-btn');
    const okBtn = overlay.querySelector('#confirm-ok-btn');
    
    cancelBtn.addEventListener('click', () => { hideModal(); });
    okBtn.addEventListener('click', async () => {
      okBtn.innerHTML = `<span class="material-symbols-outlined animate-spin" style="font-size: 1.2rem;">progress_activity</span>`;
      okBtn.disabled = true;
      try {
        await confirmCallback();
      } catch (e) {
        console.error("Erro na confirmação", e);
      } finally {
        hideModal();
      }
    });
  }
}

/**
 * Fecha o modal
 */
export function hideModal() {
  const overlay = document.getElementById('modal-overlay');
  if (overlay) overlay.style.display = 'none';
}

/**
 * Gera as iniciais de um nome
 */
export function getInitials(name = '') {
  return name.trim().split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';
}

/**
 * Formata valor monetário em R$ ou $
 */
export function formatMoney(value, currency = 'BRL') {
  const num = Number(value) || 0;
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(num);
}

/**
 * Renderiza paginação e retorna o HTML + handler
 */
export function renderPagination(current, total, limit, onPageChange) {
  const totalPages = Math.ceil(total / limit);
  if (totalPages <= 1) return '';

  let pages = '';
  for (let i = 1; i <= totalPages; i++) {
    if (
      i === 1 || i === totalPages ||
      (i >= current - 1 && i <= current + 1)
    ) {
      const active = i === current
        ? 'bg-primary text-white font-bold'
        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium';
      pages += `<button class="px-3 py-1 text-sm rounded-lg ${active}" data-page="${i}">${i}</button>`;
    } else if (i === current - 2 || i === current + 2) {
      pages += `<span class="text-slate-400 px-2">...</span>`;
    }
  }

  const prevDisabled = current === 1 ? 'disabled opacity-50' : '';
  const nextDisabled = current === totalPages ? 'disabled opacity-50' : '';

  const html = `
    <div class="flex items-center gap-1" id="pagination">
      <button class="p-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 ${prevDisabled}" data-page="${current - 1}">
        <span class="material-symbols-outlined text-lg leading-none">chevron_left</span>
      </button>
      ${pages}
      <button class="p-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 ${nextDisabled}" data-page="${current + 1}">
        <span class="material-symbols-outlined text-lg leading-none">chevron_right</span>
      </button>
    </div>
  `;

  // Attach listeners após inserção no DOM
  setTimeout(() => {
    document.querySelectorAll('#pagination button[data-page]').forEach(btn => {
      btn.addEventListener('click', () => {
        const p = parseInt(btn.dataset.page);
        if (!btn.disabled && p >= 1 && p <= totalPages) onPageChange(p);
      });
    });
  }, 0);

  return html;
}

/**
 * Gera avatar colorido com iniciais
 */
export function avatarHTML(name, size = 'size-8', fontSize = 'text-xs') {
  const initials = getInitials(name);
  const colors = ['bg-blue-100 text-blue-600', 'bg-purple-100 text-purple-600',
    'bg-emerald-100 text-emerald-600', 'bg-amber-100 text-amber-600',
    'bg-rose-100 text-rose-600', 'bg-indigo-100 text-indigo-600'];
  const idx = (name.charCodeAt(0) || 0) % colors.length;
  return `<div class="${size} rounded-full ${colors[idx]} flex items-center justify-center font-bold ${fontSize} shrink-0">${initials}</div>`;
}

/**
 * Input padrão da aplicação
 */
export function inputClass() {
  return 'w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all';
}

/**
 * Label padrão
 */
export function labelHTML(text, required = false) {
  return `<label class="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">${text}${required ? ' <span class="text-rose-500">*</span>' : ''}</label>`;
}

/**
 * Botão primário
 */
export function btnPrimary(text, id = '', extraClass = '') {
  return `<button id="${id}" class="bg-primary hover:bg-blue-600 text-white font-semibold text-sm px-5 py-2 rounded-xl transition-all shadow-lg shadow-primary/20 ${extraClass}">${text}</button>`;
}

/**
 * Botão secundário
 */
export function btnSecondary(text, id = '', extraClass = '') {
  return `<button id="${id}" class="border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-semibold text-sm px-5 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all ${extraClass}">${text}</button>`;
}

/**
 * Estado de carregamento para uma área
 */
export function loadingHTML(text = 'Loading...') {
  return `
    <div class="flex items-center justify-center py-16 text-slate-400">
      <div class="flex flex-col items-center gap-3">
        <div class="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p class="text-sm">${text}</p>
      </div>
    </div>
  `;
}

/**
 * Estado vazio
 */
export function emptyHTML(title, subtitle = '', icon = 'inbox') {
  return `
    <div class="flex items-center justify-center py-16 text-slate-400">
      <div class="flex flex-col items-center gap-3 text-center">
        <span class="material-symbols-outlined text-5xl text-slate-300">${icon}</span>
        <p class="font-semibold text-slate-500">${title}</p>
        ${subtitle ? `<p class="text-sm">${subtitle}</p>` : ''}
      </div>
    </div>
  `;
}
