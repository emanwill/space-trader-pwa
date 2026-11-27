// Port of Ship.cs: a ship in play (the commander's, an opponent's, or a quest ship).

import { Consts } from '../data/consts';
import {
  CrewMemberId,
  Difficulty,
  EquipmentType,
  GadgetType,
  OpponentType,
  ShieldType,
  ShipType,
  SkillType,
  StarSystemId,
  WeaponType,
} from '../data/enums';
import { Strings } from '../data/strings';
import { formatList, formatNumber, stringVars } from '../format';
import { adjustSkillForDifficulty, distance } from '../functions';
import { currentCommander, currentGame } from '../game-context';
import { idiv, toInt } from '../math';
import { getRandom } from '../rng';
import { getValue, getValueOr, type Hash } from '../serialization';
import type { CrewMember } from './crew-member';
import type { Equipment } from './equipment';
import { Gadget } from './gadget';
import { Shield } from './shield';
import { ShipSpec } from './ship-spec';
import { SpecialEvent } from './special-event';
import { Weapon } from './weapon';

export class Ship extends ShipSpec {
  private _fuel = 0;
  private _hull = 0;
  private _tribbles = 0;
  private _cargo: number[] = new Array<number>(10).fill(0);
  private _weapons: (Weapon | null)[] = [];
  private _shields: (Shield | null)[] = [];
  private _gadgets: (Gadget | null)[] = [];
  private _crew: (CrewMember | null)[] = [];
  private _pod = false;

  // The following does not need to be saved. It's more of a temp variable.
  private _tradeableItems: boolean[] | null = null;

  /**
   * C# `new Ship(ShipType)`. With no type, the ship is left blank for
   * forOpponent and fromHash to fill in, as the C# overloads do.
   */
  constructor(type?: ShipType) {
    super();
    if (type !== undefined) this.setValues(type);
  }

  /** C# `new Ship(OpponentType)`: generates a random opponent for the current encounter. */
  static forOpponent(oppType: OpponentType): Ship {
    const ship = new Ship();
    const game = currentGame();

    if (oppType === OpponentType.FamousCaptain) {
      ship.setValues(Consts.ShipSpecs[Consts.MaxShip]!.type);
      for (let i = 0; i < ship.shields.length; i++)
        ship.addEquipment(Consts.Shields[ShieldType.Reflective]!);
      for (let i = 0; i < ship.weapons.length; i++)
        ship.addEquipment(Consts.Weapons[WeaponType.MilitaryLaser]!);
      ship.addEquipment(Consts.Gadgets[GadgetType.NavigatingSystem]!);
      ship.addEquipment(Consts.Gadgets[GadgetType.TargetingSystem]!);
      ship.crew[0] = game.mercenaries[CrewMemberId.FamousCaptain]!;
    } else if (oppType === OpponentType.Bottle) {
      ship.setValues(ShipType.Bottle);
    } else {
      const tries =
        oppType === OpponentType.Mantis
          ? game.difficulty + 1
          : Math.max(
              1,
              idiv(currentCommander().worth, 150000) + game.difficulty - Difficulty.Normal,
            );

      ship.generateOpponentShip(oppType);
      ship.generateOpponentAddCrew();
      ship.generateOpponentAddGadgets(tries);
      ship.generateOpponentAddShields(tries);
      ship.generateOpponentAddWeapons(tries);

      if (oppType !== OpponentType.Mantis) ship.generateOpponentSetHullStrength();

      if (oppType !== OpponentType.Police)
        ship.generateOpponentAddCargo(oppType === OpponentType.Pirate);
    }

    return ship;
  }

  static override fromHash(hash: Hash): Ship {
    const ship = new Ship();
    ship.loadFromHash(hash);
    return ship;
  }

  protected override loadFromHash(hash: Hash): void {
    super.loadFromHash(hash);

    this._fuel = getValue(hash, '_fuel');
    this._hull = getValue(hash, '_hull');
    this._tribbles = getValueOr(hash, '_tribbles', this._tribbles);
    this._cargo = [...getValueOr(hash, '_cargo', this._cargo)];
    this._weapons = getValue<(Hash | null)[]>(hash, '_weapons').map((h) =>
      h === null ? null : Weapon.fromHash(h),
    );
    this._shields = getValue<(Hash | null)[]>(hash, '_shields').map((h) =>
      h === null ? null : Shield.fromHash(h),
    );
    this._gadgets = getValue<(Hash | null)[]>(hash, '_gadgets').map((h) =>
      h === null ? null : Gadget.fromHash(h),
    );
    this._pod = getValueOr(hash, '_pod', this._pod);

    const crewIds = getValue<CrewMemberId[]>(hash, '_crewIds');
    const mercenaries = currentGame().mercenaries;
    this._crew = crewIds.map((id) => (id === CrewMemberId.NA ? null : mercenaries[id]!));
  }

