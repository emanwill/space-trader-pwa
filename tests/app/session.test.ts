import { describe, expect, it } from 'vitest';
import { exportSaveText, makeSaveRecord, type SaveRecord } from '../../src/app/save-files';
import { GameSession, type NewCommander, SaveArrival, SaveDeparture } from '../../src/app/session';
import { MemoryStore } from '../../src/app/storage';
import { DialogResult } from '../../src/engine/data/alerts';
import { AlertType, CrewMemberId, Difficulty, GameEndType } from '../../src/engine/data/enums';
import { Strings } from '../../src/engine/data/strings';
import { currentGame } from '../../src/engine/game-context';
import { GameEndError } from '../../src/engine/game-end-error';
import { GameOptions } from '../../src/engine/model/game-options';
import { seededRandomSource, setRandomSource } from '../../src/engine/rng';
import { reachableSystem, useGameCleanup } from '../engine/game-helpers';
import { ScriptedUI } from '../engine/scripted-ui';

useGameCleanup();

const COMMANDER: NewCommander = {
  name: 'Sessa',
  difficulty: Difficulty.Easy,
  pilot: 5,
  fighter: 5,
  trader: 5,
  engineer: 5,
};

async function started(
  store = new MemoryStore(),
  ui = new ScriptedUI(),
): Promise<{ session: GameSession; store: MemoryStore; ui: ScriptedUI }> {
  setRandomSource(seededRandomSource(3));
  const session = await GameSession.open(store, ui);
  await session.newGame(COMMANDER);
  ui.clear();
  return { session, store, ui };
}

/** A store whose writes fail for keys that match. */
class FailingStore extends MemoryStore {
  constructor(private readonly failing: RegExp) {
    super();
  }
  override set(key: string, value: unknown): Promise<void> {
    if (this.failing.test(key)) return Promise.reject(new Error('Quota exceeded'));
    return super.set(key, value);
  }
}

describe('GameSession lifecycle', () => {
  it('opens with no game when nothing is saved', async () => {
    const session = await GameSession.open(new MemoryStore(), new ScriptedUI());
    expect(session.game).toBeNull();
    expect(session.hasUnsavedProgress).toBe(false);
    expect(await session.confirmAbandon()).toBe(true);
  });

  it('autosaves a new game and resumes it on the next open', async () => {
    const { session, store } = await started();
    session.game!.commander.cash = 4321;
    await session.act(() => {});

    const reopened = await GameSession.open(store, new ScriptedUI());
    expect(reopened.game).not.toBe(session.game);
    expect(reopened.game!.commander.name).toBe('Sessa');
    expect(reopened.game!.commander.cash).toBe(4321);
    expect(reopened.game!.serialize()).toEqual(session.game!.serialize());
    expect(currentGame()).toBe(reopened.game);
  });

  it('autosaves before and after a warp', async () => {
    const { session, store } = await started();
    const game = session.game!;
    const target = reachableSystem(game);
    game.selectedSystemId = target.id;

    const saves: number[] = [];
    const set = store.set.bind(store);
    store.set = (key, value) => {
      if (key === 'autosave') saves.push((value as SaveRecord).summary.days);
      return set(key, value);
    };
    await session.warp();

    expect(game.commander.currentSystem).toBe(target);
    expect(saves[0]).toBe(0);
    expect(saves.at(-1)).toBe(game.commander.days);
    expect(game.commander.days).toBeGreaterThan(0);
  });

  it('asks before abandoning unsaved progress', async () => {
    const { session, ui } = await started();
    // A new game counts as saved until a day passes.
    expect(session.hasUnsavedProgress).toBe(false);
    session.game!.commander.days = 3;
    expect(session.hasUnsavedProgress).toBe(true);

    expect(await session.confirmAbandon()).toBe(false);
    ui.answer(AlertType.GameAbandonConfirm, DialogResult.Yes);
    expect(await session.confirmAbandon()).toBe(true);
    expect(ui.names).toEqual(['GameAbandonConfirm', 'GameAbandonConfirm']);

    await session.saveAs('Slot');
    expect(session.hasUnsavedProgress).toBe(false);
  });

  it('shows the newspaper at the start when the default options say so', async () => {
    const store = new MemoryStore();
    const ui = new ScriptedUI();
    const session = await GameSession.open(store, ui);
    const options = new GameOptions(false);
    options.newsAutoShow = true;
    options.newsAutoPay = true;
    await session.saveDefaultOptions(options);
    await session.newGame(COMMANDER);
    expect(session.game!.options.newsAutoShow).toBe(true);
    expect(ui.names).toContain('Alert');
  });
});

