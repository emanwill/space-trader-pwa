// Consts builds model instances and the model classes read Consts, and the
// models import each other (Commander -> Ship -> ShipSpec -> Consts -> ...).
// These are circular imports, which break if any module touches another's
// exports while it is first being evaluated. Each test here loads the engine
// fresh, starting from a different module, and checks everything still works.

import { afterEach, describe, expect, it, vi } from 'vitest';

// Each module that might be imported first, relative to src/engine/ (app/ is src/app/).
// (Vite needs literal import paths here.)
const entryPoints: Record<string, () => Promise<unknown>> = {
  game: () => import('../../../src/engine/game'),
  encounter: () => import('../../../src/engine/encounter'),
  services: () => import('../../../src/engine/services'),
  'high-scores': () => import('../../../src/engine/high-scores'),
  'app/session': () => import('../../../src/app/session'),
  'model/commander': () => import('../../../src/engine/model/commander'),
  'model/crew-member': () => import('../../../src/engine/model/crew-member'),
  'model/equipment': () => import('../../../src/engine/model/equipment'),
  'model/gadget': () => import('../../../src/engine/model/gadget'),
  'model/high-score-record': () => import('../../../src/engine/model/high-score-record'),
  'model/game-options': () => import('../../../src/engine/model/game-options'),
  'model/political-system': () => import('../../../src/engine/model/political-system'),
  'model/shield': () => import('../../../src/engine/model/shield'),
  'model/ship': () => import('../../../src/engine/model/ship'),
  'model/ship-spec': () => import('../../../src/engine/model/ship-spec'),
  'model/shipyard': () => import('../../../src/engine/model/shipyard'),
  'model/special-event': () => import('../../../src/engine/model/special-event'),
  'model/star-system': () => import('../../../src/engine/model/star-system'),
  'model/trade-item': () => import('../../../src/engine/model/trade-item'),
  'model/weapon': () => import('../../../src/engine/model/weapon'),
};

afterEach(() => vi.resetModules());

describe('module import order', () => {
  it.each(Object.keys(entryPoints))('works when %s is imported first', async (entry) => {
    vi.resetModules();
    await entryPoints[entry]!();

    const { Consts } = await import('../../../src/engine/data/consts');
    const { ShipType, WeaponType } = await import('../../../src/engine/data/enums');
    const { ShipSpec } = await import('../../../src/engine/model/ship-spec');
    const { Weapon } = await import('../../../src/engine/model/weapon');
    const { useFakeGame } = await import('../fake-game');

    expect(Consts.ShipSpecs[ShipType.Gnat]).toBeInstanceOf(ShipSpec);
    expect(Consts.Weapons[WeaponType.PulseLaser]).toBeInstanceOf(Weapon);
    expect(useFakeGame().cmdr.ship.weapons[0]).toBeInstanceOf(Weapon);

    const { Game } = await import('../../../src/engine/game');
    const { ScriptedUI } = await import('../scripted-ui');
    expect(Game.newGame('Test', 2, 5, 5, 5, 5, new ScriptedUI()).universe.length).toBeGreaterThan(
      0,
    );
  });
});
