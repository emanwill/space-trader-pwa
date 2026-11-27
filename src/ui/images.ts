// URLs for the original game art, converted to PNG in public/images.

import { AlertImage } from '../engine/data/alerts';
import { ShipType } from '../engine/data/enums';

const base = `${import.meta.env.BASE_URL}images/`;

export function imageUrl(name: string): string {
  return `${base}${name}.png`;
}

// The original's ship image list, by ShipSpec.ImageIndex.
const SHIP_IMAGES: Record<number, string> = {
  [ShipType.SpaceMonster]: 'sm',
  [ShipType.Dragonfly]: 'df',
  [ShipType.Mantis]: 'mantis',
  [ShipType.Scarab]: 'scarab',
  [ShipType.Bottle]: 'bottle',
  [ShipType.Custom]: 'ship10',
  [ShipType.Scorpion]: 'scorp',
};

export type ShipImageState = 'normal' | 'damaged' | 'shields' | 'shields-damaged';

const SUFFIX: Record<ShipImageState, string> = {
  normal: '',
  damaged: 'd',
  shields: 's',
  'shields-damaged': 'sd',
};

/** A ship picture (64 × 52), by ShipSpec.ImageIndex. */
export function shipImage(imageIndex: number, state: ShipImageState = 'normal'): string {
  const name = SHIP_IMAGES[imageIndex] ?? `ship${imageIndex}`;
  return imageUrl(name + SUFFIX[state]);
}

// The original's equipment image list, by Equipment.ImageIndex: weapons, shields, gadgets.
const EQUIPMENT_IMAGES = [
  'w_pulse',
  'w_beam',
  'w_military',
  'w_morgan',
  'w_photon',
  'w_quantum',
  's_energy',
  's_reflective',
  's_lightning',
  'g_bays',
  'g_repsys',
  'g_navsys',
  'g_targsys',
  'g_cloak',
  'g_fuel',
  'g_hbays',
];

export function equipmentImage(imageIndex: number): string {
  return imageUrl(EQUIPMENT_IMAGES[imageIndex] ?? 'blank');
}

const ALERT_IMAGES: Record<AlertImage, string> = {
  [AlertImage.Splash]: 'splash',
  [AlertImage.GameEndKilled]: 'destroyed',
  [AlertImage.GameEndRetired]: 'retire',
  [AlertImage.GameEndBoughtMoon]: 'moon',
  [AlertImage.GameEndBoughtMoonGirl]: 'moongirl',
};

export function alertImage(image: AlertImage): string {
  return imageUrl(ALERT_IMAGES[image]);
}
