# production-dashboard

Next.js App Router dashboard for production analytics. React 19, Tailwind CSS 4, Recharts.

## Commands

`corepack enable` is unavailable in this environment, so run pnpm through corepack:

```bash
corepack pnpm@10.34.3 install
corepack pnpm@10.34.3 run dev
corepack pnpm@10.34.3 run build
corepack pnpm@10.34.3 exec tsc --noEmit
```

## Project structure

- `src/app/` - App Router entry. `layout.tsx` renders `ClientAppShell`; route pages only
  supply redirects, the shell renders the UI.
- `src/components/AppShell.tsx` - shell state owner (active nav key, sidebar, palette).
- `src/components/ClientAppShell.tsx` - client wrapper that maps the pathname to a nav key.
- `src/components/shell/` - `SidebarNav`, `ShellTopbar`, `ShellContent`, `CommandPalette`,
  `Icon`, `commands`, `shellPage`.
- `src/components/providers/` - `ThemeProvider` (dark mode) and `LanguageProvider` (ID / EN).
  Both reset on reload; nothing is persisted.
- `src/config/navigation.ts` - nav registry: groups, labels, keys, hrefs, aliases, resolvers.
- `src/data/` - mock datasets, one file per feature area.
- `src/features/<area>/` - one folder per dashboard; local CSS lives beside the feature.
- `src/styles/` - owner-scoped stylesheets imported by `src/app/globals.css`.
- `ARCHITECTURE.md` - rendering model, navigation rules and known TypeScript caveats.

## Conventions

- Double quotes for strings, 2-space indentation, semicolons.
- Feature components are default exports; named exports are used only for prop types.
- Do not add re-export shims for deleted paths. `src/components/dashboard/`, `src/cost/`,
  `src/lib/` and the root-level `*Dashboard.tsx` files are gone by design.
- Dashboard files are minified single-line JSX. Edit them surgically; do not run a formatter.
- Keep display text, numbers and CSS class names unchanged unless the task asks for a change.
- Write files as UTF-8 from an editor or Node. Rewriting UTF-8 files with PowerShell string
  cmdlets has corrupted the non-ASCII glyphs in this repo before.
- No comments unless they are requested.

## Checks

Run both before committing:

```bash
corepack pnpm@10.34.3 exec tsc --noEmit
corepack pnpm@10.34.3 run build
```
