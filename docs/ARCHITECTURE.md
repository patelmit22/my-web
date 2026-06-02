# mitpatel.family architecture

This is a static Vite + TypeScript app deployed by Netlify from the `main` branch.

## Entry points

- `index.html` mounts the app at `#app`.
- `src/main.ts` imports CSS and starts `DashboardApp`.
- `src/app.ts` owns routing, event delegation, modal actions, Firebase subscriptions, Google Drive actions, and save/delete workflows.

## Pages

Each page module returns HTML strings for one dashboard tab:

- `src/pages/HomePage.ts` - dashboard tiles and headline.
- `src/pages/FinancePage.ts` - personal finance, covered calls/puts, spending, and Subway cash/expenses.
- `src/pages/WorkPage.ts` - to-do/doing/done work board and work media.
- `src/pages/AtlasPage.ts` - story sections, search/filter, entries, media, and PDF export source list.
- `src/pages/GamesPage.ts` - game library, game detail modal, clips, covers, and media.
- `src/pages/DocumentsPage.ts` - Google Drive document locker.
- `src/pages/SettingsPage.ts` - owner/her access settings.
- `src/pages/AuthPage.ts` - Firebase email/password sign-in.

## Data and APIs

- `src/api/firebaseClient.ts` initializes Firebase.
- `src/api/authApi.ts` wraps Firebase Auth and current-user role lookup.
- `src/api/databaseApi.ts` wraps Realtime Database reads/writes for `entries`, `txns`, `tasks`, `games`, and `config/her`.
- `src/api/driveApi.ts` wraps Google Drive OAuth, list, upload, and delete.

UI modules should not call Firebase directly. Add new data operations to `src/api/*` first.

## State and types

- `src/state/appState.ts` contains in-memory UI state and cached Firebase data.
- `src/types/models.ts` contains shared model types.

If a new field is saved to Firebase, add it to `models.ts` first.

## Styling

CSS is split by purpose:

- `src/styles/base.css` - fonts, CSS variables, body background.
- `src/styles/layout.css` - shell layout, sidebar, main area, broad mobile shell rules.
- `src/styles/components.css` - modals, fields, buttons, upload previews, toast, lightbox.
- `src/styles/pages.css` - page-specific cards, grids, finance/work/atlas/games/documents/settings, and final phone overrides.

Phone-specific page overrides live at the bottom of `src/styles/pages.css` because that file loads last and must win over desktop page grids.

## Deployment

Netlify builds with:

```toml
[build]
  command = "npm run build"
  publish = "dist"
```

Netlify environment variables currently needed:

- `VITE_GOOGLE_CLIENT_ID` for Google Drive document uploads.

Firebase config is client-side public config. Realtime Database access is controlled by Firebase Auth plus database rules.

## Common changes

- Change a tab UI: edit its file under `src/pages/`.
- Add a save/delete operation: edit `src/api/databaseApi.ts` and the matching handler in `src/app.ts`.
- Add a new model field: edit `src/types/models.ts`, then update page render and save logic.
- Fix phone layout: prefer appending targeted rules to the mobile override block at the bottom of `src/styles/pages.css`.
