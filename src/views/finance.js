// ============================================================
// finance.js — View de Finanças e Arquivos
// ============================================================
import { listAllPayments, createPayment, updatePaymentStatus, deletePayment,
         getTotalRevenue, getPendingTotal, getPaidWorksCount, getRevenueByMonth } from '../services/paymentService.js';
import { listAllFiles, uploadFile, getDownloadUrl, deleteFile } from '../services/fileService.js';
import { listWorks } from '../services/workService.js';
import { getLastNMonths, formatDate } from '../utils/dateHelpers.js';
import { getPaymentBadgeHTML, getFileIcon } from '../utils/statusHelpers.js';
import { formatMoney, loadingHTML, emptyHTML, inputClass, labelHTML, avatarHTML } from '../utils/uiHelpers.js';

export async function renderFinance(container) {
  container.innerHTML = `
    <div class="p-8 space-y-8 max-w-7xl mx-auto">
      <div id="fin-stats">${loadingHTML('Carregando finanças...')}</div>
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div id="fin-chart" class="lg:col-span-2">${loadingHTML()}</div>
        <div id="fin-recent">${loadingHTML()}</div>
      </div>
      <div id="fin-files">${loadingHTML('Carregando arquivos...')}</div>
    </div>`;

  window._viewSearch = () => {};

  try {
    const months = getLastNMonths(6);
    const [totalRev, pendingTotal, paidCount, chartData, paymentsResult, filesResult] = await Promise.all([
      getTotalRevenue(), getPendingTotal(), getPaidWorksCount(),
      getRevenueByMonth(months),
      listAllPayments({ limit: 5 }),
      listAllFiles({ limit: 20 }),
    ]);

    renderStats(totalRev, pendingTotal, paidCount, chartData);
    renderChart(chartData, months);
    renderRecentPayments(paymentsResult.data);
    renderFilesSection(filesResult.data, filesResult.count);
  } catch(e) {
    container.innerHTML = `<div class="p-8 text-rose-500">Erro: ${e.message}</div>`;
  }
}

function renderStats(total, pending, paid, chartData) {
  const thisMonth = chartData[chartData.length - 1]?.revenue || 0;
  const cards = [
    { icon:'account_balance_wallet', bg:'bg-blue-50 text-blue-600',   label:'Receita Total',       value: formatMoney(total) },
    { icon:'pending_actions',        bg:'bg-amber-50 text-amber-500',  label:'Pagamentos Pendentes', value: formatMoney(pending) },
    { icon:'check_circle',           bg:'bg-emerald-50 text-emerald-500', label:'Trabalhos Pagos',   value: paid + ' trabalhos' },
    { icon:'trending_up',            bg:'bg-purple-50 text-purple-500', label:'Ganhos deste Mês',   value: formatMoney(thisMonth) },
  ];
  document.getElementById('fin-stats').innerHTML = `
    <div>
      <h3 class="text-xl font-bold mb-1">Desempenho Financeiro</h3>
      <p class="text-sm text-slate-500 mb-6">Visão geral das suas receitas.</p>
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-6">
        ${cards.map(c => `
          <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div class="flex justify-between items-start mb-4">
              <span class="p-2 ${c.bg} rounded-lg"><span class="material-symbols-outlined">${c.icon}</span></span>
            </div>
            <p class="text-slate-500 text-sm font-medium">${c.label}</p>
            <h4 class="text-2xl font-bold mt-1">${c.value}</h4>
          </div>`).join('')}
      </div>
    </div>`;
}

function renderChart(chartData, months) {
  const maxRev = Math.max(...chartData.map(d => d.revenue), 1);
  const bars = chartData.map(d => {
    const pct = Math.max(5, Math.round((d.revenue / maxRev) * 100));
    const isCurrent = d.month === new Date().getMonth() + 1 && d.year === new Date().getFullYear();
    return `
      <div class="flex-1 flex flex-col items-center gap-2">
        <div class="w-full rounded-t-lg relative overflow-hidden" style="height:${pct}%; min-height:10px; background:${isCurrent?'#3B82F6':'#e2e8f0'};">
          ${isCurrent?`<div class="absolute top-1 left-1/2 -translate-x-1/2 bg-white text-[9px] font-bold px-1 rounded shadow text-primary whitespace-nowrap">${formatMoney(d.revenue)}</div>`:''}
        </div>
        <span class="text-xs font-bold ${isCurrent?'text-slate-900':'text-slate-400'}">${d.label}</span>
      </div>`;
  }).join('');

  document.getElementById('fin-chart').innerHTML = `
    <div class="bg-white p-8 rounded-xl border border-slate-200 shadow-sm h-full">
      <div class="flex justify-between items-center mb-6">
        <div>
          <h3 class="text-lg font-bold">Crescimento de Receita</h3>
          <p class="text-sm text-slate-500">Comparativo mensal</p>
        </div>
      </div>
      <div class="relative h-52 flex items-end gap-3 px-2">${bars}</div>
    </div>`;
}

