/* ── Constants ───────────────────────────────────────────────────────────── */
const DAYS  = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
const SLOTS = ['morning','afternoon','evening'];
const SLOT_ICONS  = { morning: '🌅', afternoon: '☀️', evening: '🌙' };
const SLOT_LABELS = { morning: 'Morning', afternoon: 'Afternoon', evening: 'Evening' };

/* ── State ───────────────────────────────────────────────────────────────── */
let weekData   = {};   // { day: { date, slots: { slot: [entries] } } }
let allTablets = [];   // for the add-modal dropdown
let pendingDay  = null;
let pendingSlot = null;
let todayDay    = '';  // e.g. "monday"

/* ── Compute week dates client-side ──────────────────────────────────────── */
function getWeekDates() {
  const today = new Date();
  const dow   = today.getDay();                    // 0=Sun..6=Sat
  const diff  = (dow === 0 ? -6 : 1 - dow);       // offset to Monday
  const monday = new Date(today);
  monday.setDate(today.getDate() + diff);

  const dates = {};
  DAYS.forEach((day, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates[day] = d;
  });
  return dates;
}

function formatDate(d) {
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

/* ── Load ─────────────────────────────────────────────────────────────────── */
async function loadWeek() {
  try {
    weekData = await API.get('/api/prescription/week');
    renderGrid();
  } catch (e) {
    showToast('Failed to load prescription', 'error');
  }
}

async function loadTablets() {
  try {
    allTablets = await API.get('/api/tablets');
  } catch (e) {}
}

/* ── Render grid ─────────────────────────────────────────────────────────── */
function renderGrid() {
  const weekDates = getWeekDates();

  // ── Set date labels in headers ────────────────────────────────────────────
  DAYS.forEach(day => {
    const el = document.getElementById(`date-${day}`);
    if (el) el.textContent = formatDate(weekDates[day]);
  });

  // ── Highlight today column ────────────────────────────────────────────────
  todayDay = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  document.querySelectorAll('.rx-day-header').forEach(th => {
    th.classList.toggle('today-col', th.dataset.day === todayDay);
  });

  // ── Week label ────────────────────────────────────────────────────────────
  const mon = weekDates['monday'];
  const sun = weekDates['sunday'];
  document.getElementById('week-label').textContent =
    `Week of ${formatDate(mon)} – ${formatDate(sun)}`;

  // ── Build tbody rows ──────────────────────────────────────────────────────
  const tbody = document.getElementById('rx-body');
  tbody.innerHTML = SLOTS.map(slot => {
    const cells = DAYS.map(day => {
      const entries = weekData[day]?.slots[slot] || [];
      const isToday = day === todayDay;
      const cellClass = `rx-cell${isToday ? ' today-col' : ''}`;

      const chips = entries.map(e => renderChip(e, isToday)).join('');
      return `<td class="${cellClass}" data-day="${day}" data-slot="${slot}">
        <div class="rx-chips">${chips}</div>
        <button class="rx-add-btn" onclick="openAddSlot('${day}','${slot}')">＋ Add</button>
      </td>`;
    }).join('');

    return `<tr>
      <td class="rx-slot-label">
        <span class="slot-icon">${SLOT_ICONS[slot]}</span>
        <span class="slot-name">${SLOT_LABELS[slot]}</span>
      </td>
      ${cells}
    </tr>`;
  }).join('');
}

function renderChip(entry, isToday) {
  const takenClass = entry.taken ? 'taken' : '';
  const takenLabel = entry.taken ? '✓ Taken' : 'Take';

  const takenBtn = isToday
    ? `<button class="rx-btn-taken ${takenClass}"
         onclick="toggleTaken(${entry.id}, ${!entry.taken}, '${entry.date}')"
         id="taken-btn-${entry.id}">
         ${takenLabel}
       </button>`
    : '';

  return `<div class="rx-chip" id="chip-${entry.id}">
    <span class="rx-chip-name" title="${entry.tablet_name}">${entry.tablet_name}</span>
    <div class="rx-chip-actions">
      ${takenBtn}
      <button class="rx-btn-remove" onclick="removeEntry(${entry.id})" title="Remove">✕</button>
    </div>
  </div>`;
}

/* ── Add slot ─────────────────────────────────────────────────────────────── */
function openAddSlot(day, slot) {
  pendingDay  = day;
  pendingSlot = slot;

  const dayLabel  = day.charAt(0).toUpperCase() + day.slice(1);
  document.getElementById('slot-label').textContent =
    `${SLOT_ICONS[slot]} ${SLOT_LABELS[slot]}  ·  ${dayLabel}`;

  // Populate dropdown — exclude already-scheduled tablets for this cell
  const scheduled = (weekData[day]?.slots[slot] || []).map(e => e.tablet_id);
  const available = allTablets.filter(t => !scheduled.includes(t.id));

  const sel = document.getElementById('slot-tablet-select');
  sel.innerHTML = `<option value="">— Choose a tablet —</option>` +
    available.map(t =>
      `<option value="${t.id}">${t.name}${t.generic_name ? ' (' + t.generic_name + ')' : ''}</option>`
    ).join('');

  openModal('add-slot-modal');
}

async function confirmAddSlot() {
  const tabletId = parseInt(document.getElementById('slot-tablet-select').value);
  if (!tabletId) { showToast('Please select a tablet', 'error'); return; }

  try {
    await API.post('/api/prescription', {
      tablet_id: tabletId,
      day_of_week: pendingDay,
      time_slot: pendingSlot,
    });
    showToast('Tablet added to schedule', 'success');
    closeModal('add-slot-modal');
    await loadWeek();
  } catch (e) {
    showToast(e.message || 'Failed to add', 'error');
  }
}

/* ── Remove entry ─────────────────────────────────────────────────────────── */
async function removeEntry(id) {
  try {
    await API.del(`/api/prescription/${id}`);
    showToast('Removed from schedule', 'info');
    await loadWeek();
  } catch (e) {
    showToast('Failed to remove', 'error');
  }
}

/* ── Toggle taken ─────────────────────────────────────────────────────────── */
async function toggleTaken(scheduleId, newTaken, logDate) {
  try {
    await API.post(`/api/prescription/${scheduleId}/log`, {
      taken: newTaken,
      date: logDate,
    });

    // Update UI without full reload
    const btn = document.getElementById(`taken-btn-${scheduleId}`);
    if (btn) {
      btn.classList.toggle('taken', newTaken);
      btn.textContent = newTaken ? '✓ Taken' : 'Take';
      btn.setAttribute('onclick', `toggleTaken(${scheduleId}, ${!newTaken}, '${logDate}')`);
    }

    showToast(newTaken ? 'Marked as taken!' : 'Marked as not taken', 'success');
  } catch (e) {
    showToast('Failed to update', 'error');
  }
}

/* ── Init ────────────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
  await Promise.all([loadWeek(), loadTablets()]);
});
