/* ── Centralized API helpers ──────────────────────────────────────────────── */
const API = {
  async get(url) {
    const r = await fetch(url);
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
  async post(url, body) {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!r.ok) {
      const err = await r.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(err.error || 'Request failed');
    }
    return r.json();
  },
  async put(url, body) {
    const r = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!r.ok) {
      const err = await r.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(err.error || 'Request failed');
    }
    return r.json();
  },
  async del(url) {
    const r = await fetch(url, { method: 'DELETE' });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
};

/* ── Toast notifications ──────────────────────────────────────────────────── */
function showToast(message, type = 'info') {
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${icons[type]}</span> ${message}`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3200);
}

/* ── Modal helpers ────────────────────────────────────────────────────────── */
function openModal(id) {
  document.getElementById(id).classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal(id) {
  document.getElementById(id).classList.remove('open');
  document.body.style.overflow = '';
}

/* ── Close modal on overlay click ─────────────────────────────────────────── */
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('open');
    document.body.style.overflow = '';
  }
});

/* ── Escape key closes modal ──────────────────────────────────────────────── */
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.open').forEach(m => {
      m.classList.remove('open');
      document.body.style.overflow = '';
    });
  }
});

/* ── Stock status badge ───────────────────────────────────────────────────── */
function stockBadge(status, qty) {
  const map = {
    out:      ['badge-danger',  '📦 Out of Stock'],
    critical: ['badge-danger',  `⚠️ ${qty} left`],
    low:      ['badge-warning', `⚡ ${qty} left`],
    good:     ['badge-success', `✔ ${qty}`],
  };
  const [cls, label] = map[status] || ['badge-muted', qty];
  return `<span class="badge ${cls}">${label}</span>`;
}

/* ── Expiry status badge ──────────────────────────────────────────────────── */
function expiryBadge(status, expiry_date, days_left) {
  if (!expiry_date) return '<span class="badge badge-muted">—</span>';
  // expiry_date is YYYY-MM — format as "Aug 2026"
  const [year, month] = expiry_date.split('-').map(Number);
  const fmt = new Date(year, month - 1, 1)
    .toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
  if (status === 'expired')
    return `<span class="badge badge-danger">&#128308; Expired (${fmt})</span>`;
  if (status === 'expiring_soon')
    return `<span class="badge badge-warning">&#128993; Expires ${fmt}</span>`;
  return `<span class="badge badge-success">&#128994; ${fmt}</span>`;
}

/* ── Category badge ───────────────────────────────────────────────────────── */
function categoryBadge(cat) {
  if (!cat) return '<span class="badge badge-muted">—</span>';
  return `<span class="badge badge-accent">${cat}</span>`;
}
