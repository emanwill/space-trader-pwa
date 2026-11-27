// Port of Shipyard.cs: a shipyard where the player can design a custom ship.
// The ship designer UI is deferred, but the logic is ported so saves and the
// data tables are complete.

import { ShipType, Size, type ShipyardId, ShipyardSkill } from '../data/enums';
import { Consts } from '../data/consts';
import { Strings } from '../data/strings';
import { currentGame } from '../game-context';
import { idiv } from '../math';
import type { ShipSpec } from './ship-spec';

export class Shipyard {
  // Indexed by Size: Tiny, Small, Medium, Large, Huge, Gargantuan.
  static readonly COST_FUEL = [1, 1, 1, 3, 5, 10];
  static readonly COST_HULL = [1, 5, 10, 15, 20, 40];
  static readonly BASE_FUEL = [15, 14, 13, 12, 11, 10];
  static readonly BASE_HULL = [10, 25, 50, 100, 150, 200];
  static readonly DESIGN_FEE = [2000, 5000, 10000, 20000, 40000, 100000];
  static readonly MAX_UNITS = [50, 100, 150, 200, 250, 999];
  static readonly PER_UNIT_FUEL = [3, 2, 1, 1, 1, 1];
  static readonly PER_UNIT_HULL = [35, 30, 25, 20, 15, 10];
  static readonly PRICE_PER_UNIT = [75, 250, 500, 750, 1000, 1200];
  static readonly UNITS_CREW = [20, 20, 20, 20, 20, 20];
  static readonly UNITS_FUEL = [1, 1, 1, 5, 10, 15];
  static readonly UNITS_GADGET = [5, 5, 5, 5, 5, 5];
  static readonly UNITS_HULL = [1, 2, 3, 4, 5, 6];
  static readonly UNITS_SHIELD = [10, 10, 10, 8, 8, 8];
  static readonly UNITS_WEAPON = [15, 15, 15, 10, 10, 10];

  // Fee and Price Per Unit 10% less for the specialty size, and 10% more for sizes more than 1 away
  // from the specialty size.
  static readonly ADJUST_SIZE_DEFAULT = 100;
  static readonly ADJUST_SIZE_SPECIALTY = 90;
  static readonly ADJUST_SIZE_WEAKNESS = 110;

  // One of the costs will be adjusted based on the shipyard's skill.
  static readonly ADJUST_SKILL_CREW = 2;
  static readonly ADJUST_SKILL_FUEL = 2;
  static readonly ADJUST_SKILL_HULL = 5;
  static readonly ADJUST_SKILL_SHIELD = 2;
  static readonly ADJUST_SKILL_WEAPON = 2;

  // There is a crowding penalty for coming too close to the maximum. A modest penalty is imposed at
  // one level, and a more severe penalty at a higher level.
  static readonly PENALTY_FIRST_PCT = 80;
  static readonly PENALTY_FIRST_FEE = 25;
  static readonly PENALTY_SECOND_PCT = 90;
  static readonly PENALTY_SECOND_FEE = 75;

  private modCrew = 0;
  private modFuel = 0;
  private modHull = 0;
  private modShield = 0;
  private modWeapon = 0;

  constructor(
    readonly id: ShipyardId,
    readonly specialtySize: Size,
    readonly skill: ShipyardSkill,
  ) {
    switch (skill) {
      case ShipyardSkill.CrewQuarters:
        this.modCrew = Shipyard.ADJUST_SKILL_CREW;
        break;
      case ShipyardSkill.FuelBase:
        this.modFuel = Shipyard.ADJUST_SKILL_FUEL;
        break;
      case ShipyardSkill.HullPerUnit:
        this.modHull = Shipyard.ADJUST_SKILL_HULL;
        break;
      case ShipyardSkill.ShieldSlotUnits:
        this.modShield = Shipyard.ADJUST_SKILL_SHIELD;
        break;
      case ShipyardSkill.WeaponSlotUnits:
        this.modWeapon = Shipyard.ADJUST_SKILL_WEAPON;
        break;
    }
  }

  /** Calculates the ship's price (worth here, not the price paid), the fuel cost, and the repair cost. */
  calculateDependantVariables(): void {
    this.shipSpec.price = this.basePrice + this.penaltyCost;
    this.shipSpec.fuelCost = this.costFuel;
    this.shipSpec.repairCost = this.costHull;
  }

  private bySize(table: readonly number[]): number {
    return table[this.shipSpec.size]!;
  }

