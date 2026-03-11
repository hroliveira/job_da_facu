// ============================================================
// works.js — View Kanban de Trabalhos
// ============================================================
import { listWorksForKanban, createWork, updateWork, updateWorkStatus, deleteWork } from '../services/workService.js';
import { listStudentsAll } from '../services/studentService.js';
import { createPayment } from '../services/paymentService.js';
import { getKanbanColumns, getStatusBadgeHTML } from '../utils/statusHelpers.js';
import { formatDate, getDeadlineLabel, getDeadlineColor } from '../utils/dateHelpers.js';
import { formatMoney, loadingHTML, emptyHTML, inputClass, labelHTML, avatarHTML } from '../utils/uiHelpers.js';

let currentSearch = '';

export async function renderWorks(container) {
  container.innerHTML = `
    <div class="flex flex-col h-full">
      <div class="px-8 py-4 border-b border-slate-200 bg-white flex items-center justify-between shrink-0">
        <div class="flex items-center gap-3">
          <h2 class="text-lg font-bold">Quadro Kanban</h2>
          <div class="h-4 w-px bg-slate-200"></div>
          <span class="text-sm text-slate-500">Gerenciamento de Trabalhos</span>
        </div>
        <div class="flex items-center gap-2">
          <div class="relative">
            <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
            <input id="works-search" type="text" placeholder="Buscar..." value="${currentSearch}"
              class="pl-10 pr-4 py-1.5 bg-slate-100 border-none rounded-lg text-sm focus:ring-2 focus:ring-primary w-52 outline-none"/>
          </div>
          <button onclick="openWorkModal()" class="bg-primary text-white px-4 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-2 shadow-lg shadow-primary/20 hover:bg-blue-600 transition-all">
            <span class="material-symbols-outlined text-lg">add</span>Novo Trabalho
          </button>
        </div>
      </div>
      <div id="kanban-board" class="flex-1 overflow-x-auto p-8">
        ${loadingHTML('Carregando trabalhos...')}
      </div>
    </div>`;

  window._viewSearch = (q) => {
    currentSearch = q;
    document.getElementById('works-search').value = q;
    loadKanban();
  };
  window.openWorkModal   = (id) => openWorkForm(id);
  window.deleteWorkAction = confirmDeleteWork;
  window.changeStatus     = changeWorkStatus;

  document.getElementById('works-search').addEventListener('input', (e) => {
    clearTimeout(window._wSearch);
    window._wSearch = setTimeout(() => { currentSearch = e.target.value; loadKanban(); }, 400);
  });

  await loadKanban();
}

async function loadKanban() {
  const board = document.getElementById('kanban-board');
  if (!board) return;
  try {
    const grouped = await listWorksForKanban(currentSearch);
    renderKanban(grouped, board);
  } catch(e) {
    board.innerHTML = `<p class="text-rose-500 p-4">Erro: ${e.message}</p>`;
  }
}

