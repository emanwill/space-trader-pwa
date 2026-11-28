// Keyboard shortcuts for desktop play. Dialogs handle their own keys (Enter on
// the focused button, Escape to cancel); these work on the screens behind.

import { EncounterChoice } from '../engine/game-ui';
import { wide } from './media.svelte';
import { app, type Tab } from './state.svelte';
import { planView, warp } from './trade-plan.svelte';
import { travel } from './travel.svelte';
import { ui } from './web-ui.svelte';

/** Encounter keys: mostly the first letter of the button. */
export const ENCOUNTER_KEYS: Partial<Record<EncounterChoice, string>> = {
  [EncounterChoice.Attack]: 'A',
  [EncounterChoice.Board]: 'O',
  [EncounterChoice.Bribe]: 'B',
  [EncounterChoice.Drink]: 'D',
  [EncounterChoice.Flee]: 'F',
  [EncounterChoice.Ignore]: 'I',
  [EncounterChoice.Meet]: 'M',
  [EncounterChoice.Plunder]: 'P',
  [EncounterChoice.Submit]: 'S',
  [EncounterChoice.Surrender]: 'U',
  [EncounterChoice.Trade]: 'T',
  [EncounterChoice.Yield]: 'Y',
  [EncounterChoice.Close]: 'C',
};

/** The tabs in order, as numbered by the 1–5 keys. */
export function visibleTabs(): Tab[] {
  const all: Tab[] = ['trade', 'map', 'station', 'shipyard', 'captain'];
  return wide.matches ? all.filter((t) => t !== 'map') : all;
}

/** Whether a dialog or sheet is open over the screens. */
export function overlayOpen(): boolean {
  return (
    ui.stack.some((d) => d.kind !== 'encounter') ||
    app.sheet !== null ||
    ui.gameOver !== null ||
    travel.shown
  );
}

function typing(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    target.closest('input, select, textarea, [contenteditable="true"]') !== null
  );
}

/** The window's keydown handler. */
export function onKeydown(event: KeyboardEvent): void {
  if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
  if (typing(event.target)) return;
  // A dialog (including the menu, which isn't in ui.stack) has the keyboard.
  if (document.querySelector('.backdrop:not(.covered)') || ui.gameOver) return;

  if (travel.shown) {
    if (encounterKey(event.key)) event.preventDefault();
    return;
  }
  if (app.screen === 'game' && gameKey(event.key)) event.preventDefault();
}

function encounterKey(key: string): boolean {
  const top = ui.top;
  if (!top || top.kind !== 'encounter') return false;
  const choices = top.view.choices;
  if ((key === ' ' || key === 'x' || key === 'X') && top.view.continuous) {
    top.resolve(EncounterChoice.Int);
    return true;
  }
  const upper = key.toUpperCase();
  const choice = (Object.entries(ENCOUNTER_KEYS) as [string, string][]).find(
    ([, k]) => k === upper,
  )?.[0];
  if (choice === undefined) return false;
  const c = Number(choice) as EncounterChoice;
  if (!choices.includes(c) || top.view.continuous) return false;
  top.resolve(c);
  return true;
}

function gameKey(key: string): boolean {
  const game = app.game;
  if (!game || app.busy) return false;

  const tabs = visibleTabs();
  const n = Number(key);
  if (Number.isInteger(n) && n >= 1 && n <= tabs.length) {
    app.tab = tabs[n - 1]!;
    return true;
  }

  switch (key) {
    case 'ArrowLeft':
    case '[':
    case 'ArrowRight':
    case ']':
      if (app.tab !== 'trade' && app.tab !== 'map') return false;
      void app.run((g) => g.selectNextSystemWithinRange(key === 'ArrowRight' || key === ']'));
      return true;
    case 'w':
    case 'W':
      if (planView(game).blocker !== null) return false;
      void warp();
      return true;
    case '/':
      if (!wide.matches) app.tab = 'map';
      // After the map renders.
      setTimeout(() =>
        document.querySelector<HTMLInputElement>('.search input[type=search]')?.focus(),
      );
      return true;
    case '?':
      app.sheet = 'keys';
      return true;
  }
  return false;
}
