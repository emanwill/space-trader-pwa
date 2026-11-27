// How each of the original's alerts is shown (PLAN.md §2 and §4: "a lookup
// table on the UI side"). The engine still raises every alert in the
// original's order; only the presentation differs.
//
// - confirm: a question (more than one button). A blocking sheet.
// - story: something happened that the player should read. A blocking card.
// - notice: a refusal or a routine result. Answered OK at once and shown as a
//   toast, or added to the trip log while travelling.
// - game-over: the ending, the score and the high-score result, gathered on
//   one full-screen page.

import { Alerts } from '../engine/data/alerts';
import { AlertType } from '../engine/data/enums';

export type AlertKind = 'confirm' | 'story' | 'notice' | 'game-over';

const GAME_OVER = new Set<AlertType>([
  AlertType.GameEndKilled,
  AlertType.GameEndRetired,
  AlertType.GameEndBoughtMoon,
  AlertType.GameEndBoughtMoonGirl,
  AlertType.GameEndScore,
  AlertType.GameEndHighScoreAchieved,
  AlertType.GameEndHighScoreCheat,
  AlertType.GameEndHighScoreMissed,
]);

const NOTICES = new Set<AlertType>([
  // Not enough money, room or stock: the screens show limits, so these are rare.
  AlertType.ArrivalIFFuel,
  AlertType.ArrivalIFFuelRepairs,
  AlertType.ArrivalIFNewspaper,
  AlertType.ArrivalIFRepairs,
  AlertType.CargoIF,
  AlertType.CargoNoEmptyBays,
  AlertType.CargoNoneAvailable,
  AlertType.CargoNoneToSell,
  AlertType.CargoNotInterested,
  AlertType.CargoNotSold,
  AlertType.ChartJumpCurrent,
  AlertType.ChartJumpNoSystemSelected,
  AlertType.ChartWormholeUnreachable,
  AlertType.CrewNoQuarters,
  AlertType.DebtNoBuy,
  AlertType.DebtNone,
  AlertType.DebtTooLargeGrounded,
  AlertType.DebtTooLargeLoan,
  AlertType.DebtTooLargeTrade,
  AlertType.EquipmentAlreadyOwn,
  AlertType.EquipmentExtraBaysInUse,
  AlertType.EquipmentIF,
  AlertType.EquipmentNotEnoughSlots,
  AlertType.InsuranceNoEscapePod,
  AlertType.LeavingIFInsurance,
  AlertType.LeavingIFMercenaries,
  AlertType.LeavingIFWormholeTax,
  AlertType.NewGameMoreSkillPoints,
  AlertType.OptionsNoGame,
  AlertType.ShipBuyIF,
  AlertType.ShipBuyNotAvailable,
  AlertType.ShipDesignIF,
  AlertType.SpecialIF,
  AlertType.SpecialNoQuarters,
  AlertType.SpecialNotEnoughBays,
  // Combat refusals and outcomes; the encounter log shows them.
  AlertType.EncounterAttackNoDisruptors,
  AlertType.EncounterAttackNoLasers,
  AlertType.EncounterAttackNoWeapons,
  AlertType.EncounterDisabledOpponent,
  AlertType.EncounterEscaped,
  AlertType.EncounterEscapedHit,
  AlertType.EncounterOpponentEscaped,
  AlertType.EncounterPoliceBribeCant,
  AlertType.EncounterPoliceBribeLowCash,
  AlertType.EncounterPoliceNothingFound,
  AlertType.EncounterScoopNoScoop,
  AlertType.EncounterSurrenderRefused,
  AlertType.EncounterTradeCompleted,
  AlertType.EncounterYouWin,
  // Routine news.
  AlertType.DebtReminder,
  AlertType.SpecialSealedCanisters,
  AlertType.TravelArrival,
  AlertType.TravelUneventfulTrip,
  AlertType.TribblesSqueek,
]);

export function alertKind(type: AlertType): AlertKind {
  if (GAME_OVER.has(type)) return 'game-over';
  const def = Alerts[type];
  if ('buttons' in def && def.buttons.length > 1) return 'confirm';
  if (NOTICES.has(type)) return 'notice';
  return 'story';
}
