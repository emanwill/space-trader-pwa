# Space Trader PWA — Port Plan

Source: Space Trader for Windows 2.00 (C# / WinForms, GPL v2+), in `reference/`.
Goal: carry the game logic over faithfully and redesign the UI for desktop and mobile as an installable, offline PWA.

---

## 1. What's in the reference code

~30k lines of C#. About 12k of that is game logic or data, and about 17k is WinForms UI (mostly designer-generated layout).

### Logic and data (port these)

| File                                                                                          | Lines | Notes                                                                                                      |
| --------------------------------------------------------------------------------------------- | ----- | ---------------------------------------------------------------------------------------------------------- |
| `Game.cs`                                                                                     | 4429  | Core: universe generation, prices, travel, encounters, combat, special events, quests, news, serialization |
| `Ship.cs`                                                                                     | 1353  | Cargo, equipment, crew, damage, tribbles, trade-in value                                                   |
| `Strings.cs`                                                                                  | 1273  | All text: alert titles and messages, news, names. Uses `^1`/`^2` placeholders                              |
| `Enums.cs`                                                                                    | 881   | All enums (AlertType has about 188 members)                                                                |
| `ShipSpec.cs`, `ShipTemplate.cs`, `Shipyard.cs`                                               | ~1150 | Ship stats, plus the 2.0 "design your own ship" feature                                                    |
| `StarSystem.cs`, `PoliticalSystem.cs`, `TradeItem.cs`                                         | ~930  | Systems, governments, trade goods                                                                          |
| `Commander.cs`, `CrewMember.cs`                                                               | ~675  | Player, skills, bank, insurance                                                                            |
| `Consts.cs`                                                                                   | 397   | Static data tables and tuning constants                                                                    |
| `Functions.cs`                                                                                | 361   | RNG, distance, formatting, file I/O                                                                        |
| `Equipment.cs`, `Weapon.cs`, `Shield.cs`, `Gadget.cs`                                         | ~585  | Equipment hierarchy                                                                                        |
| `SpecialEvent.cs`, `GameOptions.cs`, `HighScoreRecord.cs`, `PoliceRecord.cs`, `Reputation.cs` | ~880  | Supporting models                                                                                          |
| `STSerializableObject.cs`                                                                     | 161   | Hashtable-based serialization (becomes JSON)                                                               |

### UI (redesign, not copy)

The main window `Form_SpaceTrader.cs` (4079 lines) has seven fixed panels: System Info, Target System, Short-Range Chart, Galactic Chart, Cargo (10 trade rows with 4 buttons each), Dock (fuel, repair, escape pod, equipment, buy ship, mercenaries, news, special event, ship design), and a status bar (cash, bays, costs). On top of that there are 25 dialog forms and the generic `FormAlert`.

### Assets

- 120 BMPs in `images/` and 34 in `custom/`. They are 8-bit and 16-bit, mostly tiny: ships are 64×52, chart dots are 7×7, tribbles are 12×12, the splash is 160×160.
- Each ship has four images: normal, damaged, shielded, and damaged+shielded. `Functions.PaintShipImage` stitches vertical slices of the four together to show hull and shield levels. CSS `clip-path` over four stacked images can reproduce this.

---

## 2. The key technical problem: logic blocks on modal dialogs

The logic layer calls the UI directly and waits for the answer:

| File                | `FormAlert.Alert` calls | Branch on the answer | `ShowDialog` calls                                                                       |
| ------------------- | ----------------------- | -------------------- | ---------------------------------------------------------------------------------------- |
| Game.cs             | 149                     | ≥16                  | 6 (quantity pickers, plunder, jettison, **the encounter screen inside the travel loop**) |
| Commander.cs        | 12                      | 0                    | 0                                                                                        |
| Functions.cs        | 4                       | 0                    | 0                                                                                        |
| Form_SpaceTrader.cs | 21                      | 6                    | 22                                                                                       |

For example, `Game.Travel()` runs a 20-"click" loop. Each click may open `FormEncounter` modally, and the loop continues once it closes. `CargoBuy()` checks preconditions with alerts, opens a quantity dialog, then applies the result. `Warp()` asks yes/no questions halfway through.

### Recommended approach: async logic plus an injected UI port

Port the logic as TypeScript classes that take an injected interface:

```ts
interface GameUI {
  alert(type: AlertType, ...args: string[]): Promise<AlertResult>; // Ok/Yes/No/Cancel
  pickQuantity(req: QuantityRequest): Promise<number>; // 0 = cancelled
  encounter(): Promise<EncounterResult>; // resolves when the encounter ends
  plunder(): Promise<void>;
  jettison(): Promise<void>;
}
```

`FormAlert.Alert(x, owner)` becomes `await this.ui.alert(x)`. Call chains become `async` from the bottom up. Control flow stays line-for-line comparable to the C#, which keeps the port reviewable and lowers the risk of logic bugs.

The UI decides how each alert type is shown. Most of the 188 types are plain notices, and the UI port can resolve those immediately and show them as a toast or log entry instead of a modal. Only genuine questions need a blocking confirm. There are at least 22 call sites that branch on the answer; the exact list will come out of Phase 3. This decision is a lookup table on the UI side, not a change to the logic.

Where it helps the new UI, also pull out pure helpers such as `maxBuyable(item)`, `canWarp(): Problem | null`, and `fuelCost(units)`. This lets the UI show limits and disable buttons ahead of time, so most precondition alerts never fire. Quantity pickers inside the logic become optional: the UI can call `cargoBuy(item, qty)` with a quantity it already chose.

Alternative considered: rewriting the logic as a pure reducer or state machine (with pending decisions as data). It's cleaner in theory, but it means restructuring about 4k lines of tangled control flow, and that's where port bugs come from. We could revisit it for the encounter flow alone if needed.

### Other porting hazards (C# → TS)

- **Integer division.** C# `int / int` truncates. Every such division needs `Math.trunc` (or a `div()` helper). This is the most likely source of silent bugs.
- **`Math.Round`.** .NET rounds half to even by default. JS rounds half up. Port it as a `roundHalfEven()` helper.
- **`(int)` casts** truncate toward zero, so use `Math.trunc`, not `Math.floor`.
- **`Rand()` / `GetRandom2`** (seeded RNG used for news) does 64-bit `long` arithmetic. Its values stay below 2^47, so plain numbers work (confirmed in Phase 2).
- **`System.Random`** for gameplay becomes an injectable seedable PRNG, which makes tests deterministic.
- **Enum arithmetic** (`(int)Difficulty + 1`, `(ShipType)i`) maps to numeric TS enums.
- **Static singletons** (`Game.CurrentGame`, `Consts`, and `Strings.CrewMemberNames[Commander]` being mutated at game creation) should become a module-level current game for now and an explicit instance later if needed.
- **`ArrayList` / `Hashtable`** become arrays and plain objects.

---

## 3. Target architecture

```
src/
  engine/     # Ported logic. No DOM, no framework. Pure TS + GameUI interface.
    data/     # Consts, Strings, enums, ship/weapon/system tables
    model/    # Ship, Commander, StarSystem, CrewMember, equipment…
    game.ts   # Game class: a line-by-line port of Game.cs
    encounter.ts  # the encounter loop (logic from Form_Encounter.cs)
    services.ts   # docked actions (logic from the fuel, bank, equipment, shipyard... dialogs)
    rng.ts, functions.ts, serialization.ts, format.ts, game-ui.ts, game-context.ts, game-end-error.ts
  ui/         # Framework components, GameUI implementation
  pwa/        # Manifest, service worker, icons
assets/       # Converted PNGs (generated from reference/ by a script)
scripts/      # convert-assets (ImageMagick BMP→PNG)
tests/        # Vitest: engine unit tests, scripted game runs
```

- **Tooling:** Vite + TypeScript (strict), Vitest, `vite-plugin-pwa` (Workbox). All assets are precached, so the game runs fully offline.
- **UI framework:** Svelte 5 on plain Vite. We don't need SvelteKit, because the game is a static single-page app with no routing server. Svelte has a small runtime, which suits a PWA, and it has built-in transitions for sheets and toasts. The engine is a mutable object graph, so the bridge is a store that bumps a version counter after each engine call and triggers a re-render. The engine doesn't depend on the framework, so switching later only costs the `ui/` folder.
- **Persistence:**
  - Engine `toJSON`/`fromJSON` mirrors the existing `Serialize()` methods and keeps the same field names, plus a `version` field.
  - Autosave to IndexedDB at stable points (after arrival and after each dock action). This matters on mobile, where the OS can kill the app at any time. Travel restarts from a known state if the app is interrupted mid-trip.
  - Named save slots, plus export/import of `.json` files.
  - Original `.sav` files are .NET BinaryFormatter, so importing them is out of scope.
- **High scores and options** move from the Windows registry and `.bin` files to IndexedDB.
- **Assets:** a script converts BMP to PNG, keeping index-0 or magenta backgrounds transparent where needed. Images render at integer scale with `image-rendering: pixelated`. The charts are drawn as SVG instead of bitmaps, since they're just dots on a 154×110 grid.

---

## 4. UI direction

Mobile-first, with a responsive multi-pane layout on desktop. The main shift is away from popups and toward inline controls and dedicated screens. The pixel art stays at integer scale. Quality-of-life changes are welcome, especially in the core loop.

### 4.1 Core loop: Trade screen (compare + buy + depart)

The loop is (1) compare prices, (2) buy cargo, (3) fly and handle encounters, (4) sell at the destination. Most quality-of-life value is here, so the Trade screen is the home screen when docked.

**What the original makes you do:** pick a target on the chart, look at the cargo panel's target-price and difference columns, then pick another target and look again. Comparing destinations means clicking through systems one at a time. Every purchase opens a quantity dialog.

**Key fact:** the original's target prices are estimates from `TradeItem.StandardPrice(target)`. That formula uses tech level, government (wanted good, trader activity), size, and special resource (only if the system has been visited). It leaves out random variation, current system events, and trader-skill or police-record adjustments. A planner that shows estimates for every reachable system therefore reveals nothing new. It only saves clicks.

**Proposed layout:**

```
┌ Header: cash · bays used/total · day · fuel · hull ───────────────┐
│ ┌ mini-map (collapsible): nearby systems, range ring, tap to pick ┐ │
│ └─────────────────────────────────────────────────────────────────┘ │
│ ◀  Tarchannen · 12 pc · Tech: Hi-Tech · Police: Few   ▶           │  ← swipe or ◀ ▶ to cycle systems in range
├────────────────────────────────────────────────────────────────────┤
│ Item       Here(buy) Stock  There(est)  Margin     Hold   [ − n + ] Max │
│ Firearms ⚠ 1,240     12     ~2,100      +860 +69%  0      [ − 0 + ] Max │  ← best margins highlighted
│ Medicine     650     20     ~  710      + 60  +9%  4      …             │
│ Water         32      —     ~   30        —        8 (paid 28) Sell all │  ← sell side when holding cargo
│ …                                                                   │
├────────────────────────────────────────────────────────────────────┤
│ Plan: 18/20 bays · cash after 3,140 · est. profit +4,210           │
│ Trip costs: fuel 12 · mercs 0 · insurance 0 · wormhole tax 0       │
│ [ Warp to Tarchannen ]                                             │  ← step 3 starts from this screen
└────────────────────────────────────────────────────────────────────┘
```

- **Destination is chosen on the Trade screen itself.** The problem to solve is mobile: with the map and the market on separate screens, scanning neighbors means flipping between them for every system. The player still clicks through systems one at a time; they just never leave the product list to do it. Two controls on the Trade screen do this, and both set the same `WarpSystem` as the full map:
  - **Destination bar with ◀ ▶ and swipe.** It cycles through systems in range, plus wormhole destinations, in the same order as the original's Prev/Next (`SelectNextSystemWithinRange`). Each step updates the estimate and margin columns immediately. The bar shows the target's key facts (distance, tech level, government, police and pirate levels).
  - **Collapsible mini-map** at the top of the screen. It's a compact view of the nearby area (the old short-range chart) with the range ring. Tapping a system selects it, and pinching or a button opens the full map. When collapsed, only the destination bar remains.
- **Inline quantities.** A stepper with Max per row, and long-press or tap on the number for direct entry. Max follows the engine's existing limits: free bays minus the "leave empty" option, stock, and cash to spend. No quantity dialog.
- **Sell side on the same rows.** Held quantity shows the average price paid (`Commander.PriceCargo`). Profitable rows are highlighted, as the original did with bold. "Sell all" and "Dump" stay per row. A global "Sell all profitable" action fits naturally on arrival.
- **Plan footer.** Live totals as quantities change: bays, cash after purchase, estimated profit, and trip costs. These are the same numbers `Warp()` checks, so problems such as "can't afford insurance" show here before you warp instead of as an alert.
- **Illegal goods** get a marker and a risk hint from the destination's police strength, which the original already shows for the target.
- **Estimates are labeled** with `~` or "est.", so it's clear that actual arrival prices vary.
- **Possible later extras.** These aren't planned, because clicking through systems is fine. Each would sit behind a setting:
  - "Best runs" list: the top item × destination pairs from here
  - "Fill hold" button: greedy fill by margin per bay
  - Including known news events in the estimates. This one does add information, because the original makes you read the paper.

**Mobile:** the mini-map and destination bar are pinned at the top, the plan footer is pinned at the bottom, and the product list scrolls between them. Rows collapse to two-line cards: name, buy, and hold on the first line; estimate, margin, and stepper on the second. The mini-map collapses automatically while the list is scrolled, so all 10 rows can fit. **Desktop:** the map pane sits next to the Trade pane, and selecting a system on the map updates the estimate columns.

### 4.2 Map

One SVG map replaces the short-range and galactic charts.

- Pan and zoom by pinch, wheel, or drag.
- Shows the fuel-range ring, wormhole links, the visited/unvisited distinction, and the tracked system.
- Has a search field (replacing Find) and tap-to-select, with a target card showing government, tech level, police and pirate levels, distance, and estimated profit.
- Opens centered on the current system, at about short-range-chart zoom.

### Old surfaces and possible new homes

| Original                                                       | Possible PWA treatment                                                                                                                                                                               |
| -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Main window's seven panels                                     | Persistent header (cash, bays, day, fuel, hull) plus tabbed sections on mobile or side-by-side panes on desktop                                                                                      |
| Cargo panel + CargoBuy/CargoSell dialogs + Target System panel | Trade screen (§4.1)                                                                                                                                                                                  |
| Short-Range + Galactic charts, Find, Track, Next/Prev          | Map (§4.2)                                                                                                                                                                                           |
| Dock: Fuel, Repair (BuyFuel/BuyRepairs)                        | Inline "fill up" / slider controls on a Services panel                                                                                                                                               |
| Equipment, ShipList, Escape Pod                                | Shipyard section with ship comparison cards and equipment buy/sell lists                                                                                                                             |
| Shipyard design (Form_Shipyard, Costs)                         | **Deferred.** Port the `Shipyard` logic and data so saves stay compatible, but build no UI yet                                                                                                       |
| ViewBank, GetLoan, PayBackLoan                                 | Bank panel with inline loan and insurance controls                                                                                                                                                   |
| ViewPersonnel, Mercenaries                                     | Crew panel                                                                                                                                                                                           |
| ViewCommander, ViewShip, ViewQuests                            | Commander section: status, ship, quest log                                                                                                                                                           |
| News, Special event button                                     | Station section: newspaper and event card                                                                                                                                                            |
| Warp + travel + Encounter dialog                               | Full-screen travel/encounter view: ship sprites with hull and shield, action bar, combat log in place of chained alerts, auto-attack/flee toggle                                                     |
| Plunder, Jettison                                              | Cargo-transfer sheet inside the encounter view                                                                                                                                                       |
| FormAlert (188 types)                                          | Sorted into notice (toast or log), story (narrative card), confirm (sheet), and game-over (screen)                                                                                                   |
| NewCommander                                                   | Onboarding screen (name, difficulty, skill-point allocation)                                                                                                                                         |
| Options, High Scores, About                                    | Settings and menu pages                                                                                                                                                                              |
| Form_Test, Monster.com, cheat codes                            | Kept in production. Cheat codes are entered in map search, as the original did in Find. The debug panel is unlocked by a cheat, and using cheats marks the game for high scores as the original does |

---

## 5. Phased plan

**Phase 0. Scaffold** ✅ done

- Vite, TS, Vitest, lint/format, and a PWA plugin stub
- Set the license to GPL-2.0-or-later (package.json currently says ISC)
- Asset conversion script, with converted PNGs committed
- GitHub Actions workflow that builds and deploys to GitHub Pages, so every phase is playable from a phone
- Add a short CLAUDE.md with conventions (integer division rule, engine/UI boundary)

**Phase 1. Static data** ✅ done

- Enums, Consts, Strings, TradeItem, PoliticalSystem, ShipSpec tables, equipment tables
- Mechanical, but long. Spot-check against the C#.
- Also ported: the alert table from `Form_Alert.cs`, PoliceRecord, Reputation, SpecialEvent,
  Shipyard (logic only), and the text-formatting helpers from `Functions.cs`.
- Enums, Strings and the alert table are generated by `scripts/convert-data.mjs`. A test parses
  `reference/Consts.cs` and checks every table value against the port.
- Carried forward to Phase 3 (done there): the original's `EncounterDumpWarning` alert set
  `Game.LitterWarning = true` inside the UI. The engine must set it itself (see the note in
  `alerts.ts`).

**Phase 2. Engine models** ✅ done

- Ship, Commander, CrewMember, StarSystem classes, plus serialization (Equipment was done in Phase 1)
- Unit tests for derived values: trade-in price, free bays, skills, worth
- Also ported: the game-logic helpers from `Functions.cs` (`functions.ts`) and its random-number
  functions (`rng.ts`). Gameplay randomness uses an injectable source. The news generator's seeded
  `Rand()` is ported exactly; its values stay below 2^47, so plain numbers suffice (no BigInt).
- `GameUI` exists with `alert()` only. `Commander.TradeShip` is the first async port: its WinForms
  `owner` parameter became a `ui` parameter.
- `GameContext` now lists every `Game` member the models read (quest statuses, prices, opponent,
  wormholes, ...). Tests use a `FakeGame` holding real model objects, and a `ScriptedUI` that
  records alerts and answers questions from a script (`tests/engine/`). Phase 3's harness can
  build on both.
- Behaviour fixes, each marked `// PORT:`:
  - Loading a save left a stale copy of the commander in the ship's first crew slot, so skill
    changes after loading (Skill event, tonic) didn't reach the ship. The loaded commander now
    takes that slot.
  - `Ship.StealableCargo` threw when hidden cargo bays outnumbered the units of cargo (a pirate
    raid on a nearly empty ship with hidden bays). It now returns an empty list.
- C# overloads that are ambiguous in TS got their own names: `Ship.forOpponent(oppType)` and
  `Ship.fromHash(hash)` for the constructors, `removeEquipmentBySubType` for
  `RemoveEquipment(type, object)`.

**Phase 3. Game engine** ✅ done

- `Game.cs` ported behind the `GameUI` interface as one `Game` class (`game.ts`), keeping the C#
  member order so the two can be compared line by line. The plan had it split into modules; one
  class kept the port reviewable, and the logic is still grouped as in the original.
  - `Game.newGame(...)` and `Game.fromHash(hash, ui)` replace the two constructors. The game keeps
    its `GameUI` as `ui` (the original's `ParentWindow`). The C# `owner` parameters on Game methods
    are dropped, since owner and ParentWindow were always the same window.
  - `Game` implements `GameContext`, which the model classes keep using (so `FakeGame` still works
    for their unit tests).
  - `GameEndException` → `GameEndError`; `FutureVersionException` → `FutureVersionError`.
  - `GameOptions` ported (`model/game-options.ts`). The defaults file becomes
    `setDefaultOptions(hash)`, for Phase 4 to call.
- Game logic that lived in WinForms dialogs moved into the engine:
  - `encounter.ts`: Form_Encounter's buttons, actions and continuous-attack timer. The engine runs
    the encounter loop and asks `GameUI.encounterAction(view)` for each choice (`EncounterChoice`
    adds `Tick` for the timer and `Close` for the EasyEncounters close box).
  - `services.ts`: fuel, repairs, escape pod, ship list, equipment, bank, personnel, the special
    event button, the singularity jump and retiring. Quantity pickers became amount parameters.
- `GameUI` grew `cargoQuantity` (FormCargoBuy/Sell), `plunder`, `jettison` and `encounterAction`.
- Not ported yet: the game-over flow and high scores (`GameEnd` in the main window; Phase 4),
  new-commander validation and cheats (Phase 7), tribble pictures on the encounter screen (UI).
- Headless harness (`tests/engine/harness.ts`): a bot plays 60 seeded games of up to 150 turns
  across all difficulties, answering every dialog at random but sensibly (it trades for profit,
  half the games start wealthy). After every action it checks invariants (cash, debt, cargo,
  fuel, hull, crew list, passengers vs. quest status, prices) and every 7 turns saves, reloads
  and checks the save is unchanged. About 4,800 game days and 1,000 encounters per run.
- Behaviour fixes, each marked `// PORT:`:
  - Arrest: a single mercenary never left (the check counted the commander as special crew), and
    clearing the crew also removed passengers before their quests were reset, leaving those
    quests stuck. Now all mercenaries leave, and passengers are handled by their own checks.
  - Passengers whose quest was reset stayed aboard: Wild (arrested, refusing to stay without a
    beam laser or with the reactor, joining pirates), Jarek and the Princess (arrested). They now
    leave the ship. (In the Palm original they were flags, not crew.)
  - Trade in orbit: the buy dialog capped the amount by cash using the system's price, not the
    trader's, so cash could go negative. Capped by the trader's price now.
  - After loading a save, very rare encounters were never removed and news events never replaced
    (boxed ints vs. boxed enums in .NET). Plain numbers fix this.
  - The littering warning flag is set by the engine (the original set it inside FormAlert).

**Phase 4. Persistence**

- IndexedDB autosave, save slots, export/import, high scores, options

**Phase 5. UI shell and docked gameplay**

- Layout system and header
- Trade screen and map first, then services, shipyard/equipment, bank, crew, commander/quests, news
- Engine helpers the Trade screen needs: `estimatedSellPrice`, `maxBuyable`, `tripCosts`, `warpBlocker`
- The map component is built to render at two sizes: the full map and the mini-map
- The playable loop of trade, warp, arrive should exist early, even before encounters have UI (resolve them automatically in the meantime)

**Phase 6. Travel and encounters UI**

- Encounter screen, combat log, plunder/jettison, tribbles, special-encounter art, game-over and retire flows

**Phase 7. Remaining features**

- New-commander flow polish, options, high scores, debug panel and cheats
- The ship designer is deferred beyond this plan

**Phase 8. PWA polish**

- Install manifest and icons, offline check, update prompt
- Touch targets, keyboard shortcuts on desktop, accessibility, dark/light themes
- Device testing

---

## 6. Verification

- There's no .NET or Mono on this machine, and WinForms wouldn't run here anyway. Differential testing against the original would mean compiling the logic classes with a stubbed `FormAlert` under .NET. That's possible but not planned unless bugs show it's worth doing.
- The main safeguards are a faithful line-by-line port (enabled by the async approach), focused unit tests on formulas, seeded headless full-game runs, and manual play-testing.

---

## 7. Hosting

**What the app needs from a host:** very little. It's a static site: HTML, JS, CSS, PNGs, a manifest, and a service worker, probably under 1 MB in total. There's no server, database, or accounts. Saves, options, and high scores all stay on the device in IndexedDB.

Requirements:

1. **HTTPS.** Service workers, and therefore installing and offline play, only work over HTTPS (localhost is exempt for development). All the hosts below provide it automatically.
2. **Static file serving** with correct MIME types, including `.webmanifest`.
3. **Cache headers.** Ideally `sw.js` and `index.html` aren't cached for long, so updates reach players. Vite's hashed asset filenames handle everything else. If a host can't set headers, the PWA plugin's update check still works, just more slowly.
4. **A stable origin.** IndexedDB data belongs to the origin (scheme + domain). If the domain changes, players lose their saves and have to export and import them. **Pick the domain once.**
5. **Base path.** If the site is served from a subpath such as `user.github.io/space-trader-pwa/`, set Vite's `base` and the manifest's `scope`/`start_url` to match.

Not needed unless we add them later: a global online leaderboard or cloud saves across devices. Either would need a small backend (for example a serverless function plus a key-value store), and that's out of scope for now.

**Options:**

| Host                              | Cost                         | Notes                                                                                                                                                                                                                       |
| --------------------------------- | ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GitHub Pages                      | Free                         | The repo is already on GitHub, and a GitHub Actions workflow can build and deploy it. Serves from a subpath unless you add a custom domain. Can't set custom headers (it uses about a 10-minute cache, which is acceptable) |
| Cloudflare Pages                  | Free                         | Root domain (`*.pages.dev`), custom headers through a `_headers` file, preview deploys per branch                                                                                                                           |
| Netlify / Vercel                  | Free tier                    | Similar to Cloudflare Pages                                                                                                                                                                                                 |
| Custom domain on any of the above | About the cost of the domain | Most portable choice. The origin survives a change of host, so saves survive too                                                                                                                                            |

**Recommendation:** GitHub Pages through Actions is the simplest start. Cloudflare Pages is the step up if header control matters. If the game might get a public URL you'd want to keep, put a custom domain in front from day one, because that protects players' saves if you ever change hosts.

---

## 8. Decisions

| Topic          | Decision                                                                                                                                                                                                                                     |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| UI framework   | Svelte 5 + Vite (no strong preference from the owner)                                                                                                                                                                                        |
| Rules fidelity | Quality-of-life changes allowed. The core trade loop is the priority (§4.1)                                                                                                                                                                  |
| Art            | Keep the pixel-art look at integer scale                                                                                                                                                                                                     |
| Ship designer  | Deferred. Logic and data are ported, but there's no UI                                                                                                                                                                                       |
| Cheats / debug | Kept in production                                                                                                                                                                                                                           |
| Map            | One zoomable, scrollable map replaces both charts                                                                                                                                                                                            |
| Trade screen   | Destination is selected without leaving the product list: ◀ ▶/swipe cycling plus a collapsible mini-map (§4.1). No ranked "best runs" list for now                                                                                           |
| Hosting        | GitHub Pages through Actions for now (Vite `base: '/space-trader-pwa/'`). A permanent home, possibly a custom domain, will be decided before public release. Moving changes the origin, so test saves won't carry over without export/import |
