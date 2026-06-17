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
  const personalTxns = state.txns.filter(txn => {
    const kind = kindOf(txn);
    return kind === 'option' || kind === 'spending' || kind === 'general';
  });
  const subwayTxns = state.txns.filter(txn => kindOf(txn) === 'subway_cash' || kindOf(txn) === 'subway_expense');
  const optionMo = sum(monthTxns, txn => kindOf(txn) === 'option');
  const spendingMo = sum(monthTxns, txn => {
    const kind = kindOf(txn);
    return txn.type === 'out' && (kind === 'spending' || kind === 'general');
  });
  const subwayCashMo = sum(monthTxns, txn => kindOf(txn) === 'subway_cash');
  const subwayExpenseMo = sum(monthTxns, txn => kindOf(txn) === 'subway_expense');
  const personalBalance = personalTxns.reduce((total, txn) => total + (txn.type === 'in' ? Number(txn.amount) : -Number(txn.amount) || 0), 0);
  const subwayBalance = subwayTxns.reduce((total, txn) => total + (txn.type === 'in' ? Number(txn.amount) : -Number(txn.amount) || 0), 0);
  const personalOptionTxns = state.txns.filter(txn => kindOf(txn) === 'option');
  const personalSpendingTxns = state.txns.filter(txn => kindOf(txn) === 'spending' || (kindOf(txn) === 'general' && txn.type === 'out'));
  const subwayCashTxns = state.txns.filter(txn => kindOf(txn) === 'subway_cash');
  const subwayExpenseTxns = state.txns.filter(txn => kindOf(txn) === 'subway_expense');
  const isPersonal = state.financeView === 'personal';

  return `<section class="page active" id="page-finance">
    <div class="page-header"><div><div class="page-title">Finance</div><div class="page-sub">two separate dashboards, one clean money history.</div></div></div>
    <div class="finance-view-tabs" role="tablist" aria-label="Finance dashboard">
      <button class="finance-view-tab ${isPersonal ? 'active' : ''}" data-action="finance-view" data-view="personal" role="tab" aria-selected="${isPersonal}">
        <span class="finance-view-icon personal">$</span><span><strong>My finance</strong><small>options and spending</small></span>
      </button>
      <button class="finance-view-tab ${!isPersonal ? 'active subway' : ''}" data-action="finance-view" data-view="subway" role="tab" aria-selected="${!isPersonal}">
        <span class="finance-view-icon subway">S</span><span><strong>Subway</strong><small>store cash and expenses</small></span>
      </button>
    </div>
    ${isPersonal ? `<div class="finance-section-block finance-dashboard personal-dashboard">
      <div class="finance-section-head">
        <div>
          <div class="finance-eyebrow">personal dashboard</div>
          <div class="section-title">My finance</div>
          <div class="finance-section-sub">Covered calls, puts, and your regular personal spending.</div>
        </div>
        <div class="finance-section-actions">
          <button class="finance-action compact" data-action="open-txn-modal" data-kind="option">+ option premium</button>
          <button class="finance-action compact" data-action="open-txn-modal" data-kind="spending">+ spending</button>
        </div>
      </div>
      ${renderTrendCard('Personal cash flow', personalBalance, personalOptionTxns, personalSpendingTxns, 'premium earned', 'money spent')}
      <div class="kpi-row finance-kpi-row">
        <div class="kpi"><div class="kpi-label">personal balance</div><div class="kpi-value ${personalBalance >= 0 ? 'pos' : 'neg'}">${currency(personalBalance)}</div><div class="kpi-change">all time</div></div>
        <div class="kpi"><div class="kpi-label">options premium</div><div class="kpi-value pos">${currency(optionMo)}</div><div class="kpi-change">covered calls + puts this month</div></div>
        <div class="kpi"><div class="kpi-label">personal spent</div><div class="kpi-value neg">${currency(spendingMo)}</div><div class="kpi-change">this month</div></div>
      </div>
      <div class="finance-grid">
        ${renderPanel(state, 'Options: covered calls & puts', personalOptionTxns, 'option', 'personal-options')}
        ${renderPanel(state, 'Spending', personalSpendingTxns, 'spending', 'personal-spending')}
      </div>
    </div>` : `<div class="finance-section-block finance-dashboard subway-section">
      <div class="finance-section-head">
        <div>
          <div class="finance-eyebrow subway">manager dashboard</div>
          <div class="section-title">Subway manager cash</div>
          <div class="finance-section-sub">Cash collected and expenses for Walmart, Maple Grove, and Brooklyn Park stores.</div>
        </div>
        <div class="finance-section-actions">
          <button class="finance-action compact" data-action="open-txn-modal" data-kind="subway_cash">+ Subway cash</button>
          <button class="finance-action compact" data-action="open-txn-modal" data-kind="subway_expense">+ Subway expense</button>
        </div>
      </div>
      ${renderTrendCard('Subway cash flow', subwayBalance, subwayCashTxns, subwayExpenseTxns, 'cash collected', 'store expenses', true)}
      <div class="kpi-row finance-kpi-row subway-kpi-row">
        <div class="kpi"><div class="kpi-label">Subway net</div><div class="kpi-value ${subwayBalance >= 0 ? 'pos' : 'neg'}">${currency(subwayBalance)}</div><div class="kpi-change">cash minus expenses, all time</div></div>
        <div class="kpi"><div class="kpi-label">Subway cash</div><div class="kpi-value pos">${currency(subwayCashMo)}</div><div class="kpi-change">collected this month</div></div>
        <div class="kpi"><div class="kpi-label">Subway expenses</div><div class="kpi-value neg">${currency(subwayExpenseMo)}</div><div class="kpi-change">this month</div></div>
      </div>
      <div class="finance-grid subway-grid">
        ${renderPanel(state, 'Cash collected', subwayCashTxns, 'subway_cash', 'subway-cash')}
        ${renderPanel(state, 'Store expenses', subwayExpenseTxns, 'subway_expense', 'subway-expenses')}
      </div>
    </div>`}
  </section>`;
}

