/// <reference types="node" />
// Cross-checks the ported Consts tables against reference/Consts.cs, value by
// value, so transcription mistakes in the hand-ported tables fail loudly.

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { Consts } from '../../../src/engine/data/consts';
import * as Enums from '../../../src/engine/data/enums';
import { idiv } from '../../../src/engine/math';

const source = readFileSync(new URL('../../../reference/Consts.cs', import.meta.url), 'utf8');

/** Resolves a C# argument (enum member, number, bool, or Consts name) to a value. */
function resolve(arg: string): unknown {
  if (arg === 'true') return true;
  if (arg === 'false') return false;
  if (/^-?\d+$/.test(arg)) return Number(arg);
  const enumRef = /^(\w+)\.(\w+)$/.exec(arg);
  if (enumRef) {
    const enumObj = (Enums as Record<string, Record<string, unknown>>)[enumRef[1]!];
    if (!enumObj || !(enumRef[2]! in enumObj)) throw new Error(`Unknown enum value ${arg}`);
    return enumObj[enumRef[2]!];
  }
  if (arg in Consts) return (Consts as unknown as Record<string, unknown>)[arg];
  throw new Error(`Cannot resolve ${arg}`);
}

/** All `new <className>(...)` argument lists in Consts.cs, in order. */
function rows(className: string): unknown[][] {
  const re = new RegExp(`new\\s+${className}\\(([^)]*)\\)`, 'g');
  return [...source.matchAll(re)].map((m) => m[1]!.split(',').map((a) => resolve(a.trim())));
}

/** Pairs each C# row with the ported entry's values for the same constructor arguments. */
function expectTableMatches(
  className: string,
  table: unknown[],
  fields: (entry: never) => unknown[],
) {
  const expected = rows(className);
  expect(expected.length).toBeGreaterThan(0);
  expect(table.map((entry) => fields(entry as never))).toEqual(expected);
}

describe('Consts scalar constants', () => {
  it('match Consts.cs', () => {
    const re = /public const\s+(?:int|double|string)\s+(\w+)\s*=\s*([^;]+);/g;
    const matches = [...source.matchAll(re)];
    expect(matches.length).toBe(75);

    for (const [, name, rawValue] of matches) {
      const value = rawValue!.trim();
      let expected: unknown;
      if (value.startsWith('"')) expected = JSON.parse(value);
      else if (value === '50/8') expected = idiv(50, 8);
      else expected = Number(value);
      expect([name, (Consts as unknown as Record<string, unknown>)[name!]]).toEqual([
        name,
        expected,
      ]);
    }
  });

  it('computes StoryProbability with integer division', () => {
    expect(Consts.StoryProbability).toBe(6);
  });
});

