import { afterEach, describe, expect, it } from 'vitest';
import { Consts } from '../../../src/engine/data/consts';
import {
  Activity,
  Difficulty,
  EquipmentType,
  GadgetType,
  OpponentType,
  PoliceRecordType,
  PoliticalSystemType,
  ReputationType,
  ShieldType,
  ShipType,
  ShipyardId,
  Size,
  SpecialEventType,
  SpecialResource,
  TechLevel,
  TradeItemType,
  WeaponType,
} from '../../../src/engine/data/enums';
import { Strings } from '../../../src/engine/data/strings';
import { setCurrentGame } from '../../../src/engine/game-context';
import { Gadget } from '../../../src/engine/model/gadget';
import { PoliceRecord } from '../../../src/engine/model/police-record';
import { Reputation } from '../../../src/engine/model/reputation';
import { Shield } from '../../../src/engine/model/shield';
import { ShipSpec } from '../../../src/engine/model/ship-spec';
import type { PricedSystem } from '../../../src/engine/model/trade-item';
import { Weapon } from '../../../src/engine/model/weapon';
import { useFakeGame } from '../fake-game';

afterEach(() => setCurrentGame(null));

describe('TradeItem.standardPrice', () => {
  const narcotics = Consts.TradeItems[TradeItemType.Narcotics]!;
  const system = (overrides: Partial<PricedSystem> = {}): PricedSystem => ({
    itemUsed: () => true,
    techLevel: TechLevel.Industrial,
    politicalSystem: Consts.PoliticalSystems[PoliticalSystemType.Theocracy]!,
    size: Size.Medium,
    specialResource: SpecialResource.WeirdMushrooms,
    ...overrides,
  });

  it('applies each adjustment with C# integer arithmetic', () => {
    // 3500 + 5 * -125 = 2875
    // wanted by Theocracy:       2875 * 4 / 3   = 3833
    // traders Moderate (4):      3833 * 92 / 100 = 3526
    // size Medium (2):           3526 * 98 / 100 = 3455
    // WeirdMushrooms (low price): 3455 * 3 / 4   = 2591
    expect(narcotics.standardPrice(system())).toBe(2591);
  });

  it('is 0 where the item is not used', () => {
    expect(narcotics.standardPrice(system({ itemUsed: () => false }))).toBe(0);
  });

  it('knows which items are illegal', () => {
    expect(Consts.TradeItems.filter((t) => t.illegal).map((t) => t.type)).toEqual([
      TradeItemType.Firearms,
      TradeItemType.Narcotics,
    ]);
  });
});

describe('PoliticalSystem.shipTypeLikely', () => {
  const anarchy = Consts.PoliticalSystems[PoliticalSystemType.Anarchy]!; // pirates Swarms, police Absent

  it('compares activity with the ship type requirements', () => {
    useFakeGame({ difficulty: Difficulty.Normal });
    // Wasp needs Many police (5); Anarchy police are Absent (0).
    expect(anarchy.shipTypeLikely(ShipType.Wasp, OpponentType.Police)).toBe(false);
    expect(anarchy.shipTypeLikely(ShipType.Wasp, OpponentType.Pirate)).toBe(true);
  });

  it('raises activity on hard difficulties', () => {
    const satori = Consts.PoliticalSystems[PoliticalSystemType.Satori]!; // police Minimal (1)
    // Bumblebee needs Minimal police (1); Hornet needs Few (2).
    useFakeGame({ difficulty: Difficulty.Normal });
    expect(satori.shipTypeLikely(ShipType.Hornet, OpponentType.Police)).toBe(false);
    useFakeGame({ difficulty: Difficulty.Hard });
    expect(satori.shipTypeLikely(ShipType.Hornet, OpponentType.Police)).toBe(true);
  });
});