function renderTrendCard(title: string, balance: number, income: Transaction[], spending: Transaction[], incomeLabel: string, spendingLabel: string, subway = false): string {
  const months = recentMonths(income, spending);
  const max = Math.max(1, ...months.flatMap(month => [month.income, month.spending]));
  return `<div class="finance-trend-card ${subway ? 'subway' : ''}">
    <div class="finance-trend-summary">
      <div class="finance-eyebrow">${title}</div>
      <strong class="finance-trend-balance ${balance >= 0 ? 'pos' : 'neg'}">${currency(balance)}</strong>
      <span>current all-time balance</span>
      <div class="finance-trend-legend"><i class="income"></i>${incomeLabel}<i class="spending"></i>${spendingLabel}</div>
    </div>
    <div class="finance-trend-chart" aria-label="Last four months cash flow">
      ${months.map(month => `<div class="finance-trend-month">
        <div class="finance-bars"><i class="income" style="height:${barHeight(month.income, max)}%"></i><i class="spending" style="height:${barHeight(month.spending, max)}%"></i></div>
        <span>${month.label}</span>
      </div>`).join('')}
    </div>
  </div>`;
}

function recentMonths(income: Transaction[], spending: Transaction[]): Array<{ label: string; income: number; spending: number }> {
  const now = new Date();
  return Array.from({ length: 4 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (3 - index), 1);
    const matchesMonth = (txn: Transaction) => {
      const txnDate = new Date(txn.date);
      return txnDate.getMonth() === date.getMonth() && txnDate.getFullYear() === date.getFullYear();
    };
    return {
      label: date.toLocaleDateString('en-US', { month: 'short' }),
      income: sum(income, matchesMonth),
      spending: sum(spending, matchesMonth)
    };
  });
}

function barHeight(value: number, max: number): number {
  return value > 0 ? Math.max(8, Math.round((value / max) * 100)) : 3;
}

function renderPanel(state: AppState, title: string, txns: Transaction[], kind: FinanceKind, panelKey: string): string {
  const expanded = Boolean(state.financeExpandedPanels[panelKey]);
  const ordered = [...txns].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const visible = expanded ? ordered : ordered.slice(0, 5);
  const rows = visible.length
    ? visible.map(renderTxnRow).join('')
    : `<div class="empty-inline">no entries yet</div>`;
  return `<div class="finance-panel">
    <div class="finance-panel-head"><div class="section-title">${title}</div><button class="btn-ghost small" data-action="open-txn-modal" data-kind="${kind}">+ add</button></div>
    <div class="txn-list">${rows}</div>
    ${ordered.length > 5 ? `<button class="finance-show-all" data-action="toggle-finance-panel" data-panel="${panelKey}">${expanded ? 'show recent 5' : `show all ${ordered.length}`}</button>` : ''}
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
      <button class="btn-primary" id="m-tsave" data-action="save-txn">save</button>
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
