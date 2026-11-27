// Port of PoliticalSystem.cs.

import {
  type Activity,
  Difficulty,
  OpponentType,
  type PoliticalSystemType,
  type ShipType,
  type TechLevel,
  type TradeItemType,
} from '../data/enums';
import { Consts } from '../data/consts';
import { Strings } from '../data/strings';
import { currentGame } from '../game-context';

export class PoliticalSystem {
  constructor(
    readonly type: PoliticalSystemType,
    /** Reaction level of illegal goods; 0 = total acceptance (how police react if they find them). */
    readonly reactionIllegal: number,
    /** Activity level of police force; 0 = no police (determines occurrence rate). */
    readonly activityPolice: Activity,
    /** Activity level of pirates; 0 = no pirates. */
    readonly activityPirates: Activity,
    /** Activity level of traders; 0 = no traders. */
    readonly activityTraders: Activity,
    /** Minimum tech level needed. */
    readonly minimumTechLevel: TechLevel,
    /** Maximum tech level where this is found. */
    readonly maximumTechLevel: TechLevel,
    /** How easily someone can be bribed; 0 = unbribeable/high bribe costs. */
    readonly bribeLevel: number,
    /** Drugs can be traded (if not, people aren't interested or the government is too strict). */
    readonly drugsOk: boolean,
    /** Firearms can be traded (if not, people aren't interested or the government is too strict). */
    readonly firearmsOk: boolean,
    /** Trade item requested in particular in this type of government. */
    readonly wanted: TradeItemType,
  ) {}

  shipTypeLikely(shipType: ShipType, oppType: OpponentType): boolean {
    let likely = false;
    const diffMod = Math.max(0, currentGame().difficulty - Difficulty.Normal);
    const spec = Consts.ShipSpecs[shipType]!;

    switch (oppType) {
      case OpponentType.Pirate:
        likely = this.activityPirates + diffMod >= spec.pirates;
        break;
      case OpponentType.Police:
        likely = this.activityPolice + diffMod >= spec.police;
        break;
      case OpponentType.Trader:
        likely = this.activityTraders + diffMod >= spec.traders;
        break;
    }

    return likely;
  }

  get name(): string {
    return Strings.PoliticalSystemNames[this.type]!;
  }
}
