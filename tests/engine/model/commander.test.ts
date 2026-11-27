import { afterEach, describe, expect, it } from 'vitest';
import { DialogResult } from '../../../src/engine/data/alerts';
import { Consts } from '../../../src/engine/data/consts';
import {
  AlertType,
  CrewMemberId,
  EquipmentType,
  GadgetType,
  ShieldType,
  ShipType,
  TradeItemType,
  WeaponType,
} from '../../../src/engine/data/enums';
import { Strings } from '../../../src/engine/data/strings';
import { setCurrentGame } from '../../../src/engine/game-context';
import { Commander } from '../../../src/engine/model/commander';
import { Ship } from '../../../src/engine/model/ship';
import { SpecialEvent } from '../../../src/engine/model/special-event';
import { useFakeGame } from '../fake-game';
import { ScriptedUI } from '../scripted-ui';

const originalCommanderName = Strings.CrewMemberNames[CrewMemberId.Commander]!;

afterEach(() => {
  setCurrentGame(null);
  Strings.CrewMemberNames[CrewMemberId.Commander] = originalCommanderName;
});

const { Yes, No } = DialogResult;
const firefly = () => Consts.ShipSpecs[ShipType.Firefly]!;

describe('a new Commander', () => {
  it('starts in a Gnat with a pulse laser and 1,000 credits', () => {
    const game = useFakeGame();
    const cmdr = game.cmdr;
    expect(cmdr.ship.type).toBe(ShipType.Gnat);
    expect(cmdr.ship.crew).toEqual([cmdr]);
    expect(cmdr.ship.weapons.map((w) => w?.type)).toEqual([WeaponType.PulseLaser]);
    expect(cmdr.cash).toBe(1000);
    expect(cmdr.currentSystem).toBe(game.universe[0]);
  });
});

describe('Commander money', () => {
  it('counts the ship at list price in net worth, plus the moon once bought', () => {
    const game = useFakeGame();
    const cmdr = game.cmdr;
    cmdr.debt = 300;
    expect(cmdr.worth).toBe(10000 + 1000 - 300);
    game.questStatusMoon = SpecialEvent.StatusMoonBought;
    expect(cmdr.worth).toBe(10000 + 1000 - 300 + SpecialEvent.MoonCost);
  });

  it('holds back the day’s costs when the reserve money option is on', () => {
    const game = useFakeGame();
    game.currentCosts = 250;
    expect(game.cmdr.cashToSpend).toBe(1000);
    game.options.reserveMoney = true;
    expect(game.cmdr.cashToSpend).toBe(750);
  });

  it('pays 10% interest, at least 1 credit, adding to the debt when cash runs out', () => {
    const cmdr = useFakeGame().cmdr;

    cmdr.payInterest();
    expect(cmdr.cash).toBe(1000); // no debt

    cmdr.debt = 1000;
    cmdr.payInterest();
    expect(cmdr.cash).toBe(900);

    cmdr.debt = 5;
    cmdr.payInterest();
    expect(cmdr.cash).toBe(899);

    cmdr.cash = 50;
    cmdr.debt = 1000;
    cmdr.payInterest();
    expect([cmdr.cash, cmdr.debt]).toEqual([0, 1050]);
  });

  it('keeps the no-claim days between 0 and the maximum', () => {
    const cmdr = useFakeGame().cmdr;
    cmdr.noClaim = -3;
    expect(cmdr.noClaim).toBe(0);
    cmdr.noClaim = 1000;
    expect(cmdr.noClaim).toBe(Consts.MaxNoClaim);
  });
});

