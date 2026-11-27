# Space Trader PWA

Port of Space Trader for Windows 2.00 (C#/WinForms, GPL-2.0-or-later) to an offline-capable PWA.
The game logic is ported faithfully; the UI is redesigned for mobile and desktop.
**Read `docs/PLAN.md` first.** It has the architecture, phases, UI direction, and decisions.

## Layout

- `reference/` — original C# source and BMP assets. Read-only; never edit.
- `src/engine/` — ported game logic. Plain TypeScript: no DOM, no Svelte, no browser APIs.
  - `data/` — static data: `consts.ts` (hand-ported) and `enums.ts`, `strings.ts`, `alerts.ts`
    (**generated** by `scripts/convert-data.mjs` via `npm run data`; never edit by hand).
  - `model/` — ported classes (one file per C# class, kebab-case names).
  - `game.ts` — the `Game` class, ported line by line from `Game.cs` (same member order).
  - `encounter.ts` — the encounter loop, ported from the logic in `Form_Encounter.cs`.
  - `services.ts` — docked actions ported from the dialogs and main window (fuel, bank, equipment,
    shipyard, crew, special event button, jump, retire). Each names the handler it came from.
  - `game-context.ts` — `currentGame()`, the replacement for the static `Game.CurrentGame`, and
    `GameContext`, the slice of `Game` the models read.
  - `game-ui.ts` — the `GameUI` interface: everything the original did with dialogs.
  - `rng.ts` — random numbers (`getRandom`, the seeded `getRandom2`); `functions.ts` — the other
    game-logic helpers from `Functions.cs` (`distance`, `wormholeExists`, ...).
  - `high-scores.ts` — the high score table and the game-over flow (`GameEnd`), through a
    `HighScoreStore` interface.
  - `trade.ts` — read-only helpers for the Trade screen (market rows, buy/sell limits, trip costs,
    `warpBlocker`); `views.ts` — the text of the original's quest, ship and commander screens.
- `src/app/` — between engine and UI, no Svelte: `storage.ts` (`KeyValueStore`: IndexedDB, plus
  `MemoryStore` for tests), `save-files.ts` (save records, export/import format) and `session.ts`
  (`GameSession`: new/load/save, autosave, game over, options defaults, high scores — the main
  window's lifecycle code). The UI runs game actions through `session.act(...)`, `warp()`,
  `jump()` and `retire()` so autosave and game over are handled in one place.
- `src/ui/` — Svelte 5 components.
  - `state.svelte.ts` — `app`: the session, current screen and tab, and `version`, bumped after
    every engine call. Run game actions through `app.run(game => ...)` (or `app.task` for other
    session calls) and compute views in `$derived.by` from `app.game`, never from a cached game
    reference, or they won't update.
  - `web-ui.svelte.ts` — `ui`, the browser `GameUI` (a dialog stack rendered by
    `dialogs/DialogHost.svelte`), plus `ui.message` and `ui.prompt` for the UI's own dialogs.
  - `trade-plan.svelte.ts` — the Trade screen's pending order and the Trade/Warp actions.
  - `screens/` (title, new commander, shell, the five tabs), `map/`, `dialogs/`, `components/`.
- `tests/` — Vitest tests, mirroring `src/` (e.g. `tests/engine/math.test.ts`, `tests/app/`).
  - `tests/engine/fake-game.ts` — `useFakeGame()` installs a `FakeGame` (a `GameContext` with a
    real commander, ship, systems and mercenaries) and a seeded RNG.
  - `tests/engine/scripted-ui.ts` — `ScriptedUI`, a `GameUI` that records alerts and dialogs and
    answers from a script (alert answers, quantities, encounter choices, plunder callbacks).
  - `tests/engine/game-helpers.ts` — `newGame()` for tests with a real seeded `Game`, plus
    `useGameCleanup()`, `reload()`, `moveTo()`.
  - `tests/engine/harness.ts` — the headless harness: a bot that plays whole seeded games and
    checks invariants after every step (`harness.test.ts` runs it).
- `public/images/`, `public/icons/` — PNGs generated from `reference/` by `scripts/convert-assets.mjs`.
  Committed; regenerate with `npm run assets` (needs ImageMagick) only when changing the script.

## Commands

- `npm run dev` — dev server at http://localhost:5173/space-trader-pwa/
- `npm run check` — svelte-check / TypeScript
- `npm test` — Vitest
- `npm run build` / `npm run preview` — production build, served at http://localhost:4173/space-trader-pwa/
- `npm run format` — Prettier
- `npm run data` — regenerate `src/engine/data/{enums,strings,alerts}.ts` from `reference/`

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
- **Randomness:** `Functions.GetRandom` → `getRandom` from `src/engine/rng.ts`; never call
  `Math.random()` directly. Tests set a source with `setRandomSource(seededRandomSource(n))`.
- Keep names and structure close to the C# so ported code can be compared line by line. Note any
  intentional behaviour change with a `// PORT:` comment.
  - Members and methods are camelCase (`Ship.CargoBays` → `ship.cargoBays`).
  - The static tables keep their original PascalCase names: `Consts.MaxRange`, `Consts.ShipSpecs`,
    `Strings.TradeItemNames`, `SpecialEvent.StatusJarekDone`.
- **`Game.CurrentGame`** → `currentGame()` from `src/engine/game-context.ts`, and
  `Game.CurrentGame.Commander` → `currentCommander()` (throws if unset). Models see the game
  through the `GameContext` interface (which `Game` implements); widen it when a model needs more.
- **Circular imports:** `Consts` tables are lazy getters because they construct model classes that
  read `Consts`. Never read `Consts` tables (or construct model objects) at module top level.
- **Overloads:** C# overloads that TS can't tell apart (constructors taking different enums or a
  `Hashtable`, `RemoveEquipment(type, slot)` vs `(type, object)`) become static factories
  (`Ship.forOpponent`, `X.fromHash`) or get a distinct name, with a `// PORT:` note.
- **Dialog owners:** a C# `IWin32Window owner` parameter becomes a `ui: GameUI` parameter. In
  `Game` itself, owner parameters are dropped and alerts go to `this.ui` (the `ParentWindow`).
- **Logic in forms:** game logic found in a WinForms dialog goes into the engine (`encounter.ts`,
  `services.ts`), not the UI. Quantity pickers become amount parameters the UI supplies.
- **Save data:** classes keep the original `Serialize()` keys (`_price`, `_type`, ...) in a plain
  `Hash` object; load with a static `fromHash` (or a protected `loadFromHash` for base classes).

## Conventions

- Engine code must not import from `src/app/` or `src/ui/`; `src/app/` must not import from
  `src/ui/`. Browser storage APIs appear only in `src/app/storage.ts`.
- Display original pixel art at integer scales with the `.pixel` class (`image-rendering: pixelated`).
  Ships are 64×52, equipment 64×52, alert art 160×160; `src/ui/images.ts` maps the original's
  image indices to files.
- The UI must work from 360 px wide (phones) up; check both a phone and a desktop width.
- Asset URLs must be built from `import.meta.env.BASE_URL` (the app is served from a subpath).
