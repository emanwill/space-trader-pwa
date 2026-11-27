/// <reference types="node" />
// Headless game harness: a bot that plays whole seeded games through the
// engine, answering every dialog itself, while checking invariants after each
// step. Used by harness.test.ts.

import { Alerts, DialogResult } from '../../src/engine/data/alerts';
import { Consts } from '../../src/engine/data/consts';
import {
  AlertType,
  CrewMemberId,
  Difficulty,
  EquipmentType,
  ShipType,
} from '../../src/engine/data/enums';
import { Game } from '../../src/engine/game';
import { GameEndError } from '../../src/engine/game-end-error';
import {
  EncounterChoice,
  type CargoQuantityRequest,
  type EncounterView,
} from '../../src/engine/game-ui';
import { SpecialEvent } from '../../src/engine/model/special-event';
import { seededRandomSource, setRandomSource, type RandomSource } from '../../src/engine/rng';
import * as services from '../../src/engine/services';
import { ScriptedUI } from './scripted-ui';

/** A ScriptedUI that answers everything at random, from its own seeded source. */
export class BotUI extends ScriptedUI {
  game: Game | null = null;

  constructor(private readonly random: RandomSource) {
    super({ maxEncounterRounds: 2000 });
    this.strategy = (view) => this.pickEncounterChoice(view);
    this.onPlunder = () => this.plunderSome();
    this.onJettison = () => this.jettisonSome();
  }

  /** An integer in [0, max). */
  roll(max: number): number {
    return Math.floor(this.random() * max);
  }

  chance(p: number): boolean {
    return this.random() < p;
  }

  override async alert(type: AlertType, ...args: string[]): Promise<DialogResult> {
    await super.alert(type, ...args);
    const def = Alerts[type];
    if (!('buttons' in def)) return DialogResult.OK;
    // Lean towards the first button (usually Yes / OK).
    const buttons = def.buttons;
    return buttons.length === 1 || this.chance(0.7) ? buttons[0].result : buttons[1]!.result;
  }

  override async cargoQuantity(request: CargoQuantityRequest): Promise<number> {
    await super.cargoQuantity(request);
    return this.chance(0.5) ? request.max : this.roll(request.max + 1);
  }

  private pickEncounterChoice(view: EncounterView): EncounterChoice {
    if (view.continuous && this.chance(0.8)) return EncounterChoice.Tick;
    // Mostly sensible, sometimes reckless.
    const weights: Partial<Record<EncounterChoice, number>> = {
      [EncounterChoice.Attack]: 1,
      [EncounterChoice.Board]: 4,
      [EncounterChoice.Bribe]: 1,
      [EncounterChoice.Drink]: 4,
      [EncounterChoice.Flee]: 3,
      [EncounterChoice.Ignore]: 8,
      [EncounterChoice.Int]: 2,
      [EncounterChoice.Meet]: 4,
      [EncounterChoice.Plunder]: 6,
      [EncounterChoice.Submit]: 6,
      [EncounterChoice.Surrender]: 2,
      [EncounterChoice.Trade]: 4,
      [EncounterChoice.Yield]: 2,
    };
    const total = view.choices.reduce((sum, c) => sum + (weights[c] ?? 0), 0);
    let pick = this.random() * total;
    for (const choice of view.choices) {
      pick -= weights[choice] ?? 0;
      if (pick < 0) return choice;
    }
    return view.choices[0]!;
  }

  private async plunderSome(): Promise<void> {
    const game = this.game!;
    for (let i = 0; i < 10; i++)
      if (game.opponent.cargo[i]! > 0 && this.chance(0.5))
        await game.cargoPlunder(i, this.chance(0.5));
    if (this.chance(0.1)) await this.jettison();
  }

  private async jettisonSome(): Promise<void> {
    const game = this.game!;
    for (let i = 0; i < 10; i++)
      if (game.commander.ship.cargo[i]! > 0 && this.chance(0.3))
        await game.cargoJettison(i, this.chance(0.5));
  }
}

export class InvariantError extends Error {}

function check(condition: boolean, message: string): void {
  if (!condition) throw new InvariantError(message);
}

function isCount(n: number): boolean {
  return Number.isInteger(n) && n >= 0;
}

