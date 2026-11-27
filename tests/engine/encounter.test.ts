import { describe, expect, it } from 'vitest';
import { DialogResult } from '../../src/engine/data/alerts';
import { Consts } from '../../src/engine/data/consts';
import {
  AlertType,
  CrewMemberId,
  EncounterResult,
  EncounterType,
  ShipType,
  TradeItemType,
  WeaponType,
} from '../../src/engine/data/enums';
import { encounterChoices, runEncounter } from '../../src/engine/encounter';
import type { Game } from '../../src/engine/game';
import { EncounterChoice as C } from '../../src/engine/game-ui';
import { Ship } from '../../src/engine/model/ship';
import { setRandomSource } from '../../src/engine/rng';
import { newGame, reachableSystem, useGameCleanup } from './game-helpers';
import type { ScriptedUIOptions } from './scripted-ui';

useGameCleanup();

/** A game in the middle of a trip, about to meet an opponent in a Gnat. */
function encounter(type: EncounterType, ui: ScriptedUIOptions = {}) {
  const { game, ui: scripted } = newGame({ skills: [5, 10, 5, 0], ui });
  game.selectedSystemId = reachableSystem(game).id;
  game.clicks = 10;
  game.opponent = new Ship(ShipType.Gnat);
  game.opponent.crew[0] = game.mercenaries[CrewMemberId.Opponent]!;
  game.encounterType = type;
  return { game, ui: scripted, cmdr: game.commander };
}

function arm(game: Game, weapon = WeaponType.MilitaryLaser): void {
  game.commander.ship.removeEquipment(0, 0);
  game.commander.ship.addEquipment(Consts.Weapons[weapon]!);
}

describe('encounter choices', () => {
  it('offers the original buttons for each kind of encounter', () => {
    const { game } = encounter(EncounterType.PoliceInspect);
    const choicesFor = (type: EncounterType) => {
      game.encounterType = type;
      return encounterChoices(game);
    };

    expect(choicesFor(EncounterType.PoliceInspect)).toEqual([C.Attack, C.Bribe, C.Flee, C.Submit]);
    expect(choicesFor(EncounterType.PirateAttack)).toEqual([C.Attack, C.Flee, C.Surrender]);
    expect(choicesFor(EncounterType.TraderSell)).toEqual([C.Attack, C.Ignore, C.Trade]);
    expect(choicesFor(EncounterType.MarieCeleste)).toEqual([C.Board, C.Ignore]);
    expect(choicesFor(EncounterType.BottleGood)).toEqual([C.Drink, C.Ignore]);
    expect(choicesFor(EncounterType.CaptainAhab)).toEqual([C.Attack, C.Ignore, C.Meet]);
    expect(choicesFor(EncounterType.TraderDisabled)).toEqual([C.Attack, C.Plunder]);
    expect(choicesFor(EncounterType.MarieCelestePolice)).toEqual([
      C.Attack,
      C.Bribe,
      C.Flee,
      C.Yield,
    ]);

    game.encounterContinueAttacking = true;
    expect(choicesFor(EncounterType.PirateAttack)).toEqual([C.Attack, C.Flee, C.Int, C.Surrender]);
  });

  it('rejects a choice that is not on offer', async () => {
    const { game } = encounter(EncounterType.PirateAttack, { encounterChoices: [C.Ignore] });
    await expect(runEncounter(game)).rejects.toThrow('Ignore is not available');
  });
});

