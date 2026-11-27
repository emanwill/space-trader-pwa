// Port of Shield.cs.

import { EquipmentType, type ShieldType, type TechLevel } from '../data/enums';
import { Strings } from '../data/strings';
import { getValue, type Hash } from '../serialization';
import { Equipment } from './equipment';

export class Shield extends Equipment {
  /** Current shield strength; starts at full power. */
  charge: number;

  constructor(
    readonly type: ShieldType,
    readonly power: number,
    price: number,
    minTechLevel: TechLevel,
    chance: number,
  ) {
    super(EquipmentType.Shield, price, minTechLevel, chance);
    this.charge = power;
  }

  static fromHash(hash: Hash): Shield {
    const shield = new Shield(
      getValue(hash, '_type'),
      getValue(hash, '_power'),
      getValue(hash, '_price'),
      getValue(hash, '_minTech'),
      getValue(hash, '_chance'),
    );
    shield.charge = getValue(hash, '_charge');
    return shield;
  }

  override clone(): Shield {
    const shield = new Shield(this.type, this.power, this._price, this._minTech, this._chance);
    shield.charge = this.charge;
    return shield;
  }

  override serialize(): Hash {
    return {
      ...super.serialize(),
      _type: this.type,
      _power: this.power,
      _charge: this.charge,
    };
  }

  override typeEquals(type: number): boolean {
    return this.type === type;
  }

  override get name(): string {
    return Strings.ShieldNames[this.type]!;
  }

  override get subType(): number {
    return this.type;
  }
}
