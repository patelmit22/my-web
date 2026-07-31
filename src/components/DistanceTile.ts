import type { AppState } from '../state/appState';
import type { UserRole } from '../types/models';
import { esc } from '../utils/sanitize';
import { mergeTimezoneConfig, partnerStatus, visitText, zonedNow } from '../utils/timezones';

type PersonKey = 'me' | 'her';

export function renderDistanceTile(state: AppState): string {
  const config = mergeTimezoneConfig(state.timezoneConfig);
  const role = (state.currentUser?.role || 'me') as UserRole;
  const order: PersonKey[] = role === 'her' ? ['her', 'me'] : ['me', 'her'];
  const other: PersonKey = role === 'her' ? 'me' : 'her';
  const visitLabel = visitText(state.nextVisit);
  const visitNote = state.nextVisit?.note?.trim();

  return `<section class="distance-tile" aria-label="long-distance clocks">
    <div class="distance-head">
      <div>
        <span>long-distance line</span>
        <strong>${role === 'her' ? 'Ahmedabad ↔ Minneapolis' : 'Minneapolis ↔ Ahmedabad'}</strong>
      </div>
      <button class="distance-visit-btn" data-action="edit-next-visit">
        <span data-distance-visit-label data-visit-date="${esc(state.nextVisit?.date || '')}">${esc(visitLabel || 'set our next visit →')}</span>
      </button>
    </div>
    <div class="distance-clocks">
      ${order.map(key => renderClock(key, config, key === other)).join('')}
    </div>
    ${visitNote ? `<div class="distance-note">${esc(visitNote)}</div>` : ''}
  </section>`;
}

export function mountDistanceTile(root: ParentNode = document): () => void {
  const update = () => refreshDistanceTile(root);
  update();
  const timer = window.setInterval(update, 60000);
  return () => window.clearInterval(timer);
}

function renderClock(key: PersonKey, config: ReturnType<typeof mergeTimezoneConfig>, showStatus: boolean): string {
  const city = key === 'me' ? config.meCity : config.herCity;
  const tz = key === 'me' ? config.meTz : config.herTz;
  const name = key === 'me' ? 'Mit' : 'Shrushti';
  const now = zonedNow(tz);
  return `<div class="distance-clock" data-distance-clock data-timezone="${esc(tz)}" ${showStatus ? `data-status-name="${esc(name)}"` : ''}>
    <div class="distance-clock-top">
      <span class="distance-person">${esc(name)}</span>
      <span class="distance-city">${esc(city)}</span>
    </div>
    <div class="distance-time-row">
      <span class="distance-sky" data-distance-icon>${now.icon}</span>
      <strong class="distance-time" data-distance-time>${esc(now.time)}</strong>
    </div>
    <div class="distance-date" data-distance-date>${esc(now.date)}</div>
    ${showStatus ? `<div class="distance-status" data-distance-status>${esc(partnerStatus(now.hour, name))}</div>` : ''}
  </div>`;
}

function refreshDistanceTile(root: ParentNode): void {
  root.querySelectorAll<HTMLElement>('[data-distance-clock]').forEach(clock => {
    const tz = clock.dataset.timezone || 'UTC';
    const current = zonedNow(tz);
    const icon = clock.querySelector<HTMLElement>('[data-distance-icon]');
    const time = clock.querySelector<HTMLElement>('[data-distance-time]');
    const date = clock.querySelector<HTMLElement>('[data-distance-date]');
    const status = clock.querySelector<HTMLElement>('[data-distance-status]');
    if (icon) icon.textContent = current.icon;
    if (time) time.textContent = current.time;
    if (date) date.textContent = current.date;
    if (status && clock.dataset.statusName) status.textContent = partnerStatus(current.hour, clock.dataset.statusName);
  });

  root.querySelectorAll<HTMLElement>('[data-distance-visit-label]').forEach(label => {
    const date = label.dataset.visitDate || '';
    label.textContent = visitText(date ? { date } : null) || 'set our next visit →';
  });
}
