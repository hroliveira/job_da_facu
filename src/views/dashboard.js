// ============================================================
// dashboard.js — View do Dashboard
// ============================================================
import { getDashboardMetrics, getUpcomingDeadlines, getRecentStudents, getRevenueChartData } from '../services/dashboardService.js';
import { formatDate, getDeadlineLabel, getDeadlineColor } from '../utils/dateHelpers.js';
import { getStatusBadgeHTML } from '../utils/statusHelpers.js';
import { avatarHTML, formatMoney, emptyHTML } from '../utils/uiHelpers.js';

export async function renderDashboard(container) {
  container.innerHTML = `<div class="p-8 space-y-8 max-w-7xl mx-auto">
    <div id="dash-metrics"><div class="grid grid-cols-2 lg:grid-cols-4 gap-6">${skeletonCards(4)}</div></div>
    <div id="dash-deadlines">${skeletonTable()}</div>
    <div id="dash-chart-students" class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div class="lg:col-span-2">${skeletonTable()}</div>
      <div>${skeletonTable()}</div>
    </div>
  </div>`;

  window._viewSearch = (q) => {};

  try {
    const [metrics, deadlines, recentStudents, chartData] = await Promise.all([
      getDashboardMetrics(),
      getUpcomingDeadlines(8),
      getRecentStudents(5),
      getRevenueChartData(6),
    ]);

    renderMetrics(metrics);
    renderDeadlines(deadlines);
    renderChartAndStudents(chartData, recentStudents, metrics);
  } catch(e) {
    container.innerHTML = `<div class="p-8 text-rose-500">Erro ao carregar dashboard: ${e.message}</div>`;
  }
}

function skeletonCards(n) {
  return Array(n).fill(0).map(() =>
    `<div class="bg-white p-6 rounded-2xl border border-slate-200 animate-pulse h-32"></div>`
  ).join('');
}

function skeletonTable() {
  return `<div class="bg-white rounded-2xl border border-slate-200 p-6 animate-pulse h-48"></div>`;
}

function renderMetrics(m) {
  const cards = [
    { icon:'group',        bg:'blue',    label:'Total de Alunos', value: m.total_students,    badge: null },
    { icon:'menu_book',    bg:'indigo',  label:'Trabalhos Ativos', value: m.active_works,     badge: null },
    { icon:'task_alt',     bg:'emerald', label:'Entregues',       value: m.delivered_works,  badge: null },
    { icon:'payments',     bg:'amber',   label:'Receita do Mês',  value: formatMoney(m.monthly_revenue), badge: m.overdue_works > 0 ? { text: `${m.overdue_works} vencidos`, color:'rose' } : null },
  ];

  const bgMap = { blue:'bg-blue-50 text-blue-600', indigo:'bg-indigo-50 text-indigo-600', emerald:'bg-emerald-50 text-emerald-600', amber:'bg-amber-50 text-amber-600' };

  document.getElementById('dash-metrics').innerHTML = `
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-6">
      ${cards.map(c => `
        <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
          <div class="flex items-center justify-between mb-4">
            <div class="p-3 ${bgMap[c.bg]} rounded-xl"><span class="material-symbols-outlined">${c.icon}</span></div>
            ${c.badge ? `<span class="text-xs font-bold text-${c.badge.color}-500 bg-${c.badge.color}-50 px-2 py-1 rounded-lg">${c.badge.text}</span>` : ''}
          </div>
          <p class="text-slate-500 text-sm font-medium">${c.label}</p>
          <h3 class="text-3xl font-bold mt-1">${c.value}</h3>
        </div>`).join('')}
    </div>`;
}

function renderDeadlines(deadlines) {
  const colorMap = { rose:'bg-rose-50 text-rose-600', amber:'bg-amber-50 text-amber-600', emerald:'bg-emerald-50 text-emerald-600', slate:'bg-slate-100 text-slate-600' };

  const rows = deadlines.length === 0
    ? `<tr><td colspan="5" class="px-6 py-12 text-center text-slate-400">Nenhum deadline próximo 🎉</td></tr>`
    : deadlines.map(w => {
        const color = getDeadlineColor(w.delivery_date);
        return `<tr class="hover:bg-slate-50/50 transition-colors">
          <td class="px-6 py-4 font-medium text-sm">${w.title}</td>
          <td class="px-6 py-4 text-sm">${w.students?.name || '—'}</td>
          <td class="px-6 py-4 text-sm text-slate-500">${w.subject || '—'}</td>
          <td class="px-6 py-4 text-sm text-slate-500">${formatDate(w.delivery_date)}</td>
          <td class="px-6 py-4">
            <span class="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold ${colorMap[color]||colorMap.slate}">
              ${getDeadlineLabel(w.delivery_date)}
            </span>
          </td>
        </tr>`;
      }).join('');

  document.getElementById('dash-deadlines').innerHTML = `
    <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div class="p-6 border-b border-slate-100 flex items-center justify-between">
        <h2 class="text-lg font-bold">Próximos Prazos</h2>
        <button onclick="navigate('works')" class="text-sm font-semibold text-primary hover:underline">Ver todos</button>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-left">
          <thead><tr class="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider">
            <th class="px-6 py-4">Trabalho</th><th class="px-6 py-4">Aluno</th>
            <th class="px-6 py-4">Matéria</th><th class="px-6 py-4">Entrega</th><th class="px-6 py-4">Status</th>
          </tr></thead>
          <tbody class="divide-y divide-slate-100">${rows}</tbody>
        </table>
      </div>
    </div>`;
}