  /** Puts a copy of the item in the first free slot of its type, if there is one. */
  addEquipment(item: Equipment): void {
    const equip = this.equipmentByType(item.equipmentType);

    let slot = -1;
    for (let i = 0; i < equip.length && slot === -1; i++) if (equip[i] === null) slot = i;

    if (slot >= 0) equip[slot] = item.clone();
  }

  baseWorth(forInsurance: boolean): number {
    let price =
      // Trade-in value is three-fourths the original price
      idiv(this.price * (this.tribbles > 0 && !forInsurance ? 1 : 3), 4) -
      // subtract repair costs
      (this.hullStrength - this.hull) * this.repairCost -
      // subtract costs to fill tank with fuel
      (this.fuelTanks - this.fuel) * this.fuelCost;

    // Add 3/4 of the price of each item of equipment
    for (const weapon of this._weapons) if (weapon !== null) price += weapon.sellPrice;
    for (const shield of this._shields) if (shield !== null) price += shield.sellPrice;
    for (const gadget of this._gadgets) if (gadget !== null) price += gadget.sellPrice;

    return price;
  }

  bounty(): number {
    let price = this.price;

    for (const weapon of this.weapons) if (weapon !== null) price += weapon.price;
    for (const shield of this.shields) if (shield !== null) price += shield.price;

    // Gadgets aren't counted in the price, because they are already taken into account in
    // the skill adjustment of the price.

    price = idiv(price * (2 * this.pilot + this.engineer + 3 * this.fighter), 60);

    // Divide by 200 to get the bounty, then round down to the nearest 25.
    const bounty = idiv(idiv(price, 200), 25) * 25;

    return Math.max(25, Math.min(2500, bounty));
  }

  equipmentByType(type: EquipmentType): (Equipment | null)[] {
    switch (type) {
      case EquipmentType.Weapon:
        return this.weapons;
      case EquipmentType.Shield:
        return this.shields;
      case EquipmentType.Gadget:
        return this.gadgets;
    }
  }

  fire(crewId: CrewMemberId): void {
    const skill = this.trader;
    let found = false;
    let merc: CrewMember | null = null;

    for (let i = 0; i < this.crew.length; i++) {
      if (this.crew[i] !== null && this.crew[i]!.id === crewId) {
        found = true;
        merc = this.crew[i]!;
      }

      if (found) this.crew[i] = i < this.crew.length - 1 ? (this.crew[i + 1] ?? null) : null;
    }

    const game = currentGame();
    const cmdr = currentCommander();

    if (this.trader !== skill) game.recalculateBuyPrices(cmdr.currentSystem!);

    if (merc !== null && !Consts.SpecialCrewMemberIds.includes(merc.id)) {
      const universe = game.universe;

      // The leaving Mercenary travels to a nearby random system.
      merc.currentSystemId = StarSystemId.NA;
      while (merc.currentSystemId === StarSystemId.NA) {
        const system = universe[getRandom(universe.length)]!;
        if (distance(system, cmdr.currentSystem!) < Consts.MaxRange)
          merc.currentSystemId = system.id;
      }
    }
  }

  private generateOpponentAddCargo(pirate: boolean): void {
    if (this.cargoBays > 0) {
      const diff = currentGame().difficulty;
      let baysToFill = this.cargoBays;

      if (diff >= Difficulty.Normal) baysToFill = Math.min(15, 3 + getRandom(baysToFill - 5));

      if (pirate) {
        if (diff < Difficulty.Normal) baysToFill = idiv(baysToFill * 4, 5);
        else baysToFill = Math.max(1, idiv(baysToFill, diff));
      }

      for (let bays: number, i = 0; i < baysToFill; i += bays) {
        const item = getRandom(Consts.TradeItems.length);
        bays = Math.min(baysToFill - i, 1 + getRandom(10 - item));
        this.cargo[item]! += bays;
      }
    }
  }

