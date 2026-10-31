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

- `src/app/layout.tsx` - plain html/body root layout. The shell lives in
  `src/app/(dashboard)/layout.tsx`, which renders `ClientAppShell`; route pages under
  `(dashboard)` return null or redirect and the shell renders the UI.
- `src/app/dm-dashboard/` and `src/features/dm-dashboard/` - the DM dashboard, a separate
  product with its own routes, login and backend. Do not modify it and do not import from it.
- `src/components/AppShell.tsx` - shell state owner (active nav key, sidebar, palette).
- `src/components/ClientAppShell.tsx` - client wrapper that maps the pathname to a nav key.
- `src/components/shell/` - `SidebarNav`, `ShellTopbar`, `ShellContent`, `CommandPalette`,
  `Icon`, `commands`, `shellPage`.
- `src/components/providers/` - `ThemeProvider` (dark mode), `LanguageProvider` (ID / EN),
  `DisplayModeProvider` and `RoleProvider` (role and PIC area). Theme and language reset on
  reload.
- `src/config/navigation.ts` - nav registry: groups, labels, keys, hrefs, aliases, resolvers.
- `src/data/` - mock datasets, one file per feature area.
- `src/features/<name>/` - one folder per dashboard, area or module (for example `assembly`,
  `cost`, `morning-meeting`, `pic-qc`, `safety`); local CSS lives beside the feature.
- `src/styles/` - owner-scoped stylesheets imported by `src/app/globals.css`.
- `ARCHITECTURE.md` - rendering model, navigation rules and known TypeScript caveats. Its
  rendering section predates the `(dashboard)` layout split; this file wins on conflicts.

## Module boundaries

- Morning Meeting and Production KPI share the shell, auth and access config. Keep their
  feature code in separate folders and do not import one from the other.
- All role, area and menu access rules live in `src/config/access.ts`. Do not hard-code role
  checks elsewhere.
- Login and session code lives in `src/features/auth`.
- Do not rename or move `src/components/shell/CustomSelect.tsx`; the DM dashboard imports it.

## Conventions

- Double quotes for strings, 2-space indentation, semicolons.
- Feature components are default exports; named exports are used only for prop types.
- Do not add re-export shims for deleted paths. `src/components/dashboard/`, `src/cost/`,
  `src/lib/` and the root-level `*Dashboard.tsx` files are gone by design.
- Many dashboard and morning-meeting files are minified single-line JSX. Edit them
  surgically; do not run a formatter.
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

<!-- antislop:start -->
## antislop
For UI, copy, people, mobile layout, or code comments work, read these installed skill files directly (use these paths even if a same-named global skill exists):
- Core filter, always on: `antislop`: `.agents/skills/antislop/SKILL.md`
- UI / visual: `antislop-ui`: `.agents/skills/antislop-ui/SKILL.md`
- Copy & text: `antislop-copywriting`: `.agents/skills/antislop-copywriting/SKILL.md`
- People: `antislop-human`: `.agents/skills/antislop-human/SKILL.md`
- Mobile / responsive: `antislop-layoutmobile`: `.agents/skills/antislop-layoutmobile/SKILL.md`
- Code comments: `antislop-code`: `.agents/skills/antislop-code/SKILL.md`
Before starting, follow the core's "Two Usage Modes" section in strict order: explicit session instruction first, then global preference, then ask. A session instruction always wins. For a resolved mode, say `antislop active: <mode> (session override).` or `antislop active: <mode> (global preference).` once before presenting findings or making edits, using the actual mode and source. Acknowledging the user's request without naming the source does not replace this notice.
Only an explicit choice of antislop during or after selects a session mode. A request to review, audit, or avoid file edits does not select a mode; read the global preference in that case. Another skill's mode does not select antislop's mode.
If the mode is unresolved, ask during/after and end the response; wait for the answer before any UI review, planning, or concept. For read-only tasks, put the active-mode notice only at the start of the final answer, never in progress messages. For editing tasks, announce before the first edit and omit it from the final answer.
To update antislop later: `npx antislop-ai --update`, or run `npx antislop-ai` and pick Overwrite them.
<!-- antislop:end -->

## antislop availability

If the antislop skill files listed above do not exist in this environment, skip the antislop
section entirely: do not ask about its mode and do not wait for an answer.

## Task scope

- Do only the task requested. Do not edit files outside its scope.
- Never modify anything under src/features/dm-dashboard.
- Do not reformat, rename, or move existing files unless the task says so.
- Do not add dependencies without asking first.
- Never put API keys or passwords in tracked files; read them from environment variables.
- When done, run both commands in "Checks" and list every file you created or changed.
