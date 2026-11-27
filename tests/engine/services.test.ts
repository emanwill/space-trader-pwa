import { describe, expect, it } from 'vitest';
import { DialogResult } from '../../src/engine/data/alerts';
import { Consts } from '../../src/engine/data/consts';
import {
  AlertType,
  EquipmentType,
  GadgetType,
  GameEndType,
  ShipType,
  TechLevel,
  WeaponType,
} from '../../src/engine/data/enums';
import { Ship } from '../../src/engine/model/ship';
import { SpecialEvent } from '../../src/engine/model/special-event';
import {
  buyEquipment,
  buyEscapePod,
  buyFuel,
  buyRepairs,
  buyShip,
  canBuyEscapePod,
  equipmentForSale,
  getLoan,
  hireOrFire,
  jump,
  maxFuelPurchase,
  maxLoan,
  payBackLoan,
  retire,
  sellEquipment,
  shipPrices,
  toggleInsurance,
} from '../../src/engine/services';
import { setRandomSource } from '../../src/engine/rng';
import { newGame, reachableSystem, useGameCleanup } from './game-helpers';

useGameCleanup();

const { Yes, No } = DialogResult;

/** A new game, at a hi-tech system so everything is for sale. */
function docked(options: Parameters<typeof newGame>[0] = {}) {
  const result = newGame(options);
  result.game.commander.currentSystem!.techLevel = TechLevel.HiTech;
  return { ...result, cmdr: result.game.commander };
}

describe('fuel and repairs', () => {
  it('buys whole units of fuel, up to a full tank', () => {
    const { game, cmdr } = docked();
    cmdr.ship.fuel = 2;
    const cost = cmdr.ship.fuelCost;
    expect(maxFuelPurchase(game)).toBe((cmdr.ship.fuelTanks - 2) * cost);

    buyFuel(game, cost * 4 - 1); // Not quite enough for a fourth unit.
    expect(cmdr.ship.fuel).toBe(5);
    expect(cmdr.cash).toBe(1000 - 3 * cost);

    buyFuel(game, 1000000);
    expect(cmdr.ship.fuel).toBe(cmdr.ship.fuelTanks);
  });

  it('repairs the hull, limited by cash', () => {
    const { game, cmdr } = docked();
    cmdr.ship.hull = 10;
    cmdr.cash = 50;
    buyRepairs(game, 1000);
    expect(cmdr.ship.hull).toBe(10 + Math.trunc(50 / cmdr.ship.repairCost));
    expect(cmdr.cash).toBe(50 % cmdr.ship.repairCost);
  });
});

describe('the bank', () => {
  it('lends up to a limit set by worth and record', async () => {
    const { game, ui, cmdr } = docked();
    expect(maxLoan(game)).toBe(
      Math.min(25000, Math.max(1000, Math.trunc(cmdr.worth / 5000) * 500)),
    );

    await getLoan(game, 1000000);
    expect(cmdr.debt).toBe(maxLoan(game));
    await getLoan(game, 1);
    expect(ui.names).toEqual(['DebtTooLargeLoan']);

    cmdr.policeRecordScore = -10;
    expect(maxLoan(game)).toBe(500);
  });

  it('takes repayments up to the debt and the cash on hand', async () => {
    const { game, ui, cmdr } = docked();
    await payBackLoan(game, 10);
    expect(ui.names).toEqual(['DebtNone']);

    cmdr.debt = 300;
    await payBackLoan(game, 5000);
    expect(cmdr.debt).toBe(0);
    expect(cmdr.cash).toBe(700);
  });

  it('insures only a ship with an escape pod', async () => {
    const { game, ui, cmdr } = docked({ ui: { answers: { [AlertType.InsuranceStop]: [Yes] } } });
    await toggleInsurance(game);
    expect(ui.names).toEqual(['InsuranceNoEscapePod']);

    cmdr.ship.escapePod = true;
    await toggleInsurance(game);
    expect(cmdr.insurance).toBe(true);
    cmdr.noClaim = 5;

    await toggleInsurance(game);
    expect(cmdr.insurance).toBe(false);
    expect(cmdr.noClaim).toBe(0);
  });
});

describe('the shipyard', () => {
  it('sells an escape pod for 2,000 credits', async () => {
    const { game, cmdr } = docked({ ui: { answers: { [AlertType.EquipmentEscapePod]: [Yes] } } });
    expect(canBuyEscapePod(game)).toBe(false);
    cmdr.cash = 2500;
    expect(canBuyEscapePod(game)).toBe(true);

    expect(await buyEscapePod(game)).toBe(true);
    expect(cmdr.ship.escapePod).toBe(true);
    expect(cmdr.cash).toBe(500);
    expect(canBuyEscapePod(game)).toBe(false);
  });

  it('prices ships net of the trade-in, except the one the commander flies', () => {
    const { game, cmdr } = docked();
    const prices = shipPrices(game);
    expect(prices).toHaveLength(Consts.MaxShip + 1);
    expect(prices[ShipType.Gnat]).toBeNull();
    expect(prices[ShipType.Firefly]).toBe(
      Consts.ShipSpecs[ShipType.Firefly]!.price - cmdr.ship.worth(false),
    );
  });

  it('trades the ship in, and the hardened hull goes with it', async () => {
    const { game, cmdr } = docked({ ui: { answers: { [AlertType.ShipBuyConfirm]: [Yes] } } });
    cmdr.cash = 100000;
    game.questStatusScarab = SpecialEvent.StatusScarabDone;

    expect(await buyShip(game, ShipType.Firefly)).toBe(true);
    expect(cmdr.ship.type).toBe(ShipType.Firefly);
    expect(game.questStatusScarab).toBe(SpecialEvent.StatusScarabNotStarted);
  });
});