describe('Commander.tradeShip', () => {
  it('refuses while in debt or short of cash', async () => {
    const cmdr = useFakeGame().cmdr;
    const ui = new ScriptedUI();

    cmdr.debt = 1;
    expect(await cmdr.tradeShip(firefly(), 500, ui)).toBe(false);
    cmdr.debt = 0;
    expect(await cmdr.tradeShip(firefly(), 5000, ui)).toBe(false);

    expect(ui.names).toEqual(['DebtNoBuy', 'ShipBuyIF']);
    expect(cmdr.ship.type).toBe(ShipType.Gnat);
  });

  it('refuses a ship without room for the crew', async () => {
    const game = useFakeGame();
    const cmdr = game.cmdr;
    const beetle = new Ship(ShipType.Beetle);
    beetle.crew[0] = cmdr;
    cmdr.ship = beetle;
    cmdr.cash = 100000;
    const ui = new ScriptedUI();

    beetle.hire(game.mercenaries[CrewMemberId.Alyssa]!);
    expect(await cmdr.tradeShip(firefly(), 0, ui)).toBe(false);

    beetle.hire(game.mercenaries[CrewMemberId.Princess]!);
    expect(await cmdr.tradeShip(firefly(), 0, ui)).toBe(false);

    expect(ui.alerts.map((a) => [a.name, ...a.args])).toEqual([
      ['ShipBuyCrewQuarters'],
      ['ShipBuyPassengerQuarters', 'Ziyal'], // the princess
    ]);
  });

  it('buys the ship when confirmed, keeping the crew but not the equipment', async () => {
    const cmdr = useFakeGame().cmdr;
    cmdr.cash = 20000;
    cmdr.priceCargo[TradeItemType.Water] = 99;
    const ui = new ScriptedUI({ [AlertType.ShipBuyConfirm]: [Yes] });

    expect(await cmdr.tradeShip(firefly(), 15000, ui)).toBe(true);

    expect(ui.alerts).toEqual([
      { type: AlertType.ShipBuyConfirm, name: 'ShipBuyConfirm', args: ['Gnat', 'Firefly', ''] },
    ]);
    expect(cmdr.ship.type).toBe(ShipType.Firefly);
    expect(cmdr.ship.crew).toEqual([cmdr]);
    expect(cmdr.ship.weapons).toEqual([null]);
    expect(cmdr.cash).toBe(5000);
  });

  it('changes nothing when not confirmed', async () => {
    const cmdr = useFakeGame().cmdr;
    cmdr.cash = 20000;
    const ui = new ScriptedUI({ [AlertType.ShipBuyConfirm]: [No] });
    expect(await cmdr.tradeShip(firefly(), 15000, ui)).toBe(false);
    expect(cmdr.ship.type).toBe(ShipType.Gnat);
    expect(cmdr.cash).toBe(20000);
  });

  it('offers to transfer special equipment and the escape pod', async () => {
    const cmdr = useFakeGame().cmdr;
    cmdr.cash = 200000;
    cmdr.ship.removeEquipment(EquipmentType.Weapon, 0);
    cmdr.ship.addEquipment(Consts.Weapons[WeaponType.MorgansLaser]!);
    cmdr.ship.addEquipment(Consts.Gadgets[GadgetType.FuelCompactor]!);
    cmdr.ship.escapePod = true;
    cmdr.insurance = true;
    const morgan = Consts.Weapons[WeaponType.MorgansLaser]!;

    const ui = new ScriptedUI({
      [AlertType.ShipBuyTransfer]: [Yes, No, No],
      [AlertType.ShipBuyConfirm]: [Yes],
    });
    expect(await cmdr.tradeShip(firefly(), 1000, ui)).toBe(true);

    expect(ui.alerts.map((a) => [a.name, ...a.args])).toEqual([
      ['ShipBuyTransfer', "Morgan's Laser", "morgan's laser", '45,833'],
      ['ShipBuyTransfer', 'Fuel Compactor', 'fuel compactor', '27,500'],
      ['ShipBuyTransfer', 'Escape Pod', 'escape pod', '200'],
      ['ShipBuyConfirm', 'Gnat', 'Firefly', Strings.ShipBuyTransfer],
    ]);
    expect(morgan.transferPrice).toBe(45833); // 50,000 * 3 / 4 * 110 / 90
    expect(cmdr.ship.weapons.map((w) => w?.type)).toEqual([WeaponType.MorgansLaser]);
    expect(cmdr.ship.gadgets).toEqual([null]);
    expect(cmdr.ship.escapePod).toBe(false);
    // Without an escape pod, insurance lapses.
    expect([cmdr.insurance, cmdr.noClaim]).toEqual([false, 0]);
    expect(cmdr.cash).toBe(200000 - 1000 - 45833);
  });

  it("warns about special equipment the new ship can't hold", async () => {
    const game = useFakeGame();
    const cmdr = game.cmdr;
    const ship = new Ship(ShipType.Firefly);
    ship.crew[0] = cmdr;
    ship.addEquipment(Consts.Shields[ShieldType.Lightning]!);
    cmdr.ship = ship;
    cmdr.cash = 100000;
    const ui = new ScriptedUI({ [AlertType.ShipBuyConfirm]: [Yes] });

    const gnat = Consts.ShipSpecs[ShipType.Gnat]!; // no shield slots
    expect(await cmdr.tradeShip(gnat, 0, ui)).toBe(true);
    expect(ui.alerts[0]!.name).toBe('ShipBuyNoSlots');
    expect(ui.alerts[0]!.args).toEqual(['Gnat', 'Lightning Shield', 'Shield']);
  });

  it('lets a custom name be shown for the new ship', async () => {
    const cmdr = useFakeGame().cmdr;
    cmdr.cash = 20000;
    const ui = new ScriptedUI({ [AlertType.ShipBuyConfirm]: [No] });
    await cmdr.tradeShip(firefly(), 15000, ui, 'Serenity');
    expect(ui.alerts[0]!.args.slice(0, 2)).toEqual(['Gnat', 'Serenity']);
  });
});

describe('Commander save format', () => {
  it('round-trips, and makes the loaded commander the ship’s captain', () => {
    const game = useFakeGame({ skills: [3, 4, 5, 6] });
    const cmdr = game.cmdr;
    cmdr.cash = 12345;
    cmdr.debt = 500;
    cmdr.killsPirate = 3;
    cmdr.policeRecordScore = -20;
    cmdr.reputationScore = 50;
    cmdr.days = 40;
    cmdr.insurance = true;
    cmdr.noClaim = 7;
    cmdr.priceCargo[TradeItemType.Food] = 400;
    cmdr.ship.cargo[TradeItemType.Food] = 4;
    Strings.CrewMemberNames[CrewMemberId.Commander] = 'Jameson';

    const hash = JSON.parse(JSON.stringify(cmdr.serialize()));
    expect(hash._name).toBe('Jameson');

    // As in the original, the game loads its mercenaries (including a plain
    // copy of the commander) before the commander.
    Strings.CrewMemberNames[CrewMemberId.Commander] = 'Someone Else';
    game.mercenaries[CrewMemberId.Commander] = Commander.fromHash(hash);
    const loaded = Commander.fromHash(hash);

    expect(loaded.serialize()).toEqual(hash);
    expect(loaded.name).toBe('Jameson');
    expect(game.mercenaries[CrewMemberId.Commander]).toBe(loaded);
    expect(loaded.ship.crew[0]).toBe(loaded);

    // So skill changes reach the ship.
    game.commander = loaded;
    loaded.trader = 9;
    expect(loaded.ship.trader).toBe(9);
  });
});
