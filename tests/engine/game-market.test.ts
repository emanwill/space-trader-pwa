import { describe, expect, it } from 'vitest';
import { DialogResult } from '../../src/engine/data/alerts';
import { Consts } from '../../src/engine/data/consts';
import {
  AlertType,
  CargoBuyOp,
  CargoSellOp,
  Difficulty,
  NewsEvent,
  TradeItemType,
} from '../../src/engine/data/enums';
import { setRandomSource } from '../../src/engine/rng';
import { newGame, useGameCleanup } from './game-helpers';

useGameCleanup();

const water = TradeItemType.Water;

/** A game with known stock and prices for water at the current system. */
function market(options: Parameters<typeof newGame>[0] = {}) {
  const { game, ui } = newGame(options);
  const system = game.commander.currentSystem!;
  system.tradeItems[water] = 50;
  game.priceCargoBuy[water] = 30;
  game.priceCargoSell[water] = 25;
  return { game, ui, cmdr: game.commander, system };
}

describe('buying from the market', () => {
  it('buys as much as fits, is in stock and is affordable', () => {
    const { game, cmdr, system } = market();
    // Gnat: 15 bays. 1,000 credits buys 33 at 30.
    return game.cargoBuySystem(water, true).then(() => {
      expect(cmdr.ship.cargo[water]).toBe(15);
      expect(system.tradeItems[water]).toBe(35);
      expect(cmdr.cash).toBe(1000 - 15 * 30);
      expect(cmdr.priceCargo[water]).toBe(15 * 30);
    });
  });

  it('is limited by cash and the bays to leave empty', async () => {
    const { game, cmdr } = market();
    cmdr.cash = 200;
    await game.cargoBuySystem(water, true);
    expect(cmdr.ship.cargo[water]).toBe(6);

    cmdr.cash = 10000;
    game.options.leaveEmpty = 5;
    await game.cargoBuySystem(water, true);
    expect(cmdr.ship.cargo[water]).toBe(10);
  });

  it('asks how many, offering the maximum', async () => {
    const { game, ui, cmdr } = market({ ui: { quantities: [4, 0, 99] } });

    await game.cargoBuySystem(water, false);
    expect(ui.quantityRequests[0]).toEqual({
      kind: 'buy',
      op: CargoBuyOp.BuySystem,
      tradeItem: water,
      max: 15,
      unitPrice: 30,
    });
    expect(cmdr.ship.cargo[water]).toBe(4);

    // Cancelled.
    await game.cargoBuySystem(water, false);
    expect(cmdr.ship.cargo[water]).toBe(4);

    // More than allowed is clamped to the maximum.
    await game.cargoBuySystem(water, false);
    expect(cmdr.ship.cargo[water]).toBe(15);
  });

  it('refuses when deep in debt, out of stock, out of room or out of cash', async () => {
    const { game, ui, cmdr, system } = market();

    cmdr.debt = Consts.DebtTooLarge + 1;
    await game.cargoBuySystem(water, true);
    cmdr.debt = 0;

    system.tradeItems[water] = 0;
    await game.cargoBuySystem(water, true);
    system.tradeItems[water] = 50;

    cmdr.cash = 10;
    await game.cargoBuySystem(water, true);

    cmdr.cash = 1000;
    cmdr.ship.cargo[TradeItemType.Ore] = 15;
    await game.cargoBuySystem(water, true);

    expect(ui.names).toEqual([
      'DebtTooLargeTrade',
      'CargoNoneAvailable',
      'CargoIF',
      'CargoNoEmptyBays',
    ]);
    expect(cmdr.ship.cargo[water]).toBe(0);
  });
});

describe('selling to the market', () => {
  it('sells everything and forgets what it cost', async () => {
    const { game, cmdr } = market();
    cmdr.ship.cargo[water] = 10;
    cmdr.priceCargo[water] = 200;

    await game.cargoSellSystem(water, true);
    expect(cmdr.ship.cargo[water]).toBe(0);
    expect(cmdr.cash).toBe(1000 + 10 * 25);
    expect(cmdr.priceCargo[water]).toBe(0);
  });

  it('keeps the average cost of what is left after a partial sale', async () => {
    const { game, ui, cmdr } = market({ ui: { quantities: [3] } });
    cmdr.ship.cargo[water] = 10;
    cmdr.priceCargo[water] = 205;

    await game.cargoSellSystem(water, false);
    expect(ui.quantityRequests[0]).toMatchObject({
      op: CargoSellOp.SellSystem,
      max: 10,
      unitPrice: 25,
    });
    expect(cmdr.ship.cargo[water]).toBe(7);
    expect(cmdr.priceCargo[water]).toBe(Math.trunc((205 * 7) / 10));
  });

  it('says so when there is nothing to sell or no buyer', async () => {
    const { game, ui, cmdr } = market();
    await game.cargoSellSystem(water, true);
    cmdr.ship.cargo[water] = 1;
    game.priceCargoSell[water] = 0;
    await game.cargoSellSystem(water, true);

    expect(ui.names).toEqual(['CargoNoneToSell', 'CargoNotInterested']);
    expect(ui.alerts[0]!.args).toEqual(['Sell']);
  });

  it('charges for dumping, depending on difficulty', async () => {
    const { game, ui, cmdr } = market({ difficulty: Difficulty.Hard, ui: { quantities: [4] } });
    cmdr.ship.cargo[water] = 10;
    cmdr.priceCargo[water] = 100;

    await game.cargoDump(water);
    // 5 credits per unit, times difficulty + 1.
    expect(ui.quantityRequests[0]).toMatchObject({ op: CargoSellOp.Dump, unitPrice: -20 });
    expect(cmdr.cash).toBe(1000 - 4 * 20);
    expect(cmdr.ship.cargo[water]).toBe(6);
  });

  it('dumps no more than the commander can pay for', async () => {
    const { game, ui, cmdr } = market();
    cmdr.ship.cargo[water] = 10;
    cmdr.cash = 45; // 15 credits a unit on Normal

    await game.cargoDump(water);
    expect(ui.quantityRequests[0]!.max).toBe(3);
  });
});

