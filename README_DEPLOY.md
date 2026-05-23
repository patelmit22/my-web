# mitpatel.family dashboard deploy

Finished dashboard file:

- `index.html`

Packaged upload:

- `mitpatel-family-dashboard.zip`

## Upload to your domain

1. Go to Netlify and open the site connected to `mitpatel.family`.
2. Open **Deploys**.
3. Drag the whole `index.html` file onto the deploy area, or upload `mitpatel-family-dashboard.zip`.
4. Wait for deploy to finish.
5. Open `https://mitpatel.family/`.

## Firebase Auth setup required

The new dashboard uses email-link sign-in.

In Firebase console for project `our-atlas-6f5f7`:

1. Go to **Authentication**.
2. Click **Get started** if it is not enabled.
3. Go to **Sign-in method**.
4. Enable **Email/Password**.
5. Turn on **Email link / passwordless sign-in**.
6. Go to **Settings** > **Authorized domains**.
7. Add `mitpatel.family`.

Owner email currently built into the app:

- `patelmit4127@gmail.com`

After you sign in as the owner, open **Settings** inside the dashboard and add her email.
