// Port of StarSystem.cs.

import { Consts } from '../data/consts';
import {
  type PoliticalSystemType,
  ShipyardId,
  type Size,
  SpecialEventType,
  SpecialResource,
  type StarSystemId,
  type SystemPressure,
  type TechLevel,
  TradeItemType,
} from '../data/enums';
import { Strings } from '../data/strings';
import { distance, wormholeExists } from '../functions';
import { currentCommander, currentGame } from '../game-context';
import { idiv } from '../math';
import { getRandom } from '../rng';
import { getValueOr, type Hash } from '../serialization';
import type { CrewMember } from './crew-member';
import type { PoliticalSystem } from './political-system';
import type { Shipyard } from './shipyard';
import { SpecialEvent } from './special-event';
import type { TradeItem } from './trade-item';

// Set while fromHash runs the constructor, so loading doesn't generate new
// trade item quantities (the C# Hashtable constructor didn't).
let loading = false;

export class StarSystem {
  private _id: StarSystemId;
  private _x: number;
  private _y: number;
  private _size: Size;
  private _techLevel: TechLevel;
  private _politicalSystemType: PoliticalSystemType;
  private _systemPressure: SystemPressure;
  private _specialResource: SpecialResource;
  private _specialEventType: SpecialEventType = SpecialEventType.NA;
  private _tradeItems: number[] = new Array<number>(10).fill(0);
  private _countDown = 0;
  private _visited = false;
  private _shipyardId: ShipyardId = ShipyardId.NA;

  constructor(
    id: StarSystemId,
    x: number,
    y: number,
    size: Size,
    techLevel: TechLevel,
    politicalSystemType: PoliticalSystemType,
    systemPressure: SystemPressure,
    specialResource: SpecialResource,
  ) {
    this._id = id;
    this._x = x;
    this._y = y;
    this._size = size;
    this._techLevel = techLevel;
    this._politicalSystemType = politicalSystemType;
    this._systemPressure = systemPressure;
    this._specialResource = specialResource;

    if (!loading) this.initializeTradeItems();
  }

  static fromHash(hash: Hash): StarSystem {
    // The C# defaults each field to its current (zero) value when the key is missing.
    loading = true;
    let system: StarSystem;
    try {
      system = new StarSystem(0, 0, 0, 0, 0, 0, 0, 0);
    } finally {
      loading = false;
    }

    system._id = getValueOr(hash, '_id', system._id);
    system._x = getValueOr(hash, '_x', system._x);
    system._y = getValueOr(hash, '_y', system._y);
    system._size = getValueOr(hash, '_size', system._size);
    system._techLevel = getValueOr(hash, '_techLevel', system._techLevel);
    system._politicalSystemType = getValueOr(
      hash,
      '_politicalSystemType',
      system._politicalSystemType,
    );
    system._systemPressure = getValueOr(hash, '_systemPressure', system._systemPressure);
    system._specialResource = getValueOr(hash, '_specialResource', system._specialResource);
    system._specialEventType = getValueOr(hash, '_specialEventType', system._specialEventType);
    system._tradeItems = [...getValueOr(hash, '_tradeItems', system._tradeItems)];
    system._countDown = getValueOr(hash, '_countDown', system._countDown);
    system._visited = getValueOr(hash, '_visited', system._visited);
    system._shipyardId = getValueOr(hash, '_shipyardId', system._shipyardId);
    return system;
  }

