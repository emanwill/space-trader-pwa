// Port of the logic in Form_Encounter.cs: which buttons an encounter offers,
// what each one does, and the continuous-attack timer. The original ran this
// inside the encounter window; here the engine runs it, and the UI only shows
// the encounter and reports each button press (GameUI.encounterAction).
//
// PORT: not ported, since they are display-only:
// - UpdateTribbles placed tribble pictures using the gameplay RNG. The UI
//   places its own, so tribbles don't change the game's random numbers.
// - Clicking a tribble showed AlertType.TribblesSqueek. The UI can do that
//   itself.

import { EncounterResult, EncounterType } from './data/enums';
import type { Game } from './game';
import { EncounterChoice, type EncounterView } from './game-ui';

/** FormEncounter.UpdateButtons: the buttons shown for the current encounter type, in button order. */
export function encounterChoices(game: Game): EncounterChoice[] {
  const visible = new Set<EncounterChoice>();

  switch (game.encounterType) {
    case EncounterType.BottleGood:
    case EncounterType.BottleOld:
      visible.add(EncounterChoice.Drink);
      visible.add(EncounterChoice.Ignore);
      break;
    case EncounterType.CaptainAhab:
    case EncounterType.CaptainConrad:
    case EncounterType.CaptainHuie:
      visible.add(EncounterChoice.Attack);
      visible.add(EncounterChoice.Ignore);
      visible.add(EncounterChoice.Meet);
      break;
    case EncounterType.DragonflyAttack:
    case EncounterType.FamousCaptainAttack:
    case EncounterType.ScorpionAttack:
    case EncounterType.SpaceMonsterAttack:
    case EncounterType.TraderAttack:
      visible.add(EncounterChoice.Attack);
      visible.add(EncounterChoice.Flee);
      break;
    case EncounterType.DragonflyIgnore:
    case EncounterType.FamousCaptDisabled:
    case EncounterType.PoliceDisabled:
    case EncounterType.PoliceFlee:
    case EncounterType.PoliceIgnore:
    case EncounterType.PirateFlee:
    case EncounterType.PirateIgnore:
    case EncounterType.ScarabIgnore:
    case EncounterType.ScorpionIgnore:
    case EncounterType.SpaceMonsterIgnore:
    case EncounterType.TraderFlee:
    case EncounterType.TraderIgnore:
      visible.add(EncounterChoice.Attack);
      visible.add(EncounterChoice.Ignore);
      break;
    case EncounterType.MarieCeleste:
      visible.add(EncounterChoice.Board);
      visible.add(EncounterChoice.Ignore);
      break;
    case EncounterType.MarieCelestePolice:
      visible.add(EncounterChoice.Attack);
      visible.add(EncounterChoice.Flee);
      visible.add(EncounterChoice.Yield);
      visible.add(EncounterChoice.Bribe);
      break;
    case EncounterType.PirateAttack:
    case EncounterType.PoliceAttack:
    case EncounterType.PoliceSurrender:
    case EncounterType.ScarabAttack:
      visible.add(EncounterChoice.Attack);
      visible.add(EncounterChoice.Flee);
      visible.add(EncounterChoice.Surrender);
      break;
    case EncounterType.PirateDisabled:
    case EncounterType.PirateSurrender:
    case EncounterType.TraderDisabled:
    case EncounterType.TraderSurrender:
      visible.add(EncounterChoice.Attack);
      visible.add(EncounterChoice.Plunder);
      break;
    case EncounterType.PoliceInspect:
      visible.add(EncounterChoice.Attack);
      visible.add(EncounterChoice.Flee);
      visible.add(EncounterChoice.Submit);
      visible.add(EncounterChoice.Bribe);
      break;
    case EncounterType.TraderBuy:
    case EncounterType.TraderSell:
      visible.add(EncounterChoice.Attack);
      visible.add(EncounterChoice.Ignore);
      visible.add(EncounterChoice.Trade);
      break;
  }

  if (game.encounterContinueAttacking || game.encounterContinueFleeing)
    visible.add(EncounterChoice.Int);

  return [...visible].sort((a, b) => a - b);
}

/**
 * Runs one encounter, as FormEncounter did from opening to closing, and
 * returns its result. Travel acts on the result.
 */
export async function runEncounter(game: Game): Promise<EncounterResult> {
  let result = EncounterResult.Continue;
  let closed = false;

  // FormEncounter constructor.
  game.encounterBegin();
  let text = game.encounterTextInitial;
  let action = game.encounterActionInitial; // Also sets encounterOppFleeing.

  const continuing = () => game.encounterContinueAttacking || game.encounterContinueFleeing;

  const disableAuto = () => {
    game.encounterContinueFleeing = false;
    game.encounterContinueAttacking = false;
  };

  const executeAction = async () => {
    if ((result = await game.encounterExecuteAction()) === EncounterResult.Continue) {
      text = game.encounterText;
      action = game.encounterAction;
    } else closed = true;
  };

  const exit = (exitResult: EncounterResult) => {
    result = exitResult;
    closed = true;
  };

  while (!closed) {
    const choices = encounterChoices(game);
    const view: EncounterView = { choices, text, action, continuous: continuing() };
    const choice = await game.ui.encounterAction(view);

    const allowed =
      choices.includes(choice) ||
      (choice === EncounterChoice.Tick && view.continuous) ||
      (choice === EncounterChoice.Close && game.easyEncounters);
    if (!allowed) throw new Error(`Encounter choice ${EncounterChoice[choice]} is not available`);

    switch (choice) {
      case EncounterChoice.Attack:
        disableAuto();

        if (await game.encounterVerifyAttack()) await executeAction();
        break;
      case EncounterChoice.Board:
        if (await game.encounterVerifyBoard()) exit(EncounterResult.Normal);
        break;
      case EncounterChoice.Bribe:
        if (await game.encounterVerifyBribe()) exit(EncounterResult.Normal);
        break;
      case EncounterChoice.Drink:
        await game.encounterDrink();

        exit(EncounterResult.Normal);
        break;
      case EncounterChoice.Flee:
        disableAuto();

        if (await game.encounterVerifyFlee()) await executeAction();
        break;
      case EncounterChoice.Ignore:
        disableAuto();

        exit(EncounterResult.Normal);
        break;
      case EncounterChoice.Int:
        disableAuto();
        break;
      case EncounterChoice.Meet:
        await game.encounterMeet();

        exit(EncounterResult.Normal);
        break;
      case EncounterChoice.Plunder:
        disableAuto();

        await game.encounterPlunder();

        exit(EncounterResult.Normal);
        break;
      case EncounterChoice.Submit:
        if (await game.encounterVerifySubmit())
          exit(
            game.commander.ship.illegalSpecialCargo
              ? EncounterResult.Arrested
              : EncounterResult.Normal,
          );
        break;
      case EncounterChoice.Surrender:
        disableAuto();

        if ((result = await game.encounterVerifySurrender()) !== EncounterResult.Continue)
          closed = true;
        break;
      case EncounterChoice.Trade:
        await game.encounterTrade();

        exit(EncounterResult.Normal);
        break;
      case EncounterChoice.Yield:
        if ((result = await game.encounterVerifyYield()) !== EncounterResult.Continue)
          closed = true;
        break;
      case EncounterChoice.Tick:
        // tmrTick_Tick
        disableAuto();

        await executeAction();
        break;
      case EncounterChoice.Close:
        // The window's close box (EasyEncounters cheat) closes it with the
        // result so far, normally Continue, which Travel ignores.
        closed = true;
        break;
    }
  }

  return result;
}
