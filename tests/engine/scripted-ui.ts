// A GameUI for tests: records every alert and answers questions from a script.

import { DialogResult } from '../../src/engine/data/alerts';
import { AlertType } from '../../src/engine/data/enums';
import type { GameUI } from '../../src/engine/game-ui';

export interface AlertCall {
  type: AlertType;
  name: string;
  args: string[];
}

export class ScriptedUI implements GameUI {
  readonly alerts: AlertCall[] = [];

  /**
   * @param answers Answers to give, in order, to alerts of the listed types.
   *   Any other alert, or one asked after its answers run out, gets OK.
   */
  constructor(private readonly answers: Partial<Record<AlertType, DialogResult[]>> = {}) {}

  async alert(type: AlertType, ...args: string[]): Promise<DialogResult> {
    this.alerts.push({ type, name: AlertType[type], args });
    return this.answers[type]?.shift() ?? DialogResult.OK;
  }

  get names(): string[] {
    return this.alerts.map((a) => a.name);
  }
}