  /** Sets the quantity of each trade item available for sale. */
  initializeTradeItems(): void {
    const difficulty = currentGame().difficulty;

    for (let i = 0; i < Consts.TradeItems.length; i++) {
      const item = Consts.TradeItems[i]!;

      if (!this.itemTraded(item)) {
        this._tradeItems[i] = 0;
      } else {
        let quantity =
          (this.size + 1) * (getRandom(9, 14) - Math.abs(item.techTopProduction - this.techLevel));

        // Because of the enormous profits possible, there shouldn't be too many robots or narcotics available.
        if (i >= TradeItemType.Narcotics)
          quantity = idiv(quantity * (5 - difficulty), 6 - difficulty) + 1;

        // Note: this.specialResource reads as Nothing until the system is
        // visited, so at universe creation these two never apply. That is the
        // original's behaviour, kept as is.
        if (this.specialResource === item.resourceLowPrice) quantity = idiv(quantity * 4, 3);

        if (this.specialResource === item.resourceHighPrice) quantity = idiv(quantity * 3, 4);

        if (this.systemPressure === item.pressurePriceHike) quantity = idiv(quantity, 5);

        quantity = quantity - getRandom(10) + getRandom(10);

        if (quantity < 0) quantity = 0;

        this._tradeItems[i] = quantity;
      }
    }
  }

  /** True if the item is produced here, so it can be bought. */
  itemTraded(item: TradeItem): boolean {
    return (
      (item.type !== TradeItemType.Narcotics || this.politicalSystem.drugsOk) &&
      (item.type !== TradeItemType.Firearms || this.politicalSystem.firearmsOk) &&
      this.techLevel >= item.techProduction
    );
  }

  /** True if the item is used here, so it can be sold. */
  itemUsed(item: TradeItem): boolean {
    return (
      (item.type !== TradeItemType.Narcotics || this.politicalSystem.drugsOk) &&
      (item.type !== TradeItemType.Firearms || this.politicalSystem.firearmsOk) &&
      this.techLevel >= item.techUsage
    );
  }

  serialize(): Hash {
    return {
      _id: this._id,
      _x: this._x,
      _y: this._y,
      _size: this._size,
      _techLevel: this._techLevel,
      _politicalSystemType: this._politicalSystemType,
      _systemPressure: this._systemPressure,
      _specialResource: this._specialResource,
      _specialEventType: this._specialEventType,
      _tradeItems: [...this._tradeItems],
      _countDown: this._countDown,
      _visited: this._visited,
      _shipyardId: this._shipyardId,
    };
  }

