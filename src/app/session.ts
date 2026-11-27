// The running game and everything around it that the original main window
// (Form_SpaceTrader.cs) handled: new game, load, save, save as, retire, the
// game-over flow, autosaves, options defaults and high scores. The UI calls
// these instead of the engine's top-level actions so saving and game over
// happen in one place.
//
// PORT: changes from the original, which saved only when asked (or on the
// "PlanB" cheat):
// - The game is autosaved after every action and before and after each warp,
//   and the session resumes it on open. On a phone the OS can close the app
//   at any time; an interrupted trip resumes from its departure.
// - Save files became named slots in IndexedDB, plus export and import of
//   JSON files. Loading a file never touches the file again; Save after an
//   import asks for a slot name.
// - SaveGameDays (used for "abandon your game?") is set only when a save
//   succeeds. The original set it even after a failed save.

import { DialogResult } from '../engine/data/alerts';
import { AlertType, CrewMemberId, type Difficulty, GameEndType } from '../engine/data/enums';
import { Strings } from '../engine/data/strings';
import { FutureVersionError, Game } from '../engine/game';
import { setCurrentGame } from '../engine/game-context';
import { GameEndError } from '../engine/game-end-error';
import type { GameUI } from '../engine/game-ui';
import {
  clearHighScores,
  emptyHighScores,
  gameEnd,
  type HighScoreLine,
  highScoreLines,
  type HighScoreStore,
  highScoresFromHash,
  serializeHighScores,
} from '../engine/high-scores';
import { GameOptions, setDefaultOptions } from '../engine/model/game-options';
import type { Hash } from '../engine/serialization';
import * as services from '../engine/services';
import {
  exportFileName,
  exportSaveText,
  makeSaveRecord,
  parseSaveText,
  type SaveRecord,
  type SaveSummary,
} from './save-files';
import type { KeyValueStore } from './storage';

// Storage keys.
const AUTOSAVE = 'autosave';
const SLOT_PREFIX = 'save/';
const HIGH_SCORES = 'high-scores';
const DEFAULT_OPTIONS = 'default-options';

// Names used in FileErrorOpen / FileErrorSave alerts ("...trying to open ^1.").
const AUTOSAVE_NAME = 'the autosave';
const HIGH_SCORES_NAME = 'the high score table';
const DEFAULT_OPTIONS_NAME = 'the default options';

// The "PlanB" cheat's save files (SAVE_DEPARTURE, SAVE_ARRIVAL), kept as slots.
export const SaveDeparture = 'autosave_departure';
export const SaveArrival = 'autosave_arrival';

/** FormNewCommander's results. */
export interface NewCommander {
  name: string;
  difficulty: Difficulty;
  pilot: number;
  fighter: number;
  trader: number;
  engineer: number;
}

/** A save slot as the load and save screens list it. */
export interface SaveSlot {
  id: string;
  name: string;
  savedAt: string;
  summary: SaveSummary;
}

/** An exported save, ready for the UI to offer as a download. */
export interface ExportedSave {
  fileName: string;
  text: string;
}

