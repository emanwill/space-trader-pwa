// Port of Game.cs: the running game. Holds the universe, the commander, quest
// state and the current encounter, and runs trading, travel, encounters and
// special events.
//
// The port keeps the C# member order (methods, then properties) so the two can
// be compared line by line.
//
// PORT notes that apply throughout:
// - The game keeps its GameUI as `ui` (the original's ParentWindow). The C#
//   `IWin32Window owner` parameters are dropped: owner and ParentWindow were
//   always the same window, so every alert goes to `this.ui`.
// - Methods that show dialogs are async.
// - ParentWindow.UpdateAll() / UpdateStatusBar() calls are dropped. The UI
//   refreshes itself after each engine call.
// - Trivial get/set properties are public fields.

import { DialogResult } from './data/alerts';
import { Consts } from './data/consts';
import {
  AlertType,
  CargoBuyOp,
  CargoSellOp,
  CrewMemberId,
  Difficulty,
  EncounterResult,
  EncounterType,
  EquipmentType,
  GadgetType,
  GameEndType,
  NewsEvent,
  OpponentType,
  PoliticalSystemType,
  ShieldType,
  ShipType,
  ShipyardId,
  Size,
  SkillType,
  SpecialEventType,
  SpecialResource,
  StarSystemId,
  SystemPressure,
  TechLevel,
  TradeItemType,
  VeryRareEncounter,
  WeaponType,
} from './data/enums';
import { Strings } from './data/strings';
import { runEncounter } from './encounter';
import { formatNumber, multiples, stringVars } from './format';
import { distance, randomSkill, wormholeExists } from './functions';
import { GameEndError } from './game-end-error';
import { setCurrentGame, type GameContext } from './game-context';
import type { GameUI } from './game-ui';
import { idiv, roundHalfEven, toInt } from './math';
import { Commander } from './model/commander';
import { CrewMember } from './model/crew-member';
import { GameOptions } from './model/game-options';
import { PoliceRecord } from './model/police-record';
import { Ship } from './model/ship';
import { SpecialEvent } from './model/special-event';
import { StarSystem } from './model/star-system';
import { getRandom, getRandom2, randSeed } from './rng';
import { getValue, getValueOr, type Hash } from './serialization';

/** Port of FutureVersionException.cs: the save was made by a newer version. */
export class FutureVersionError extends Error {
  constructor() {
    super('This save was made by a newer version of the game.');
    this.name = 'FutureVersionError';
  }
}

export class Game implements GameContext {
  // #region Member Declarations

  // Game Data
  private _universe: StarSystem[] = [];
  private _wormholes: number[] = new Array<number>(6).fill(0);
  private _mercenaries: (CrewMember | null)[] = new Array<CrewMember | null>(
    Strings.CrewMemberNames.length,
  ).fill(null);
  private _commander: Commander | null = null;
  private _dragonfly = new Ship(ShipType.Dragonfly);
  private _scarab = new Ship(ShipType.Scarab);
  private _scorpion = new Ship(ShipType.Scorpion);
  private _spaceMonster = new Ship(ShipType.SpaceMonster);
  opponent = new Ship(ShipType.Gnat);
  opponentDisabled = false;

  chanceOfTradeInOrbit = 100;
  clicks = 0; // Distance from target system, 0 = arrived
  raided = false; // True when the commander has been raided during the trip
  inspected = false; // True when the commander has been inspected during the trip
  tribbleMessage = false; // Is true if the Ship Yard on the current system informed you about the tribbles
  arrivedViaWormhole = false; // flag to indicate whether player arrived on current planet via wormhole
  paidForNewspaper = false; // once you buy a paper on a system, you don't have to pay again.
  litterWarning = false; // Warning against littering has been issued.
  private _newsEvents: NewsEvent[] = [];

  // Current Selections
  private _difficulty = Difficulty.Normal; // Difficulty level
  cheatEnabled = false;
  autoSave = false;
  easyEncounters = false;
  endStatus = GameEndType.NA;
  encounterType: EncounterType = 0; // Type of current encounter
  private _selectedSystemId = StarSystemId.NA; // Current system on chart
  private _warpSystemId = StarSystemId.NA; // Target system for warp
  trackedSystemId = StarSystemId.NA; // The short-range chart will display an arrow towards this system if the value is not null
  private _targetWormhole = false; // Wormhole selected?
  private _priceCargoBuy: number[] = new Array<number>(10).fill(0);
  private _priceCargoSell: number[] = new Array<number>(10).fill(0);

  // Status of Quests
  questStatusArtifact = 0; // 0 = not given yet, 1 = Artifact on board, 2 = Artifact no longer on board (either delivered or lost)
  questStatusDragonfly = 0; // 0 = not available, 1 = Go to Baratas, 2 = Go to Melina, 3 = Go to Regulas, 4 = Go to Zalkon, 5 = Dragonfly destroyed, 6 = Got Shield
  questStatusExperiment = 0; // 0 = not given yet, 1-11 = days from start; 12 = performed, 13 = cancelled
  questStatusGemulon = 0; // 0 = not given yet, 1-7 = days from start, 8 = too late, 9 = in time, 10 = done
  questStatusJapori = 0; // 0 = no disease, 1 = Go to Japori (always at least 10 medicine cannisters), 2 = Assignment finished or canceled
  questStatusJarek = 0; // 0 = not delivered, 1-11 = on board, 12 = delivered
  questStatusMoon = 0; // 0 = not bought, 1 = bought, 2 = claimed
  questStatusPrincess = 0; // 0 = not available, 1 = Go to Centauri, 2 = Go to Inthara, 3 = Go to Qonos, 4 = Princess Rescued, 5-14 = On Board, 15 = Princess Returned, 16 = Got Quantum Disruptor
  questStatusReactor = 0; // 0 = not encountered, 1-20 = days of mission (bays of fuel left = 10 - (ReactorStatus / 2), 21 = delivered, 22 = Done
  questStatusScarab = 0; // 0 = not given yet, 1 = not destroyed, 2 = destroyed - upgrade not performed, 3 = destroyed - hull upgrade performed
  questStatusSculpture = 0; // 0 = not given yet, 1 = on board, 2 = delivered, 3 = done
  questStatusSpaceMonster = 0; // 0 = not available, 1 = Space monster is in Acamar system, 2 = Space monster is destroyed, 3 = Claimed reward
  questStatusWild = 0; // 0 = not delivered, 1-11 = on board, 12 = delivered
  fabricRipProbability = 0; // if Experiment = 12, this is the probability of being warped to a random planet.
  justLootedMarie = false; // flag to indicate whether player looted Marie Celeste
  canSuperWarp = false; // Do you have the Portable Singularity on board?
  chanceOfVeryRareEncounter = 5;
  private _veryRareEncounters: VeryRareEncounter[] = []; // Array of Very Rare encounters not done yet.

  // Options
  private _options = new GameOptions(true);

  // The rest of the member variables are not saved between games.
  /** The original's ParentWindow: where alerts and dialogs go. */
  ui: GameUI;
  encounterContinueFleeing = false;
  encounterContinueAttacking = false;
  encounterCmdrFleeing = false;
  encounterCmdrHit = false;
  encounterOppFleeingPrev = false;
  encounterOppFleeing = false;
  encounterOppHit = false;

  // #endregion

  // #region Methods

  // PORT: the two C# constructors became the static factories newGame and
  // fromHash. Both make the new game the current game first, as the C# did.
  private constructor(ui: GameUI) {
    setCurrentGame(this);
    this.ui = ui;
  }

  static newGame(
    name: string,
    difficulty: Difficulty,
    pilot: number,
    fighter: number,
    trader: number,
    engineer: number,
    ui: GameUI,
  ): Game {
    const game = new Game(ui);
    game._difficulty = difficulty;

    // Keep Generating a new universe until PlaceSpecialEvents and PlaceShipyards return true,
    // indicating all special events and shipyards were placed.
    do game.generateUniverse();
    while (!(game.placeSpecialEvents() && game.placeShipyards()));

    game.initializeCommander(
      name,
      new CrewMember(CrewMemberId.Commander, pilot, fighter, trader, engineer, StarSystemId.NA),
    );
    game.generateCrewMemberList();

    game.createShips();

    game.calculatePrices(game.commander.currentSystem!);

    game.resetVeryRareEncounters();

    if (game.difficulty < Difficulty.Normal)
      game.commander.currentSystem!.specialEventType = SpecialEventType.Lottery;

    return game;
  }

  static fromHash(hash: Hash, ui: GameUI): Game {
    const game = new Game(ui);

    const version = getValue<string>(hash, '_version');
    if (version > Consts.CurrentVersion) throw new FutureVersionError();

    game._universe = getValue<Hash[]>(hash, '_universe').map((h) => StarSystem.fromHash(h));
    game._wormholes = [...getValueOr(hash, '_wormholes', game._wormholes)];
    game._mercenaries = getValue<(Hash | null)[]>(hash, '_mercenaries').map((h) =>
      h === null ? null : CrewMember.fromHash(h),
    );
    game._commander = Commander.fromHash(getValue(hash, '_commander'));
    game._dragonfly = Ship.fromHash(getValueOr(hash, '_dragonfly', game._dragonfly.serialize()));
    game._scarab = Ship.fromHash(getValueOr(hash, '_scarab', game._scarab.serialize()));
    game._scorpion = Ship.fromHash(getValueOr(hash, '_scorpion', game._scorpion.serialize()));
    game._spaceMonster = Ship.fromHash(
      getValueOr(hash, '_spaceMonster', game._spaceMonster.serialize()),
    );
    game.opponent = Ship.fromHash(getValueOr(hash, '_opponent', game.opponent.serialize()));
    game.chanceOfTradeInOrbit = getValueOr(
      hash,
      '_chanceOfTradeInOrbit',
      game.chanceOfTradeInOrbit,
    );
    game.clicks = getValueOr(hash, '_clicks', game.clicks);
    game.raided = getValueOr(hash, '_raided', game.raided);
    game.inspected = getValueOr(hash, '_inspected', game.inspected);
    game.tribbleMessage = getValueOr(hash, '_tribbleMessage', game.tribbleMessage);
    game.arrivedViaWormhole = getValueOr(hash, '_arrivedViaWormhole', game.arrivedViaWormhole);
    game.paidForNewspaper = getValueOr(hash, '_paidForNewspaper', game.paidForNewspaper);
    game.litterWarning = getValueOr(hash, '_litterWarning', game.litterWarning);
    game._newsEvents = [...getValueOr(hash, '_newsEvents', game._newsEvents)];
    game._difficulty = getValueOr(hash, '_difficulty', game._difficulty);
    game.cheatEnabled = getValueOr(hash, '_cheatEnabled', game.cheatEnabled);
    game.autoSave = getValueOr(hash, '_autoSave', game.autoSave);
    game.easyEncounters = getValueOr(hash, '_easyEncounters', game.easyEncounters);
    game.endStatus = getValueOr(hash, '_endStatus', game.endStatus);
    game.encounterType = getValueOr(hash, '_encounterType', game.encounterType);
    game._selectedSystemId = getValueOr(hash, '_selectedSystemId', game._selectedSystemId);
    game._warpSystemId = getValueOr(hash, '_warpSystemId', game._warpSystemId);
    game.trackedSystemId = getValueOr(hash, '_trackedSystemId', game.trackedSystemId);
    game._targetWormhole = getValueOr(hash, '_targetWormhole', game._targetWormhole);
    game._priceCargoBuy = [...getValueOr(hash, '_priceCargoBuy', game._priceCargoBuy)];
    game._priceCargoSell = [...getValueOr(hash, '_priceCargoSell', game._priceCargoSell)];
    game.questStatusArtifact = getValueOr(hash, '_questStatusArtifact', game.questStatusArtifact);
    game.questStatusDragonfly = getValueOr(
      hash,
      '_questStatusDragonfly',
      game.questStatusDragonfly,
    );
    game.questStatusExperiment = getValueOr(
      hash,
      '_questStatusExperiment',
      game.questStatusExperiment,
    );
    game.questStatusGemulon = getValueOr(hash, '_questStatusGemulon', game.questStatusGemulon);
    game.questStatusJapori = getValueOr(hash, '_questStatusJapori', game.questStatusJapori);
    game.questStatusJarek = getValueOr(hash, '_questStatusJarek', game.questStatusJarek);
    game.questStatusMoon = getValueOr(hash, '_questStatusMoon', game.questStatusMoon);
    game.questStatusPrincess = getValueOr(hash, '_questStatusPrincess', game.questStatusPrincess);
    game.questStatusReactor = getValueOr(hash, '_questStatusReactor', game.questStatusReactor);
    game.questStatusScarab = getValueOr(hash, '_questStatusScarab', game.questStatusScarab);
    game.questStatusSculpture = getValueOr(
      hash,
      '_questStatusSculpture',
      game.questStatusSculpture,
    );
    game.questStatusSpaceMonster = getValueOr(
      hash,
      '_questStatusSpaceMonster',
      game.questStatusSpaceMonster,
    );
    game.questStatusWild = getValueOr(hash, '_questStatusWild', game.questStatusWild);
    game.fabricRipProbability = getValueOr(
      hash,
      '_fabricRipProbability',
      game.fabricRipProbability,
    );
    game.justLootedMarie = getValueOr(hash, '_justLootedMarie', game.justLootedMarie);
    game.canSuperWarp = getValueOr(hash, '_canSuperWarp', game.canSuperWarp);
    game.chanceOfVeryRareEncounter = getValueOr(
      hash,
      '_chanceOfVeryRareEncounter',
      game.chanceOfVeryRareEncounter,
    );
    // PORT: after loading, the original's list held boxed ints, which never
    // equalled the boxed enum values passed to Remove, so very rare encounters
    // could repeat in a loaded game. Plain numbers here, so removal works.
    game._veryRareEncounters = [
      ...getValueOr(hash, '_veryRareEncounters', game._veryRareEncounters),
    ];
    game._options = GameOptions.fromHash(getValueOr(hash, '_options', game._options.serialize()));

    return game;
  }

  async arrested(): Promise<void> {
    const cmdr = this.commander;
    const term = Math.max(30, -cmdr.policeRecordScore);
    let fine = (1 + idiv(cmdr.worth * Math.min(80, -cmdr.policeRecordScore), 50000)) * 500;
    if (cmdr.ship.wildOnBoard) fine = toInt(fine * 1.05);

    await this.ui.alert(AlertType.EncounterArrested);

    await this.ui.alert(
      AlertType.JailConvicted,
      multiples(term, Strings.TimeUnit),
      multiples(fine, Strings.MoneyUnit),
    );

    if (cmdr.ship.hasGadget(GadgetType.HiddenCargoBays)) {
      while (cmdr.ship.hasGadget(GadgetType.HiddenCargoBays))
        cmdr.ship.removeEquipmentBySubType(EquipmentType.Gadget, GadgetType.HiddenCargoBays);

      await this.ui.alert(AlertType.JailHiddenCargoBaysRemoved);
    }

    if (cmdr.ship.reactorOnBoard) {
      await this.ui.alert(AlertType.ReactorConfiscated);
      this.questStatusReactor = SpecialEvent.StatusReactorNotStarted;
    }

    if (cmdr.ship.sculptureOnBoard) {
      await this.ui.alert(AlertType.SculptureConfiscated);
      this.questStatusSculpture = SpecialEvent.StatusSculptureNotStarted;
    }

    if (cmdr.ship.wildOnBoard) {
      await this.ui.alert(AlertType.WildArrested);
      this.newsAddEvent(NewsEvent.WildArrested);
      this.questStatusWild = SpecialEvent.StatusWildNotStarted;
      // PORT: the original reset the quest but left Wild aboard. (In the Palm
      // original, passengers were flags rather than crew.) He's in jail now.
      cmdr.ship.fire(CrewMemberId.Wild);
    }

    if (cmdr.ship.anyIllegalCargo) {
      await this.ui.alert(AlertType.JailIllegalGoodsImpounded);
      cmdr.ship.removeIllegalGoods();
    }

    if (cmdr.insurance) {
      await this.ui.alert(AlertType.JailInsuranceLost);
      cmdr.insurance = false;
      cmdr.noClaim = 0;
    }

    // PORT: the original tested `CrewCount - SpecialCrew.Length > 1`, but
    // SpecialCrew includes the commander, so a single mercenary never left.
    // It then cleared every crew slot, passengers included, so the Jarek and
    // Princess checks below never fired and those quests got stuck. Now all
    // mercenaries leave and the passengers are handled below.
    if (cmdr.ship.crewCount - cmdr.ship.specialCrew.length > 0) {
      await this.ui.alert(AlertType.JailMercenariesLeave);
      const crew = cmdr.ship.crew;
      const staying = crew
        .slice(1)
        .filter((member) => member !== null && Consts.SpecialCrewMemberIds.includes(member.id));
      for (let i = 1; i < crew.length; i++) crew[i] = staying[i - 1] ?? null;
      this.recalculateBuyPrices(cmdr.currentSystem!);
    }

    if (cmdr.ship.jarekOnBoard) {
      await this.ui.alert(AlertType.JarekTakenHome);
      this.questStatusJarek = SpecialEvent.StatusJarekNotStarted;
      // PORT: and he actually leaves the ship (see Wild above).
      cmdr.ship.fire(CrewMemberId.Jarek);
    }

    if (cmdr.ship.princessOnBoard) {
      await this.ui.alert(AlertType.PrincessTakenHome);
      this.questStatusPrincess = SpecialEvent.StatusPrincessNotStarted;
      // PORT: and she actually leaves the ship (see Wild above).
      cmdr.ship.fire(CrewMemberId.Princess);
    }

    if (this.questStatusJapori === SpecialEvent.StatusJaporiInTransit) {
      await this.ui.alert(AlertType.AntidoteTaken);
      this.questStatusJapori = SpecialEvent.StatusJaporiDone;
    }

    if (cmdr.cash >= fine) cmdr.cash -= fine;
    else {
      cmdr.cash = Math.max(0, cmdr.cash + cmdr.ship.worth(true) - fine);

      await this.ui.alert(AlertType.JailShipSold);

      if (cmdr.ship.tribbles > 0) await this.ui.alert(AlertType.TribblesRemoved);

      await this.ui.alert(AlertType.FleaBuilt);
      this.createFlea();
    }

    if (cmdr.debt > 0) {
      const paydown = Math.min(cmdr.cash, cmdr.debt);
      cmdr.debt -= paydown;
      cmdr.cash -= paydown;

      if (cmdr.debt > 0) for (let i = 0; i < term; i++) cmdr.payInterest();
    }

    cmdr.policeRecordScore = Consts.PoliceRecordScoreDubious;
    await this.incDays(term);
  }

  private async arrival(): Promise<void> {
    const cmdr = this.commander;
    cmdr.currentSystem = this.warpSystem!;
    cmdr.currentSystem!.visited = true;
    this.paidForNewspaper = false;

    if (this.trackedSystem === cmdr.currentSystem && this.options.trackAutoOff)
      this.trackedSystemId = StarSystemId.NA;

    await this.arrivalCheckReactor();
    await this.arrivalCheckTribbles();
    await this.arrivalCheckDebt();
    await this.arrivalPerformRepairs();
    this.arrivalUpdatePressuresAndQuantities();
    await this.arrivalCheckEasterEgg();

    this.calculatePrices(cmdr.currentSystem!);
    this.newsAddEventsOnArrival();

    if (this.options.newsAutoShow) await this.showNewspaper();
  }