  /** Whether the system's special event is currently available to the commander. */
  showSpecialButton(): boolean {
    const game = currentGame();
    const cmdr = currentCommander();
    let show = false;

    switch (this.specialEventType) {
      case SpecialEventType.Artifact:
      case SpecialEventType.Dragonfly:
      case SpecialEventType.Experiment:
      case SpecialEventType.Jarek:
        show = cmdr.policeRecordScore >= Consts.PoliceRecordScoreDubious;
        break;
      case SpecialEventType.ArtifactDelivery:
        show = cmdr.ship.artifactOnBoard;
        break;
      case SpecialEventType.CargoForSale:
        show = cmdr.ship.freeCargoBays >= 3;
        break;
      case SpecialEventType.DragonflyBaratas:
        show =
          game.questStatusDragonfly > SpecialEvent.StatusDragonflyNotStarted &&
          game.questStatusDragonfly < SpecialEvent.StatusDragonflyDestroyed;
        break;
      case SpecialEventType.DragonflyDestroyed:
        show = game.questStatusDragonfly === SpecialEvent.StatusDragonflyDestroyed;
        break;
      case SpecialEventType.DragonflyMelina:
        show =
          game.questStatusDragonfly > SpecialEvent.StatusDragonflyFlyBaratas &&
          game.questStatusDragonfly < SpecialEvent.StatusDragonflyDestroyed;
        break;
      case SpecialEventType.DragonflyRegulas:
        show =
          game.questStatusDragonfly > SpecialEvent.StatusDragonflyFlyMelina &&
          game.questStatusDragonfly < SpecialEvent.StatusDragonflyDestroyed;
        break;
      case SpecialEventType.DragonflyShield:
      case SpecialEventType.ExperimentFailed:
      case SpecialEventType.Gemulon:
      case SpecialEventType.GemulonFuel:
      case SpecialEventType.GemulonInvaded:
      case SpecialEventType.Lottery:
      case SpecialEventType.ReactorLaser:
      case SpecialEventType.PrincessQuantum:
      case SpecialEventType.SculptureHiddenBays:
      case SpecialEventType.Skill:
      case SpecialEventType.SpaceMonster:
      case SpecialEventType.Tribble:
        show = true;
        break;
      case SpecialEventType.EraseRecord:
      case SpecialEventType.Wild:
        show = cmdr.policeRecordScore < Consts.PoliceRecordScoreDubious;
        break;
      case SpecialEventType.ExperimentStopped:
        show =
          game.questStatusExperiment > SpecialEvent.StatusExperimentNotStarted &&
          game.questStatusExperiment < SpecialEvent.StatusExperimentPerformed;
        break;
      case SpecialEventType.GemulonRescued:
        show =
          game.questStatusGemulon > SpecialEvent.StatusGemulonNotStarted &&
          game.questStatusGemulon < SpecialEvent.StatusGemulonTooLate;
        break;
      case SpecialEventType.Japori:
        show =
          game.questStatusJapori === SpecialEvent.StatusJaporiNotStarted &&
          cmdr.policeRecordScore >= Consts.PoliceRecordScoreDubious;
        break;
      case SpecialEventType.JaporiDelivery:
        show = game.questStatusJapori === SpecialEvent.StatusJaporiInTransit;
        break;
      case SpecialEventType.JarekGetsOut:
        show = cmdr.ship.jarekOnBoard;
        break;
      case SpecialEventType.Moon:
        show =
          game.questStatusMoon === SpecialEvent.StatusMoonNotStarted &&
          cmdr.worth > SpecialEvent.MoonCost * 0.8;
        break;
      case SpecialEventType.MoonRetirement:
        show = game.questStatusMoon === SpecialEvent.StatusMoonBought;
        break;
      case SpecialEventType.Princess:
        show =
          cmdr.policeRecordScore >= Consts.PoliceRecordScoreLawful &&
          cmdr.reputationScore >= Consts.ReputationScoreAverage;
        break;
      case SpecialEventType.PrincessCentauri:
        show =
          game.questStatusPrincess >= SpecialEvent.StatusPrincessFlyCentauri &&
          game.questStatusPrincess <= SpecialEvent.StatusPrincessFlyQonos;
        break;
      case SpecialEventType.PrincessInthara:
        show =
          game.questStatusPrincess >= SpecialEvent.StatusPrincessFlyInthara &&
          game.questStatusPrincess <= SpecialEvent.StatusPrincessFlyQonos;
        break;
      case SpecialEventType.PrincessQonos:
        show =
          game.questStatusPrincess === SpecialEvent.StatusPrincessRescued &&
          !cmdr.ship.princessOnBoard;
        break;
      case SpecialEventType.PrincessReturned:
        show = cmdr.ship.princessOnBoard;
        break;
      case SpecialEventType.Reactor:
        show =
          game.questStatusReactor === SpecialEvent.StatusReactorNotStarted &&
          cmdr.policeRecordScore < Consts.PoliceRecordScoreDubious &&
          cmdr.reputationScore >= Consts.ReputationScoreAverage;
        break;
      case SpecialEventType.ReactorDelivered:
        show = cmdr.ship.reactorOnBoard;
        break;
      case SpecialEventType.Scarab:
        show =
          game.questStatusScarab === SpecialEvent.StatusScarabNotStarted &&
          cmdr.reputationScore >= Consts.ReputationScoreAverage;
        break;
      case SpecialEventType.ScarabDestroyed:
      case SpecialEventType.ScarabUpgradeHull:
        show = game.questStatusScarab === SpecialEvent.StatusScarabDestroyed;
        break;
      case SpecialEventType.Sculpture:
        show =
          game.questStatusSculpture === SpecialEvent.StatusSculptureNotStarted &&
          cmdr.policeRecordScore < Consts.PoliceRecordScoreDubious &&
          cmdr.reputationScore >= Consts.ReputationScoreAverage;
        break;
      case SpecialEventType.SculptureDelivered:
        show = game.questStatusSculpture === SpecialEvent.StatusSculptureInTransit;
        break;
      case SpecialEventType.SpaceMonsterKilled:
        show = game.questStatusSpaceMonster === SpecialEvent.StatusSpaceMonsterDestroyed;
        break;
      case SpecialEventType.TribbleBuyer:
        show = cmdr.ship.tribbles > 0;
        break;
      case SpecialEventType.WildGetsOut:
        show = cmdr.ship.wildOnBoard;
        break;
      default:
        break;
    }

    return show;
  }

