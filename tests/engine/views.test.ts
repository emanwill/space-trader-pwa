import { describe, expect, it } from 'vitest';
import { Consts } from '../../src/engine/data/consts';
import { CrewMemberId, ShipType, SpecialEventType } from '../../src/engine/data/enums';
import type { Game } from '../../src/engine/game';
import { Ship } from '../../src/engine/model/ship';
import { Strings } from '../../src/engine/data/strings';
import { SpecialEvent } from '../../src/engine/model/special-event';
import {
  commanderBounty,
  linkSystemNames,
  questStrings,
  shipEquipment,
  shipPictureStrips,
  specialCargo,
  tribblePictures,
} from '../../src/engine/views';
import { newGame, useGameCleanup } from './game-helpers';

useGameCleanup();

/** The Gnat has no spare quarters; passengers need a Wasp. */
function roomyShip(game: Game): void {
  const commander = game.commander.ship.crew[0]!;
  game.commander.ship = new Ship(ShipType.Wasp);
  game.commander.ship.crew[0] = commander;
}

describe('questStrings', () => {
  it('is empty at the start', () => {
    const { game } = newGame();
    expect(questStrings(game)).toEqual([]);
  });

  it('counts down the Gemulon and experiment deadlines', () => {
    const { game } = newGame();
    game.questStatusGemulon = 2;
    game.questStatusExperiment = SpecialEvent.StatusExperimentDate - 1;
    expect(questStrings(game)).toEqual([
      Strings.QuestGemulonInformDays.replace('^1', '5 days'),
      Strings.QuestExperimentInformTomorrow,
    ]);
  });

  it('follows the Princess while she is aboard', () => {
    const { game } = newGame();
    roomyShip(game);
    const name = game.mercenaries[CrewMemberId.Princess]!.name;
    game.questStatusPrincess = SpecialEvent.StatusPrincessRescued;
    expect(questStrings(game)).toEqual([Strings.QuestPrincessReturn.replace('^1', name)]);

    game.commander.ship.hire(game.mercenaries[CrewMemberId.Princess]!);
    game.questStatusPrincess = SpecialEvent.StatusPrincessRescued + 3;
    expect(questStrings(game)).toEqual([Strings.QuestPrincessReturning.replace('^1', name)]);
    game.questStatusPrincess = SpecialEvent.StatusPrincessImpatient;
    expect(questStrings(game)).toEqual([
      Strings.QuestPrincessReturningImpatient.replace('^1', name),
    ]);
    game.questStatusPrincess = SpecialEvent.StatusPrincessReturned;
    expect(questStrings(game)).toEqual([Strings.QuestPrincessQuantum]);
  });

  it('names where to collect the Scarab upgrade', () => {
    const { game } = newGame();
    game.questStatusScarab = SpecialEvent.StatusScarabDestroyed;
    const [line] = questStrings(game);
    const at = Consts.SpecialEvents[SpecialEventType.ScarabDestroyed]!.location!.name;
    expect(line).toBe(Strings.QuestScarabNotify.replace('^1', at));
    expect(line).not.toContain('^1');
  });

  it('lists passengers and the tribbles', () => {
    const { game } = newGame();
    roomyShip(game);
    game.commander.ship.hire(game.mercenaries[CrewMemberId.Jarek]!);
    game.questStatusJarek = SpecialEvent.StatusJarekImpatient;
    game.commander.ship.tribbles = 5;
    game.questStatusMoon = SpecialEvent.StatusMoonBought;
    expect(questStrings(game)).toEqual([
      Strings.QuestJarekImpatient,
      Strings.QuestTribbles,
      Strings.QuestMoon,
    ]);
  });
});

describe('linkSystemNames', () => {
  it('marks every system name', () => {
    const acamar = Strings.SystemNames.indexOf('Acamar');
    expect(linkSystemNames('Kill the monster at Acamar, then rest.')).toEqual([
      { text: 'Kill the monster at ' },
      { text: 'Acamar', system: acamar },
      { text: ', then rest.' },
    ]);
    expect(linkSystemNames('Nothing here.')).toEqual([{ text: 'Nothing here.' }]);
  });
});

describe('ship info', () => {
  it('lists the starting equipment and free slots', () => {
    const { game } = newGame();
    const sections = shipEquipment(game);
    expect(sections.map((s) => s.label)).toEqual(['Equipment', 'Unfilled']);
    expect(sections[0]!.lines).toEqual(['1 Pulse Laser']);
    expect(sections[1]!.lines.join(', ')).toMatch(/slot/);
  });

  it('counts cargo bay gadgets in bays', () => {
    const { game } = newGame();
    game.commander.ship.addEquipment(Consts.Gadgets[0]!);
    expect(shipEquipment(game)[0]!.lines).toContain('5 Extra Cargo Bays');
  });

  it('describes special cargo', () => {
    const { game } = newGame();
    expect(specialCargo(game)).toEqual([]);
    game.commander.ship.tribbles = 3;
    game.canSuperWarp = true;
    expect(specialCargo(game)).toEqual(['3 cute, furry tribbles.', Strings.SpecialCargoExperiment]);
  });

  it('shows a bounty for crooks and kingpins for heroes', () => {
    const { game } = newGame();
    expect(commanderBounty(game)).toBeNull();
    game.commander.policeRecordScore = -20;
    expect(commanderBounty(game)).toEqual({ label: 'Bounty offered', value: '20,000 cr.' });
    game.commander.policeRecordScore = 25;
    expect(commanderBounty(game)).toEqual({ label: 'Angry kingpins', value: '5' });
  });
});

describe('encounter pictures', () => {
  it('draws an undamaged, unshielded ship plainly', () => {
    const { game } = newGame();
    const ship = game.commander.ship; // A Gnat: x 18, width 27, no shields.
    expect(shipPictureStrips(ship)).toEqual([{ picture: 'normal', from: 18, to: 47 }]);
  });

  it('damages from the left and shields from the right', () => {
    const { game } = newGame();
    roomyShip(game);
    const ship = game.commander.ship; // A Wasp, which has shield slots.
    ship.hull = Math.trunc(ship.hullStrength / 2);
    ship.addEquipment(Consts.Shields[0]!);
    const strips = shipPictureStrips(ship);
    // Full shields cover the whole ship, so the damaged part shows shielded.
    expect(strips.map((s) => s.picture)).toEqual(['shields-damaged', 'shields']);
    expect(strips[0]!.from).toBeLessThan(strips[0]!.to);

    ship.shields[0]!.charge = 0;
    expect(shipPictureStrips(ship).map((s) => s.picture)).toEqual(['damaged', 'normal']);
    // The strips are contiguous.
    const s2 = shipPictureStrips(ship);
    expect(s2[0]!.to).toBe(s2[1]!.from);
  });

  it('shows more tribbles as they multiply', () => {
    const { game } = newGame();
    const ship = game.commander.ship;
    expect(tribblePictures(ship)).toBe(0);
    ship.tribbles = 1;
    expect(tribblePictures(ship)).toBe(0);
    ship.tribbles = 1000;
    expect(tribblePictures(ship)).toBe(Math.trunc(Math.sqrt(1000 / Math.ceil(100000 / 1369))));
    ship.tribbles = Consts.MaxTribbles;
    expect(tribblePictures(ship)).toBe(36);
  });
});