function renderKanban(grouped, board) {
  const cols = getKanbanColumns();
  const total = Object.values(grouped).flat().length;

  if (total === 0 && !currentSearch) {
    board.innerHTML = emptyHTML('Nenhum trabalho criado', 'Clique em "Novo Trabalho" para começar.', 'menu_book');
    return;
  }

  board.innerHTML = `<div class="flex gap-5 h-full min-w-max items-start">${cols.map(col => {
    const works = grouped[col.status] || [];
    const cards = works.map(w => renderCard(w)).join('');
    return `
      <div class="w-76 flex flex-col gap-3 min-w-[300px]">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="size-2 rounded-full ${col.dotColor}"></span>
            <h3 class="font-bold text-sm text-slate-700">${col.label}</h3>
            <span class="text-[10px] px-2 py-0.5 rounded-full font-bold ${col.badgeClass}">${works.length}</span>
          </div>
        </div>
        <div class="flex flex-col gap-3 overflow-y-auto kanban-col h-full min-h-[150px] p-1 rounded-xl transition-colors" 
             data-status="${col.status}"
             ondragover="allowDrop(event)" 
             ondragleave="dragLeave(event)"
             ondrop="drop(event, '${col.status}')">
          ${cards || `<div class="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center text-slate-400 text-xs pointer-events-none">Nenhum item</div>`}
        </div>
      </div>`;
  }).join('')}</div>`;

  window.allowDrop = (ev) => {
    ev.preventDefault();
    const col = ev.target.closest('.kanban-col');
    if (col) col.classList.add('bg-slate-50', 'ring-2', 'ring-primary/20');
  };

  window.dragLeave = (ev) => {
    const col = ev.target.closest('.kanban-col');
    if (col) col.classList.remove('bg-slate-50', 'ring-2', 'ring-primary/20');
  };

  window.drop = (ev, newStatus) => {
    ev.preventDefault();
    const col = ev.target.closest('.kanban-col');
    if (col) col.classList.remove('bg-slate-50', 'ring-2', 'ring-primary/20');
    
    const workId = ev.dataTransfer.getData("text/plain");
    const draggedCard = document.getElementById(`card-${workId}`);
    
    if (draggedCard) {
       const oldStatus = draggedCard.getAttribute('data-status');
       if (oldStatus !== newStatus) {
         changeWorkStatus(workId, newStatus);
       }
    }
  };
  
  window.dragStart = (ev, id, status) => {
    ev.dataTransfer.setData("text/plain", id);
    ev.dataTransfer.effectAllowed = "move";
    ev.target.classList.add('opacity-50');
  };

  window.dragEnd = (ev) => {
    ev.target.classList.remove('opacity-50');
  };
}