  get countDown(): number {
    return this._countDown;
  }
  set countDown(value: number) {
    this._countDown = value;
  }

  /** True if the commander can warp here now: in fuel range, or through a wormhole. */
  get destOk(): boolean {
    const comm = currentCommander();
    return (
      this !== comm.currentSystem &&
      (this.distance <= comm.ship.fuel || wormholeExists(comm.currentSystem!, this))
    );
  }

  /** Distance from the commander's current system. */
  get distance(): number {
    return distance(this, currentCommander().currentSystem!);
  }

  get id(): StarSystemId {
    return this._id;
  }

  /**
   * Mercenaries waiting at the commander's current system who aren't already
   * aboard. Like the original, this checks the commander's system, not this one.
   */
  get mercenariesForHire(): CrewMember[] {
    const cmdr = currentCommander();
    const mercs = currentGame().mercenaries;
    const forHire: CrewMember[] = [];

    for (let i = 1; i < mercs.length; i++) {
      const merc = mercs[i]!;
      if (merc.currentSystem === cmdr.currentSystem && !cmdr.ship.hasCrew(merc.id))
        forHire.push(merc);
    }

    return forHire;
  }

  get name(): string {
    return Strings.SystemNames[this._id]!;
  }

  get politicalSystem(): PoliticalSystem {
    return Consts.PoliticalSystems[this._politicalSystemType]!;
  }

  get politicalSystemType(): PoliticalSystemType {
    return this._politicalSystemType;
  }
  set politicalSystemType(value: PoliticalSystemType) {
    this._politicalSystemType = value;
  }

  get shipyard(): Shipyard | null {
    return this._shipyardId === ShipyardId.NA ? null : Consts.Shipyards[this._shipyardId]!;
  }

  get shipyardId(): ShipyardId {
    return this._shipyardId;
  }
  set shipyardId(value: ShipyardId) {
    this._shipyardId = value;
  }

  get size(): Size {
    return this._size;
  }

  get specialEvent(): SpecialEvent | null {
    return this._specialEventType === SpecialEventType.NA
      ? null
      : Consts.SpecialEvents[this._specialEventType]!;
  }

  get specialEventType(): SpecialEventType {
    return this._specialEventType;
  }
  set specialEventType(value: SpecialEventType) {
    this._specialEventType = value;
  }

  /** Unknown (Nothing) until the system has been visited. */
  get specialResource(): SpecialResource {
    return this.visited ? this._specialResource : SpecialResource.Nothing;
  }

  get systemPressure(): SystemPressure {
    return this._systemPressure;
  }
  set systemPressure(value: SystemPressure) {
    this._systemPressure = value;
  }

  get techLevel(): TechLevel {
    return this._techLevel;
  }
  set techLevel(value: TechLevel) {
    this._techLevel = value;
  }

  /** Quantity of each trade item for sale, indexed by TradeItemType. */
  get tradeItems(): number[] {
    return this._tradeItems;
  }

  get visited(): boolean {
    return this._visited;
  }
  set visited(value: boolean) {
    this._visited = value;
  }

  get x(): number {
    return this._x;
  }
  set x(value: number) {
    this._x = value;
  }

  get y(): number {
    return this._y;
  }
  set y(value: number) {
    this._y = value;
  }
}
