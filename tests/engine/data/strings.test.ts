/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { Alerts, DialogResult } from '../../../src/engine/data/alerts';
import {
  AlertType,
  CrewMemberId,
  GadgetType,
  NewsEvent,
  PoliceRecordType,
  PoliticalSystemType,
  ReputationType,
  ShieldType,
  ShipType,
  ShipyardId,
  Size,
  SpecialEventType,
  SpecialResource,
  StarSystemId,
  SystemPressure,
  TechLevel,
  TradeItemType,
  VeryRareEncounter,
  WeaponType,
} from '../../../src/engine/data/enums';
import { Strings } from '../../../src/engine/data/strings';

/** Number of non-negative members of a numeric enum (NA = -1 and similar are excluded). */
function memberCount(e: object): number {
  return Object.values(e).filter((v) => typeof v === 'number' && v >= 0).length;
}

describe('Strings', () => {
  it('has a name for every member of the enums it is indexed by', () => {
    const pairs: [string[], object][] = [
      [Strings.CrewMemberNames, CrewMemberId],
      [Strings.GadgetNames, GadgetType],
      [Strings.NewsEvent, NewsEvent],
      [Strings.PoliceRecordNames, PoliceRecordType],
      [Strings.PoliticalSystemNames, PoliticalSystemType],
      [Strings.ReputationNames, ReputationType],
      [Strings.ShieldNames, ShieldType],
      [Strings.ShipNames, ShipType],
      [Strings.ShipyardNames, ShipyardId],
      [Strings.ShipyardEngineers, ShipyardId],
      [Strings.Sizes, Size],
      [Strings.SpecialEventStrings, SpecialEventType],
      [Strings.SpecialEventTitles, SpecialEventType],
      [Strings.SpecialResources, SpecialResource],
      [Strings.SystemNames, StarSystemId],
      [Strings.SystemPressures, SystemPressure],
      [Strings.TradeItemNames, TradeItemType],
      [Strings.VeryRareEncounters, VeryRareEncounter],
      [Strings.WeaponNames, WeaponType],
    ];
    for (const [names, e] of pairs) expect(names).toHaveLength(memberCount(e));

    // Political systems each have their own set of news headlines and mastheads.
    expect(Strings.NewsHeadlines).toHaveLength(memberCount(PoliticalSystemType));
    expect(Strings.NewsMastheads).toHaveLength(memberCount(PoliticalSystemType));

    // TechLevel.Unavailable is never a system's tech level, so it has no name.
    expect(Strings.TechLevelNames).toHaveLength(memberCount(TechLevel) - 1);
  });

  it('keeps names in enum order', () => {
    expect(Strings.SystemNames[StarSystemId.Acamar]).toBe('Acamar');
    expect(Strings.SystemNames[StarSystemId.Zonama]).toBe('Zonama');
    expect(Strings.TradeItemNames[TradeItemType.Robots]).toBe('Robots');
    expect(Strings.ShipNames[ShipType.Scorpion]).toBe('Scorpion');
  });

  it('converts C# string expressions', () => {
    expect(Strings.CopyrightChar).toBe('©');
    // Concatenation with another string and Environment.NewLine.
    expect(Strings.QuestJarekImpatient.startsWith(`${Strings.QuestJarek}\n`)).toBe(true);
    // Escaped quotes survive.
    expect(Strings.EncounterTextPolicePostMarie.startsWith('"We know')).toBe(true);
    // A reference to another field declared earlier.
    expect(Strings.ShipNames[ShipType.Custom]).toBe(Strings.ShipNameCustomShip);
  });

  it('contains every string field from Strings.cs except the commented-out help text', () => {
    const source = readFileSync(new URL('../../../reference/Strings.cs', import.meta.url), 'utf8');
    const live = source.slice(0, source.indexOf('#region Commented-Out Strings'));
    const names = [...live.matchAll(/public static string(?:\[\])*\s+(\w+)/g)].map((m) => m[1]);
    expect(names.length).toBeGreaterThan(200);
    expect(Object.getOwnPropertyNames(Strings).filter((n) => names.includes(n))).toHaveLength(
      names.length,
    );
  });
});

describe('Alerts', () => {
  it('defines every alert type', () => {
    for (let type = 0; type < memberCount(AlertType); type++)
      expect(Alerts[type as AlertType]).toBeDefined();
  });

  it('matches the original count of question dialogs', () => {
    const buttons = Object.values(Alerts).flatMap((a) => ('buttons' in a ? [a.buttons] : []));
    const twoButton = buttons.filter((b) => b.length === 2);
    expect(twoButton.filter((b) => b[0].result === DialogResult.Yes)).toHaveLength(32);
    expect(twoButton.filter((b) => b[1]?.result === DialogResult.Cancel)).toHaveLength(2);
    expect(twoButton).toHaveLength(34);
  });

  it('keeps placeholders in alert text', () => {
    const alert = Alerts[AlertType.ArrivalBuyNewspaper];
    expect('message' in alert && alert.message).toBe(
      'The local newspaper costs ^1. Do you wish to buy a copy?',
    );
  });
});
