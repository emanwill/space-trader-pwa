// Port of GameEndException.cs: thrown when the game ends (killed, or retired
// to the moon). The UI catches it and runs the game-over flow.

import type { GameEndType } from './data/enums';

export class GameEndError extends Error {
  // PORT: the original set Game.CurrentGame.EndStatus in its constructor. The
  // game is passed in instead, so this doesn't depend on the current game.
  constructor(
    game: { endStatus: GameEndType },
    readonly endType: GameEndType,
  ) {
    super('Game over');
    this.name = 'GameEndError';
    game.endStatus = endType;
  }
}
