// Port of SpecialEvent.cs.

import type { SpecialEventType } from '../data/enums';
import { Strings } from '../data/strings';
import { currentGame } from '../game-context';

export class SpecialEvent {
  static readonly MoonCost = 500000;

  static readonly StatusArtifactNotStarted = 0;
  static readonly StatusArtifactOnBoard = 1;
  static readonly StatusArtifactDone = 2;

  static readonly StatusDragonflyNotStarted = 0;
  static readonly StatusDragonflyFlyBaratas = 1;
  static readonly StatusDragonflyFlyMelina = 2;
  static readonly StatusDragonflyFlyRegulas = 3;
  static readonly StatusDragonflyFlyZalkon = 4;
  static readonly StatusDragonflyDestroyed = 5;
  static readonly StatusDragonflyDone = 6;

  static readonly StatusExperimentNotStarted = 0;
  static readonly StatusExperimentStarted = 1;
  static readonly StatusExperimentDate = 11;
  static readonly StatusExperimentPerformed = 12;
  static readonly StatusExperimentCancelled = 13;

  static readonly StatusGemulonNotStarted = 0;
  static readonly StatusGemulonStarted = 1;
  static readonly StatusGemulonDate = 7;
  static readonly StatusGemulonTooLate = 8;
  static readonly StatusGemulonFuel = 9;
  static readonly StatusGemulonDone = 10;

  static readonly StatusJaporiNotStarted = 0;
  static readonly StatusJaporiInTransit = 1;
  static readonly StatusJaporiDone = 2;

  static readonly StatusJarekNotStarted = 0;
  static readonly StatusJarekStarted = 1;
  static readonly StatusJarekImpatient = 11;
  static readonly StatusJarekDone = 12;

  static readonly StatusMoonNotStarted = 0;
  static readonly StatusMoonBought = 1;
  static readonly StatusMoonDone = 2;

  static readonly StatusPrincessNotStarted = 0;
  static readonly StatusPrincessFlyCentauri = 1;
  static readonly StatusPrincessFlyInthara = 2;
  static readonly StatusPrincessFlyQonos = 3;
  static readonly StatusPrincessRescued = 4;
  static readonly StatusPrincessImpatient = 14;
  static readonly StatusPrincessReturned = 15;
  static readonly StatusPrincessDone = 16;

  static readonly StatusReactorNotStarted = 0;
  static readonly StatusReactorFuelOk = 1;
  static readonly StatusReactorDate = 20;
  static readonly StatusReactorDelivered = 21;
  static readonly StatusReactorDone = 22;

  static readonly StatusScarabNotStarted = 0;
  static readonly StatusScarabHunting = 1;
  static readonly StatusScarabDestroyed = 2;
  static readonly StatusScarabDone = 3;

  static readonly StatusSculptureNotStarted = 0;
  static readonly StatusSculptureInTransit = 1;
  static readonly StatusSculptureDelivered = 2;
  static readonly StatusSculptureDone = 3;

  static readonly StatusSpaceMonsterNotStarted = 0;
  static readonly StatusSpaceMonsterAtAcamar = 1;
  static readonly StatusSpaceMonsterDestroyed = 2;
  static readonly StatusSpaceMonsterDone = 3;

  static readonly StatusWildNotStarted = 0;
  static readonly StatusWildStarted = 1;
  static readonly StatusWildImpatient = 11;
  static readonly StatusWildDone = 12;

  constructor(
    readonly type: SpecialEventType,
    readonly price: number,
    readonly occurrence: number,
    readonly messageOnly: boolean,
  ) {}

  /** The star system where this event currently is, or null. */
  get location() {
    return currentGame().universe.find((system) => system.specialEventType === this.type) ?? null;
  }

  // Named `string` in the original; `text` here since `string` reads as a type.
  get text(): string {
    return Strings.SpecialEventStrings[this.type]!;
  }

  get title(): string {
    return Strings.SpecialEventTitles[this.type]!;
  }
}