  get adjustedDesignFee(): number {
    return idiv(
      this.bySize(Shipyard.DESIGN_FEE) * this.costAdjustment,
      Shipyard.ADJUST_SIZE_DEFAULT,
    );
  }

  get adjustedPenaltyCost(): number {
    return idiv(this.penaltyCost * this.costAdjustment, Shipyard.ADJUST_SIZE_DEFAULT);
  }

  get adjustedPrice(): number {
    return idiv(this.basePrice * this.costAdjustment, Shipyard.ADJUST_SIZE_DEFAULT);
  }

  get availableSizes(): Size[] {
    const list: Size[] = [];
    const begin = Math.max(Size.Tiny, this.specialtySize - 2);
    const end = Math.min(Size.Gargantuan, this.specialtySize + 2);
    for (let index = begin; index <= end; index++) list.push(index);
    return list;
  }

  get baseFuel(): number {
    return this.bySize(Shipyard.BASE_FUEL) + this.modFuel;
  }

  get baseHull(): number {
    return this.bySize(Shipyard.BASE_HULL);
  }

  get basePrice(): number {
    return this.unitsUsed * this.pricePerUnit;
  }

  get costAdjustment(): number {
    switch (Math.abs(this.specialtySize - this.shipSpec.size)) {
      case 0:
        return Shipyard.ADJUST_SIZE_SPECIALTY;
      case 1:
        return Shipyard.ADJUST_SIZE_DEFAULT;
      default:
        return Shipyard.ADJUST_SIZE_WEAKNESS;
    }
  }

  get costFuel(): number {
    return this.bySize(Shipyard.COST_FUEL);
  }

  get costHull(): number {
    return this.bySize(Shipyard.COST_HULL);
  }

  get engineer(): string {
    return Strings.ShipyardEngineers[this.id]!;
  }

  get maxUnits(): number {
    return this.bySize(Shipyard.MAX_UNITS);
  }

  get name(): string {
    return Strings.ShipyardNames[this.id]!;
  }

  get penaltyCost(): number {
    let penalty = 0;
    if (this.percentOfMaxUnits >= Shipyard.PENALTY_SECOND_PCT)
      penalty = Shipyard.PENALTY_SECOND_FEE;
    else if (this.percentOfMaxUnits >= Shipyard.PENALTY_FIRST_PCT)
      penalty = Shipyard.PENALTY_FIRST_FEE;

    return idiv(this.basePrice * penalty, 100);
  }

  get percentOfMaxUnits(): number {
    return idiv(this.unitsUsed * 100, this.maxUnits);
  }

  get perUnitFuel(): number {
    return this.bySize(Shipyard.PER_UNIT_FUEL);
  }

  get perUnitHull(): number {
    return this.bySize(Shipyard.PER_UNIT_HULL) + this.modHull;
  }

  get pricePerUnit(): number {
    return this.bySize(Shipyard.PRICE_PER_UNIT);
  }

  /** The custom ship being designed. */
  get shipSpec(): ShipSpec {
    return Consts.ShipSpecs[ShipType.Custom]!;
  }

  get totalCost(): number {
    return this.adjustedPrice + this.adjustedPenaltyCost + this.adjustedDesignFee - this.tradeIn;
  }

  get tradeIn(): number {
    return currentGame().commander!.ship.worth(false);
  }

  get unitsCrew(): number {
    return this.bySize(Shipyard.UNITS_CREW) - this.modCrew;
  }

  get unitsFuel(): number {
    return this.bySize(Shipyard.UNITS_FUEL);
  }

  get unitsGadgets(): number {
    return this.bySize(Shipyard.UNITS_GADGET);
  }

  get unitsHull(): number {
    return this.bySize(Shipyard.UNITS_HULL);
  }

  get unitsShields(): number {
    return this.bySize(Shipyard.UNITS_SHIELD) - this.modShield;
  }

  get unitsWeapons(): number {
    return this.bySize(Shipyard.UNITS_WEAPON) - this.modWeapon;
  }

  get unitsUsed(): number {
    const spec = this.shipSpec;
    return (
      spec.cargoBays +
      spec.crewQuarters * this.unitsCrew +
      Math.ceil(((spec.fuelTanks - this.baseFuel) / this.perUnitFuel) * this.unitsFuel) +
      spec.gadgetSlots * this.unitsGadgets +
      idiv(spec.hullStrength - this.baseHull, this.perUnitHull) * this.unitsHull +
      spec.shieldSlots * this.unitsShields +
      spec.weaponSlots * this.unitsWeapons
    );
  }
}
