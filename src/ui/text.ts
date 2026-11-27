// Display text shared by several screens.

import { Alerts } from '../engine/data/alerts';
import { Strings } from '../engine/data/strings';
import type { Game } from '../engine/game';
import type { StarSystem } from '../engine/model/star-system';
import type { WarpBlocker } from '../engine/trade';

/** The facts the original's System Info and Target System panels show. */
export function systemFacts(system: StarSystem, game: Game) {
  const politics = system.politicalSystem;
  const here = system === game.commander.currentSystem;
  return {
    size: Strings.Sizes[system.size]!,
    tech: Strings.TechLevelNames[system.techLevel]!,
    government: politics.name,
    // UpdateTargetSystemInfo hides the resource of unvisited systems.
    resource:
      system.visited || here ? Strings.SpecialResources[system.specialResource]! : Strings.Unknown,
    police: Strings.ActivityLevels[politics.activityPolice]!,
    pirates: Strings.ActivityLevels[politics.activityPirates]!,
    pressure: Strings.SystemPressures[system.systemPressure]!,
  };
}

/** Why the Warp button is unavailable. */
export function blockerText(blocker: WarpBlocker, game: Game): string {
  switch (blocker) {
    case 'no-target':
      return 'Choose a destination on the map, or with ◀ ▶.';
    case 'out-of-range':
      return game.warpSystem === game.commander.currentSystem
        ? 'You are already here.'
        : 'Out of range. Buy fuel at the station, or pick a closer system.';
    default: {
      const def = Alerts[blocker];
      return 'message' in def ? def.message : def.title;
    }
  }
}