function renderCard(w) {
  const student = w.students?.name || 'Sem aluno';
  const subjColors = ['bg-blue-50 text-blue-600','bg-purple-50 text-purple-600','bg-green-50 text-green-600',
    'bg-orange-50 text-orange-600','bg-pink-50 text-pink-600'];
  const color = subjColors[(w.subject||'').charCodeAt(0) % subjColors.length];
  const dColor = getDeadlineColor(w.delivery_date);
  const deadlineMap = { rose:'text-rose-500', amber:'text-amber-600', emerald:'text-slate-400', slate:'text-slate-400' };
  const totalPaid = (w.payments || []).filter(p => p.status === 'paid').reduce((sum, p) => sum + Number(p.amount), 0);
  const remaining = Math.max(0, (w.price || 0) - totalPaid);
  const isFullyPaid = w.price > 0 && totalPaid >= w.price;
  const isPartiallyPaid = totalPaid > 0 && totalPaid < w.price;

  return `
    <div id="card-${w.id}" data-status="${w.status}"
         draggable="true" 
         ondragstart="dragStart(event, '${w.id}', '${w.status}')" 
         ondragend="dragEnd(event)"
         class="bg-white p-4 rounded-xl shadow-sm border border-slate-200 hover:shadow-md hover:border-primary/30 transition-all group cursor-grab active:cursor-grabbing">
      <div class="flex justify-between items-start mb-3">
        <span class="text-[10px] px-2 py-1 rounded font-bold uppercase tracking-tight ${color}">${w.subject || 'Geral'}</span>
        <span class="text-primary font-bold text-xs">${formatMoney(w.price)}</span>
      </div>
      <h4 class="text-sm font-bold text-slate-900 mb-1 group-hover:text-primary transition-colors line-clamp-1">${w.title}</h4>
      <p class="text-xs text-slate-500 mb-3">Aluno: ${student}</p>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-1.5 ${deadlineMap[dColor]||deadlineMap.slate}">
          <span class="material-symbols-outlined text-sm">${w.delivery_date ? 'calendar_today' : 'event_busy'}</span>
          <span class="text-[10px] font-medium">${w.delivery_date ? getDeadlineLabel(w.delivery_date) : '—'}</span>
        </div>
        <div class="flex items-center gap-1">
          ${!isFullyPaid && w.price > 0 ? `
          <button onclick="openPaymentModalFromCard('${w.id}', ${w.price}, ${remaining})" class="p-1.5 text-slate-400 hover:text-emerald-500 rounded-lg hover:bg-emerald-50 transition-colors" title="Registrar Pagamento">
            <span class="material-symbols-outlined text-base">payments</span>
          </button>` : ''}
          <button onclick="openWorkModal('${w.id}')" class="p-1.5 text-slate-400 hover:text-primary rounded-lg hover:bg-primary/5 transition-colors">
            <span class="material-symbols-outlined text-base">edit</span>
          </button>
          <div class="relative" id="dd-${w.id}">
            <button onclick="toggleStatusMenu('${w.id}')" class="p-1.5 text-slate-400 hover:text-primary rounded-lg hover:bg-primary/5 transition-colors">
              <span class="material-symbols-outlined text-base">swap_horiz</span>
            </button>
            <div id="menu-${w.id}" class="hidden absolute right-0 bottom-8 bg-white rounded-xl shadow-xl border border-slate-200 p-1 z-50 min-w-[140px]">
              ${getKanbanColumns().filter(c => c.status !== w.status).map(c =>
                `<button onclick="changeStatus('${w.id}','${c.status}')" class="w-full text-left px-3 py-2 text-xs font-medium hover:bg-slate-50 rounded-lg flex items-center gap-2">
                  <span class="size-2 rounded-full ${c.dotColor}"></span>${c.label}
                </button>`
              ).join('')}
              <div class="border-t border-slate-100 mt-1 pt-1">
                <button onclick="deleteWorkAction('${w.id}','${w.title.replace(/'/g,"\\'")}')" class="w-full text-left px-3 py-2 text-xs font-medium text-rose-500 hover:bg-rose-50 rounded-lg flex items-center gap-2">
                  <span class="material-symbols-outlined text-sm">delete</span>Excluir
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="mt-3 border-t border-slate-50/50 pt-2 flex flex-col gap-1">
        ${isFullyPaid ? '<div class="text-[10px] font-bold text-emerald-600 flex items-center gap-1"><span class="material-symbols-outlined text-sm">check_circle</span>Totalmente Pago</div>' : ''}
        ${isPartiallyPaid ? `<div class="text-[10px] font-bold text-amber-500 flex items-center gap-1"><span class="material-symbols-outlined text-sm">error</span>Pago: ${formatMoney(totalPaid)} / Falta: ${formatMoney(remaining)}</div>` : ''}
        ${!isFullyPaid && w.price > 0 && totalPaid === 0 ? `<div class="text-[10px] font-bold text-rose-500 flex items-center gap-1"><span class="material-symbols-outlined text-sm">warning</span>Pendente de Pagamento</div>` : ''}
      </div>
    </div>`;
}

window.toggleStatusMenu = function(id) {
  const menu = document.getElementById(`menu-${id}`);
  document.querySelectorAll('[id^="menu-"]').forEach(m => { if (m.id !== `menu-${id}`) m.classList.add('hidden'); });
  menu.classList.toggle('hidden');
  // close on outside click
  setTimeout(() => {
    const handler = (e) => { if (!e.target.closest(`#dd-${id}`)) { menu.classList.add('hidden'); document.removeEventListener('click', handler); } };
    document.addEventListener('click', handler);
  }, 0);
};

async function changeWorkStatus(id, status) {
  try {
    await updateWorkStatus(id, status);
    showToast('Status atualizado!', 'success');
    loadKanban();
  } catch(e) {
    showToast(e.message, 'error');
  }
}

