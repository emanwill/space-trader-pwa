// Port of Consts.cs: tuning constants and the static data tables.
//
// Names match the original so ported code reads the same (Consts.X).
//
// The tables (ShipSpecs, Weapons, ...) are lazy getters rather than plain
// static fields. They construct model classes that themselves read Consts, and
// building them while modules are still loading would break on circular
// imports. Each table is built once, on first access, and the same array is
// returned afterwards, so in-place changes stick (the game replaces
// ShipSpecs[Custom] when a custom ship is designed or loaded).

import {
  Activity,
  CrewMemberId,
  GadgetType,
  PoliceRecordType,
  PoliticalSystemType,
  ReputationType,
  ShieldType,
  ShipType,
  ShipyardId,
  ShipyardSkill,
  Size,
  SkillType,
  SpecialEventType,
  SpecialResource,
  SystemPressure,
  TechLevel,
  TradeItemType,
  WeaponType,
} from './enums';
import { idiv } from '../math';
import type { Equipment } from '../model/equipment';
import { Gadget } from '../model/gadget';
import { PoliceRecord } from '../model/police-record';
import { PoliticalSystem } from '../model/political-system';
import { Reputation } from '../model/reputation';
import { Shield } from '../model/shield';
import { ShipSpec } from '../model/ship-spec';
import { Shipyard } from '../model/shipyard';
import { SpecialEvent } from '../model/special-event';
import { TradeItem } from '../model/trade-item';
import { Weapon } from '../model/weapon';

/** Horizontal extent of the ship within its 64-pixel-wide image, for drawing damage and shields. */
export interface ImageOffset {
  x: number;
  width: number;
}

// PORT: the original's file and directory constants (BaseDirectory,
// HighScoreFile, ...) are not ported; the PWA stores data in IndexedDB.

const tables = new Map<string, unknown>();
function lazy<T>(key: string, build: () => T): T {
  if (!tables.has(key)) tables.set(key, build());
  return tables.get(key) as T;
}

export class Consts {
  static readonly CurrentVersion = '2.00';

  // Price paid by government for each negative PoliceScore point
  static readonly BountyModifier = 1000;

  static readonly GalaxyWidth = 154;
  static readonly GalaxyHeight = 110;
  static readonly MinDistance = 7;
  static readonly CloseDistance = 13;
  static readonly MaxRange = 20;
  static readonly WormDist = 25;

  static readonly DebtWarning = 75000;
  static readonly DebtTooLarge = 100000;

  static readonly InsRate = 0.0025;
  static readonly IntRate = 0.1;
  static readonly MaxNoClaim = 90;

  static readonly SkillBonus = 3;
  static readonly CloakBonus = 2;
  static readonly MaxSkill = 10;

  static readonly StartClicks = 20;

  static readonly MaxFuelTanks = 20;
  static readonly FuelCompactorTanks = 3;
  static readonly HullUpgrade = 50;
  static readonly MaxShip = 9;
  static readonly MaxSlots = 5;
  static readonly FleaConversionCost = 500;
  static readonly PodTransferCost = 200;

  static readonly ImagesPerShip = 4;
  static readonly ShipImgOffsetNormal = 0;
  static readonly ShipImgOffsetDamage = 1;
  static readonly ShipImgOffsetShield = 2;
  static readonly ShipImgOffsetSheildDamage = 3;
  static readonly ShipImgUseDefault = -1;

  static readonly EncounterImgAlien = 0;
  static readonly EncounterImgPirate = 1;
  static readonly EncounterImgPolice = 2;
  static readonly EncounterImgSpecial = 3;
  static readonly EncounterImgTrader = 4;

  // C# integer division: 50/8 is 6.
  static readonly StoryProbability = idiv(50, 8);

  static readonly FabricRipInitialProbability = 25;

  static readonly DirectionUp = 0;
  static readonly DirectionDown = 1;
  static readonly DirectionLeft = 2;
  static readonly DirectionRight = 3;

