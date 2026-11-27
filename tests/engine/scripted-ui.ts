// A GameUI for tests: records every alert and dialog, and answers from a
// script, falling back to simple defaults.

import { DialogResult } from '../../src/engine/data/alerts';
import { AlertType } from '../../src/engine/data/enums';
import {
  EncounterChoice,
  type CargoQuantityRequest,
  type EncounterView,
  type GameUI,
} from '../../src/engine/game-ui';

export interface AlertCall {
  type: AlertType;
  name: string;
  args: string[];
}

/** Picks an encounter choice when the script has none queued. */
export type EncounterStrategy = (view: EncounterView) => EncounterChoice;

/**
 * Avoids trouble: keeps continuous attack running, otherwise ignores, submits
 * to inspection, drinks, flees, or surrenders, in that order of preference.
 */
export const peacefulStrategy: EncounterStrategy = (view) => {
  if (view.continuous) return EncounterChoice.Tick;
  const preferred = [
    EncounterChoice.Ignore,
    EncounterChoice.Submit,
    EncounterChoice.Drink,
    EncounterChoice.Flee,
    EncounterChoice.Surrender,
  ];
  return preferred.find((c) => view.choices.includes(c)) ?? view.choices[0]!;
};

export interface ScriptedUIOptions {
  /** Answers to give, in order, to alerts of the listed types. Others get OK. */
  answers?: Partial<Record<AlertType, DialogResult[]>>;
  /** Quantities to give, in order, to cargo pickers. Others get the maximum. */
  quantities?: number[];
  /** Encounter choices to make, in order, before falling back to `strategy`. */
  encounterChoices?: EncounterChoice[];
  strategy?: EncounterStrategy;
  /** Runs while the plunder screen is open. Default: take nothing. */
  onPlunder?: () => Promise<void>;
  /** Runs while the jettison screen is open. Default: dump nothing. */
  onJettison?: () => Promise<void>;
  /** Fail after this many encounter rounds in a row, so a stuck encounter can't hang a test. */
  maxEncounterRounds?: number;
}

export class ScriptedUI implements GameUI {
  readonly alerts: AlertCall[] = [];
  readonly quantityRequests: CargoQuantityRequest[] = [];
  readonly encounterViews: EncounterView[] = [];
  plunders = 0;
  jettisons = 0;

  private readonly answers: Partial<Record<AlertType, DialogResult[]>>;
  private readonly quantities: number[];
  private readonly encounterQueue: EncounterChoice[];
  strategy: EncounterStrategy;
  onPlunder: () => Promise<void>;
  onJettison: () => Promise<void>;
  maxEncounterRounds: number;
  private rounds = 0;

  /**
   * @param answers Answers to give, in order, to alerts of the listed types
   *   (shorthand for `{ answers }`). Any other alert, or one asked after its
   *   answers run out, gets OK.
   */
  constructor(answers: Partial<Record<AlertType, DialogResult[]>> | ScriptedUIOptions = {}) {
    const options: ScriptedUIOptions = isOptions(answers) ? answers : { answers };
    this.answers = options.answers ?? {};
    this.quantities = options.quantities ?? [];
    this.encounterQueue = options.encounterChoices ?? [];
    this.strategy = options.strategy ?? peacefulStrategy;
    this.onPlunder = options.onPlunder ?? (async () => {});
    this.onJettison = options.onJettison ?? (async () => {});
    this.maxEncounterRounds = options.maxEncounterRounds ?? 500;
  }

  async alert(type: AlertType, ...args: string[]): Promise<DialogResult> {
    this.rounds = 0;
    this.alerts.push({ type, name: AlertType[type], args });
    return this.answers[type]?.shift() ?? DialogResult.OK;
  }

  async cargoQuantity(request: CargoQuantityRequest): Promise<number> {
    this.quantityRequests.push(request);
    return this.quantities.shift() ?? request.max;
  }

  async plunder(): Promise<void> {
    this.plunders++;
    await this.onPlunder();
  }

  async jettison(): Promise<void> {
    this.jettisons++;
    await this.onJettison();
  }

  async encounterAction(view: EncounterView): Promise<EncounterChoice> {
    if (++this.rounds > this.maxEncounterRounds)
      throw new Error(`Encounter still going after ${this.maxEncounterRounds} rounds`);
    this.encounterViews.push(view);
    return this.encounterQueue.shift() ?? this.strategy(view);
  }

  /** Queues more answers for alerts of one type. */
  answer(type: AlertType, ...results: DialogResult[]): void {
    (this.answers[type] ??= []).push(...results);
  }

  /** Queues more encounter choices. */
  choose(...choices: EncounterChoice[]): void {
    this.encounterQueue.push(...choices);
  }

  get names(): string[] {
    return this.alerts.map((a) => a.name);
  }

  /** Forgets the alerts and dialogs recorded so far. */
  clear(): void {
    this.alerts.length = 0;
    this.quantityRequests.length = 0;
    this.encounterViews.length = 0;
    this.plunders = 0;
    this.jettisons = 0;
  }
}

const optionKeys = new Set([
  'answers',
  'quantities',
  'encounterChoices',
  'strategy',
  'onPlunder',
  'onJettison',
]);

function isOptions(
  value: Partial<Record<AlertType, DialogResult[]>> | ScriptedUIOptions,
): value is ScriptedUIOptions {
  return Object.keys(value).some((key) => optionKeys.has(key));
}
