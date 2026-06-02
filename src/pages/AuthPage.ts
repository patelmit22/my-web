export function renderAuthPage(): string {
  return `<div id="auth-screen" class="screen active">
    <div class="auth-card">
      <div class="logo-mark">mp</div>
      <div class="auth-title">mitpatel.family</div>
      <div class="auth-sub">sign in with your Firebase email and password</div>
      <form id="auth-form">
        <input class="auth-input" id="email-input" type="email" placeholder="you@example.com" autocomplete="email">
        <input class="auth-input auth-password-input" id="password-input" type="password" placeholder="password" autocomplete="current-password">
        <button class="btn-primary" id="email-btn" type="submit">sign in →</button>
      </form>
      <div class="auth-msg" id="auth-msg"></div>
      <div class="auth-hint">only users created in Firebase Authentication can access this dashboard.</div>
    </div>
  </div>`;
}