  static readonly DisruptorSystemsMultiplier = 3;

  static readonly MaxTribbles = 100000;

  static readonly PoliceRecordScorePsychopath = -100;
  static readonly PoliceRecordScoreVillain = -70;
  static readonly PoliceRecordScoreCriminal = -30;
  static readonly PoliceRecordScoreCrook = -10;
  static readonly PoliceRecordScoreDubious = -5;
  static readonly PoliceRecordScoreClean = 0;
  static readonly PoliceRecordScoreLawful = 5;
  static readonly PoliceRecordScoreTrusted = 10;
  static readonly PoliceRecordScoreLiked = 25;
  static readonly PoliceRecordScoreHero = 75;

  static readonly ReputationScoreHarmless = 0;
  static readonly ReputationScoreMostlyHarmless = 10;
  static readonly ReputationScorePoor = 20;
  static readonly ReputationScoreAverage = 40;
  static readonly ReputationScoreAboveAverage = 80;
  static readonly ReputationScoreCompetent = 150;
  static readonly ReputationScoreDangerous = 300;
  static readonly ReputationScoreDeadly = 600;
  static readonly ReputationScoreElite = 1500;

  static readonly ScoreAttackPirate = 0;
  static readonly ScoreAttackPolice = -3;
  static readonly ScoreAttackTrader = -2;
  static readonly ScoreCaughtWithWild = -4;
  static readonly ScoreFleePolice = -2;
  static readonly ScoreKillCaptain = 100;
  static readonly ScoreKillPirate = 1;
  static readonly ScoreKillPolice = -6;
  static readonly ScoreKillTrader = -4;
  static readonly ScorePlunderPirate = -1;
  static readonly ScorePlunderTrader = -2;
  static readonly ScoreTrafficking = -1;

  static readonly ShipTemplateSeparator = '----------------------------';

  // ---------------------------------------------------------------------------
  // Tables

  static get Gadgets(): Gadget[] {
    return lazy('Gadgets', () => [
      new Gadget(GadgetType.ExtraCargoBays, SkillType.NA, 2500, TechLevel.EarlyIndustrial, 35), // 5 extra holds
      new Gadget(GadgetType.AutoRepairSystem, SkillType.Engineer, 7500, TechLevel.Industrial, 20), // Increases engineer's effectivity
      new Gadget(GadgetType.NavigatingSystem, SkillType.Pilot, 15000, TechLevel.PostIndustrial, 20), // Increases pilot's effectivity
      new Gadget(
        GadgetType.TargetingSystem,
        SkillType.Fighter,
        25000,
        TechLevel.PostIndustrial,
        20,
      ), // Increases fighter's effectivity
      new Gadget(GadgetType.CloakingDevice, SkillType.Pilot, 100000, TechLevel.HiTech, 5), // If you have a good engineer, neither pirates nor police will notice you
      // The gadgets below can't be bought
      new Gadget(GadgetType.FuelCompactor, SkillType.NA, 30000, TechLevel.Unavailable, 0),
      new Gadget(GadgetType.HiddenCargoBays, SkillType.NA, 60000, TechLevel.Unavailable, 0),
    ]);
  }

  static get PoliceRecords(): PoliceRecord[] {
    return lazy('PoliceRecords', () => [
      new PoliceRecord(PoliceRecordType.Psychopath, Consts.PoliceRecordScorePsychopath),
      new PoliceRecord(PoliceRecordType.Villain, Consts.PoliceRecordScoreVillain),
      new PoliceRecord(PoliceRecordType.Criminal, Consts.PoliceRecordScoreCriminal),
      new PoliceRecord(PoliceRecordType.Crook, Consts.PoliceRecordScoreCrook),
      new PoliceRecord(PoliceRecordType.Dubious, Consts.PoliceRecordScoreDubious),
      new PoliceRecord(PoliceRecordType.Clean, Consts.PoliceRecordScoreClean),
      new PoliceRecord(PoliceRecordType.Lawful, Consts.PoliceRecordScoreLawful),
      new PoliceRecord(PoliceRecordType.Trusted, Consts.PoliceRecordScoreTrusted),
      new PoliceRecord(PoliceRecordType.Liked, Consts.PoliceRecordScoreLiked),
      new PoliceRecord(PoliceRecordType.Hero, Consts.PoliceRecordScoreHero),
    ]);
  }

