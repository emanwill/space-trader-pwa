// The interface the engine uses for everything the original did with dialogs.
// The original passed a WinForms `owner` window into methods that show alerts;
// the port passes a GameUI instead. Phase 3 adds the remaining dialogs
// (quantity pickers, encounters, plunder, jettison).

import type { DialogResult } from './data/alerts';
import type { AlertType } from './data/enums';

export interface GameUI {
  /** C# `FormAlert.Alert(type, owner, args...)`. Resolves with the button chosen. */
  alert(type: AlertType, ...args: string[]): Promise<DialogResult>;
}
