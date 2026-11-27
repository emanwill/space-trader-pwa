import { afterEach, describe, expect, it } from 'vitest';
import { Consts } from '../../../src/engine/data/consts';
import {
  CrewMemberId,
  Difficulty,
  EquipmentType,
  GadgetType,
  OpponentType,
  ShieldType,
  ShipType,
  SkillType,
  TradeItemType,
  WeaponType,
} from '../../../src/engine/data/enums';
import { setCurrentGame } from '../../../src/engine/game-context';
import { CrewMember } from '../../../src/engine/model/crew-member';
import { Ship } from '../../../src/engine/model/ship';
import { SpecialEvent } from '../../../src/engine/model/special-event';
import { seededRandomSource, setRandomSource } from '../../../src/engine/rng';
import { type FakeGame, useFakeGame } from '../fake-game';

afterEach(() => {
  setCurrentGame(null);
  setRandomSource(Math.random);
});

const gadget = (type: GadgetType) => Consts.Gadgets[type]!;
const shield = (type: ShieldType) => Consts.Shields[type]!;
const weapon = (type: WeaponType) => Consts.Weapons[type]!;

/** Gives the commander a new ship of the given type, crewed by the commander alone. */
function boardShip(game: FakeGame, type: ShipType): Ship {
  const ship = new Ship(type);
  ship.crew[0] = game.cmdr;
  game.cmdr.ship = ship;
  return ship;
}

describe('a new Ship', () => {
  it('copies its spec, with empty slots, full tanks and a full hull', () => {
    useFakeGame();
    const ship = new Ship(ShipType.Gnat);
    expect(ship.name).toBe('Gnat');
    expect(ship.weapons).toEqual([null]);
    expect(ship.shields).toEqual([]);
    expect(ship.gadgets).toEqual([null]);
    expect(ship.crew).toEqual([null]);
    expect(ship.fuel).toBe(14);
    expect(ship.hull).toBe(100);
    expect(ship.cargoBays).toBe(15);
  });
});

describe('Ship worth', () => {
  it('values a ship at 3/4 of its price plus 3/4 of its equipment', () => {
    const game = useFakeGame();
    const ship = game.cmdr.ship; // Gnat (10,000 cr.) with a pulse laser (2,000 cr.)
    expect(ship.baseWorth(false)).toBe(7500 + 1500);
  });

  it('subtracts the cost of repairs and fuel', () => {
    const game = useFakeGame();
    const ship = game.cmdr.ship;
    ship.hull = 90; // 10 points at 2 cr.
    ship.fuel = 10; // 4 units at 1 cr.
    expect(ship.baseWorth(false)).toBe(9000 - 20 - 4);
  });

  it('only takes 1/4 of the price for a ship with tribbles, except for insurance', () => {
    const game = useFakeGame();
    const ship = game.cmdr.ship;
    ship.tribbles = 1;
    expect(ship.baseWorth(false)).toBe(2500 + 1500);
    expect(ship.baseWorth(true)).toBe(9000);
  });

  it('adds what the commander paid for the cargo', () => {
    const game = useFakeGame();
    game.cmdr.priceCargo[TradeItemType.Ore] = 1234;
    expect(game.cmdr.ship.worth(false)).toBe(9000 + 1234);
  });
});