  private async arrivalCheckDebt(): Promise<void> {
    const cmdr = this.commander;
    // Check for Large Debt - 06/30/01 SRA
    if (cmdr.debt >= Consts.DebtWarning) await this.ui.alert(AlertType.DebtWarning);
    // Debt Reminder
    else if (cmdr.debt > 0 && this.options.remindLoans && cmdr.days % 5 === 0)
      await this.ui.alert(AlertType.DebtReminder, multiples(cmdr.debt, Strings.MoneyUnit));
  }

  private async arrivalCheckEasterEgg(): Promise<void> {
    const cmdr = this.commander;
    /* This Easter Egg gives the commander a Lighting Shield */
    if (cmdr.currentSystem!.id === StarSystemId.Og) {
      let egg = true;
      for (let i = 0; i < cmdr.ship.cargo.length && egg; i++)
        if (cmdr.ship.cargo[i] !== 1) egg = false;

      if (egg && cmdr.ship.freeSlotsShield > 0) {
        await this.ui.alert(AlertType.Egg);
        cmdr.ship.addEquipment(Consts.Shields[ShieldType.Lightning]!);
        for (let i = 0; i < cmdr.ship.cargo.length; i++) {
          cmdr.ship.cargo[i] = 0;
          cmdr.priceCargo[i] = 0;
        }
      }
    }
  }

  private async arrivalCheckReactor(): Promise<void> {
    if (this.questStatusReactor === SpecialEvent.StatusReactorDate) {
      await this.ui.alert(AlertType.ReactorMeltdown);
      this.questStatusReactor = SpecialEvent.StatusReactorNotStarted;
      if (this.commander.ship.escapePod) await this.escapeWithPod();
      else {
        await this.ui.alert(AlertType.ReactorDestroyed);

        throw new GameEndError(this, GameEndType.Killed);
      }
    } else {
      // Reactor warnings:
      // now they know the quest has a time constraint!
      if (this.questStatusReactor === SpecialEvent.StatusReactorFuelOk + 1)
        await this.ui.alert(AlertType.ReactorWarningFuel);
      // better deliver it soon!
      else if (this.questStatusReactor === SpecialEvent.StatusReactorDate - 4)
        await this.ui.alert(AlertType.ReactorWarningFuelGone);
      // last warning!
      else if (this.questStatusReactor === SpecialEvent.StatusReactorDate - 2)
        await this.ui.alert(AlertType.ReactorWarningTemp);
    }
  }

  private async arrivalCheckTribbles(): Promise<void> {
    const cmdr = this.commander;
    const ship = cmdr.ship;

    if (ship.tribbles > 0) {
      const previousTribbles = ship.tribbles;
      const narc = TradeItemType.Narcotics;
      const food = TradeItemType.Food;

      if (ship.reactorOnBoard) {
        if (ship.tribbles < 20) {
          ship.tribbles = 0;
          await this.ui.alert(AlertType.TribblesAllDied);
        } else {
          ship.tribbles = idiv(ship.tribbles, 2);
          await this.ui.alert(AlertType.TribblesHalfDied);
        }
      } else if (ship.cargo[narc]! > 0) {
        const dead = Math.min(1 + getRandom(3), ship.cargo[narc]!);
        cmdr.priceCargo[narc] = idiv(
          cmdr.priceCargo[narc]! * (ship.cargo[narc]! - dead),
          ship.cargo[narc]!,
        );
        ship.cargo[narc]! -= dead;
        ship.cargo[TradeItemType.Furs]! += dead;
        ship.tribbles -= Math.min(dead * (getRandom(5) + 98), ship.tribbles - 1);
        await this.ui.alert(AlertType.TribblesMostDied);
      } else {
        if (ship.cargo[food]! > 0 && ship.tribbles < Consts.MaxTribbles) {
          const eaten = ship.cargo[food]! - getRandom(ship.cargo[food]!);
          cmdr.priceCargo[food]! -= idiv(cmdr.priceCargo[food]! * eaten, ship.cargo[food]!);
          ship.cargo[food]! -= eaten;
          ship.tribbles += eaten * 100;
          await this.ui.alert(AlertType.TribblesAteFood);
        }

        if (ship.tribbles < Consts.MaxTribbles)
          ship.tribbles +=
            1 + getRandom(ship.cargo[food]! > 0 ? ship.tribbles : idiv(ship.tribbles, 2));

        if (ship.tribbles > Consts.MaxTribbles) ship.tribbles = Consts.MaxTribbles;

        if (
          (previousTribbles < 100 && ship.tribbles >= 100) ||
          (previousTribbles < 1000 && ship.tribbles >= 1000) ||
          (previousTribbles < 10000 && ship.tribbles >= 10000) ||
          (previousTribbles < 50000 && ship.tribbles >= 50000) ||
          (previousTribbles < Consts.MaxTribbles && ship.tribbles === Consts.MaxTribbles)
        ) {
          const qty =
            ship.tribbles === Consts.MaxTribbles
              ? Strings.TribbleDangerousNumber
              : formatNumber(ship.tribbles);
          await this.ui.alert(AlertType.TribblesInspector, qty);
        }
      }

      this.tribbleMessage = false;
    }
  }

  private async arrivalPerformRepairs(): Promise<void> {
    const cmdr = this.commander;
    const ship = cmdr.ship;

    if (ship.hull < ship.hullStrength)
      ship.hull += Math.min(ship.hullStrength - ship.hull, getRandom(ship.engineer));

    for (const shield of ship.shields) if (shield !== null) shield.charge = shield.power;

    let fuelOk = true;
    let toAdd = ship.fuelTanks - ship.fuel;
    if (this.options.autoFuel && toAdd > 0) {
      if (cmdr.cash >= toAdd * ship.fuelCost) {
        ship.fuel += toAdd;
        cmdr.cash -= toAdd * ship.fuelCost;
      } else fuelOk = false;
    }

    let repairOk = true;
    toAdd = ship.hullStrength - ship.hull;
    if (this.options.autoRepair && toAdd > 0) {
      if (cmdr.cash >= toAdd * ship.repairCost) {
        ship.hull += toAdd;
        cmdr.cash -= toAdd * ship.repairCost;
      } else repairOk = false;
    }

    if (!fuelOk && !repairOk) await this.ui.alert(AlertType.ArrivalIFFuelRepairs);
    else if (!fuelOk) await this.ui.alert(AlertType.ArrivalIFFuel);
    else if (!repairOk) await this.ui.alert(AlertType.ArrivalIFRepairs);
  }

  private arrivalUpdatePressuresAndQuantities(): void {
    for (const system of this.universe) {
      if (getRandom(100) < 15)
        system.systemPressure =
          system.systemPressure === SystemPressure.None
            ? (getRandom(SystemPressure.War, SystemPressure.Employment + 1) as SystemPressure)
            : SystemPressure.None;

      if (system.countDown > 0) {
        system.countDown--;

        if (system.countDown > this.countDownStart) system.countDown = this.countDownStart;
        else if (system.countDown <= 0) system.initializeTradeItems();
        else {
          for (let j = 0; j < Consts.TradeItems.length; j++) {
            // The original tests whether the item is traded at the warp system
            // (now the current system), not at the system being restocked.
            if (this.warpSystem!.itemTraded(Consts.TradeItems[j]!))
              system.tradeItems[j] = Math.max(0, system.tradeItems[j]! + getRandom(-4, 5));
          }
        }
      }
    }
  }

  private calculatePrices(system: StarSystem): void {
    for (let i = 0; i < Consts.TradeItems.length; i++) {
      const item = Consts.TradeItems[i]!;
      let price = item.standardPrice(system);

      if (price > 0) {
        // In case of a special status, adapt price accordingly
        if (item.pressurePriceHike === system.systemPressure) price = idiv(price * 3, 2);

        // Randomize price a bit
        const variance = Math.min(item.priceVariance, price - 1);
        price = price + getRandom(-variance, variance + 1);

        // Criminals have to pay off an intermediary
        if (this.commander.policeRecordScore < Consts.PoliceRecordScoreDubious)
          price = idiv(price * 90, 100);
      }

      this._priceCargoSell[i] = price;
    }

    this.recalculateBuyPrices(system);
  }

  // PORT: `amount` is new. When given (and `max` is false), it replaces the
  // quantity the FormCargoBuy/FormCargoSell dialog would have asked for, so a
  // UI with its own quantity controls can skip the dialog. It is clamped to
  // the same limits.
  private async cargoBuy(
    tradeItem: number,
    max: boolean,
    op: CargoBuyOp,
    amount?: number,
  ): Promise<void> {
    const cmdr = this.commander;
    let freeBays = cmdr.ship.freeCargoBays;
    let items: number[] = [];
    let unitPrice = 0;
    let cashToSpend = cmdr.cash;

    switch (op) {
      case CargoBuyOp.BuySystem:
        freeBays = Math.max(0, cmdr.ship.freeCargoBays - this.options.leaveEmpty);
        items = cmdr.currentSystem!.tradeItems;
        unitPrice = this.priceCargoBuy[tradeItem]!;
        cashToSpend = cmdr.cashToSpend;
        break;
      case CargoBuyOp.BuyTrader: {
        items = this.opponent.cargo;
        const item = Consts.TradeItems[tradeItem]!;
        const chance = item.illegal ? 45 : 10;
        const adj = getRandom(100) < chance ? 1.1 : item.illegal ? 0.8 : 0.9;
        unitPrice = Math.min(
          item.maxTradePrice,
          Math.max(
            item.minTradePrice,
            toInt(roundHalfEven((this.priceCargoBuy[tradeItem]! * adj) / item.roundOff)) *
              item.roundOff,
          ),
        );
        break;
      }
      case CargoBuyOp.Plunder:
        items = this.opponent.cargo;
        break;
    }

    if (op === CargoBuyOp.BuySystem && cmdr.debt > Consts.DebtTooLarge)
      await this.ui.alert(AlertType.DebtTooLargeTrade);
    else if (op === CargoBuyOp.BuySystem && (items[tradeItem]! <= 0 || unitPrice <= 0))
      await this.ui.alert(AlertType.CargoNoneAvailable);
    else if (freeBays === 0) await this.ui.alert(AlertType.CargoNoEmptyBays);
    else if (op !== CargoBuyOp.Plunder && cashToSpend < unitPrice)
      await this.ui.alert(AlertType.CargoIF);
    else {
      let qty = 0;
      let maxAmount = Math.min(freeBays, items[tradeItem]!);
      if (op === CargoBuyOp.BuySystem)
        maxAmount = Math.min(maxAmount, idiv(cmdr.cashToSpend, unitPrice));
      // PORT: for trade in orbit, the original's FormCargoBuy limited the
      // amount by cash using the system's buy price, though the trader charges
      // unitPrice, so a dear trader could drive cash negative. Limit by the
      // trader's price here instead.
      else if (op === CargoBuyOp.BuyTrader)
        maxAmount = Math.min(maxAmount, idiv(cmdr.cash, unitPrice));

      if (max) qty = maxAmount;
      else
        qty = Math.max(
          0,
          Math.min(
            maxAmount,
            amount ??
              (await this.ui.cargoQuantity({
                kind: 'buy',
                op,
                tradeItem,
                max: maxAmount,
                unitPrice,
              })),
          ),
        );

      if (qty > 0) {
        const totalPrice = qty * unitPrice;

        cmdr.ship.cargo[tradeItem]! += qty;
        items[tradeItem]! -= qty;
        cmdr.cash -= totalPrice;
        cmdr.priceCargo[tradeItem]! += totalPrice;
      }
    }
  }

  async cargoBuySystem(tradeItem: number, max: boolean, amount?: number): Promise<void> {
    await this.cargoBuy(tradeItem, max, CargoBuyOp.BuySystem, amount);
  }

  async cargoBuyTrader(tradeItem: number): Promise<void> {
    await this.cargoBuy(tradeItem, false, CargoBuyOp.BuyTrader);
  }

  async cargoPlunder(tradeItem: number, max: boolean): Promise<void> {
    await this.cargoBuy(tradeItem, max, CargoBuyOp.Plunder);
  }

  async cargoDump(tradeItem: number, amount?: number): Promise<void> {
    await this.cargoSell(tradeItem, false, CargoSellOp.Dump, amount);
  }

  async cargoJettison(tradeItem: number, all: boolean): Promise<void> {
    await this.cargoSell(tradeItem, all, CargoSellOp.Jettison);
  }

  async cargoSellSystem(tradeItem: number, all: boolean, amount?: number): Promise<void> {
    await this.cargoSell(tradeItem, all, CargoSellOp.SellSystem, amount);
  }

  // PORT: `amount` is new; see cargoBuy.
  private async cargoSell(
    tradeItem: number,
    all: boolean,
    op: CargoSellOp,
    amount?: number,
  ): Promise<void> {
    const cmdr = this.commander;
    const qtyInHand = cmdr.ship.cargo[tradeItem]!;
    let unitPrice: number;
    switch (op) {
      case CargoSellOp.SellSystem:
        unitPrice = this.priceCargoSell[tradeItem]!;
        break;
      case CargoSellOp.SellTrader: {
        const item = Consts.TradeItems[tradeItem]!;
        const chance = item.illegal ? 45 : 10;
        const adj = getRandom(100) < chance ? (item.illegal ? 0.8 : 0.9) : 1.1;
        unitPrice = Math.min(
          item.maxTradePrice,
          Math.max(
            item.minTradePrice,
            toInt(roundHalfEven((this.priceCargoSell[tradeItem]! * adj) / item.roundOff)) *
              item.roundOff,
          ),
        );
        break;
      }
      default:
        unitPrice = 0;
        break;
    }

    if (qtyInHand === 0) await this.ui.alert(AlertType.CargoNoneToSell, Strings.CargoSellOps[op]!);
    else if (op === CargoSellOp.SellSystem && unitPrice <= 0)
      await this.ui.alert(AlertType.CargoNotInterested);
    else {
      if (
        op !== CargoSellOp.Jettison ||
        this.litterWarning ||
        cmdr.policeRecordScore <= Consts.PoliceRecordScoreDubious ||
        (await this.dumpWarning()) === DialogResult.Yes
      ) {
        let unitCost = 0;
        let maxAmount =
          op === CargoSellOp.SellTrader
            ? Math.min(qtyInHand, this.opponent.freeCargoBays)
            : qtyInHand;
        if (op === CargoSellOp.Dump) {
          unitCost = 5 * (this.difficulty + 1);
          maxAmount = Math.min(maxAmount, idiv(cmdr.cashToSpend, unitCost));
        }
        const price = unitPrice > 0 ? unitPrice : -unitCost;

        let qty = 0;
        if (all) qty = maxAmount;
        else
          qty = Math.max(
            0,
            Math.min(
              maxAmount,
              amount ??
                (await this.ui.cargoQuantity({
                  kind: 'sell',
                  op,
                  tradeItem,
                  max: maxAmount,
                  unitPrice: price,
                })),
            ),
          );

        if (qty > 0) {
          const totalPrice = qty * price;

          cmdr.ship.cargo[tradeItem]! -= qty;
          cmdr.priceCargo[tradeItem] = idiv(
            cmdr.priceCargo[tradeItem]! * (qtyInHand - qty),
            qtyInHand,
          );
          cmdr.cash += totalPrice;

          if (op === CargoSellOp.Jettison) {
            if (getRandom(10) < this.difficulty + 1) {
              if (cmdr.policeRecordScore > Consts.PoliceRecordScoreDubious)
                cmdr.policeRecordScore = Consts.PoliceRecordScoreDubious;
              else cmdr.policeRecordScore--;

              this.newsAddEvent(NewsEvent.CaughtLittering);
            }
          }
        }
      }
    }
  }

  /** The EncounterDumpWarning alert, which also records that the warning was given. */
  private async dumpWarning(): Promise<DialogResult> {
    // PORT: the original's FormAlert set Game.LitterWarning when showing this alert.
    this.litterWarning = true;
    return this.ui.alert(AlertType.EncounterDumpWarning);
  }

  async cargoSellTrader(tradeItem: number): Promise<void> {
    await this.cargoSell(tradeItem, false, CargoSellOp.SellTrader);
  }

  createFlea(): void {
    const cmdr = this.commander;
    cmdr.ship = new Ship(ShipType.Flea);
    cmdr.ship.crew[0] = cmdr;
    cmdr.insurance = false;
    cmdr.noClaim = 0;
  }

  private createShips(): void {
    const merc = (id: CrewMemberId) => this.mercenaries[id]!;

    this.dragonfly.crew[0] = merc(CrewMemberId.Dragonfly);
    this.dragonfly.addEquipment(Consts.Weapons[WeaponType.MilitaryLaser]!);
    this.dragonfly.addEquipment(Consts.Weapons[WeaponType.PulseLaser]!);
    this.dragonfly.addEquipment(Consts.Shields[ShieldType.Lightning]!);
    this.dragonfly.addEquipment(Consts.Shields[ShieldType.Lightning]!);
    this.dragonfly.addEquipment(Consts.Shields[ShieldType.Lightning]!);
    this.dragonfly.addEquipment(Consts.Gadgets[GadgetType.AutoRepairSystem]!);
    this.dragonfly.addEquipment(Consts.Gadgets[GadgetType.TargetingSystem]!);

    this.scarab.crew[0] = merc(CrewMemberId.Scarab);
    this.scarab.addEquipment(Consts.Weapons[WeaponType.MilitaryLaser]!);
    this.scarab.addEquipment(Consts.Weapons[WeaponType.MilitaryLaser]!);

    this.scorpion.crew[0] = merc(CrewMemberId.Scorpion);
    this.scorpion.addEquipment(Consts.Weapons[WeaponType.MilitaryLaser]!);
    this.scorpion.addEquipment(Consts.Weapons[WeaponType.MilitaryLaser]!);
    this.scorpion.addEquipment(Consts.Shields[ShieldType.Reflective]!);
    this.scorpion.addEquipment(Consts.Shields[ShieldType.Reflective]!);
    this.scorpion.addEquipment(Consts.Gadgets[GadgetType.AutoRepairSystem]!);
    this.scorpion.addEquipment(Consts.Gadgets[GadgetType.TargetingSystem]!);

    this.spaceMonster.crew[0] = merc(CrewMemberId.SpaceMonster);
    this.spaceMonster.addEquipment(Consts.Weapons[WeaponType.MilitaryLaser]!);
    this.spaceMonster.addEquipment(Consts.Weapons[WeaponType.MilitaryLaser]!);
    this.spaceMonster.addEquipment(Consts.Weapons[WeaponType.MilitaryLaser]!);
  }

  private determineEncounter(): boolean {
    // If there is a specific encounter that needs to happen, it will, otherwise we'll generate a random encounter.
    return this.determineNonRandomEncounter() || this.determineRandomEncounter();
  }