describe('running an encounter', () => {
  it('opens with a description of the opponent', async () => {
    const { game, ui } = encounter(EncounterType.TraderIgnore, { encounterChoices: [C.Ignore] });
    expect(await runEncounter(game)).toBe(EncounterResult.Normal);

    const view = ui.encounterViews[0]!;
    expect(view.text).toBe(
      `At 10 clicks from ${game.warpSystem!.name} you encounter a trader gnat.`,
    );
    expect(view.action).toBe('It ignores you.');
    expect(view.continuous).toBe(false);
  });

  it("won't attack without weapons", async () => {
    const { game, ui, cmdr } = encounter(EncounterType.PirateAttack, {
      encounterChoices: [C.Attack, C.Surrender],
    });
    cmdr.ship.removeEquipment(0, 0);

    await runEncounter(game);
    expect(ui.names[0]).toBe('EncounterAttackNoWeapons');
    expect(ui.encounterViews).toHaveLength(2);
  });

  it('destroys a pirate and collects the bounty', async () => {
    const { game, ui, cmdr } = encounter(EncounterType.PirateAttack, {
      strategy: () => C.Attack,
    });
    arm(game);
    game.opponent.hull = 1;
    setRandomSource(() => 0.999); // Every shot hits as hard as it can.
    const bounty = game.opponent.bounty();

    expect(await runEncounter(game)).toBe(EncounterResult.Normal);
    expect(ui.names).toEqual(['EncounterPiratesBounty']);
    expect(cmdr.killsPirate).toBe(1);
    expect(cmdr.cash).toBe(1000 + bounty);
    expect(cmdr.policeRecordScore).toBe(Consts.ScoreKillPirate);
    expect(cmdr.reputationScore).toBe(1); // Gnat: 0 / 2 + 1
  });

  it('keeps attacking on its own in continuous mode until interrupted', async () => {
    const { game, ui } = encounter(EncounterType.PirateAttack, {
      encounterChoices: [C.Attack, C.Tick, C.Int, C.Surrender],
    });
    game.options.continuousAttack = true;
    arm(game, WeaponType.PulseLaser);
    game.opponent.hull = 1000; // Too strong to finish quickly.
    game.opponent.addEquipment(Consts.Weapons[WeaponType.PulseLaser]!);
    game.commander.ship.hull = 1000;
    setRandomSource(() => 0.5);

    await runEncounter(game);
    const [, afterAttack, afterTick, afterInt] = ui.encounterViews;
    expect(afterAttack!.continuous).toBe(true);
    expect(afterAttack!.choices).toContain(C.Int);
    expect(afterTick!.continuous).toBe(true);
    expect(afterInt!.continuous).toBe(false);
    expect(afterInt!.choices).not.toContain(C.Int);
  });

  it('rejects a timer tick when not in continuous mode', async () => {
    const { game } = encounter(EncounterType.PirateAttack, { encounterChoices: [C.Tick] });
    await expect(runEncounter(game)).rejects.toThrow('Tick is not available');
  });

  it('lets the EasyEncounters cheat close the window', async () => {
    const { game } = encounter(EncounterType.PirateAttack, { encounterChoices: [C.Close] });
    game.easyEncounters = true;
    expect(await runEncounter(game)).toBe(EncounterResult.Continue);
  });

  it('can end with the commander killed', async () => {
    const { game, ui, cmdr } = encounter(EncounterType.PirateAttack, {
      strategy: () => C.Attack,
    });
    game.opponent.crew[0] = game.mercenaries[CrewMemberId.FamousCaptain]!;
    game.opponent.addEquipment(Consts.Weapons[WeaponType.MilitaryLaser]!);
    game.opponent.hull = 1000;
    cmdr.ship.hull = 1;
    setRandomSource(() => 0.999);

    expect(await runEncounter(game)).toBe(EncounterResult.Killed);
    expect(ui.names).toEqual(['EncounterYouLose']);
  });

  it('can end in the escape pod', async () => {
    const { game, cmdr } = encounter(EncounterType.PirateAttack, { strategy: () => C.Attack });
    game.opponent.crew[0] = game.mercenaries[CrewMemberId.FamousCaptain]!;
    game.opponent.addEquipment(Consts.Weapons[WeaponType.MilitaryLaser]!);
    game.opponent.hull = 1000;
    cmdr.ship.hull = 1;
    cmdr.ship.escapePod = true;
    setRandomSource(() => 0.999);

    expect(await runEncounter(game)).toBe(EncounterResult.EscapePod);
  });

  it('stops a stuck encounter in tests', async () => {
    // With every roll the same, a fleeing Gnat never gets away and is never hit.
    const { game } = encounter(EncounterType.PirateAttack, { strategy: () => C.Flee });
    setRandomSource(() => 0.999);
    await expect(runEncounter(game)).rejects.toThrow('still going');
  });
});

