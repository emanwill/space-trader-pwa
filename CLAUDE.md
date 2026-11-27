# Space Trader PWA

Port of Space Trader for Windows 2.00 (C#/WinForms, GPL-2.0-or-later) to an offline-capable PWA.
The game logic is ported faithfully; the UI is redesigned for mobile and desktop.
**Read `docs/PLAN.md` first.** It has the architecture, phases, UI direction, and decisions.

## Layout

- `reference/` — original C# source and BMP assets. Read-only; never edit.
- `src/engine/` — ported game logic. Plain TypeScript: no DOM, no Svelte, no browser APIs.
- `src/ui/` — Svelte 5 components and the `GameUI` implementation.
- `tests/` — Vitest tests, mirroring `src/` (e.g. `tests/engine/math.test.ts`).
- `public/images/`, `public/icons/` — PNGs generated from `reference/` by `scripts/convert-assets.mjs`.
  Committed; regenerate with `npm run assets` (needs ImageMagick) only when changing the script.

## Commands

- `npm run dev` — dev server at http://localhost:5173/space-trader-pwa/
- `npm run check` — svelte-check / TypeScript
- `npm test` — Vitest
- `npm run build` / `npm run preview` — production build, served at http://localhost:4173/space-trader-pwa/
- `npm run format` — Prettier

CI (`.github/workflows/deploy.yml`) runs format:check, check, test and build on every push and PR,
and deploys `main` to GitHub Pages.

## Porting rules (C# → TypeScript)

- **Integer division:** C# `int / int` truncates. Always use `idiv(a, b)` from `src/engine/math.ts`;
  never a bare `/` on values the original treats as `int`.
- **Casts:** C# `(int)x` → `toInt(x)` (truncates toward zero, not `Math.floor`).
- **Rounding:** C# `Math.Round(x)` rounds half to even → `roundHalfEven(x)`, never `Math.round`.
- **Enums:** use numeric TS enums with the same member order and values, since the original does
  arithmetic on them (`(int)Difficulty + 1`) and indexes arrays by them.
- **Dialogs in logic:** `FormAlert.Alert(...)`, `ShowDialog(...)` and the like become `await this.ui.…`
  calls on the injected `GameUI` interface. Callers become `async`. Do not remove or reorder alerts
  while porting; the UI decides how each alert type is shown.
- **Randomness:** go through the engine's injectable RNG, never `Math.random()` directly.
- Keep names and structure close to the C# (method names in camelCase) so ported code can be
  compared line by line. Note any intentional behaviour change with a `// PORT:` comment.

## Conventions

- Engine code must not import from `src/ui/`.
- Display original pixel art at integer scales with the `.pixel` class (`image-rendering: pixelated`).
- Asset URLs must be built from `import.meta.env.BASE_URL` (the app is served from a subpath).
