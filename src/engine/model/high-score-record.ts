// Port of HighScoreRecord.cs: one entry in the high score table.

import type { Difficulty, GameEndType } from '../data/enums';
import { getValue, type Hash } from '../serialization';

export class HighScoreRecord {
  constructor(
    readonly name: string,
    readonly score: number,
    readonly type: GameEndType,
    readonly days: number,
    readonly worth: number,
    readonly difficulty: Difficulty,
  ) {}

  static fromHash(hash: Hash): HighScoreRecord {
    return new HighScoreRecord(
      getValue(hash, '_name'),
      getValue(hash, '_score'),
      getValue(hash, '_type'),
      getValue(hash, '_days'),
      getValue(hash, '_worth'),
      getValue(hash, '_difficulty'),
    );
  }

  /** IComparable.CompareTo: higher score, then higher worth, then more days ranks higher. */
  compareTo(value: HighScoreRecord | null): number {
    if (value === null) return 1;
    if (value.score < this.score) return 1;
    if (value.score > this.score) return -1;
    if (value.worth < this.worth) return 1;
    if (value.worth > this.worth) return -1;
    if (value.days < this.days) return 1;
    if (value.days > this.days) return -1;
    return 0;
  }

  serialize(): Hash {
    return {
      _name: this.name,
      _score: this.score,
      _type: this.type,
      _days: this.days,
      _worth: this.worth,
      _difficulty: this.difficulty,
    };
  }

  // #region Operators

  /** C# `operator >`. */
  greaterThan(b: HighScoreRecord | null): boolean {
    return this.compareTo(b) > 0;
  }

  /** C# `operator <`. */
  lessThan(b: HighScoreRecord | null): boolean {
    return this.compareTo(b) < 0;
  }

  // #endregion
}
