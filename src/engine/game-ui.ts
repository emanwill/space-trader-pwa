// The interface the engine uses for everything the original did with dialogs.
// The original passed a WinForms `owner` window into methods that show alerts;
// the port passes a GameUI instead, and the Game keeps one as its ParentWindow.

import type { DialogResult } from './data/alerts';
import type { AlertType, CargoBuyOp, CargoSellOp, TradeItemType } from './data/enums';

/** What FormCargoBuy was opened with. */
export interface CargoBuyRequest {
  readonly kind: 'buy';
  readonly op: CargoBuyOp;
  readonly tradeItem: TradeItemType;
  /** The most the player can take: free bays, units available and, when buying, cash. */
  readonly max: number;
  /** Price per unit; 0 when plundering. */
  readonly unitPrice: number;
}

/** What FormCargoSell was opened with. */
export interface CargoSellRequest {
  readonly kind: 'sell';
  readonly op: CargoSellOp;
  readonly tradeItem: TradeItemType;
  readonly max: number;
  /** Price per unit. Negative when dumping, which costs money. */
  readonly unitPrice: number;
}

export type CargoQuantityRequest = CargoBuyRequest | CargoSellRequest;

/**
 * The encounter screen's buttons, in the original's order, plus two inputs
 * that weren't buttons: the continuous-attack timer firing, and closing the
 * window (only possible with the EasyEncounters cheat).
 */
export enum EncounterChoice {
  Attack,
  Board,
  Bribe,
  Drink,
  Flee,
  Ignore,
  /** Interrupts continuous attack or flight. */
  Int,
  Meet,
  Plunder,
  Submit,
  Surrender,
  Trade,
  Yield,
  /** The continuous-attack timer fired: run another round. */
  Tick,
  /** Close the encounter window (EasyEncounters cheat). */
  Close,
}

/** What the encounter screen shows between rounds. */
export interface EncounterView {
  /** Buttons to show. */
  readonly choices: readonly EncounterChoice[];
  /** The upper text: what happened, or the initial description. */
  readonly text: string;
  /** The lower text: what the opponent is doing. */
  readonly action: string;
  /**
   * Continuous attack or flight is on. The UI should wait a moment, then
   * answer Tick unless the player interrupts.
   */
  readonly continuous: boolean;
}

export interface GameUI {
  /** C# `FormAlert.Alert(type, owner, args...)`. Resolves with the button chosen. */
  alert(type: AlertType, ...args: string[]): Promise<DialogResult>;

  /** FormCargoBuy / FormCargoSell: asks for a quantity. Resolves with 0 if cancelled. */
  cargoQuantity(request: CargoQuantityRequest): Promise<number>;

  /**
   * FormPlunder: lets the player take cargo from the opponent by calling
   * `game.cargoPlunder` (and `jettison` for room). Resolves when closed.
   */
  plunder(): Promise<void>;

  /** FormJettison: lets the player dump cargo by calling `game.cargoJettison`. Resolves when closed. */
  jettison(): Promise<void>;

  /** FormEncounter: shows the encounter and resolves with the player's next choice. */
  encounterAction(view: EncounterView): Promise<EncounterChoice>;
}
