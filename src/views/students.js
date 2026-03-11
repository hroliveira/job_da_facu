// ============================================================
// students.js — View de Gerenciamento de Alunos
// ============================================================
import { listStudents, createStudent, updateStudent, deleteStudent, getStudent } from '../services/studentService.js';
import { avatarHTML, formatMoney, loadingHTML, emptyHTML, renderPagination, inputClass, labelHTML } from '../utils/uiHelpers.js';
import { formatDate } from '../utils/dateHelpers.js';
import { getStatusBadgeHTML } from '../utils/statusHelpers.js';

const PAGE_SIZE = 10;
let currentPage = 1;
let currentSearch = '';

export async function renderStudents(container) {
  container.innerHTML = `
    <div class="p-8 space-y-6 max-w-7xl mx-auto">
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 class="text-3xl font-black tracking-tight">Diretório de Alunos</h2>
          <p class="text-slate-500 mt-1">Gerencie e acompanhe seus alunos.</p>
        </div>
        <button onclick="openStudentModal()" class="bg-primary hover:bg-blue-600 text-white font-semibold text-sm px-5 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-primary/20">
          <span class="material-symbols-outlined text-lg">person_add</span>Adicionar Aluno
        </button>
      </div>
      <div id="students-table-wrapper">${loadingHTML('Carregando alunos...')}</div>
    </div>`;

  window._viewSearch = (q) => { currentSearch = q; currentPage = 1; loadStudents(); };
  window.openStudentModal = (id) => openStudentForm(id);
  window.deleteStudentAction = confirmDeleteStudent;
  window.viewStudentProfile = viewStudent;

  await loadStudents();
}

async function loadStudents() {
  const wrapper = document.getElementById('students-table-wrapper');
  if (!wrapper) return;
  try {
    const { data, count } = await listStudents({ search: currentSearch, page: currentPage, limit: PAGE_SIZE });
    renderTable(data, count, wrapper);
  } catch(e) {
    wrapper.innerHTML = `<p class="text-rose-500 p-4">Erro: ${e.message}</p>`;
  }
}

function renderTable(students, total, wrapper) {
  if (students.length === 0 && !currentSearch) {
    wrapper.innerHTML = emptyHTML('Nenhum aluno cadastrado', 'Clique em "Adicionar Aluno" para começar.', 'school');
    return;
  }

  const rows = students.length === 0
    ? `<tr><td colspan="7" class="px-6 py-12 text-center text-slate-400">Nenhum resultado encontrado.</td></tr>`
    : students.map(s => {
        const wCount = s.works?.length || 0;
        const maxW   = Math.max(wCount, 1);
        const pct    = Math.min(Math.round((wCount / Math.max(total / PAGE_SIZE, 1)) * 100), 100);
        return `<tr class="hover:bg-slate-50 transition-colors">
          <td class="px-6 py-4">
            <div class="flex items-center gap-3">
              ${avatarHTML(s.name, 'size-8', 'text-xs')}
              <span class="text-sm font-medium">${s.name}</span>
            </div>
          </td>
          <td class="px-6 py-4 text-sm text-slate-500">${s.email || '—'}</td>
          <td class="px-6 py-4 text-sm text-slate-500">${s.phone || '—'}</td>
          <td class="px-6 py-4">
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">${s.course || '—'}</span>
          </td>
          <td class="px-6 py-4 text-sm text-slate-500">${s.institution || '—'}</td>
          <td class="px-6 py-4">
            <div class="flex items-center gap-2">
              <div class="w-20 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                <div class="bg-primary h-full rounded-full" style="width:${Math.min(wCount*10,100)}%"></div>
              </div>
              <span class="text-xs font-bold text-slate-700">${wCount}</span>
            </div>
          </td>
          <td class="px-6 py-4 text-right">
            <div class="flex items-center justify-end gap-1 text-slate-400">
              <button onclick="viewStudentProfile('${s.id}')" title="Ver perfil" class="p-1.5 hover:text-primary transition-colors rounded-lg hover:bg-primary/5"><span class="material-symbols-outlined text-xl">visibility</span></button>
              <button onclick="openStudentModal('${s.id}')" title="Editar" class="p-1.5 hover:text-primary transition-colors rounded-lg hover:bg-primary/5"><span class="material-symbols-outlined text-xl">edit</span></button>
              <button onclick="deleteStudentAction('${s.id}','${s.name.replace(/'/g,"\\'")}')" title="Excluir" class="p-1.5 hover:text-rose-500 transition-colors rounded-lg hover:bg-rose-50"><span class="material-symbols-outlined text-xl">delete</span></button>
            </div>
          </td>
        </tr>`;
      }).join('');

  wrapper.innerHTML = `
    <div class="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead><tr class="bg-slate-50 border-b border-slate-200">
            <th class="px-6 py-4 text-sm font-semibold text-slate-700">Nome</th>
            <th class="px-6 py-4 text-sm font-semibold text-slate-700">Email</th>
            <th class="px-6 py-4 text-sm font-semibold text-slate-700">Telefone</th>
            <th class="px-6 py-4 text-sm font-semibold text-slate-700">Curso</th>
            <th class="px-6 py-4 text-sm font-semibold text-slate-700">Instituição</th>
            <th class="px-6 py-4 text-sm font-semibold text-slate-700">Trabalhos</th>
            <th class="px-6 py-4 text-sm font-semibold text-slate-700 text-right">Ações</th>
          </tr></thead>
          <tbody class="divide-y divide-slate-100">${rows}</tbody>
        </table>
      </div>
      <div class="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
        <p class="text-sm text-slate-500">Exibindo ${students.length} de ${total} alunos</p>
        ${renderPagination(currentPage, total, PAGE_SIZE, (p) => { currentPage = p; loadStudents(); })}
      </div>
    </div>`;
}