describe('Ship cargo bays', () => {
  it('counts extra and hidden bays from gadgets', () => {
    const game = useFakeGame();
    const ship = boardShip(game, ShipType.Beetle); // 50 bays, 1 gadget slot
    ship.addEquipment(gadget(GadgetType.ExtraCargoBays));
    expect(ship.cargoBays).toBe(55);
    expect(ship.extraCargoBays).toBe(5);

    ship.removeEquipment(EquipmentType.Gadget, 0);
    ship.addEquipment(gadget(GadgetType.HiddenCargoBays));
    expect(ship.cargoBays).toBe(55);
    expect(ship.hiddenCargoBays).toBe(5);
  });

  it('keeps the base-class setter when the getter is overridden', () => {
    const game = useFakeGame();
    const ship = game.cmdr.ship;
    ship.addEquipment(gadget(GadgetType.ExtraCargoBays));
    ship.cargoBays = 20;
    expect(ship.cargoBays).toBe(25);
  });

  it('includes bays used by quest cargo in the filled bays', () => {
    const game = useFakeGame();
    const ship = game.cmdr.ship;
    ship.cargo[TradeItemType.Water] = 5;
    expect(ship.filledNormalCargoBays).toBe(5);
    expect(ship.filledCargoBays).toBe(5);
    expect(ship.freeCargoBays).toBe(10);

    // The Japori antidote takes 10 bays.
    game.questStatusJapori = SpecialEvent.StatusJaporiInTransit;
    expect(ship.filledCargoBays).toBe(15);
    game.questStatusJapori = SpecialEvent.StatusJaporiDone;

    // The reactor takes 5 bays, plus its fuel, 10 bays at first, one fewer every 2 days.
    game.questStatusReactor = SpecialEvent.StatusReactorFuelOk;
    expect(ship.filledCargoBays).toBe(5 + 5 + 10);
    game.questStatusReactor = SpecialEvent.StatusReactorDate;
    expect(ship.filledCargoBays).toBe(5 + 5 + 10 - 9);
  });

  it("doesn't count quest cargo on other ships", () => {
    const game = useFakeGame();
    game.questStatusJapori = SpecialEvent.StatusJaporiInTransit;
    expect(new Ship(ShipType.Gnat).filledCargoBays).toBe(0);
  });
});

describe('Ship fuel tanks', () => {
  it('adds the fuel compactor, and keeps the base-class setter', () => {
    const game = useFakeGame();
    const ship = game.cmdr.ship;
    ship.addEquipment(gadget(GadgetType.FuelCompactor));
    expect(ship.fuelTanks).toBe(14 + 3);
    ship.fuelTanks = 20;
    expect(ship.fuelTanks).toBe(23);
  });
});

describe('Ship skills', () => {
  it("takes the crew's best skills, adjusted for difficulty", () => {
    const game = useFakeGame({ skills: [5, 3, 7, 2] });
    const ship = boardShip(game, ShipType.Beetle);
    ship.hire(new CrewMember(CrewMemberId.Alyssa, 2, 8, 1, 1, -1));
    expect(ship.skills).toEqual([5, 8, 7, 2]);

    game.difficulty = Difficulty.Easy;
    expect(ship.skills).toEqual([6, 9, 8, 3]);
    game.difficulty = Difficulty.Hard;
    expect(ship.skills).toEqual([4, 7, 6, 1]);
  });

  it('never goes below 1', () => {
    const game = useFakeGame({ skills: [1, 1, 1, 1], difficulty: Difficulty.Impossible });
    expect(game.cmdr.ship.skills).toEqual([1, 1, 1, 1]);
  });

  it('adds gadget bonuses and the haggling computer', () => {
    const game = useFakeGame({ skills: [5, 5, 5, 5] });
    const ship = game.cmdr.ship;
    ship.addEquipment(gadget(GadgetType.NavigatingSystem));
    expect(ship.pilot).toBe(5 + Consts.SkillBonus);

    expect(ship.trader).toBe(5);
    game.questStatusJarek = SpecialEvent.StatusJarekDone;
    expect(ship.trader).toBe(6);
    expect(ship.skills[SkillType.Trader]).toBe(5); // the computer only adds to trader
  });
});