  private generateOpponentAddCrew(): void {
    const game = currentGame();
    const mercs = game.mercenaries;
    const diff = game.difficulty;

    const captain = mercs[CrewMemberId.Opponent]!;
    this.crew[0] = captain;
    captain.pilot = 1 + getRandom(Consts.MaxSkill);
    captain.fighter = 1 + getRandom(Consts.MaxSkill);
    captain.trader = 1 + getRandom(Consts.MaxSkill);

    if (game.warpSystem!.id === StarSystemId.Kravat && this.wildOnBoard && getRandom(10) < diff + 1)
      captain.engineer = Consts.MaxSkill;
    else captain.engineer = 1 + getRandom(Consts.MaxSkill);

    let numCrew = 0;
    if (diff === Difficulty.Impossible) numCrew = this.crewQuarters;
    else {
      numCrew = 1 + getRandom(this.crewQuarters);
      if (diff === Difficulty.Hard && numCrew < this.crewQuarters) numCrew++;
    }

    for (let i = 1; i < numCrew; i++) {
      // Keep getting a new random mercenary until we have a non-special one.
      while (this.crew[i] == null || Consts.SpecialCrewMemberIds.includes(this.crew[i]!.id))
        this.crew[i] = mercs[getRandom(mercs.length)]!;
    }
  }

  private generateOpponentAddGadgets(tries: number): void {
    if (this.gadgetSlots > 0) {
      let numGadgets = 0;

      if (currentGame().difficulty === Difficulty.Impossible) numGadgets = this.gadgetSlots;
      else {
        numGadgets = getRandom(this.gadgetSlots + 1);
        if (numGadgets < this.gadgetSlots && (tries > 4 || (tries > 2 && getRandom(2) > 0)))
          numGadgets++;
      }

      for (let i = 0; i < numGadgets; i++) {
        let bestGadgetType = 0;
        for (let j = 0; j < tries; j++) {
          const x = getRandom(100);
          let sum = Consts.Gadgets[0]!.chance;
          let gadgetType = 0;
          while (sum < x && gadgetType <= Consts.Gadgets.length - 1) {
            gadgetType++;
            sum += Consts.Gadgets[gadgetType]!.chance;
          }
          if (!this.hasGadget(Consts.Gadgets[gadgetType]!.type) && gadgetType > bestGadgetType)
            bestGadgetType = gadgetType;
        }

        this.addEquipment(Consts.Gadgets[bestGadgetType]!);
      }
    }
  }

  private generateOpponentAddShields(tries: number): void {
    if (this.shieldSlots > 0) {
      let numShields = 0;

      if (currentGame().difficulty === Difficulty.Impossible) numShields = this.shieldSlots;
      else {
        numShields = getRandom(this.shieldSlots + 1);
        if (numShields < this.shieldSlots && (tries > 3 || (tries > 1 && getRandom(2) > 0)))
          numShields++;
      }

      for (let i = 0; i < numShields; i++) {
        let bestShieldType = 0;
        for (let j = 0; j < tries; j++) {
          const x = getRandom(100);
          let sum = Consts.Shields[0]!.chance;
          let shieldType = 0;
          while (sum < x && shieldType <= Consts.Shields.length - 1) {
            shieldType++;
            sum += Consts.Shields[shieldType]!.chance;
          }
          if (!this.hasShield(Consts.Shields[shieldType]!.type) && shieldType > bestShieldType)
            bestShieldType = shieldType;
        }

        this.addEquipment(Consts.Shields[bestShieldType]!);

        const shield = this.shields[i]!;
        shield.charge = 0;
        for (let j = 0; j < 5; j++) {
          const charge = 1 + getRandom(shield.power);
          if (charge > shield.charge) shield.charge = charge;
        }
      }
    }
  }

