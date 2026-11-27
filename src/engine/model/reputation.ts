// Port of Reputation.cs.

import type { ReputationType } from '../data/enums';
import { Consts } from '../data/consts';
import { Strings } from '../data/strings';

export class Reputation {
  constructor(
    readonly type: ReputationType,
    readonly minScore: number,
  ) {}

  // PORT: as with PoliceRecord, the original ignored its parameter and read the
  // commander's score; all callers passed that score, so this is equivalent.
  static getReputationFromScore(reputationScore: number): Reputation {
    const reputations = Consts.Reputations;
    let i = 0;
    while (i < reputations.length && reputationScore >= reputations[i]!.minScore) i++;
    return reputations[Math.max(0, i - 1)]!;
  }

  get name(): string {
    return Strings.ReputationNames[this.type]!;
  }
}
