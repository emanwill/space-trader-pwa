// The bridge between the mutable engine and Svelte. The engine's objects
// aren't reactive, so every change goes through `app.run` (or `app.bump`),
// which increments `version`. Views read the game through `app.game`, which
// depends on `version`, so they recompute after each change.
//
// Convention: compute what a component shows in a `$derived.by` that reads
// `app.game` (not a cached reference to the game), e.g.
//   const view = $derived.by(() => { const game = app.game; return game && build(game); });

import type { GameSession } from '../app/session';
import type { Game } from '../engine/game';

export type Screen = 'loading' | 'title' | 'new-commander' | 'game';
export type Tab = 'trade' | 'map' | 'station' | 'shipyard' | 'captain';
/** Sheets that several places can open; App renders them. */
export type Sheet = 'options' | 'about' | 'monster' | 'test';

class AppState {
  /** Bumped after every engine call; see the file comment. */
  version = $state(0);
  /** An engine action is running (it may be waiting on a dialog). */
  busy = $state(false);
  screen = $state<Screen>('loading');
  tab = $state<Tab>('trade');
  sheet = $state<Sheet | null>(null);
  /** A fatal startup error, shown instead of the app. */
  error = $state<string | null>(null);

  session = $state.raw<GameSession | null>(null);

  /** The game in progress. Reading it subscribes to `version`. */
  get game(): Game | null {
    void this.version;
    return this.session?.game ?? null;
  }

  bump(): void {
    this.version++;
  }

  /**
   * Runs an action on the game in progress through the session (which
   * autosaves, and handles the game ending), then refreshes the views.
   * Ignored while another action is running.
   */
  async run<T>(action: (game: Game) => T | Promise<T>): Promise<T | undefined> {
    return this.task(() => this.session!.act(action));
  }

  /** Runs any session call with the same busy guard and refresh as `run`. */
  async task<T>(work: () => Promise<T>): Promise<T | undefined> {
    if (this.busy || !this.session) return undefined;
    this.busy = true;
    try {
      return await work();
    } finally {
      this.busy = false;
      this.afterChange();
    }
  }

  /** Refreshes the views and leaves the game screens if the game ended. */
  afterChange(): void {
    if (this.screen === 'game' && !this.session?.game) this.screen = 'title';
    this.bump();
  }
}

export const app = new AppState();