  private determineNonRandomEncounter(): boolean {
    let showEncounter = false;
    const cloaked = this.commander.ship.cloaked;
    const warpSystem = this.warpSystem!;

    // Encounter with space monster
    if (
      this.clicks === 1 &&
      warpSystem.id === StarSystemId.Acamar &&
      this.questStatusSpaceMonster === SpecialEvent.StatusSpaceMonsterAtAcamar
    ) {
      this.opponent = this.spaceMonster;
      this.encounterType = cloaked
        ? EncounterType.SpaceMonsterIgnore
        : EncounterType.SpaceMonsterAttack;
      showEncounter = true;
    }
    // Encounter with the stolen Scarab
    else if (
      this.arrivedViaWormhole &&
      this.clicks === 20 &&
      warpSystem.specialEventType !== SpecialEventType.NA &&
      warpSystem.specialEvent!.type === SpecialEventType.ScarabDestroyed &&
      this.questStatusScarab === SpecialEvent.StatusScarabHunting
    ) {
      this.opponent = this.scarab;
      this.encounterType = cloaked ? EncounterType.ScarabIgnore : EncounterType.ScarabAttack;
      showEncounter = true;
    }
    // Encounter with stolen Dragonfly
    else if (
      this.clicks === 1 &&
      warpSystem.id === StarSystemId.Zalkon &&
      this.questStatusDragonfly === SpecialEvent.StatusDragonflyFlyZalkon
    ) {
      this.opponent = this.dragonfly;
      this.encounterType = cloaked ? EncounterType.DragonflyIgnore : EncounterType.DragonflyAttack;
      showEncounter = true;
    }
    // Encounter with kidnappers in the Scorpion
    else if (
      this.clicks === 1 &&
      warpSystem.id === StarSystemId.Qonos &&
      this.questStatusPrincess === SpecialEvent.StatusPrincessFlyQonos
    ) {
      this.opponent = this.scorpion;
      this.encounterType = cloaked ? EncounterType.ScorpionIgnore : EncounterType.ScorpionAttack;
      showEncounter = true;
    }
    // ah, just when you thought you were gonna get away with it...
    else if (this.clicks === 1 && this.justLootedMarie) {
      this.generateOpponent(OpponentType.Police);
      this.encounterType = EncounterType.MarieCelestePolice;
      this.justLootedMarie = false;

      showEncounter = true;
    }

    return showEncounter;
  }

  private determinePirateEncounter(mantis: boolean): boolean {
    let showEncounter = false;
    const cmdr = this.commander;

    if (mantis) {
      this.generateOpponent(OpponentType.Mantis);
      this.encounterType = EncounterType.PirateAttack;
    } else {
      this.generateOpponent(OpponentType.Pirate);

      // If you have a cloak, they don't see you
      if (cmdr.ship.cloaked) this.encounterType = EncounterType.PirateIgnore;
      // Pirates will mostly attack, but they are cowardly: if your rep is too high, they tend to flee
      // if Pirates are in a better ship, they won't flee, even if you have a very scary
      // reputation.
      else if (
        this.opponent.type > cmdr.ship.type ||
        this.opponent.type >= ShipType.Grasshopper ||
        getRandom(Consts.ReputationScoreElite) >
          idiv(cmdr.reputationScore * 4, 1 + this.opponent.type)
      )
        this.encounterType = EncounterType.PirateAttack;
      else this.encounterType = EncounterType.PirateFlee;
    }

    // If they ignore you or flee and you can't see them, the encounter doesn't take place
    // If you automatically don't want to confront someone who ignores you, the
    // encounter may not take place
    if (
      this.encounterType === EncounterType.PirateAttack ||
      !(this.opponent.cloaked || this.options.alwaysIgnorePirates)
    )
      showEncounter = true;

    return showEncounter;
  }

  private determinePoliceEncounter(): boolean {
    let showEncounter = false;
    const cmdr = this.commander;

    this.generateOpponent(OpponentType.Police);

    // If you are cloaked, they don't see you
    this.encounterType = EncounterType.PoliceIgnore;
    if (!cmdr.ship.cloaked) {
      if (cmdr.policeRecordScore < Consts.PoliceRecordScoreDubious) {
        // If you're a criminal, the police will tend to attack
        // JAF - fixed this; there was code that didn't do anything.
        // if you're suddenly stuck in a lousy ship, Police won't flee even if you
        // have a fearsome reputation.
        if (
          (this.opponent.weaponStrength() > 0 &&
            (cmdr.reputationScore < Consts.ReputationScoreAverage ||
              getRandom(Consts.ReputationScoreElite) >
                idiv(cmdr.reputationScore, 1 + this.opponent.type))) ||
          this.opponent.type > cmdr.ship.type
        ) {
          if (cmdr.policeRecordScore >= Consts.PoliceRecordScoreCriminal)
            this.encounterType = EncounterType.PoliceSurrender;
          else this.encounterType = EncounterType.PoliceAttack;
        } else if (this.opponent.cloaked) this.encounterType = EncounterType.PoliceIgnore;
        else this.encounterType = EncounterType.PoliceFlee;
      } else if (
        !this.inspected &&
        (cmdr.policeRecordScore < Consts.PoliceRecordScoreClean ||
          (cmdr.policeRecordScore < Consts.PoliceRecordScoreLawful &&
            getRandom(12 - this.difficulty) < 1) ||
          (cmdr.policeRecordScore >= Consts.PoliceRecordScoreLawful && getRandom(40) === 0))
      ) {
        // If you're reputation is dubious, the police will inspect you
        // If your record is clean, the police will inspect you with a chance of 10% on Normal
        // If your record indicates you are a lawful trader, the chance on inspection drops to 2.5%
        this.encounterType = EncounterType.PoliceInspect;
        this.inspected = true;
      }
    }

    // If they ignore you or flee and you can't see them, the encounter doesn't take place
    // If you automatically don't want to confront someone who ignores you, the
    // encounter may not take place.  Otherwise it will - JAF
    if (
      this.encounterType === EncounterType.PoliceAttack ||
      this.encounterType === EncounterType.PoliceInspect ||
      !(this.opponent.cloaked || this.options.alwaysIgnorePolice)
    )
      showEncounter = true;

    return showEncounter;
  }

  private determineRandomEncounter(): boolean {
    let showEncounter = false;
    let mantis = false;
    let pirate = false;
    let police = false;
    let trader = false;
    const cmdr = this.commander;
    const warpSystem = this.warpSystem!;

    if (
      warpSystem.id === StarSystemId.Gemulon &&
      this.questStatusGemulon === SpecialEvent.StatusGemulonTooLate
    ) {
      if (getRandom(10) > 4) mantis = true;
    } else {
      // Check if it is time for an encounter
      let encounter = getRandom(44 - 2 * this.difficulty);
      const policeModifier = Math.max(
        1,
        3 - PoliceRecord.getPoliceRecordFromScore(cmdr.policeRecordScore).type,
      );

      // encounters are half as likely if you're in a flea.
      if (cmdr.ship.type === ShipType.Flea) encounter *= 2;

      const polSys = warpSystem.politicalSystem;
      if (encounter < polSys.activityPirates)
        // When you are already raided, other pirates have little to gain
        pirate = !this.raided;
      else if (encounter < polSys.activityPirates + polSys.activityPolice * policeModifier)
        // policeModifier adapts itself to your criminal record: you'll
        // encounter more police if you are a hardened criminal.
        police = true;
      else if (
        encounter <
        polSys.activityPirates + polSys.activityPolice * policeModifier + polSys.activityTraders
      )
        trader = true;
      else if (cmdr.ship.wildOnBoard && warpSystem.id === StarSystemId.Kravat)
        // if you're coming in to Kravat & you have Wild onboard, there'll be swarms o' cops.
        police = getRandom(100) < idiv(100, Math.max(2, Math.min(4, 5 - this.difficulty)));
      else if (cmdr.ship.artifactOnBoard && getRandom(20) <= 3) mantis = true;
    }

    if (police) showEncounter = this.determinePoliceEncounter();
    else if (pirate || mantis) showEncounter = this.determinePirateEncounter(mantis);
    else if (trader) showEncounter = this.determineTraderEncounter();
    else if (
      cmdr.days > 10 &&
      getRandom(1000) < this.chanceOfVeryRareEncounter &&
      this.veryRareEncounters.length > 0
    )
      showEncounter = this.determineVeryRareEncounter();

    return showEncounter;
  }

  private determineTraderEncounter(): boolean {
    let showEncounter = false;
    const cmdr = this.commander;

    this.generateOpponent(OpponentType.Trader);

    // If you are cloaked, they don't see you
    this.encounterType = EncounterType.TraderIgnore;
    if (!cmdr.ship.cloaked) {
      // If you're a criminal, traders tend to flee if you've got at least some reputation
      if (
        !cmdr.ship.cloaked &&
        cmdr.policeRecordScore <= Consts.PoliceRecordScoreCriminal &&
        getRandom(Consts.ReputationScoreElite) <=
          idiv(cmdr.reputationScore * 10, 1 + this.opponent.type)
      )
        this.encounterType = EncounterType.TraderFlee;
      // Will there be trade in orbit?
      else if (getRandom(1000) < this.chanceOfTradeInOrbit) {
        if (cmdr.ship.freeCargoBays > 0 && this.opponent.hasTradeableItems())
          this.encounterType = EncounterType.TraderSell;
        // we fudge on whether the trader has capacity to carry the stuff he's buying.
        else if (cmdr.ship.hasTradeableItems()) this.encounterType = EncounterType.TraderBuy;
      }
    }

    // If they ignore you or flee and you can't see them, the encounter doesn't take place
    // If you automatically don't want to confront someone who ignores you, the
    // encounter may not take place; otherwise it will.
    if (
      !this.opponent.cloaked &&
      !(
        this.options.alwaysIgnoreTraders &&
        (this.encounterType === EncounterType.TraderIgnore ||
          this.encounterType === EncounterType.TraderFlee)
      ) &&
      !(
        (this.encounterType === EncounterType.TraderBuy ||
          this.encounterType === EncounterType.TraderSell) &&
        this.options.alwaysIgnoreTradeInOrbit
      )
    )
      showEncounter = true;

    return showEncounter;
  }

  private determineVeryRareEncounter(): boolean {
    let showEncounter = false;
    const cmdr = this.commander;
    const remove = (encounter: VeryRareEncounter) => {
      const index = this.veryRareEncounters.indexOf(encounter);
      if (index >= 0) this.veryRareEncounters.splice(index, 1);
    };

    // Very Rare Random Events:
    // 1. Encounter the abandoned Marie Celeste, which you may loot.
    // 2. Captain Ahab will trade your Reflective Shield for skill points in Piloting.
    // 3. Captain Conrad will trade your Military Laser for skill points in Engineering.
    // 4. Captain Huie will trade your Military Laser for points in Trading.
    // 5. Encounter an out-of-date bottle of Captain Marmoset's Skill Tonic. This
    //    will affect skills depending on game difficulty level.
    // 6. Encounter a good bottle of Captain Marmoset's Skill Tonic, which will invoke
    //    IncreaseRandomSkill one or two times, depending on game difficulty.
    switch (this.veryRareEncounters[getRandom(this.veryRareEncounters.length)]) {
      case VeryRareEncounter.MarieCeleste:
        // Marie Celeste cannot be at Acamar, Qonos, or Zalkon as it may cause problems with the
        // Space Monster, Scorpion, or Dragonfly
        if (
          this.clicks > 1 &&
          cmdr.currentSystemId !== StarSystemId.Acamar &&
          cmdr.currentSystemId !== StarSystemId.Zalkon &&
          cmdr.currentSystemId !== StarSystemId.Qonos
        ) {
          remove(VeryRareEncounter.MarieCeleste);
          this.encounterType = EncounterType.MarieCeleste;
          this.generateOpponent(OpponentType.Trader);
          for (let i = 0; i < this.opponent.cargo.length; i++) this.opponent.cargo[i] = 0;
          this.opponent.cargo[TradeItemType.Narcotics] = Math.min(this.opponent.cargoBays, 5);

          showEncounter = true;
        }
        break;
      case VeryRareEncounter.CaptainAhab:
        if (
          cmdr.ship.hasShield(ShieldType.Reflective) &&
          cmdr.pilot < 10 &&
          cmdr.policeRecordScore > Consts.PoliceRecordScoreCriminal
        ) {
          remove(VeryRareEncounter.CaptainAhab);
          this.encounterType = EncounterType.CaptainAhab;
          this.generateOpponent(OpponentType.FamousCaptain);

          showEncounter = true;
        }
        break;
      case VeryRareEncounter.CaptainConrad:
        if (
          cmdr.ship.hasWeapon(WeaponType.MilitaryLaser, true) &&
          cmdr.engineer < 10 &&
          cmdr.policeRecordScore > Consts.PoliceRecordScoreCriminal
        ) {
          remove(VeryRareEncounter.CaptainConrad);
          this.encounterType = EncounterType.CaptainConrad;
          this.generateOpponent(OpponentType.FamousCaptain);

          showEncounter = true;
        }
        break;
      case VeryRareEncounter.CaptainHuie:
        if (
          cmdr.ship.hasWeapon(WeaponType.MilitaryLaser, true) &&
          cmdr.trader < 10 &&
          cmdr.policeRecordScore > Consts.PoliceRecordScoreCriminal
        ) {
          remove(VeryRareEncounter.CaptainHuie);
          this.encounterType = EncounterType.CaptainHuie;
          this.generateOpponent(OpponentType.FamousCaptain);

          showEncounter = true;
        }
        break;
      case VeryRareEncounter.BottleOld:
        remove(VeryRareEncounter.BottleOld);
        this.encounterType = EncounterType.BottleOld;
        this.generateOpponent(OpponentType.Bottle);

        showEncounter = true;
        break;
      case VeryRareEncounter.BottleGood:
        remove(VeryRareEncounter.BottleGood);
        this.encounterType = EncounterType.BottleGood;
        this.generateOpponent(OpponentType.Bottle);

        showEncounter = true;
        break;
    }

    return showEncounter;
  }

  encounterBegin(): void {
    // Set up the encounter variables.
    this.encounterContinueFleeing = this.encounterContinueAttacking = this.opponentDisabled = false;
  }

  private encounterDefeatDragonfly(): void {
    this.commander.killsPirate++;
    this.commander.policeRecordScore += Consts.ScoreKillPirate;
    this.questStatusDragonfly = SpecialEvent.StatusDragonflyDestroyed;
  }

  private encounterDefeatScarab(): void {
    this.commander.killsPirate++;
    this.commander.policeRecordScore += Consts.ScoreKillPirate;
    this.questStatusScarab = SpecialEvent.StatusScarabDestroyed;
  }

  private encounterDefeatScorpion(): void {
    this.commander.killsPirate++;
    this.commander.policeRecordScore += Consts.ScoreKillPirate;
    this.questStatusPrincess = SpecialEvent.StatusPrincessRescued;
  }

  async encounterDrink(): Promise<void> {
    const cmdr = this.commander;
    if ((await this.ui.alert(AlertType.EncounterDrinkContents)) === DialogResult.Yes) {
      if (this.encounterType === EncounterType.BottleGood) {
        // two points if you're on beginner-normal, one otherwise
        cmdr.increaseRandomSkill();
        if (this.difficulty <= Difficulty.Normal) cmdr.increaseRandomSkill();
        await this.ui.alert(AlertType.EncounterTonicConsumedGood);
      } else {
        cmdr.tonicTweakRandomSkill();
        await this.ui.alert(AlertType.EncounterTonicConsumedStrange);
      }
    }
  }

  async encounterExecuteAction(): Promise<EncounterResult> {
    let result = EncounterResult.Continue;
    const cmdr = this.commander;
    const prevCmdrHull = cmdr.ship.hull;
    const prevOppHull = this.opponent.hull;

    this.encounterCmdrHit = false;
    this.encounterOppHit = false;
    this.encounterOppFleeingPrev = this.encounterOppFleeing;
    this.encounterOppFleeing = false;

    // Fire shots
    switch (this.encounterType) {
      case EncounterType.DragonflyAttack:
      case EncounterType.FamousCaptainAttack:
      case EncounterType.MarieCelestePolice:
      case EncounterType.PirateAttack:
      case EncounterType.PoliceAttack:
      case EncounterType.ScarabAttack:
      case EncounterType.ScorpionAttack:
      case EncounterType.SpaceMonsterAttack:
      case EncounterType.TraderAttack:
        this.encounterCmdrHit = this.encounterExecuteAttack(
          this.opponent,
          cmdr.ship,
          this.encounterCmdrFleeing,
        );
        this.encounterOppHit =
          !this.encounterCmdrFleeing &&
          this.encounterExecuteAttack(cmdr.ship, this.opponent, false);
        break;
      case EncounterType.PirateFlee:
      case EncounterType.PirateSurrender:
      case EncounterType.PoliceFlee:
      case EncounterType.TraderFlee:
      case EncounterType.TraderSurrender:
        this.encounterOppHit =
          !this.encounterCmdrFleeing && this.encounterExecuteAttack(cmdr.ship, this.opponent, true);
        this.encounterOppFleeing = true;
        break;
      default:
        this.encounterOppHit =
          !this.encounterCmdrFleeing &&
          this.encounterExecuteAttack(cmdr.ship, this.opponent, false);
        break;
    }

    // Determine whether someone gets destroyed
    if (cmdr.ship.hull <= 0) {
      if (cmdr.ship.escapePod) result = EncounterResult.EscapePod;
      else {
        await this.ui.alert(
          this.opponent.hull <= 0 ? AlertType.EncounterBothDestroyed : AlertType.EncounterYouLose,
        );

        result = EncounterResult.Killed;
      }
    } else if (this.opponentDisabled) {
      if (
        this.opponent.type === ShipType.Dragonfly ||
        this.opponent.type === ShipType.Scarab ||
        this.opponent.type === ShipType.Scorpion
      ) {
        let str2 = '';

        switch (this.opponent.type) {
          case ShipType.Dragonfly:
            this.encounterDefeatDragonfly();
            break;
          case ShipType.Scarab:
            this.encounterDefeatScarab();
            break;
          case ShipType.Scorpion:
            str2 = Strings.EncounterPrincessRescued;
            this.encounterDefeatScorpion();
            break;
        }

        await this.ui.alert(AlertType.EncounterDisabledOpponent, this.encounterShipText, str2);

        cmdr.reputationScore += idiv(this.opponent.type, 2) + 1;
        result = EncounterResult.Normal;
      } else {
        this.encounterUpdateEncounterType(prevCmdrHull, prevOppHull);
        this.encounterOppFleeing = false;
      }
    } else if (this.opponent.hull <= 0) {
      await this.encounterWon();

      result = EncounterResult.Normal;
    } else {
      let escaped = false;

      // Determine whether someone gets away.
      if (
        this.encounterCmdrFleeing &&
        (this.difficulty === Difficulty.Beginner ||
          (getRandom(7) + idiv(cmdr.ship.pilot, 3)) * 2 >=
            getRandom(this.opponent.pilot) * (2 + this.difficulty))
      ) {
        await this.ui.alert(
          this.encounterCmdrHit ? AlertType.EncounterEscapedHit : AlertType.EncounterEscaped,
        );
        escaped = true;
      } else if (
        this.encounterOppFleeing &&
        getRandom(cmdr.ship.pilot) * 4 <= getRandom(7 + idiv(this.opponent.pilot, 3)) * 2
      ) {
        await this.ui.alert(AlertType.EncounterOpponentEscaped);
        escaped = true;
      }

      if (escaped) result = EncounterResult.Normal;
      else {
        // Determine whether the opponent's actions must be changed
        const prevEncounter = this.encounterType;

        this.encounterUpdateEncounterType(prevCmdrHull, prevOppHull);

        // Update the opponent fleeing flag.
        switch (this.encounterType) {
          case EncounterType.PirateFlee:
          case EncounterType.PirateSurrender:
          case EncounterType.PoliceFlee:
          case EncounterType.TraderFlee:
          case EncounterType.TraderSurrender:
            this.encounterOppFleeing = true;
            break;
          default:
            this.encounterOppFleeing = false;
            break;
        }

        if (
          this.options.continuousAttack &&
          (this.encounterCmdrFleeing ||
            !this.encounterOppFleeing ||
            (this.options.continuousAttackFleeing &&
              (this.encounterType === prevEncounter ||
                (this.encounterType !== EncounterType.PirateSurrender &&
                  this.encounterType !== EncounterType.TraderSurrender))))
        ) {
          if (this.encounterCmdrFleeing) this.encounterContinueFleeing = true;
          else this.encounterContinueAttacking = true;
        }
      }
    }

    return result;
  }