  // prettier-ignore
  static get PoliticalSystems(): PoliticalSystem[] {
    const P = PoliticalSystemType, A = Activity, T = TechLevel, I = TradeItemType;
    return lazy('PoliticalSystems', () => [
      //                  Type            React Police      Pirates     Traders     MinTech              MaxTech              Bribe Drugs  Arms   Wanted
      new PoliticalSystem(P.Anarchy,      0, A.Absent,   A.Swarms,   A.Minimal,  T.PreAgricultural, T.Industrial,      7, true,  true,  I.Food),
      new PoliticalSystem(P.Capitalist,   2, A.Some,     A.Few,      A.Swarms,   T.EarlyIndustrial, T.HiTech,          1, true,  true,  I.Ore),
      new PoliticalSystem(P.Communist,    6, A.Abundant, A.Moderate, A.Moderate, T.Agricultural,    T.Industrial,      5, true,  true,  I.NA),
      new PoliticalSystem(P.Confederacy,  5, A.Moderate, A.Some,     A.Many,     T.Agricultural,    T.PostIndustrial,  3, true,  true,  I.Games),
      new PoliticalSystem(P.Corporate,    2, A.Abundant, A.Few,      A.Swarms,   T.EarlyIndustrial, T.HiTech,          2, true,  true,  I.Robots),
      new PoliticalSystem(P.Cybernetic,   0, A.Swarms,   A.Swarms,   A.Many,     T.PostIndustrial,  T.HiTech,          0, false, false, I.Ore),
      new PoliticalSystem(P.Democracy,    4, A.Some,     A.Few,      A.Many,     T.Renaissance,     T.HiTech,          2, true,  true,  I.Games),
      new PoliticalSystem(P.Dictatorship, 3, A.Moderate, A.Many,     A.Some,     T.PreAgricultural, T.HiTech,          2, true,  true,  I.NA),
      new PoliticalSystem(P.Fascist,      7, A.Swarms,   A.Swarms,   A.Minimal,  T.EarlyIndustrial, T.HiTech,          0, false, true,  I.Machines),
      new PoliticalSystem(P.Feudal,       1, A.Minimal,  A.Abundant, A.Few,      T.PreAgricultural, T.Renaissance,     6, true,  true,  I.Firearms),
      new PoliticalSystem(P.Military,     7, A.Swarms,   A.Absent,   A.Abundant, T.Medieval,        T.HiTech,          0, false, true,  I.Robots),
      new PoliticalSystem(P.Monarchy,     3, A.Moderate, A.Some,     A.Moderate, T.PreAgricultural, T.Industrial,      4, true,  true,  I.Medicine),
      new PoliticalSystem(P.Pacifist,     7, A.Few,      A.Minimal,  A.Many,     T.PreAgricultural, T.Renaissance,     1, true,  false, I.NA),
      new PoliticalSystem(P.Socialist,    4, A.Few,      A.Many,     A.Some,     T.PreAgricultural, T.Industrial,      6, true,  true,  I.NA),
      new PoliticalSystem(P.Satori,       0, A.Minimal,  A.Minimal,  A.Minimal,  T.PreAgricultural, T.Agricultural,    0, false, false, I.NA),
      new PoliticalSystem(P.Technocracy,  1, A.Abundant, A.Some,     A.Abundant, T.EarlyIndustrial, T.HiTech,          2, true,  true,  I.Water),
      new PoliticalSystem(P.Theocracy,    5, A.Abundant, A.Minimal,  A.Moderate, T.PreAgricultural, T.EarlyIndustrial, 0, true,  true,  I.Narcotics),
    ]);
  }

