// Port of Commander.cs: the player.

import { DialogResult } from '../data/alerts';
import { Consts } from '../data/consts';
import {
  AlertType,
  CrewMemberId,
  GadgetType,
  ShieldType,
  ShipType,
  StarSystemId,
  WeaponType,
} from '../data/enums';
import { Strings } from '../data/strings';
import { formatNumber } from '../format';
import { currentGame } from '../game-context';
import type { GameUI } from '../game-ui';
import { toInt } from '../math';
import { getValue, getValueOr, type Hash } from '../serialization';
import { CrewMember } from './crew-member';
import type { Equipment } from './equipment';
import { Ship } from './ship';
import type { ShipSpec } from './ship-spec';
import { SpecialEvent } from './special-event';

export class Commander extends CrewMember {
  private _cash = 1000;
  private _debt = 0;
  private _killsPirate = 0;
  private _killsPolice = 0;
  private _killsTrader = 0;
  private _policeRecordScore = 0;
  private _reputationScore = 0;
  private _days = 0;
  private _insurance = false;
  private _noclaim = 0;
  private _ship = new Ship(ShipType.Gnat);
  private _priceCargo: number[] = new Array<number>(10).fill(0); // Total price paid for trade goods

  constructor(baseCrewMember: CrewMember) {
    super(
      baseCrewMember.id,
      baseCrewMember.pilot,
      baseCrewMember.fighter,
      baseCrewMember.trader,
      baseCrewMember.engineer,
      baseCrewMember.currentSystemId,
    );

    // Start off with a crew of only the commander and a Pulse Laser.
    this.ship.crew[0] = this;
    this.ship.addEquipment(Consts.Weapons[WeaponType.PulseLaser]!);
  }

  static override fromHash(hash: Hash): Commander {
    // The constructor's starting ship is replaced by the saved one below.
    const commander = new Commander(
      new CrewMember(getValue(hash, '_id'), 0, 0, 0, 0, StarSystemId.NA),
    );
    commander.loadFromHash(hash);
    return commander;
  }

  protected override loadFromHash(hash: Hash): void {
    super.loadFromHash(hash);

    this._cash = getValueOr(hash, '_cash', this._cash);
    this._debt = getValueOr(hash, '_debt', this._debt);
    this._killsPirate = getValueOr(hash, '_killsPirate', this._killsPirate);
    this._killsPolice = getValueOr(hash, '_killsPolice', this._killsPolice);
    this._killsTrader = getValueOr(hash, '_killsTrader', this._killsTrader);
    this._policeRecordScore = getValueOr(hash, '_policeRecordScore', this._policeRecordScore);
    this._reputationScore = getValueOr(hash, '_reputationScore', this._reputationScore);
    this._days = getValueOr(hash, '_days', this._days);
    this._insurance = getValueOr(hash, '_insurance', this._insurance);
    this._noclaim = getValueOr(hash, '_noclaim', this._noclaim);
    this._ship = Ship.fromHash(getValueOr(hash, '_ship', this._ship.serialize()));
    this._priceCargo = [...getValueOr(hash, '_priceCargo', this._priceCargo)];

    currentGame().mercenaries[CrewMemberId.Commander] = this;

    // PORT: the saved ship's crew list is rebuilt from the mercenaries array,
    // whose commander entry was loaded as a plain CrewMember copy. The original
    // left that copy in the ship's first crew slot, so after loading a game,
    // skill changes to the commander (the Skill special event, the tonic)
    // didn't reach the ship. Put the real commander there instead.
    const crew = this._ship.crew;
    for (let i = 0; i < crew.length; i++)
      if (crew[i]?.id === CrewMemberId.Commander) crew[i] = this;

    Strings.CrewMemberNames[CrewMemberId.Commander] = getValueOr(
      hash,
      '_name',
      Strings.CrewMemberNames[CrewMemberId.Commander]!,
    );
  }

  payInterest(): void {
    if (this.debt > 0) {
      const interest = Math.max(1, toInt(this.debt * Consts.IntRate));
      if (this.cash > interest) this.cash -= interest;
      else {
        this.debt += interest - this.cash;
        this.cash = 0;
      }
    }
  }

  override serialize(): Hash {
    return {
      ...super.serialize(),
      _cash: this._cash,
      _debt: this._debt,
      _killsPirate: this._killsPirate,
      _killsPolice: this._killsPolice,
      _killsTrader: this._killsTrader,
      _policeRecordScore: this._policeRecordScore,
      _reputationScore: this._reputationScore,
      _days: this._days,
      _insurance: this._insurance,
      _noclaim: this._noclaim,
      _ship: this._ship.serialize(),
      _priceCargo: [...this._priceCargo],
      _name: this.name,
    };
  }