function renderRecentPayments(payments) {
  const items = payments.length === 0
    ? `<p class="text-slate-400 text-sm text-center py-8">Nenhum pagamento registrado.</p>`
    : payments.map(p => {
        const title = p.works?.title || 'Trabalho';
        const student = p.works?.students?.name || '';
        const isReceived = p.status === 'paid';
        return `
          <div class="flex items-center gap-4">
            <div class="size-10 rounded-full ${isReceived?'bg-emerald-50 text-emerald-600':'bg-blue-50 text-blue-600'} flex items-center justify-center">
              <span class="material-symbols-outlined text-xl">${isReceived?'add_card':'schedule'}</span>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-bold truncate">${title}</p>
              <p class="text-xs text-slate-500 truncate">${student}${p.payment_date?' · '+formatDate(p.payment_date):''}</p>
            </div>
            <span class="text-sm font-bold ${isReceived?'text-emerald-600':'text-slate-400'}">
              ${isReceived?'+':''}${formatMoney(p.amount)}
            </span>
          </div>`;
      }).join('');

  document.getElementById('fin-recent').innerHTML = `
    <div class="bg-white p-8 rounded-xl border border-slate-200 shadow-sm h-full">
      <div class="flex items-center justify-between mb-6">
        <h3 class="text-lg font-bold">Pagamentos Recentes</h3>
      </div>
      <div class="flex flex-col gap-5">${items}</div>
    </div>`;
}