  private generateOpponentAddWeapons(tries: number): void {
    if (this.weaponSlots > 0) {
      let numWeapons = 0;

      if (currentGame().difficulty === Difficulty.Impossible) numWeapons = this.weaponSlots;
      else if (this.weaponSlots === 1) numWeapons = 1;
      else {
        numWeapons = 1 + getRandom(this.weaponSlots);
        if (numWeapons < this.weaponSlots && (tries > 4 || (tries > 3 && getRandom(2) > 0)))
          numWeapons++;
      }

      for (let i = 0; i < numWeapons; i++) {
        let bestWeaponType = 0;
        for (let j = 0; j < tries; j++) {
          const x = getRandom(100);
          let sum = Consts.Weapons[0]!.chance;
          let weaponType = 0;
          while (sum < x && weaponType <= Consts.Weapons.length - 1) {
            weaponType++;
            sum += Consts.Weapons[weaponType]!.chance;
          }
          if (!this.hasWeapon(weaponType, true) && weaponType > bestWeaponType)
            bestWeaponType = weaponType;
        }

        this.addEquipment(Consts.Weapons[bestWeaponType]!);
      }
    }
  }

  private generateOpponentSetHullStrength(): void {
    // If there are shields, the hull will probably be stronger
    if (this.shieldStrength === 0 || getRandom(5) === 0) {
      this.hull = 0;

      for (let i = 0; i < 5; i++) {
        const hull = 1 + getRandom(this.hullStrength);
        if (hull > this.hull) this.hull = hull;
      }
    }
  }

  private generateOpponentShip(oppType: OpponentType): void {
    const game = currentGame();
    const cmdr = currentCommander();
    const polSys = game.warpSystem!.politicalSystem;

    if (oppType === OpponentType.Mantis) this.setValues(ShipType.Mantis);
    else {
      let oppShipType: ShipType;
      let tries = 1;

      switch (oppType) {
        case OpponentType.Pirate:
          // Pirates become better when you get richer
          tries = 1 + idiv(cmdr.worth, 100000);
          tries = Math.max(1, tries + game.difficulty - Difficulty.Normal);
          break;
        case OpponentType.Police:
          // The police will try to hunt you down with better ships if you are
          // a villain, and they will try even harder when you are considered to
          // be a psychopath (or are transporting Jonathan Wild)
          if (cmdr.policeRecordScore < Consts.PoliceRecordScorePsychopath || cmdr.ship.wildOnBoard)
            tries = 5;
          else if (cmdr.policeRecordScore < Consts.PoliceRecordScoreVillain) tries = 3;
          else tries = 1;
          tries = Math.max(1, tries + game.difficulty - Difficulty.Normal);
          break;
      }

      if (oppType === OpponentType.Trader) oppShipType = ShipType.Flea;
      else oppShipType = ShipType.Gnat;

      let total = 0;
      for (let i = 0; i < Consts.MaxShip; i++) {
        const spec = Consts.ShipSpecs[i]!;
        if (polSys.shipTypeLikely(spec.type, oppType)) total += spec.occurrence;
      }

      for (let i = 0; i < tries; i++) {
        const x = getRandom(total);
        let sum = -1;
        let j = -1;

        do {
          j++;
          if (polSys.shipTypeLikely(Consts.ShipSpecs[j]!.type, oppType)) {
            if (sum > 0) sum += Consts.ShipSpecs[j]!.occurrence;
            else sum = Consts.ShipSpecs[j]!.occurrence;
          }
        } while (sum < x && j < Consts.MaxShip);

        if (j > oppShipType) oppShipType = Consts.ShipSpecs[j]!.type;
      }

      this.setValues(oppShipType);
    }
  }

  // Returns the index of a trade good that is on a given ship that can be
  // bought/sold in the current system.
  // JAF - Made this MUCH simpler by storing an array of booleans indicating
  // the tradeable goods when HasTradeableItem is called.
  getRandomTradeableItem(): number {
    const tradeable = this.tradeableItems;
    let index = getRandom(tradeable.length);

    while (!tradeable[index]) index = (index + 1) % tradeable.length;

    return index;
  }

  hasCrew(id: CrewMemberId): boolean {
    let found = false;

    for (let i = 0; i < this.crew.length && !found; i++) {
      if (this.crew[i] !== null && this.crew[i]!.id === id) found = true;
    }

    return found;
  }

  hasEquipment(item: Equipment): boolean {
    let found = false;

    switch (item.equipmentType) {
      case EquipmentType.Weapon:
        found = this.hasWeapon((item as Weapon).type, true);
        break;
      case EquipmentType.Shield:
        found = this.hasShield((item as Shield).type);
        break;
      case EquipmentType.Gadget:
        found = this.hasGadget((item as Gadget).type);
        break;
    }

    return found;
  }