  /**
   * Buys a new ship, trading in the current one. Asks whether to transfer each
   * piece of special equipment that can be moved, then confirms. Returns true
   * if the trade happened.
   */
  async tradeShip(
    specToBuy: ShipSpec,
    netPrice: number,
    ui: GameUI,
    newShipName: string = specToBuy.name,
  ): Promise<boolean> {
    let traded = false;

    if (netPrice > 0 && this.debt > 0) await ui.alert(AlertType.DebtNoBuy);
    else if (netPrice > this.cashToSpend) await ui.alert(AlertType.ShipBuyIF);
    else if (specToBuy.crewQuarters < this.ship.specialCrew.length) {
      let passengers = this.ship.specialCrew[1]!.name;
      if (this.ship.specialCrew.length > 2) passengers += ' and ' + this.ship.specialCrew[2]!.name;

      await ui.alert(AlertType.ShipBuyPassengerQuarters, passengers);
    } else if (specToBuy.crewQuarters < this.ship.crewCount)
      await ui.alert(AlertType.ShipBuyCrewQuarters);
    else if (this.ship.reactorOnBoard) await ui.alert(AlertType.ShipBuyReactor);
    else {
      const special: Equipment[] = [
        Consts.Weapons[WeaponType.MorgansLaser]!,
        Consts.Weapons[WeaponType.QuantumDistruptor]!,
        Consts.Shields[ShieldType.Lightning]!,
        Consts.Gadgets[GadgetType.FuelCompactor]!,
        Consts.Gadgets[GadgetType.HiddenCargoBays]!,
      ];
      const add = new Array<boolean>(special.length).fill(false);
      let addPod = false;
      let extraCost = 0;

      for (let i = 0; i < special.length; i++) {
        const item = special[i]!;
        if (this.ship.hasEquipment(item)) {
          if (specToBuy.slots(item.equipmentType) === 0)
            await ui.alert(
              AlertType.ShipBuyNoSlots,
              newShipName,
              item.name,
              Strings.EquipmentTypes[item.equipmentType]!,
            );
          else {
            extraCost += item.transferPrice;
            add[i] = true;
          }
        }
      }

      if (this.ship.escapePod) {
        addPod = true;
        extraCost += Consts.PodTransferCost;
      }

      if (netPrice + extraCost > this.cashToSpend) await ui.alert(AlertType.ShipBuyIFTransfer);

      extraCost = 0;

      for (let i = 0; i < special.length; i++) {
        const item = special[i]!;
        if (add[i]) {
          if (netPrice + extraCost + item.transferPrice > this.cashToSpend)
            await ui.alert(AlertType.ShipBuyNoTransfer, item.name);
          else if (
            (await ui.alert(
              AlertType.ShipBuyTransfer,
              item.name,
              item.name.toLowerCase(),
              formatNumber(item.transferPrice),
            )) === DialogResult.Yes
          )
            extraCost += item.transferPrice;
          else add[i] = false;
        }
      }

      if (addPod) {
        if (netPrice + extraCost + Consts.PodTransferCost > this.cashToSpend)
          await ui.alert(AlertType.ShipBuyNoTransfer, Strings.ShipInfoEscapePod);
        else if (
          (await ui.alert(
            AlertType.ShipBuyTransfer,
            Strings.ShipInfoEscapePod,
            Strings.ShipInfoEscapePod.toLowerCase(),
            formatNumber(Consts.PodTransferCost),
          )) === DialogResult.Yes
        )
          extraCost += Consts.PodTransferCost;
        else addPod = false;
      }

      if (
        (await ui.alert(
          AlertType.ShipBuyConfirm,
          this.ship.name,
          newShipName,
          add[0] || add[1] || add[2] || addPod ? Strings.ShipBuyTransfer : '',
        )) === DialogResult.Yes
      ) {
        const oldCrew = this.ship.crew;

        this.ship = new Ship(specToBuy.type);
        this.cash -= netPrice + extraCost;

        for (let i = 0; i < Math.min(oldCrew.length, this.ship.crew.length); i++)
          this.ship.crew[i] = oldCrew[i] ?? null;

        for (let i = 0; i < special.length; i++) if (add[i]) this.ship.addEquipment(special[i]!);

        if (addPod) this.ship.escapePod = true;
        else if (this.insurance) {
          this.insurance = false;
          this.noClaim = 0;
        }

        traded = true;
      }
    }

    return traded;
  }

  get cash(): number {
    return this._cash;
  }
  set cash(value: number) {
    this._cash = value;
  }

  /** Cash, less the money held back for the day's costs when the Reserve Money option is on. */
  get cashToSpend(): number {
    const game = currentGame();
    return this._cash - (game.options.reserveMoney ? game.currentCosts : 0);
  }

  get days(): number {
    return this._days;
  }
  set days(value: number) {
    this._days = value;
  }

  get debt(): number {
    return this._debt;
  }
  set debt(value: number) {
    this._debt = value;
  }

  get insurance(): boolean {
    return this._insurance;
  }
  set insurance(value: boolean) {
    this._insurance = value;
  }

  get killsPirate(): number {
    return this._killsPirate;
  }
  set killsPirate(value: number) {
    this._killsPirate = value;
  }

  get killsPolice(): number {
    return this._killsPolice;
  }
  set killsPolice(value: number) {
    this._killsPolice = value;
  }

  get killsTrader(): number {
    return this._killsTrader;
  }
  set killsTrader(value: number) {
    this._killsTrader = value;
  }

  /** Days without an insurance claim, kept between 0 and Consts.MaxNoClaim. */
  get noClaim(): number {
    return this._noclaim;
  }
  set noClaim(value: number) {
    this._noclaim = Math.max(0, Math.min(Consts.MaxNoClaim, value));
  }

  get policeRecordScore(): number {
    return this._policeRecordScore;
  }
  set policeRecordScore(value: number) {
    this._policeRecordScore = value;
  }

  /** Total price paid for the cargo of each trade item, indexed by TradeItemType. */
  get priceCargo(): number[] {
    return this._priceCargo;
  }

  get reputationScore(): number {
    return this._reputationScore;
  }
  set reputationScore(value: number) {
    this._reputationScore = value;
  }

  get ship(): Ship {
    return this._ship;
  }
  set ship(value: Ship) {
    this._ship = value;
  }

  /**
   * Net worth. Like the original, this counts the ship at its full list price
   * (not its trade-in value), and the moon once bought.
   */
  get worth(): number {
    return (
      this.ship.price +
      this._cash -
      this._debt +
      (currentGame().questStatusMoon > 0 ? SpecialEvent.MoonCost : 0)
    );
  }
}
