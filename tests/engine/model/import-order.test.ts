// Consts builds model instances and the model classes read Consts, and the
// models import each other (Commander -> Ship -> ShipSpec -> Consts -> ...).
// These are circular imports, which break if any module touches another's
// exports while it is first being evaluated. Each test here loads the engine
// fresh, starting from a different module, and checks everything still works.

import { afterEach, describe, expect, it, vi } from 'vitest';

const entryPoints = [
  'commander',
  'crew-member',
  'equipment',
  'gadget',
  'political-system',
  'shield',
  'ship',
  'ship-spec',
  'shipyard',
  'special-event',
  'star-system',
  'trade-item',
  'weapon',
];

afterEach(() => vi.resetModules());

describe('module import order', () => {
  it.each(entryPoints)('works when model/%s is imported first', async (entry) => {
    vi.resetModules();
    await import(`../../../src/engine/model/${entry}.ts`);

    const { Consts } = await import('../../../src/engine/data/consts');
    const { ShipType, WeaponType } = await import('../../../src/engine/data/enums');
    const { ShipSpec } = await import('../../../src/engine/model/ship-spec');
    const { Weapon } = await import('../../../src/engine/model/weapon');
    const { useFakeGame } = await import('../fake-game');

    expect(Consts.ShipSpecs[ShipType.Gnat]).toBeInstanceOf(ShipSpec);
    expect(Consts.Weapons[WeaponType.PulseLaser]).toBeInstanceOf(Weapon);
    expect(useFakeGame().cmdr.ship.weapons[0]).toBeInstanceOf(Weapon);
  });
});