describe('Ship crew', () => {
  it('recalculates buy prices when hiring changes the trader skill', () => {
    const game = useFakeGame({ skills: [5, 5, 5, 5] });
    const ship = boardShip(game, ShipType.Beetle);
    const alyssa = game.mercenaries[CrewMemberId.Alyssa]!;

    ship.hire(alyssa); // trader 5, no change
    expect(game.recalculated).toEqual([]);
    expect(ship.crew).toEqual([game.cmdr, alyssa, null]);

    const trader = new CrewMember(CrewMemberId.Bentos, 1, 1, 9, 1, -1);
    ship.hire(trader);
    expect(game.recalculated).toEqual([game.universe[0]]);
    expect(ship.crewCount).toBe(3);
    expect(ship.freeCrewQuarters).toBe(0);
  });

  it('closes the gap when firing, and sends the mercenary to a nearby system', () => {
    const game = useFakeGame();
    const ship = boardShip(game, ShipType.Beetle);
    const alyssa = game.mercenaries[CrewMemberId.Alyssa]!;
    const bentos = game.mercenaries[CrewMemberId.Bentos]!;
    ship.hire(alyssa);
    ship.hire(bentos);

    ship.fire(CrewMemberId.Alyssa);
    expect(ship.crew).toEqual([game.cmdr, bentos, null]);
    // Systems 0 and 1 are within 20 parsecs of the commander; system 2 is 50 away.
    expect([0, 1]).toContain(alyssa.currentSystemId);
  });

  it('keeps special characters where they are when they leave', () => {
    const game = useFakeGame();
    const ship = boardShip(game, ShipType.Beetle);
    const jarek = game.mercenaries[CrewMemberId.Jarek]!;
    ship.hire(jarek);
    ship.fire(CrewMemberId.Jarek);
    expect(jarek.currentSystemId).toBe(-1);
    expect(ship.jarekOnBoard).toBe(false);
  });

  it('lists the special crew', () => {
    const game = useFakeGame();
    const ship = boardShip(game, ShipType.Beetle);
    ship.hire(game.mercenaries[CrewMemberId.Alyssa]!);
    ship.hire(game.mercenaries[CrewMemberId.Princess]!);
    expect(ship.specialCrew.map((c) => c.id)).toEqual([
      CrewMemberId.Commander,
      CrewMemberId.Princess,
    ]);
    expect(ship.princessOnBoard).toBe(true);
  });
});

describe('Ship equipment', () => {
  it('fills the first free slot with a copy', () => {
    const game = useFakeGame();
    const ship = boardShip(game, ShipType.Hornet); // 3 weapons, 2 shields, 1 gadget
    ship.addEquipment(weapon(WeaponType.BeamLaser));
    ship.addEquipment(weapon(WeaponType.PulseLaser));
    expect(ship.weapons.map((w) => w?.type ?? null)).toEqual([
      WeaponType.BeamLaser,
      WeaponType.PulseLaser,
      null,
    ]);
    expect(ship.weapons[0]).not.toBe(weapon(WeaponType.BeamLaser));
    expect(ship.freeSlotsWeapon).toBe(1);
    expect(ship.freeSlots).toBe(1 + 2 + 1);

    // A full slot type ignores further additions.
    ship.addEquipment(gadget(GadgetType.AutoRepairSystem));
    ship.addEquipment(gadget(GadgetType.TargetingSystem));
    expect(ship.gadgets.map((g) => g?.type)).toEqual([GadgetType.AutoRepairSystem]);
  });

  it('removes by slot or by subtype, moving later items up', () => {
    const game = useFakeGame();
    const ship = boardShip(game, ShipType.Hornet);
    ship.addEquipment(weapon(WeaponType.PulseLaser));
    ship.addEquipment(weapon(WeaponType.BeamLaser));
    ship.addEquipment(weapon(WeaponType.MilitaryLaser));

    ship.removeEquipment(EquipmentType.Weapon, 0);
    expect(ship.weapons.map((w) => w?.type ?? null)).toEqual([
      WeaponType.BeamLaser,
      WeaponType.MilitaryLaser,
      null,
    ]);

    ship.removeEquipmentBySubType(EquipmentType.Weapon, WeaponType.MilitaryLaser);
    expect(ship.weapons.map((w) => w?.type ?? null)).toEqual([WeaponType.BeamLaser, null, null]);
  });

  it('finds weapons exactly or at least as good', () => {
    const game = useFakeGame();
    const ship = game.cmdr.ship; // pulse laser
    expect(ship.hasWeapon(WeaponType.PulseLaser, true)).toBe(true);
    expect(ship.hasWeapon(WeaponType.BeamLaser, false)).toBe(false);
    ship.removeEquipment(EquipmentType.Weapon, 0);
    ship.addEquipment(weapon(WeaponType.MilitaryLaser));
    expect(ship.hasWeapon(WeaponType.BeamLaser, true)).toBe(false);
    expect(ship.hasWeapon(WeaponType.BeamLaser, false)).toBe(true);
    expect(ship.hasEquipment(weapon(WeaponType.MilitaryLaser))).toBe(true);
  });

  it('sums weapon power within a range of types', () => {
    const game = useFakeGame();
    const ship = boardShip(game, ShipType.Hornet);
    ship.addEquipment(weapon(WeaponType.PulseLaser)); // 15
    ship.addEquipment(weapon(WeaponType.BeamLaser)); // 25
    ship.addEquipment(weapon(WeaponType.PhotonDisruptor)); // 20
    expect(ship.weaponStrength()).toBe(60);
    expect(ship.weaponStrength(WeaponType.PulseLaser, WeaponType.MorgansLaser)).toBe(40);
    expect(ship.weaponStrength(WeaponType.PhotonDisruptor, WeaponType.QuantumDistruptor)).toBe(20);
  });

  it('reports shield and hull strength as percentages', () => {
    const game = useFakeGame();
    const ship = boardShip(game, ShipType.Hornet); // hull 150
    expect(ship.shieldText).toBe('No Shields');
    ship.addEquipment(shield(ShieldType.Energy)); // 100
    ship.addEquipment(shield(ShieldType.Reflective)); // 200
    ship.shields[1]!.charge = 99;
    expect(ship.shieldStrength).toBe(300);
    expect(ship.shieldCharge).toBe(199);
    expect(ship.shieldText).toBe('Shields at 66%'); // 66.3
    ship.hull = 149;
    expect(ship.hullText).toBe('Hull at 99%'); // 99.3
  });
});