  private encounterExecuteAttack(attacker: Ship, defender: Ship, fleeing: boolean): boolean {
    let hit = false;

    // On beginner level, if you flee, you will escape unharmed.
    // Otherwise, Fighterskill attacker is pitted against pilotskill defender; if defender
    // is fleeing the attacker has a free shot, but the chance to hit is smaller
    // JAF - if the opponent is disabled and attacker has targeting system, they WILL be hit.
    if (
      !(this.difficulty === Difficulty.Beginner && defender.commandersShip && fleeing) &&
      ((attacker.commandersShip &&
        this.opponentDisabled &&
        attacker.hasGadget(GadgetType.TargetingSystem)) ||
        getRandom(attacker.fighter + defender.size) >=
          (fleeing ? 2 : 1) * getRandom(5 + idiv(defender.pilot, 2)))
    ) {
      // If the defender is disabled, it only takes one shot to destroy it completely.
      if (attacker.commandersShip && this.opponentDisabled) defender.hull = 0;
      else {
        let attackerLasers = attacker.weaponStrength(
          WeaponType.PulseLaser,
          WeaponType.MorgansLaser,
        );
        let attackerDisruptors = attacker.weaponStrength(
          WeaponType.PhotonDisruptor,
          WeaponType.QuantumDistruptor,
        );

        if (defender.type === ShipType.Scarab) {
          attackerLasers -= attacker.weaponStrength(WeaponType.BeamLaser, WeaponType.MilitaryLaser);
          attackerDisruptors -= attacker.weaponStrength(
            WeaponType.PhotonDisruptor,
            WeaponType.PhotonDisruptor,
          );
        }

        const attackerWeapons = attackerLasers + attackerDisruptors;

        let disrupt = 0;

        // Attempt to disable the opponent if they're not already disabled, their shields are down,
        // we have disabling weapons, and the option is checked.
        if (
          defender.disableable &&
          defender.shieldCharge === 0 &&
          !this.opponentDisabled &&
          this.options.disableOpponents &&
          attackerDisruptors > 0
        ) {
          disrupt = getRandom(idiv(attackerDisruptors * (100 + 2 * attacker.fighter), 100));
        } else {
          let damage =
            attackerWeapons === 0
              ? 0
              : getRandom(idiv(attackerWeapons * (100 + 2 * attacker.fighter), 100));

          if (damage > 0) {
            hit = true;

            // Reactor on board -- damage is boosted!
            if (defender.reactorOnBoard)
              damage *= toInt(
                1 + (this.difficulty + 1) * (this.difficulty < Difficulty.Normal ? 0.25 : 0.33),
              );

            // First, shields are depleted
            for (
              let i = 0;
              i < defender.shields.length && defender.shields[i] !== null && damage > 0;
              i++
            ) {
              const shield = defender.shields[i]!;
              const applied = Math.min(shield.charge, damage);
              shield.charge -= applied;
              damage -= applied;
            }

            // If there still is damage after the shields have been depleted,
            // this is subtracted from the hull, modified by the engineering skill
            // of the defender.
            // JAF - If the player only has disabling weapons, no damage will be done to the hull.
            if (damage > 0) {
              damage = Math.max(1, damage - getRandom(defender.engineer));

              disrupt = idiv(damage * attackerDisruptors, attackerWeapons);

              // Only that damage coming from Lasers will deplete the hull.
              damage -= disrupt;

              // At least 2 shots on Normal level are needed to destroy the hull
              // (3 on Easy, 4 on Beginner, 1 on Hard or Impossible). For opponents,
              // it is always 2.
              damage = Math.min(
                damage,
                idiv(
                  defender.hullStrength,
                  defender.commandersShip
                    ? Math.max(1, Difficulty.Impossible - this.difficulty)
                    : 2,
                ),
              );

              // If the hull is hardened, damage is halved.
              if (this.questStatusScarab === SpecialEvent.StatusScarabDone)
                damage = idiv(damage, 2);

              defender.hull = Math.max(0, defender.hull - damage);
            }
          }
        }

        // Did the opponent get disabled? (Disruptors are 3 times more effective against the ship's
        // systems than they are against the shields).
        if (
          defender.hull > 0 &&
          defender.disableable &&
          getRandom(100) < idiv(disrupt * Consts.DisruptorSystemsMultiplier * 100, defender.hull)
        )
          this.opponentDisabled = true;

        // Make sure the Scorpion doesn't get destroyed.
        if (defender.type === ShipType.Scorpion && defender.hull === 0) {
          defender.hull = 1;
          this.opponentDisabled = true;
        }
      }
    }

    return hit;
  }

  async encounterMeet(): Promise<void> {
    const cmdr = this.commander;
    let initialAlert = AlertType.Alert;
    let skill: number = 0;
    let equipType = EquipmentType.Gadget;
    let equipSubType = 0;

    switch (this.encounterType) {
      case EncounterType.CaptainAhab:
        // Trade a reflective shield for skill points in piloting?
        initialAlert = AlertType.MeetCaptainAhab;
        equipType = EquipmentType.Shield;
        equipSubType = ShieldType.Reflective;
        skill = SkillType.Pilot;

        break;
      case EncounterType.CaptainConrad:
        // Trade a military laser for skill points in engineering?
        initialAlert = AlertType.MeetCaptainConrad;
        equipType = EquipmentType.Weapon;
        equipSubType = WeaponType.MilitaryLaser;
        skill = SkillType.Engineer;

        break;
      case EncounterType.CaptainHuie:
        // Trade a military laser for skill points in trading?
        initialAlert = AlertType.MeetCaptainHuie;
        equipType = EquipmentType.Weapon;
        equipSubType = WeaponType.MilitaryLaser;
        skill = SkillType.Trader;

        break;
    }

    if ((await this.ui.alert(initialAlert)) === DialogResult.Yes) {
      // Remove the equipment we're trading.
      cmdr.ship.removeEquipmentBySubType(equipType, equipSubType);

      // Add points to the appropriate skill - two points if beginner-normal, one otherwise.
      cmdr.skills[skill] = Math.min(
        Consts.MaxSkill,
        cmdr.skills[skill]! + (this.difficulty <= Difficulty.Normal ? 2 : 1),
      );

      await this.ui.alert(AlertType.SpecialTrainingCompleted);
    }
  }

  async encounterPlunder(): Promise<void> {
    const cmdr = this.commander;

    await this.ui.plunder();

    if (this.encounterType >= EncounterType.TraderAttack) {
      cmdr.policeRecordScore += Consts.ScorePlunderTrader;

      if (this.opponentDisabled) cmdr.killsTrader++;
    } else if (this.opponentDisabled) {
      if (cmdr.policeRecordScore >= Consts.PoliceRecordScoreDubious) {
        await this.ui.alert(
          AlertType.EncounterPiratesBounty,
          Strings.EncounterPiratesDisabled,
          Strings.EncounterPiratesLocation,
          multiples(this.opponent.bounty(), Strings.MoneyUnit),
        );

        cmdr.cash += this.opponent.bounty();
      }

      cmdr.killsPirate++;
      cmdr.policeRecordScore += Consts.ScoreKillPirate;
    } else cmdr.policeRecordScore += Consts.ScorePlunderPirate;

    cmdr.reputationScore += idiv(this.opponent.type, 2) + 1;
  }

  private async encounterScoop(): Promise<void> {
    const cmdr = this.commander;

    // Chance 50% to pick something up on Normal level, 33% on Hard level, 25% on
    // Impossible level, and 100% on Easy or Beginner.
    if (
      (this.difficulty < Difficulty.Normal || getRandom(this.difficulty) === 0) &&
      this.opponent.filledCargoBays > 0
    ) {
      // Changed this to actually pick a good that was in the opponent's cargo hold - JAF.
      const index = getRandom(this.opponent.filledCargoBays);
      let tradeItem = -1;
      for (let sum = 0; sum <= index; sum += this.opponent.cargo[++tradeItem]!);

      if (
        (await this.ui.alert(AlertType.EncounterScoop, Consts.TradeItems[tradeItem]!.name)) ===
        DialogResult.Yes
      ) {
        let jettisoned = false;

        if (
          cmdr.ship.freeCargoBays === 0 &&
          (await this.ui.alert(AlertType.EncounterScoopNoRoom)) === DialogResult.Yes
        ) {
          await this.ui.jettison();
          jettisoned = true;
        }

        if (cmdr.ship.freeCargoBays > 0) cmdr.ship.cargo[tradeItem]!++;
        else if (jettisoned) await this.ui.alert(AlertType.EncounterScoopNoScoop);
      }
    }
  }

  async encounterTrade(): Promise<void> {
    const cmdr = this.commander;
    const buy = this.encounterType === EncounterType.TraderBuy;
    const item = (buy ? cmdr.ship : this.opponent).getRandomTradeableItem();
    const alertStr = buy ? Strings.CargoSelling : Strings.CargoBuying;

    const cash = cmdr.cash;

    if (this.encounterType === EncounterType.TraderBuy) await this.cargoSellTrader(item);
    // EncounterType.TraderSell
    else await this.cargoBuyTrader(item);

    if (cmdr.cash !== cash)
      await this.ui.alert(
        AlertType.EncounterTradeCompleted,
        alertStr,
        Consts.TradeItems[item]!.name,
      );
  }

  private encounterUpdateEncounterType(prevCmdrHull: number, prevOppHull: number): void {
    const cmdrHull = this.commander.ship.hull;
    const chance = getRandom(100);

    if (this.opponent.hull < prevOppHull || this.opponentDisabled) {
      switch (this.encounterType) {
        case EncounterType.FamousCaptainAttack:
          if (this.opponentDisabled) this.encounterType = EncounterType.FamousCaptDisabled;
          break;
        case EncounterType.PirateAttack:
        case EncounterType.PirateFlee:
        case EncounterType.PirateSurrender:
          if (this.opponentDisabled) this.encounterType = EncounterType.PirateDisabled;
          else if (this.opponent.hull < idiv(prevOppHull * 2, 3)) {
            if (cmdrHull < idiv(prevCmdrHull * 2, 3)) {
              if (chance < 60) this.encounterType = EncounterType.PirateFlee;
            } else {
              if (chance < 10 && this.opponent.type !== ShipType.Mantis)
                this.encounterType = EncounterType.PirateSurrender;
              else this.encounterType = EncounterType.PirateFlee;
            }
          }
          break;
        case EncounterType.PoliceAttack:
        case EncounterType.PoliceFlee:
          if (this.opponentDisabled) this.encounterType = EncounterType.PoliceDisabled;
          else if (
            this.opponent.hull < idiv(prevOppHull, 2) &&
            (cmdrHull >= idiv(prevCmdrHull, 2) || chance < 40)
          )
            this.encounterType = EncounterType.PoliceFlee;
          break;
        case EncounterType.TraderAttack:
        case EncounterType.TraderFlee:
        case EncounterType.TraderSurrender:
          if (this.opponentDisabled) this.encounterType = EncounterType.TraderDisabled;
          else if (this.opponent.hull < idiv(prevOppHull * 2, 3)) {
            if (chance < 60) this.encounterType = EncounterType.TraderSurrender;
            else this.encounterType = EncounterType.TraderFlee;
          }
          // If you get damaged a lot, the trader tends to keep shooting; if
          // you get damaged a little, the trader may keep shooting; if you
          // get damaged very little or not at all, the trader will flee.
          else if (
            this.opponent.hull < idiv(prevOppHull * 9, 10) &&
            ((cmdrHull < idiv(prevCmdrHull * 2, 3) && chance < 20) ||
              (cmdrHull < idiv(prevCmdrHull * 9, 10) && chance < 60) ||
              cmdrHull >= idiv(prevCmdrHull * 9, 10))
          )
            this.encounterType = EncounterType.TraderFlee;
          break;
        default:
          break;
      }
    }
  }

  async encounterVerifyAttack(): Promise<boolean> {
    const cmdr = this.commander;
    let attack = true;

    if (cmdr.ship.weaponStrength() === 0) {
      await this.ui.alert(AlertType.EncounterAttackNoWeapons);
      attack = false;
    } else if (
      !this.opponent.disableable &&
      cmdr.ship.weaponStrength(WeaponType.PulseLaser, WeaponType.MorgansLaser) === 0
    ) {
      await this.ui.alert(AlertType.EncounterAttackNoLasers);
      attack = false;
    } else if (
      this.opponent.type === ShipType.Scorpion &&
      cmdr.ship.weaponStrength(WeaponType.PhotonDisruptor, WeaponType.QuantumDistruptor) === 0
    ) {
      await this.ui.alert(AlertType.EncounterAttackNoDisruptors);
      attack = false;
    } else {
      // The C# switch uses `goto case` to fall through from PoliceInspect to
      // PoliceIgnore and from the trader cases to TraderAttack; `type` stands in
      // for the case being run.
      let type: EncounterType | null = this.encounterType;
      while (type !== null) {
        const current: EncounterType = type;
        type = null;
        switch (current) {
          case EncounterType.DragonflyIgnore:
          case EncounterType.PirateIgnore:
          case EncounterType.ScarabIgnore:
          case EncounterType.ScorpionIgnore:
          case EncounterType.SpaceMonsterIgnore:
            this.encounterType = this.encounterType - 1;

            break;
          case EncounterType.PoliceInspect:
            if (
              !cmdr.ship.detectableIllegalCargoOrPassengers &&
              (await this.ui.alert(AlertType.EncounterPoliceNothingIllegal)) !== DialogResult.Yes
            )
              attack = false;

            // Fall through...
            if (attack) type = EncounterType.PoliceIgnore;

            break;
          case EncounterType.MarieCelestePolice:
          case EncounterType.PoliceFlee:
          case EncounterType.PoliceIgnore:
          case EncounterType.PoliceSurrender:
            if (
              cmdr.policeRecordScore <= Consts.PoliceRecordScoreCriminal ||
              (await this.ui.alert(AlertType.EncounterAttackPolice)) === DialogResult.Yes
            ) {
              if (cmdr.policeRecordScore > Consts.PoliceRecordScoreCriminal)
                cmdr.policeRecordScore = Consts.PoliceRecordScoreCriminal;

              cmdr.policeRecordScore += Consts.ScoreAttackPolice;

              if (this.encounterType !== EncounterType.PoliceFlee)
                this.encounterType = EncounterType.PoliceAttack;
            } else attack = false;

            break;
          case EncounterType.TraderBuy:
          case EncounterType.TraderIgnore:
          case EncounterType.TraderSell:
            if (cmdr.policeRecordScore < Consts.PoliceRecordScoreClean)
              cmdr.policeRecordScore += Consts.ScoreAttackTrader;
            else if ((await this.ui.alert(AlertType.EncounterAttackTrader)) === DialogResult.Yes)
              cmdr.policeRecordScore = Consts.PoliceRecordScoreDubious;
            else attack = false;

            // Fall through...
            if (attack) type = EncounterType.TraderAttack;

            break;
          case EncounterType.TraderAttack:
          case EncounterType.TraderSurrender:
            if (
              getRandom(Consts.ReputationScoreElite) <=
                idiv(cmdr.reputationScore * 10, this.opponent.type + 1) ||
              this.opponent.weaponStrength() === 0
            )
              this.encounterType = EncounterType.TraderFlee;
            else this.encounterType = EncounterType.TraderAttack;

            break;
          case EncounterType.CaptainAhab:
          case EncounterType.CaptainConrad:
          case EncounterType.CaptainHuie:
            if ((await this.ui.alert(AlertType.EncounterAttackCaptain)) === DialogResult.Yes) {
              if (cmdr.policeRecordScore > Consts.PoliceRecordScoreVillain)
                cmdr.policeRecordScore = Consts.PoliceRecordScoreVillain;

              cmdr.policeRecordScore += Consts.ScoreAttackTrader;

              switch (this.encounterType) {
                case EncounterType.CaptainAhab:
                  this.newsAddEvent(NewsEvent.CaptAhabAttacked);
                  break;
                case EncounterType.CaptainConrad:
                  this.newsAddEvent(NewsEvent.CaptConradAttacked);
                  break;
                case EncounterType.CaptainHuie:
                  this.newsAddEvent(NewsEvent.CaptHuieAttacked);
                  break;
              }

              this.encounterType = EncounterType.FamousCaptainAttack;
            } else attack = false;

            break;
        }
      }

      // Make sure the fleeing flag isn't set if we're attacking.
      if (attack) this.encounterCmdrFleeing = false;
    }

    return attack;
  }

  async encounterVerifyBoard(): Promise<boolean> {
    let board = false;

    if ((await this.ui.alert(AlertType.EncounterMarieCeleste)) === DialogResult.Yes) {
      board = true;

      const narcs = this.commander.ship.cargo[TradeItemType.Narcotics]!;

      await this.ui.plunder();

      if (this.commander.ship.cargo[TradeItemType.Narcotics]! > narcs) this.justLootedMarie = true;
    }

    return board;
  }

  async encounterVerifyBribe(): Promise<boolean> {
    const cmdr = this.commander;
    let bribed = false;

    if (this.encounterType === EncounterType.MarieCelestePolice)
      await this.ui.alert(AlertType.EncounterMarieCelesteNoBribe);
    else if (this.warpSystem!.politicalSystem.bribeLevel <= 0)
      await this.ui.alert(AlertType.EncounterPoliceBribeCant);
    else if (
      cmdr.ship.detectableIllegalCargoOrPassengers ||
      (await this.ui.alert(AlertType.EncounterPoliceNothingIllegal)) === DialogResult.Yes
    ) {
      // Bribe depends on how easy it is to bribe the police and commander's current worth
      const diffMod = 10 + 5 * (Difficulty.Impossible - this.difficulty);
      const passMod = cmdr.ship.illegalSpecialCargo
        ? this.difficulty <= Difficulty.Normal
          ? 2
          : 3
        : 1;

      const bribe = Math.max(
        100,
        Math.min(
          10000,
          Math.ceil(cmdr.worth / this.warpSystem!.politicalSystem.bribeLevel / diffMod / 100) *
            100 *
            passMod,
        ),
      );

      if (
        (await this.ui.alert(
          AlertType.EncounterPoliceBribe,
          multiples(bribe, Strings.MoneyUnit),
        )) === DialogResult.Yes
      ) {
        if (cmdr.cash >= bribe) {
          cmdr.cash -= bribe;
          bribed = true;
        } else await this.ui.alert(AlertType.EncounterPoliceBribeLowCash);
      }
    }

    return bribed;
  }

