import type { AppState } from '../state/appState';
import { currency, fmtDate } from '../utils/format';
import { esc } from '../utils/sanitize';

export function renderFinancePage(state: AppState): string {
  const month = new Date().getMonth();
  const year = new Date().getFullYear();
  const monthTxns = state.txns.filter(t => {
    const date = new Date(t.date);
    return date.getMonth() === month && date.getFullYear() === year;
  });
  const incomeMo = monthTxns.filter(t => t.type === 'in').reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const outMo = monthTxns.filter(t => t.type === 'out').reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const balance = state.txns.reduce((sum, t) => sum + (t.type === 'in' ? Number(t.amount) : -Number(t.amount) || 0), 0);
  const rows = state.txns.length
    ? state.txns.slice(0, 50).map(t => `<div class="txn">
        <div class="txn-icon ${t.type === 'out' ? 'out' : ''}">${t.type === 'in' ? '↓' : '↑'}</div>
        <div class="txn-info"><div class="txn-name">${esc(t.name)}</div><div class="txn-meta">${fmtDate(t.date)} · ${esc(t.cat || '—')}${t.note ? ` · ${esc(t.note)}` : ''}</div></div>
        <div class="txn-amount ${t.type === 'in' ? 'pos' : 'neg'}">${t.type === 'in' ? '+' : '−'}${currency(Number(t.amount))}</div>
        <button class="txn-del" data-action="delete-txn" data-id="${esc(t.id)}">×</button>
      </div>`).join('')
    : '<div style="color:var(--ink-mute);font-size:0.9rem;padding:1rem 0">no transactions yet — hit + add</div>';

  return `<section class="page active" id="page-finance">
    <div class="page-header"><div><div class="page-title">Finance</div><div class="page-sub">track every dollar in and out</div></div><button class="btn-accent" data-action="open-txn-modal">+ add</button></div>
    <div class="kpi-row">
      <div class="kpi"><div class="kpi-label">balance</div><div class="kpi-value ${balance >= 0 ? 'pos' : 'neg'}">${currency(balance)}</div><div class="kpi-change">all time</div></div>
      <div class="kpi"><div class="kpi-label">income (mo)</div><div class="kpi-value pos">${currency(incomeMo)}</div><div class="kpi-change">this month</div></div>
      <div class="kpi"><div class="kpi-label">spent (mo)</div><div class="kpi-value neg">${currency(outMo)}</div><div class="kpi-change">this month</div></div>
    </div>
    <div class="section-title">recent activity</div><div class="txn-list">${rows}</div>
  </section>`;
}

export function renderTxnModal(selectedType: 'in' | 'out'): string {
  return `<div class="modal-backdrop" id="modal-txn">
    <div class="modal"><button class="modal-close" data-action="close-modal" data-modal="modal-txn">×</button>
      <div class="modal-title">new transaction</div>
      <div class="field"><label class="field-label">type</label><div class="chips" id="m-ttype">
        <button class="chip ${selectedType === 'in' ? 'sel' : ''}" data-action="select-txn-type" data-value="in">income</button>
        <button class="chip ${selectedType === 'out' ? 'sel' : ''}" data-action="select-txn-type" data-value="out">expense</button>
      </div></div>
      <div class="field"><label class="field-label">what for?</label><input class="field-input" id="m-tname" placeholder="e.g. paycheck / groceries"></div>
      <div class="field-row"><div class="field"><label class="field-label">amount ($)</label><input class="field-input" id="m-tamt" type="number" step="0.01" placeholder="0.00"></div><div class="field"><label class="field-label">category</label><input class="field-input" id="m-tcat" placeholder="e.g. food, rent"></div></div>
      <div class="field"><label class="field-label">notes (optional)</label><input class="field-input" id="m-tnote"></div>
      <button class="btn-primary" data-action="save-txn">save</button>
    </div>
  </div>`;
}