describe('Ship.bounty', () => {
  it('is the ship value adjusted for skill, divided by 200 and rounded down to 25', () => {
    useFakeGame();
    const wasp = new Ship(ShipType.Wasp); // 300,000 cr.
    wasp.crew[0] = new CrewMember(CrewMemberId.Opponent, 10, 10, 10, 10, -1);
    // (2 * 10 + 10 + 3 * 10) / 60 = 1, so 300,000 / 200 = 1,500.
    expect(wasp.bounty()).toBe(1500);
  });

  it('is at least 25', () => {
    useFakeGame();
    expect(new Ship(ShipType.Flea).bounty()).toBe(25);
  });
});

describe('Ship cargo checks', () => {
  it('puts the most valuable cargo first and hides some in hidden bays', () => {
    const game = useFakeGame();
    const ship = game.cmdr.ship;
    ship.cargo[TradeItemType.Water] = 2;
    ship.cargo[TradeItemType.Robots] = 1;
    expect(ship.stealableCargo).toEqual([TradeItemType.Robots, 0, 0]);

    ship.addEquipment(gadget(GadgetType.HiddenCargoBays));
    ship.cargo[TradeItemType.Water] = 6;
    expect(ship.stealableCargo).toEqual([0, 0]);
  });

  it('hides everything when there is less cargo than hidden bays', () => {
    // The original threw here (see the PORT note in Ship.stealableCargo).
    const game = useFakeGame();
    const ship = game.cmdr.ship;
    ship.addEquipment(gadget(GadgetType.HiddenCargoBays));
    ship.cargo[TradeItemType.Water] = 2;
    expect(ship.stealableCargo).toEqual([]);
  });

  it('only lets a criminal trade illegal goods, and others only legal ones', () => {
    const game = useFakeGame();
    const ship = game.cmdr.ship;
    ship.cargo[TradeItemType.Water] = 1;
    ship.cargo[TradeItemType.Narcotics] = 1;
    game.priceCargoSell[TradeItemType.Water] = 30;
    game.priceCargoSell[TradeItemType.Narcotics] = 3000;

    expect(ship.hasTradeableItems()).toBe(true);
    expect(ship.tradeableItems[TradeItemType.Water]).toBe(true);
    expect(ship.tradeableItems[TradeItemType.Narcotics]).toBe(false);
    expect(ship.getRandomTradeableItem()).toBe(TradeItemType.Water);

    game.cmdr.policeRecordScore = Consts.PoliceRecordScoreCriminal;
    expect(ship.hasTradeableItems()).toBe(true);
    expect(ship.getRandomTradeableItem()).toBe(TradeItemType.Narcotics);
  });

  it("uses the system's buy prices for other ships", () => {
    const game = useFakeGame();
    const trader = new Ship(ShipType.Gnat);
    trader.cargo[TradeItemType.Food] = 3;
    game.priceCargoSell[TradeItemType.Food] = 100;
    expect(trader.hasTradeableItems()).toBe(false);
    game.priceCargoBuy[TradeItemType.Food] = 120;
    expect(trader.hasTradeableItems()).toBe(true);
  });

  it('detects illegal cargo beyond the hidden bays', () => {
    const game = useFakeGame();
    const ship = game.cmdr.ship;
    ship.cargo[TradeItemType.Firearms] = 5;
    expect(ship.anyIllegalCargo).toBe(true);
    expect(ship.detectableIllegalCargo).toBe(true);
    ship.addEquipment(gadget(GadgetType.HiddenCargoBays));
    expect(ship.detectableIllegalCargo).toBe(false);
    expect(ship.illegalSpecialCargoDescription('', true, true)).toBe('');

    game.questStatusSculpture = SpecialEvent.StatusSculptureInTransit;
    ship.cargo[TradeItemType.Firearms] = 6;
    expect(ship.illegalSpecialCargoDescription('', true, true)).toBe(
      'a stolen sculpture and illegal goods',
    );
  });

  it('removes illegal goods and what was paid for them', () => {
    const game = useFakeGame();
    const ship = game.cmdr.ship;
    ship.cargo[TradeItemType.Firearms] = 2;
    ship.cargo[TradeItemType.Ore] = 2;
    game.cmdr.priceCargo[TradeItemType.Firearms] = 2000;
    ship.removeIllegalGoods();
    expect(ship.cargo[TradeItemType.Firearms]).toBe(0);
    expect(ship.cargo[TradeItemType.Ore]).toBe(2);
    expect(game.cmdr.priceCargo[TradeItemType.Firearms]).toBe(0);
  });
});