  hasGadget(gadgetType: GadgetType): boolean {
    let found = false;

    for (let i = 0; i < this.gadgets.length && !found; i++) {
      if (this.gadgets[i] !== null && this.gadgets[i]!.type === gadgetType) found = true;
    }

    return found;
  }

  hasShield(shieldType: ShieldType): boolean {
    let found = false;

    for (let i = 0; i < this.shields.length && !found; i++) {
      if (this.shields[i] !== null && this.shields[i]!.type === shieldType) found = true;
    }

    return found;
  }

  // Determines if a given ship is carrying items that can be bought or sold
  // in the current system.
  hasTradeableItems(): boolean {
    const game = currentGame();
    let found = false;
    const criminal = currentCommander().policeRecordScore < Consts.PoliceRecordScoreDubious;
    this._tradeableItems = new Array<boolean>(10).fill(false);

    for (let i = 0; i < this.cargo.length; i++) {
      // Trade only if trader is selling and the item has a buy price on the
      // local system, or trader is buying, and there is a sell price on the
      // local system.
      // Criminals can only buy or sell illegal goods, Noncriminals cannot buy
      // or sell such items.
      // Simplified this - JAF
      if (
        this.cargo[i]! > 0 &&
        criminal === Consts.TradeItems[i]!.illegal &&
        ((!this.commandersShip && game.priceCargoBuy[i]! > 0) ||
          (this.commandersShip && game.priceCargoSell[i]! > 0))
      ) {
        found = true;
        this._tradeableItems[i] = true;
      }
    }

    return found;
  }

  /** With exactCompare false, any better weapon (a higher WeaponType) also counts. */
  hasWeapon(weaponType: WeaponType, exactCompare: boolean): boolean {
    let found = false;

    for (let i = 0; i < this.weapons.length && !found; i++) {
      const weapon = this.weapons[i];
      if (
        weapon != null &&
        (weapon.type === weaponType || (!exactCompare && weapon.type > weaponType))
      )
        found = true;
    }

    return found;
  }

  hire(merc: CrewMember): void {
    const skill = this.trader;

    let slot = -1;
    for (let i = 0; i < this.crew.length && slot === -1; i++) if (this.crew[i] === null) slot = i;

    if (slot >= 0) this.crew[slot] = merc;

    if (this.trader !== skill)
      currentGame().recalculateBuyPrices(currentCommander().currentSystem!);
  }

  illegalSpecialCargoActions(): string {
    const actions: string[] = [];

    if (this.reactorOnBoard) actions.push(Strings.EncounterPoliceSurrenderReactor);
    else if (this.wildOnBoard) actions.push(Strings.EncounterPoliceSurrenderWild);

    if (this.sculptureOnBoard) actions.push(Strings.EncounterPoliceSurrenderSculpt);

    return actions.length === 0
      ? ''
      : stringVars(Strings.EncounterPoliceSurrenderAction, formatList(actions));
  }

  illegalSpecialCargoDescription(
    wrapper: string,
    includePassengers: boolean,
    includeTradeItems: boolean,
  ): string {
    const items: string[] = [];

    if (includePassengers && this.wildOnBoard) items.push(Strings.EncounterPoliceSubmitWild);

    if (this.reactorOnBoard) items.push(Strings.EncounterPoliceSubmitReactor);

    if (this.sculptureOnBoard) items.push(Strings.EncounterPoliceSubmitSculpture);

    if (includeTradeItems && this.detectableIllegalCargo)
      items.push(Strings.EncounterPoliceSubmitGoods);

    let allItems = formatList(items);

    if (allItems.length > 0 && wrapper.length > 0) allItems = stringVars(wrapper, allItems);

    return allItems;
  }

  performRepairs(): void {
    // A disabled ship cannot be repaired.
    if (this.commandersShip || !currentGame().opponentDisabled) {
      // Engineer may do some repairs
      let repairs = getRandom(this.engineer);
      if (repairs > 0) {
        const used = Math.min(repairs, this.hullStrength - this.hull);
        this.hull += used;
        repairs -= used;
      }

      // Shields are easier to repair
      if (repairs > 0) {
        repairs *= 2;
        for (let i = 0; i < this.shields.length && repairs > 0; i++) {
          const shield = this.shields[i];
          if (shield != null) {
            const used = Math.min(repairs, shield.power - shield.charge);
            shield.charge += used;
            repairs -= used;
          }
        }
      }
    }
  }