describe('PoliceRecord and Reputation lookups', () => {
  it('finds the highest band the score reaches', () => {
    const record = (score: number) => PoliceRecord.getPoliceRecordFromScore(score).type;
    expect(record(-1000)).toBe(PoliceRecordType.Psychopath);
    expect(record(-100)).toBe(PoliceRecordType.Psychopath);
    expect(record(-71)).toBe(PoliceRecordType.Psychopath);
    expect(record(-70)).toBe(PoliceRecordType.Villain);
    expect(record(-5)).toBe(PoliceRecordType.Dubious);
    expect(record(0)).toBe(PoliceRecordType.Clean);
    expect(record(74)).toBe(PoliceRecordType.Liked);
    expect(record(75)).toBe(PoliceRecordType.Hero);

    const reputation = (score: number) => Reputation.getReputationFromScore(score).type;
    expect(reputation(0)).toBe(ReputationType.Harmless);
    expect(reputation(149)).toBe(ReputationType.AboveAverage);
    expect(reputation(1500)).toBe(ReputationType.Elite);
  });

  it('names the bands', () => {
    expect(PoliceRecord.getPoliceRecordFromScore(0).name).toBe('Clean');
    expect(Reputation.getReputationFromScore(0).name).toBe('Harmless');
  });
});

describe('Equipment', () => {
  const pulse = Consts.Weapons[WeaponType.PulseLaser]!; // 2000 cr., Industrial

  it('discounts the price by the trader skill', () => {
    useFakeGame({ techLevel: TechLevel.HiTech, trader: 7 });
    expect(pulse.price).toBe(1860); // 2000 * 93 / 100
  });

  it('is not for sale below its minimum tech level', () => {
    useFakeGame({ techLevel: TechLevel.EarlyIndustrial });
    expect(pulse.price).toBe(0);
  });

  it('sells and transfers with integer arithmetic', () => {
    expect(pulse.sellPrice).toBe(1500); // 2000 * 3 / 4
    expect(pulse.transferPrice).toBe(1833); // 1500 * 110 / 90
  });

  it('indexes images by category then subtype', () => {
    expect(pulse.imageIndex).toBe(0);
    expect(Consts.Shields[ShieldType.Reflective]!.imageIndex).toBe(6 + 1);
    expect(Consts.Gadgets[GadgetType.HiddenCargoBays]!.imageIndex).toBe(6 + 3 + 6);
  });

  it('round-trips weapons, shields and gadgets through save data', () => {
    const shield = Consts.Shields[ShieldType.Energy]!.clone();
    shield.charge = 42;
    for (const [item, fromHash] of [
      [pulse, Weapon.fromHash],
      [shield, Shield.fromHash],
      [Consts.Gadgets[GadgetType.CloakingDevice]!, Gadget.fromHash],
    ] as const) {
      const json = JSON.parse(JSON.stringify(item.serialize()));
      expect(fromHash(json)).toEqual(item);
    }
  });

  it('clones independently', () => {
    const original = Consts.Shields[ShieldType.Energy]!;
    const copy = original.clone();
    copy.charge = 0;
    expect(original.charge).toBe(100);
    expect(copy.equipmentType).toBe(EquipmentType.Shield);
  });
});

describe('ShipSpec', () => {
  it('adds the hull upgrade to hull strength', () => {
    const spec = new ShipSpec(ShipType.Gnat, Size.Small, 15, 1, 0, 1, 1, 14, 1, 100);
    expect(spec.hullStrength).toBe(100);
    spec.hullUpgraded = true;
    expect(spec.hullStrength).toBe(100 + Consts.HullUpgrade);
  });

  it('uses its own type for images unless told otherwise', () => {
    const spec = new ShipSpec(ShipType.Gnat);
    expect(spec.imageIndex).toBe(ShipType.Gnat);
    spec.imageIndex = ShipType.Wasp;
    expect(spec.imageIndex).toBe(ShipType.Wasp);
    expect(spec.serialize()['_imageIndex']).toBe(ShipType.Wasp);
    spec.imageIndex = ShipType.Gnat;
    expect(spec.serialize()).not.toHaveProperty('_imageIndex');
  });

  it('counts slots per equipment type', () => {
    const wasp = Consts.ShipSpecs[ShipType.Wasp]!;
    expect(
      [EquipmentType.Weapon, EquipmentType.Shield, EquipmentType.Gadget].map((t) => wasp.slots(t)),
    ).toEqual([3, 2, 2]);
  });

  it('round-trips through save data', () => {
    const wasp = Consts.ShipSpecs[ShipType.Wasp]!;
    const json = JSON.parse(JSON.stringify(wasp.serialize()));
    expect(ShipSpec.fromHash(json)).toEqual(wasp);
  });

  it('restores a custom design into the global tables when loaded', () => {
    const savedSpec = Consts.ShipSpecs[ShipType.Custom]!;
    const savedName = Strings.ShipNames[ShipType.Custom]!;
    try {
      const design = new ShipSpec(
        ShipType.Custom,
        Size.Large,
        30,
        2,
        2,
        2,
        2,
        15,
        3,
        150,
        15,
        99999,
      );
      const hash = { ...design.serialize(), _name: 'Ark' };
      ShipSpec.fromHash(hash);
      expect(Strings.ShipNames[ShipType.Custom]).toBe('Ark');
      expect(Consts.ShipSpecs[ShipType.Custom]!.price).toBe(99999);
      expect(Consts.ShipSpecs[ShipType.Custom]).not.toBe(savedSpec);
    } finally {
      Consts.ShipSpecs[ShipType.Custom] = savedSpec;
      Strings.ShipNames[ShipType.Custom] = savedName;
    }
  });
});

