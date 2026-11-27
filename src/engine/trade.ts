// Read-only helpers for the Trade screen: the cargo panel's numbers
// (Form_SpaceTrader.UpdateCargo), buy and sell limits without the alerts, the
// costs a warp will charge, and why a warp would be refused.
//
// None of these change the game. They repeat the checks that cargoBuy,
// cargoSell and Warp make, so the UI can show limits and problems before the
// player acts; the engine still makes the same checks when they do.

import { AlertType } from './data/enums';
import { Consts } from './data/consts';
import { distance, wormholeExists } from './functions';
import type { Game } from './game';
import { idiv } from './math';
import type { StarSystem } from './model/star-system';

/** One row of the cargo panel. */
export interface TradeRow {
  item: number;
  name: string;
  illegal: boolean;
  /** Price per unit to buy here; 0 if not for sale. */
  buyPrice: number;
  /** Price per unit to sell here; 0 if not wanted (the row offers Dump instead). */
  sellPrice: number;
  /** Units for sale here. */
  stock: number;
  /** Units in the hold. */
  held: number;
  /** Total paid for the units in the hold (Commander.PriceCargo). */
  paid: number;
  /** The target system's estimated price, or null where the original showed dashes. */
  estimate: number | null;
  /** Estimate minus the buy price, or null. */
  margin: number | null;
  /** Margin as a whole percentage of the buy price, or null. */
  marginPercent: number | null;
  /** Selling the hold here makes a profit (the original's bold sell price). */
  sellProfitable: boolean;
  /** Buying here and selling at the target makes a profit (the original's bold buy price). */
  buyProfitable: boolean;
}

/**
 * TradeItem.StandardPrice for a target: the price the original shows as the
 * target price. Null if the target doesn't trade the item.
 */
export function estimatedSellPrice(item: number, target: StarSystem): number | null {
  const price = Consts.TradeItems[item]!.standardPrice(target);
  return price > 0 ? price : null;
}

/** UpdateCargo: the cargo panel for the given target (normally the warp system). */
export function tradeRows(game: Game, target: StarSystem | null = game.warpSystem): TradeRow[] {
  const cmdr = game.commander;
  const buy = game.priceCargoBuy;
  const sell = game.priceCargoSell;

  return Consts.TradeItems.map((tradeItem, i) => {
    const estimate = target !== null && target.destOk ? estimatedSellPrice(i, target) : null;
    const margin = estimate !== null && buy[i]! > 0 ? estimate - buy[i]! : null;
    const stock = cmdr.currentSystem!.tradeItems[i]!;
    return {
      item: i,
      name: tradeItem.name,
      illegal: tradeItem.illegal,
      buyPrice: buy[i]!,
      sellPrice: sell[i]!,
      stock,
      held: cmdr.ship.cargo[i]!,
      paid: cmdr.priceCargo[i]!,
      estimate,
      margin,
      marginPercent: margin === null ? null : idiv(100 * margin, buy[i]!),
      sellProfitable: sell[i]! * cmdr.ship.cargo[i]! > cmdr.priceCargo[i]!,
      buyProfitable: margin !== null && margin > 0 && stock > 0,
    };
  });
}

/**
 * Changes to apply before checking a limit: bays already taken (or freed, if
 * negative) and cash already spent (or gained) by other parts of a plan.
 */
export interface PlanDelta {
  bays?: number;
  cash?: number;
}

/**
 * The most units of `item` that cargoBuySystem would buy: free bays less the
 * "leave empty" option, the stock, and cash to spend. 0 where it would refuse
 * with an alert (debt too large, nothing for sale, no bays, no cash).
 */
