import type { AppState } from '../state/appState';
import { esc } from '../utils/sanitize';
import { mergeTimezoneConfig } from '../utils/timezones';

export function renderSettingsPage(state: AppState): string {
  const her = state.herConfig;
  const tz = mergeTimezoneConfig(state.timezoneConfig);
  const visit = state.nextVisit;
  const isOwner = state.currentUser?.role === 'me';
  return `<section class="page active" id="page-settings">
    <div class="page-header"><div><div class="page-title">Settings</div><div class="page-sub">manage who can sign in</div></div></div>
    <div class="settings-stack">
      <div class="settings-card">
        <div class="settings-card-title">you (owner)</div>
        <div id="owner-email" class="settings-muted settings-email">${esc(state.currentUser?.email || '')}</div>
      </div>
      ${isOwner ? `<div class="settings-card">
        <div class="settings-card-title">her access</div>
        <div class="settings-muted settings-help">create her as a Firebase Authentication user with email/password, then add the same email here so the app labels her entries as Her.</div>
        <div class="field"><label class="field-label">her email</label><input class="field-input" id="her-email" type="email" placeholder="her@example.com" value="${esc(her?.email || '')}"></div>
        <div class="field"><label class="field-label">her display name</label><input class="field-input" id="her-name" type="text" placeholder="e.g. Riya" value="${esc(her?.display || '')}"></div>
        <div class="settings-actions">
          <button class="btn-primary" data-action="save-her">save</button>
          <button class="btn-ghost ${her?.email ? '' : 'hidden'}" data-action="remove-her">remove her access</button>
        </div>
        <div id="her-status" class="settings-muted settings-status">${her?.email ? `✓ ${esc(her.email)} can sign in as "${esc(her.display || 'Her')}"` : 'no one added yet'}</div>
      </div>` : ''}
      <div class="settings-card">
        <div class="settings-card-title">long-distance clocks</div>
        <div class="settings-muted settings-help">home shows both cities and the other person's local-day status.</div>
        ${isOwner ? `<div class="distance-settings-grid">
          <div class="field"><label class="field-label">your city</label><input class="field-input" id="tz-me-city" type="text" value="${esc(tz.meCity)}" placeholder="Minneapolis"></div>
          <div class="field"><label class="field-label">your timezone</label><input class="field-input" id="tz-me-tz" type="text" value="${esc(tz.meTz)}" placeholder="America/Chicago"></div>
          <div class="field"><label class="field-label">her city</label><input class="field-input" id="tz-her-city" type="text" value="${esc(tz.herCity)}" placeholder="Ahmedabad"></div>
          <div class="field"><label class="field-label">her timezone</label><input class="field-input" id="tz-her-tz" type="text" value="${esc(tz.herTz)}" placeholder="Asia/Kolkata"></div>
        </div>
        <div class="settings-actions"><button class="btn-primary" data-action="save-timezones">save clocks</button></div>` : `<div class="settings-muted settings-status">${esc(tz.meCity)} (${esc(tz.meTz)}) · ${esc(tz.herCity)} (${esc(tz.herTz)})<br>Only Mit can edit city and timezone settings.</div>`}
      </div>
      <div class="settings-card">
        <div class="settings-card-title">next visit</div>
        <div class="settings-muted settings-help">this shows on the home page so both of you can see the countdown.</div>
        <div class="field"><label class="field-label">date</label><input class="field-input" id="next-visit-date" type="date" value="${esc(visit?.date || '')}"></div>
        <div class="field"><label class="field-label">note</label><textarea class="field-input settings-textarea" id="next-visit-note" placeholder="airport, plan, little note...">${esc(visit?.note || '')}</textarea></div>
        <div class="settings-actions">
          <button class="btn-primary" data-action="save-next-visit">save next visit</button>
          <button class="btn-ghost ${visit?.date ? '' : 'hidden'}" data-action="clear-next-visit">clear</button>
        </div>
        <div class="settings-muted settings-status">${visit?.date ? `saved for ${esc(visit.date)}${visit.setBy ? ` by ${esc(visit.setBy === 'her' ? 'Her' : 'Mit')}` : ''}` : 'no visit date set yet'}</div>
      </div>
    </div>
  </section>`;
}
