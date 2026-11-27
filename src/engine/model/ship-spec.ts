// Port of ShipSpec.cs: the specification of a ship type, and the base class of Ship.

import { Activity, EquipmentType, ShipType, Size, TechLevel } from '../data/enums';
import { Consts } from '../data/consts';
import { Strings } from '../data/strings';
import { getValueOr, type Hash } from '../serialization';

export class ShipSpec {
  private _type: ShipType;
  private _size: Size;
  private _cargoBays: number;
  private _weaponSlots: number;
  private _shieldSlots: number;
  private _gadgetSlots: number;
  private _crewQuarters: number;
  private _fuelTanks: number;
  private _fuelCost: number;
  private _hullStrength: number;
  private _repairCost: number;
  private _price: number;
  private _occurrence: number;
  private _police: Activity;
  private _pirates: Activity;
  private _traders: Activity;
  private _minTech: TechLevel;
  private _hullUpgraded = false;
  private _imageIndex: number = Consts.ShipImgUseDefault;

  // Covers both of the original's value constructors: with no arguments this is
  // the C# default constructor (a blank custom spec).
  constructor(
    type: ShipType = ShipType.Custom,
    size: Size = Size.Tiny,
    cargoBays = 0,
    weaponSlots = 0,
    shieldSlots = 0,
    gadgetSlots = 0,
    crewQuarters = 0,
    fuelTanks = 0,
    fuelCost = 0,
    hullStrength = 0,
    repairCost = 0,
    price = 0,
    occurrence = 0,
    police: Activity = Activity.NA,
    pirates: Activity = Activity.NA,
    traders: Activity = Activity.NA,
    minTechLevel: TechLevel = TechLevel.Unavailable,
  ) {
    this._type = type;
    this._size = size;
    this._cargoBays = cargoBays;
    this._weaponSlots = weaponSlots;
    this._shieldSlots = shieldSlots;
    this._gadgetSlots = gadgetSlots;
    this._crewQuarters = crewQuarters;
    this._fuelTanks = fuelTanks;
    this._fuelCost = fuelCost;
    this._hullStrength = hullStrength;
    this._repairCost = repairCost;
    this._price = price;
    this._occurrence = occurrence;
    this._police = police;
    this._pirates = pirates;
    this._traders = traders;
    this._minTech = minTechLevel;
  }

  static fromHash(hash: Hash): ShipSpec {
    const spec = new ShipSpec();
    spec.loadFromHash(hash);
    return spec;
  }

  /** The original's ShipSpec(Hashtable) constructor. Subclasses (Ship) extend it. */
  protected loadFromHash(hash: Hash): void {
    this._type = getValueOr(hash, '_type', this._type);
    this._size = getValueOr(hash, '_size', this._size);
    this._cargoBays = getValueOr(hash, '_cargoBays', this._cargoBays);
    this._weaponSlots = getValueOr(hash, '_weaponSlots', this._weaponSlots);
    this._shieldSlots = getValueOr(hash, '_shieldSlots', this._shieldSlots);
    this._gadgetSlots = getValueOr(hash, '_gadgetSlots', this._gadgetSlots);
    this._crewQuarters = getValueOr(hash, '_crewQuarters', this._crewQuarters);
    this._fuelTanks = getValueOr(hash, '_fuelTanks', this._fuelTanks);
    this._fuelCost = getValueOr(hash, '_fuelCost', this._fuelCost);
    this._hullStrength = getValueOr(hash, '_hullStrength', this._hullStrength);
    this._repairCost = getValueOr(hash, '_repairCost', this._repairCost);
    this._price = getValueOr(hash, '_price', this._price);
    this._occurrence = getValueOr(hash, '_occurrence', this._occurrence);
    this._police = getValueOr(hash, '_police', this._police);
    this._pirates = getValueOr(hash, '_pirates', this._pirates);
    this._traders = getValueOr(hash, '_traders', this._traders);
    this._minTech = getValueOr(hash, '_minTech', this._minTech);
    this._hullUpgraded = getValueOr(hash, '_hullUpgraded', this._hullUpgraded);
    this._imageIndex = getValueOr(hash, '_imageIndex', Consts.ShipImgUseDefault);

    // PORT: the original also loaded custom ship images here ("_images") when
    // ImageIndex == Custom, and recalculated Consts.ShipImageOffsets[Custom] from
    // them. Custom images belong to the ship designer, which is deferred.

    // Get the name if the ship is a custom design.
    if (this.type === ShipType.Custom) {
      Strings.ShipNames[ShipType.Custom] = getValueOr(
        hash,
        '_name',
        Strings.ShipNames[ShipType.Custom]!,
      );

      Consts.ShipSpecs[ShipType.Custom] = new ShipSpec(
        this._type,
        this._size,
        this._cargoBays,
        this._weaponSlots,
        this._shieldSlots,
        this._gadgetSlots,
        this._crewQuarters,
        this._fuelTanks,
        this._fuelCost,
        this._hullStrength,
        this._repairCost,
        this._price,
        this._occurrence,
        this._police,
        this._pirates,
        this._traders,
        this._minTech,
      );
    }
  }