function openStudentForm(id = null) {
  const isEdit = !!id;
  const body = `
    <div class="space-y-4">
      <div class="grid grid-cols-2 gap-4">
        <div class="col-span-2">
          ${labelHTML('Nome Completo', true)}
          <input id="sf-name" type="text" class="${inputClass()}" placeholder="João da Silva" required/>
        </div>
        <div>
          ${labelHTML('Email')}
          <input id="sf-email" type="email" class="${inputClass()}" placeholder="joao@email.com"/>
        </div>
        <div>
          ${labelHTML('Telefone')}
          <input id="sf-phone" type="text" class="${inputClass()}" placeholder="(11) 99999-9999"/>
        </div>
        <div>
          ${labelHTML('Curso')}
          <input id="sf-course" type="text" class="${inputClass()}" placeholder="Administração"/>
        </div>
        <div>
          ${labelHTML('Instituição')}
          <input id="sf-institution" type="text" class="${inputClass()}" placeholder="USP"/>
        </div>
        <div class="col-span-2">
          ${labelHTML('Observações')}
          <textarea id="sf-notes" rows="3" class="${inputClass()}" placeholder="Anotações sobre o aluno..."></textarea>
        </div>
      </div>
      <div id="sf-error" class="hidden text-xs text-rose-600 bg-rose-50 px-3 py-2 rounded-lg"></div>
    </div>`;

  const footer = `
    <button onclick="closeModal()" class="border border-slate-200 text-slate-600 font-semibold text-sm px-5 py-2 rounded-xl hover:bg-slate-50 transition-all">Cancelar</button>
    <button id="sf-save" onclick="saveStudent('${id||''}')" class="bg-primary hover:bg-blue-600 text-white font-semibold text-sm px-5 py-2 rounded-xl transition-all shadow-lg shadow-primary/20">
      ${isEdit ? 'Salvar Alterações' : 'Criar Aluno'}
    </button>`;

  openModal(isEdit ? 'Editar Aluno' : 'Novo Aluno', body, footer);

  // If editing, load data
  if (isEdit) {
    getStudent(id).then(s => {
      if (!s) return;
      document.getElementById('sf-name').value        = s.name        || '';
      document.getElementById('sf-email').value       = s.email       || '';
      document.getElementById('sf-phone').value       = s.phone       || '';
      document.getElementById('sf-course').value      = s.course      || '';
      document.getElementById('sf-institution').value = s.institution || '';
      document.getElementById('sf-notes').value       = s.notes       || '';
    }).catch(() => {});
  }

  window.saveStudent = async (sid) => {
    const errEl = document.getElementById('sf-error');
    errEl.classList.add('hidden');
    const name = document.getElementById('sf-name').value.trim();
    if (!name) { errEl.textContent = 'Nome é obrigatório.'; errEl.classList.remove('hidden'); return; }
    const data = {
      name, email: document.getElementById('sf-email').value.trim(),
      phone: document.getElementById('sf-phone').value.trim(),
      course: document.getElementById('sf-course').value.trim(),
      institution: document.getElementById('sf-institution').value.trim(),
      notes: document.getElementById('sf-notes').value.trim(),
    };
    const btn = document.getElementById('sf-save');
    btn.disabled = true; btn.textContent = 'Salvando...';
    try {
      if (sid) await updateStudent(sid, data);
      else await createStudent(data);
      closeModal();
      showToast(sid ? 'Aluno atualizado!' : 'Aluno criado com sucesso!', 'success');
      await loadStudents();
    } catch(e) {
      errEl.textContent = e.message; errEl.classList.remove('hidden');
      btn.disabled = false; btn.textContent = sid ? 'Salvar Alterações' : 'Criar Aluno';
    }
  };
}