describe('the police', () => {
  it('find nothing on a clean ship, which improves the record', async () => {
    const { game, ui, cmdr } = encounter(EncounterType.PoliceInspect, {
      encounterChoices: [C.Submit],
    });
    expect(await runEncounter(game)).toBe(EncounterResult.Normal);
    expect(ui.names).toEqual(['EncounterPoliceNothingFound']);
    expect(cmdr.policeRecordScore).toBe(-Consts.ScoreTrafficking);
  });

  it('fine a smuggler, putting what cash cannot cover on the debt', async () => {
    const { game, ui, cmdr } = encounter(EncounterType.PoliceInspect, {
      encounterChoices: [C.Submit],
      answers: { [AlertType.EncounterPoliceSubmit]: [DialogResult.Yes] },
    });
    cmdr.ship.cargo[TradeItemType.Narcotics] = 5;
    cmdr.cash = 50;
    // On Normal: worth / 40, rounded up to 50.
    const fine = Math.ceil(cmdr.worth / 40 / 50) * 50;

    expect(await runEncounter(game)).toBe(EncounterResult.Normal);
    expect(ui.names).toEqual(['EncounterPoliceSubmit', 'EncounterPoliceFine']);
    expect(cmdr.ship.cargo[TradeItemType.Narcotics]).toBe(0);
    expect(cmdr.cash).toBe(0);
    expect(cmdr.debt).toBe(fine - 50);
    expect(cmdr.policeRecordScore).toBe(Consts.ScoreTrafficking);
  });

  it('take a bribe where the government allows it', async () => {
    const { game, ui, cmdr } = encounter(EncounterType.PoliceInspect, {
      encounterChoices: [C.Bribe, C.Submit],
      answers: {
        [AlertType.EncounterPoliceNothingIllegal]: [DialogResult.Yes],
        [AlertType.EncounterPoliceBribe]: [DialogResult.Yes],
      },
    });
    const bribeLevel = game.warpSystem!.politicalSystem.bribeLevel;
    // On Normal: worth / bribe level / 20, rounded up to 100.
    const bribe = Math.max(100, Math.ceil(cmdr.worth / bribeLevel / 20 / 100) * 100);

    await runEncounter(game);
    if (bribeLevel <= 0) expect(ui.names[0]).toBe('EncounterPoliceBribeCant');
    else {
      expect(ui.names).toEqual(['EncounterPoliceNothingIllegal', 'EncounterPoliceBribe']);
      expect(ui.alerts[1]!.args).toEqual([`${bribe} credits`]);
      expect(cmdr.cash).toBe(1000 - bribe);
    }
  });

  it('arrest a commander who surrenders', async () => {
    const { game, cmdr } = encounter(EncounterType.PoliceAttack, {
      encounterChoices: [C.Surrender],
      answers: { [AlertType.EncounterPoliceSurrender]: [DialogResult.Yes] },
    });
    cmdr.policeRecordScore = Consts.PoliceRecordScoreCriminal;
    expect(await runEncounter(game)).toBe(EncounterResult.Arrested);
  });

  it('take fleeing from an inspection as a crime', async () => {
    const { game, cmdr } = encounter(EncounterType.PoliceInspect, {
      encounterChoices: [C.Flee, C.Close],
      answers: { [AlertType.EncounterPoliceNothingIllegal]: [DialogResult.Yes] },
    });
    game.easyEncounters = true; // To close the window after one round.
    setRandomSource(() => 0.999);

    await runEncounter(game);
    expect(game.encounterType).toBe(EncounterType.PoliceAttack);
    // At least one point worse than dubious on Normal.
    expect(cmdr.policeRecordScore).toBe(Consts.PoliceRecordScoreDubious - 1);
  });
});

describe('pirates', () => {
  it('take the most valuable cargo from a commander who surrenders', async () => {
    const { game, ui, cmdr } = encounter(EncounterType.PirateAttack, {
      encounterChoices: [C.Surrender],
    });
    game.opponent.cargo.fill(0);
    cmdr.ship.cargo[TradeItemType.Water] = 5;
    cmdr.ship.cargo[TradeItemType.Robots] = 2;

    expect(await runEncounter(game)).toBe(EncounterResult.Normal);
    expect(ui.names).toEqual(['EncounterLooting']);
    expect(game.raided).toBe(true);
    expect(cmdr.ship.cargo[TradeItemType.Robots]).toBe(0);
    expect(game.opponent.cargo[TradeItemType.Robots]).toBe(2);
  });

  it('blackmail a commander with nothing to steal', async () => {
    const { game, ui, cmdr } = encounter(EncounterType.PirateAttack, {
      encounterChoices: [C.Surrender],
    });
    const blackmail = Math.max(500, Math.trunc(cmdr.worth / 20));

    await runEncounter(game);
    expect(ui.names).toEqual(['EncounterPiratesFindNoCargo']);
    expect(cmdr.cash).toBe(1000 - blackmail);
  });

  it('may take Wild with them, if their ship has room', async () => {
    const { game, ui, cmdr } = encounter(EncounterType.PirateAttack, {
      encounterChoices: [C.Surrender],
    });
    cmdr.ship = new Ship(ShipType.Wasp);
    cmdr.ship.crew[0] = cmdr;
    cmdr.ship.hire(game.mercenaries[CrewMemberId.Wild]!);
    game.questStatusWild = 2;
    game.opponent = new Ship(ShipType.Wasp); // Room for him.

    await runEncounter(game);
    expect(ui.names).toEqual(['EncounterPiratesFindNoCargo', 'WildGoesPirates']);
    // The original left him aboard; see the PORT note.
    expect(cmdr.ship.wildOnBoard).toBe(false);
    expect(game.questStatusWild).toBe(0);
  });

  it("won't take the princess, so surrender is refused", async () => {
    const { game, ui, cmdr } = encounter(EncounterType.PirateAttack, {
      encounterChoices: [C.Surrender, C.Close],
    });
    game.easyEncounters = true; // To close the window afterwards.
    cmdr.ship = new Ship(ShipType.Wasp);
    cmdr.ship.crew[0] = cmdr;
    cmdr.ship.hire(game.mercenaries[CrewMemberId.Princess]!);

    expect(await runEncounter(game)).toBe(EncounterResult.Continue);
    expect(ui.names).toEqual(['EncounterPiratesSurrenderPrincess']);
    expect(ui.encounterViews).toHaveLength(2);
  });
});

