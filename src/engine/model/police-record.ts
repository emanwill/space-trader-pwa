// Port of PoliceRecord.cs.

import type { PoliceRecordType } from '../data/enums';
import { Consts } from '../data/consts';
import { Strings } from '../data/strings';

export class PoliceRecord {
  constructor(
    readonly type: PoliceRecordType,
    readonly minScore: number,
  ) {}

  // PORT: the original ignored its parameter and read the commander's score
  // directly. Every caller passed the commander's score, so using the parameter
  // behaves the same and avoids a dependency on the current game.
  static getPoliceRecordFromScore(policeRecordScore: number): PoliceRecord {
    const records = Consts.PoliceRecords;
    let i = 0;
    while (i < records.length && policeRecordScore >= records[i]!.minScore) i++;
    return records[Math.max(0, i - 1)]!;
  }

  get name(): string {
    return Strings.PoliceRecordNames[this.type]!;
  }
}