/** Everything that should hold between player actions. */
export function checkInvariants(game: Game, where: string): void {
  const cmdr = game.commander;
  const ship = cmdr.ship;
  const at = (what: string) => `${what} (${where}, day ${cmdr.days})`;

  check(isCount(cmdr.cash), at(`cash is ${cmdr.cash}`));
  check(isCount(cmdr.debt), at(`debt is ${cmdr.debt}`));
  check(isCount(cmdr.days), at(`days is ${cmdr.days}`));
  check(Number.isInteger(cmdr.policeRecordScore), at('police record is not an integer'));
  check(isCount(cmdr.reputationScore), at(`reputation is ${cmdr.reputationScore}`));
  check(cmdr.noClaim >= 0 && cmdr.noClaim <= Consts.MaxNoClaim, at(`no-claim is ${cmdr.noClaim}`));
  check(!cmdr.insurance || ship.escapePod, at('insured without an escape pod'));
  for (const skill of cmdr.skills)
    check(skill >= 1 && skill <= Consts.MaxSkill, at(`commander skill is ${skill}`));

  check(cmdr.currentSystem !== null, at('commander is nowhere'));
  check(game.universe.includes(cmdr.currentSystem!), at('commander is outside the universe'));

  // Cargo.
  ship.cargo.forEach((n, i) => check(isCount(n), at(`cargo[${i}] is ${n}`)));
  cmdr.priceCargo.forEach((n, i) => check(isCount(n), at(`priceCargo[${i}] is ${n}`)));
  check(
    ship.filledCargoBays <= ship.cargoBays,
    at(`${ship.filledCargoBays} bays filled of ${ship.cargoBays}`),
  );
  check(isCount(ship.tribbles) && ship.tribbles <= Consts.MaxTribbles, at('tribbles out of range'));

  // Fuel and hull.
  check(isCount(ship.fuel) && ship.fuel <= ship.fuelTanks, at(`fuel is ${ship.fuel}`));
  check(
    isCount(ship.hull) && ship.hull <= ship.hullStrength,
    at(`hull is ${ship.hull} of ${ship.hullStrength}`),
  );

  // Crew: the commander first, then any others with no gaps and no repeats.
  check(ship.crew[0] === cmdr, at('commander is not in the first crew slot'));
  let gap = false;
  const ids = new Set<number>();
  for (const member of ship.crew) {
    if (member === null) gap = true;
    else {
      check(!gap, at('gap in the crew list'));
      check(!ids.has(member.id), at(`crew member ${member.id} aboard twice`));
      ids.add(member.id);
      check(game.mercenaries[member.id] === member, at(`crew member ${member.id} is a copy`));
    }
  }

  // Passengers and their quests agree.
  const jarekAboard = ship.jarekOnBoard;
  check(
    jarekAboard ===
      (game.questStatusJarek > SpecialEvent.StatusJarekNotStarted &&
        game.questStatusJarek < SpecialEvent.StatusJarekDone),
    at(`Jarek aboard: ${jarekAboard}, quest status ${game.questStatusJarek}`),
  );
  const wildAboard = ship.wildOnBoard;
  check(
    wildAboard ===
      (game.questStatusWild > SpecialEvent.StatusWildNotStarted &&
        game.questStatusWild < SpecialEvent.StatusWildDone),
    at(`Wild aboard: ${wildAboard}, quest status ${game.questStatusWild}`),
  );

  // Equipment fits its slots.
  for (const type of [EquipmentType.Weapon, EquipmentType.Shield, EquipmentType.Gadget])
    check(
      ship.equipmentByType(type).length === ship.slots(type),
      at(`equipment type ${type} has the wrong number of slots`),
    );

  // Prices.
  game.priceCargoBuy.forEach((n, i) => check(isCount(n), at(`buy price[${i}] is ${n}`)));
  game.priceCargoSell.forEach((n, i) => check(isCount(n), at(`sell price[${i}] is ${n}`)));
  for (const system of game.universe)
    system.tradeItems.forEach((n, i) =>
      check(isCount(n), at(`${system.name} has ${n} of item ${i}`)),
    );
}

export interface GameRun {
  seed: number;
  difficulty: Difficulty;
  turns: number;
  days: number;
  endStatus: number;
  encounters: number;
  alertTypes: Set<AlertType>;
  /** Quests whose status moved off zero at some point. */
  questsStarted: Set<string>;
  reloads: number;
}

