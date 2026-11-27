// A trip in progress: from Warp (or Jump) until the player is docked again.
// Notices during the trip go to its log instead of stacking up as alerts.
// The full-screen travel view opens once something needs the player (an
// encounter, a story or a question), and stays until they press Continue.

export interface LogEntry {
  id: number;
  title: string;
  text: string;
  /** "event" for encounter text, otherwise the alert kind it came from. */
  kind: 'event' | 'notice' | 'story' | 'confirm';
}

import type { EncounterView } from '../engine/game-ui';

let nextId = 1;

class Travel {
  active = $state(false);
  /** The travel view is on screen. */
  shown = $state(false);
  /** The trip is over; the view waits for Continue. */
  arrived = $state(false);
  from = $state('');
  to = $state('');
  log = $state<LogEntry[]>([]);
  /** The latest encounter round, kept on screen while the engine works on the choice. */
  encounter = $state.raw<EncounterView | null>(null);
  private onContinue: (() => void) | null = null;

  start(from: string, to: string): void {
    this.active = true;
    this.shown = false;
    this.arrived = false;
    this.from = from;
    this.to = to;
    this.log = [];
    this.encounter = null;
  }

  /** Opens the travel view (starting a trip if there is none, to be safe). */
  show(): void {
    if (!this.active) this.start('', '');
    this.shown = true;
  }

  add(kind: LogEntry['kind'], title: string, text: string): void {
    const last = this.log.at(-1);
    if (last && last.title === title && last.text === text) return;
    this.log = [...this.log, { id: nextId++, kind, title, text }];
  }

  /**
   * Ends the trip. If the view is open, waits for Continue so the player can
   * read the log; `gameOver` skips that (the game-over screen takes over).
   * Returns the log if the view never opened, so its notices can be shown
   * some other way.
   */
  async finish(gameOver: boolean): Promise<LogEntry[]> {
    const unseen = this.shown ? [] : this.log;
    if (this.shown && !gameOver) {
      this.arrived = true;
      await new Promise<void>((resolve) => (this.onContinue = resolve));
    }
    this.active = false;
    this.shown = false;
    this.arrived = false;
    this.encounter = null;
    return unseen;
  }

  continue(): void {
    this.onContinue?.();
    this.onContinue = null;
  }
}

export const travel = new Travel();
