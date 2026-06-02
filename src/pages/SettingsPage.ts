import type { AppState } from '../state/appState';
import { esc } from '../utils/sanitize';

export function renderSettingsPage(state: AppState): string {
  const her = state.herConfig;
  return `<section class="page active" id="page-settings">
    <div class="page-header"><div><div class="page-title">Settings</div><div class="page-sub">manage who can sign in</div></div></div>
    <div class="settings-stack">
      <div class="settings-card">
        <div class="settings-card-title">you (owner)</div>
        <div id="owner-email" class="settings-muted settings-email">${esc(state.currentUser?.email || '')}</div>
      </div>
      <div class="settings-card">
        <div class="settings-card-title">her access</div>
        <div class="settings-muted settings-help">create her as a Firebase Authentication user with email/password, then add the same email here so the app labels her entries as Her.</div>
        <div class="field"><label class="field-label">her email</label><input class="field-input" id="her-email" type="email" placeholder="her@example.com" value="${esc(her?.email || '')}"></div>
        <div class="field"><label class="field-label">her display name</label><input class="field-input" id="her-name" type="text" placeholder="e.g. Riya" value="${esc(her?.display || '')}"></div>
        <div class="settings-actions">
          <button class="btn-primary" data-action="save-her">save</button>
          <button class="btn-ghost ${her?.email ? '' : 'hidden'}" data-action="remove-her">remove her access</button>
        </div>
        <div id="her-status" class="settings-muted settings-status">${her?.email ? `✓ ${esc(her.email)} can sign in as "${esc(her.display || 'Her')}"` : 'no one added yet'}</div>
      </div>
    </div>
  </section>`;
}
