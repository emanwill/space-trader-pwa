// Replacement for the original's static `Game.CurrentGame`.
//
// The C# code reaches the running game from almost anywhere (Ship.cs alone does
// so 33 times). Rather than threading a game parameter through every port, the
// engine keeps one module-level current game, set by the Game class.
//
// GameContext lists only the members ported code needs so far. It grows as
// later phases port more code, and is replaced by the real Game type once that
// exists (Phase 3).

import type { Difficulty } from './data/enums';
import type { Commander } from './model/commander';
import type { CrewMember } from './model/crew-member';
import type { Ship } from './model/ship';
import type { StarSystem } from './model/star-system';

export interface GameContext {
  readonly difficulty: Difficulty;
  readonly commander: Commander | null;
  readonly mercenaries: (CrewMember | null)[];
  readonly universe: readonly StarSystem[];
  readonly wormholes: readonly number[];
  readonly warpSystem: StarSystem | null;
  readonly opponent: Ship;
  readonly opponentDisabled: boolean;
  readonly priceCargoBuy: readonly number[];
  readonly priceCargoSell: readonly number[];
  readonly options: { readonly reserveMoney: boolean };
  readonly currentCosts: number;

  readonly questStatusArtifact: number;
  readonly questStatusDragonfly: number;
  readonly questStatusExperiment: number;
  readonly questStatusGemulon: number;
  readonly questStatusJapori: number;
  readonly questStatusJarek: number;
  readonly questStatusMoon: number;
  readonly questStatusPrincess: number;
  readonly questStatusReactor: number;
  readonly questStatusScarab: number;
  readonly questStatusSculpture: number;
  readonly questStatusSpaceMonster: number;

  recalculateBuyPrices(system: StarSystem): void;
}

let current: GameContext | null = null;

/** The running game. Throws if there is none, where the C# would have thrown a NullReferenceException. */
export function currentGame(): GameContext {
  if (!current) throw new Error('No current game');
  return current;
}

/**
 * `Game.CurrentGame.Commander`, which most of the original assumes is set.
 * Throws if it isn't, where the C# would have thrown a NullReferenceException.
 */
export function currentCommander(): Commander {
  const commander = currentGame().commander;
  if (!commander) throw new Error('No commander');
  return commander;
}

export function setCurrentGame(game: GameContext | null): void {
  current = game;
}
