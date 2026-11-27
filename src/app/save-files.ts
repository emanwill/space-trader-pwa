// What a saved game looks like in storage and in exported files.
//
// The game itself is Game.serialize()'s hash, unchanged (it carries its own
// `_version`). Around it go a name and a summary, so save lists can show the
// commander, day and worth without loading each game.

import { Strings } from '../engine/data/strings';
import { formatNumber } from '../engine/format';
import type { Game } from '../engine/game';
import type { Hash } from '../engine/serialization';
import type { Difficulty } from '../engine/data/enums';

export interface SaveSummary {
  commander: string;
  difficulty: Difficulty;
  days: number;
  worth: number;
  system: string;
  ship: string;
}

export interface SaveRecord {
  /** The slot name shown to the player. */
  name: string;
  /** ISO 8601 time of the save. */
  savedAt: string;
  summary: SaveSummary;
  game: Hash;
}

export function summarize(game: Game): SaveSummary {
  const cmdr = game.commander;
  return {
    commander: cmdr.name,
    difficulty: game.difficulty,
    days: cmdr.days,
    worth: cmdr.worth,
    system: cmdr.currentSystem!.name,
    ship: cmdr.ship.name,
  };
}

export function makeSaveRecord(game: Game, name: string, now = new Date()): SaveRecord {
  return { name, savedAt: now.toISOString(), summary: summarize(game), game: game.serialize() };
}

/** "Tester, day 12, 3,456 credits, Normal" for lists. */
export function describeSummary(summary: SaveSummary): string {
  return (
    `${summary.commander}, day ${summary.days}, ${formatNumber(summary.worth)} credits, ` +
    (Strings.DifficultyLevels[summary.difficulty] ?? '')
  );
}

// #region Export files

const FILE_APP = 'space-trader-pwa';
const FILE_FORMAT = 1;

interface SaveFile {
  app: typeof FILE_APP;
  format: number;
  name: string;
  savedAt: string;
  game: Hash;
}

/** The file contents for exporting a save. */
export function exportSaveText(record: SaveRecord): string {
  const file: SaveFile = {
    app: FILE_APP,
    format: FILE_FORMAT,
    name: record.name,
    savedAt: record.savedAt,
    game: record.game,
  };
  return JSON.stringify(file);
}

/** A file name for an exported save, e.g. "tester-day-12.json". */
export function exportFileName(summary: SaveSummary): string {
  const name =
    summary.commander
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'commander';
  return `${name}-day-${summary.days}.json`;
}

/** The file isn't a save this app can read (Strings.FileFormatBad). */
export class SaveFormatError extends Error {
  constructor(detail: string) {
    super(`Not a Space Trader save file: ${detail}`);
    this.name = 'SaveFormatError';
  }
}

function isObject(value: unknown): value is Hash {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Reads an exported file. Also accepts a bare Game.serialize() hash. Throws
 * SaveFormatError if it is neither; the game hash itself is checked when it
 * is loaded.
 */
export function parseSaveText(text: string): { name: string | null; game: Hash } {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new SaveFormatError('not JSON');
  }
  if (!isObject(data)) throw new SaveFormatError('not an object');

  if (data.app === FILE_APP) {
    if (typeof data.format !== 'number' || data.format > FILE_FORMAT)
      throw new SaveFormatError(`unknown format ${String(data.format)}`);
    if (!isObject(data.game)) throw new SaveFormatError('no game');
    return { name: typeof data.name === 'string' ? data.name : null, game: data.game };
  }
  if (typeof data._version === 'string') return { name: null, game: data };
  throw new SaveFormatError('unrecognized contents');
}

// #endregion
