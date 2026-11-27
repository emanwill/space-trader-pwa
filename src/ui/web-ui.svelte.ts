// The browser's GameUI. How an alert is shown depends on its kind
// (alert-kinds.ts):
// - confirm and story alerts go on a dialog stack that DialogHost renders;
//   dialogs nest (a quantity picker over the plunder screen), so it's a stack;
// - notices resolve at once and become a toast, or a trip log entry;
// - the game-over alerts gather on one page (GameOverScreen).
// Encounters are shown by the travel view rather than the dialog stack.

import { Alerts, AlertImage, DialogResult, type AlertButton } from '../engine/data/alerts';
import { AlertType } from '../engine/data/enums';
import { stringVars } from '../engine/format';
import type {
  CargoQuantityRequest,
  EncounterChoice,
  EncounterView,
  GameUI,
} from '../engine/game-ui';
import { alertKind, type AlertKind } from './alert-kinds';
import { app } from './state.svelte';
import { travel } from './travel.svelte';

export interface AlertDialog {
  kind: 'alert';
  type: AlertType | null;
  alertKind: AlertKind;
  title: string;
  message: string;
  image: AlertImage | null;
  buttons: AlertButton[];
  resolve: (result: DialogResult) => void;
}

export interface QuantityDialog {
  kind: 'quantity';
  request: CargoQuantityRequest;
  resolve: (quantity: number) => void;
}

export interface EncounterDialog {
  kind: 'encounter';
  view: EncounterView;
  resolve: (choice: EncounterChoice) => void;
}

export interface CargoDialog {
  kind: 'plunder' | 'jettison';
  resolve: () => void;
}

export interface PromptDialog {
  kind: 'prompt';
  title: string;
  label: string;
  value: string;
  confirm: string;
  resolve: (value: string | null) => void;
}

export type Dialog = AlertDialog | QuantityDialog | EncounterDialog | CargoDialog | PromptDialog;

type Unresolved<D extends Dialog> = Omit<D, 'resolve'>;

export interface Toast {
  id: number;
  title: string;
  text: string;
}

/** What the game-over page shows, gathered from the GameEnd alerts. */
export interface GameOver {
  title: string;
  image: AlertImage | null;
  score: string | null;
  result: string | null;
  /** Set once the last alert arrives: closes the page. */
  resolve: (() => void) | null;
}

const MAX_MESSAGES = 100;
const TOAST_MS = 5000;
let nextToast = 1;

class WebUI implements GameUI {
  stack = $state.raw<Dialog[]>([]);
  toasts = $state<Toast[]>([]);
  /** Every notice and story so far, newest last (the menu's Messages). */
  messages = $state<Toast[]>([]);
  gameOver = $state<GameOver | null>(null);

  get top(): Dialog | null {
    return this.stack.at(-1) ?? null;
  }

  private show<D extends Dialog, R>(dialog: Unresolved<D>): Promise<R> {
    // The engine may have changed things before asking; show them behind the dialog.
    app.bump();
    return new Promise<R>((resolve) => {
      const entry = {
        ...dialog,
        resolve: (value: R) => {
          this.stack = this.stack.filter((d) => d !== entry);
          resolve(value);
        },
      } as unknown as D;
      this.stack = [...this.stack, entry];
    });
  }

  private remember(title: string, text: string): void {
    this.messages = [...this.messages, { id: nextToast++, title, text }].slice(-MAX_MESSAGES);
  }

  toast(title: string, text: string): void {
    const toast = { id: nextToast++, title, text };
    this.toasts = [...this.toasts, toast].slice(-3);
    setTimeout(() => this.dismissToast(toast.id), TOAST_MS);
  }

  dismissToast(id: number): void {
    this.toasts = this.toasts.filter((t) => t.id !== id);
  }

  async alert(type: AlertType, ...args: string[]): Promise<DialogResult> {
    const def = Alerts[type];
    const kind = alertKind(type);
    const title = stringVars(def.title, ...args);
    const message = 'message' in def ? stringVars(def.message, ...args) : '';

    switch (kind) {
      case 'notice':
        this.remember(title, message);
        if (travel.active) travel.add('notice', title, message);
        else this.toast(title, message);
        app.bump();
        return DialogResult.OK;

      case 'game-over':
        return this.gameOverAlert(type, title, message, 'image' in def ? def.image : null);

      default: {
        if (travel.active) travel.show();
        const result = await this.show<AlertDialog, DialogResult>({
          kind: 'alert',
          type,
          alertKind: kind,
          title,
          message,
          image: 'image' in def ? def.image : null,
          buttons: 'buttons' in def ? def.buttons : [{ text: 'Ok', result: DialogResult.OK }],
        });
        if (kind === 'story') {
          this.remember(title, message);
          if (travel.active) travel.add('story', title, message);
        } else if (travel.active) {
          const answer = 'buttons' in def ? def.buttons.find((b) => b.result === result) : null;
          travel.add('confirm', title, answer ? `${message}\n→ ${answer.text}` : message);
        }
        return result;
      }
    }
  }

  /** GameEnd's alerts: the ending picture, the score, then the high-score verdict. */
  private gameOverAlert(
    type: AlertType,
    title: string,
    message: string,
    image: AlertImage | null,
  ): Promise<DialogResult> {
    const page: GameOver = this.gameOver ?? {
      title,
      image: null,
      score: null,
      result: null,
      resolve: null,
    };
    if (image !== null) {
      page.title = title;
      page.image = image;
    } else if (type === AlertType.GameEndScore) page.score = message;
    else page.result = message;
    this.gameOver = { ...page };
    app.bump();

    // The high-score verdict is GameEnd's last alert: wait for the player there.
    const last =
      type === AlertType.GameEndHighScoreAchieved ||
      type === AlertType.GameEndHighScoreCheat ||
      type === AlertType.GameEndHighScoreMissed;
    if (!last) return Promise.resolve(DialogResult.OK);
    return new Promise((resolve) => {
      this.gameOver = {
        ...this.gameOver!,
        resolve: () => {
          this.gameOver = null;
          resolve(DialogResult.OK);
        },
      };
    });
  }

  /** A message of the UI's own, shown like a story alert (or a question, with buttons). */
  message(title: string, message: string, buttons?: AlertButton[]): Promise<DialogResult> {
    return this.show<AlertDialog, DialogResult>({
      kind: 'alert',
      type: null,
      alertKind: buttons && buttons.length > 1 ? 'confirm' : 'story',
      title,
      message,
      image: null,
      buttons: buttons ?? [{ text: 'Ok', result: DialogResult.OK }],
    });
  }

  /** Asks for a line of text; resolves with null if cancelled. */
  prompt(title: string, label: string, value = '', confirm = 'Ok'): Promise<string | null> {
    return this.show<PromptDialog, string | null>({ kind: 'prompt', title, label, value, confirm });
  }

  cargoQuantity(request: CargoQuantityRequest): Promise<number> {
    return this.show<QuantityDialog, number>({ kind: 'quantity', request });
  }

  plunder(): Promise<void> {
    return this.show<CargoDialog, void>({ kind: 'plunder' });
  }

  jettison(): Promise<void> {
    return this.show<CargoDialog, void>({ kind: 'jettison' });
  }

  encounterAction(view: EncounterView): Promise<EncounterChoice> {
    travel.show();
    travel.encounter = view;
    if (view.text) travel.add('event', '', view.text);
    if (view.action) travel.add('event', '', view.action);
    return this.show<EncounterDialog, EncounterChoice>({ kind: 'encounter', view });
  }
}

export const ui = new WebUI();