  serialize(): Hash {
    const hash: Hash = {
      _type: this._type,
      _size: this._size,
      _cargoBays: this._cargoBays,
      _weaponSlots: this._weaponSlots,
      _shieldSlots: this._shieldSlots,
      _gadgetSlots: this._gadgetSlots,
      _crewQuarters: this._crewQuarters,
      _fuelTanks: this._fuelTanks,
      _fuelCost: this._fuelCost,
      _hullStrength: this._hullStrength,
      _repairCost: this._repairCost,
      _price: this._price,
      _occurrence: this._occurrence,
      _police: this._police,
      _pirates: this._pirates,
      _traders: this._traders,
      _minTech: this._minTech,
      _hullUpgraded: this._hullUpgraded,
    };

    // Only save image index if it's not the default.
    if (this._imageIndex !== Consts.ShipImgUseDefault) hash['_imageIndex'] = this._imageIndex;

    // Save the name if the ship is a custom design.
    if (this.type === ShipType.Custom) hash['_name'] = this.name;

    // PORT: custom ship images ("_images") are not saved; see loadFromHash.

    return hash;
  }

  /** Copies every value from the spec of the given ship type. */
  protected setValues(type: ShipType): void {
    const spec = Consts.ShipSpecs[type]!;

    this._type = type;
    this._size = spec._size;
    this._cargoBays = spec._cargoBays;
    this._weaponSlots = spec._weaponSlots;
    this._shieldSlots = spec._shieldSlots;
    this._gadgetSlots = spec._gadgetSlots;
    this._crewQuarters = spec._crewQuarters;
    this._fuelTanks = spec._fuelTanks;
    this._fuelCost = spec._fuelCost;
    this._hullStrength = spec._hullStrength;
    this._repairCost = spec._repairCost;
    this._price = spec._price;
    this._occurrence = spec._occurrence;
    this._police = spec._police;
    this._pirates = spec._pirates;
    this._traders = spec._traders;
    this._minTech = spec._minTech;
    this._hullUpgraded = spec._hullUpgraded;
    this._imageIndex = spec._imageIndex;
  }

  slots(type: EquipmentType): number {
    switch (type) {
      case EquipmentType.Weapon:
        return this.weaponSlots;
      case EquipmentType.Shield:
        return this.shieldSlots;
      case EquipmentType.Gadget:
        return this.gadgetSlots;
    }
  }

  get cargoBays(): number {
    return this._cargoBays;
  }
  set cargoBays(value: number) {
    this._cargoBays = value;
  }

  get crewQuarters(): number {
    return this._crewQuarters;
  }
  set crewQuarters(value: number) {
    this._crewQuarters = value;
  }

  get fuelCost(): number {
    return this._fuelCost;
  }
  set fuelCost(value: number) {
    this._fuelCost = value;
  }

  get fuelTanks(): number {
    return this._fuelTanks;
  }
  set fuelTanks(value: number) {
    this._fuelTanks = value;
  }

  get gadgetSlots(): number {
    return this._gadgetSlots;
  }
  set gadgetSlots(value: number) {
    this._gadgetSlots = value;
  }

  /** Includes the Scarab quest's hull upgrade, if performed. */
  get hullStrength(): number {
    return this._hullStrength + (this.hullUpgraded ? Consts.HullUpgrade : 0);
  }
  set hullStrength(value: number) {
    this._hullStrength = value;
  }

  get hullUpgraded(): boolean {
    return this._hullUpgraded;
  }
  set hullUpgraded(value: boolean) {
    this._hullUpgraded = value;
  }

  // PORT: the original's Image, ImageDamaged, ImageWithShields and
  // ImageDamagedWithShields properties looked images up in a WinForms ImageList
  // at ImageIndex * Consts.ImagesPerShip + Consts.ShipImgOffset*. The UI does
  // that mapping now, from imageIndex.

  /** Which ship type's images to use. Defaults to this ship's own type. */
  get imageIndex(): number {
    return this._imageIndex === Consts.ShipImgUseDefault ? this.type : this._imageIndex;
  }
  set imageIndex(value: number) {
    this._imageIndex = value === this.type ? Consts.ShipImgUseDefault : value;
  }

  get minimumTechLevel(): TechLevel {
    return this._minTech;
  }

  get name(): string {
    return Strings.ShipNames[this.type]!;
  }

  get occurrence(): number {
    return this._occurrence;
  }

  get police(): Activity {
    return this._police;
  }

  get pirates(): Activity {
    return this._pirates;
  }

  get price(): number {
    return this._price;
  }
  set price(value: number) {
    this._price = value;
  }

  get repairCost(): number {
    return this._repairCost;
  }
  set repairCost(value: number) {
    this._repairCost = value;
  }

  get shieldSlots(): number {
    return this._shieldSlots;
  }
  set shieldSlots(value: number) {
    this._shieldSlots = value;
  }

  get size(): Size {
    return this._size;
  }
  set size(value: Size) {
    this._size = value;
  }

  get traders(): Activity {
    return this._traders;
  }

  get type(): ShipType {
    return this._type;
  }

  get weaponSlots(): number {
    return this._weaponSlots;
  }
  set weaponSlots(value: number) {
    this._weaponSlots = value;
  }
}
