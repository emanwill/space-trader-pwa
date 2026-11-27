// Port of Gadget.cs.

import { EquipmentType, type GadgetType, SkillType, type TechLevel } from '../data/enums';
import { Strings } from '../data/strings';
import { getValue, getValueOr, type Hash } from '../serialization';
import { Equipment } from './equipment';

export class Gadget extends Equipment {
  constructor(
    readonly type: GadgetType,
    readonly skillBonus: SkillType,
    price: number,
    minTechLevel: TechLevel,
    chance: number,
  ) {
    super(EquipmentType.Gadget, price, minTechLevel, chance);
  }

  static fromHash(hash: Hash): Gadget {
    return new Gadget(
      getValue(hash, '_type'),
      getValueOr(hash, '_skillBonus', SkillType.NA),
      getValue(hash, '_price'),
      getValue(hash, '_minTech'),
      getValue(hash, '_chance'),
    );
  }

  override clone(): Gadget {
    return new Gadget(this.type, this.skillBonus, this._price, this._minTech, this._chance);
  }

  override serialize(): Hash {
    return {
      ...super.serialize(),
      _type: this.type,
      _skillBonus: this.skillBonus,
    };
  }

  override typeEquals(type: number): boolean {
    return this.type === type;
  }

  override get name(): string {
    return Strings.GadgetNames[this.type]!;
  }

  override get subType(): number {
    return this.type;
  }
}