/** The autosave also remembers which slot the game came from, so Save keeps working after a restart. */
interface AutosaveRecord extends SaveRecord {
  slot: { id: string; name: string } | null;
  slotDays: number;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export class GameSession {
  /** The game in progress, or null before one starts and after it ends. */
  game: Game | null = null;

  private saveSlot: { id: string; name: string } | null = null; // SaveGameFile
  private saveGameDays = -1; // SaveGameDays

  private constructor(
    readonly store: KeyValueStore,
    readonly ui: GameUI,
  ) {}

  /** Opens the session: loads the default options and resumes the autosaved game, if any. */
  static async open(store: KeyValueStore, ui: GameUI): Promise<GameSession> {
    const session = new GameSession(store, ui);
    setDefaultOptions((await store.get<Hash>(DEFAULT_OPTIONS)) ?? null);

    const autosave = await store.get<AutosaveRecord>(AUTOSAVE);
    if (autosave && (await session.loadGame(autosave.game, AUTOSAVE_NAME))) {
      session.saveSlot = autosave.slot;
      session.saveGameDays = autosave.slotDays;
    }
    return session;
  }

  // #region Game lifecycle (mnuGameNew_Click, mnuGameLoad_Click, LoadGame, SaveGame, ...)

  private requireGame(): Game {
    if (!this.game) throw new Error('No game in progress');
    return this.game;
  }

  /** The slot that Save writes to (SaveGameFile), or null if Save must ask for a name. */
  get saveSlotName(): string | null {
    return this.saveSlot?.name ?? null;
  }

  /** True if the game has moved on since it was last saved to a slot. */
  get hasUnsavedProgress(): boolean {
    return this.game !== null && this.game.commander.days !== this.saveGameDays;
  }

  /**
   * The GameAbandonConfirm check before New Game and Load Game. The UI calls
   * it before showing the new commander or load screens.
   */
  async confirmAbandon(): Promise<boolean> {
    return (
      !this.hasUnsavedProgress ||
      (await this.ui.alert(AlertType.GameAbandonConfirm)) === DialogResult.Yes
    );
  }

  /** mnuGameNew_Click, after the new commander screen. */
  async newGame(commander: NewCommander): Promise<Game> {
    const game = Game.newGame(
      commander.name,
      commander.difficulty,
      commander.pilot,
      commander.fighter,
      commander.trader,
      commander.engineer,
      this.ui,
    );
    this.game = game;
    this.saveSlot = null;
    this.saveGameDays = 0;
    await this.autosave();

    if (game.options.newsAutoShow) await this.act((g) => g.showNewspaper());
    return game;
  }

  /**
   * LoadGame: makes the game from `hash` the current one. On a bad or newer
   * save, shows FileErrorOpen and keeps the previous game.
   */
  private async loadGame(hash: Hash, displayName: string): Promise<boolean> {
    const commanderName = Strings.CrewMemberNames[CrewMemberId.Commander]!;
    let game: Game;
    try {
      game = Game.fromHash(hash, this.ui);
      // Touch what every screen needs, so a damaged save fails here and not later.
      if (!game.commander.currentSystem) throw new Error('No current system');
    } catch (error) {
      // Game.fromHash made the half-loaded game current; put things back.
      setCurrentGame(this.game);
      Strings.CrewMemberNames[CrewMemberId.Commander] = commanderName;
      await this.ui.alert(
        AlertType.FileErrorOpen,
        displayName,
        error instanceof FutureVersionError ? Strings.FileFutureVersion : Strings.FileFormatBad,
      );
      return false;
    }
    this.game = game;
    return true;
  }

  /** mnuGameLoad_Click with a slot picked. Call confirmAbandon first. */
  async loadSave(id: string): Promise<boolean> {
    const record = await this.store.get<SaveRecord>(this.slotKey(id));
    if (!record) {
      await this.ui.alert(AlertType.FileErrorOpen, 'the save', 'It no longer exists.');
      return false;
    }
    if (!(await this.loadGame(record.game, record.name))) return false;
    this.saveSlot = { id, name: record.name };
    this.saveGameDays = this.game!.commander.days;
    await this.autosave();
    return true;
  }

  /** Loads an exported file. Call confirmAbandon first. */
  async importSave(text: string, fileName: string): Promise<boolean> {
    let hash: Hash;
    try {
      hash = parseSaveText(text).game;
    } catch {
      await this.ui.alert(AlertType.FileErrorOpen, fileName, Strings.FileFormatBad);
      return false;
    }
    if (!(await this.loadGame(hash, fileName))) return false;
    this.saveSlot = null;
    this.saveGameDays = this.game!.commander.days;
    await this.autosave();
    return true;
  }

  /**
   * mnuGameSave_Click: saves over the current slot. Returns false without
   * saving if there is none; the UI then asks for a name and calls saveAs.
   */
  async save(): Promise<boolean> {
    if (this.saveSlot === null) return false;
    return this.saveGame(this.saveSlot.id, this.saveSlot.name, true);
  }

  /** mnuGameSaveAs_Click: saves to the slot with this name, replacing it if it exists. */
  async saveAs(name: string): Promise<boolean> {
    return this.saveNamed(name.trim() || this.requireGame().commander.name, true);
  }

  /** Saves to the slot called `name`, as saving to a file name would. */
  private async saveNamed(name: string, saveFileName: boolean): Promise<boolean> {
    const existing = (await this.listSaves()).find((slot) => slot.name === name);
    return this.saveGame(existing?.id ?? crypto.randomUUID(), name, saveFileName);
  }

  /** SaveGame(fileName, saveFileName). */
  private async saveGame(id: string, name: string, saveFileName: boolean): Promise<boolean> {
    const game = this.requireGame();
    if (!(await this.write(this.slotKey(id), makeSaveRecord(game, name), name))) return false;
    if (saveFileName) this.saveSlot = { id, name };
    this.saveGameDays = game.commander.days;
    await this.autosave();
    return true;
  }

  /** Save slots, newest first. */
  async listSaves(): Promise<SaveSlot[]> {
    const slots: SaveSlot[] = [];
    for (const key of await this.store.keys(SLOT_PREFIX)) {
      const record = await this.store.get<SaveRecord>(key);
      if (record)
        slots.push({
          id: key.slice(SLOT_PREFIX.length),
          name: record.name,
          savedAt: record.savedAt,
          summary: record.summary,
        });
    }
    return slots.sort((a, b) => b.savedAt.localeCompare(a.savedAt));
  }

  async deleteSave(id: string): Promise<void> {
    await this.store.delete(this.slotKey(id));
    if (this.saveSlot?.id === id) {
      this.saveSlot = null;
      await this.autosave();
    }
  }

  /** The game in progress as an export file. */
  exportGame(): ExportedSave {
    const game = this.requireGame();
    const record = makeSaveRecord(game, game.commander.name);
    return { fileName: exportFileName(record.summary), text: exportSaveText(record) };
  }

  /** A save slot as an export file, or null if it no longer exists. */
  async exportSave(id: string): Promise<ExportedSave | null> {
    const record = await this.store.get<SaveRecord>(this.slotKey(id));
    if (!record) return null;
    return { fileName: exportFileName(record.summary), text: exportSaveText(record) };
  }

  private slotKey(id: string): string {
    return SLOT_PREFIX + id;
  }

  /** Writes to storage, showing FileErrorSave if it fails (Functions.SaveFile). */
  private async write(key: string, value: unknown, displayName: string): Promise<boolean> {
    try {
      await this.store.set(key, value);
      return true;
    } catch (error) {
      await this.ui.alert(AlertType.FileErrorSave, displayName, errorMessage(error));
      return false;
    }
  }

  /** Saves the game in progress so it can resume after the app is closed. */
  async autosave(): Promise<void> {
    const game = this.game;
    if (!game || game.endStatus !== GameEndType.NA) return;
    const record: AutosaveRecord = {
      ...makeSaveRecord(game, game.commander.name),
      slot: this.saveSlot,
      slotDays: this.saveGameDays,
    };
    await this.write(AUTOSAVE, record, AUTOSAVE_NAME);
  }

  // #endregion

  // #region Actions (the try/catch GameEndException blocks around game calls)

  /**
   * Runs an engine action on the game in progress, then autosaves. If the
   * game ends (GameEndError), runs the game-over flow instead and returns
   * undefined; `game` is then null.
   */
  async act<T>(action: (game: Game) => T | Promise<T>): Promise<T | undefined> {
    const game = this.requireGame();
    try {
      const result = await action(game);
      await this.autosave();
      return result;
    } catch (error) {
      if (!(error instanceof GameEndError)) throw error;
      await this.endGame();
      return undefined;
    }
  }

  /** The departure save before a warp. */
  private async departureSave(game: Game): Promise<void> {
    await this.autosave();
    if (game.autoSave) await this.saveNamed(SaveDeparture, false);
  }

  /** The arrival save after a warp. */
  private async arrivalSave(game: Game): Promise<void> {
    await this.autosave();
    if (game.autoSave) await this.saveNamed(SaveArrival, false);
  }

  /** The "Go" cheat: Game.WarpDirect to the selected system, with the same saves as a warp. */
  async warpDirect(): Promise<void> {
    await this.act(async (game) => {
      await this.departureSave(game);
      await game.warpDirect();
      await this.arrivalSave(game);
    });
  }

  /** btnWarp_Click. */
  async warp(): Promise<void> {
    await this.act(async (game) => {
      await this.departureSave(game);
      await game.warp(false);
      await this.arrivalSave(game);
    });
  }

  /**
   * btnJump_Click (services.jump). Returns true if the jump happened.
   * `onDeparture` runs once the player has confirmed, just before the jump.
   */
  async jump(onDeparture?: () => void): Promise<boolean> {
    return (
      (await this.act(async (game) => {
        const jumped = await services.jump(game, async () => {
          await this.departureSave(game);
          onDeparture?.();
        });
        if (jumped) await this.arrivalSave(game);
        return jumped;
      })) ?? true
    );
  }

  /** mnuRetire_Click. Returns true if the commander retired; `game` is then null. */
  async retire(): Promise<boolean> {
    if (!(await services.retire(this.requireGame()))) return false;
    await this.endGame();
    return true;
  }

  /**
   * GameEnd. The autosave goes first so a finished game can't be resumed,
   * even if the app closes during the game-over screens.
   */
  private async endGame(): Promise<void> {
    const game = this.requireGame();
    this.game = null;
    try {
      await this.store.delete(AUTOSAVE);
    } catch {
      // The game is over either way; a stale autosave is the worst case.
    }
    await gameEnd(game, this.highScoreStore);
  }

  // #endregion

  // #region Options (mnuOptions_Click, FormOptions btnLoad_Click / btnSave_Click)

  /** mnuOptions_Click: applies the options screen's values to the game. */
  async setOptions(options: GameOptions): Promise<void> {
    this.requireGame().options.copyValues(options);
    await this.autosave();
  }

  /** GameOptions.SaveAsDefaults: new games start with these options. */
  async saveDefaultOptions(options: GameOptions): Promise<boolean> {
    const hash = options.serialize();
    if (!(await this.write(DEFAULT_OPTIONS, hash, DEFAULT_OPTIONS_NAME))) return false;
    setDefaultOptions(hash);
    return true;
  }

  /**
   * GameOptions.LoadFromDefaults(true): copies the saved defaults into
   * `options`. If none were saved, says so and copies the built-in defaults.
   */
  async loadDefaultOptions(options: GameOptions): Promise<void> {
    const hash = await this.store.get<Hash>(DEFAULT_OPTIONS);
    if (!hash)
      await this.ui.alert(
        AlertType.FileErrorOpen,
        DEFAULT_OPTIONS_NAME,
        'No default options have been saved.',
      );
    options.copyValues(hash ? GameOptions.fromHash(hash) : new GameOptions(false));
  }

  // #endregion

  // #region High scores (Functions.GetHighScores, FormViewHighScores)

  readonly highScoreStore: HighScoreStore = {
    load: async () => {
      const list = await this.store.get<(Hash | null)[]>(HIGH_SCORES);
      if (!list) return emptyHighScores();
      try {
        return highScoresFromHash(list);
      } catch {
        await this.ui.alert(AlertType.FileErrorOpen, HIGH_SCORES_NAME, Strings.FileFormatBad);
        return emptyHighScores();
      }
    },
    save: async (table) => {
      await this.write(HIGH_SCORES, serializeHighScores(table), HIGH_SCORES_NAME);
    },
  };

  /** The high score screen's rows, best first. */
  async highScores(): Promise<HighScoreLine[]> {
    return highScoreLines(await this.highScoreStore.load());
  }

  /** Clears the table after the GameClearHighScores confirmation. */
  async clearHighScores(): Promise<boolean> {
    return clearHighScores(this.ui, this.highScoreStore);
  }

  // #endregion
}