function renderChartAndStudents(chartData, students, metrics) {
  const maxRev = Math.max(...chartData.map(d => d.revenue), 1);

  const bars = chartData.map(d => {
    const pct = Math.max(5, Math.round((d.revenue / maxRev) * 100));
    const isCurrent = d.month === new Date().getMonth() + 1 && d.year === new Date().getFullYear();
    return `
      <div class="flex-1 flex flex-col items-center gap-2">
        <div class="w-full rounded-t-lg relative overflow-hidden" style="height:${pct}%; min-height:12px; background:${isCurrent?'#3B82F6':'#e2e8f0'}">
          ${isCurrent ? `<div class="absolute top-2 left-1/2 -translate-x-1/2 bg-white text-[10px] font-bold px-1 rounded shadow text-primary whitespace-nowrap">${formatMoney(d.revenue)}</div>` : ''}
        </div>
        <span class="text-xs font-bold ${isCurrent?'text-slate-900':'text-slate-400'}">${d.label}</span>
      </div>`;
  }).join('');

  const studentRows = students.length === 0
    ? `<tr><td colspan="5" class="px-6 py-8 text-center text-slate-400">Nenhum aluno cadastrado ainda.</td></tr>`
    : students.map(s => {
        const wCount = s.works?.[0]?.count || 0;
        return `<tr class="hover:bg-slate-50/50 transition-colors">
          <td class="px-6 py-4">
            <div class="flex items-center gap-3">
              ${avatarHTML(s.name, 'size-8', 'text-xs')}
              <span class="text-sm font-medium">${s.name}</span>
            </div>
          </td>
          <td class="px-6 py-4 text-sm">${s.course || '—'}</td>
          <td class="px-6 py-4 text-sm text-slate-500">${s.institution || '—'}</td>
          <td class="px-6 py-4 text-sm text-slate-500">${s.email || '—'}</td>
          <td class="px-6 py-4 text-sm font-semibold">${wCount}</td>
        </tr>`;
      }).join('');

  document.getElementById('dash-chart-students').innerHTML = `
    <div class="lg:col-span-2 bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
      <div class="flex justify-between items-center mb-6">
        <div>
          <h3 class="text-lg font-bold">Receita Mensal</h3>
          <p class="text-sm text-slate-500">Pagamentos recebidos por mês</p>
        </div>
      </div>
      <div class="relative h-52 flex items-end gap-3 px-2">${bars}</div>
    </div>
    <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
      <h3 class="text-lg font-bold mb-4">Resumo</h3>
      <div class="space-y-4">
        ${[
          { label:'Receita Total', value: formatMoney(metrics.total_revenue), color:'emerald' },
          { label:'Pendente',      value: formatMoney(metrics.pending_payment_total), color:'amber' },
          { label:'Em progresso',  value: metrics.works_in_progress + ' trabalhos', color:'blue' },
          { label:'Vencidos',      value: metrics.overdue_works + ' trabalhos', color:'rose' },
        ].map(r => `
          <div class="flex items-center justify-between">
            <span class="text-sm text-slate-500">${r.label}</span>
            <span class="text-sm font-bold text-${r.color}-600">${r.value}</span>
          </div>`
        ).join('')}
      </div>
    </div>
    <div class="lg:col-span-3 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div class="p-6 border-b border-slate-100 flex items-center justify-between">
        <h2 class="text-lg font-bold">Alunos Recentes</h2>
        <button onclick="navigate('students')" class="text-sm font-semibold text-primary hover:underline">Gerenciar Alunos</button>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-left">
          <thead><tr class="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider">
            <th class="px-6 py-4">Aluno</th><th class="px-6 py-4">Curso</th>
            <th class="px-6 py-4">Instituição</th><th class="px-6 py-4">Contato</th><th class="px-6 py-4">Trabalhos</th>
          </tr></thead>
          <tbody class="divide-y divide-slate-100">${studentRows}</tbody>
        </table>
      </div>
    </div>`;
}
