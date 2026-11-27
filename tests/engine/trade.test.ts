import { describe, expect, it } from 'vitest';
import { Consts } from '../../src/engine/data/consts';
import { AlertType, CrewMemberId, TradeItemType } from '../../src/engine/data/enums';
import { wormholeExists } from '../../src/engine/functions';
import {
  dumpCost,
  estimatedSellPrice,
  maxBuyable,
  maxDumpable,
  maxSellable,
  systemsInRange,
  tradeRows,
  tripCosts,
  warpBlocker,
} from '../../src/engine/trade';
import { moveTo, newGame, reachableSystem, useGameCleanup } from './game-helpers';

useGameCleanup();

/** A new game with plenty of cash and a target in range. */
function tradingGame() {
  const { game, ui } = newGame({ seed: 7 });
  game.commander.cash = 100000;
  game.selectedSystemId = reachableSystem(game).id;
  return { game, ui };
}

/** An item for sale here. */
function forSale(game: ReturnType<typeof tradingGame>['game']): number {
  const item = game.priceCargoBuy.findIndex(
    (price, i) => price > 0 && game.commander.currentSystem!.tradeItems[i]! > 0,
  );
  expect(item).toBeGreaterThanOrEqual(0);
  return item;
}

describe('buying and selling a given amount', () => {
  it('buys the amount without asking, clamped to the limit', async () => {
    const { game, ui } = tradingGame();
    const item = forSale(game);
    await game.cargoBuySystem(item, false, 2);
    expect(game.commander.ship.cargo[item]).toBe(2);
    expect(ui.quantityRequests).toEqual([]);

    const max = maxBuyable(game, item);
    await game.cargoBuySystem(item, false, 1000);
    expect(game.commander.ship.cargo[item]).toBe(2 + max);
  });

  it('sells and dumps the amount without asking', async () => {
    const { game, ui } = tradingGame();
    const item = forSale(game);
    await game.cargoBuySystem(item, false, 5);
    const cash = game.commander.cash;
    await game.cargoSellSystem(item, false, 2);
    expect(game.commander.ship.cargo[item]).toBe(3);
    expect(game.commander.cash).toBe(cash + 2 * game.priceCargoSell[item]!);

    await game.cargoDump(item, 1);
    expect(game.commander.ship.cargo[item]).toBe(2);
    expect(ui.quantityRequests).toEqual([]);
  });

  it('still asks when no amount is given', async () => {
    const { game, ui } = tradingGame();
    await game.cargoBuySystem(forSale(game), false);
    expect(ui.quantityRequests).toHaveLength(1);
  });
});

describe('maxBuyable', () => {
  it('matches what Buy Max buys', async () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const { game } = newGame({ seed });
      for (let item = 0; item < Consts.TradeItems.length; item++) {
        const before = game.commander.ship.cargo[item]!;
        const expected = maxBuyable(game, item);
        await game.cargoBuySystem(item, true);
        expect(game.commander.ship.cargo[item]! - before, `seed ${seed} item ${item}`).toBe(
          expected,
        );
      }
    }
  });

  it('respects leave-empty, the debt limit and a plan', () => {
    const { game } = tradingGame();
    const item = forSale(game);
    const stock = game.commander.currentSystem!.tradeItems[item]!;
    const free = game.commander.ship.freeCargoBays;
    expect(maxBuyable(game, item)).toBe(Math.min(free, stock));

    game.options.leaveEmpty = 3;
    expect(maxBuyable(game, item)).toBe(Math.min(free - 3, stock));
    expect(maxBuyable(game, item, { bays: free })).toBe(0);
    game.options.leaveEmpty = 0;

    game.commander.cash = game.priceCargoBuy[item]! * 2;
    expect(maxBuyable(game, item)).toBe(Math.min(2, stock));
    expect(maxBuyable(game, item, { cash: game.commander.cash })).toBe(0);
    expect(maxBuyable(game, item, { cash: -game.priceCargoBuy[item]! })).toBe(Math.min(3, stock));

    game.commander.debt = Consts.DebtTooLarge + 1;
    expect(maxBuyable(game, item)).toBe(0);
  });

  it('gives sell and dump limits', async () => {
    const { game } = tradingGame();
    const item = forSale(game);
    await game.cargoBuySystem(item, false, 4);
    expect(maxSellable(game, item)).toBe(game.priceCargoSell[item]! > 0 ? 4 : 0);
    expect(dumpCost(game)).toBe(5 * (game.difficulty + 1));
    game.commander.cash = dumpCost(game) * 3;
    expect(maxDumpable(game, item)).toBe(3);
  });
});

