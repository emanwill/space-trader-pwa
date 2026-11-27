// A minimal stand-in for the running game, for tests of code that reads currentGame().

import { Difficulty, SpecialEventType, TechLevel } from '../../src/engine/data/enums';
import { type GameContext, setCurrentGame } from '../../src/engine/game-context';

export interface FakeGameOptions {
  difficulty?: Difficulty;
  techLevel?: TechLevel;
  trader?: number;
  shipWorth?: number;
  universe?: { specialEventType: SpecialEventType }[];
}

export function useFakeGame(options: FakeGameOptions = {}): GameContext {
  const game: GameContext = {
    difficulty: options.difficulty ?? Difficulty.Normal,
    commander: {
      currentSystem: { techLevel: options.techLevel ?? TechLevel.HiTech },
      ship: { trader: options.trader ?? 0, worth: () => options.shipWorth ?? 0 },
    },
    universe: options.universe ?? [],
  };
  setCurrentGame(game);
  return game;
}
