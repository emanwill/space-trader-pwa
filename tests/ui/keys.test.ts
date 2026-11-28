import { describe, expect, it } from 'vitest';
import { EncounterChoice } from '../../src/engine/game-ui';
import { ENCOUNTER_KEYS } from '../../src/ui/keys.svelte';

describe('encounter keys', () => {
  it('gives every button its own key', () => {
    const keys = Object.values(ENCOUNTER_KEYS);
    expect(new Set(keys).size).toBe(keys.length);
    for (const choice of [
      EncounterChoice.Attack,
      EncounterChoice.Board,
      EncounterChoice.Bribe,
      EncounterChoice.Drink,
      EncounterChoice.Flee,
      EncounterChoice.Ignore,
      EncounterChoice.Meet,
      EncounterChoice.Plunder,
      EncounterChoice.Submit,
      EncounterChoice.Surrender,
      EncounterChoice.Trade,
      EncounterChoice.Yield,
    ])
      expect(ENCOUNTER_KEYS[choice], EncounterChoice[choice]).toMatch(/^[A-Z]$/);
  });
});
