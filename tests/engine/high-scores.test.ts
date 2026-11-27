import { describe, expect, it } from 'vitest';
import { DialogResult } from '../../src/engine/data/alerts';
import { AlertType, Difficulty, GameEndType } from '../../src/engine/data/enums';
import { currentGame } from '../../src/engine/game-context';
import {
  addHighScore,
  clearHighScores,
  emptyHighScores,
  gameEnd,
  highScoreLines,
  highScoresFromHash,
  type HighScoreStore,
  type HighScoreTable,
  serializeHighScores,
} from '../../src/engine/high-scores';
import { HighScoreRecord } from '../../src/engine/model/high-score-record';
import { newGame, useGameCleanup } from './game-helpers';
import { ScriptedUI } from './scripted-ui';

useGameCleanup();

function record(score: number, worth = 1000, days = 10, name = 'A'): HighScoreRecord {
  return new HighScoreRecord(name, score, GameEndType.Retired, days, worth, Difficulty.Normal);
}

class TableStore implements HighScoreStore {
  saves = 0;
  constructor(public table: HighScoreTable = emptyHighScores()) {}
  load(): Promise<HighScoreTable> {
    return Promise.resolve([...this.table]);
  }
  save(table: HighScoreTable): Promise<void> {
    this.saves++;
    this.table = table;
    return Promise.resolve();
  }
}

describe('HighScoreRecord', () => {
  it('ranks by score, then worth, then days', () => {
    expect(record(10).greaterThan(record(9))).toBe(true);
    expect(record(10, 2000).greaterThan(record(10, 1000))).toBe(true);
    expect(record(10, 1000, 20).greaterThan(record(10, 1000, 10))).toBe(true);
    expect(record(10).compareTo(record(10))).toBe(0);
    expect(record(9).lessThan(record(10))).toBe(true);
    expect(record(0).greaterThan(null)).toBe(true);
  });

  it('round-trips through its hash with the original keys', () => {
    const original = new HighScoreRecord('Zed', 123, GameEndType.Killed, 45, 6789, Difficulty.Hard);
    const hash = original.serialize();
    expect(Object.keys(hash).sort()).toEqual(
      ['_days', '_difficulty', '_name', '_score', '_type', '_worth'].sort(),
    );
    expect(HighScoreRecord.fromHash(hash)).toEqual(original);
  });
});

describe('high score table', () => {
  it('keeps empty entries first and the best last', () => {
    let table = emptyHighScores();
    table = addHighScore(table, record(5));
    expect(table.map((r) => r?.score ?? null)).toEqual([null, null, 5]);
    table = addHighScore(table, record(9));
    table = addHighScore(table, record(7));
    expect(table.map((r) => r!.score)).toEqual([5, 7, 9]);
    // A new entry replaces the lowest one.
    table = addHighScore(table, record(8));
    expect(table.map((r) => r!.score)).toEqual([7, 8, 9]);
  });

  it('round-trips through serialization and repairs odd lengths', () => {
    const table = addHighScore(addHighScore(emptyHighScores(), record(3)), record(4));
    expect(highScoresFromHash(serializeHighScores(table))).toEqual(table);
    expect(highScoresFromHash([record(2).serialize()]).map((r) => r?.score ?? null)).toEqual([
      null,
      null,
      2,
    ]);
  });

  it('formats lines best first, like the high score screen', () => {
    const table = addHighScore(
      addHighScore(emptyHighScores(), record(57, 12345, 1, 'Low')),
      new HighScoreRecord('High', 1234, GameEndType.BoughtMoon, 321, 1500000, Difficulty.Easy),
    );
    expect(highScoreLines(table)).toEqual([
      {
        name: 'High',
        score: '123.4',
        status: 'Claimed moon in 321 days, worth 1,500,000 credits on easy level.',
      },
      {
        name: 'Low',
        score: '5.7',
        status: 'Retired in 1 day, worth 12,345 credits on normal level.',
      },
    ]);
    expect(highScoreLines(emptyHighScores())).toEqual([]);
  });

  it('clears only after confirmation', async () => {
    const store = new TableStore(addHighScore(emptyHighScores(), record(5)));
    expect(await clearHighScores(new ScriptedUI(), store)).toBe(false);
    expect(store.table[2]).not.toBeNull();

    const ui = new ScriptedUI({ [AlertType.GameClearHighScores]: [DialogResult.Yes] });
    expect(await clearHighScores(ui, store)).toBe(true);
    expect(store.table).toEqual(emptyHighScores());
  });
});

describe('gameEnd', () => {
  it('announces a retirement and the score, then enters the high score', async () => {
    const { game, ui } = newGame({ name: 'Ender' });
    game.endStatus = GameEndType.Retired;
    const score = game.score;
    const { days, worth } = game.commander;
    const store = new TableStore();

    await gameEnd(game, store);

    expect(ui.alerts.map((a) => a.type)).toEqual([
      AlertType.GameEndRetired,
      AlertType.GameEndScore,
      AlertType.GameEndHighScoreAchieved,
    ]);
    expect(ui.alerts[1]!.args).toEqual([String(Math.trunc(score / 10)), String(score % 10)]);
    expect(store.table[2]).toEqual(
      new HighScoreRecord('Ender', score, GameEndType.Retired, days, worth, Difficulty.Normal),
    );
    expect(() => currentGame()).toThrow('No current game');
  });

  it('shows the matching ending for death and the moon', async () => {
    for (const [endStatus, alert] of [
      [GameEndType.Killed, AlertType.GameEndKilled],
      [GameEndType.BoughtMoon, AlertType.GameEndBoughtMoon],
    ] as const) {
      const { game, ui } = newGame();
      game.endStatus = endStatus;
      await gameEnd(game, new TableStore());
      expect(ui.alerts[0]!.type).toBe(alert);
    }
  });

  it('refuses a cheater', async () => {
    const { game, ui } = newGame();
    game.endStatus = GameEndType.Retired;
    game.cheatEnabled = true;
    const store = new TableStore();
    await gameEnd(game, store);
    expect(ui.alerts.at(-1)!.type).toBe(AlertType.GameEndHighScoreCheat);
    expect(store.saves).toBe(0);
  });

  it('misses the table when every entry is better', async () => {
    const { game, ui } = newGame();
    game.endStatus = GameEndType.Killed;
    const best = record(100000);
    const store = new TableStore([best, best, best]);
    await gameEnd(game, store);
    expect(ui.alerts.at(-1)!.type).toBe(AlertType.GameEndHighScoreMissed);
    expect(store.saves).toBe(0);
  });
});