describe('Ship.performRepairs', () => {
  it('repairs the hull first, then shields at double rate', () => {
    const game = useFakeGame({ skills: [5, 5, 5, 9] });
    const ship = boardShip(game, ShipType.Firefly); // hull 100, 1 shield
    ship.addEquipment(shield(ShieldType.Energy));
    ship.hull = 97;
    ship.shields[0]!.charge = 50;

    setRandomSource(() => 0.99); // GetRandom(9) = 8 repair points
    ship.performRepairs();
    expect(ship.hull).toBe(100); // 3 used
    expect(ship.shields[0]!.charge).toBe(50 + 10); // 5 left, doubled
  });

  it("doesn't repair a disabled opponent", () => {
    const game = useFakeGame();
    const opponent = new Ship(ShipType.Gnat);
    opponent.crew[0] = new CrewMember(CrewMemberId.Opponent, 5, 5, 5, 10, -1);
    opponent.hull = 50;
    game.opponentDisabled = true;
    setRandomSource(() => 0.99);
    opponent.performRepairs();
    expect(opponent.hull).toBe(50);
  });
});

describe('Ship.forOpponent', () => {
  const opponentTypes = [
    OpponentType.Pirate,
    OpponentType.Police,
    OpponentType.Trader,
    OpponentType.Mantis,
  ];
  const difficulties = [Difficulty.Beginner, Difficulty.Normal, Difficulty.Impossible];

  it('generates valid ships over many seeds', () => {
    for (const difficulty of difficulties) {
      const game = useFakeGame({ difficulty });
      for (const oppType of opponentTypes) {
        for (let seed = 1; seed <= 50; seed++) {
          setRandomSource(seededRandomSource(seed));
          const ship = Ship.forOpponent(oppType);

          expect(ship.crew[0]).toBe(game.mercenaries[CrewMemberId.Opponent]);
          expect(ship.crewCount).toBeGreaterThanOrEqual(1);
          expect(ship.crewCount).toBeLessThanOrEqual(ship.crewQuarters);
          for (const crew of ship.crew.slice(1))
            if (crew) expect(Consts.SpecialCrewMemberIds).not.toContain(crew.id);

          expect(ship.hull).toBeGreaterThanOrEqual(1);
          expect(ship.hull).toBeLessThanOrEqual(ship.hullStrength);
          expect(ship.filledCargoBays).toBeLessThanOrEqual(ship.cargoBays);
          for (const s of ship.shields)
            if (s)
              (expect(s.charge).toBeGreaterThan(0), expect(s.charge).toBeLessThanOrEqual(s.power));

          if (oppType === OpponentType.Mantis) expect(ship.type).toBe(ShipType.Mantis);
          else expect(ship.type).toBeLessThanOrEqual(Consts.MaxShip);
          if (oppType === OpponentType.Police) expect(ship.filledCargoBays).toBe(0);
          if (difficulty === Difficulty.Impossible) expect(ship.freeSlots).toBe(0);
          else expect(ship.weapons[0]).not.toBeNull();
        }
      }
    }
  });

  it('gives traders at least a Flea and others at least a Gnat', () => {
    useFakeGame();
    for (let seed = 1; seed <= 50; seed++) {
      setRandomSource(seededRandomSource(seed));
      expect(Ship.forOpponent(OpponentType.Trader).type).toBeGreaterThanOrEqual(ShipType.Flea);
      expect(Ship.forOpponent(OpponentType.Pirate).type).toBeGreaterThanOrEqual(ShipType.Gnat);
    }
  });

  it('equips the famous captain with the best gear', () => {
    const game = useFakeGame();
    const ship = Ship.forOpponent(OpponentType.FamousCaptain);
    expect(ship.type).toBe(ShipType.Wasp);
    expect(ship.shields.every((s) => s?.type === ShieldType.Reflective)).toBe(true);
    expect(ship.weapons.every((w) => w?.type === WeaponType.MilitaryLaser)).toBe(true);
    expect(ship.gadgets.map((g) => g?.type)).toEqual([
      GadgetType.NavigatingSystem,
      GadgetType.TargetingSystem,
    ]);
    expect(ship.crew[0]).toBe(game.mercenaries[CrewMemberId.FamousCaptain]);
  });

  it('makes a bottle', () => {
    useFakeGame();
    expect(Ship.forOpponent(OpponentType.Bottle).type).toBe(ShipType.Bottle);
  });
});