describe('Shipyard', () => {
  const corellian = Consts.Shipyards[ShipyardId.Corellian]!; // Large specialty, crew quarters skill
  const savedSpec = Consts.ShipSpecs[ShipType.Custom]!;
  afterEach(() => {
    Consts.ShipSpecs[ShipType.Custom] = savedSpec;
  });

  function design(fuelTanks: number, hull: number): void {
    Consts.ShipSpecs[ShipType.Custom] = new ShipSpec(
      ShipType.Custom,
      Size.Large,
      30, // cargo bays
      2, // weapon slots
      2, // shield slots
      2, // gadget slots
      2, // crew quarters
      fuelTanks,
      0,
      hull,
    );
  }

  it('counts design units with the original mix of rounding', () => {
    // Large: crew 20-2 (skill), fuel base 12 at 1 per 5 units, hull base 100 at 20 per 4 units,
    // gadgets 5, shields 8, weapons 10.
    design(15, 150);
    // 30 + 2*18 + ceil(3/1*5)=15 + 2*5 + (50/20=2)*4 + 2*8 + 2*10
    expect(corellian.unitsUsed).toBe(135);
    design(15, 159); // hull uses integer division: 59/20 is still 2
    expect(corellian.unitsUsed).toBe(135);
    design(10, 150); // fuel below base: ceil(-2*5) = -10
    expect(corellian.unitsUsed).toBe(110);
  });

  it('prices a design with the specialty discount', () => {
    design(15, 150);
    expect(corellian.percentOfMaxUnits).toBe(67); // 135 * 100 / 200
    expect(corellian.penaltyCost).toBe(0);
    expect(corellian.basePrice).toBe(101250); // 135 * 750
    expect(corellian.costAdjustment).toBe(Consts.Shipyards[0]!.costAdjustment);
    expect(corellian.adjustedPrice).toBe(91125); // * 90 / 100
    expect(corellian.adjustedDesignFee).toBe(18000); // 20000 * 90 / 100

    useFakeGame({ shipWorth: 10000 });
    expect(corellian.totalCost).toBe(91125 + 0 + 18000 - 10000);
  });

  it('offers sizes within two of its specialty', () => {
    expect(Consts.Shipyards[ShipyardId.Kuat]!.availableSizes).toEqual([
      Size.Medium,
      Size.Large,
      Size.Huge,
      Size.Gargantuan,
    ]);
    expect(Consts.Shipyards[ShipyardId.Sienar]!.availableSizes).toEqual([
      Size.Tiny,
      Size.Small,
      Size.Medium,
    ]);
  });
});

describe('SpecialEvent', () => {
  it('finds its location in the universe', () => {
    const lottery = Consts.SpecialEvents[SpecialEventType.Lottery]!;
    const universe = [
      { specialEventType: SpecialEventType.NA },
      { specialEventType: SpecialEventType.Lottery },
    ];
    useFakeGame({ universe });
    expect(lottery.location).toBe(universe[1]);
    useFakeGame({ universe: [] });
    expect(lottery.location).toBeNull();
  });

  it('has a title and text', () => {
    const moon = Consts.SpecialEvents[SpecialEventType.Moon]!;
    expect(moon.title).toBe(Strings.SpecialEventTitles[SpecialEventType.Moon]);
    expect(moon.text).toBe(Strings.SpecialEventStrings[SpecialEventType.Moon]);
  });
});

describe('Activity', () => {
  it('keeps NA outside the normal range', () => {
    expect(Activity.NA).toBe(100);
  });
});