const QUESTS = [
  'Artifact',
  'Dragonfly',
  'Experiment',
  'Gemulon',
  'Japori',
  'Jarek',
  'Moon',
  'Princess',
  'Reactor',
  'Scarab',
  'Sculpture',
  'SpaceMonster',
  'Wild',
] as const;

/**
 * Plays one game: up to `maxTurns` warps, docking chores in between, saving
 * and reloading every few turns. Throws InvariantError if anything is off.
 */
export async function playGame(
  seed: number,
  difficulty: Difficulty,
  maxTurns: number,
): Promise<GameRun> {
  setRandomSource(seededRandomSource(seed));
  const ui = new BotUI(seededRandomSource(seed * 7919 + 1));
  const skills = [5, 5, 5, 5];
  for (let i = 0; i < 4; i++) {
    // Shuffle points around, keeping the total at 20 and each skill 1..10.
    const from = ui.roll(4);
    const to = ui.roll(4);
    if (skills[from]! > 1 && skills[to]! < 10) {
      skills[from]!--;
      skills[to]!++;
    }
  }

  let game = Game.newGame('Bot', difficulty, skills[0]!, skills[1]!, skills[2]!, skills[3]!, ui);
  ui.game = game;
  game.options.continuousAttack = ui.chance(0.5);
  game.options.autoFuel = ui.chance(0.5);
  game.options.autoRepair = ui.chance(0.5);
  game.options.alwaysIgnoreTraders = ui.chance(0.5);
  game.options.reserveMoney = ui.chance(0.5);
  game.options.disableOpponents = ui.chance(0.5);
  // Every other game starts wealthy, to reach mid- and late-game content sooner.
  if (seed % 2 === 0) game.commander.cash = 50000 + ui.roll(200000);

  const alertTypes = new Set<AlertType>();
  const questsStarted = new Set<string>();
  let encounters = 0;
  let reloads = 0;
  let turn = 0;
  let stuckTurns = 0;

  const step = async (where: string, action: () => Promise<unknown> | unknown) => {
    await action();
    if (process.env.HARNESS_TRACE === String(seed))
      console.log(
        `day ${game.commander.days} ${where}: cash ${game.commander.cash} debt ${game.commander.debt} ` +
          `fuel ${game.commander.ship.fuel}/${game.commander.ship.fuelTanks} ship ${ShipType[game.commander.ship.type]} ` +
          `alerts ${ui.names.join(',')}`,
      );
    for (const a of ui.alerts) alertTypes.add(a.type);
    encounters += ui.encounterViews.length > 0 ? 1 : 0;
    ui.clear();
    checkInvariants(game, where);
    for (const quest of QUESTS) if (game[`questStatus${quest}`] > 0) questsStarted.add(quest);
  };

  try {
    checkInvariants(game, 'start');

    for (turn = 0; turn < maxTurns; turn++) {
      const cmdr = game.commander;
      const system = cmdr.currentSystem!;

      // Special event.
      if (system.showSpecialButton() && ui.chance(0.6))
        await step('special event', () => services.acceptSpecialEvent(game));

      // Sell everything worth selling.
      for (let i = 0; i < 10; i++)
        if (cmdr.ship.cargo[i]! > 0) {
          if (game.priceCargoSell[i]! > 0) await step('sell', () => game.cargoSellSystem(i, true));
          else if (ui.chance(0.3)) await step('dump', () => game.cargoDump(i));
        }

      // Money matters.
      if (cmdr.debt > 0 && ui.chance(0.7))
        await step('pay back', () => services.payBackLoan(game, cmdr.debt));
      if (cmdr.cash < 500 && ui.chance(0.5))
        await step('loan', () => services.getLoan(game, services.maxLoan(game)));

      // Fuel and repairs.
      await step('fuel', () => services.buyFuel(game, services.maxFuelPurchase(game)));
      if (ui.chance(0.7))
        await step('repairs', () => services.buyRepairs(game, services.maxRepairPurchase(game)));

      // Occasional shopping.
      if (services.canBuyEscapePod(game) && ui.chance(0.6))
        await step('escape pod', () => services.buyEscapePod(game));
      if (cmdr.ship.escapePod && ui.chance(0.1))
        await step('insurance', () => services.toggleInsurance(game));
      if (ui.chance(0.15)) {
        const forSale = services.equipmentForSale();
        if (forSale.length > 0)
          await step('buy equipment', () =>
            services.buyEquipment(game, forSale[ui.roll(forSale.length)]!),
          );
      }
      if (ui.chance(0.05)) {
        const type = ui.roll(3) as EquipmentType;
        const slots = cmdr.ship.equipmentByType(type);
        if (slots.length > 0)
          await step('sell equipment', () =>
            services.sellEquipment(game, type, ui.roll(slots.length)),
          );
      }
      if (ui.chance(cmdr.cash > 50000 ? 0.3 : 0.05)) {
        await step('ship list', () => services.shipListOpened(game));
        const prices = services.shipPrices(game);
        const type = ui.roll(prices.length) as ShipType;
        if (prices[type] !== null) await step('buy ship', () => services.buyShip(game, type));
      }
      if (ui.chance(0.2)) {
        const mercs = system.mercenariesForHire;
        if (mercs.length > 0)
          await step('hire', () => services.hireOrFire(game, mercs[ui.roll(mercs.length)]!));
      }
      if (ui.chance(0.05) && cmdr.ship.crewCount > 1) {
        const crew = cmdr.ship.crew.filter(
          (c) => c !== null && c.id !== CrewMemberId.Commander && services.canHireOrFire(c),
        );
        if (crew.length > 0)
          await step('fire', () => services.hireOrFire(game, crew[ui.roll(crew.length)]!));
      }
      if (ui.chance(0.1)) await step('newspaper', () => game.showNewspaper());

      // Pick a destination and buy something to take there.
      let destinations = game.destinations.filter((id) => id !== cmdr.currentSystemId);
      if (destinations.length === 0) {
        // Out of fuel: borrow for it.
        await step('loan for fuel', () => services.getLoan(game, services.maxLoan(game)));
        await step('fuel', () => services.buyFuel(game, services.maxFuelPurchase(game)));
        destinations = game.destinations.filter((id) => id !== cmdr.currentSystemId);
      }
      if (game.canSuperWarp && ui.chance(0.2)) {
        game.selectedSystemId = ui.roll(game.universe.length);
        await step('jump', () => services.jump(game));
        continue;
      }
      if (destinations.length === 0) {
        // Stranded: no fuel and no money. Retire.
        await step('retire', () => services.retire(game));
        if (game.endStatus !== -1) break;
        continue;
      }
      game.selectedSystemId = destinations[ui.roll(destinations.length)]!;
      const wormhole = game.wormholes.indexOf(cmdr.currentSystemId);
      if (wormhole >= 0 && ui.chance(0.2)) {
        game.selectedSystemId = cmdr.currentSystemId;
        game.targetWormhole = true;
      }

      // Usually the good with the best margin at the destination (judged by
      // its standard price there), sometimes anything.
      const dest = game.warpSystem!;
      let item = ui.roll(10);
      if (ui.chance(0.8)) {
        let best = 0;
        for (let i = 0; i < 10; i++) {
          const margin = Consts.TradeItems[i]!.standardPrice(dest) - game.priceCargoBuy[i]!;
          if (game.priceCargoBuy[i]! > 0 && margin > best) {
            best = margin;
            item = i;
          }
        }
      }
      if (game.priceCargoBuy[item]! > 0)
        await step('buy', () => game.cargoBuySystem(item, ui.chance(0.8)));

      const days = cmdr.days;
      await step('warp', () => game.warp(false));

      // A warp that keeps getting refused (taxes, debt) leaves the bot stuck.
      stuckTurns = game.commander.days === days ? stuckTurns + 1 : 0;
      if (stuckTurns >= 5) {
        await step('retire', () => services.retire(game));
        break;
      }

      // Save and reload now and then, carrying on with the loaded game.
      if (turn % 7 === 6) {
        const saved = JSON.stringify(game.serialize());
        game = Game.fromHash(JSON.parse(saved), ui);
        ui.game = game;
        reloads++;
        if (JSON.stringify(game.serialize()) !== saved)
          throw new InvariantError(`save changed after reloading (day ${game.commander.days})`);
        checkInvariants(game, 'reload');
      }
    }
  } catch (error) {
    if (!(error instanceof GameEndError)) throw error;
    for (const a of ui.alerts) alertTypes.add(a.type);
  }

  return {
    seed,
    difficulty,
    turns: turn,
    days: game.commander.days,
    endStatus: game.endStatus,
    encounters,
    alertTypes,
    questsStarted,
    reloads,
  };
}