  /** Removes the equipment in a slot and moves the later ones up. */
  removeEquipment(type: EquipmentType, slot: number): void {
    const equip = this.equipmentByType(type);
    const last = equip.length - 1;

    for (let i = slot; i < last; i++) equip[i] = equip[i + 1] ?? null;

    equip[last] = null;
  }

  // PORT: the C# overloaded RemoveEquipment(type, object subType). Both
  // overloads take a number in TypeScript, so this one has its own name.
  /** Removes the first item of the given subtype (a WeaponType, ShieldType or GadgetType). */
  removeEquipmentBySubType(type: EquipmentType, subType: number): void {
    let found = false;
    const equip = this.equipmentByType(type);

    for (let i = 0; i < equip.length && !found; i++) {
      if (equip[i] != null && equip[i]!.typeEquals(subType)) {
        this.removeEquipment(type, i);
        found = true;
      }
    }
  }

  removeIllegalGoods(): void {
    const priceCargo = currentCommander().priceCargo;

    for (let i = 0; i < Consts.TradeItems.length; i++) {
      if (Consts.TradeItems[i]!.illegal) {
        this.cargo[i] = 0;
        priceCargo[i] = 0;
      }
    }
  }

  override serialize(): Hash {
    // We don't want the actual CrewMember objects - we just want the ids.
    const crewIds = this._crew.map((crew) => (crew === null ? CrewMemberId.NA : crew.id));

    return {
      ...super.serialize(),
      _fuel: this._fuel,
      _hull: this._hull,
      _tribbles: this._tribbles,
      _cargo: [...this._cargo],
      _weapons: this._weapons.map((w) => (w === null ? null : w.serialize())),
      _shields: this._shields.map((s) => (s === null ? null : s.serialize())),
      _gadgets: this._gadgets.map((g) => (g === null ? null : g.serialize())),
      _crewIds: crewIds,
      _pod: this._pod,
    };
  }

  protected override setValues(type: ShipType): void {
    super.setValues(type);

    this._weapons = new Array<Weapon | null>(this.weaponSlots).fill(null);
    this._shields = new Array<Shield | null>(this.shieldSlots).fill(null);
    this._gadgets = new Array<Gadget | null>(this.gadgetSlots).fill(null);
    this._crew = new Array<CrewMember | null>(this.crewQuarters).fill(null);
    this._fuel = this.fuelTanks;
    this._hull = this.hullStrength;
  }

  /** Total power of the weapons whose type is between min and max (inclusive). Defaults to all. */
  weaponStrength(
    min: WeaponType = WeaponType.PulseLaser,
    max: WeaponType = WeaponType.QuantumDistruptor,
  ): number {
    let total = 0;

    for (const weapon of this.weapons)
      if (weapon !== null && weapon.type >= min && weapon.type <= max) total += weapon.power;

    return total;
  }

  /** baseWorth plus what the commander paid for the cargo. */
  worth(forInsurance: boolean): number {
    let price = this.baseWorth(forInsurance);

    const priceCargo = currentCommander().priceCargo;
    for (let i = 0; i < this._cargo.length; i++) price += priceCargo[i]!;

    return price;
  }

  get anyIllegalCargo(): boolean {
    let illegalCargo = 0;

    for (let i = 0; i < Consts.TradeItems.length; i++) {
      if (Consts.TradeItems[i]!.illegal) illegalCargo += this.cargo[i]!;
    }

    return illegalCargo > 0;
  }

  get artifactOnBoard(): boolean {
    return (
      this.commandersShip &&
      currentGame().questStatusArtifact === SpecialEvent.StatusArtifactOnBoard
    );
  }

  /** Units of each trade item in the hold, indexed by TradeItemType. */
  get cargo(): number[] {
    return this._cargo;
  }

  // Changed the semantics of Filled versus total Cargo Bays.  Bays used for
  // transporting special items are now included in the total bays and in the
  // filled bays.  JAF
  // PORT: the C# getter also counted the cargo bay gadgets into a local
  // variable it never used; that loop is left out.
  override get cargoBays(): number {
    return super.cargoBays + this.extraCargoBays + this.hiddenCargoBays;
  }
  override set cargoBays(value: number) {
    super.cargoBays = value;
  }

