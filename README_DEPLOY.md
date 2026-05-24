# mitpatel.family dashboard

This project is now a Vite + TypeScript static app.

## Local development

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
```

The build output goes to `dist`.

## Netlify settings

- Build command: `npm run build`
- Publish directory: `dist`
- Branch: `main`

These are also configured in `netlify.toml`.

## Firebase Auth

The dashboard uses Firebase email/password sign-in.

In Firebase console for project `our-atlas-6f5f7`:

1. Go to **Authentication**.
2. Go to **Sign-in method**.
3. Enable **Email/Password**.
4. Create users in **Authentication** > **Users** for each person who should access the dashboard.

Owner email currently built into the app:

- `patelmit4127@gmail.com`

After signing in as the owner, open **Settings** inside the dashboard and add her email so the app labels her entries as `Her`.
