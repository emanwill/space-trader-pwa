import { afterEach, describe, expect, it } from 'vitest';
import { CrewMemberId, Difficulty, SkillType, StarSystemId } from '../../../src/engine/data/enums';
import { setCurrentGame } from '../../../src/engine/game-context';
import { CrewMember } from '../../../src/engine/model/crew-member';
import { setRandomSource } from '../../../src/engine/rng';
import { useFakeGame } from '../fake-game';

afterEach(() => {
  setCurrentGame(null);
  setRandomSource(Math.random);
});

describe('CrewMember', () => {
  it('stores skills in SkillType order', () => {
    const merc = new CrewMember(CrewMemberId.Alyssa, 1, 2, 3, 4, StarSystemId.NA);
    expect(merc.skills).toEqual([1, 2, 3, 4]);
    expect(merc.skills[SkillType.Trader]).toBe(merc.trader);
    expect(merc.name).toBe('Alyssa');
  });

  it('charges 3 credits a day per skill point, except special characters and Zeethibal', () => {
    expect(new CrewMember(CrewMemberId.Alyssa, 5, 5, 5, 5, -1).rate).toBe(60);
    expect(new CrewMember(CrewMemberId.Jarek, 5, 5, 5, 5, -1).rate).toBe(0);
    expect(new CrewMember(CrewMemberId.Zeethibal, 5, 5, 5, 5, -1).rate).toBe(0);
  });

  it('finds the nth lowest skill, keeping ties in skill order', () => {
    const merc = new CrewMember(CrewMemberId.Alyssa, 5, 3, 8, 3, -1);
    expect([1, 2, 3, 4].map((n) => merc.nthLowestSkill(n))).toEqual([
      SkillType.Fighter,
      SkillType.Engineer,
      SkillType.Pilot,
      SkillType.Trader,
    ]);
  });

  it('looks up its current system in the universe', () => {
    const game = useFakeGame();
    const merc = game.mercenaries[CrewMemberId.Alyssa]!;
    expect(merc.currentSystem).toBeNull();
    merc.currentSystem = game.universe[2]!;
    expect(merc.currentSystemId).toBe(2);
    expect(merc.currentSystem).toBe(game.universe[2]);
  });

  it('raises a random skill that is below the maximum', () => {
    const game = useFakeGame({ skills: [9, 9, 5, 9] });
    setRandomSource(() => 0);
    game.cmdr.increaseRandomSkill();
    // Only trader can go up without reaching 10.
    expect(game.cmdr.skills).toEqual([9, 9, 6, 9]);
    // The ship's trader skill changed, so buy prices are recalculated.
    expect(game.recalculated).toEqual([game.universe[0]]);
  });

  it("doesn't recalculate prices when the ship's trader skill is unchanged", () => {
    const game = useFakeGame({ skills: [5, 5, 5, 5] });
    setRandomSource(() => 0);
    game.cmdr.increaseRandomSkill();
    expect(game.cmdr.skills).toEqual([6, 5, 5, 5]);
    expect(game.recalculated).toEqual([]);
  });

  it('tweaks skills with the tonic without changing their total below Hard', () => {
    const game = useFakeGame({ difficulty: Difficulty.Normal, seed: 7 });
    const before = [...game.cmdr.skills];
    game.cmdr.tonicTweakRandomSkill();
    expect(game.cmdr.skills).not.toEqual(before);
    expect(game.cmdr.skills.reduce((a, b) => a + b)).toBe(20);
  });

  it('round-trips through its save format', () => {
    const merc = new CrewMember(CrewMemberId.Alyssa, 1, 2, 3, 4, 7);
    const hash = JSON.parse(JSON.stringify(merc.serialize()));
    expect(hash).toEqual({ _id: CrewMemberId.Alyssa, _skills: [1, 2, 3, 4], _curSystemId: 7 });
    const loaded = CrewMember.fromHash(hash);
    expect(loaded.serialize()).toEqual(hash);

    // Changing the loaded copy doesn't change the hash it came from.
    loaded.pilot = 9;
    expect(hash._skills[0]).toBe(1);
  });
});
