// Port of Equipment.cs: base class of Weapon, Shield and Gadget.

import { EquipmentType, type TechLevel } from '../data/enums';
import { Strings } from '../data/strings';
import { currentGame } from '../game-context';
import { idiv } from '../math';
import type { Hash } from '../serialization';

export abstract class Equipment {
  protected constructor(
    protected readonly _equipType: EquipmentType,
    protected readonly _price: number,
    protected readonly _minTech: TechLevel,
    protected readonly _chance: number,
  ) {}

  abstract clone(): Equipment;

  serialize(): Hash {
    return {
      _equipType: this._equipType,
      _price: this._price,
      _minTech: this._minTech,
      _chance: this._chance,
    };
  }

  toString(): string {
    return this.name;
  }

  abstract typeEquals(type: number): boolean;

  /** Index of the first image for this equipment type in the original's equipment image list. */
  protected get baseImageIndex(): number {
    switch (this.equipmentType) {
      case EquipmentType.Gadget:
        return Strings.WeaponNames.length + Strings.ShieldNames.length;
      case EquipmentType.Shield:
        return Strings.WeaponNames.length;
      case EquipmentType.Weapon:
        return 0;
    }
  }

  // PORT: replaces the original's `Image` property, which looked the image up in
  // a WinForms ImageList. The UI maps this index to a picture.
  get imageIndex(): number {
    return this.baseImageIndex + this.subType;
  }

  get chance(): number {
    return this._chance;
  }

  get equipmentType(): EquipmentType {
    return this._equipType;
  }

  get minimumTechLevel(): TechLevel {
    return this._minTech;
  }

  abstract get name(): string;

  /** Purchase price at the current system, or 0 if it isn't sold here. */
  get price(): number {
    const cmdr = currentGame().commander;
    let price = 0;

    if (cmdr !== null && cmdr.currentSystem!.techLevel >= this.minimumTechLevel)
      price = idiv(this._price * (100 - cmdr.ship.trader), 100);

    return price;
  }

  get sellPrice(): number {
    return idiv(this._price * 3, 4);
  }

  abstract get subType(): number;

  get transferPrice(): number {
    // The cost to transfer is 10% of the item worth. This is changed
    // from actually PAYING the buyer about 8% to transfer items. - JAF
    return idiv(this.sellPrice * 110, 90);
  }
}