  async encounterVerifyFlee(): Promise<boolean> {
    const cmdr = this.commander;
    this.encounterCmdrFleeing = false;

    if (
      this.encounterType !== EncounterType.PoliceInspect ||
      cmdr.ship.detectableIllegalCargoOrPassengers ||
      (await this.ui.alert(AlertType.EncounterPoliceNothingIllegal)) === DialogResult.Yes
    ) {
      this.encounterCmdrFleeing = true;

      if (
        this.encounterType === EncounterType.MarieCelestePolice &&
        (await this.ui.alert(AlertType.EncounterPostMarieFlee)) === DialogResult.No
      ) {
        this.encounterCmdrFleeing = false;
      } else if (
        this.encounterType === EncounterType.PoliceInspect ||
        this.encounterType === EncounterType.MarieCelestePolice
      ) {
        const scoreMod =
          this.encounterType === EncounterType.PoliceInspect
            ? Consts.ScoreFleePolice
            : Consts.ScoreAttackPolice;
        const scoreMin =
          this.encounterType === EncounterType.PoliceInspect
            ? Consts.PoliceRecordScoreDubious - (this.difficulty < Difficulty.Normal ? 0 : 1)
            : Consts.PoliceRecordScoreCriminal;

        this.encounterType = EncounterType.PoliceAttack;
        cmdr.policeRecordScore = Math.min(cmdr.policeRecordScore + scoreMod, scoreMin);
      }
    }

    return this.encounterCmdrFleeing;
  }

  async encounterVerifySubmit(): Promise<boolean> {
    const cmdr = this.commander;
    let submit = false;

    if (cmdr.ship.detectableIllegalCargoOrPassengers) {
      const str1 = cmdr.ship.illegalSpecialCargoDescription('', true, true);
      const str2 = cmdr.ship.illegalSpecialCargo ? Strings.EncounterPoliceSubmitArrested : '';

      if ((await this.ui.alert(AlertType.EncounterPoliceSubmit, str1, str2)) === DialogResult.Yes) {
        submit = true;

        // If you carry illegal goods, they are impounded and you are fined
        if (cmdr.ship.detectableIllegalCargo) {
          cmdr.ship.removeIllegalGoods();

          const fine = toInt(
            Math.max(
              100,
              Math.min(
                10000,
                Math.ceil(cmdr.worth / ((Difficulty.Impossible - this.difficulty + 2) * 10) / 50) *
                  50,
              ),
            ),
          );
          const cashPayment = Math.min(cmdr.cash, fine);
          cmdr.debt += fine - cashPayment;
          cmdr.cash -= cashPayment;

          await this.ui.alert(AlertType.EncounterPoliceFine, multiples(fine, Strings.MoneyUnit));

          cmdr.policeRecordScore += Consts.ScoreTrafficking;
        }
      }
    } else {
      submit = true;

      // If you aren't carrying illegal cargo or passengers, the police will increase your lawfulness record
      await this.ui.alert(AlertType.EncounterPoliceNothingFound);
      cmdr.policeRecordScore -= Consts.ScoreTrafficking;
    }

    return submit;
  }

  async encounterVerifySurrender(): Promise<EncounterResult> {
    const cmdr = this.commander;
    let result = EncounterResult.Continue;

    if (this.opponent.type === ShipType.Mantis) {
      if (cmdr.ship.artifactOnBoard) {
        if ((await this.ui.alert(AlertType.EncounterAliensSurrender)) === DialogResult.Yes) {
          await this.ui.alert(AlertType.ArtifactRelinquished);
          this.questStatusArtifact = SpecialEvent.StatusArtifactNotStarted;

          result = EncounterResult.Normal;
        }
      } else await this.ui.alert(AlertType.EncounterSurrenderRefused);
    } else if (
      this.encounterType === EncounterType.PoliceAttack ||
      this.encounterType === EncounterType.PoliceSurrender
    ) {
      if (cmdr.policeRecordScore <= Consts.PoliceRecordScorePsychopath)
        await this.ui.alert(AlertType.EncounterSurrenderRefused);
      else if (
        (await this.ui.alert(
          AlertType.EncounterPoliceSurrender,
          cmdr.ship.illegalSpecialCargoDescription(
            Strings.EncounterPoliceSurrenderCargo,
            true,
            false,
          ),
          cmdr.ship.illegalSpecialCargoActions(),
        )) === DialogResult.Yes
      )
        result = EncounterResult.Arrested;
    } else if (cmdr.ship.princessOnBoard && !cmdr.ship.hasGadget(GadgetType.HiddenCargoBays)) {
      await this.ui.alert(AlertType.EncounterPiratesSurrenderPrincess);
    } else {
      this.raided = true;

      if (cmdr.ship.hasGadget(GadgetType.HiddenCargoBays)) {
        const precious: string[] = [];
        if (cmdr.ship.princessOnBoard) precious.push(Strings.EncounterHidePrincess);
        if (cmdr.ship.sculptureOnBoard) precious.push(Strings.EncounterHideSculpture);

        await this.ui.alert(
          AlertType.PreciousHidden,
          stringVars(Strings.ListStrings[precious.length]!, ...precious),
        );
      } else if (cmdr.ship.sculptureOnBoard) {
        this.questStatusSculpture = SpecialEvent.StatusSculptureNotStarted;
        await this.ui.alert(AlertType.EncounterPiratesTakeSculpture);
      }

      const cargoToSteal = cmdr.ship.stealableCargo;
      if (cargoToSteal.length === 0) {
        const blackmail = Math.min(25000, Math.max(500, idiv(cmdr.worth, 20)));
        const cashPayment = Math.min(cmdr.cash, blackmail);
        cmdr.debt += blackmail - cashPayment;
        cmdr.cash -= cashPayment;
        await this.ui.alert(
          AlertType.EncounterPiratesFindNoCargo,
          multiples(blackmail, Strings.MoneyUnit),
        );
      } else {
        await this.ui.alert(AlertType.EncounterLooting);

        // Pirates steal as much as they have room for, which could be everything - JAF.
        // Take most high-priced items - JAF.
        while (this.opponent.freeCargoBays > 0 && cargoToSteal.length > 0) {
          const item = cargoToSteal[0]!;

          cmdr.priceCargo[item]! -= idiv(cmdr.priceCargo[item]!, cmdr.ship.cargo[item]!);
          cmdr.ship.cargo[item]!--;
          this.opponent.cargo[item]!++;

          cargoToSteal.splice(0, 1);
        }
      }

      if (cmdr.ship.wildOnBoard) {
        if (this.opponent.crewQuarters > 1) {
          // Wild hops onto Pirate Ship
          this.questStatusWild = SpecialEvent.StatusWildNotStarted;
          await this.ui.alert(AlertType.WildGoesPirates);
          // PORT: the original reset the quest but left Wild aboard. He goes.
          cmdr.ship.fire(CrewMemberId.Wild);
        }
        // no room on pirate ship
        else await this.ui.alert(AlertType.WildChatsPirates);
      }

      // pirates puzzled by reactor
      if (cmdr.ship.reactorOnBoard) await this.ui.alert(AlertType.EncounterPiratesExamineReactor);

      result = EncounterResult.Normal;
    }

    return result;
  }

  async encounterVerifyYield(): Promise<EncounterResult> {
    const cmdr = this.commander;
    let result = EncounterResult.Continue;

    if (cmdr.ship.illegalSpecialCargo) {
      if (
        (await this.ui.alert(
          AlertType.EncounterPoliceSurrender,
          cmdr.ship.illegalSpecialCargoDescription(
            Strings.EncounterPoliceSurrenderCargo,
            true,
            true,
          ),
          cmdr.ship.illegalSpecialCargoActions(),
        )) === DialogResult.Yes
      )
        result = EncounterResult.Arrested;
    } else {
      const str1 = cmdr.ship.illegalSpecialCargoDescription('', false, true);

      if ((await this.ui.alert(AlertType.EncounterPoliceSubmit, str1, '')) === DialogResult.Yes) {
        // Police Record becomes dubious, if it wasn't already.
        if (cmdr.policeRecordScore > Consts.PoliceRecordScoreDubious)
          cmdr.policeRecordScore = Consts.PoliceRecordScoreDubious;

        cmdr.ship.removeIllegalGoods();

        result = EncounterResult.Normal;
      }
    }

    return result;
  }

  private async encounterWon(): Promise<void> {
    const cmdr = this.commander;

    if (
      this.encounterType >= EncounterType.PirateAttack &&
      this.encounterType <= EncounterType.PirateDisabled &&
      this.opponent.type !== ShipType.Mantis &&
      cmdr.policeRecordScore >= Consts.PoliceRecordScoreDubious
    )
      await this.ui.alert(
        AlertType.EncounterPiratesBounty,
        Strings.EncounterPiratesDestroyed,
        '',
        multiples(this.opponent.bounty(), Strings.MoneyUnit),
      );
    else await this.ui.alert(AlertType.EncounterYouWin);

    switch (this.encounterType) {
      case EncounterType.FamousCaptainAttack:
        cmdr.killsTrader++;
        if (cmdr.reputationScore < Consts.ReputationScoreDangerous)
          cmdr.reputationScore = Consts.ReputationScoreDangerous;
        else cmdr.reputationScore += Consts.ScoreKillCaptain;

        // bump news flag from attacked to ship destroyed
        this.newsReplaceEvent(this.newsLatestEvent(), this.newsLatestEvent() + 1);
        break;
      case EncounterType.DragonflyAttack:
        this.encounterDefeatDragonfly();
        break;
      case EncounterType.PirateAttack:
      case EncounterType.PirateFlee:
      case EncounterType.PirateSurrender:
        cmdr.killsPirate++;
        if (this.opponent.type !== ShipType.Mantis) {
          if (cmdr.policeRecordScore >= Consts.PoliceRecordScoreDubious)
            cmdr.cash += this.opponent.bounty();
          cmdr.policeRecordScore += Consts.ScoreKillPirate;
          await this.encounterScoop();
        }
        break;
      case EncounterType.PoliceAttack:
      case EncounterType.PoliceFlee:
        cmdr.killsPolice++;
        cmdr.policeRecordScore += Consts.ScoreKillPolice;
        break;
      case EncounterType.ScarabAttack:
        this.encounterDefeatScarab();
        break;
      case EncounterType.SpaceMonsterAttack:
        cmdr.killsPirate++;
        cmdr.policeRecordScore += Consts.ScoreKillPirate;
        this.questStatusSpaceMonster = SpecialEvent.StatusSpaceMonsterDestroyed;
        break;
      case EncounterType.TraderAttack:
      case EncounterType.TraderFlee:
      case EncounterType.TraderSurrender:
        cmdr.killsTrader++;
        cmdr.policeRecordScore += Consts.ScoreKillTrader;
        await this.encounterScoop();
        break;
      default:
        break;
    }

    cmdr.reputationScore += idiv(this.opponent.type, 2) + 1;
  }

  async escapeWithPod(): Promise<void> {
    const cmdr = this.commander;

    await this.ui.alert(AlertType.EncounterEscapePodActivated);

    if (cmdr.ship.sculptureOnBoard) await this.ui.alert(AlertType.SculptureSaved);

    if (cmdr.ship.reactorOnBoard) {
      await this.ui.alert(AlertType.ReactorDestroyed);
      this.questStatusReactor = SpecialEvent.StatusReactorDone;
    }

    if (cmdr.ship.tribbles > 0) await this.ui.alert(AlertType.TribblesKilled);

    if (this.questStatusJapori === SpecialEvent.StatusJaporiInTransit) {
      let system: number;
      for (
        system = 0;
        system < this.universe.length &&
        this.universe[system]!.specialEventType !== SpecialEventType.Japori;
        system++
      );
      await this.ui.alert(AlertType.AntidoteDestroyed, this.universe[system]!.name);
      this.questStatusJapori = SpecialEvent.StatusJaporiNotStarted;
    }

    if (cmdr.ship.artifactOnBoard) {
      await this.ui.alert(AlertType.ArtifactLost);
      this.questStatusArtifact = SpecialEvent.StatusArtifactDone;
    }

    if (cmdr.ship.jarekOnBoard) {
      await this.ui.alert(AlertType.JarekTakenHome);
      this.questStatusJarek = SpecialEvent.StatusJarekNotStarted;
    }

    if (cmdr.ship.princessOnBoard) {
      await this.ui.alert(AlertType.PrincessTakenHome);
      this.questStatusPrincess = SpecialEvent.StatusPrincessNotStarted;
    }

    if (cmdr.ship.wildOnBoard) {
      await this.ui.alert(AlertType.WildArrested);
      cmdr.policeRecordScore += Consts.ScoreCaughtWithWild;
      this.newsAddEvent(NewsEvent.WildArrested);
      this.questStatusWild = SpecialEvent.StatusWildNotStarted;
    }

    if (cmdr.insurance) {
      await this.ui.alert(AlertType.InsurancePayoff);
      cmdr.cash += cmdr.ship.baseWorth(true);
    }

    if (cmdr.cash > Consts.FleaConversionCost) cmdr.cash -= Consts.FleaConversionCost;
    else {
      cmdr.debt += Consts.FleaConversionCost - cmdr.cash;
      cmdr.cash = 0;
    }

    await this.ui.alert(AlertType.FleaBuilt);

    await this.incDays(3);

    this.createFlea();
  }

  private findDistantSystem(baseSystem: StarSystemId, specEvent: SpecialEventType): boolean {
    let bestDistance = 999;
    let system = -1;
    for (let i = 0; i < this.universe.length; i++) {
      const dist = distance(this.universe[baseSystem]!, this.universe[i]!);
      if (
        dist >= 70 &&
        dist < bestDistance &&
        this.universe[i]!.specialEventType === SpecialEventType.NA
      ) {
        system = i;
        bestDistance = dist;
      }
    }
    if (system >= 0) this.universe[system]!.specialEventType = specEvent;

    return system >= 0;
  }

  private generateCrewMemberList(): void {
    const used = new Array<number>(this.universe.length).fill(0);
    const d = this.difficulty;
    const mercs = this.mercenaries;

    // Zeethibal may be on Kravat
    used[StarSystemId.Kravat] = 1;

    // special individuals:
    // Zeethibal, Jonathan Wild's Nephew - skills will be set later.
    // Wild, Jonathan Wild earns his keep now - JAF.
    // Jarek, Ambassador Jarek earns his keep now - JAF.
    // Dummy pilots for opponents.
    // prettier-ignore
    {
    mercs[CrewMemberId.Zeethibal]     = new CrewMember(CrewMemberId.Zeethibal,        5,     5,  5,     5, StarSystemId.NA);
    mercs[CrewMemberId.Opponent]      = new CrewMember(CrewMemberId.Opponent,         5,     5,  5,     5, StarSystemId.NA);
    mercs[CrewMemberId.Wild]          = new CrewMember(CrewMemberId.Wild,             7,    10,  2,     5, StarSystemId.NA);
    mercs[CrewMemberId.Jarek]         = new CrewMember(CrewMemberId.Jarek,            3,     2, 10,     4, StarSystemId.NA);
    mercs[CrewMemberId.Princess]      = new CrewMember(CrewMemberId.Princess,         4,     3,  8,     9, StarSystemId.NA);
    mercs[CrewMemberId.FamousCaptain] = new CrewMember(CrewMemberId.FamousCaptain,   10,    10, 10,    10, StarSystemId.NA);
    mercs[CrewMemberId.Dragonfly]     = new CrewMember(CrewMemberId.Dragonfly,    4 + d, 6 + d,  1, 6 + d, StarSystemId.NA);
    mercs[CrewMemberId.Scarab]        = new CrewMember(CrewMemberId.Scarab,       5 + d, 6 + d,  1, 6 + d, StarSystemId.NA);
    mercs[CrewMemberId.Scorpion]      = new CrewMember(CrewMemberId.Scorpion,     8 + d, 8 + d,  1, 6 + d, StarSystemId.NA);
    mercs[CrewMemberId.SpaceMonster]  = new CrewMember(CrewMemberId.SpaceMonster, 8 + d, 8 + d,  1, 1 + d, StarSystemId.NA);
    }

    // JAF - Changing this to allow multiple mercenaries in each system, but no more
    // than three.
    for (let i = 1; i < mercs.length; i++) {
      // Only create a CrewMember object if one doesn't already exist in this slot in the array.
      if (mercs[i] === null) {
        let id: StarSystemId;
        let ok = false;

        do {
          id = getRandom(this.universe.length);
          if (used[id]! < 3) {
            used[id]!++;
            ok = true;
          }
        } while (!ok);

        mercs[i] = new CrewMember(
          i,
          randomSkill(),
          randomSkill(),
          randomSkill(),
          randomSkill(),
          id,
        );
      }
    }
  }

  private generateOpponent(oppType: OpponentType): void {
    this.opponent = Ship.forOpponent(oppType);
  }

  private generateUniverse(): void {
    const universe = new Array<StarSystem>(Strings.SystemNames.length);
    this._universe = universe;
    const wormholes = this.wormholes;

    let i: number, j: number;

    for (i = 0; i < universe.length; i++) {
      const id: StarSystemId = i;
      let pressure = SystemPressure.None;
      let specRes = SpecialResource.Nothing;
      let size: Size = getRandom(Size.Huge + 1);
      let polSys = Consts.PoliticalSystems[getRandom(Consts.PoliticalSystems.length)]!;
      let tech: TechLevel = getRandom(polSys.minimumTechLevel, polSys.maximumTechLevel + 1);

      // Galvon must be a Monarchy.
      if (id === StarSystemId.Galvon) {
        size = Size.Large;
        polSys = Consts.PoliticalSystems[PoliticalSystemType.Monarchy]!;
        tech = TechLevel.HiTech;
      }

      if (getRandom(100) < 15)
        pressure = getRandom(SystemPressure.War, SystemPressure.Employment + 1);
      if (getRandom(5) >= 3)
        specRes = getRandom(SpecialResource.MineralRich, SpecialResource.Warlike + 1);

      let x = 0;
      let y = 0;

      if (i < wormholes.length) {
        // Place the first systems somewhere in the center.
        x =
          idiv(Consts.GalaxyWidth * (1 + 2 * (i % 3)), 6) -
          getRandom(-Consts.CloseDistance + 1, Consts.CloseDistance);
        y =
          idiv(Consts.GalaxyHeight * (i < 3 ? 1 : 3), 4) -
          getRandom(-Consts.CloseDistance + 1, Consts.CloseDistance);
        wormholes[i] = i;
      } else {
        let ok = false;
        while (!ok) {
          x = getRandom(1, Consts.GalaxyWidth);
          y = getRandom(1, Consts.GalaxyHeight);

          let closeFound = false;
          let tooClose = false;
          for (j = 0; j < i && !tooClose; j++) {
            //  Minimum distance between any two systems not to be accepted.
            if (distance(universe[j]!, x, y) < Consts.MinDistance) tooClose = true;

            // There should be at least one system which is close enough.
            if (distance(universe[j]!, x, y) < Consts.CloseDistance) closeFound = true;
          }
          ok = closeFound && !tooClose;
        }
      }

      universe[i] = new StarSystem(id, x, y, size, tech, polSys.type, pressure, specRes);
    }

    // Randomize the system locations a bit more, otherwise the systems with the first
    // names in the alphabet are all in the center.
    for (i = 0; i < universe.length; i++) {
      j = getRandom(universe.length);
      if (!wormholeExists(j, -1)) {
        const a = universe[i]!;
        const b = universe[j]!;
        const x = a.x;
        const y = a.y;
        a.x = b.x;
        a.y = b.y;
        b.x = x;
        b.y = y;

        const w = wormholes.indexOf(i);
        if (w >= 0) wormholes[w] = j;
      }
    }

    // Randomize wormhole order
    for (i = 0; i < wormholes.length; i++) {
      j = getRandom(wormholes.length);
      const w = wormholes[i]!;
      wormholes[i] = wormholes[j]!;
      wormholes[j] = w;
    }
  }

