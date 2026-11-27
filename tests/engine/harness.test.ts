// Plays many seeded games end to end with a random bot, checking invariants
// after every step (see harness.ts).

import { describe, expect, it } from 'vitest';
import { AlertType, Difficulty } from '../../src/engine/data/enums';
import { type GameRun, playGame } from './harness';
import { useGameCleanup } from './game-helpers';

useGameCleanup();

const SEEDS = 60;
const TURNS = 150;

describe('headless games', () => {
  const runs: GameRun[] = [];

  for (let seed = 1; seed <= SEEDS; seed++) {
    const difficulty = ((seed - 1) % 5) as Difficulty;
    it(`plays seed ${seed} on ${Difficulty[difficulty]} without breaking an invariant`, async () => {
      runs.push(await playGame(seed, difficulty, TURNS));
    });
  }

  it('covers a good part of the game', () => {
    expect(runs).toHaveLength(SEEDS);
    const alerts = new Set<AlertType>();
    for (const run of runs) for (const type of run.alertTypes) alerts.add(type);

    const days = runs.reduce((sum, r) => sum + r.days, 0);
    const encounters = runs.reduce((sum, r) => sum + r.encounters, 0);
    const ended = runs.filter((r) => r.endStatus !== -1).length;
    const reloads = runs.reduce((sum, r) => sum + r.reloads, 0);
    const quests = new Set<string>();
    for (const run of runs) for (const quest of run.questsStarted) quests.add(quest);

    // Not exact numbers: a smoke check that the bot actually plays.
    expect(days).toBeGreaterThan(SEEDS * 30);
    expect(encounters).toBeGreaterThan(SEEDS * 5);
    expect(reloads).toBeGreaterThan(SEEDS);
    console.log(
      `${SEEDS} games: ${days} days, ${encounters} encounters, ${reloads} reloads, ` +
        `${ended} ended early, ${alerts.size} of ${Object.keys(AlertType).length / 2} alert types seen, ` +
        `quests started: ${[...quests].join(', ')}`,
    );
    expect(alerts.size).toBeGreaterThan(60);
    expect(quests.size).toBeGreaterThanOrEqual(5);
  });
});
