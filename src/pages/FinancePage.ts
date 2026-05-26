import type { AppState } from '../state/appState';
import type { FinanceKind, Transaction } from '../types/models';
import { currency, fmtDate } from '../utils/format';
import { esc } from '../utils/sanitize';

const stores: Record<string, string> = {
  walmart: 'Walmart',
  maple_grove: 'Maple Grove',
  brooklyn_park: 'Brooklyn Park'
};

function kindOf(txn: Transaction): FinanceKind {
  return txn.kind || (txn.type === 'out' ? 'spending' : 'general');
}

function sum(txns: Transaction[], predicate: (txn: Transaction) => boolean): number {
  return txns.filter(predicate).reduce((total, txn) => total + Number(txn.amount || 0), 0);
}

export function renderFinancePage(state: AppState): string {
  const month = new Date().getMonth();
  const year = new Date().getFullYear();
  const monthTxns = state.txns.filter(t => {
    const date = new Date(t.date);
    return date.getMonth() === month && date.getFullYear() === year;
  });
  const optionMo = sum(monthTxns, txn => kindOf(txn) === 'option');
  const spendingMo = sum(monthTxns, txn => txn.type === 'out');
  const subwayCashMo = sum(monthTxns, txn => kindOf(txn) === 'subway_cash');
  const balance = state.txns.reduce((total, txn) => total + (txn.type === 'in' ? Number(txn.amount) : -Number(txn.amount) || 0), 0);

  return `<section class="page active" id="page-finance">
    <div class="page-header"><div><div class="page-title">Finance</div><div class="page-sub">covered calls, puts, spending, and Subway cash tracking</div></div></div>
    <div class="finance-actions">
      <button class="finance-action" data-action="open-txn-modal" data-kind="option">+ option premium</button>
      <button class="finance-action" data-action="open-txn-modal" data-kind="spending">+ spending</button>
      <button class="finance-action" data-action="open-txn-modal" data-kind="subway_cash">+ Subway cash</button>
      <button class="finance-action" data-action="open-txn-modal" data-kind="subway_expense">+ Subway expense</button>
    </div>
    <div class="kpi-row">
      <div class="kpi"><div class="kpi-label">balance</div><div class="kpi-value ${balance >= 0 ? 'pos' : 'neg'}">${currency(balance)}</div><div class="kpi-change">all time</div></div>
      <div class="kpi"><div class="kpi-label">options premium</div><div class="kpi-value pos">${currency(optionMo)}</div><div class="kpi-change">covered calls + puts this month</div></div>
      <div class="kpi"><div class="kpi-label">Subway cash</div><div class="kpi-value pos">${currency(subwayCashMo)}</div><div class="kpi-change">collected this month</div></div>
      <div class="kpi"><div class="kpi-label">spent</div><div class="kpi-value neg">${currency(spendingMo)}</div><div class="kpi-change">this month</div></div>
    </div>
    <div class="finance-section-block">
      <div class="finance-section-head">
        <div>
          <div class="section-title">Investing & personal money</div>
          <div class="finance-section-sub">Covered calls, puts, and regular spending stay here.</div>
        </div>
      </div>
      <div class="finance-grid">
        ${renderPanel('Options: covered calls & puts', state.txns.filter(txn => kindOf(txn) === 'option'), 'option')}
        ${renderPanel('Spending', state.txns.filter(txn => kindOf(txn) === 'spending' || (kindOf(txn) === 'general' && txn.type === 'out')), 'spending')}
      </div>
    </div>
    <div class="finance-section-block subway-section">
      <div class="finance-section-head">
        <div>
          <div class="section-title">Subway manager cash</div>
          <div class="finance-section-sub">Cash collected and expenses for Walmart, Maple Grove, and Brooklyn Park stores.</div>
        </div>
        <div class="finance-section-actions">
          <button class="finance-action compact" data-action="open-txn-modal" data-kind="subway_cash">+ cash</button>
          <button class="finance-action compact" data-action="open-txn-modal" data-kind="subway_expense">+ expense</button>
        </div>
      </div>
      <div class="finance-grid subway-grid">
        ${renderPanel('Cash collected', state.txns.filter(txn => kindOf(txn) === 'subway_cash'), 'subway_cash')}
        ${renderPanel('Store expenses', state.txns.filter(txn => kindOf(txn) === 'subway_expense'), 'subway_expense')}
      </div>
    </div>
  </section>`;
}

