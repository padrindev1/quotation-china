/* ── OKTZ ERP — Utilities ──────────────────────────────────── */

// Toast notifications
function showToast(message, type = 'success', duration = 4000) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  const icons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };
  toast.innerHTML = `<span>${icons[type] || '•'}</span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, duration);
}

// Format currency
function fmtBRL(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
}
function fmtUSD(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'USD' }).format(value || 0);
}
function fmtCurrency(value, currency = 'BRL') {
  try { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(value || 0); }
  catch { return `${currency} ${Number(value || 0).toFixed(2)}`; }
}
function fmtNum(value, decimals = 2) {
  return Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

// Format dates
function fmtDate(str) {
  if (!str) return '—';
  return new Date(str.includes('T') ? str : str + 'T12:00:00')
    .toLocaleDateString('pt-BR');
}
function fmtDateTime(str) {
  if (!str) return '—';
  return new Date(str).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}
function fmtRelative(str) {
  if (!str) return '—';
  const diff = Date.now() - new Date(str).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'agora';
  if (m < 60) return `${m}min atrás`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h atrás`;
  return fmtDate(str);
}

// Badge HTML
function badge(status, custom = {}) {
  const labels = {
    pending: 'Pendente', approved: 'Aprovado', paid: 'Pago', overdue: 'Vencido',
    cancelled: 'Cancelado', draft: 'Rascunho', in_progress: 'Em Andamento',
    customs_clearance: 'Em Desembaraço', released: 'Liberado', completed: 'Concluído',
    suspended: 'Suspenso', active: 'Ativo', inactive: 'Inativo',
    sent: 'Enviado', failed: 'Falhou',
    admin: 'Admin', manager: 'Gerente', operator: 'Operador', viewer: 'Visualizador',
    machine: 'Máquina', product: 'Produto', service: 'Serviço', other: 'Outro',
    ...custom,
  };
  const label = labels[status] || status;
  return `<span class="badge badge-${status}">${label}</span>`;
}

// Modal helpers
function openModal(id) {
  document.getElementById(id)?.classList.add('open');
}
function closeModal(id) {
  document.getElementById(id)?.classList.remove('open');
}
function setupModalClose() {
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) overlay.classList.remove('open');
    });
  });
  document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', () => {
      btn.closest('.modal-overlay')?.classList.remove('open');
    });
  });
}

// Form helpers
function getFormData(form) {
  const data = {};
  new FormData(form).forEach((v, k) => {
    data[k] = v === '' ? null : v;
  });
  return data;
}
function clearForm(form) {
  form.reset();
  form.querySelectorAll('.error').forEach(el => el.classList.remove('error'));
}
function setFormData(form, data) {
  Object.entries(data).forEach(([key, val]) => {
    const el = form.elements[key];
    if (el && val != null) el.value = val;
  });
}
function showFieldErrors(details = []) {
  details.forEach(({ field, message }) => {
    const el = document.querySelector(`[name="${field}"]`);
    if (el) { el.classList.add('error'); el.title = message; }
  });
}

// Tag input (email list)
function initTagInput(containerId, inputId, addBtnId) {
  const tags = [];
  const container = document.getElementById(containerId);
  const input = document.getElementById(inputId);
  const btn = document.getElementById(addBtnId);

  function render() {
    const existing = container.querySelectorAll('.tag');
    existing.forEach(t => t.remove());
    tags.forEach((tag, i) => {
      const el = document.createElement('span');
      el.className = 'tag';
      el.innerHTML = `${tag}<button class="tag-remove" data-i="${i}" type="button">×</button>`;
      container.insertBefore(el, input.closest ? input.parentElement : input);
    });
    container.querySelectorAll('.tag-remove').forEach(b => {
      b.addEventListener('click', () => { tags.splice(+b.dataset.i, 1); render(); });
    });
  }

  function addTag() {
    const val = input.value.trim();
    if (val && !tags.includes(val)) { tags.push(val); render(); input.value = ''; }
  }

  btn?.addEventListener('click', addTag);
  input?.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } });

  return { getTags: () => [...tags], clear: () => { tags.length = 0; render(); }, add: (v) => { if (!tags.includes(v)) { tags.push(v); render(); } } };
}

// Sidebar active state
function setActivePage(page) {
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.page === page);
  });
}

// Sidebar user info + logout
function initSidebar(page) {
  const user = Auth.getUser();
  if (user) {
    const nameEl = document.getElementById('sidebar-user-name');
    const roleEl = document.getElementById('sidebar-user-role');
    if (nameEl) nameEl.textContent = user.name;
    if (roleEl) roleEl.textContent = { admin: 'Administrador', manager: 'Gerente', operator: 'Operador', viewer: 'Visualizador' }[user.role] || user.role;
  }
  document.getElementById('logout-btn')?.addEventListener('click', async () => {
    try { await API.post('/api/auth/logout'); } catch { }
    Auth.clear();
    window.location.href = '/';
  });
  if (page) setActivePage(page);
  setupModalClose();
}

// Table loading state
function tableLoading(tbodyId) {
  const tbody = document.getElementById(tbodyId);
  if (tbody) tbody.innerHTML = `<tr><td colspan="99"><div class="loader"><div class="spinner"></div></div></td></tr>`;
}
function tableEmpty(tbodyId, message = 'Nenhum registro encontrado', cols = 99) {
  const tbody = document.getElementById(tbodyId);
  if (tbody) tbody.innerHTML = `<tr><td colspan="${cols}"><div class="empty-state"><i>📭</i><p>${message}</p></div></td></tr>`;
}

// Confirm dialog
function confirmAction(msg) {
  return window.confirm(msg);
}

// Payback color
function paybackColor(months) {
  if (!months) return '';
  if (months <= 12) return 'pb-good';
  if (months <= 24) return '';
  return 'pb-bad';
}