export function maxBuyable(game: Game, item: number, delta: PlanDelta = {}): number {
  const cmdr = game.commander;
  const price = game.priceCargoBuy[item]!;
  const stock = cmdr.currentSystem!.tradeItems[item]!;
  if (cmdr.debt > Consts.DebtTooLarge || stock <= 0 || price <= 0) return 0;

  const freeBays = Math.max(
    0,
    cmdr.ship.freeCargoBays - game.options.leaveEmpty - (delta.bays ?? 0),
  );
  const cash = cmdr.cashToSpend - (delta.cash ?? 0);
  return Math.max(0, Math.min(freeBays, stock, cash > 0 ? idiv(cash, price) : 0));
}

/** The most units of `item` that cargoSellSystem would sell: the hold, if the system buys it. */
export function maxSellable(game: Game, item: number): number {
  return game.priceCargoSell[item]! > 0 ? game.commander.ship.cargo[item]! : 0;
}

/** The most units of `item` that cargoDump would dump, at 5 × (difficulty + 1) credits each. */
export function maxDumpable(game: Game, item: number): number {
  const unitCost = dumpCost(game);
  return Math.min(
    game.commander.ship.cargo[item]!,
    Math.max(0, idiv(game.commander.cashToSpend, unitCost)),
  );
}

/** Credits per unit to dump cargo. */
export function dumpCost(game: Game): number {
  return 5 * (game.difficulty + 1);
}

/** What a warp to the selected system charges on departure. */
export interface TripCosts {
  /** Parsecs to the target. */
  distance: number;
  /** Fuel the trip burns: the distance, or none through a wormhole. */
  fuel: number;
  mercenaries: number;
  insurance: number;
  wormholeTax: number;
  /** Interest on the debt, paid from cash (or added to the debt if cash runs short). */
  interest: number;
  /** Everything taken from cash at departure, assuming cash covers the interest. */
  total: number;
}

/** The charges NormalDeparture makes for a warp to the warp system. */
export function tripCosts(game: Game): TripCosts | null {
  const cmdr = game.commander;
  const target = game.warpSystem;
  if (target === null) return null;

  const dist = distance(cmdr.currentSystem!, target);
  const viaWormhole = wormholeExists(cmdr.currentSystem!, target);
  const costs = {
    distance: dist,
    fuel: viaWormhole ? 0 : dist,
    mercenaries: game.mercenaryCosts,
    insurance: game.insuranceCosts,
    wormholeTax: game.wormholeCosts,
    interest: game.interestCosts,
  };
  return {
    ...costs,
    total: costs.mercenaries + costs.insurance + costs.wormholeTax + costs.interest,
  };
}

/** Why a normal warp can't start. */
export type WarpBlocker =
  /** No system selected (the original hid the Warp button). */
  | 'no-target'
  /** The target is the current system or out of range (also hidden). */
  | 'out-of-range'
  /** Warp would show this alert and stay put. */
  | AlertType.DebtTooLargeGrounded
  | AlertType.LeavingIFMercenaries
  | AlertType.LeavingIFInsurance
  | AlertType.LeavingIFWormholeTax;

/**
 * The checks at the start of Warp (and the Warp button's visibility), or null
 * if the warp can start. `cashDelta` is cash a plan will add (or spend, if
 * negative) before departure.
 */
export function warpBlocker(game: Game, cashDelta = 0): WarpBlocker | null {
  const cmdr = game.commander;
  const target = game.warpSystem;
  if (target === null) return 'no-target';
  if (!target.destOk) return 'out-of-range';

  const cash = cmdr.cash + cashDelta;
  if (cmdr.debt > Consts.DebtTooLarge) return AlertType.DebtTooLargeGrounded;
  if (cash < game.mercenaryCosts) return AlertType.LeavingIFMercenaries;
  if (cash < game.mercenaryCosts + game.insuranceCosts) return AlertType.LeavingIFInsurance;
  if (cash < game.mercenaryCosts + game.insuranceCosts + game.wormholeCosts)
    return AlertType.LeavingIFWormholeTax;
  return null;
}

/** The systems Prev/Next cycle through: those in range, in id order (SelectNextSystemWithinRange). */
export function systemsInRange(game: Game): StarSystem[] {
  return game.destinations.map((id) => game.universe[id]!);
}
