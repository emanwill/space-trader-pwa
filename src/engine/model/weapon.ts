// Port of Weapon.cs.

import { EquipmentType, type TechLevel, type WeaponType } from '../data/enums';
import { Strings } from '../data/strings';
import { getValue, getValueOr, type Hash } from '../serialization';
import { Equipment } from './equipment';

export class Weapon extends Equipment {
  constructor(
    readonly type: WeaponType,
    readonly power: number,
    readonly disabling: boolean,
    price: number,
    minTechLevel: TechLevel,
    chance: number,
  ) {
    super(EquipmentType.Weapon, price, minTechLevel, chance);
  }

  static fromHash(hash: Hash): Weapon {
    return new Weapon(
      getValue(hash, '_type'),
      getValue(hash, '_power'),
      getValueOr(hash, '_disabling', false),
      getValue(hash, '_price'),
      getValue(hash, '_minTech'),
      getValue(hash, '_chance'),
    );
  }

  override clone(): Weapon {
    return new Weapon(
      this.type,
      this.power,
      this.disabling,
      this._price,
      this._minTech,
      this._chance,
    );
  }

  override serialize(): Hash {
    return {
      ...super.serialize(),
      _type: this.type,
      _power: this.power,
      _disabling: this.disabling,
    };
  }

  override typeEquals(type: number): boolean {
    return this.type === type;
  }

  override get name(): string {
    return Strings.WeaponNames[this.type]!;
  }

  override get subType(): number {
    return this.type;
  }
}