  async handleSpecialEvent(): Promise<void> {
    const cmdr = this.commander;
    const curSys = cmdr.currentSystem!;
    let remove = true;

    switch (curSys.specialEventType) {
      case SpecialEventType.Artifact:
        this.questStatusArtifact = SpecialEvent.StatusArtifactOnBoard;
        break;
      case SpecialEventType.ArtifactDelivery:
        this.questStatusArtifact = SpecialEvent.StatusArtifactDone;
        break;
      case SpecialEventType.CargoForSale: {
        await this.ui.alert(AlertType.SpecialSealedCanisters);
        const tradeItem = getRandom(Consts.TradeItems.length);
        cmdr.ship.cargo[tradeItem]! += 3;
        cmdr.priceCargo[tradeItem]! += curSys.specialEvent!.price;
        break;
      }
      case SpecialEventType.Dragonfly:
      case SpecialEventType.DragonflyBaratas:
      case SpecialEventType.DragonflyMelina:
      case SpecialEventType.DragonflyRegulas:
        this.questStatusDragonfly++;
        break;
      case SpecialEventType.DragonflyDestroyed:
        curSys.specialEventType = SpecialEventType.DragonflyShield;
        remove = false;
        break;
      case SpecialEventType.DragonflyShield:
        if (cmdr.ship.freeSlotsShield === 0) {
          await this.ui.alert(AlertType.EquipmentNotEnoughSlots);
          remove = false;
        } else {
          await this.ui.alert(AlertType.EquipmentLightningShield);
          cmdr.ship.addEquipment(Consts.Shields[ShieldType.Lightning]!);
          this.questStatusDragonfly = SpecialEvent.StatusDragonflyDone;
        }
        break;
      case SpecialEventType.EraseRecord:
        await this.ui.alert(AlertType.SpecialCleanRecord);
        cmdr.policeRecordScore = Consts.PoliceRecordScoreClean;
        this.recalculateSellPrices(curSys);
        break;
      case SpecialEventType.Experiment:
        this.questStatusExperiment = SpecialEvent.StatusExperimentStarted;
        break;
      case SpecialEventType.ExperimentFailed:
        break;
      case SpecialEventType.ExperimentStopped:
        this.questStatusExperiment = SpecialEvent.StatusExperimentCancelled;
        this.canSuperWarp = true;
        break;
      case SpecialEventType.Gemulon:
        this.questStatusGemulon = SpecialEvent.StatusGemulonStarted;
        break;
      case SpecialEventType.GemulonFuel:
        if (cmdr.ship.freeSlotsGadget === 0) {
          await this.ui.alert(AlertType.EquipmentNotEnoughSlots);
          remove = false;
        } else {
          await this.ui.alert(AlertType.EquipmentFuelCompactor);
          cmdr.ship.addEquipment(Consts.Gadgets[GadgetType.FuelCompactor]!);
          this.questStatusGemulon = SpecialEvent.StatusGemulonDone;
        }
        break;
      case SpecialEventType.GemulonRescued:
        curSys.specialEventType = SpecialEventType.GemulonFuel;
        this.questStatusGemulon = SpecialEvent.StatusGemulonFuel;
        remove = false;
        break;
      case SpecialEventType.Japori:
        // The japori quest should not be removed since you can fail and start it over again.
        remove = false;

        if (cmdr.ship.freeCargoBays < 10) await this.ui.alert(AlertType.CargoNoEmptyBays);
        else {
          await this.ui.alert(AlertType.AntidoteOnBoard);
          this.questStatusJapori = SpecialEvent.StatusJaporiInTransit;
        }
        break;
      case SpecialEventType.JaporiDelivery:
        this.questStatusJapori = SpecialEvent.StatusJaporiDone;
        cmdr.increaseRandomSkill();
        cmdr.increaseRandomSkill();
        break;
      case SpecialEventType.Jarek:
        if (cmdr.ship.freeCrewQuarters === 0) {
          await this.ui.alert(AlertType.SpecialNoQuarters);
          remove = false;
        } else {
          const jarek = this.mercenaries[CrewMemberId.Jarek]!;
          await this.ui.alert(AlertType.SpecialPassengerOnBoard, jarek.name);
          cmdr.ship.hire(jarek);
          this.questStatusJarek = SpecialEvent.StatusJarekStarted;
        }
        break;
      case SpecialEventType.JarekGetsOut:
        this.questStatusJarek = SpecialEvent.StatusJarekDone;
        cmdr.ship.fire(CrewMemberId.Jarek);
        break;
      case SpecialEventType.Lottery:
        break;
      case SpecialEventType.Moon:
        await this.ui.alert(AlertType.SpecialMoonBought);
        this.questStatusMoon = SpecialEvent.StatusMoonBought;
        break;
      case SpecialEventType.MoonRetirement:
        this.questStatusMoon = SpecialEvent.StatusMoonDone;
        throw new GameEndError(this, GameEndType.BoughtMoon);
      case SpecialEventType.Princess:
        curSys.specialEventType = SpecialEventType.PrincessReturned;
        remove = false;
        this.questStatusPrincess++;
        break;
      case SpecialEventType.PrincessCentauri:
      case SpecialEventType.PrincessInthara:
        this.questStatusPrincess++;
        break;
      case SpecialEventType.PrincessQonos:
        if (cmdr.ship.freeCrewQuarters === 0) {
          await this.ui.alert(AlertType.SpecialNoQuarters);
          remove = false;
        } else {
          const princess = this.mercenaries[CrewMemberId.Princess]!;
          await this.ui.alert(AlertType.SpecialPassengerOnBoard, princess.name);
          cmdr.ship.hire(princess);
        }
        break;
      case SpecialEventType.PrincessQuantum:
        if (cmdr.ship.freeSlotsWeapon === 0) {
          await this.ui.alert(AlertType.EquipmentNotEnoughSlots);
          remove = false;
        } else {
          await this.ui.alert(AlertType.EquipmentQuantumDisruptor);
          cmdr.ship.addEquipment(Consts.Weapons[WeaponType.QuantumDistruptor]!);
          this.questStatusPrincess = SpecialEvent.StatusPrincessDone;
        }
        break;
      case SpecialEventType.PrincessReturned:
        cmdr.ship.fire(CrewMemberId.Princess);
        curSys.specialEventType = SpecialEventType.PrincessQuantum;
        this.questStatusPrincess = SpecialEvent.StatusPrincessReturned;
        remove = false;
        break;
      case SpecialEventType.Reactor:
        if (cmdr.ship.freeCargoBays < 15) {
          await this.ui.alert(AlertType.CargoNoEmptyBays);
          remove = false;
        } else {
          if (cmdr.ship.wildOnBoard) {
            if (
              (await this.ui.alert(AlertType.WildWontStayAboardReactor, curSys.name)) ===
              DialogResult.OK
            ) {
              await this.ui.alert(AlertType.WildLeavesShip, curSys.name);
              this.questStatusWild = SpecialEvent.StatusWildNotStarted;
              // PORT: the original reset the quest but left Wild aboard. He leaves.
              cmdr.ship.fire(CrewMemberId.Wild);
            } else remove = false;
          }

          if (remove) {
            await this.ui.alert(AlertType.ReactorOnBoard);
            this.questStatusReactor = SpecialEvent.StatusReactorFuelOk;
          }
        }
        break;
      case SpecialEventType.ReactorDelivered:
        curSys.specialEventType = SpecialEventType.ReactorLaser;
        this.questStatusReactor = SpecialEvent.StatusReactorDelivered;
        remove = false;
        break;
      case SpecialEventType.ReactorLaser:
        if (cmdr.ship.freeSlotsWeapon === 0) {
          await this.ui.alert(AlertType.EquipmentNotEnoughSlots);
          remove = false;
        } else {
          await this.ui.alert(AlertType.EquipmentMorgansLaser);
          cmdr.ship.addEquipment(Consts.Weapons[WeaponType.MorgansLaser]!);
          this.questStatusReactor = SpecialEvent.StatusReactorDone;
        }
        break;
      case SpecialEventType.Scarab:
        this.questStatusScarab = SpecialEvent.StatusScarabHunting;
        break;
      case SpecialEventType.ScarabDestroyed:
        this.questStatusScarab = SpecialEvent.StatusScarabDestroyed;
        curSys.specialEventType = SpecialEventType.ScarabUpgradeHull;
        remove = false;
        break;
      case SpecialEventType.ScarabUpgradeHull:
        await this.ui.alert(AlertType.ShipHullUpgraded);
        cmdr.ship.hullUpgraded = true;
        cmdr.ship.hull += Consts.HullUpgrade;
        this.questStatusScarab = SpecialEvent.StatusScarabDone;
        remove = false;
        break;
      case SpecialEventType.Sculpture:
        this.questStatusSculpture = SpecialEvent.StatusSculptureInTransit;
        break;
      case SpecialEventType.SculptureDelivered:
        this.questStatusSculpture = SpecialEvent.StatusSculptureDelivered;
        curSys.specialEventType = SpecialEventType.SculptureHiddenBays;
        remove = false;
        break;
      case SpecialEventType.SculptureHiddenBays:
        this.questStatusSculpture = SpecialEvent.StatusSculptureDone;
        if (cmdr.ship.freeSlotsGadget === 0) {
          await this.ui.alert(AlertType.EquipmentNotEnoughSlots);
          remove = false;
        } else {
          await this.ui.alert(AlertType.EquipmentHiddenCompartments);
          cmdr.ship.addEquipment(Consts.Gadgets[GadgetType.HiddenCargoBays]!);
          this.questStatusSculpture = SpecialEvent.StatusSculptureDone;
        }
        break;
      case SpecialEventType.Skill:
        await this.ui.alert(AlertType.SpecialSkillIncrease);
        cmdr.increaseRandomSkill();
        break;
      case SpecialEventType.SpaceMonster:
        this.questStatusSpaceMonster = SpecialEvent.StatusSpaceMonsterAtAcamar;
        break;
      case SpecialEventType.SpaceMonsterKilled:
        this.questStatusSpaceMonster = SpecialEvent.StatusSpaceMonsterDone;
        break;
      case SpecialEventType.Tribble:
        await this.ui.alert(AlertType.TribblesOwn);
        cmdr.ship.tribbles = 1;
        break;
      case SpecialEventType.TribbleBuyer:
        await this.ui.alert(AlertType.TribblesGone);
        cmdr.cash += idiv(cmdr.ship.tribbles, 2);
        cmdr.ship.tribbles = 0;
        break;
      case SpecialEventType.Wild:
        if (cmdr.ship.freeCrewQuarters === 0) {
          await this.ui.alert(AlertType.SpecialNoQuarters);
          remove = false;
        } else if (!cmdr.ship.hasWeapon(WeaponType.BeamLaser, false)) {
          await this.ui.alert(AlertType.WildWontBoardLaser);
          remove = false;
        } else if (cmdr.ship.reactorOnBoard) {
          await this.ui.alert(AlertType.WildWontBoardReactor);
          remove = false;
        } else {
          const wild = this.mercenaries[CrewMemberId.Wild]!;
          await this.ui.alert(AlertType.SpecialPassengerOnBoard, wild.name);
          cmdr.ship.hire(wild);
          this.questStatusWild = SpecialEvent.StatusWildStarted;

          if (cmdr.ship.sculptureOnBoard) await this.ui.alert(AlertType.WildSculpture);
        }
        break;
      case SpecialEventType.WildGetsOut: {
        // Zeethibal has a 10 in player's lowest score, an 8
        // in the next lowest score, and 5 elsewhere.
        const zeethibal = this.mercenaries[CrewMemberId.Zeethibal]!;
        zeethibal.currentSystem = this.universe[StarSystemId.Kravat]!;
        const lowest1 = cmdr.nthLowestSkill(1);
        const lowest2 = cmdr.nthLowestSkill(2);
        for (let i = 0; i < zeethibal.skills.length; i++)
          zeethibal.skills[i] = i === lowest1 ? 10 : i === lowest2 ? 8 : 5;

        this.questStatusWild = SpecialEvent.StatusWildDone;
        cmdr.policeRecordScore = Consts.PoliceRecordScoreClean;
        cmdr.ship.fire(CrewMemberId.Wild);
        this.recalculateSellPrices(curSys);
        break;
      }
    }

    if (curSys.specialEvent!.price !== 0) cmdr.cash -= curSys.specialEvent!.price;

    if (remove) curSys.specialEventType = SpecialEventType.NA;
  }

  async incDays(num: number): Promise<void> {
    const cmdr = this.commander;
    cmdr.days += num;

    if (cmdr.insurance) cmdr.noClaim += num;

    // Police Record will gravitate towards neutral (0).
    if (cmdr.policeRecordScore > Consts.PoliceRecordScoreClean)
      cmdr.policeRecordScore = Math.max(
        Consts.PoliceRecordScoreClean,
        cmdr.policeRecordScore - idiv(num, 3),
      );
    else if (cmdr.policeRecordScore < Consts.PoliceRecordScoreDubious)
      cmdr.policeRecordScore = Math.min(
        Consts.PoliceRecordScoreDubious,
        cmdr.policeRecordScore +
          idiv(num, this.difficulty <= Difficulty.Normal ? 1 : this.difficulty),
      );

    // The Space Monster's strength increases 5% per day until it is back to full strength.
    if (this.spaceMonster.hull < this.spaceMonster.hullStrength)
      this.spaceMonster.hull = Math.min(
        this.spaceMonster.hullStrength,
        toInt(this.spaceMonster.hull * Math.pow(1.05, num)),
      );

    if (
      this.questStatusGemulon > SpecialEvent.StatusGemulonNotStarted &&
      this.questStatusGemulon < SpecialEvent.StatusGemulonTooLate
    ) {
      this.questStatusGemulon = Math.min(
        this.questStatusGemulon + num,
        SpecialEvent.StatusGemulonTooLate,
      );
      if (this.questStatusGemulon === SpecialEvent.StatusGemulonTooLate) {
        const gemulon = this.universe[StarSystemId.Gemulon]!;
        gemulon.specialEventType = SpecialEventType.GemulonInvaded;
        gemulon.techLevel = TechLevel.PreAgricultural;
        gemulon.politicalSystemType = PoliticalSystemType.Anarchy;
      }
    }

    if (cmdr.ship.reactorOnBoard)
      this.questStatusReactor = Math.min(
        this.questStatusReactor + num,
        SpecialEvent.StatusReactorDate,
      );

    if (
      this.questStatusExperiment > SpecialEvent.StatusExperimentNotStarted &&
      this.questStatusExperiment < SpecialEvent.StatusExperimentPerformed
    ) {
      this.questStatusExperiment = Math.min(
        this.questStatusExperiment + num,
        SpecialEvent.StatusExperimentPerformed,
      );
      if (this.questStatusExperiment === SpecialEvent.StatusExperimentPerformed) {
        this.fabricRipProbability = Consts.FabricRipInitialProbability;
        this.universe[StarSystemId.Daled]!.specialEventType = SpecialEventType.ExperimentFailed;
        await this.ui.alert(AlertType.SpecialExperimentPerformed);
        this.newsAddEvent(NewsEvent.ExperimentPerformed);
      }
    } else if (
      this.questStatusExperiment === SpecialEvent.StatusExperimentPerformed &&
      this.fabricRipProbability > 0
    )
      this.fabricRipProbability -= num;

    if (cmdr.ship.jarekOnBoard) {
      if (this.questStatusJarek === idiv(SpecialEvent.StatusJarekImpatient, 2))
        await this.ui.alert(AlertType.SpecialPassengerConcernedJarek);
      else if (this.questStatusJarek === SpecialEvent.StatusJarekImpatient - 1) {
        await this.ui.alert(AlertType.SpecialPassengerImpatientJarek);
        this.zeroSkills(CrewMemberId.Jarek);
      }

      if (this.questStatusJarek < SpecialEvent.StatusJarekImpatient) this.questStatusJarek++;
    }

    if (cmdr.ship.princessOnBoard) {
      if (
        this.questStatusPrincess ===
        idiv(SpecialEvent.StatusPrincessImpatient + SpecialEvent.StatusPrincessRescued, 2)
      )
        await this.ui.alert(AlertType.SpecialPassengerConcernedPrincess);
      else if (this.questStatusPrincess === SpecialEvent.StatusPrincessImpatient - 1) {
        await this.ui.alert(AlertType.SpecialPassengerImpatientPrincess);
        this.zeroSkills(CrewMemberId.Princess);
      }

      if (this.questStatusPrincess < SpecialEvent.StatusPrincessImpatient)
        this.questStatusPrincess++;
    }

    if (cmdr.ship.wildOnBoard) {
      if (this.questStatusWild === idiv(SpecialEvent.StatusWildImpatient, 2))
        await this.ui.alert(AlertType.SpecialPassengerConcernedWild);
      else if (this.questStatusWild === SpecialEvent.StatusWildImpatient - 1) {
        await this.ui.alert(AlertType.SpecialPassengerImpatientWild);
        this.zeroSkills(CrewMemberId.Wild);
      }

      if (this.questStatusWild < SpecialEvent.StatusWildImpatient) this.questStatusWild++;
    }
  }

  /** An impatient passenger stops helping: all four skills drop to 0. */
  private zeroSkills(id: CrewMemberId): void {
    const merc = this.mercenaries[id]!;
    merc.pilot = 0;
    merc.fighter = 0;
    merc.trader = 0;
    merc.engineer = 0;
  }

  private initializeCommander(name: string, commanderCrewMember: CrewMember): void {
    const cmdr = new Commander(commanderCrewMember);
    this._commander = cmdr;
    this.mercenaries[CrewMemberId.Commander] = cmdr;
    Strings.CrewMemberNames[CrewMemberId.Commander] = name;

    while (cmdr.currentSystem === null) {
      const system = this.universe[getRandom(this.universe.length)]!;
      if (
        system.specialEventType === SpecialEventType.NA &&
        system.techLevel > TechLevel.PreAgricultural &&
        system.techLevel < TechLevel.HiTech
      ) {
        // Make sure at least three other systems can be reached
        let close = 0;
        for (let i = 0; i < this.universe.length && close < 3; i++) {
          if (i !== system.id && distance(this.universe[i]!, system) <= cmdr.ship.fuelTanks)
            close++;
        }

        if (close >= 3) cmdr.currentSystem = system;
      }
    }

    cmdr.currentSystem.visited = true;
  }

  newsAddEvent(newEvent: NewsEvent): void {
    this.newsEvents.push(newEvent);
  }