  static get Reputations(): Reputation[] {
    return lazy('Reputations', () => [
      new Reputation(ReputationType.Harmless, Consts.ReputationScoreHarmless),
      new Reputation(ReputationType.MostlyHarmless, Consts.ReputationScoreMostlyHarmless),
      new Reputation(ReputationType.Poor, Consts.ReputationScorePoor),
      new Reputation(ReputationType.Average, Consts.ReputationScoreAverage),
      new Reputation(ReputationType.AboveAverage, Consts.ReputationScoreAboveAverage),
      new Reputation(ReputationType.Competent, Consts.ReputationScoreCompetent),
      new Reputation(ReputationType.Dangerous, Consts.ReputationScoreDangerous),
      new Reputation(ReputationType.Deadly, Consts.ReputationScoreDeadly),
      new Reputation(ReputationType.Elite, Consts.ReputationScoreElite),
    ]);
  }

  static get Shields(): Shield[] {
    return lazy('Shields', () => [
      new Shield(ShieldType.Energy, 100, 5000, TechLevel.Industrial, 70),
      new Shield(ShieldType.Reflective, 200, 20000, TechLevel.PostIndustrial, 30),
      // The shields below cannot be bought
      new Shield(ShieldType.Lightning, 350, 45000, TechLevel.Unavailable, 0),
    ]);
  }

  // Indexed by ShipType. The original used Rectangles with only X and Width set.
  // prettier-ignore
  static get ShipImageOffsets(): ImageOffset[] {
    return lazy('ShipImageOffsets', () => [
      { x: 22, width: 19 }, // Flea
      { x: 18, width: 27 }, // Gnat
      { x: 18, width: 27 }, // Firefly
      { x: 18, width: 27 }, // Mosquito
      { x: 12, width: 40 }, // Bumblebee
      { x: 12, width: 40 }, // Beetle
      { x:  7, width: 50 }, // Hornet
      { x:  7, width: 50 }, // Grasshopper
      { x:  2, width: 60 }, // Termite
      { x:  2, width: 60 }, // Wasp
      { x:  7, width: 49 }, // Space Monster
      { x: 21, width: 22 }, // Dragonfly
      { x: 15, width: 34 }, // Mantis
      { x:  7, width: 49 }, // Scarab
      { x:  9, width: 46 }, // Bottle
      { x:  2, width: 60 }, // Custom
      { x:  2, width: 60 }, // Scorpion
    ]);
  }

