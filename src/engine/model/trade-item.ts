// Port of TradeItem.cs.

import {
  type SpecialResource,
  type SystemPressure,
  type TechLevel,
  TradeItemType,
  type Size,
} from '../data/enums';
import { Strings } from '../data/strings';
import { idiv } from '../math';
import type { PoliticalSystem } from './political-system';

/** The parts of a StarSystem that StandardPrice reads. StarSystem satisfies this; tests can pass a plain object. */
export interface PricedSystem {
  itemUsed(item: TradeItem): boolean;
  readonly techLevel: TechLevel;
  readonly politicalSystem: PoliticalSystem;
  readonly size: Size;
  readonly specialResource: SpecialResource;
}

export class TradeItem {
  constructor(
    readonly type: TradeItemType,
    /** Tech level needed for production. */
    readonly techProduction: TechLevel,
    /** Tech level needed to use. */
    readonly techUsage: TechLevel,
    /** Tech level which produces this item the most. */
    readonly techTopProduction: TechLevel,
    /** Medium price at lowest tech level. */
    readonly priceLowTech: number,
    /** Price increase per tech level. */
    readonly priceInc: number,
    /** Max percentage above or below calculated price. */
    readonly priceVariance: number,
    /** Price increases considerably when this event occurs. */
    readonly pressurePriceHike: SystemPressure,
    /** When this resource is available, this trade item is cheap. */
    readonly resourceLowPrice: SpecialResource,
    /** When this resource is available, this trade item is expensive. */
    readonly resourceHighPrice: SpecialResource,
    /** Minimum price to buy/sell in orbit. */
    readonly minTradePrice: number,
    /** Maximum price to buy/sell in orbit. */
    readonly maxTradePrice: number,
    /** Roundoff price for trade in orbit. */
    readonly roundOff: number,
  ) {}

  /** IComparable.CompareTo: by low-tech price, then by price increase descending. */
  compareTo(value: TradeItem | null): number {
    if (value === null) return 1;
    let compared = Math.sign(this.priceLowTech - value.priceLowTech);
    if (compared === 0) compared = -Math.sign(this.priceInc - value.priceInc);
    return compared;
  }

  standardPrice(target: PricedSystem): number {
    let price = 0;

    if (target.itemUsed(this)) {
      // Determine base price on techlevel of system
      price = this.priceLowTech + target.techLevel * this.priceInc;

      // If a good is highly requested, increase the price
      if (target.politicalSystem.wanted === this.type) price = idiv(price * 4, 3);

      // High trader activity decreases prices
      price = idiv(price * (100 - 2 * target.politicalSystem.activityTraders), 100);

      // Large system = high production decreases prices
      price = idiv(price * (100 - target.size), 100);

      // Special resources price adaptation
      if (target.specialResource === this.resourceLowPrice) price = idiv(price * 3, 4);
      else if (target.specialResource === this.resourceHighPrice) price = idiv(price * 4, 3);
    }

    return price;
  }

  get illegal(): boolean {
    return this.type === TradeItemType.Firearms || this.type === TradeItemType.Narcotics;
  }

  get name(): string {
    return Strings.TradeItemNames[this.type]!;
  }
}