  newsAddEventsOnArrival(): void {
    const cmdr = this.commander;
    const system = cmdr.currentSystem!;

    if (system.specialEventType !== SpecialEventType.NA) {
      switch (system.specialEventType) {
        case SpecialEventType.ArtifactDelivery:
          if (cmdr.ship.artifactOnBoard) this.newsAddEvent(NewsEvent.ArtifactDelivery);
          break;
        case SpecialEventType.Dragonfly:
          this.newsAddEvent(NewsEvent.Dragonfly);
          break;
        case SpecialEventType.DragonflyBaratas:
          if (this.questStatusDragonfly === SpecialEvent.StatusDragonflyFlyBaratas)
            this.newsAddEvent(NewsEvent.DragonflyBaratas);
          break;
        case SpecialEventType.DragonflyDestroyed:
          if (this.questStatusDragonfly === SpecialEvent.StatusDragonflyFlyZalkon)
            this.newsAddEvent(NewsEvent.DragonflyZalkon);
          else if (this.questStatusDragonfly === SpecialEvent.StatusDragonflyDestroyed)
            this.newsAddEvent(NewsEvent.DragonflyDestroyed);
          break;
        case SpecialEventType.DragonflyMelina:
          if (this.questStatusDragonfly === SpecialEvent.StatusDragonflyFlyMelina)
            this.newsAddEvent(NewsEvent.DragonflyMelina);
          break;
        case SpecialEventType.DragonflyRegulas:
          if (this.questStatusDragonfly === SpecialEvent.StatusDragonflyFlyRegulas)
            this.newsAddEvent(NewsEvent.DragonflyRegulas);
          break;
        case SpecialEventType.ExperimentFailed:
          this.newsAddEvent(NewsEvent.ExperimentFailed);
          break;
        case SpecialEventType.ExperimentStopped:
          if (
            this.questStatusExperiment > SpecialEvent.StatusExperimentNotStarted &&
            this.questStatusExperiment < SpecialEvent.StatusExperimentPerformed
          )
            this.newsAddEvent(NewsEvent.ExperimentStopped);
          break;
        case SpecialEventType.Gemulon:
          this.newsAddEvent(NewsEvent.Gemulon);
          break;
        case SpecialEventType.GemulonRescued:
          if (this.questStatusGemulon > SpecialEvent.StatusGemulonNotStarted) {
            if (this.questStatusGemulon < SpecialEvent.StatusGemulonTooLate)
              this.newsAddEvent(NewsEvent.GemulonRescued);
            else this.newsAddEvent(NewsEvent.GemulonInvaded);
          }
          break;
        case SpecialEventType.Japori:
          if (this.questStatusJapori === SpecialEvent.StatusJaporiNotStarted)
            this.newsAddEvent(NewsEvent.Japori);
          break;
        case SpecialEventType.JaporiDelivery:
          if (this.questStatusJapori === SpecialEvent.StatusJaporiInTransit)
            this.newsAddEvent(NewsEvent.JaporiDelivery);
          break;
        case SpecialEventType.JarekGetsOut:
          if (cmdr.ship.jarekOnBoard) this.newsAddEvent(NewsEvent.JarekGetsOut);
          break;
        case SpecialEventType.Princess:
          this.newsAddEvent(NewsEvent.Princess);
          break;
        case SpecialEventType.PrincessCentauri:
          if (this.questStatusPrincess === SpecialEvent.StatusPrincessFlyCentauri)
            this.newsAddEvent(NewsEvent.PrincessCentauri);
          break;
        case SpecialEventType.PrincessInthara:
          if (this.questStatusPrincess === SpecialEvent.StatusPrincessFlyInthara)
            this.newsAddEvent(NewsEvent.PrincessInthara);
          break;
        case SpecialEventType.PrincessQonos:
          if (this.questStatusPrincess === SpecialEvent.StatusPrincessFlyQonos)
            this.newsAddEvent(NewsEvent.PrincessQonos);
          else if (this.questStatusPrincess === SpecialEvent.StatusPrincessRescued)
            this.newsAddEvent(NewsEvent.PrincessRescued);
          break;
        case SpecialEventType.PrincessReturned:
          if (this.questStatusPrincess === SpecialEvent.StatusPrincessReturned)
            this.newsAddEvent(NewsEvent.PrincessReturned);
          break;
        case SpecialEventType.Scarab:
          this.newsAddEvent(NewsEvent.Scarab);
          break;
        case SpecialEventType.ScarabDestroyed:
          if (this.questStatusScarab === SpecialEvent.StatusScarabHunting)
            this.newsAddEvent(NewsEvent.ScarabHarass);
          else if (this.questStatusScarab >= SpecialEvent.StatusScarabDestroyed)
            this.newsAddEvent(NewsEvent.ScarabDestroyed);
          break;
        case SpecialEventType.Sculpture:
          this.newsAddEvent(NewsEvent.SculptureStolen);
          break;
        case SpecialEventType.SculptureDelivered:
          this.newsAddEvent(NewsEvent.SculptureTracked);
          break;
        case SpecialEventType.SpaceMonsterKilled:
          if (this.questStatusSpaceMonster === SpecialEvent.StatusSpaceMonsterAtAcamar)
            this.newsAddEvent(NewsEvent.SpaceMonster);
          else if (this.questStatusSpaceMonster >= SpecialEvent.StatusSpaceMonsterDestroyed)
            this.newsAddEvent(NewsEvent.SpaceMonsterKilled);
          break;
        case SpecialEventType.WildGetsOut:
          if (cmdr.ship.wildOnBoard) this.newsAddEvent(NewsEvent.WildGetsOut);
          break;
      }
    }
  }

  newsLatestEvent(): NewsEvent {
    return this.newsEvents[this.newsEvents.length - 1]!;
  }

  newsReplaceEvent(oldEvent: NewsEvent, newEvent: NewsEvent): void {
    // PORT: in a loaded game the original's list held boxed ints, which never
    // matched the boxed enum, so the old event was never removed. Fixed by
    // using plain numbers.
    const index = this.newsEvents.indexOf(oldEvent);
    if (index >= 0) this.newsEvents.splice(index, 1);
    this.newsEvents.push(newEvent);
  }

  newsResetEvents(): void {
    this.newsEvents.length = 0;
  }

  private async normalDeparture(fuel: number): Promise<void> {
    const cmdr = this.commander;
    cmdr.cash -= this.mercenaryCosts + this.insuranceCosts + this.wormholeCosts;
    cmdr.ship.fuel -= fuel;
    cmdr.payInterest();
    await this.incDays(1);
  }

  private placeShipyards(): boolean {
    let goodUniverse = true;

    const systemIdList: number[] = [];
    for (let system = 0; system < this.universe.length; system++) {
      if (this.universe[system]!.techLevel === TechLevel.HiTech) systemIdList.push(system);
    }

    if (systemIdList.length < Consts.Shipyards.length) goodUniverse = false;
    else {
      // Assign the shipyards to High-Tech systems.
      for (let shipyard = 0; shipyard < Consts.Shipyards.length; shipyard++)
        this.universe[systemIdList[getRandom(systemIdList.length)]!]!.shipyardId =
          shipyard as ShipyardId;
    }

    return goodUniverse;
  }

  private placeSpecialEvents(): boolean {
    let goodUniverse = true;
    let system: number;
    const universe = this.universe;
    const wormholes = this.wormholes;

    // prettier-ignore
    {
    universe[StarSystemId.Baratas]!.specialEventType  = SpecialEventType.DragonflyBaratas;
    universe[StarSystemId.Melina]!.specialEventType   = SpecialEventType.DragonflyMelina;
    universe[StarSystemId.Regulas]!.specialEventType  = SpecialEventType.DragonflyRegulas;
    universe[StarSystemId.Zalkon]!.specialEventType   = SpecialEventType.DragonflyDestroyed;
    universe[StarSystemId.Daled]!.specialEventType    = SpecialEventType.ExperimentStopped;
    universe[StarSystemId.Gemulon]!.specialEventType  = SpecialEventType.GemulonRescued;
    universe[StarSystemId.Japori]!.specialEventType   = SpecialEventType.JaporiDelivery;
    universe[StarSystemId.Devidia]!.specialEventType  = SpecialEventType.JarekGetsOut;
    universe[StarSystemId.Utopia]!.specialEventType   = SpecialEventType.MoonRetirement;
    universe[StarSystemId.Nix]!.specialEventType      = SpecialEventType.ReactorDelivered;
    universe[StarSystemId.Acamar]!.specialEventType   = SpecialEventType.SpaceMonsterKilled;
    universe[StarSystemId.Kravat]!.specialEventType   = SpecialEventType.WildGetsOut;
    universe[StarSystemId.Endor]!.specialEventType    = SpecialEventType.SculptureDelivered;
    universe[StarSystemId.Galvon]!.specialEventType   = SpecialEventType.Princess;
    universe[StarSystemId.Centauri]!.specialEventType = SpecialEventType.PrincessCentauri;
    universe[StarSystemId.Inthara]!.specialEventType  = SpecialEventType.PrincessInthara;
    universe[StarSystemId.Qonos]!.specialEventType    = SpecialEventType.PrincessQonos;
    }

    // Assign a wormhole location endpoint for the Scarab.
    for (
      system = 0;
      system < wormholes.length &&
      universe[wormholes[system]!]!.specialEventType !== SpecialEventType.NA;
      system++
    );
    if (system < wormholes.length)
      universe[wormholes[system]!]!.specialEventType = SpecialEventType.ScarabDestroyed;
    else goodUniverse = false;

    // Find a Hi-Tech system without a special event.
    if (goodUniverse) {
      for (
        system = 0;
        system < universe.length &&
        !(
          universe[system]!.specialEventType === SpecialEventType.NA &&
          universe[system]!.techLevel === TechLevel.HiTech
        );
        system++
      );
      if (system < universe.length)
        universe[system]!.specialEventType = SpecialEventType.ArtifactDelivery;
      else goodUniverse = false;
    }

    // Find the closest system at least 70 parsecs away from Nix that doesn't already have a special event.
    if (goodUniverse && !this.findDistantSystem(StarSystemId.Nix, SpecialEventType.Reactor))
      goodUniverse = false;

    // Find the closest system at least 70 parsecs away from Gemulon that doesn't already have a special event.
    if (goodUniverse && !this.findDistantSystem(StarSystemId.Gemulon, SpecialEventType.Gemulon))
      goodUniverse = false;

    // Find the closest system at least 70 parsecs away from Daled that doesn't already have a special event.
    if (goodUniverse && !this.findDistantSystem(StarSystemId.Daled, SpecialEventType.Experiment))
      goodUniverse = false;

    // Find the closest system at least 70 parsecs away from Endor that doesn't already have a special event.
    if (goodUniverse && !this.findDistantSystem(StarSystemId.Endor, SpecialEventType.Sculpture))
      goodUniverse = false;

    // Assign the rest of the events randomly.
    if (goodUniverse) {
      for (const specialEvent of Consts.SpecialEvents) {
        for (let j = 0; j < specialEvent.occurrence; j++) {
          do {
            system = getRandom(universe.length);
          } while (universe[system]!.specialEventType !== SpecialEventType.NA);

          universe[system]!.specialEventType = specialEvent.type;
        }
      }
    }

    return goodUniverse;
  }

  recalculateBuyPrices(system: StarSystem): void {
    const cmdr = this.commander;
    for (let i = 0; i < Consts.TradeItems.length; i++) {
      if (!system.itemTraded(Consts.TradeItems[i]!)) this._priceCargoBuy[i] = 0;
      else {
        let price = this._priceCargoSell[i]!;

        if (cmdr.policeRecordScore < Consts.PoliceRecordScoreDubious) price = idiv(price * 100, 90);

        // BuyPrice = SellPrice + 1 to 12% (depending on trader skill (minimum is 1, max 12))
        price = idiv(price * (103 + Consts.MaxSkill - cmdr.ship.trader), 100);

        if (price <= this._priceCargoSell[i]!) price = this._priceCargoSell[i]! + 1;

        this._priceCargoBuy[i] = price;
      }
    }
  }

  // *************************************************************************
  // After erasure of police record, selling prices must be recalculated
  // *************************************************************************
  recalculateSellPrices(_system: StarSystem): void {
    for (let i = 0; i < Consts.TradeItems.length; i++)
      this._priceCargoSell[i] = idiv(this._priceCargoSell[i]! * 100, 90);
  }

  resetVeryRareEncounters(): void {
    const list = this.veryRareEncounters;
    list.length = 0;
    list.push(VeryRareEncounter.MarieCeleste);
    list.push(VeryRareEncounter.CaptainAhab);
    list.push(VeryRareEncounter.CaptainConrad);
    list.push(VeryRareEncounter.CaptainHuie);
    list.push(VeryRareEncounter.BottleOld);
    list.push(VeryRareEncounter.BottleGood);
  }

  selectNextSystemWithinRange(forward: boolean): void {
    const dest = this.destinations;

    if (dest.length > 0) {
      let index = dest.indexOf(this.warpSystemId);

      if (index < 0) index = forward ? 0 : dest.length - 1;
      else index = (dest.length + index + (forward ? 1 : -1)) % dest.length;

      if (wormholeExists(this.commander.currentSystem!, this.universe[dest[index]!]!)) {
        this.selectedSystemId = this.commander.currentSystemId;
        this.targetWormhole = true;
      } else this.selectedSystemId = dest[index]!;
    }
  }

  async showNewspaper(): Promise<void> {
    const cmdr = this.commander;

    if (!this.paidForNewspaper) {
      const cost = this.difficulty + 1;

      if (cmdr.cash < cost)
        await this.ui.alert(AlertType.ArrivalIFNewspaper, multiples(cost, 'credit'));
      else if (
        this.options.newsAutoPay ||
        (await this.ui.alert(AlertType.ArrivalBuyNewspaper, multiples(cost, 'credit'))) ===
          DialogResult.Yes
      ) {
        cmdr.cash -= cost;
        this.paidForNewspaper = true;
      }
    }

    if (this.paidForNewspaper)
      await this.ui.alert(AlertType.Alert, this.newspaperHead, this.newspaperText);
  }

  serialize(): Hash {
    return {
      _version: '2.00',
      _universe: this.universe.map((system) => system.serialize()),
      _commander: this.commander.serialize(),
      _wormholes: [...this.wormholes],
      _mercenaries: this.mercenaries.map((merc) => (merc === null ? null : merc.serialize())),
      _dragonfly: this.dragonfly.serialize(),
      _scarab: this.scarab.serialize(),
      _scorpion: this.scorpion.serialize(),
      _spaceMonster: this.spaceMonster.serialize(),
      _opponent: this.opponent.serialize(),
      _chanceOfTradeInOrbit: this.chanceOfTradeInOrbit,
      _clicks: this.clicks,
      _raided: this.raided,
      _inspected: this.inspected,
      _tribbleMessage: this.tribbleMessage,
      _arrivedViaWormhole: this.arrivedViaWormhole,
      _paidForNewspaper: this.paidForNewspaper,
      _litterWarning: this.litterWarning,
      _newsEvents: [...this.newsEvents],
      _difficulty: this.difficulty,
      _cheatEnabled: this.cheatEnabled,
      _autoSave: this.autoSave,
      _easyEncounters: this.easyEncounters,
      _endStatus: this.endStatus,
      _encounterType: this.encounterType,
      _selectedSystemId: this._selectedSystemId,
      _warpSystemId: this._warpSystemId,
      _trackedSystemId: this.trackedSystemId,
      _targetWormhole: this._targetWormhole,
      _priceCargoBuy: [...this._priceCargoBuy],
      _priceCargoSell: [...this._priceCargoSell],
      _questStatusArtifact: this.questStatusArtifact,
      _questStatusDragonfly: this.questStatusDragonfly,
      _questStatusExperiment: this.questStatusExperiment,
      _questStatusGemulon: this.questStatusGemulon,
      _questStatusJapori: this.questStatusJapori,
      _questStatusJarek: this.questStatusJarek,
      _questStatusMoon: this.questStatusMoon,
      _questStatusPrincess: this.questStatusPrincess,
      _questStatusReactor: this.questStatusReactor,
      _questStatusScarab: this.questStatusScarab,
      _questStatusSculpture: this.questStatusSculpture,
      _questStatusSpaceMonster: this.questStatusSpaceMonster,
      _questStatusWild: this.questStatusWild,
      _fabricRipProbability: this.fabricRipProbability,
      _justLootedMarie: this.justLootedMarie,
      _canSuperWarp: this.canSuperWarp,
      _chanceOfVeryRareEncounter: this.chanceOfVeryRareEncounter,
      _veryRareEncounters: [...this.veryRareEncounters],
      _options: this.options.serialize(),
    };
  }

  // Returns true if an encounter occurred.
  async travel(): Promise<boolean> {
    // if timespace is ripped, we may switch the warp system here.
    if (
      this.questStatusExperiment === SpecialEvent.StatusExperimentPerformed &&
      this.fabricRipProbability > 0 &&
      (this.fabricRipProbability === Consts.FabricRipInitialProbability ||
        getRandom(100) < this.fabricRipProbability)
    ) {
      await this.ui.alert(AlertType.SpecialTimespaceFabricRip);
      this.selectedSystemId = getRandom(this.universe.length);
    }

    let uneventful = true;
    this.raided = false;
    this.inspected = false;
    this.litterWarning = false;

    this.clicks = Consts.StartClicks;
    while (this.clicks > 0) {
      this.commander.ship.performRepairs();

      if (this.determineEncounter()) {
        uneventful = false;

        // PORT: the original showed FormEncounter here; its logic is in encounter.ts.
        switch (await runEncounter(this)) {
          case EncounterResult.Arrested:
            this.clicks = 0;
            await this.arrested();
            break;
          case EncounterResult.EscapePod:
            this.clicks = 0;
            await this.escapeWithPod();
            break;
          case EncounterResult.Killed:
            throw new GameEndError(this, GameEndType.Killed);
        }
      }

      this.clicks--;
    }

    return !uneventful;
  }

  async warp(viaSingularity: boolean): Promise<void> {
    const cmdr = this.commander;

    if (cmdr.debt > Consts.DebtTooLarge) await this.ui.alert(AlertType.DebtTooLargeGrounded);
    else if (cmdr.cash < this.mercenaryCosts) await this.ui.alert(AlertType.LeavingIFMercenaries);
    else if (cmdr.cash < this.mercenaryCosts + this.insuranceCosts)
      await this.ui.alert(AlertType.LeavingIFInsurance);
    else if (cmdr.cash < this.mercenaryCosts + this.insuranceCosts + this.wormholeCosts)
      await this.ui.alert(AlertType.LeavingIFWormholeTax);
    else {
      let wildOk = true;

      // if Wild is aboard, make sure ship is armed!
      if (cmdr.ship.wildOnBoard && !cmdr.ship.hasWeapon(WeaponType.BeamLaser, false)) {
        if (
          (await this.ui.alert(AlertType.WildWontStayAboardLaser, cmdr.currentSystem!.name)) ===
          DialogResult.Cancel
        )
          wildOk = false;
        else {
          await this.ui.alert(AlertType.WildLeavesShip, cmdr.currentSystem!.name);
          this.questStatusWild = SpecialEvent.StatusWildNotStarted;
          // PORT: the original reset the quest but left Wild aboard. He leaves.
          cmdr.ship.fire(CrewMemberId.Wild);
        }
      }

      if (wildOk) {
        this.arrivedViaWormhole = wormholeExists(cmdr.currentSystem!, this.warpSystem!);

        if (viaSingularity) this.newsAddEvent(NewsEvent.ExperimentArrival);
        else
          await this.normalDeparture(
            viaSingularity || this.arrivedViaWormhole
              ? 0
              : distance(cmdr.currentSystem!, this.warpSystem!),
          );

        cmdr.currentSystem!.countDown = this.countDownStart;

        this.newsResetEvents();

        this.calculatePrices(this.warpSystem!);

        if (await this.travel()) {
          // Clicks will be -1 if we were arrested or used the escape pod.
          /*
          if (Clicks == 0)
            FormAlert.Alert(AlertType.TravelArrival, ParentWindow);
          */
        } else await this.ui.alert(AlertType.TravelUneventfulTrip);

        await this.arrival();
      }
    }
  }