  // prettier-ignore
  static get ShipSpecs(): ShipSpec[] {
    const S = ShipType, Z = Size, A = Activity, T = TechLevel;
    return lazy('ShipSpecs', () => [
      //           Type            Size      Bays W  S  G Cr   F FC Hull  RC   Price   %  Police      Pirates     Traders     MinTechLevel
      new ShipSpec(S.Flea,         Z.Tiny,   10, 0, 0, 0, 1, 20, 1,  25,  1,   2000,  2, A.NA,       A.NA,       A.Absent,   T.EarlyIndustrial),
      new ShipSpec(S.Gnat,         Z.Small,  15, 1, 0, 1, 1, 14, 1, 100,  2,  10000, 28, A.Absent,   A.Absent,   A.Absent,   T.Industrial),
      new ShipSpec(S.Firefly,      Z.Small,  20, 1, 1, 1, 1, 17, 1, 100,  3,  25000, 20, A.Absent,   A.Absent,   A.Absent,   T.Industrial),
      new ShipSpec(S.Mosquito,     Z.Small,  15, 2, 1, 1, 1, 13, 1, 100,  5,  30000, 20, A.Absent,   A.Minimal,  A.Absent,   T.Industrial),
      new ShipSpec(S.Bumblebee,    Z.Medium, 25, 1, 2, 2, 2, 15, 1, 100,  7,  60000, 15, A.Minimal,  A.Minimal,  A.Absent,   T.Industrial),
      new ShipSpec(S.Beetle,       Z.Medium, 50, 0, 1, 1, 3, 14, 1,  50, 10,  80000,  3, A.NA,       A.NA,       A.Absent,   T.Industrial),
      new ShipSpec(S.Hornet,       Z.Large,  20, 3, 2, 1, 2, 16, 2, 150, 15, 100000,  6, A.Few,      A.Some,     A.Minimal,  T.PostIndustrial),
      new ShipSpec(S.Grasshopper,  Z.Large,  30, 2, 2, 3, 3, 15, 3, 150, 15, 150000,  2, A.Some,     A.Moderate, A.Few,      T.PostIndustrial),
      new ShipSpec(S.Termite,      Z.Huge,   60, 1, 3, 2, 3, 13, 4, 200, 20, 225000,  2, A.Moderate, A.Many,     A.Some,     T.HiTech),
      new ShipSpec(S.Wasp,         Z.Huge,   35, 3, 2, 2, 3, 14, 5, 200, 20, 300000,  2, A.Many,     A.Abundant, A.Moderate, T.HiTech),
      // The ships below can't be bought (mostly)
      new ShipSpec(S.SpaceMonster, Z.Huge,    0, 3, 0, 0, 1,  1, 1, 500,  1, 500000,  0, A.NA,       A.NA,       A.NA,       T.Unavailable),
      new ShipSpec(S.Dragonfly,    Z.Small,   0, 2, 3, 2, 1,  1, 1,  10,  1, 500000,  0, A.NA,       A.NA,       A.NA,       T.Unavailable),
      new ShipSpec(S.Mantis,       Z.Medium,  0, 3, 1, 3, 3,  1, 1, 300,  1, 500000,  0, A.NA,       A.NA,       A.NA,       T.Unavailable),
      new ShipSpec(S.Scarab,       Z.Large,  20, 2, 0, 0, 2,  1, 1, 400,  1, 500000,  0, A.NA,       A.NA,       A.NA,       T.Unavailable),
      new ShipSpec(S.Bottle,       Z.Small,   0, 0, 0, 0, 0,  1, 1,  10,  1,    100,  0, A.NA,       A.NA,       A.NA,       T.Unavailable),
      new ShipSpec(S.Custom,       Z.Huge,    0, 0, 0, 0, 0,  0, 0,   0,  0,      0,  0, A.NA,       A.NA,       A.NA,       T.Unavailable),
      new ShipSpec(S.Scorpion,     Z.Huge,   30, 2, 2, 2, 2,  1, 1, 300,  1, 500000,  0, A.NA,       A.NA,       A.NA,       T.Unavailable),
    ]);
  }

  static get Shipyards(): Shipyard[] {
    return lazy('Shipyards', () => [
      new Shipyard(ShipyardId.Corellian, Size.Large, ShipyardSkill.CrewQuarters),
      new Shipyard(ShipyardId.Incom, Size.Medium, ShipyardSkill.ShieldSlotUnits),
      new Shipyard(ShipyardId.Kuat, Size.Huge, ShipyardSkill.HullPerUnit),
      new Shipyard(ShipyardId.Sienar, Size.Tiny, ShipyardSkill.WeaponSlotUnits),
      new Shipyard(ShipyardId.Sorosuub, Size.Small, ShipyardSkill.FuelBase),
    ]);
  }

  static readonly SpecialCrewMemberIds: readonly CrewMemberId[] = [
    CrewMemberId.Commander,
    CrewMemberId.Dragonfly,
    CrewMemberId.FamousCaptain,
    CrewMemberId.Jarek,
    CrewMemberId.Opponent,
    CrewMemberId.Princess,
    CrewMemberId.Scarab,
    CrewMemberId.Scorpion,
    CrewMemberId.SpaceMonster,
    CrewMemberId.Wild,
  ];

