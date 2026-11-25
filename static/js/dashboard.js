/* ── Dashboard stats loader ───────────────────────────────────────────────── */
async function loadStats() {
  try {
    const stats = await API.get('/api/stats');
    document.getElementById('stat-total').textContent     = stats.total;
    document.getElementById('stat-low').textContent       = stats.low_stock;
    document.getElementById('stat-expiring').textContent  = stats.expiring_soon;
    document.getElementById('stat-expired').textContent   = stats.expired;
    document.getElementById('stat-out').textContent       = stats.out_of_stock;
  } catch (e) {
    console.error('Stats load failed', e);
  }
}

/* ── Low stock & expiring alerts ─────────────────────────────────────────── */
async function loadAlerts() {
  try {
    const tablets = await API.get('/api/tablets');

    const lowStock = tablets.filter(t => t.stock_status === 'low' || t.stock_status === 'critical' || t.stock_status === 'out');
    const expiringSoon = tablets.filter(t => t.expiry_status === 'expiring_soon' || t.expiry_status === 'expired');

    renderAlertList('low-stock-list', lowStock, t => ({
      name: t.name,
      meta: t.generic_name || t.category || 'No category',
      badge: stockBadge(t.stock_status, t.quantity),
    }), '📦 No low stock tablets!');

    renderAlertList('expiry-list', expiringSoon, t => ({
      name: t.name,
      meta: t.category || '',
      badge: expiryBadge(t.expiry_status, t.expiry_date, t.days_left),
    }), '✅ No expiring tablets!');

  } catch (e) {
    console.error('Alerts load failed', e);
  }
}

function renderAlertList(containerId, items, mapper, emptyMsg) {
  const el = document.getElementById(containerId);
  if (!el) return;

  if (!items.length) {
    el.innerHTML = `<div class="empty-state" style="padding:30px 24px;">
      <div class="empty-icon" style="font-size:32px;margin-bottom:10px;">✨</div>
      <p>${emptyMsg}</p>
    </div>`;
    return;
  }

  el.innerHTML = items.map(t => {
    const { name, meta, badge } = mapper(t);
    return `<div class="alert-item">
      <div class="alert-item-left">
        <span class="alert-item-name">${name}</span>
        <span class="alert-item-meta">${meta}</span>
      </div>
      ${badge}
    </div>`;
  }).join('');
}

/* ── Recent additions ─────────────────────────────────────────────────────── */
async function loadRecent() {
  try {
    const tablets = await API.get('/api/tablets');
    const recent = tablets
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 5);

    const el = document.getElementById('recent-list');
    if (!el) return;

    if (!recent.length) {
      el.innerHTML = `<div class="empty-state" style="padding:30px 24px;">
        <p>No tablets added yet. <a href="/tablets" style="color:var(--accent)">Add your first tablet →</a></p>
      </div>`;
      return;
    }

    el.innerHTML = recent.map(t => `
      <div class="alert-item">
        <div class="alert-item-left">
          <span class="alert-item-name">${t.name}</span>
          <span class="alert-item-meta">${t.category || 'Uncategorized'} · Added ${new Date(t.created_at).toLocaleDateString('en-IN')}</span>
        </div>
        <div style="display:flex;gap:6px;align-items:center;">
          ${stockBadge(t.stock_status, t.quantity)}
          ${expiryBadge(t.expiry_status, t.expiry_date, t.days_left)}
        </div>
      </div>
    `).join('');
  } catch (e) {
    console.error('Recent load failed', e);
  }
}

/* ── Init ────────────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  loadStats();
  loadAlerts();
  loadRecent();
});