  async warpDirect(): Promise<void> {
    this._warpSystemId = this.selectedSystemId;

    this.commander.currentSystem!.countDown = this.countDownStart;
    this.newsResetEvents();
    this.calculatePrices(this.warpSystem!);
    await this.arrival();
  }

  // #endregion

  // #region Properties

  get commander(): Commander {
    // Null only while newGame is still building the universe.
    return this._commander!;
  }

  get countDownStart(): number {
    return this.difficulty + 3;
  }

  get currentCosts(): number {
    return this.insuranceCosts + this.interestCosts + this.mercenaryCosts + this.wormholeCosts;
  }

  /** Ids of the systems within range of the current system. */
  get destinations(): number[] {
    const ids: number[] = [];

    for (let i = 0; i < this.universe.length; i++) if (this.universe[i]!.destOk) ids.push(i);

    return ids;
  }

  get difficulty(): Difficulty {
    return this._difficulty;
  }

  get dragonfly(): Ship {
    return this._dragonfly;
  }

  get encounterAction(): string {
    let action = '';

    if (this.opponentDisabled)
      action = stringVars(Strings.EncounterActionOppDisabled, this.encounterShipText);
    else if (this.encounterOppFleeing) {
      if (
        this.encounterType === EncounterType.PirateSurrender ||
        this.encounterType === EncounterType.TraderSurrender
      )
        action = stringVars(Strings.EncounterActionOppSurrender, this.encounterShipText);
      else action = stringVars(Strings.EncounterActionOppFleeing, this.encounterShipText);
    } else action = stringVars(Strings.EncounterActionOppAttacks, this.encounterShipText);

    return action;
  }

  /**
   * The opponent's opening move. Like the original, reading this also sets
   * encounterOppFleeing for the start of the encounter.
   */
  get encounterActionInitial(): string {
    let text = '';

    // Set up the fleeing variable initially.
    this.encounterOppFleeing = false;

    switch (this.encounterType) {
      case EncounterType.BottleGood:
      case EncounterType.BottleOld:
        text = Strings.EncounterTextBottle;
        break;
      case EncounterType.CaptainAhab:
      case EncounterType.CaptainConrad:
      case EncounterType.CaptainHuie:
        text = Strings.EncounterTextFamousCaptain;
        break;
      case EncounterType.DragonflyAttack:
      case EncounterType.PirateAttack:
      case EncounterType.PoliceAttack:
      case EncounterType.ScarabAttack:
      case EncounterType.ScorpionAttack:
      case EncounterType.SpaceMonsterAttack:
        text = Strings.EncounterTextOpponentAttack;
        break;
      case EncounterType.DragonflyIgnore:
      case EncounterType.PirateIgnore:
      case EncounterType.PoliceIgnore:
      case EncounterType.ScarabIgnore:
      case EncounterType.ScorpionIgnore:
      case EncounterType.SpaceMonsterIgnore:
      case EncounterType.TraderIgnore:
        text = this.commander.ship.cloaked
          ? Strings.EncounterTextOpponentNoNotice
          : Strings.EncounterTextOpponentIgnore;
        break;
      case EncounterType.MarieCeleste:
        text = Strings.EncounterTextMarieCeleste;
        break;
      case EncounterType.MarieCelestePolice:
        text = Strings.EncounterTextPolicePostMarie;
        break;
      case EncounterType.PirateFlee:
      case EncounterType.PoliceFlee:
      case EncounterType.TraderFlee:
        text = Strings.EncounterTextOpponentFlee;
        this.encounterOppFleeing = true;
        break;
      case EncounterType.PoliceInspect:
        text = Strings.EncounterTextPoliceInspection;
        break;
      case EncounterType.PoliceSurrender:
        text = Strings.EncounterTextPoliceSurrender;
        break;
      case EncounterType.TraderBuy:
      case EncounterType.TraderSell:
        text = Strings.EncounterTextTrader;
        break;
      case EncounterType.FamousCaptainAttack:
      case EncounterType.FamousCaptDisabled:
      case EncounterType.PoliceDisabled:
      case EncounterType.PirateDisabled:
      case EncounterType.PirateSurrender:
      case EncounterType.TraderAttack:
      case EncounterType.TraderDisabled:
      case EncounterType.TraderSurrender:
        // These should never be the initial encounter type.
        break;
    }

    return text;
  }

  /** Consts.EncounterImg* for the encounter type, or -1. */
  get encounterImageIndex(): number {
    let encounterImage = -1;

    switch (this.encounterType) {
      case EncounterType.BottleGood:
      case EncounterType.BottleOld:
      case EncounterType.CaptainAhab:
      case EncounterType.CaptainConrad:
      case EncounterType.CaptainHuie:
      case EncounterType.MarieCeleste:
        encounterImage = Consts.EncounterImgSpecial;
        break;
      case EncounterType.DragonflyAttack:
      case EncounterType.DragonflyIgnore:
      case EncounterType.ScarabAttack:
      case EncounterType.ScarabIgnore:
      case EncounterType.ScorpionAttack:
      case EncounterType.ScorpionIgnore:
        encounterImage = Consts.EncounterImgPirate;
        break;
      case EncounterType.MarieCelestePolice:
      case EncounterType.PoliceAttack:
      case EncounterType.PoliceFlee:
      case EncounterType.PoliceIgnore:
      case EncounterType.PoliceInspect:
      case EncounterType.PoliceSurrender:
        encounterImage = Consts.EncounterImgPolice;
        break;
      case EncounterType.PirateAttack:
      case EncounterType.PirateFlee:
      case EncounterType.PirateIgnore:
        if (this.opponent.type === ShipType.Mantis) encounterImage = Consts.EncounterImgAlien;
        else encounterImage = Consts.EncounterImgPirate;
        break;
      case EncounterType.SpaceMonsterAttack:
      case EncounterType.SpaceMonsterIgnore:
        encounterImage = Consts.EncounterImgAlien;
        break;
      case EncounterType.TraderBuy:
      case EncounterType.TraderFlee:
      case EncounterType.TraderIgnore:
      case EncounterType.TraderSell:
        encounterImage = Consts.EncounterImgTrader;
        break;
      case EncounterType.FamousCaptainAttack:
      case EncounterType.FamousCaptDisabled:
      case EncounterType.PoliceDisabled:
      case EncounterType.PirateDisabled:
      case EncounterType.PirateSurrender:
      case EncounterType.TraderAttack:
      case EncounterType.TraderDisabled:
      case EncounterType.TraderSurrender:
        // These should never be the initial encounter type.
        break;
    }

    return encounterImage;
  }

  get encounterShipText(): string {
    let shipText = this.opponent.name;

    switch (this.encounterType) {
      case EncounterType.FamousCaptainAttack:
      case EncounterType.FamousCaptDisabled:
        shipText = Strings.EncounterShipCaptain;
        break;
      case EncounterType.PirateAttack:
      case EncounterType.PirateDisabled:
      case EncounterType.PirateFlee:
      case EncounterType.PirateSurrender:
        shipText =
          this.opponent.type === ShipType.Mantis
            ? Strings.EncounterShipMantis
            : Strings.EncounterShipPirate;
        break;
      case EncounterType.PoliceAttack:
      case EncounterType.PoliceDisabled:
      case EncounterType.PoliceFlee:
        shipText = Strings.EncounterShipPolice;
        break;
      case EncounterType.TraderAttack:
      case EncounterType.TraderDisabled:
      case EncounterType.TraderFlee:
      case EncounterType.TraderSurrender:
        shipText = Strings.EncounterShipTrader;
        break;
      default:
        break;
    }

    return shipText;
  }

  get encounterText(): string {
    let cmdrStatus = '';
    let oppStatus = '';

    if (this.encounterCmdrFleeing)
      cmdrStatus = stringVars(Strings.EncounterActionCmdrChased, this.encounterShipText);
    else if (this.encounterOppHit)
      cmdrStatus = stringVars(Strings.EncounterActionOppHit, this.encounterShipText);
    else cmdrStatus = stringVars(Strings.EncounterActionOppMissed, this.encounterShipText);

    if (this.encounterOppFleeingPrev)
      oppStatus = stringVars(Strings.EncounterActionOppChased, this.encounterShipText);
    else if (this.encounterCmdrHit)
      oppStatus = stringVars(Strings.EncounterActionCmdrHit, this.encounterShipText);
    else oppStatus = stringVars(Strings.EncounterActionCmdrMissed, this.encounterShipText);

    return cmdrStatus + '\n' + oppStatus;
  }

  get encounterTextInitial(): string {
    let encounterPretext = '';

    switch (this.encounterType) {
      case EncounterType.BottleGood:
      case EncounterType.BottleOld:
        encounterPretext = Strings.EncounterPretextBottle;
        break;
      case EncounterType.DragonflyAttack:
      case EncounterType.DragonflyIgnore:
      case EncounterType.ScarabAttack:
      case EncounterType.ScarabIgnore:
        encounterPretext = Strings.EncounterPretextStolen;
        break;
      case EncounterType.CaptainAhab:
        encounterPretext = Strings.EncounterPretextCaptainAhab;
        break;
      case EncounterType.CaptainConrad:
        encounterPretext = Strings.EncounterPretextCaptainConrad;
        break;
      case EncounterType.CaptainHuie:
        encounterPretext = Strings.EncounterPretextCaptainHuie;
        break;
      case EncounterType.MarieCeleste:
        encounterPretext = Strings.EncounterPretextMarie;
        break;
      case EncounterType.MarieCelestePolice:
      case EncounterType.PoliceAttack:
      case EncounterType.PoliceFlee:
      case EncounterType.PoliceIgnore:
      case EncounterType.PoliceInspect:
      case EncounterType.PoliceSurrender:
        encounterPretext = Strings.EncounterPretextPolice;
        break;
      case EncounterType.PirateAttack:
      case EncounterType.PirateFlee:
      case EncounterType.PirateIgnore:
        if (this.opponent.type === ShipType.Mantis)
          encounterPretext = Strings.EncounterPretextAlien;
        else encounterPretext = Strings.EncounterPretextPirate;
        break;
      case EncounterType.ScorpionAttack:
      case EncounterType.ScorpionIgnore:
        encounterPretext = Strings.EncounterPretextScorpion;
        break;
      case EncounterType.SpaceMonsterAttack:
      case EncounterType.SpaceMonsterIgnore:
        encounterPretext = Strings.EncounterPretextSpaceMonster;
        break;
      case EncounterType.TraderBuy:
      case EncounterType.TraderFlee:
      case EncounterType.TraderIgnore:
      case EncounterType.TraderSell:
        encounterPretext = Strings.EncounterPretextTrader;
        break;
      case EncounterType.FamousCaptainAttack:
      case EncounterType.FamousCaptDisabled:
      case EncounterType.PoliceDisabled:
      case EncounterType.PirateDisabled:
      case EncounterType.PirateSurrender:
      case EncounterType.TraderAttack:
      case EncounterType.TraderDisabled:
      case EncounterType.TraderSurrender:
        // These should never be the initial encounter type.
        break;
    }

    return stringVars(
      Strings.EncounterText,
      multiples(this.clicks, Strings.DistanceSubunit),
      this.warpSystem!.name,
      encounterPretext,
      this.opponent.name.toLowerCase(),
    );
  }

  get insuranceCosts(): number {
    const cmdr = this.commander;
    return cmdr.insurance
      ? toInt(
          Math.max(1, (cmdr.ship.baseWorth(true) * Consts.InsRate * (100 - cmdr.noClaim)) / 100),
        )
      : 0;
  }

  get interestCosts(): number {
    const cmdr = this.commander;
    return cmdr.debt > 0 ? toInt(Math.max(1, cmdr.debt * Consts.IntRate)) : 0;
  }

  get mercenaryCosts(): number {
    const crew = this.commander.ship.crew;
    let total = 0;

    for (let i = 1; i < crew.length && crew[i] !== null; i++) total += crew[i]!.rate;

    return total;
  }

  get mercenaries(): (CrewMember | null)[] {
    return this._mercenaries;
  }

  get newsEvents(): NewsEvent[] {
    return this._newsEvents;
  }

  get newspaperHead(): string {
    const system = this.commander.currentSystem!;
    const heads = Strings.NewsMastheads[system.politicalSystemType]!;
    const head = heads[system.id % heads.length]!;

    return stringVars(head, system.name);
  }

  get newspaperText(): string {
    const cmdr = this.commander;
    const curSys = cmdr.currentSystem!;
    const items: string[] = [];

    // We're using the GetRandom2 function so that the same number is generated each time for the same
    // "version" of the newspaper. -JAF
    randSeed(curSys.id, cmdr.days);

    for (const event of this.newsEvents)
      items.push(stringVars(Strings.NewsEvent[event]!, cmdr.name, curSys.name, cmdr.ship.name));

    if (curSys.systemPressure !== SystemPressure.None)
      items.push(Strings.NewsPressureInternal[curSys.systemPressure]!);

    if (cmdr.policeRecordScore <= Consts.PoliceRecordScoreVillain) {
      const baseStr =
        Strings.NewsPoliceRecordPsychopath[getRandom2(Strings.NewsPoliceRecordPsychopath.length)]!;
      items.push(stringVars(baseStr, cmdr.name, curSys.name));
    } else if (cmdr.policeRecordScore >= Consts.PoliceRecordScoreHero) {
      const baseStr =
        Strings.NewsPoliceRecordHero[getRandom2(Strings.NewsPoliceRecordHero.length)]!;
      items.push(stringVars(baseStr, cmdr.name, curSys.name));
    }

    // and now, finally, useful news (if any)
    // base probability of a story showing up is (50 / MAXTECHLEVEL) * Current Tech Level
    // This is then modified by adding 10% for every level of play less than Impossible
    let realNews = false;
    for (const system of this.universe) {
      if (system.destOk && system !== curSys) {
        // Special stories that always get shown: moon, millionaire, shipyard
        if (system.specialEventType !== SpecialEventType.NA) {
          if (system.specialEventType === SpecialEventType.Moon)
            items.push(stringVars(Strings.NewsMoonForSale, system.name));
          else if (system.specialEventType === SpecialEventType.TribbleBuyer)
            items.push(stringVars(Strings.NewsTribbleBuyer, system.name));
        }
        if (system.shipyardId !== ShipyardId.NA)
          items.push(stringVars(Strings.NewsShipyard, system.name));

        // And not-always-shown stories
        if (
          system.systemPressure !== SystemPressure.None &&
          getRandom2(100) <= Consts.StoryProbability * curSys.techLevel + 10 * (5 - this.difficulty)
        ) {
          const index = getRandom2(Strings.NewsPressureExternal.length);
          const baseStr = Strings.NewsPressureExternal[index]!;
          const pressure = Strings.NewsPressureExternalPressures[system.systemPressure]!;
          items.push(stringVars(baseStr, pressure, system.name));
          realNews = true;
        }
      }
    }

    // if there's no useful news, we throw up at least one
    // headline from our canned news list.
    if (!realNews) {
      const headlines = Strings.NewsHeadlines[curSys.politicalSystemType]!;
      const shown = new Array<boolean>(headlines.length).fill(false);

      const toShow = getRandom2(headlines.length);
      for (let i = 0; i <= toShow; i++) {
        const index = getRandom2(headlines.length);
        if (!shown[index]) {
          items.push(headlines[index]!);
          shown[index] = true;
        }
      }
    }

    return items.join('\n\n');
  }

  get options(): GameOptions {
    return this._options;
  }

  get priceCargoBuy(): number[] {
    return this._priceCargoBuy;
  }

  get priceCargoSell(): number[] {
    return this._priceCargoSell;
  }

  get scarab(): Ship {
    return this._scarab;
  }

  get score(): number {
    const cmdr = this.commander;
    const worth = cmdr.worth < 1000000 ? cmdr.worth : 1000000 + idiv(cmdr.worth - 1000000, 10);
    let daysMoon = 0;
    let modifier = 0;

    switch (this.endStatus) {
      case GameEndType.Killed:
        modifier = 90;
        break;
      case GameEndType.Retired:
        modifier = 95;
        break;
      case GameEndType.BoughtMoon:
        daysMoon = Math.max(0, (this.difficulty + 1) * 100 - cmdr.days);
        modifier = 100;
        break;
    }

    return idiv((this.difficulty + 1) * modifier * (daysMoon * 1000 + worth), 250000);
  }

  get scorpion(): Ship {
    return this._scorpion;
  }

  get selectedSystem(): StarSystem | null {
    return this._selectedSystemId === StarSystemId.NA
      ? null
      : this.universe[this._selectedSystemId]!;
  }

  get selectedSystemId(): StarSystemId {
    return this._selectedSystemId;
  }
  set selectedSystemId(value: StarSystemId) {
    this._selectedSystemId = value;
    this._warpSystemId = value;
    this._targetWormhole = false;
  }

  /** Write-only in the original: selects the first system whose name contains the value. */
  set selectedSystemName(value: string) {
    const nameToFind = value.toLowerCase();
    let found = false;

    for (let i = 0; i < this.universe.length && !found; i++) {
      const name = this.universe[i]!.name;

      if (name.toLowerCase().indexOf(nameToFind) >= 0) {
        this.selectedSystemId = i;
        found = true;
      }
    }
  }

  get spaceMonster(): Ship {
    return this._spaceMonster;
  }

  get targetWormhole(): boolean {
    return this._targetWormhole;
  }
  set targetWormhole(value: boolean) {
    this._targetWormhole = value;

    if (this._targetWormhole) {
      const wormIndex = this.wormholes.indexOf(this.selectedSystemId);
      this._warpSystemId = this.wormholes[(wormIndex + 1) % this.wormholes.length]!;
    }
  }

  get trackedSystem(): StarSystem | null {
    return this.trackedSystemId === StarSystemId.NA ? null : this.universe[this.trackedSystemId]!;
  }

  get universe(): StarSystem[] {
    return this._universe;
  }

  get veryRareEncounters(): VeryRareEncounter[] {
    return this._veryRareEncounters;
  }

  get warpSystem(): StarSystem | null {
    return this._warpSystemId === StarSystemId.NA ? null : this.universe[this._warpSystemId]!;
  }

  get warpSystemId(): StarSystemId {
    return this._warpSystemId;
  }

  get wormholeCosts(): number {
    return wormholeExists(this.commander.currentSystem!, this.warpSystem)
      ? Consts.WormDist * this.commander.ship.fuelCost
      : 0;
  }

  get wormholes(): number[] {
    return this._wormholes;
  }

  // #endregion
}
