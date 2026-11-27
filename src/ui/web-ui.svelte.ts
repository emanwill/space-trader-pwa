// The browser's GameUI: every dialog the engine asks for goes on a stack that
// DialogHost renders, and the engine's promise resolves when the player
// answers. Dialogs can nest (a quantity picker over the plunder screen), so
// it's a stack rather than a single slot.

import { Alerts, AlertImage, DialogResult, type AlertButton } from '../engine/data/alerts';
import type { AlertType } from '../engine/data/enums';
import { stringVars } from '../engine/format';
import type {
  CargoQuantityRequest,
  EncounterChoice,
  EncounterView,
  GameUI,
} from '../engine/game-ui';
import { app } from './state.svelte';

export interface AlertDialog {
  kind: 'alert';
  type: AlertType | null;
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

class WebUI implements GameUI {
  stack = $state.raw<Dialog[]>([]);

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

  alert(type: AlertType, ...args: string[]): Promise<DialogResult> {
    const def = Alerts[type];
    const isImage = 'image' in def;
    return this.show<AlertDialog, DialogResult>({
      kind: 'alert',
      type,
      title: stringVars(def.title, ...args),
      message: isImage ? '' : stringVars(def.message, ...args),
      image: isImage ? def.image : null,
      buttons: isImage ? [{ text: 'Ok', result: DialogResult.OK }] : def.buttons,
    });
  }

  /** A message of the UI's own, shown like an alert. */
  message(title: string, message: string, buttons?: AlertButton[]): Promise<DialogResult> {
    return this.show<AlertDialog, DialogResult>({
      kind: 'alert',
      type: null,
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
    return this.show<EncounterDialog, EncounterChoice>({ kind: 'encounter', view });
  }
}

export const ui = new WebUI();