describe('tradeRows', () => {
  it('shows no estimates without a target in range', () => {
    const { game } = newGame();
    expect(game.warpSystem).toBeNull();
    for (const row of tradeRows(game)) {
      expect(row.estimate).toBeNull();
      expect(row.margin).toBeNull();
      expect(row.buyProfitable).toBe(false);
    }
  });

  it('estimates the target price and margin like the cargo panel', () => {
    const { game } = tradingGame();
    const target = game.warpSystem!;
    const rows = tradeRows(game);
    expect(rows).toHaveLength(10);
    for (const row of rows) {
      const price = Consts.TradeItems[row.item]!.standardPrice(target);
      expect(row.estimate).toBe(price > 0 ? price : null);
      expect(estimatedSellPrice(row.item, target)).toBe(row.estimate);
      if (row.estimate !== null && row.buyPrice > 0) {
        expect(row.margin).toBe(row.estimate - row.buyPrice);
        expect(row.marginPercent).toBe(Math.trunc((100 * row.margin!) / row.buyPrice));
        expect(row.buyProfitable).toBe(row.margin! > 0 && row.stock > 0);
      } else expect(row.margin).toBeNull();
    }
    expect(rows[TradeItemType.Firearms]!.illegal).toBe(true);
  });

  it('marks a hold that would sell at a profit', async () => {
    const { game } = tradingGame();
    const item = forSale(game);
    await game.cargoBuySystem(item, false, 3);
    let row = tradeRows(game)[item]!;
    expect(row.held).toBe(3);
    expect(row.paid).toBe(3 * game.priceCargoBuy[item]!);
    // Sell prices are below buy prices in the same system.
    expect(row.sellProfitable).toBe(false);
    game.commander.priceCargo[item] = 1;
    row = tradeRows(game)[item]!;
    expect(row.sellProfitable).toBe(row.sellPrice > 0);
  });
});

describe('trip costs and warp checks', () => {
  it('lists the departure charges', () => {
    const { game } = tradingGame();
    game.commander.debt = 2000;
    const costs = tripCosts(game)!;
    expect(costs.distance).toBe(game.warpSystem!.distance);
    expect(costs.fuel).toBe(
      wormholeExists(game.commander.currentSystem!, game.warpSystem) ? 0 : costs.distance,
    );
    expect(costs.interest).toBe(game.interestCosts);
    expect(costs.total).toBe(
      game.mercenaryCosts + game.insuranceCosts + game.wormholeCosts + game.interestCosts,
    );
    game.selectedSystemId = -1;
    expect(tripCosts(game)).toBeNull();
  });

  it('burns no fuel through a wormhole and charges the tax', () => {
    const { game } = tradingGame();
    moveTo(game, game.wormholes[0]!);
    game.selectedSystemId = game.commander.currentSystemId;
    game.targetWormhole = true;
    expect(game.warpSystem!.id).toBe(game.wormholes[1]);
    const costs = tripCosts(game)!;
    expect(costs.fuel).toBe(0);
    expect(costs.wormholeTax).toBe(Consts.WormDist * game.commander.ship.fuelCost);
  });

  it('gives the same answer as Warp', async () => {
    const { game, ui } = tradingGame();
    expect(warpBlocker(game)).toBeNull();

    game.selectedSystemId = -1;
    expect(warpBlocker(game)).toBe('no-target');
    game.selectedSystemId = game.commander.currentSystemId;
    expect(warpBlocker(game)).toBe('out-of-range');
    const far = game.universe.find((s) => !s.destOk && s !== game.commander.currentSystem)!;
    game.selectedSystemId = far.id;
    expect(warpBlocker(game)).toBe('out-of-range');
    game.selectedSystemId = reachableSystem(game).id;

    game.commander.ship.hire(game.mercenaries[CrewMemberId.Zeethibal + 1]!);
    game.commander.cash = game.mercenaryCosts - 1;
    expect(warpBlocker(game)).toBe(AlertType.LeavingIFMercenaries);
    expect(warpBlocker(game, 1)).toBeNull();
    const here = game.commander.currentSystem;
    await game.warp(false);
    expect(ui.alerts.at(-1)!.type).toBe(AlertType.LeavingIFMercenaries);
    expect(game.commander.currentSystem).toBe(here);

    game.commander.cash = 1000000;
    game.commander.debt = Consts.DebtTooLarge + 1;
    expect(warpBlocker(game)).toBe(AlertType.DebtTooLargeGrounded);
  });

  it('cycles through the systems in range', () => {
    const { game } = tradingGame();
    expect(systemsInRange(game).map((s) => s.id)).toEqual(game.destinations);
    expect(systemsInRange(game).every((s) => s.destOk)).toBe(true);
  });
});