  get cloaked(): boolean {
    const game = currentGame();
    const oppEng = this.commandersShip ? game.opponent.engineer : currentCommander().ship.engineer;
    return this.hasGadget(GadgetType.CloakingDevice) && this.engineer > oppEng;
  }

  get commandersShip(): boolean {
    return this === currentCommander().ship;
  }

  get crew(): (CrewMember | null)[] {
    return this._crew;
  }

  get crewCount(): number {
    let total = 0;

    for (const crew of this.crew) if (crew !== null) total++;

    return total;
  }

  /** Illegal cargo beyond what the hidden cargo bays can hold. */
  get detectableIllegalCargo(): boolean {
    let illegalCargo = 0;

    for (let i = 0; i < Consts.TradeItems.length; i++) {
      if (Consts.TradeItems[i]!.illegal) illegalCargo += this.cargo[i]!;
    }

    return illegalCargo - this.hiddenCargoBays > 0;
  }

  get detectableIllegalCargoOrPassengers(): boolean {
    return this.detectableIllegalCargo || this.illegalSpecialCargo;
  }

  get disableable(): boolean {
    return (
      !this.commandersShip &&
      this.type !== ShipType.Bottle &&
      this.type !== ShipType.Mantis &&
      this.type !== ShipType.SpaceMonster
    );
  }

  get engineer(): number {
    return this.skills[SkillType.Engineer]!;
  }

  get escapePod(): boolean {
    return this._pod;
  }
  set escapePod(value: boolean) {
    this._pod = value;
  }

  get extraCargoBays(): number {
    let bays = 0;

    for (const gadget of this.gadgets)
      if (gadget !== null && gadget.type === GadgetType.ExtraCargoBays) bays += 5;

    return bays;
  }

  get fighter(): number {
    return this.skills[SkillType.Fighter]!;
  }

  // Changed the semantics of Filled versus total Cargo Bays.  Bays used for
  // transporting special items are now included in the total bays and in the
  // filled bays.  JAF
  get filledCargoBays(): number {
    const game = currentGame();
    let filled = this.filledNormalCargoBays;

    if (this.commandersShip && game.questStatusJapori === SpecialEvent.StatusJaporiInTransit)
      filled += 10;

    if (this.reactorOnBoard) filled += 5 + 10 - idiv(game.questStatusReactor - 1, 2);

    return filled;
  }

  get filledNormalCargoBays(): number {
    let filled = 0;

    for (const units of this._cargo) filled += units;

    return filled;
  }

  get freeCargoBays(): number {
    return this.cargoBays - this.filledCargoBays;
  }

  get freeCrewQuarters(): number {
    let count = 0;

    for (const crew of this.crew) if (crew === null) count++;

    return count;
  }

  get freeSlots(): number {
    return this.freeSlotsGadget + this.freeSlotsShield + this.freeSlotsWeapon;
  }

  get freeSlotsGadget(): number {
    return this.gadgets.filter((g) => g === null).length;
  }

  get freeSlotsShield(): number {
    return this.shields.filter((s) => s === null).length;
  }

  get freeSlotsWeapon(): number {
    return this.weapons.filter((w) => w === null).length;
  }

  get fuel(): number {
    return this._fuel;
  }
  set fuel(value: number) {
    this._fuel = value;
  }

  override get fuelTanks(): number {
    return (
      super.fuelTanks + (this.hasGadget(GadgetType.FuelCompactor) ? Consts.FuelCompactorTanks : 0)
    );
  }
  override set fuelTanks(value: number) {
    super.fuelTanks = value;
  }

  get gadgets(): (Gadget | null)[] {
    return this._gadgets;
  }

  get hagglingComputerOnBoard(): boolean {
    return this.commandersShip && currentGame().questStatusJarek === SpecialEvent.StatusJarekDone;
  }

  get hiddenCargoBays(): number {
    let bays = 0;

    for (const gadget of this.gadgets)
      if (gadget !== null && gadget.type === GadgetType.HiddenCargoBays) bays += 5;

    return bays;
  }

  get hull(): number {
    return this._hull;
  }
  set hull(value: number) {
    this._hull = value;
  }

  get hullText(): string {
    return stringVars(
      Strings.EncounterHullStrength,
      formatNumber(toInt(Math.floor((100 * this.hull) / this.hullStrength))),
    );
  }

  get illegalSpecialCargo(): boolean {
    return this.wildOnBoard || this.reactorOnBoard || this.sculptureOnBoard;
  }

