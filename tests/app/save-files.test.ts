import { describe, expect, it } from 'vitest';
import {
  describeSummary,
  exportFileName,
  exportSaveText,
  makeSaveRecord,
  parseSaveText,
  SaveFormatError,
} from '../../src/app/save-files';
import { Difficulty } from '../../src/engine/data/enums';
import { newGame, useGameCleanup } from '../engine/game-helpers';

useGameCleanup();

describe('save files', () => {
  it('summarizes the game for save lists', () => {
    const { game } = newGame({ name: 'Ann', difficulty: Difficulty.Hard });
    const record = makeSaveRecord(game, 'Slot 1', new Date('2026-01-02T03:04:05Z'));
    expect(record.name).toBe('Slot 1');
    expect(record.savedAt).toBe('2026-01-02T03:04:05.000Z');
    expect(record.summary).toEqual({
      commander: 'Ann',
      difficulty: Difficulty.Hard,
      days: 0,
      worth: game.commander.worth,
      system: game.commander.currentSystem!.name,
      ship: 'Gnat',
    });
    expect(record.game).toEqual(game.serialize());
    expect(describeSummary({ ...record.summary, worth: 12345 })).toBe(
      'Ann, day 0, 12,345 credits, Hard',
    );
  });

  it('round-trips an exported file', () => {
    const { game } = newGame();
    const record = makeSaveRecord(game, 'Mine');
    const parsed = parseSaveText(exportSaveText(record));
    expect(parsed.name).toBe('Mine');
    expect(parsed.game).toEqual(JSON.parse(JSON.stringify(record.game)));
  });

  it('accepts a bare game hash', () => {
    const { game } = newGame();
    const parsed = parseSaveText(JSON.stringify(game.serialize()));
    expect(parsed.name).toBeNull();
    expect(parsed.game._version).toBe('2.00');
  });

  it.each([
    ['not JSON', '{oops'],
    ['an array', '[1, 2]'],
    ['another app', '{"app": "other", "game": {}}'],
    ['a newer file format', '{"app": "space-trader-pwa", "format": 99, "game": {}}'],
    ['a file without a game', '{"app": "space-trader-pwa", "format": 1}'],
  ])('rejects %s', (_what, text) => {
    expect(() => parseSaveText(text)).toThrow(SaveFormatError);
  });

  it('makes safe file names', () => {
    const summary = {
      commander: 'Jean-Luc P. ',
      difficulty: 0,
      days: 42,
      worth: 0,
      system: '',
      ship: '',
    };
    expect(exportFileName(summary)).toBe('jean-luc-p-day-42.json');
    expect(exportFileName({ ...summary, commander: '???' })).toBe('commander-day-42.json');
  });
});