function renderPanel(title: string, txns: Transaction[], kind: FinanceKind): string {
  const rows = txns.length
    ? txns.slice(0, 12).map(renderTxnRow).join('')
    : `<div class="empty-inline">no entries yet</div>`;
  return `<div class="finance-panel">
    <div class="finance-panel-head"><div class="section-title">${title}</div><button class="btn-ghost small" data-action="open-txn-modal" data-kind="${kind}">+ add</button></div>
    <div class="txn-list">${rows}</div>
  </div>`;
}

function renderTxnRow(t: Transaction): string {
  const isOut = t.type === 'out';
  const meta = [
    fmtDate(t.date),
    t.symbol ? t.symbol.toUpperCase() : '',
    t.optionType ? (t.optionType === 'covered_call' ? 'covered call' : 'put') : '',
    t.store ? stores[t.store] : '',
    t.cat || '',
    t.note || ''
  ].filter(Boolean).join(' · ');
  return `<div class="txn">
    <div class="txn-icon ${isOut ? 'out' : ''}">${isOut ? '↑' : '↓'}</div>
    <div class="txn-info"><div class="txn-name">${esc(t.name)}</div><div class="txn-meta">${esc(meta || '—')}</div></div>
    <div class="txn-amount ${isOut ? 'neg' : 'pos'}">${isOut ? '−' : '+'}${currency(Number(t.amount))}</div>
    <button class="txn-del" data-action="delete-txn" data-id="${esc(t.id)}">×</button>
  </div>`;
}

export function renderTxnModal(kind: FinanceKind): string {
  return `<div class="modal-backdrop" id="modal-txn">
    <div class="modal finance-modal"><button class="modal-close" data-action="close-modal" data-modal="modal-txn">×</button>
      <div class="modal-title">${modalTitle(kind)}</div>
      <div class="field"><label class="field-label">finance section</label><div class="chips" id="m-tkind">
        ${kindChip(kind, 'option', 'options')}
        ${kindChip(kind, 'spending', 'spending')}
        ${kindChip(kind, 'subway_cash', 'Subway cash')}
        ${kindChip(kind, 'subway_expense', 'Subway expense')}
      </div></div>
      ${renderKindFields(kind)}
      <div class="field"><label class="field-label">amount ($)</label><input class="field-input" id="m-tamt" type="number" step="0.01" placeholder="0.00"></div>
      <div class="field"><label class="field-label">notes (optional)</label><input class="field-input" id="m-tnote"></div>
      <button class="btn-primary" data-action="save-txn">save</button>
    </div>
  </div>`;
}

function kindChip(active: FinanceKind, kind: FinanceKind, label: string): string {
  return `<button class="chip ${active === kind ? 'sel' : ''}" data-action="select-txn-kind" data-kind="${kind}">${label}</button>`;
}

function modalTitle(kind: FinanceKind): string {
  if (kind === 'option') return 'new covered call / put income';
  if (kind === 'spending') return 'new spending entry';
  if (kind === 'subway_cash') return 'new Subway cash collection';
  if (kind === 'subway_expense') return 'new Subway expense';
  return 'new finance entry';
}

function renderKindFields(kind: FinanceKind): string {
  if (kind === 'option') {
    return `<div class="field-row">
      <div class="field"><label class="field-label">symbol</label><input class="field-input" id="m-tsymbol" placeholder="AAPL / TSLA / SPY"></div>
      <div class="field"><label class="field-label">type</label><select class="field-sel" id="m-toption"><option value="covered_call">covered call</option><option value="put">put</option></select></div>
    </div>`;
  }
  if (kind === 'subway_cash' || kind === 'subway_expense') {
    return `<div class="field-row">
      <div class="field"><label class="field-label">store</label><select class="field-sel" id="m-tstore"><option value="walmart">Walmart</option><option value="maple_grove">Maple Grove</option><option value="brooklyn_park">Brooklyn Park</option></select></div>
      <div class="field"><label class="field-label">${kind === 'subway_cash' ? 'cash type' : 'expense for'}</label><input class="field-input" id="m-tname" placeholder="${kind === 'subway_cash' ? 'weekly cash collection' : 'supplies / repair / shortage'}"></div>
    </div>`;
  }
  return `<div class="field"><label class="field-label">what did you spend on?</label><input class="field-input" id="m-tname" placeholder="food, rent, gas, bills..."></div>
    <div class="field"><label class="field-label">category</label><input class="field-input" id="m-tcat" placeholder="food, rent, gas"></div>`;
}
