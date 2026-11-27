// Game logic that the original kept in its WinForms dialogs and main window
// (Form_SpaceTrader.cs, Form_BuyFuel.cs, Form_BuyRepairs.cs, Form_ViewBank.cs,
// Form_GetLoan.cs, Form_PayBackLoan.cs, Form_Equipment.cs, Form_ShipList.cs,
// Form_ViewPersonnel.cs).
//
// PORT: the dialogs' quantity pickers are gone. Functions that bought or
// borrowed "the amount in the picker" take that amount as a parameter, clamped
// to the picker's limits; the UI chooses it. Each function names the handler
// it came from.

import { DialogResult } from './data/alerts';
import { Consts } from './data/consts';
import {
  AlertType,
  CrewMemberId,
  EquipmentType,
  GadgetType,
  GameEndType,
  ShipType,
} from './data/enums';
import { formatNumber } from './format';
import type { Game } from './game';
import { idiv } from './math';
import type { CrewMember } from './model/crew-member';
import type { Equipment } from './model/equipment';
import type { Gadget } from './model/gadget';
import { SpecialEvent } from './model/special-event';

function clamp(value: number, max: number): number {
  return Math.max(0, Math.min(max, Math.trunc(value)));
}

// #region Fuel and repairs (Form_BuyFuel.cs, Form_BuyRepairs.cs, btnFuel_Click, btnRepair_Click)

/** FormBuyFuel's limit: the most credits that can go on fuel. */
export function maxFuelPurchase(game: Game): number {
  const cmdr = game.commander;
  return Math.min(cmdr.cash, (cmdr.ship.fuelTanks - cmdr.ship.fuel) * cmdr.ship.fuelCost);
}

/** btnFuel_Click: spends up to `amount` credits on fuel, in whole units. */
export function buyFuel(game: Game, amount: number): void {
  const cmdr = game.commander;
  const toAdd = idiv(clamp(amount, maxFuelPurchase(game)), cmdr.ship.fuelCost);
  cmdr.ship.fuel += toAdd;
  cmdr.cash -= toAdd * cmdr.ship.fuelCost;
}

/** FormBuyRepairs's limit: the most credits that can go on repairs. */
export function maxRepairPurchase(game: Game): number {
  const cmdr = game.commander;
  return Math.min(cmdr.cash, (cmdr.ship.hullStrength - cmdr.ship.hull) * cmdr.ship.repairCost);
}

/** btnRepair_Click: spends up to `amount` credits on hull repairs, in whole points. */
export function buyRepairs(game: Game, amount: number): void {
  const cmdr = game.commander;
  const toAdd = idiv(clamp(amount, maxRepairPurchase(game)), cmdr.ship.repairCost);
  cmdr.ship.hull += toAdd;
  cmdr.cash -= toAdd * cmdr.ship.repairCost;
}

// #endregion

// #region Shipyard (UpdateShipyard, btnPod_Click, Form_ShipList.cs)

/** UpdateShipyard: true if the current system's tech level is too low for a shipyard. */
export function shipyardNoTech(game: Game): boolean {
  return (
    game.commander.currentSystem!.techLevel < Consts.ShipSpecs[ShipType.Flea]!.minimumTechLevel
  );
}

/** UpdateShipyard: whether the Buy Escape Pod button is shown. */
export function canBuyEscapePod(game: Game): boolean {
  const cmdr = game.commander;
  return !cmdr.ship.escapePod && !shipyardNoTech(game) && cmdr.cash >= 2000;
}

/** btnPod_Click. Returns true if the pod was bought. */
export async function buyEscapePod(game: Game): Promise<boolean> {
  if (!canBuyEscapePod(game)) return false;

  if ((await game.ui.alert(AlertType.EquipmentEscapePod)) === DialogResult.Yes) {
    game.commander.cash -= 2000;
    game.commander.ship.escapePod = true;
    return true;
  }
  return false;
}

/**
 * FormShipList.UpdateAll: the net price of each ship type (list price less the
 * current ship's trade-in value), or null where it isn't for sale here or is
 * the current ship's type.
 */
