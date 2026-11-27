import { afterEach, describe, expect, it } from 'vitest';
import { Alerts, DialogResult } from '../../src/engine/data/alerts';
import { AlertType } from '../../src/engine/data/enums';
import { EncounterChoice } from '../../src/engine/game-ui';
import { alertKind } from '../../src/ui/alert-kinds';
import { travel } from '../../src/ui/travel.svelte';
import { ui } from '../../src/ui/web-ui.svelte';

const ALL = Object.values(AlertType).filter((v): v is AlertType => typeof v === 'number');

afterEach(() => {
  ui.stack = [];
  ui.toasts = [];
  ui.messages = [];
  ui.gameOver = null;
  travel.active = false;
  travel.shown = false;
  travel.log = [];
});

describe('alertKind', () => {
  it('makes every question a confirm, and only questions', () => {
    for (const type of ALL) {
      const def = Alerts[type];
      const buttons = 'buttons' in def ? def.buttons.length : 1;
      const kind = alertKind(type);
      if (kind === 'game-over') continue;
      expect(kind === 'confirm', AlertType[type]).toBe(buttons > 1);
    }
  });

  it('only makes single-OK alerts into notices', () => {
    for (const type of ALL.filter((t) => alertKind(t) === 'notice')) {
      const def = Alerts[type];
      expect('buttons' in def && def.buttons.map((b) => b.result), AlertType[type]).toEqual([
        DialogResult.OK,
      ]);
    }
  });

  it('sorts a few known alerts', () => {
    expect(alertKind(AlertType.CargoIF)).toBe('notice');
    expect(alertKind(AlertType.EncounterArrested)).toBe('story');
    expect(alertKind(AlertType.GameRetire)).toBe('confirm');
    expect(alertKind(AlertType.GameEndKilled)).toBe('game-over');
  });
});

describe('WebUI', () => {
  it('answers notices at once with a toast', async () => {
    expect(await ui.alert(AlertType.CargoIF)).toBe(DialogResult.OK);
    expect(ui.stack).toEqual([]);
    expect(ui.toasts.map((t) => t.title)).toEqual(['Not Enough Money']);
    expect(ui.messages).toHaveLength(1);
  });

  it('waits for an answer to a question', async () => {
    const answer = ui.alert(AlertType.EquipmentBuy, 'Beam Laser', '2,000');
    expect(ui.stack).toHaveLength(1);
    const dialog = ui.stack[0]!;
    expect(dialog.kind === 'alert' && dialog.title).toBe('Buy Beam Laser');
    if (dialog.kind === 'alert') dialog.resolve(DialogResult.Yes);
    expect(await answer).toBe(DialogResult.Yes);
    expect(ui.stack).toEqual([]);
  });

  it('logs notices during a trip instead of toasting them', async () => {
    travel.start('Sol', 'Rigel');
    await ui.alert(AlertType.EncounterEscaped);
    expect(ui.toasts).toEqual([]);
    expect(travel.log.map((e) => e.title)).toEqual(['Escaped']);
    expect(travel.shown).toBe(false);
  });

  it('opens the travel view for an encounter and logs its text', async () => {
    travel.start('Sol', 'Rigel');
    const choice = ui.encounterAction({
      choices: [EncounterChoice.Attack, EncounterChoice.Flee],
      text: 'A pirate appears.',
      action: 'It attacks.',
      continuous: false,
    });
    expect(travel.shown).toBe(true);
    expect(travel.log.map((e) => e.text)).toEqual(['A pirate appears.', 'It attacks.']);
    const dialog = ui.stack[0]!;
    if (dialog.kind === 'encounter') dialog.resolve(EncounterChoice.Flee);
    expect(await choice).toBe(EncounterChoice.Flee);
  });

  it('gathers the game-over alerts on one page', async () => {
    expect(await ui.alert(AlertType.GameEndKilled)).toBe(DialogResult.OK);
    expect(await ui.alert(AlertType.GameEndScore, '12', '3')).toBe(DialogResult.OK);
    const last = ui.alert(AlertType.GameEndHighScoreMissed);
    expect(ui.gameOver).toMatchObject({
      title: 'You Are Dead',
      score: 'You achieved a score of 12.3%.',
    });
    expect(ui.gameOver!.result).toMatch(/not enough/);
    ui.gameOver!.resolve!();
    expect(await last).toBe(DialogResult.OK);
    expect(ui.gameOver).toBeNull();
  });

  it('hands back the log of a trip that never showed', async () => {
    travel.start('Sol', 'Rigel');
    await ui.alert(AlertType.TravelUneventfulTrip);
    const unseen = await travel.finish(false);
    expect(unseen.map((e) => e.title)).toEqual(['Uneventful Trip']);
    expect(travel.active).toBe(false);
  });
});
