// Consts builds model instances and the model classes read Consts, which is a
// circular import. This file imports a model module first, the order most
// likely to break, and checks the tables still build. Vitest gives each test
// file a fresh module graph, so the import order here is what actually runs.

import { ShipSpec } from '../../../src/engine/model/ship-spec';
import { Weapon } from '../../../src/engine/model/weapon';
import { Consts } from '../../../src/engine/data/consts';
import { ShipType } from '../../../src/engine/data/enums';
import { describe, expect, it } from 'vitest';

describe('module import order', () => {
  it('builds the tables when a model module is imported before Consts', () => {
    expect(Consts.ShipSpecs[ShipType.Gnat]).toBeInstanceOf(ShipSpec);
    expect(Consts.Weapons[0]).toBeInstanceOf(Weapon);
  });
});