  get jarekOnBoard(): boolean {
    return this.hasCrew(CrewMemberId.Jarek);
  }

  get pilot(): number {
    return this.skills[SkillType.Pilot]!;
  }

  get princessOnBoard(): boolean {
    return this.hasCrew(CrewMemberId.Princess);
  }

  get reactorOnBoard(): boolean {
    const status = currentGame().questStatusReactor;
    return (
      this.commandersShip &&
      status > SpecialEvent.StatusReactorNotStarted &&
      status < SpecialEvent.StatusReactorDelivered
    );
  }

  get sculptureOnBoard(): boolean {
    return (
      this.commandersShip &&
      currentGame().questStatusSculpture === SpecialEvent.StatusSculptureInTransit
    );
  }

  get shieldCharge(): number {
    let total = 0;

    for (const shield of this.shields) if (shield !== null) total += shield.charge;

    return total;
  }

  get shields(): (Shield | null)[] {
    return this._shields;
  }

  get shieldStrength(): number {
    let total = 0;

    for (const shield of this.shields) if (shield !== null) total += shield.power;

    return total;
  }

  get shieldText(): string {
    return this.shields.length > 0 && this.shields[0] !== null
      ? stringVars(
          Strings.EncounterShieldStrength,
          formatNumber(toInt(Math.floor((100 * this.shieldCharge) / this.shieldStrength))),
        )
      : Strings.EncounterShieldNone;
  }

  /** The ship's effective skills, indexed by SkillType: the best crew member's, adjusted for difficulty and gadgets. */
  get skills(): number[] {
    const skills = [0, 0, 0, 0];

    // Get the best skill value among the crew for each skill.
    for (let skill = 0; skill < skills.length; skill++) {
      let max = 1;

      for (const crew of this.crew) {
        if (crew !== null && crew.skills[skill]! > max) max = crew.skills[skill]!;
      }

      skills[skill] = Math.max(1, adjustSkillForDifficulty(max));
    }

    // Adjust skills based on any gadgets on board.
    for (const gadget of this.gadgets) {
      if (gadget !== null && gadget.skillBonus !== SkillType.NA)
        skills[gadget.skillBonus]! += Consts.SkillBonus;
    }

    return skills;
  }

  // Crew members that are not hired/fired - Commander, Jarek, Princess, and Wild - JAF
  get specialCrew(): CrewMember[] {
    return this.crew.filter(
      (crew): crew is CrewMember => crew !== null && Consts.SpecialCrewMemberIds.includes(crew.id),
    );
  }

  // Sort all cargo based on value and put some of it in hidden bays, if they are present.
  /** One entry (a TradeItemType) per unit of cargo pirates can find, most expensive first. */
  get stealableCargo(): number[] {
    // Put all of the cargo items in a list and sort it. Reverse it so the most expensive items are first.
    const tradeItems: number[] = [];

    for (let tradeItem = 0; tradeItem < this.cargo.length; tradeItem++) {
      for (let count = 0; count < this.cargo[tradeItem]!; count++) tradeItems.push(tradeItem);
    }

    tradeItems.sort((a, b) => a - b);
    tradeItems.reverse();

    let hidden = this.hiddenCargoBays;
    if (this.princessOnBoard) hidden--;
    if (this.sculptureOnBoard) hidden--;

    // PORT: the C# ArrayList.RemoveRange threw when there were more hidden bays
    // than units of cargo, which happened when pirates raided a ship
    // with hidden bays and little cargo (an unhandled exception). splice removes what there is, so the
    // pirates find nothing.
    if (hidden > 0) tradeItems.splice(0, hidden);

    return tradeItems;
  }

  /** Set by hasTradeableItems(), indexed by TradeItemType. */
  get tradeableItems(): boolean[] {
    if (this._tradeableItems === null) throw new Error('hasTradeableItems() has not been called');
    return this._tradeableItems;
  }

  get trader(): number {
    return this.skills[SkillType.Trader]! + (this.hagglingComputerOnBoard ? 1 : 0);
  }

  get tribbles(): number {
    return this._tribbles;
  }
  set tribbles(value: number) {
    this._tribbles = value;
  }

  get weapons(): (Weapon | null)[] {
    return this._weapons;
  }

  get wildOnBoard(): boolean {
    return this.hasCrew(CrewMemberId.Wild);
  }
}