export function shipPrices(game: Game): (number | null)[] {
  const cmdr = game.commander;
  return Consts.ShipSpecs.slice(0, Consts.MaxShip + 1).map((spec) =>
    spec.minimumTechLevel > cmdr.currentSystem!.techLevel || spec.type === cmdr.ship.type
      ? null
      : spec.price - cmdr.ship.worth(false),
  );
}

/** FormShipList constructor: warns once per visit that tribbles lower the trade-in value. */
export async function shipListOpened(game: Game): Promise<void> {
  if (game.commander.ship.tribbles > 0 && !game.tribbleMessage) {
    await game.ui.alert(AlertType.TribblesTradeIn);
    game.tribbleMessage = true;
  }
}

/** FormShipList.Buy. Returns true if the ship was bought. */
export async function buyShip(game: Game, type: ShipType): Promise<boolean> {
  const price = shipPrices(game)[type];
  if (price === null || price === undefined) return false;

  if (await game.commander.tradeShip(Consts.ShipSpecs[type]!, price, game.ui)) {
    if (game.questStatusScarab === SpecialEvent.StatusScarabDone)
      game.questStatusScarab = SpecialEvent.StatusScarabNotStarted;
    return true;
  }
  return false;
}

// #endregion

// #region Equipment (Form_Equipment.cs)

/** FormEquipment.UpdateBuy: equipment for sale here (Price is 0 where the tech level is too low). */
export function equipmentForSale(): Equipment[] {
  return Consts.EquipmentForSale.filter((item) => item.price > 0);
}

/** FormEquipment.Buy. Returns true if the item was bought. */
export async function buyEquipment(game: Game, item: Equipment): Promise<boolean> {
  const cmdr = game.commander;
  const baseType = item.equipmentType;

  if (item.price <= 0) return false;

  if (
    baseType === EquipmentType.Gadget &&
    cmdr.ship.hasGadget((item as Gadget).type) &&
    (item as Gadget).type !== GadgetType.ExtraCargoBays
  )
    await game.ui.alert(AlertType.EquipmentAlreadyOwn);
  else if (cmdr.debt > 0) await game.ui.alert(AlertType.DebtNoBuy);
  else if (item.price > cmdr.cashToSpend) await game.ui.alert(AlertType.EquipmentIF);
  else if (
    (baseType === EquipmentType.Weapon && cmdr.ship.freeSlotsWeapon === 0) ||
    (baseType === EquipmentType.Shield && cmdr.ship.freeSlotsShield === 0) ||
    (baseType === EquipmentType.Gadget && cmdr.ship.freeSlotsGadget === 0)
  )
    await game.ui.alert(AlertType.EquipmentNotEnoughSlots);
  else if (
    (await game.ui.alert(AlertType.EquipmentBuy, item.name, formatNumber(item.price))) ===
    DialogResult.Yes
  ) {
    cmdr.ship.addEquipment(item);
    cmdr.cash -= item.price;
    return true;
  }
  return false;
}

/** FormEquipment.Sell: sells the item in the given slot of its type. Returns true if sold. */
export async function sellEquipment(
  game: Game,
  type: EquipmentType,
  slot: number,
): Promise<boolean> {
  const cmdr = game.commander;
  const item = cmdr.ship.equipmentByType(type)[slot];
  if (!item) return false;

  if ((await game.ui.alert(AlertType.EquipmentSell)) === DialogResult.Yes) {
    if (
      item.equipmentType === EquipmentType.Gadget &&
      ((item as Gadget).type === GadgetType.ExtraCargoBays ||
        (item as Gadget).type === GadgetType.HiddenCargoBays) &&
      cmdr.ship.freeCargoBays < 5
    )
      await game.ui.alert(AlertType.EquipmentExtraBaysInUse);
    else {
      cmdr.cash += item.sellPrice;
      cmdr.ship.removeEquipment(item.equipmentType, slot);
      return true;
    }
  }
  return false;
}

// #endregion

// #region Bank (Form_ViewBank.cs, Form_GetLoan.cs, Form_PayBackLoan.cs)

/** FormViewBank.MaxLoan. */
export function maxLoan(game: Game): number {
  const cmdr = game.commander;
  return cmdr.policeRecordScore >= Consts.PoliceRecordScoreClean
    ? Math.min(25000, Math.max(1000, idiv(cmdr.worth, 5000) * 500))
    : 500;
}