describe('jettisoning cargo', () => {
  it('warns a lawful commander once, and remembers the warning', async () => {
    const { game, ui, cmdr } = market({
      ui: { answers: { [AlertType.EncounterDumpWarning]: [DialogResult.No] } },
    });
    cmdr.ship.cargo[water] = 10;
    setRandomSource(() => 0.99); // Never caught.

    await game.cargoJettison(water, true);
    expect(ui.names).toEqual(['EncounterDumpWarning']);
    expect(game.litterWarning).toBe(true);
    expect(cmdr.ship.cargo[water]).toBe(10);

    await game.cargoJettison(water, true);
    expect(ui.names).toEqual(['EncounterDumpWarning']);
    expect(cmdr.ship.cargo[water]).toBe(0);
    expect(cmdr.cash).toBe(1000);
  });

  it('may get the commander caught littering', async () => {
    const { game, ui, cmdr } = market();
    ui.answer(AlertType.EncounterDumpWarning, DialogResult.Yes);
    cmdr.ship.cargo[water] = 10;
    cmdr.policeRecordScore = 10;
    setRandomSource(() => 0); // Always caught.

    await game.cargoJettison(water, true);
    expect(cmdr.policeRecordScore).toBe(Consts.PoliceRecordScoreDubious);
    expect(game.newsEvents).toEqual([NewsEvent.CaughtLittering]);

    cmdr.ship.cargo[water] = 1;
    await game.cargoJettison(water, true);
    expect(cmdr.policeRecordScore).toBe(Consts.PoliceRecordScoreDubious - 1);
  });
});

describe('trading in orbit', () => {
  it('buys from a trader at a rounded price within the trade limits', async () => {
    const { game, ui, cmdr } = market({ ui: { quantities: [2] } });
    const item = Consts.TradeItems[TradeItemType.Robots]!;
    game.priceCargoBuy[TradeItemType.Robots] = 4000;
    game.opponent.cargo[TradeItemType.Robots] = 5;
    cmdr.cash = 100000;

    await game.cargoBuyTrader(TradeItemType.Robots);
    const { unitPrice } = ui.quantityRequests[0]!;
    expect([3600, 4400]).toContain(unitPrice); // 0.9 or 1.1 times, rounded to 100
    expect(unitPrice % item.roundOff).toBe(0);
    expect(cmdr.ship.cargo[TradeItemType.Robots]).toBe(2);
    expect(game.opponent.cargo[TradeItemType.Robots]).toBe(3);
    expect(cmdr.cash).toBe(100000 - 2 * unitPrice);
  });

  it("limits a purchase by the trader's price, so cash can't go negative", async () => {
    const { game, ui, cmdr } = market();
    game.priceCargoBuy[TradeItemType.Robots] = 4000;
    game.opponent.cargo[TradeItemType.Robots] = 10;
    cmdr.cash = 9000;
    setRandomSource(() => 0); // The trader asks 10% more: 4,400.

    await game.cargoBuyTrader(TradeItemType.Robots);
    expect(ui.quantityRequests[0]).toMatchObject({ unitPrice: 4400, max: 2 });
    expect(cmdr.cash).toBe(9000 - 8800);
  });

  it('sells to a trader with room in its hold', async () => {
    const { game, ui, cmdr } = market();
    cmdr.ship.cargo[water] = 10;
    game.opponent.cargo.fill(0);

    await game.cargoSellTrader(water);
    expect(ui.quantityRequests[0]).toMatchObject({
      kind: 'sell',
      op: CargoSellOp.SellTrader,
      max: Math.min(10, game.opponent.freeCargoBays),
    });
  });
});

describe('market prices', () => {
  it('makes buying dearer than selling, less so for a better trader', () => {
    const { game } = newGame({ skills: [5, 5, 10, 0] });
    const cmdr = game.commander;
    const system = cmdr.currentSystem!;
    game.priceCargoSell.fill(1000);
    game.recalculateBuyPrices(system);
    for (let i = 0; i < 10; i++)
      if (system.itemTraded(Consts.TradeItems[i]!)) expect(game.priceCargoBuy[i]).toBe(1030);
  });

  it('marks prices up for criminals, who must pay an intermediary', () => {
    const { game } = newGame({ skills: [5, 5, 10, 0] });
    const cmdr = game.commander;
    cmdr.policeRecordScore = Consts.PoliceRecordScoreCriminal;
    game.priceCargoSell.fill(900);
    game.recalculateBuyPrices(cmdr.currentSystem!);
    const traded = Consts.TradeItems.findIndex((item) => cmdr.currentSystem!.itemTraded(item));
    // 900 * 100 / 90 = 1,000, then plus 3%.
    expect(game.priceCargoBuy[traded]).toBe(1030);
  });

  it('raises sell prices again when a record is cleaned', () => {
    const { game } = newGame();
    const cmdr = game.commander;
    game.priceCargoSell.fill(90);
    game.recalculateSellPrices(cmdr.currentSystem!);
    expect(game.priceCargoSell).toEqual(new Array(10).fill(100));
  });
});