describe('traders', () => {
  it('trade in orbit', async () => {
    const { game, ui, cmdr } = encounter(EncounterType.TraderSell, {
      encounterChoices: [C.Trade],
      quantities: [1],
    });
    game.priceCargoBuy.fill(100);
    game.priceCargoSell.fill(90);
    game.opponent.cargo.fill(0);
    game.opponent.cargo[TradeItemType.Water] = 5;
    expect(game.opponent.hasTradeableItems()).toBe(true); // As determineTraderEncounter does.

    expect(await runEncounter(game)).toBe(EncounterResult.Normal);
    expect(cmdr.ship.cargo[TradeItemType.Water]).toBe(1);
    expect(ui.names).toEqual(['EncounterTradeCompleted']);
    expect(ui.alerts[0]!.args).toEqual(['buying', 'Water']);
  });

  it('can be plundered once they surrender', async () => {
    const { game, ui, cmdr } = encounter(EncounterType.TraderSurrender, {
      encounterChoices: [C.Plunder],
    });
    game.opponent.cargo.fill(0);
    game.opponent.cargo[TradeItemType.Food] = 4;
    ui.onPlunder = () => game.cargoPlunder(TradeItemType.Food, true);

    expect(await runEncounter(game)).toBe(EncounterResult.Normal);
    expect(ui.plunders).toBe(1);
    expect(cmdr.ship.cargo[TradeItemType.Food]).toBe(4);
    expect(cmdr.policeRecordScore).toBe(Consts.ScorePlunderTrader);
  });
});

describe('very rare encounters', () => {
  it('Marie Celeste: looting her narcotics brings the police', async () => {
    const { game, cmdr } = encounter(EncounterType.MarieCeleste, {
      encounterChoices: [C.Board],
      answers: { [AlertType.EncounterMarieCeleste]: [DialogResult.Yes] },
    });
    game.opponent.cargo.fill(0);
    game.opponent.cargo[TradeItemType.Narcotics] = 5;
    (game.ui as unknown as { onPlunder: () => Promise<void> }).onPlunder = () =>
      game.cargoPlunder(TradeItemType.Narcotics, true);

    expect(await runEncounter(game)).toBe(EncounterResult.Normal);
    expect(cmdr.ship.cargo[TradeItemType.Narcotics]).toBe(5);
    expect(game.justLootedMarie).toBe(true);
  });

  it('a good bottle of tonic raises skills', async () => {
    const { game, ui, cmdr } = encounter(EncounterType.BottleGood, {
      encounterChoices: [C.Drink],
      answers: { [AlertType.EncounterDrinkContents]: [DialogResult.Yes] },
    });
    const before = cmdr.skills.reduce((a, b) => a + b, 0);

    await runEncounter(game);
    expect(ui.names).toEqual(['EncounterDrinkContents', 'EncounterTonicConsumedGood']);
    expect(cmdr.skills.reduce((a, b) => a + b, 0)).toBe(before + 2);
  });

  it('Captain Ahab trains the pilot in exchange for a reflective shield', async () => {
    const { game, cmdr } = encounter(EncounterType.CaptainAhab, {
      encounterChoices: [C.Meet],
      answers: { [AlertType.MeetCaptainAhab]: [DialogResult.Yes] },
    });
    cmdr.ship.addEquipment(Consts.Shields[1]!);

    await runEncounter(game);
    expect(cmdr.ship.shields.every((s) => s === null)).toBe(true);
    expect(cmdr.pilot).toBe(7);
  });
});
