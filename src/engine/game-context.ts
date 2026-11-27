// Replacement for the original's static `Game.CurrentGame`.
//
// The C# code reaches the running game from almost anywhere (Ship.cs alone does
// so 33 times). Rather than threading a game parameter through every port, the
// engine keeps one module-level current game, set by the Game class.
//
// GameContext lists only the members ported code needs so far. It grows as
// later phases port more code, and is replaced by the real Game type once that
// exists (Phase 3).

import type { Difficulty, SpecialEventType, TechLevel } from './data/enums';

export interface GameContext {
  readonly difficulty: Difficulty;
  readonly commander: {
    readonly currentSystem: { readonly techLevel: TechLevel };
    readonly ship: {
      readonly trader: number;
      worth(forInsurance: boolean): number;
    };
  } | null;
  readonly universe: readonly { readonly specialEventType: SpecialEventType }[];
}

let current: GameContext | null = null;

/** The running game. Throws if there is none, where the C# would have thrown a NullReferenceException. */
export function currentGame(): GameContext {
  if (!current) throw new Error('No current game');
  return current;
}

export function setCurrentGame(game: GameContext | null): void {
  current = game;
}
