import { beforeEach, describe, expect, it } from 'vitest';
import { GameSession } from '../../src/app/session';
import { MemoryStore } from '../../src/app/storage';
import { Difficulty } from '../../src/engine/data/enums';
import type { Game } from '../../src/engine/game';
import { seededRandomSource, setRandomSource } from '../../src/engine/rng';
import { maxBuyable, tradeRows } from '../../src/engine/trade';
import { app } from '../../src/ui/state.svelte';
import { plan, planView, trade, warp } from '../../src/ui/trade-plan.svelte';
import { reachableSystem, useGameCleanup } from '../engine/game-helpers';
import { ScriptedUI } from '../engine/scripted-ui';

useGameCleanup();

let game: Game;

beforeEach(async () => {
  setRandomSource(seededRandomSource(11));
  app.session = await GameSession.open(new MemoryStore(), new ScriptedUI());
  game = await app.session.newGame({
    name: 'Planner',
    difficulty: Difficulty.Easy,
    pilot: 5,
    fighter: 5,
    trader: 5,
    engineer: 5,
  });
  game.commander.cash = 5000;
  app.screen = 'game';
  plan.clear();
});

/** Items for sale here, cheapest first. */
function forSale(): number[] {
  return tradeRows(game)
    .filter((r) => r.buyPrice > 0 && r.stock > 0)
    .sort((a, b) => a.buyPrice - b.buyPrice)
    .map((r) => r.item);
}

describe('planView', () => {
  it('starts empty and matches the market', () => {
    const view = planView(game);
    expect(view.empty).toBe(true);
    expect(view.cashAfter).toBe(5000);
    expect(view.baysAfter).toBe(0);
    expect(view.rows.map((r) => r.quantity)).toEqual(new Array(10).fill(0));
    expect(view.rows.map((r) => r.max)).toEqual(
      tradeRows(game).map((r) => maxBuyable(game, r.item)),
    );
  });

  it('totals a purchase and clamps it to the limit', () => {
    const [item] = forSale();
    const price = game.priceCargoBuy[item!]!;
    plan.set(game, item!, 3);
    let view = planView(game);
    expect(view.rows[item!]!.quantity).toBe(3);
    expect(view.cashAfter).toBe(5000 - 3 * price);
    expect(view.baysAfter).toBe(3);
    expect(view.buying).toBe(3);

    plan.set(game, item!, 1000);
    view = planView(game);
    expect(view.rows[item!]!.quantity).toBe(maxBuyable(game, item!));
  });

  it('shares bays and cash between rows', () => {
    const [a, b] = forSale();
    plan.set(game, a!, game.commander.ship.cargoBays - 2);
    const view = planView(game);
    expect(view.rows[b!]!.max).toBeLessThanOrEqual(2);
  });

  it('sells held cargo with negative quantities', async () => {
    const [item] = forSale();
    await game.cargoBuySystem(item!, false, 4);
    const view0 = planView(game);
    expect(view0.rows[item!]!.min).toBe(game.priceCargoSell[item!]! > 0 ? -4 : 0);
    plan.set(game, item!, -4);
    const view = planView(game);
    expect(view.selling).toBe(4);
    expect(view.baysAfter).toBe(0);
    expect(view.cashAfter).toBe(game.commander.cash + 4 * game.priceCargoSell[item!]!);
  });

  it('forgets an order made on another day', () => {
    const [item] = forSale();
    plan.set(game, item!, 2);
    expect(planView(game).empty).toBe(false);
    game.commander.days++;
    expect(planView(game).empty).toBe(true);
  });

  it('estimates the hold at the target', () => {
    game.selectedSystemId = reachableSystem(game).id;
    const [item] = forSale();
    plan.set(game, item!, 2);
    const view = planView(game);
    const row = view.rows[item!]!;
    expect(view.estimate).not.toBeNull();
    expect(view.estimate!.cost).toBe(2 * row.buyPrice);
    expect(view.estimate!.value).toBe(2 * (row.estimate ?? 0));
    expect(view.estimate!.unknown).toBe(row.estimate === null);
  });
});

describe('applying the plan', () => {
  it('sells, then buys, and clears the order', async () => {
    const [a, b] = forSale();
    await game.cargoBuySystem(a!, false, 3);
    const cash = game.commander.cash;
    plan.setMany(game, { [a!]: -3, [b!]: 2 });
    const expected = planView(game).cashAfter;
    await trade();
    expect(game.commander.ship.cargo[a!]).toBe(game.priceCargoSell[a!]! > 0 ? 0 : 3);
    expect(game.commander.ship.cargo[b!]).toBe(2);
    if (game.priceCargoSell[a!]! > 0) expect(game.commander.cash).toBe(expected);
    else expect(game.commander.cash).toBeLessThan(cash);
    expect(planView(game).empty).toBe(true);
  });

  it('trades and warps in one go', async () => {
    const target = reachableSystem(game);
    game.selectedSystemId = target.id;
    const [item] = forSale();
    plan.set(game, item!, 2);
    await warp();
    // The encounter, if any, may have changed the hold; the trip itself happened.
    expect(game.commander.days).toBeGreaterThan(0);
    expect(game.commander.currentSystem).toBe(target);
    expect(planView(game).empty).toBe(true);
  });

  it('does nothing while another action runs', async () => {
    const [item] = forSale();
    plan.set(game, item!, 1);
    app.busy = true;
    await trade();
    app.busy = false;
    expect(game.commander.ship.cargo[item!]).toBe(0);
    expect(planView(game).rows[item!]!.quantity).toBe(1);
  });
});