  // prettier-ignore
  static get SpecialEvents(): SpecialEvent[] {
    const E = SpecialEventType;
    return lazy('SpecialEvents', () => [
      //               Type                     Price Occurrence MessageOnly
      new SpecialEvent(E.Artifact,                0, 1, false),
      new SpecialEvent(E.ArtifactDelivery,   -20000, 0, true),
      new SpecialEvent(E.CargoForSale,         1000, 3, false),
      new SpecialEvent(E.Dragonfly,               0, 1, true),
      new SpecialEvent(E.DragonflyBaratas,        0, 0, true),
      new SpecialEvent(E.DragonflyDestroyed,      0, 0, true),
      new SpecialEvent(E.DragonflyMelina,         0, 0, true),
      new SpecialEvent(E.DragonflyRegulas,        0, 0, true),
      new SpecialEvent(E.DragonflyShield,         0, 0, false),
      new SpecialEvent(E.EraseRecord,          5000, 3, false),
      new SpecialEvent(E.Experiment,              0, 0, true),
      new SpecialEvent(E.ExperimentFailed,        0, 0, true),
      new SpecialEvent(E.ExperimentStopped,       0, 0, true),
      new SpecialEvent(E.Gemulon,                 0, 0, true),
      new SpecialEvent(E.GemulonFuel,             0, 0, false),
      new SpecialEvent(E.GemulonInvaded,          0, 0, true),
      new SpecialEvent(E.GemulonRescued,          0, 0, true),
      new SpecialEvent(E.Japori,                  0, 1, false),
      new SpecialEvent(E.JaporiDelivery,          0, 0, true),
      new SpecialEvent(E.Jarek,                   0, 1, false),
      new SpecialEvent(E.JarekGetsOut,            0, 0, true),
      new SpecialEvent(E.Lottery,             -1000, 0, true),
      new SpecialEvent(E.Moon,               500000, 4, false),
      new SpecialEvent(E.MoonRetirement,          0, 0, false),
      new SpecialEvent(E.Reactor,                 0, 0, false),
      new SpecialEvent(E.ReactorDelivered,        0, 0, true),
      new SpecialEvent(E.ReactorLaser,            0, 0, false),
      new SpecialEvent(E.Scarab,                  0, 1, true),
      new SpecialEvent(E.ScarabDestroyed,         0, 0, true),
      new SpecialEvent(E.ScarabUpgradeHull,       0, 0, false),
      new SpecialEvent(E.Skill,                3000, 3, false),
      new SpecialEvent(E.SpaceMonster,            0, 1, true),
      new SpecialEvent(E.SpaceMonsterKilled, -15000, 0, true),
      new SpecialEvent(E.Tribble,              1000, 1, false),
      new SpecialEvent(E.TribbleBuyer,            0, 3, false),
      new SpecialEvent(E.Wild,                    0, 1, false),
      new SpecialEvent(E.WildGetsOut,             0, 0, true),
      new SpecialEvent(E.Sculpture,           -2000, 0, false),
      new SpecialEvent(E.SculptureDelivered,      0, 0, true),
      new SpecialEvent(E.SculptureHiddenBays,     0, 0, false),
      new SpecialEvent(E.Princess,                0, 0, true),
      new SpecialEvent(E.PrincessCentauri,        0, 0, true),
      new SpecialEvent(E.PrincessInthara,         0, 0, true),
      new SpecialEvent(E.PrincessQonos,           0, 0, false),
      new SpecialEvent(E.PrincessQuantum,         0, 0, false),
      new SpecialEvent(E.PrincessReturned,        0, 0, true),
    ]);
  }

