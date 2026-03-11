// ============================================================
// dateHelpers.js — Utilitários de data
// ============================================================

/**
 * Formata uma data para exibição: "Mar 10, 2026"
 */
export function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Formata para input[type=date]: "2026-03-10"
 */
export function toInputDate(dateStr) {
  if (!dateStr) return '';
  return dateStr.slice(0, 10);
}

/**
 * Retorna quantos dias faltam até a data (negativo = atrasado)
 */
export function getDaysUntil(dateStr) {
  if (!dateStr) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const d = new Date(dateStr + 'T00:00:00');
  return Math.round((d - now) / (1000 * 60 * 60 * 24));
}

/**
 * Verifica se a data está atrasada
 */
export function isOverdue(dateStr) {
  const days = getDaysUntil(dateStr);
  return days !== null && days < 0;
}

/**
 * Verifica se entrega é em até X dias
 */
export function isDueSoon(dateStr, days = 7) {
  const d = getDaysUntil(dateStr);
  return d !== null && d >= 0 && d <= days;
}

/**
 * Retorna o rótulo de urgência para o deadline
 */
export function getDeadlineLabel(dateStr) {
  const days = getDaysUntil(dateStr);
  if (days === null) return '';
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return 'Due today!';
  if (days === 1) return 'Due tomorrow';
  return `${days} days left`;
}

/**
 * Cor do badge de deadline
 */
export function getDeadlineColor(dateStr) {
  const days = getDaysUntil(dateStr);
  if (days === null) return 'slate';
  if (days < 0) return 'rose';
  if (days <= 3) return 'amber';
  return 'emerald';
}

/**
 * Retorna o mês/ano atual: { year: 2026, month: 3 }
 */
export function getCurrentMonth() {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

/**
 * Retorna array dos últimos N meses: [{year,month,label}]
 */
export function getLastNMonths(n = 6) {
  const months = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      label: d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()
    });
  }
  return months;
}