window.openPaymentModalFromCard = (workId, workPrice, remaining) => {
  const body = `
    <div class="space-y-4">
      <div class="bg-blue-50/50 border border-blue-100 text-blue-800 p-4 rounded-xl text-sm mb-4">
        <p class="mb-1">Valor do Trabalho: <strong>${formatMoney(workPrice)}</strong></p>
        <p class="text-amber-600">Restante a Pagar: <strong>${formatMoney(remaining)}</strong></p>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div>${labelHTML('Valor a Pagar (R$)', true)}<input id="pfc-amount" type="number" min="0" step="0.01" max="${remaining}" class="${inputClass()}" value="${remaining.toFixed(2)}"/></div>
        <div>${labelHTML('Método')}<select id="pfc-method" class="${inputClass()}">
          <option value="pix">PIX</option><option value="transferencia">Transferência</option>
          <option value="dinheiro">Dinheiro</option><option value="cartao">Cartão</option>
        </select></div>
        <div class="col-span-2">${labelHTML('Data do Pagamento')}<input id="pfc-date" type="date" class="${inputClass()}" value="${new Date().toISOString().slice(0, 10)}"/></div>
      </div>
      <div id="pfc-error" class="hidden text-xs text-rose-600 bg-rose-50 px-3 py-2 rounded-lg"></div>
    </div>`;

  const footer = `
    <button onclick="closeModal()" class="border border-slate-200 text-slate-600 font-semibold text-sm px-5 py-2 rounded-xl hover:bg-slate-50 transition-colors">Cancelar</button>
    <button id="pfc-save" onclick="saveCardPayment('${workId}', ${workPrice}, ${remaining})" class="bg-primary hover:bg-blue-600 text-white font-semibold text-sm px-5 py-2 rounded-xl shadow-lg shadow-primary/20 transition-colors">Registrar Pagamento</button>`;

  openModal('Registrar Pagamento', body, footer);

  window.saveCardPayment = async (wId, wPrice, rem) => {
    const errEl = document.getElementById('pfc-error'); errEl.classList.add('hidden');
    const amount = parseFloat(document.getElementById('pfc-amount').value);
    
    if (!amount || amount <= 0) { errEl.textContent = 'Valor inválido. Insira um valor maior que 0.'; errEl.classList.remove('hidden'); return; }
    
    const btn = document.getElementById('pfc-save'); btn.disabled = true; btn.textContent = 'Aguarde...';
    
    try {
      await createPayment({
        work_id: wId, amount,
        payment_method: document.getElementById('pfc-method').value,
        status: 'paid', // Any payment made here is effectively paid
        payment_date: document.getElementById('pfc-date').value || new Date().toISOString().slice(0, 10),
      });
      closeModal(); showToast('Pagamento registrado!', 'success');
      loadKanban();
    } catch(e) {
      errEl.textContent = e.message; errEl.classList.remove('hidden');
      btn.disabled = false; btn.textContent = 'Registrar Pagamento';
    }
  };
};

