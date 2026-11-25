/* ── State ───────────────────────────────────────────────────────────────── */
let allTablets = [];
let editingId = null;
let consumeTargetId = null;

const CATEGORIES = [
  'Antibiotic', 'Antacid', 'Antifungal', 'Antihistamine',
  'Antiviral', 'Painkiller', 'Vitamin / Supplement',
  'Diabetes', 'Blood Pressure', 'Cardiac', 'Thyroid',
  'Neurological', 'Eye / Ear Drops', 'Ointment / Cream', 'Other',
];

/* ── DOM refs ────────────────────────────────────────────────────────────── */
const tbody = document.getElementById('tablets-tbody');
const emptyState = document.getElementById('empty-state');
const searchInput = document.getElementById('search-input');
const categoryFilter = document.getElementById('category-filter');
const stockFilter = document.getElementById('stock-filter');
const expiryFilter = document.getElementById('expiry-filter');
const tabletCount = document.getElementById('tablet-count');

/* ── Populate category dropdowns ─────────────────────────────────────────── */
function populateCategoryOptions() {
  const opts = CATEGORIES.map(c => `<option value="${c}">${c}</option>`).join('');
  categoryFilter.innerHTML = `<option value="">All Categories</option>${opts}`;
  document.getElementById('form-category').innerHTML =
    `<option value="">— Select category —</option>${opts}`;
}

/* ── Load & render ───────────────────────────────────────────────────────── */
async function loadTablets() {
  try {
    allTablets = await API.get('/api/tablets');
    renderTable();
  } catch (e) {
    showToast('Failed to load tablets', 'error');
  }
}

function renderTable() {
  const search = searchInput.value.toLowerCase();
  const catF = categoryFilter.value;
  const stockF = stockFilter.value;
  const expiryF = expiryFilter.value;

  let data = allTablets.filter(t => {
    const matchSearch = !search ||
      t.name.toLowerCase().includes(search) ||
      (t.generic_name || '').toLowerCase().includes(search) ||
      (t.category || '').toLowerCase().includes(search);

    const matchCat = !catF || t.category === catF;

    const matchStock = !stockF || t.stock_status === stockF;

    let matchExpiry = true;
    if (expiryF === 'expired') matchExpiry = t.expiry_status === 'expired';
    if (expiryF === 'expiring_soon') matchExpiry = t.expiry_status === 'expiring_soon';
    if (expiryF === 'good') matchExpiry = t.expiry_status === 'good';

    return matchSearch && matchCat && matchStock && matchExpiry;
  });

  tabletCount.textContent = `${data.length} tablet${data.length !== 1 ? 's' : ''}`;

  if (!data.length) {
    tbody.innerHTML = '';
    emptyState.style.display = 'block';
    return;
  }
  emptyState.style.display = 'none';

  tbody.innerHTML = data.map(t => `
    <tr data-id="${t.id}">
      <td>
        <div class="td-name">${t.name}</div>
        ${t.generic_name ? `<div class="td-generic">${t.generic_name}</div>` : ''}
      </td>
      <td>${categoryBadge(t.category)}</td>
      <td>${stockBadge(t.stock_status, t.quantity)}</td>
      <td>${expiryBadge(t.expiry_status, t.expiry_date, t.days_left)}</td>
      <td style="color:var(--text-secondary);font-size:12px;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${t.notes || '—'}</td>
      <td>
        <div class="action-btns">
          <button class="btn btn-ghost btn-sm" onclick="confirmConsume(${t.id}, '${t.name.replace(/'/g, '&#39;')}', ${t.quantity})" title="Take 1" ${t.quantity <= 0 ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}>Consume</button>
          <button class="action-btn edit" onclick="openEdit(${t.id})" title="Edit">✏️</button>
          <button class="action-btn del"  onclick="confirmDelete(${t.id}, '${t.name.replace(/'/g, '&#39;')}')" title="Delete">🗑️</button>
        </div>
      </td>
    </tr>
  `).join('');
}

/* ── Open Add Modal ──────────────────────────────────────────────────────── */
function openAddModal() {
  editingId = null;
  document.getElementById('modal-title').textContent = '💊 Add New Tablet';
  document.getElementById('tablet-form').reset();
  document.getElementById('form-id').value = '';
  openModal('tablet-modal');
  document.getElementById('form-name').focus();
}

