// ============================================================
// statusHelpers.js — Badges e labels de status
// ============================================================

const STATUS_CONFIG = {
  pending:     { label: 'Pendente',     color: 'amber',   icon: 'schedule' },
  in_progress: { label: 'Em Processo', color: 'blue',    icon: 'autorenew' },
  review:      { label: 'Em Revisão',   color: 'purple',  icon: 'visibility' },
  delivered:   { label: 'Entregue',     color: 'emerald', icon: 'check_circle' },
  cancelled:   { label: 'Cancelados',   color: 'rose',    icon: 'cancel' },
};

const PAYMENT_STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'amber' },
  partial: { label: 'Partial', color: 'blue' },
  paid:    { label: 'Paid',    color: 'emerald' },
};

const COLOR_CLASSES = {
  amber:   'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
  blue:    'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  purple:  'bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
  emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
  rose:    'bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400',
  slate:   'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
};

export function getStatusConfig(status) {
  return STATUS_CONFIG[status] || STATUS_CONFIG['pending'];
}

export function getStatusBadgeHTML(status) {
  const cfg = STATUS_CONFIG[status] || { label: status, color: 'slate' };
  const classes = COLOR_CLASSES[cfg.color] || COLOR_CLASSES.slate;
  return `<span class="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold ${classes}">${cfg.label}</span>`;
}

export function getPaymentBadgeHTML(status) {
  const cfg = PAYMENT_STATUS_CONFIG[status] || { label: status, color: 'slate' };
  const classes = COLOR_CLASSES[cfg.color] || COLOR_CLASSES.slate;
  return `<span class="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold ${classes}">${cfg.label}</span>`;
}

export function getAllStatuses() {
  return Object.entries(STATUS_CONFIG).map(([value, cfg]) => ({ value, label: cfg.label }));
}

export function getKanbanColumns() {
  return [
    { status: 'pending',     label: 'Pendente',     dotColor: 'bg-slate-400',   badgeClass: 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400' },
    { status: 'in_progress', label: 'Em Processo', dotColor: 'bg-primary',     badgeClass: 'bg-primary/10 text-primary' },
    { status: 'review',      label: 'Em Revisão',   dotColor: 'bg-amber-400',   badgeClass: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600' },
    { status: 'delivered',   label: 'Entregue',     dotColor: 'bg-emerald-500', badgeClass: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600' },
    { status: 'cancelled',   label: 'Cancelados',   dotColor: 'bg-rose-500',    badgeClass: 'bg-rose-100 dark:bg-rose-900/30 text-rose-600' },
  ];
}

export function getFileIcon(fileName) {
  const ext = (fileName || '').split('.').pop().toLowerCase();
  const icons = {
    pdf:  { icon: 'picture_as_pdf', color: 'text-rose-500' },
    doc:  { icon: 'description',    color: 'text-blue-500' },
    docx: { icon: 'description',    color: 'text-blue-500' },
    xls:  { icon: 'table_chart',    color: 'text-emerald-500' },
    xlsx: { icon: 'table_chart',    color: 'text-emerald-500' },
    ppt:  { icon: 'slideshow',      color: 'text-orange-500' },
    pptx: { icon: 'slideshow',      color: 'text-orange-500' },
    zip:  { icon: 'folder_zip',     color: 'text-amber-500' },
    rar:  { icon: 'folder_zip',     color: 'text-amber-500' },
    jpg:  { icon: 'image',          color: 'text-purple-500' },
    jpeg: { icon: 'image',          color: 'text-purple-500' },
    png:  { icon: 'image',          color: 'text-purple-500' },
  };
  return icons[ext] || { icon: 'insert_drive_file', color: 'text-slate-400' };
}