describe('Ship save format', () => {
  it('round-trips equipment, cargo and crew', () => {
    const game = useFakeGame();
    const ship = boardShip(game, ShipType.Hornet);
    ship.addEquipment(weapon(WeaponType.BeamLaser));
    ship.addEquipment(shield(ShieldType.Energy));
    ship.shields[0]!.charge = 42;
    ship.addEquipment(gadget(GadgetType.CloakingDevice));
    ship.hire(game.mercenaries[CrewMemberId.Alyssa]!);
    ship.cargo[TradeItemType.Games] = 4;
    ship.fuel = 3;
    ship.hull = 77;
    ship.tribbles = 12;
    ship.escapePod = true;

    const hash = JSON.parse(JSON.stringify(ship.serialize()));
    expect(hash._crewIds).toEqual([CrewMemberId.Commander, CrewMemberId.Alyssa]); // 2 quarters
    expect(hash._weapons).toHaveLength(3);
    expect(hash._weapons[1]).toBeNull();

    const loaded = Ship.fromHash(hash);
    expect(loaded.serialize()).toEqual(hash);
    expect(loaded.crew[0]).toBe(game.cmdr);
    expect(loaded.crew[1]).toBe(game.mercenaries[CrewMemberId.Alyssa]);
    expect(loaded.shields[0]!.charge).toBe(42);
    expect(loaded.cargoBays).toBe(20);
  });
});
