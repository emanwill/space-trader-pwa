// The high score table and the game-over flow, from Functions.GetHighScores,
// Form_SpaceTrader.cs (AddHighScore, ClearHighScores, GameEnd) and
// Form_ViewHighScores.cs.
//
// PORT: the original read and wrote HighScores.bin directly. The engine goes
// through a HighScoreStore instead, which the app backs with IndexedDB.

import { DialogResult } from './data/alerts';
import { AlertType, GameEndType } from './data/enums';
import { Strings } from './data/strings';
import { formatNumber, multiples, stringVars } from './format';
import type { Game } from './game';
import { setCurrentGame } from './game-context';
import type { GameUI } from './game-ui';
import { idiv } from './math';
import { HighScoreRecord } from './model/high-score-record';
import type { Hash } from './serialization';

/** The number of entries in the table. */
export const HighScoreCount = 3;

/**
 * The high score table as the original stored it: three entries sorted from
 * worst to best, with empty entries (null) first.
 */
export type HighScoreTable = (HighScoreRecord | null)[];

/** Where the table is kept (HighScores.bin in the original). */
export interface HighScoreStore {
  /** Functions.GetHighScores: the saved table, or an empty one. */
  load(): Promise<HighScoreTable>;
  /** Functions.SaveFile(Consts.HighScoreFile, ...). */
  save(table: HighScoreTable): Promise<void>;
}

export function emptyHighScores(): HighScoreTable {
  return new Array<HighScoreRecord | null>(HighScoreCount).fill(null);
}

/** STSerializableObject.ArrayToArrayList for the table. */
export function serializeHighScores(table: HighScoreTable): (Hash | null)[] {
  return table.map((record) => record?.serialize() ?? null);
}

/** STSerializableObject.ArrayListToArray for the table. Pads or trims to three entries. */
export function highScoresFromHash(list: (Hash | null)[]): HighScoreTable {
  const table = list.map((hash) => (hash === null ? null : HighScoreRecord.fromHash(hash)));
  return sortHighScores([...emptyHighScores(), ...table].slice(-HighScoreCount));
}

/** Array.Sort with the default comparer: nulls first, then by HighScoreRecord.CompareTo. */
function sortHighScores(table: HighScoreTable): HighScoreTable {
  return table.sort((a, b) => {
    if (a === null) return b === null ? 0 : -1;
    if (b === null) return 1;
    return a.compareTo(b);
  });
}

/** AddHighScore: replaces the lowest entry with the new record and re-sorts. */
export function addHighScore(table: HighScoreTable, highScore: HighScoreRecord): HighScoreTable {
  const highScores = [...table];
  highScores[0] = highScore;
  return sortHighScores(highScores);
}

/** ClearHighScores, behind the GameClearHighScores confirmation. Returns true if cleared. */
// PORT: the original had ClearHighScores but nothing called it; the alert
// for it existed too. Exposed so the high score screen can offer it.
export async function clearHighScores(ui: GameUI, store: HighScoreStore): Promise<boolean> {
  if ((await ui.alert(AlertType.GameClearHighScores)) !== DialogResult.Yes) return false;
  await store.save(emptyHighScores());
  return true;
}

/**
 * Form_SpaceTrader.GameEnd: announces how the game ended and the score, and
 * enters the score in the table if it qualifies and no cheats were used.
 * Clears the current game. The caller stops play (SetInGameControlsEnabled).
 */
export async function gameEnd(game: Game, store: HighScoreStore): Promise<void> {
  let alertType = AlertType.Alert;
  switch (game.endStatus) {
    case GameEndType.Killed:
      alertType = AlertType.GameEndKilled;
      break;
    case GameEndType.Retired:
      alertType = AlertType.GameEndRetired;
      break;
    case GameEndType.BoughtMoon:
      alertType = AlertType.GameEndBoughtMoon;
      break;
  }

  await game.ui.alert(alertType);

  await game.ui.alert(
    AlertType.GameEndScore,
    formatNumber(idiv(game.score, 10)),
    formatNumber(game.score % 10),
  );

  const candidate = new HighScoreRecord(
    game.commander.name,
    game.score,
    game.endStatus,
    game.commander.days,
    game.commander.worth,
    game.difficulty,
  );
  const highScores = await store.load();
  if (candidate.greaterThan(highScores[0] ?? null)) {
    if (game.cheatEnabled) await game.ui.alert(AlertType.GameEndHighScoreCheat);
    else {
      await store.save(addHighScore(highScores, candidate));
      await game.ui.alert(AlertType.GameEndHighScoreAchieved);
    }
  } else await game.ui.alert(AlertType.GameEndHighScoreMissed);

  setCurrentGame(null);
}

/** One row of the high score screen. */
export interface HighScoreLine {
  name: string;
  /** The score as a percentage with one decimal, e.g. "12.3". */
  score: string;
  /** "Retired in 123 days, worth 45,678 credits on normal level." */
  status: string;
}

/** FormViewHighScores constructor: the filled entries, best first. */
export function highScoreLines(table: HighScoreTable): HighScoreLine[] {
  const lines: HighScoreLine[] = [];
  for (let i = table.length - 1; i >= 0 && table[i]; i--) {
    const highScore = table[i]!;
    lines.push({
      name: highScore.name,
      score: formatNumber(idiv(highScore.score, 10)) + '.' + (highScore.score % 10),
      status: stringVars(
        Strings.HighScoreStatus,
        Strings.GameCompletionTypes[highScore.type]!,
        multiples(highScore.days, Strings.TimeUnit),
        multiples(highScore.worth, Strings.MoneyUnit),
        Strings.DifficultyLevels[highScore.difficulty]!.toLowerCase(),
      ),
    });
  }
  return lines;
}