function renderFilesSection(files, total) {
  const rows = files.length === 0
    ? `<tr><td colspan="5" class="px-6 py-12 text-center text-slate-400">Nenhum arquivo enviado ainda.</td></tr>`
    : files.map(f => {
        const { icon, color } = getFileIcon(f.file_name);
        const workTitle = f.works?.title || '—';
        const studentName = f.works?.students?.name || '—';
        return `<tr class="hover:bg-slate-50/50 transition-colors">
          <td class="px-6 py-4 text-sm font-medium">${workTitle}</td>
          <td class="px-6 py-4">
            <div class="flex items-center gap-2">
              ${avatarHTML(studentName, 'size-6', 'text-[10px]')}
              <span class="text-sm text-slate-600">${studentName}</span>
            </div>
          </td>
          <td class="px-6 py-4">
            <div class="flex items-center gap-2 text-slate-500">
              <span class="material-symbols-outlined ${color} text-lg">${icon}</span>
              <span class="text-sm">${f.file_name}</span>
            </div>
          </td>
          <td class="px-6 py-4 text-sm text-slate-500">${formatDate(f.uploaded_at?.slice(0,10))}</td>
          <td class="px-6 py-4 text-right">
            <div class="flex items-center justify-end gap-1">
              <button onclick="downloadFileAction('${f.file_path}','${f.file_name}')" title="Download" class="p-2 text-slate-400 hover:text-primary transition-colors">
                <span class="material-symbols-outlined">download</span>
              </button>
              <button onclick="deleteFileAction('${f.id}','${f.file_path}','${f.file_name.replace(/'/g,"\\'")}')" title="Excluir" class="p-2 text-slate-400 hover:text-rose-500 transition-colors">
                <span class="material-symbols-outlined">delete</span>
              </button>
            </div>
          </td>
        </tr>`;
      }).join('');

  document.getElementById('fin-files').innerHTML = `
    <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div class="p-6 border-b border-slate-100 flex justify-between items-center">
        <div>
          <h3 class="text-lg font-bold">Arquivos Recentes</h3>
          <p class="text-sm text-slate-500">Documentos dos trabalhos acadêmicos.</p>
        </div>
        <div class="flex items-center gap-2">
          <label class="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-semibold rounded-lg cursor-pointer hover:bg-blue-600 transition-colors">
            <span class="material-symbols-outlined text-base">upload</span>Enviar Arquivo
            <input type="file" id="file-upload-input" class="hidden" onchange="handleFileUpload(event)" accept="*/*"/>
          </label>
        </div>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead><tr class="bg-slate-50/50 text-slate-500 uppercase text-[10px] tracking-widest font-bold">
            <th class="px-6 py-4">Trabalho</th><th class="px-6 py-4">Aluno</th>
            <th class="px-6 py-4">Arquivo</th><th class="px-6 py-4">Data</th><th class="px-6 py-4 text-right">Ações</th>
          </tr></thead>
          <tbody class="divide-y divide-slate-100">${rows}</tbody>
        </table>
      </div>
      ${total > 20 ? `<div class="p-4 bg-slate-50 flex justify-center"><p class="text-sm text-slate-500">Mostrando 20 de ${total} arquivos</p></div>` : ''}
    </div>`;

  window.downloadFileAction = async (path, name) => {
    try {
      const url = await getDownloadUrl(path, 120);
      const a = document.createElement('a'); a.href = url; a.download = name; a.click();
    } catch(e) { showToast('Erro no download: ' + e.message, 'error'); }
  };

  window.deleteFileAction = async (id, path, name) => {
    openModal('Excluir Arquivo',
      `<div class="text-center py-4">
        <span class="material-symbols-outlined text-5xl text-rose-400">delete</span>
        <p class="font-semibold mt-3">Excluir "${name}"?</p>
      </div>`,
      `<button onclick="closeModal()" class="border border-slate-200 text-slate-600 font-semibold text-sm px-5 py-2 rounded-xl hover:bg-slate-50">Cancelar</button>
       <button onclick="confirmDeleteFile('${id}','${path}')" class="bg-rose-500 hover:bg-rose-600 text-white font-semibold text-sm px-5 py-2 rounded-xl">Excluir</button>`
    );
    window.confirmDeleteFile = async (fid, fpath) => {
      try { await deleteFile(fid, fpath); closeModal(); showToast('Arquivo excluído.', 'success'); renderFinance(document.getElementById('view-container')); }
      catch(e) { showToast(e.message, 'error'); }
    };
  };

  window.handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    // need to select a work first
    let works = [];
    try { const r = await listWorks({ limit: 100 }); works = r.data; } catch(e) {}
    const opts = works.map(w => `<option value="${w.id}">${w.title}</option>`).join('');
    openModal('Associar Arquivo ao Trabalho',
      `<div class="space-y-4">
        <p class="text-sm text-slate-500">Arquivo: <strong>${file.name}</strong></p>
        ${labelHTML('Trabalho', true)}
        <select id="upload-work-id" class="${inputClass()}"><option value="">— Selecionar —</option>${opts}</select>
        <div id="upload-error" class="hidden text-xs text-rose-600 bg-rose-50 px-3 py-2 rounded-lg"></div>
      </div>`,
      `<button onclick="closeModal()" class="border border-slate-200 text-slate-600 font-semibold text-sm px-5 py-2 rounded-xl hover:bg-slate-50">Cancelar</button>
       <button id="upload-btn" onclick="doUpload()" class="bg-primary hover:bg-blue-600 text-white font-semibold text-sm px-5 py-2 rounded-xl">Enviar</button>`
    );
    window.doUpload = async () => {
      const workId = document.getElementById('upload-work-id').value;
      const errEl  = document.getElementById('upload-error');
      if (!workId) { errEl.textContent = 'Selecione um trabalho.'; errEl.classList.remove('hidden'); return; }
      const btn = document.getElementById('upload-btn');
      btn.disabled = true; btn.textContent = 'Enviando...';
      try {
        await uploadFile(workId, file);
        closeModal(); showToast('Arquivo enviado com sucesso!', 'success');
        renderFinance(document.getElementById('view-container'));
      } catch(err) {
        errEl.textContent = err.message; errEl.classList.remove('hidden');
        btn.disabled = false; btn.textContent = 'Enviar';
      }
    };
  };
}

