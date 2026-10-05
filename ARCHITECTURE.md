# Architecture

Production dashboard built with Next.js App Router, React 19, Tailwind CSS 4 and Recharts.
The app is a single-page shell: the URL selects a sidebar entry, and the shell renders the
matching feature dashboard. Feature code and data are local mock data; there is no backend
wiring yet (only `GET /api/health` exists).

## Commands

```bash
corepack pnpm@10.34.3 install
corepack pnpm@10.34.3 run dev
corepack pnpm@10.34.3 run build
corepack pnpm@10.34.3 exec tsc --noEmit   # type gate
```

`.mise.toml` pins Node 22 and pnpm 10.34.3. `corepack enable` is not available in this
environment, so invoke pnpm through `corepack pnpm@10.34.3` explicitly.

## Rendering model

`src/app/layout.tsx` renders `<ClientAppShell />` next to the page children. Every route page
except the redirect stubs returns `null`, so the shell is the whole UI.

```
src/app/layout.tsx
  └── ClientAppShell          "use client"
        ├── ThemeProvider     dark mode, defaults to light on every reload
        ├── LanguageProvider  ID / EN, defaults to ID on every reload
        └── AppShell          reads usePathname(), derives the active nav key
              ├── SidebarNav
              ├── ShellTopbar
              ├── ShellContent
              └── CommandPalette
```

`ClientAppShell` computes `activeForPath(pathname)` from the pathname and passes it to
`AppShell` as `initialActive`. From then on the shell keeps `active` in state, so navigation
inside a dashboard can switch views without touching the URL.

## Navigation

`src/config/navigation.ts` is the single source of truth for sidebar structure, routes and
resolution:

- `platformGroup`, `managementGroup` — sidebar groups in display order.
- `navItems`, `navGroups` — flattened and grouped views used by the shell.
- `resolveNavItem(target)`, `hrefForTarget(target)`, `keyForTarget(target)` — resolve a label,
  key or alias to a nav item.
- `activeForPath(pathname)` — pathname to active key, with the legacy `/warehouse` alias
  mapping to `material-overview` and unknown paths falling back to `Dashboard`.
- `currentWhenActive: false` on the SQCDIP children keeps their submenu buttons from being
  highlighted, matching the previous UI.
- Aliases exist for labels emitted from inside dashboards: `Pre-Assembly` → `Preassembly`,
  `SQCDIP Overview` → `Overview`.

`src/components/AppShell.tsx` owns two navigation callbacks:

| Callback          | Used by                                            | Behaviour |
| ----------------- | -------------------------------------------------- | --------- |
| `selectMenu`      | sidebar, command palette, `ProductionDashboard`     | `router.push` + set active + close mobile sheet |
| `selectSubPage`   | `MaterialDashboard`, `CostDashboard`, `SqcdipDashboard` | set active only, no URL change |

`selectSubPage` exists because those dashboards historically switched views through local
state without changing the URL. `selectMenu` falls back to `/dashboard` for labels that are
not part of the nav registry (for example the demo palette entries `My Wallet`,
`Transactions`, `Profile`, `Billing`), which is what `routeForLabel` used to do.

## Shell state helpers

`src/components/shell/shellPage.ts` turns the active key into everything the shell needs:
page-type flags, `materialPage`, `costPage` and the two breadcrumb strings. Keeping this in
one pure function means `SidebarNav`, `ShellTopbar` and `ShellContent` cannot disagree about
which dashboard is active.

`src/components/shell/commands.ts` holds the command palette entries. `Icon.tsx` holds the
inline SVG icon registry used by the shell and dashboards.

## Features and data

| Feature        | Component                                             | Data |
| -------------- | ----------------------------------------------------- | ---- |
| Production     | `src/features/production/ProductionDashboard.tsx`      | inline |
| SQCDIP         | `src/features/sqcdip/SqcdipDashboard.tsx`              | inline |
| Assembly       | `src/features/assembly/AssemblyDashboard.tsx`          | `src/data/assemblyData.ts` |
| Packing        | `src/features/packing/PackingDashboard.tsx`            | `src/data/packingData.ts` |
| Material       | `src/features/material/MaterialDashboard.tsx`          | `src/data/materialData.ts`, `src/data/woCloseData.ts` |
| QC / OQC       | `src/features/qc/OqcDashboard.tsx`                     | `src/data/qcData.ts` |
| Service        | `src/features/service/ServiceDashboard.tsx`            | `src/data/serviceData.ts` |
| Repair         | `src/features/repair/RepairDashboard.tsx`              | inline |
| Cost           | `src/features/cost/CostDashboard.tsx` and subpages     | `src/data/costData.ts` |
| Warehouse      | `src/features/warehouse/WarehouseOverview.tsx`         | inline |

`src/data/costData.ts` is the only cost dataset; the former `components/dashboard/cost`
copy was removed. Cost subpages share `shared.tsx` and `format.ts` inside the feature folder
and import their stylesheet from `src/features/cost/Cost.css`.

## Routes

- `/` redirects to `/dashboard`.
- `/warehouse` is a legacy alias for the Material overview.
- Legacy redirects are kept: `/cost/cost-improvement` → `/cost/improvement`,
  `/cost/cost-transfer` → `/cost/transfer`, `/cost/losses-cost` → `/cost/losses`,
  `/material/clearance` → `/material/clearance-discontinue`,
  `/material/new-model` → `/material/new-model-progress`,
  `/qc/solusi` → `/qc/solusi-improvement`.
- Assembly is reachable through `/assembly`; its submenu items map to `/assembly/*` paths.

## Styles

`src/app/globals.css` imports the Google Fonts stylesheet first (required by Tailwind 4), then
Tailwind, then the owner-scoped sheets in `src/styles/`. `.dark` selectors live next to the
rules they override, so dark-mode styling stays with its feature.

## TypeScript notes

`strict` is on, but `strictFunctionTypes` is disabled in `tsconfig.json`. Recharts types
`Tooltip` `formatter` and `labelFormatter` contravariantly, so the inline
`(value: number) => string` formatters fail under the stricter setting. Enabling it produces
15 errors in 7 files and nothing else:

- `src/features/cost/CostImprovement.tsx`
- `src/features/cost/CostMonitoring.tsx`
- `src/features/cost/LossesCost.tsx`
- `src/features/material/MaterialDashboard.tsx`
- `src/features/packing/PackingDashboard.tsx`
- `src/features/qc/OqcDashboard.tsx`
- `src/features/service/ServiceDashboard.tsx`

## Editing rules

- Keep strings, numbers and CSS class names byte-identical unless a change is intentional.
  Dashboard files are minified single-line JSX; formatting them creates noisy diffs.
- Feature files must not import from `src/components/dashboard` or `src/cost`; those paths
  were deleted in the cleanup pass.
- Write UTF-8 files with an editor or Node (`fs.writeFileSync(..., "utf8")`). Rewriting UTF-8
  files through PowerShell string cmdlets has corrupted non-ASCII glyphs in this repo before.
- Every refactor step ends with `tsc --noEmit` and `next build`.