describe('Consts tables match Consts.cs', () => {
  it('ShipSpecs', () => {
    expectTableMatches('ShipSpec', Consts.ShipSpecs, (s: (typeof Consts.ShipSpecs)[number]) => [
      s.type,
      s.size,
      s.cargoBays,
      s.weaponSlots,
      s.shieldSlots,
      s.gadgetSlots,
      s.crewQuarters,
      s.fuelTanks,
      s.fuelCost,
      s.hullStrength,
      s.repairCost,
      s.price,
      s.occurrence,
      s.police,
      s.pirates,
      s.traders,
      s.minimumTechLevel,
    ]);
  });

  it('TradeItems', () => {
    expectTableMatches('TradeItem', Consts.TradeItems, (t: (typeof Consts.TradeItems)[number]) => [
      t.type,
      t.techProduction,
      t.techUsage,
      t.techTopProduction,
      t.priceLowTech,
      t.priceInc,
      t.priceVariance,
      t.pressurePriceHike,
      t.resourceLowPrice,
      t.resourceHighPrice,
      t.minTradePrice,
      t.maxTradePrice,
      t.roundOff,
    ]);
  });

  it('PoliticalSystems', () => {
    expectTableMatches(
      'PoliticalSystem',
      Consts.PoliticalSystems,
      (p: (typeof Consts.PoliticalSystems)[number]) => [
        p.type,
        p.reactionIllegal,
        p.activityPolice,
        p.activityPirates,
        p.activityTraders,
        p.minimumTechLevel,
        p.maximumTechLevel,
        p.bribeLevel,
        p.drugsOk,
        p.firearmsOk,
        p.wanted,
      ],
    );
  });

  it('SpecialEvents', () => {
    expectTableMatches(
      'SpecialEvent',
      Consts.SpecialEvents,
      (e: (typeof Consts.SpecialEvents)[number]) => [e.type, e.price, e.occurrence, e.messageOnly],
    );
  });

  it('Weapons', () => {
    expectTableMatches('Weapon', Consts.Weapons, (w: (typeof Consts.Weapons)[number]) => {
      const h = w.serialize();
      return [h['_type'], h['_power'], h['_disabling'], h['_price'], h['_minTech'], h['_chance']];
    });
  });

  it('Shields', () => {
    expectTableMatches('Shield', Consts.Shields, (s: (typeof Consts.Shields)[number]) => {
      const h = s.serialize();
      return [h['_type'], h['_power'], h['_price'], h['_minTech'], h['_chance']];
    });
  });

  it('Gadgets', () => {
    expectTableMatches('Gadget', Consts.Gadgets, (g: (typeof Consts.Gadgets)[number]) => {
      const h = g.serialize();
      return [h['_type'], h['_skillBonus'], h['_price'], h['_minTech'], h['_chance']];
    });
  });

  it('Shipyards', () => {
    expectTableMatches('Shipyard', Consts.Shipyards, (y: (typeof Consts.Shipyards)[number]) => [
      y.id,
      y.specialtySize,
      y.skill,
    ]);
  });

  it('PoliceRecords and Reputations', () => {
    expectTableMatches(
      'PoliceRecord',
      Consts.PoliceRecords,
      (r: (typeof Consts.PoliceRecords)[number]) => [r.type, r.minScore],
    );
    expectTableMatches(
      'Reputation',
      Consts.Reputations,
      (r: (typeof Consts.Reputations)[number]) => [r.type, r.minScore],
    );
  });

  it('ShipImageOffsets', () => {
    const expected = [...source.matchAll(/new\s+Rectangle\(\s*(\d+), 0, (\d+), 0\)/g)].map((m) => ({
      x: Number(m[1]),
      width: Number(m[2]),
    }));
    expect(Consts.ShipImageOffsets).toEqual(expected);
  });
});

describe('Consts table structure', () => {
  it('indexes every table by its type enum', () => {
    Consts.ShipSpecs.forEach((s, i) => expect(s.type).toBe(i));
    Consts.TradeItems.forEach((t, i) => expect(t.type).toBe(i));
    Consts.PoliticalSystems.forEach((p, i) => expect(p.type).toBe(i));
    Consts.SpecialEvents.forEach((e, i) => expect(e.type).toBe(i));
    Consts.Weapons.forEach((w, i) => expect(w.type).toBe(i));
    Consts.Shields.forEach((s, i) => expect(s.type).toBe(i));
    Consts.Gadgets.forEach((g, i) => expect(g.type).toBe(i));
    Consts.Shipyards.forEach((y, i) => expect(y.id).toBe(i));
  });

  it('returns the same table instance on every access', () => {
    expect(Consts.ShipSpecs).toBe(Consts.ShipSpecs);
    expect(Consts.EquipmentForSale[0]).toBe(Consts.Weapons[Enums.WeaponType.PulseLaser]);
  });

  it('lists equipment for sale in the original order', () => {
    expect(Consts.EquipmentForSale.map((e) => e.name)).toEqual([
      'Pulse Laser',
      'Beam Laser',
      'Military Laser',
      'Photon Disruptor',
      'Energy Shield',
      'Reflective Shield',
      '5 Extra Cargo Bays',
      'Auto-Repair System',
      'Navigating System',
      'Targeting System',
      'Cloaking Device',
    ]);
  });
});