/* ── Open Edit Modal ─────────────────────────────────────────────────────── */
async function openEdit(id) {
  try {
    const t = await API.get(`/api/tablets/${id}`);
    editingId = id;
    document.getElementById('modal-title').textContent = '✏️ Edit Tablet';
    document.getElementById('form-id').value = t.id;
    document.getElementById('form-name').value = t.name;
    document.getElementById('form-generic').value = t.generic_name || '';
    document.getElementById('form-category').value = t.category || '';
    document.getElementById('form-quantity').value = t.quantity;
    document.getElementById('form-expiry').value = t.expiry_date || '';
    document.getElementById('form-notes').value = t.notes || '';
    openModal('tablet-modal');
  } catch (e) {
    showToast('Failed to load tablet data', 'error');
  }
}

/* ── Save (Add / Edit) ───────────────────────────────────────────────────── */
async function saveTablet(e) {
  e.preventDefault();
  const payload = {
    name: document.getElementById('form-name').value.trim(),
    generic_name: document.getElementById('form-generic').value.trim(),
    category: document.getElementById('form-category').value,
    quantity: parseInt(document.getElementById('form-quantity').value) || 0,
    expiry_date: document.getElementById('form-expiry').value || null,
    notes: document.getElementById('form-notes').value.trim(),
  };

  if (!payload.name) { showToast('Tablet name is required', 'error'); return; }

  const saveBtn = document.getElementById('save-btn');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving…';

  try {
    if (editingId) {
      await API.put(`/api/tablets/${editingId}`, payload);
      showToast('Tablet updated successfully!', 'success');
    } else {
      await API.post('/api/tablets', payload);
      showToast('Tablet added successfully!', 'success');
    }
    closeModal('tablet-modal');
    await loadTablets();
  } catch (e) {
    showToast(e.message || 'Save failed', 'error');
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save Tablet';
  }
}

/* ── Delete confirmation ─────────────────────────────────────────────────── */
function confirmDelete(id, name) {
  document.getElementById('delete-name').textContent = name;
  document.getElementById('confirm-delete-btn').onclick = () => deleteTablet(id);
  openModal('delete-modal');
}

async function deleteTablet(id) {
  try {
    await API.del(`/api/tablets/${id}`);
    showToast('Tablet deleted', 'info');
    closeModal('delete-modal');
    await loadTablets();
  } catch (e) {
    showToast('Delete failed', 'error');
  }
}

/* ── Consume tablet ──────────────────────────────────────────────────────── */
function confirmConsume(id, name, currentQty) {
  if (currentQty <= 0) {
    showToast('Tablet is out of stock', 'error');
    return;
  }
  consumeTargetId = id;
  document.getElementById('consume-name').textContent = name;
  document.getElementById('consume-current-qty').textContent = currentQty;
  document.getElementById('consume-next-qty').textContent = Math.max(0, currentQty - 1);
  openModal('consume-modal');
}

async function consumeTablet(id) {
  try {
    await API.post(`/api/tablets/${id}/consume`, {});
    showToast('Tablet consumed (1 unit deducted)', 'success');
    closeModal('consume-modal');
    consumeTargetId = null;
    await loadTablets();
  } catch (e) {
    showToast(e.message || 'Consume failed', 'error');
  }
}

/* ── Init ────────────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  populateCategoryOptions();
  loadTablets();

  document.getElementById('tablet-form').addEventListener('submit', saveTablet);
  searchInput.addEventListener('input', renderTable);
  categoryFilter.addEventListener('change', renderTable);
  stockFilter.addEventListener('change', renderTable);
  expiryFilter.addEventListener('change', renderTable);

  document.getElementById('add-btn').addEventListener('click', openAddModal);
  document.getElementById('cancel-btn').addEventListener('click', () => closeModal('tablet-modal'));
  document.getElementById('cancel-delete-btn').addEventListener('click', () => closeModal('delete-modal'));
  document.getElementById('cancel-consume-btn').addEventListener('click', () => closeModal('consume-modal'));
  document.getElementById('confirm-consume-btn').addEventListener('click', () => {
    if (consumeTargetId !== null) {
      consumeTablet(consumeTargetId);
    }
  });
});