async function confirmDeleteStudent(id, name) {
  openModal('Excluir Aluno', `
    <div class="text-center py-4">
      <span class="material-symbols-outlined text-5xl text-rose-400">delete</span>
      <p class="font-semibold text-slate-800 mt-3">Excluir "${name}"?</p>
      <p class="text-sm text-slate-500 mt-1">Esta ação não pode ser desfeita. Todos os trabalhos vinculados perderão o aluno.</p>
    </div>`,
    `<button onclick="closeModal()" class="border border-slate-200 text-slate-600 font-semibold text-sm px-5 py-2 rounded-xl hover:bg-slate-50">Cancelar</button>
     <button onclick="doDeleteStudent('${id}')" class="bg-rose-500 hover:bg-rose-600 text-white font-semibold text-sm px-5 py-2 rounded-xl transition-all">Excluir</button>`
  );
  window.doDeleteStudent = async (sid) => {
    try { await deleteStudent(sid); closeModal(); showToast('Aluno excluído.', 'success'); await loadStudents(); }
    catch(e) { showToast(e.message, 'error'); }
  };
}

async function viewStudent(id) {
  openModal('Perfil do Aluno', '<div class="flex justify-center py-8"><div class="w-6 h-6 border-2 border-primary border-t-transparent rounded-full spin"></div></div>');
  try {
    const s = await getStudent(id);
    const works = s.works || [];
    const worksHTML = works.length === 0
      ? '<p class="text-slate-400 text-sm text-center py-4">Nenhum trabalho vinculado.</p>'
      : works.map(w => `
          <div class="flex items-center justify-between py-2.5 border-b border-slate-50 last:border-0">
            <div>
              <p class="text-sm font-medium">${w.title}</p>
              <p class="text-xs text-slate-500">${w.subject || '—'} · ${formatDate(w.delivery_date)}</p>
            </div>
            ${getStatusBadgeHTML(w.status)}
          </div>`).join('');

    document.getElementById('modal-body').innerHTML = `
      <div class="space-y-5">
        <div class="flex items-center gap-4">
          ${avatarHTML(s.name, 'size-14', 'text-xl')}
          <div>
            <h4 class="font-bold text-lg">${s.name}</h4>
            <p class="text-sm text-slate-500">${s.course || ''} ${s.institution ? '· '+s.institution : ''}</p>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3 text-sm bg-slate-50 rounded-xl p-4">
          <div><span class="text-slate-500 text-xs">Email</span><p class="font-medium">${s.email||'—'}</p></div>
          <div><span class="text-slate-500 text-xs">Telefone</span><p class="font-medium">${s.phone||'—'}</p></div>
          ${s.notes ? `<div class="col-span-2"><span class="text-slate-500 text-xs">Observações</span><p>${s.notes}</p></div>` : ''}
        </div>
        <div>
          <h5 class="font-semibold text-sm mb-2">Trabalhos (${works.length})</h5>
          <div>${worksHTML}</div>
        </div>
      </div>`;
  } catch(e) {
    document.getElementById('modal-body').innerHTML = `<p class="text-rose-500">${e.message}</p>`;
  }
}