describe('GameSession save slots', () => {
  it('needs a name for the first save, then saves over the same slot', async () => {
    const { session } = await started();
    expect(await session.save()).toBe(false);
    expect(session.saveSlotName).toBeNull();

    expect(await session.saveAs('  Trip one ')).toBe(true);
    expect(session.saveSlotName).toBe('Trip one');
    session.game!.commander.days = 7;
    expect(await session.save()).toBe(true);

    const slots = await session.listSaves();
    expect(slots).toHaveLength(1);
    expect(slots[0]!.name).toBe('Trip one');
    expect(slots[0]!.summary.days).toBe(7);
  });

  it('replaces a slot saved under the same name', async () => {
    const { session } = await started();
    await session.saveAs('A');
    await session.saveAs('B');
    session.game!.commander.days = 2;
    await session.saveAs('A');
    const slots = await session.listSaves();
    expect(slots.map((s) => s.name).sort()).toEqual(['A', 'B']);
    expect(slots.find((s) => s.name === 'A')!.summary.days).toBe(2);
  });

  it('loads a slot and keeps saving to it after a restart', async () => {
    const { session, store } = await started();
    await session.saveAs('Keep');
    const slotId = (await session.listSaves())[0]!.id;
    session.game!.commander.cash = 1;
    await session.act(() => {});

    expect(await session.loadSave(slotId)).toBe(true);
    expect(session.game!.commander.cash).not.toBe(1);
    expect(session.hasUnsavedProgress).toBe(false);

    const reopened = await GameSession.open(store, new ScriptedUI());
    expect(reopened.saveSlotName).toBe('Keep');
    expect(reopened.hasUnsavedProgress).toBe(false);
    reopened.game!.commander.days = 9;
    expect(await reopened.save()).toBe(true);
    expect((await reopened.listSaves())[0]!.summary.days).toBe(9);
  });

  it('forgets the slot when it is deleted', async () => {
    const { session } = await started();
    await session.saveAs('Gone');
    const [slot] = await session.listSaves();
    await session.deleteSave(slot!.id);
    expect(await session.listSaves()).toEqual([]);
    expect(session.saveSlotName).toBeNull();
    expect(await session.save()).toBe(false);
  });

  it('reports a slot that no longer exists', async () => {
    const { session, ui } = await started();
    expect(await session.loadSave('nope')).toBe(false);
    expect(ui.names).toEqual(['FileErrorOpen']);
  });

  it('exports and imports a game', async () => {
    const { session, store } = await started();
    session.game!.commander.cash = 777;
    const exported = session.exportGame();
    expect(exported.fileName).toBe('sessa-day-0.json');

    const other = await GameSession.open(new MemoryStore(), new ScriptedUI());
    expect(await other.importSave(exported.text, exported.fileName)).toBe(true);
    expect(other.game!.commander.cash).toBe(777);
    expect(other.saveSlotName).toBeNull();
    expect(other.hasUnsavedProgress).toBe(false);

    await session.saveAs('Exported');
    const slot = (await session.listSaves())[0]!;
    const fromSlot = await session.exportSave(slot.id);
    expect(fromSlot!.text).toBe(exportSaveText((await store.get<SaveRecord>(`save/${slot.id}`))!));
    expect(await session.exportSave('nope')).toBeNull();
  });

  it('keeps the current game when an import fails', async () => {
    const { session, ui } = await started();
    const game = session.game!;

    expect(await session.importSave('not a save', 'junk.json')).toBe(false);
    expect(ui.alerts.at(-1)).toMatchObject({
      type: AlertType.FileErrorOpen,
      args: ['junk.json', Strings.FileFormatBad],
    });

    // Valid wrapper, broken game: Game.fromHash fails part way through.
    const broken = JSON.stringify({ _version: '2.00', _universe: [], _commander: {} });
    expect(await session.importSave(broken, 'broken.json')).toBe(false);
    expect(ui.alerts.at(-1)!.args).toEqual(['broken.json', Strings.FileFormatBad]);
    expect(session.game).toBe(game);
    expect(currentGame()).toBe(game);
    expect(Strings.CrewMemberNames[CrewMemberId.Commander]).toBe('Sessa');
  });

  it('refuses a save from a newer version', async () => {
    const { session, ui } = await started();
    const future = { ...session.game!.serialize(), _version: '3.00' };
    expect(await session.importSave(JSON.stringify(future), 'future.json')).toBe(false);
    expect(ui.alerts.at(-1)!.args).toEqual(['future.json', Strings.FileFutureVersion]);
  });

  it('keeps the autosave when it cannot be loaded', async () => {
    const store = new MemoryStore();
    const { session } = await started(store);
    const record = makeSaveRecord(session.game!, 'x');
    await store.set('autosave', { ...record, game: { ...record.game, _version: '9.00' } });

    const ui = new ScriptedUI();
    const reopened = await GameSession.open(store, ui);
    expect(reopened.game).toBeNull();
    expect(ui.alerts[0]!.args).toEqual(['the autosave', Strings.FileFutureVersion]);
    expect(await store.get('autosave')).toBeDefined();
  });

  it('reports a failed write and does not count it as saved', async () => {
    const store = new FailingStore(/^save\//);
    const { session, ui } = await started(store);
    session.game!.commander.days = 4;
    expect(await session.saveAs('Full')).toBe(false);
    expect(ui.alerts.at(-1)).toMatchObject({
      type: AlertType.FileErrorSave,
      args: ['Full', 'Quota exceeded'],
    });
    expect(session.saveSlotName).toBeNull();
    expect(session.hasUnsavedProgress).toBe(true);
  });

  it('keeps the PlanB cheat saves to one departure and one arrival slot', async () => {
    const { session } = await started();
    const game = session.game!;
    game.autoSave = true;
    for (let trip = 0; trip < 2; trip++) {
      game.commander.ship.fuel = game.commander.ship.fuelTanks;
      game.selectedSystemId = reachableSystem(game).id;
      await session.warp();
      expect(session.game).not.toBeNull();
    }
    const names = (await session.listSaves()).map((s) => s.name).sort();
    expect(names).toEqual([SaveArrival, SaveDeparture]);
    // The cheat saves don't become the Save slot.
    expect(session.saveSlotName).toBeNull();
  });
});

describe('GameSession game over', () => {
  it('ends the game when an action throws GameEndError', async () => {
    const { session, store, ui } = await started();
    const result = await session.act((game) => {
      throw new GameEndError(game, GameEndType.Killed);
    });
    expect(result).toBeUndefined();
    expect(session.game).toBeNull();
    expect(ui.names).toEqual(['GameEndKilled', 'GameEndScore', 'GameEndHighScoreAchieved']);
    expect(await store.get('autosave')).toBeUndefined();
    expect(() => currentGame()).toThrow();

    const lines = await session.highScores();
    expect(lines).toHaveLength(1);
    expect(lines[0]!.name).toBe('Sessa');
    expect(lines[0]!.status).toMatch(/^Was killed in 0 days/);

    // The next open starts without a game.
    expect((await GameSession.open(store, new ScriptedUI())).game).toBeNull();
  });

  it('retires only after confirmation', async () => {
    const { session, ui } = await started();
    expect(await session.retire()).toBe(false);
    expect(session.game).not.toBeNull();

    ui.answer(AlertType.GameRetire, DialogResult.Yes);
    expect(await session.retire()).toBe(true);
    expect(session.game).toBeNull();
    expect(ui.names.slice(-3)).toEqual([
      'GameEndRetired',
      'GameEndScore',
      'GameEndHighScoreAchieved',
    ]);
  });

  it('keeps the best three scores across games', async () => {
    const store = new MemoryStore();
    for (const cash of [1000, 500000, 20000, 3000000]) {
      const ui = new ScriptedUI({ [AlertType.GameRetire]: [DialogResult.Yes] });
      const { session } = await started(store, ui);
      session.game!.commander.cash = cash;
      await session.retire();
    }
    const ui = new ScriptedUI();
    const session = await GameSession.open(store, ui);
    const lines = await session.highScores();
    // Worth includes the Gnat, at 10,000 credits. The 1,000-credit game dropped off.
    expect(lines.map((l) => l.status.match(/worth ([\d,]+)/)![1])).toEqual([
      '3,010,000',
      '510,000',
      '30,000',
    ]);

    expect(await session.clearHighScores()).toBe(false);
    ui.answer(AlertType.GameClearHighScores, DialogResult.Yes);
    expect(await session.clearHighScores()).toBe(true);
    expect(await session.highScores()).toEqual([]);
  });

  it('ends the game from a jump that dies on arrival', async () => {
    const { session, ui } = await started();
    const game = session.game!;
    game.canSuperWarp = true;
    game.selectedSystemId = reachableSystem(game).id;
    ui.answer(AlertType.ChartJump, DialogResult.Yes);
    const warp = game.warp.bind(game);
    game.warp = async (via) => {
      await warp(via);
      throw new GameEndError(game, GameEndType.Killed);
    };
    expect(await session.jump()).toBe(true);
    expect(game.canSuperWarp).toBe(false);
    expect(session.game).toBeNull();
  });
});

describe('GameSession options', () => {
  it('applies options to the game and autosaves them', async () => {
    const { session, store } = await started();
    const options = new GameOptions(false);
    options.autoFuel = true;
    options.leaveEmpty = 3;
    await session.setOptions(options);
    expect(session.game!.options.leaveEmpty).toBe(3);
    const reopened = await GameSession.open(store, new ScriptedUI());
    expect(reopened.game!.options.autoFuel).toBe(true);
  });

  it('saves and loads default options for new games', async () => {
    const store = new MemoryStore();
    const ui = new ScriptedUI();
    const session = await GameSession.open(store, ui);

    const loaded = new GameOptions(false);
    loaded.autoRepair = true;
    await session.loadDefaultOptions(loaded);
    expect(ui.alerts[0]).toMatchObject({ type: AlertType.FileErrorOpen });
    expect(loaded.autoRepair).toBe(false); // Back to the built-in defaults.

    const defaults = new GameOptions(false);
    defaults.autoRepair = true;
    defaults.alwaysIgnoreTraders = false;
    expect(await session.saveDefaultOptions(defaults)).toBe(true);
    await session.loadDefaultOptions(loaded);
    expect(loaded.autoRepair).toBe(true);

    // A later open picks the defaults up for new games.
    const reopened = await GameSession.open(store, new ScriptedUI());
    const game = await reopened.newGame(COMMANDER);
    expect(game.options.autoRepair).toBe(true);
    expect(game.options.alwaysIgnoreTraders).toBe(false);
  });
});