async function openWorkForm(id = null) {
  const isEdit = !!id;
  let students = [];
  try { students = await listStudentsAll(); } catch(e) {}

  const studentOptions = students.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
  const typeOptions = ['essay','dissertation','monography','article','presentation','report','other']
    .map(t => `<option value="${t}">${t.charAt(0).toUpperCase()+t.slice(1)}</option>`).join('');

  const body = `
    <div class="space-y-4">
      <div>
        ${labelHTML('Título', true)}
        <input id="wf-title" type="text" class="${inputClass()}" placeholder="Ex: Monografia sobre IA" required/>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div>
          ${labelHTML('Aluno')}
          <select id="wf-student" class="${inputClass()}">
            <option value="">— Selecionar —</option>${studentOptions}
          </select>
        </div>
        <div>
          ${labelHTML('Tipo')}
          <select id="wf-type" class="${inputClass()}">${typeOptions}</select>
        </div>
        <div>
          ${labelHTML('Matéria/Disciplina')}
          <input id="wf-subject" type="text" class="${inputClass()}" placeholder="Ex: Economia"/>
        </div>
        <div>
          ${labelHTML('Data de Entrega')}
          <input id="wf-date" type="date" class="${inputClass()}"/>
        </div>
        <div>
          ${labelHTML('Valor (R$)')}
          <input id="wf-price" type="number" min="0" step="0.01" class="${inputClass()}" placeholder="0.00"/>
        </div>
        <div>
          ${labelHTML('Status')}
          <select id="wf-status" class="${inputClass()}">
            <option value="pending">Pendente</option>
            <option value="in_progress">Em Progresso</option>
            <option value="review">Em Revisão</option>
            <option value="delivered">Entregue</option>
            <option value="cancelled">Cancelado</option>
          </select>
        </div>
      </div>
      <div>
        ${labelHTML('Descrição')}
        <textarea id="wf-desc" rows="3" class="${inputClass()}" placeholder="Detalhes do trabalho..."></textarea>
      </div>
      <div id="wf-error" class="hidden text-xs text-rose-600 bg-rose-50 px-3 py-2 rounded-lg"></div>
    </div>`;

  const footer = `
    <button onclick="closeModal()" class="border border-slate-200 text-slate-600 font-semibold text-sm px-5 py-2 rounded-xl hover:bg-slate-50">Cancelar</button>
    <button id="wf-save" onclick="saveWork('${id||''}')" class="bg-primary hover:bg-blue-600 text-white font-semibold text-sm px-5 py-2 rounded-xl shadow-lg shadow-primary/20">
      ${isEdit ? 'Salvar' : 'Criar Trabalho'}
    </button>`;

  openModal(isEdit ? 'Editar Trabalho' : 'Novo Trabalho', body, footer);

  if (isEdit) {
    const { getWork } = await import('../services/workService.js');
    getWork(id).then(w => {
      if (!w) return;
      document.getElementById('wf-title').value   = w.title    || '';
      document.getElementById('wf-student').value = w.student_id || '';
      document.getElementById('wf-type').value    = w.type     || 'essay';
      document.getElementById('wf-subject').value = w.subject  || '';
      document.getElementById('wf-date').value    = w.delivery_date ? w.delivery_date.slice(0,10) : '';
      document.getElementById('wf-price').value   = w.price    || '';
      document.getElementById('wf-status').value  = w.status   || 'pending';
      document.getElementById('wf-desc').value    = w.description || '';
    }).catch(() => {});
  }

  window.saveWork = async (wid) => {
    const errEl = document.getElementById('wf-error');
    errEl.classList.add('hidden');
    const title = document.getElementById('wf-title').value.trim();
    if (!title) { errEl.textContent = 'Título é obrigatório.'; errEl.classList.remove('hidden'); return; }
    const data = {
      title, student_id: document.getElementById('wf-student').value || null,
      type: document.getElementById('wf-type').value,
      subject: document.getElementById('wf-subject').value.trim(),
      delivery_date: document.getElementById('wf-date').value || null,
      price: parseFloat(document.getElementById('wf-price').value) || 0,
      status: document.getElementById('wf-status').value,
      description: document.getElementById('wf-desc').value.trim(),
    };
    const btn = document.getElementById('wf-save');
    btn.disabled = true; btn.textContent = 'Salvando...';
    try {
      if (wid) await updateWork(wid, data);
      else await createWork(data);
      closeModal();
      showToast(wid ? 'Trabalho atualizado!' : 'Trabalho criado!', 'success');
      loadKanban();
    } catch(e) {
      errEl.textContent = e.message; errEl.classList.remove('hidden');
      btn.disabled = false; btn.textContent = wid ? 'Salvar' : 'Criar Trabalho';
    }
  };
}

async function confirmDeleteWork(id, title) {
  openModal('Excluir Trabalho', `
    <div class="text-center py-4">
      <span class="material-symbols-outlined text-5xl text-rose-400">delete</span>
      <p class="font-semibold text-slate-800 mt-3">Excluir "${title}"?</p>
      <p class="text-sm text-slate-500 mt-1">Pagamentos e arquivos vinculados também serão excluídos.</p>
    </div>`,
    `<button onclick="closeModal()" class="border border-slate-200 text-slate-600 font-semibold text-sm px-5 py-2 rounded-xl hover:bg-slate-50">Cancelar</button>
     <button onclick="doDeleteWork('${id}')" class="bg-rose-500 hover:bg-rose-600 text-white font-semibold text-sm px-5 py-2 rounded-xl">Excluir</button>`
  );
  window.doDeleteWork = async (wid) => {
    try { await deleteWork(wid); closeModal(); showToast('Trabalho excluído.', 'success'); loadKanban(); }
    catch(e) { showToast(e.message, 'error'); }
  };
}