describe('equipment', () => {
  it('sells only what this tech level makes', () => {
    const { game } = docked();
    expect(equipmentForSale()).toHaveLength(Consts.EquipmentForSale.length);
    game.commander.currentSystem!.techLevel = TechLevel.PreAgricultural;
    expect(equipmentForSale()).toHaveLength(0);
  });

  it('buys equipment after confirming', async () => {
    const { game, ui, cmdr } = docked({ ui: { answers: { [AlertType.EquipmentBuy]: [No, Yes] } } });
    cmdr.cash = 100000;
    const navigator = Consts.Gadgets[GadgetType.NavigatingSystem]!;

    expect(await buyEquipment(game, navigator)).toBe(false);
    expect(await buyEquipment(game, navigator)).toBe(true);
    expect(cmdr.ship.hasGadget(GadgetType.NavigatingSystem)).toBe(true);
    expect(cmdr.cash).toBe(100000 - navigator.price);
    expect(ui.alerts[0]!.args).toEqual([navigator.name, navigator.price.toLocaleString('en-US')]);
  });

  it('refuses equipment the commander owns, cannot afford or has no slot for', async () => {
    const { game, ui, cmdr } = docked({ ui: { answers: { [AlertType.EquipmentBuy]: [Yes] } } });
    const laser = Consts.Weapons[WeaponType.BeamLaser]!;

    await buyEquipment(game, laser); // 1,000 credits isn't enough.
    cmdr.cash = 100000;
    await buyEquipment(game, laser); // The Gnat's only weapon slot is taken.
    cmdr.debt = 1;
    await buyEquipment(game, laser);

    expect(ui.names).toEqual(['EquipmentIF', 'EquipmentNotEnoughSlots', 'DebtNoBuy']);
  });

  it('sells equipment for its resale price', async () => {
    const { game, cmdr } = docked({ ui: { answers: { [AlertType.EquipmentSell]: [Yes] } } });
    const laser = cmdr.ship.weapons[0]!;

    expect(await sellEquipment(game, EquipmentType.Weapon, 0)).toBe(true);
    expect(cmdr.ship.weapons[0]).toBeNull();
    expect(cmdr.cash).toBe(1000 + laser.sellPrice);
  });
});

describe('crew', () => {
  it('hires a mercenary with a free berth and fires after confirming', async () => {
    const { game, ui, cmdr } = docked({
      ui: { answers: { [AlertType.CrewFireMercenary]: [Yes] } },
    });
    const merc = game.mercenaries[3]!;

    await hireOrFire(game, merc);
    expect(ui.names).toEqual(['CrewNoQuarters']);

    cmdr.ship = new Ship(ShipType.Wasp);
    cmdr.ship.crew[0] = cmdr;
    await hireOrFire(game, merc);
    expect(cmdr.ship.hasCrew(merc.id)).toBe(true);

    await hireOrFire(game, merc);
    expect(cmdr.ship.hasCrew(merc.id)).toBe(false);
  });
});

describe('the main window', () => {
  it('jumps anywhere with the singularity, then it is used up', async () => {
    const { game, ui, cmdr } = docked({ ui: { answers: { [AlertType.ChartJump]: [Yes] } } });
    game.canSuperWarp = true;
    setRandomSource(() => 0.999);

    expect(await jump(game)).toBe(false);
    game.selectedSystemId = cmdr.currentSystemId;
    expect(await jump(game)).toBe(false);

    const target = game.universe.find((s) => !s.destOk && s !== cmdr.currentSystem)!;
    game.selectedSystemId = target.id;
    expect(await jump(game)).toBe(true);

    expect(ui.names.slice(0, 3)).toEqual([
      'ChartJumpNoSystemSelected',
      'ChartJumpCurrent',
      'ChartJump',
    ]);
    expect(cmdr.currentSystem).toBe(target);
    expect(game.canSuperWarp).toBe(false);
    expect(cmdr.days).toBe(0); // A jump takes no time and no fuel.
    expect(game.newsEvents).toEqual([]);
  });

  it('retires after confirming', async () => {
    const { game } = docked({ ui: { answers: { [AlertType.GameRetire]: [No, Yes] } } });
    expect(await retire(game)).toBe(false);
    expect(game.endStatus).toBe(GameEndType.NA);
    expect(await retire(game)).toBe(true);
    expect(game.endStatus).toBe(GameEndType.Retired);
  });

  it('can warp to a reachable system', async () => {
    const { game } = docked();
    game.selectedSystemId = reachableSystem(game).id;
    setRandomSource(() => 0.999);
    await game.warp(false);
    expect(game.commander.currentSystem).toBe(game.warpSystem);
  });
});
