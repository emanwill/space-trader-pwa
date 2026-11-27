import { describe, expect, it } from 'vitest';
import { find, isInt } from '../../src/engine/cheats';
import { Consts } from '../../src/engine/data/consts';
import { AlertType, CrewMemberId, ShipType } from '../../src/engine/data/enums';
import { Ship } from '../../src/engine/model/ship';
import { monsterMercenaries, monsterQuests, monsterShipyards } from '../../src/engine/views';
import { newGame, useGameCleanup } from './game-helpers';

useGameCleanup();

function cheater() {
  const result = newGame();
  result.game.cheatEnabled = true;
  return result;
}

describe('isInt', () => {
  it('accepts what int.Parse accepts', () => {
    expect(isInt('42')).toBe(true);
    expect(isInt(' -7 ')).toBe(true);
    expect(isInt('+3')).toBe(true);
    expect(isInt('3.5')).toBe(false);
    expect(isInt('')).toBe(false);
    expect(isInt('99999999999')).toBe(false);
  });
});

describe('Find', () => {
  it('finds and tracks a system', async () => {
    const { game } = newGame();
    const target = game.universe[10]!;
    expect(await find(game, target.name, true)).toBe('find');
    expect(game.selectedSystemId).toBe(10);
    expect(game.trackedSystemId).toBe(10);

    // A partial name selects without tracking.
    game.trackedSystemId = -1;
    expect(await find(game, target.name.slice(0, -1), true)).toBe('find');
    expect(game.trackedSystemId).toBe(-1);
  });

  it('ignores cheat words until Cheetah', async () => {
    const { game, ui } = newGame();
    const cash = game.commander.cash;
    expect(await find(game, 'Scratch 99999', false)).toBe('find');
    expect(game.commander.cash).toBe(cash);

    expect(await find(game, 'Cheetah', false)).toBe('cheat');
    expect(game.cheatEnabled).toBe(true);
    expect(ui.alerts.at(-1)!.type).toBe(AlertType.Cheater);

    expect(await find(game, 'Scratch 99999', false)).toBe('cheat');
    expect(game.commander.cash).toBe(99999);
  });
});

describe('cheats', () => {
  it('sets the commander and ship', async () => {
    const { game } = cheater();
    const cmdr = game.commander;
    await find(game, 'IOU 5000', false);
    await find(game, 'DeLorean 77', false);
    await find(game, 'RapSheet -30', false);
    await find(game, 'Fame 12', false);
    await find(game, 'Ice Pirate 4', false);
    await find(game, 'Juice 999', false);
    await find(game, 'Skin 3', false);
    await find(game, 'Varmints 500', false);
    expect([cmdr.debt, cmdr.days, cmdr.policeRecordScore, cmdr.reputationScore]).toEqual([
      5000, 77, -30, 12,
    ]);
    expect(cmdr.killsPirate).toBe(4);
    expect(cmdr.ship.fuel).toBe(cmdr.ship.fuelTanks);
    expect(cmdr.ship.hull).toBe(3);
    expect(cmdr.ship.tribbles).toBe(500);
  });

  it('toggles flags', async () => {
    const { game } = cheater();
    const pod = game.commander.ship.escapePod;
    await find(game, 'LifeBoat', false);
    await find(game, 'Energize', false);
    await find(game, 'Yellow', false);
    await find(game, 'PlanB', false);
    expect(game.commander.ship.escapePod).toBe(!pod);
    expect(game.canSuperWarp).toBe(true);
    expect(game.easyEncounters).toBe(true);
    expect(game.autoSave).toBe(true);
  });

  it('fits equipment and cargo within the ship', async () => {
    const { game } = cheater();
    const ship = game.commander.ship;
    await find(game, 'Iron 0 1', false);
    expect(ship.weapons[0]!.type).toBe(Consts.Weapons[1]!.type);
    expect(ship.weapons[0]).not.toBe(Consts.Weapons[1]);
    await find(game, 'Iron 5 1', false); // No such slot: ignored.
    await find(game, 'Swag 2 1000', false);
    expect(ship.cargo[2]).toBe(ship.cargoBays);
  });

  it('sets and lists quest statuses', async () => {
    const { game, ui } = cheater();
    await find(game, 'Status Jarek 5', false);
    expect(game.questStatusJarek).toBe(5);
    await find(game, 'Status', false);
    const alert = ui.alerts.at(-1)!;
    expect(alert.args[0]).toBe('Status of Quests');
    expect(alert.args[1]).toContain('Jarek: 5');
    expect(alert.args[1]!.split('\n')).toHaveLength(13);
  });

  it('lists and resets the very rare encounters', async () => {
    const { game, ui } = cheater();
    game.veryRareEncounters.length = 0;
    await find(game, 'Events Reset', false);
    expect(game.veryRareEncounters.length).toBeGreaterThan(0);
    await find(game, 'Events', false);
    expect(ui.alerts.at(-1)!.args[0]).toBe('Remaining Very Rare Encounters');
  });

  it('teaches a mercenary and seats one in the crew', async () => {
    const { game } = cheater();
    const id = CrewMemberId.Alyssa;
    await find(game, `Knack ${id} 10,1,x,99`, false);
    expect(game.mercenaries[id]!.skills.slice(0, 2)).toEqual([10, 1]);
    expect(game.mercenaries[id]!.skills[3]).toBe(Consts.MaxSkill);

    const crew = game.commander.ship.crew[0]!;
    game.commander.ship = new Ship(ShipType.Wasp);
    game.commander.ship.crew[0] = crew;
    await find(game, `Posse 1 ${id}`, false);
    expect(game.commander.ship.crew[1]).toBe(game.mercenaries[id]);
    await find(game, `Posse 2 ${CrewMemberId.Jarek}`, false); // Special crew: ignored.
    expect(game.commander.ship.crew[2]).toBeNull();
  });

  it('reports Go, Monster.com and Test to the caller', async () => {
    const { game } = cheater();
    const target = game.universe[20]!;
    expect(await find(game, `Go ${target.name}`, false)).toBe('go');
    expect(game.selectedSystemId).toBe(20);
    expect(await find(game, 'Go Nowhere', false)).toBe('cheat');
    expect(await find(game, 'Monster.com', false)).toBe('monster');
    expect(await find(game, 'Test', false)).toBe('test');
  });
});

describe('Monster.com', () => {
  it('lists mercenaries without the special crew, sorted', () => {
    const { game } = newGame();
    const byName = monsterMercenaries(game);
    expect(byName.some((m) => Consts.SpecialCrewMemberIds.includes(m.id))).toBe(false);
    expect(byName.map((m) => m.name)).toEqual(
      [...byName.map((m) => m.name)].sort((a, b) => a.localeCompare(b)),
    );
    const byPilot = monsterMercenaries(game, 'P');
    for (let i = 1; i < byPilot.length; i++)
      expect(byPilot[i]!.pilot).toBeGreaterThanOrEqual(byPilot[i - 1]!.pilot);
  });

  it('lists available quests and shipyards', () => {
    const { game } = newGame();
    const quests = monsterQuests(game);
    expect(quests.length).toBeGreaterThan(0);
    for (const q of quests) expect(game.universe[q.systemId]!.showSpecialButton()).toBe(true);
    // Placement can put two shipyards on one system (the later wins), as in the original.
    const yards = monsterShipyards(game);
    expect(yards.length).toBeGreaterThan(0);
    expect(yards.length).toBeLessThanOrEqual(Consts.Shipyards.length);
    for (const y of yards) expect(game.universe[y.systemId]!.shipyard!.name).toBe(y.description);
  });
});
