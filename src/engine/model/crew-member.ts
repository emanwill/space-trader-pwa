// Port of CrewMember.cs: the commander, a mercenary, or a special character.

import { Consts } from '../data/consts';
import { CrewMemberId, Difficulty, SkillType, StarSystemId } from '../data/enums';
import { Strings } from '../data/strings';
import { currentCommander, currentGame } from '../game-context';
import { getRandom } from '../rng';
import { getValue, getValueOr, type Hash } from '../serialization';
import type { StarSystem } from './star-system';

export class CrewMember {
  private _id: CrewMemberId;
  private _skills: number[] = [0, 0, 0, 0];
  private _curSystemId: StarSystemId = StarSystemId.NA;

  // PORT: the original's copy constructor, CrewMember(CrewMember), was only used
  // by Commander's constructor, which now passes the values instead.
  constructor(
    id: CrewMemberId,
    pilot: number,
    fighter: number,
    trader: number,
    engineer: number,
    curSystemId: StarSystemId,
  ) {
    this._id = id;
    this.pilot = pilot;
    this.fighter = fighter;
    this.trader = trader;
    this.engineer = engineer;
    this._curSystemId = curSystemId;
  }

  static fromHash(hash: Hash): CrewMember {
    const crewMember = new CrewMember(getValue(hash, '_id'), 0, 0, 0, 0, StarSystemId.NA);
    crewMember.loadFromHash(hash);
    return crewMember;
  }

  /** The original's CrewMember(Hashtable) constructor. Commander extends it. */
  protected loadFromHash(hash: Hash): void {
    this._id = getValue(hash, '_id');
    this._skills = [...getValueOr(hash, '_skills', this._skills)];
    this._curSystemId = getValueOr(hash, '_curSystemId', this._curSystemId);
  }

  private changeRandomSkill(amount: number): void {
    const skillIdList: number[] = [];
    for (let i = 0; i < this.skills.length; i++) {
      if (this.skills[i]! + amount > 0 && this.skills[i]! + amount < Consts.MaxSkill)
        skillIdList.push(i);
    }

    if (skillIdList.length > 0) {
      const skill = skillIdList[getRandom(skillIdList.length)]!;

      const cmdr = currentCommander();
      const curTrader = cmdr.ship.trader;
      this.skills[skill]! += amount;
      if (cmdr.ship.trader !== curTrader) currentGame().recalculateBuyPrices(cmdr.currentSystem!);
    }
  }

  increaseRandomSkill(): void {
    this.changeRandomSkill(1);
  }

  /** The SkillType of the nth lowest skill (n = 1 is the lowest). Ties keep skill order. */
  nthLowestSkill(n: number): number {
    const skillIds = [0, 1, 2, 3];

    for (let j = 0; j < 3; j++) {
      for (let i = 0; i < 3 - j; i++) {
        if (this.skills[skillIds[i]!]! > this.skills[skillIds[i + 1]!]!) {
          const temp = skillIds[i]!;
          skillIds[i] = skillIds[i + 1]!;
          skillIds[i + 1] = temp;
        }
      }
    }

    return skillIds[n - 1]!;
  }

  serialize(): Hash {
    return {
      _id: this._id,
      _skills: [...this._skills],
      _curSystemId: this._curSystemId,
    };
  }

  tonicTweakRandomSkill(): void {
    const oldSkills = [...this.skills];

    if (currentGame().difficulty < Difficulty.Hard) {
      // add one to a random skill, subtract one from a random skill
      while (
        this.skills[0] === oldSkills[0] &&
        this.skills[1] === oldSkills[1] &&
        this.skills[2] === oldSkills[2] &&
        this.skills[3] === oldSkills[3]
      ) {
        this.changeRandomSkill(1);
        this.changeRandomSkill(-1);
      }
    } else {
      // add one to two random skills, subtract three from one random skill
      this.changeRandomSkill(1);
      this.changeRandomSkill(1);
      this.changeRandomSkill(-3);
    }
  }

  toString(): string {
    return this.name;
  }

  get currentSystem(): StarSystem | null {
    return this._curSystemId === StarSystemId.NA
      ? null
      : currentGame().universe[this._curSystemId]!;
  }
  set currentSystem(value: StarSystem) {
    this._curSystemId = value.id;
  }

  get currentSystemId(): StarSystemId {
    return this._curSystemId;
  }
  set currentSystemId(value: StarSystemId) {
    this._curSystemId = value;
  }

  get engineer(): number {
    return this._skills[SkillType.Engineer]!;
  }
  set engineer(value: number) {
    this._skills[SkillType.Engineer] = value;
  }

  get fighter(): number {
    return this._skills[SkillType.Fighter]!;
  }
  set fighter(value: number) {
    this._skills[SkillType.Fighter] = value;
  }

  get id(): CrewMemberId {
    return this._id;
  }

  get name(): string {
    return Strings.CrewMemberNames[this._id]!;
  }

  get pilot(): number {
    return this._skills[SkillType.Pilot]!;
  }
  set pilot(value: number) {
    this._skills[SkillType.Pilot] = value;
  }

  /** Daily wage. Special characters and Zeethibal work for free. */
  get rate(): number {
    return Consts.SpecialCrewMemberIds.includes(this.id) || this.id === CrewMemberId.Zeethibal
      ? 0
      : (this.pilot + this.fighter + this.trader + this.engineer) * 3;
  }

  /** Indexed by SkillType. */
  get skills(): number[] {
    return this._skills;
  }

  get trader(): number {
    return this._skills[SkillType.Trader]!;
  }
  set trader(value: number) {
    this._skills[SkillType.Trader] = value;
  }
}