/** btnGetLoan_Click: borrows up to `amount` (clamped to what the bank allows). */
export async function getLoan(game: Game, amount: number): Promise<void> {
  const cmdr = game.commander;
  const max = maxLoan(game);

  if (cmdr.debt >= max) await game.ui.alert(AlertType.DebtTooLargeLoan);
  else {
    const loan = clamp(amount, max - cmdr.debt);
    cmdr.cash += loan;
    cmdr.debt += loan;
  }
}

/** btnPayBack_Click: pays back up to `amount` (clamped to the debt and the cash on hand). */
export async function payBackLoan(game: Game, amount: number): Promise<void> {
  const cmdr = game.commander;

  if (cmdr.debt === 0) await game.ui.alert(AlertType.DebtNone);
  else {
    const payment = clamp(amount, Math.min(cmdr.debt, cmdr.cash));
    cmdr.cash -= payment;
    cmdr.debt -= payment;
  }
}

/** btnBuyInsurance_Click: buys insurance, or stops it after confirming. */
export async function toggleInsurance(game: Game): Promise<void> {
  const cmdr = game.commander;

  if (cmdr.insurance) {
    if ((await game.ui.alert(AlertType.InsuranceStop)) === DialogResult.Yes) {
      cmdr.insurance = false;
      cmdr.noClaim = 0;
    }
  } else if (!cmdr.ship.escapePod) await game.ui.alert(AlertType.InsuranceNoEscapePod);
  else {
    cmdr.insurance = true;
    cmdr.noClaim = 0;
  }
}

// #endregion

// #region Personnel (Form_ViewPersonnel.cs)

/** FormViewPersonnel.UpdateInfo: whether the Hire/Fire button is shown for this crew member. */
export function canHireOrFire(member: CrewMember): boolean {
  return member.rate > 0 || member.id === CrewMemberId.Zeethibal;
}

/** FormViewPersonnel.HireFire: fires the crew member if aboard, otherwise hires them. */
export async function hireOrFire(game: Game, member: CrewMember): Promise<void> {
  const ship = game.commander.ship;
  if (!canHireOrFire(member)) return;

  if (ship.hasCrew(member.id)) {
    if ((await game.ui.alert(AlertType.CrewFireMercenary, member.name)) === DialogResult.Yes)
      ship.fire(member.id);
  } else if (ship.freeCrewQuarters === 0)
    await game.ui.alert(AlertType.CrewNoQuarters, member.name);
  else ship.hire(member);
}

// #endregion

// #region Main window (Form_SpaceTrader.cs)

/**
 * btnSpecial_Click, after the player accepted the event (or read a
 * message-only one). The UI shows the event's title and text first.
 */
export async function acceptSpecialEvent(game: Game): Promise<void> {
  const specEvent = game.commander.currentSystem!.specialEvent!;

  if (game.commander.cashToSpend < specEvent.price) await game.ui.alert(AlertType.SpecialIF);
  else await game.handleSpecialEvent();
}

/**
 * btnJump_Click: jumps to the selected system with the Portable Singularity.
 * Returns true if the jump happened. `beforeWarp` runs where the original
 * made its departure autosave: after the singularity is used up.
 */
export async function jump(game: Game, beforeWarp?: () => Promise<void>): Promise<boolean> {
  if (game.warpSystem === null) await game.ui.alert(AlertType.ChartJumpNoSystemSelected);
  else if (game.warpSystem === game.commander.currentSystem)
    await game.ui.alert(AlertType.ChartJumpCurrent);
  else if ((await game.ui.alert(AlertType.ChartJump, game.warpSystem.name)) === DialogResult.Yes) {
    game.canSuperWarp = false;
    await beforeWarp?.();
    await game.warp(true);
    return true;
  }
  return false;
}

/** mnuRetire_Click: asks to confirm, then ends the game as retired. Returns true if retired. */
export async function retire(game: Game): Promise<boolean> {
  if ((await game.ui.alert(AlertType.GameRetire)) === DialogResult.Yes) {
    game.endStatus = GameEndType.Retired;
    return true;
  }
  return false;
}

/** btnTrack_Click. */
export function trackSelectedSystem(game: Game): void {
  game.trackedSystemId = game.selectedSystemId;
}

// #endregion
