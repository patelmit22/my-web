import type { AppState } from '../state/appState';
import { esc } from '../utils/sanitize';

export function renderSettingsPage(state: AppState): string {
  const her = state.herConfig;
  return `<section class="page active" id="page-settings">
    <div class="page-header"><div><div class="page-title">Settings</div><div class="page-sub">manage who can sign in</div></div></div>
    <div style="max-width:560px">
      <div style="background:linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.02));border:1px solid var(--glass-border);border-radius:16px;padding:1.4rem 1.5rem;margin-bottom:1rem">
        <div style="font-family:var(--font-ui);font-weight:600;margin-bottom:0.3rem">you (owner)</div>
        <div id="owner-email" style="font-family:var(--font-mono);font-size:0.85rem;margin-top:0.5rem;color:var(--ink-dim)">${esc(state.currentUser?.email || '')}</div>
      </div>
      <div style="background:linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.02));border:1px solid var(--glass-border);border-radius:16px;padding:1.4rem 1.5rem">
        <div style="font-family:var(--font-ui);font-weight:600;margin-bottom:0.3rem">her access</div>
        <div style="color:var(--ink-dim);font-size:0.85rem;margin-bottom:1rem">create her as a Firebase Authentication user with email/password, then add the same email here so the app labels her entries as Her.</div>
        <div class="field"><label class="field-label">her email</label><input class="field-input" id="her-email" type="email" placeholder="her@example.com" value="${esc(her?.email || '')}"></div>
        <div class="field"><label class="field-label">her display name</label><input class="field-input" id="her-name" type="text" placeholder="e.g. Riya" value="${esc(her?.display || '')}"></div>
        <button class="btn-primary" data-action="save-her" style="margin-top:0.5rem">save</button>
        <button class="btn-ghost" data-action="remove-her" style="margin-top:0.5rem;margin-left:0.5rem;${her?.email ? '' : 'display:none'}">remove her access</button>
        <div id="her-status" style="margin-top:0.8rem;font-family:var(--font-mono);font-size:0.78rem;color:var(--ink-mute)">${her?.email ? `✓ ${esc(her.email)} can sign in as "${esc(her.display || 'Her')}"` : 'no one added yet'}</div>
      </div>
    </div>
  </section>`;
}