  // prettier-ignore
  static get TradeItems(): TradeItem[] {
    const I = TradeItemType, T = TechLevel, P = SystemPressure, R = SpecialResource;
    return lazy('TradeItems', () => [
      //             Type         TechProduction     TechUsage          TechTopProduction  LowTech  Inc  Var  PriceHike      LowPrice          HighPrice     MinTrade MaxTrade Round
      new TradeItem(I.Water,     T.PreAgricultural, T.PreAgricultural, T.Medieval,          30,    3,   4, P.Drought,     R.SweetOceans,    R.Desert,        30,   50,   1),
      new TradeItem(I.Furs,      T.PreAgricultural, T.PreAgricultural, T.PreAgricultural,  250,   10,  10, P.Cold,        R.RichFauna,      R.Lifeless,     230,  280,   5),
      new TradeItem(I.Food,      T.Agricultural,    T.PreAgricultural, T.Agricultural,     100,    5,   5, P.CropFailure, R.RichSoil,       R.PoorSoil,      90,  160,   5),
      new TradeItem(I.Ore,       T.Medieval,        T.Medieval,        T.Renaissance,      350,   20,  10, P.War,         R.MineralRich,    R.MineralPoor,  350,  420,  10),
      new TradeItem(I.Games,     T.Renaissance,     T.Agricultural,    T.PostIndustrial,   250,  -10,   5, P.Boredom,     R.Artistic,       R.NA,           160,  270,   5),
      new TradeItem(I.Firearms,  T.Renaissance,     T.Agricultural,    T.Industrial,      1250,  -75, 100, P.War,         R.Warlike,        R.NA,           600, 1100,  25),
      new TradeItem(I.Medicine,  T.EarlyIndustrial, T.Agricultural,    T.PostIndustrial,   650,  -20,  10, P.Plague,      R.SpecialHerbs,   R.NA,           400,  700,  25),
      new TradeItem(I.Machines,  T.EarlyIndustrial, T.Renaissance,     T.Industrial,       900,  -30,   5, P.Employment,  R.NA,             R.NA,           600,  800,  25),
      new TradeItem(I.Narcotics, T.Industrial,      T.PreAgricultural, T.Industrial,      3500, -125, 150, P.Boredom,     R.WeirdMushrooms, R.NA,          2000, 3000,  50),
      new TradeItem(I.Robots,    T.PostIndustrial,  T.EarlyIndustrial, T.HiTech,          5000, -150, 100, P.Employment,  R.NA,             R.NA,          3500, 5000, 100),
    ]);
  }

  static get Weapons(): Weapon[] {
    return lazy('Weapons', () => [
      new Weapon(WeaponType.PulseLaser, 15, false, 2000, TechLevel.Industrial, 50),
      new Weapon(WeaponType.BeamLaser, 25, false, 12500, TechLevel.PostIndustrial, 35),
      new Weapon(WeaponType.MilitaryLaser, 35, false, 35000, TechLevel.HiTech, 15),
      new Weapon(WeaponType.MorgansLaser, 85, false, 50000, TechLevel.Unavailable, 0),
      new Weapon(WeaponType.PhotonDisruptor, 20, true, 15000, TechLevel.PostIndustrial, 0),
      new Weapon(WeaponType.QuantumDistruptor, 60, true, 50000, TechLevel.Unavailable, 0),
    ]);
  }

  // The same instances as in Weapons, Shields and Gadgets.
  static get EquipmentForSale(): Equipment[] {
    return lazy('EquipmentForSale', () => [
      Consts.Weapons[WeaponType.PulseLaser]!,
      Consts.Weapons[WeaponType.BeamLaser]!,
      Consts.Weapons[WeaponType.MilitaryLaser]!,
      Consts.Weapons[WeaponType.PhotonDisruptor]!,
      Consts.Shields[ShieldType.Energy]!,
      Consts.Shields[ShieldType.Reflective]!,
      Consts.Gadgets[GadgetType.ExtraCargoBays]!,
      Consts.Gadgets[GadgetType.AutoRepairSystem]!,
      Consts.Gadgets[GadgetType.NavigatingSystem]!,
      Consts.Gadgets[GadgetType.TargetingSystem]!,
      Consts.Gadgets[GadgetType.CloakingDevice]!,
    ]);
  }
}
