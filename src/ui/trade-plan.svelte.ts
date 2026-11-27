// The Trade screen's pending order: a signed quantity per trade item
// (positive to buy, negative to sell), applied when the player confirms or
// warps. It lives outside the screen so the map's Warp button can apply it
// too.

import { idiv } from '../engine/math';
import type { Game } from '../engine/game';
import {
  maxBuyable,
  maxSellable,
  tradeRows,
  tripCosts,
  warpBlocker,
  type TradeRow,
  type TripCosts,
  type WarpBlocker,
} from '../engine/trade';
import { app } from './state.svelte';
import { travel } from './travel.svelte';
import { ui } from './web-ui.svelte';

class TradePlan {
  order = $state<Record<number, number>>({});
  /** The system and day the order was made for; it's dropped when either changes. */
  private madeAt = '';

  set(game: Game, item: number, quantity: number): void {
    this.claim(game);
    this.order = { ...this.order, [item]: quantity };
  }

  setMany(game: Game, changes: Record<number, number>): void {
    this.claim(game);
    this.order = { ...this.order, ...changes };
  }

  clear(): void {
    this.order = {};
  }

  /** The order, or an empty one if it was made somewhere (or some day) else. */
  current(game: Game): Record<number, number> {
    // Read the order first, so views depend on it even while it's stale.
    const order = this.order;
    return this.madeAt === stamp(game) ? order : {};
  }

  private claim(game: Game): void {
    const now = stamp(game);
    if (this.madeAt !== now) {
      this.madeAt = now;
      this.order = {};
    }
  }
}

function stamp(game: Game): string {
  return `${game.commander.currentSystemId}:${game.commander.days}`;
}

export const plan = new TradePlan();

export interface PlanRow extends TradeRow {
  /** The pending quantity, clamped to what's possible now. */
  quantity: number;
  /** The most that can be sold (as a negative number) or 0. */
  min: number;
  /** The most that can be bought, given the rest of the order. */
  max: number;
}

export interface PlanView {
  rows: PlanRow[];
  /** Units bought and sold. */
  buying: number;
  selling: number;
  cashAfter: number;
  baysAfter: number;
  bays: number;
  /** Estimated value at the target of the hold after trading, and its cost; null without a target. */
  estimate: { value: number; cost: number; unknown: boolean } | null;
  trip: TripCosts | null;
  blocker: WarpBlocker | null;
  empty: boolean;
}

/** Cash and bays the rest of the order uses, for one row's limits. */
function others(rows: TradeRow[], order: Record<number, number>, except: number) {
  let bays = 0;
  let cash = 0;
  for (const row of rows) {
    if (row.item === except) continue;
    const q = order[row.item] ?? 0;
    bays += q;
    cash += q > 0 ? q * row.buyPrice : q * row.sellPrice;
  }
  return { bays, cash };
}

/** Everything the Trade screen shows for the pending order. */
export function planView(game: Game): PlanView {
  const base = tradeRows(game);
  const order: Record<number, number> = { ...plan.current(game) };

  // Clamp each quantity to what's possible now; earlier rows take priority.
  const rows: PlanRow[] = base.map((row) => {
    const min = -maxSellable(game, row.item);
    const max = maxBuyable(game, row.item, others(base, order, row.item));
    const quantity = Math.max(min, Math.min(max, order[row.item] ?? 0));
    order[row.item] = quantity;
    return { ...row, quantity, min, max };
  });

  const cmdr = game.commander;
  let cashAfter = cmdr.cash;
  let baysAfter = cmdr.ship.filledCargoBays;
  let buying = 0;
  let selling = 0;
  let value = 0;
  let cost = 0;
  let unknown = false;
  for (const row of rows) {
    const q = row.quantity;
    if (q > 0) {
      buying += q;
      cashAfter -= q * row.buyPrice;
    } else if (q < 0) {
      selling -= q;
      cashAfter -= q * row.sellPrice;
    }
    baysAfter += q;
    const held = row.held + q;
    const paid =
      q > 0 ? row.paid + q * row.buyPrice : q < 0 ? idiv(row.paid * held, row.held) : row.paid;
    if (held > 0) {
      cost += paid;
      if (row.estimate === null) unknown = true;
      else value += held * row.estimate;
    }
  }

  const target = game.warpSystem;
  return {
    rows,
    buying,
    selling,
    cashAfter,
    baysAfter,
    bays: cmdr.ship.cargoBays,
    estimate: target && target.destOk ? { value, cost, unknown } : null,
    trip: tripCosts(game),
    blocker: warpBlocker(game, cashAfter - cmdr.cash),
    empty: buying === 0 && selling === 0,
  };
}

/** Applies the order: sells first (to free bays and cash), then buys. */
async function applyOrder(game: Game, rows: PlanRow[]): Promise<void> {
  for (const row of rows)
    if (row.quantity < 0) await game.cargoSellSystem(row.item, false, -row.quantity);
  for (const row of rows)
    if (row.quantity > 0) await game.cargoBuySystem(row.item, false, row.quantity);
}

/** The Trade button: applies the pending order. */
export async function trade(): Promise<void> {
  const game = app.game;
  if (!game || app.busy) return;
  const { rows } = planView(game);
  await app.run((g) => applyOrder(g, rows));
  plan.clear();
}

/** The Warp button: applies the pending order, then warps (btnWarp_Click). */
export async function warp(): Promise<void> {
  const game = app.game;
  if (!game || app.busy) return;
  const { rows, empty } = planView(game);
  await app.task(async () => {
    const session = app.session!;
    if (!empty) await session.act((g) => applyOrder(g, rows));
    plan.clear();
    const g = session.game;
    if (!g) return;
    travel.start(g.commander.currentSystem!.name, g.warpSystem?.name ?? '');
    try {
      await session.warp();
    } finally {
      await endTrip();
    }
  });
}

/** The Jump button (Portable Singularity). */
export async function jump(): Promise<void> {
  await app.task(async () => {
    const session = app.session!;
    const g = session.game!;
    try {
      await session.jump(() =>
        travel.start(g.commander.currentSystem!.name, g.warpSystem?.name ?? ''),
      );
    } finally {
      if (travel.active) await endTrip();
    }
  });
}

/** Closes the travel view; notices from a trip that never showed it become toasts. */
async function endTrip(): Promise<void> {
  const unseen = await travel.finish(!app.session?.game);
  for (const entry of unseen) if (entry.kind === 'notice') ui.toast(entry.title, entry.text);
}
