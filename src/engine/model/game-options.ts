// Port of GameOptions.cs: the player's options, saved with each game and as defaults.

import { getValueOr, type Hash } from '../serialization';

// PORT: the original read the defaults from a settings file. The persistence
// layer (Phase 4) hands them over with setDefaultOptions instead.
let defaultOptions: Hash | null = null;

/** Sets the saved default options that `new GameOptions(true)` and loadFromDefaults copy. */
export function setDefaultOptions(hash: Hash | null): void {
  defaultOptions = hash;
}

export class GameOptions {
  alwaysIgnorePirates = false; // Automatically ignores pirates when it is safe to do so
  alwaysIgnorePolice = false; // Automatically ignores police when it is safe to do so
  alwaysIgnoreTradeInOrbit = false; // Automatically ignores Trade in Orbit when it is safe to do so
  alwaysIgnoreTraders = true; // Automatically ignores traders when it is safe to do so
  autoFuel = false; // Automatically get a full tank when arriving in a new system
  autoRepair = false; // Automatically get a full hull repair when arriving in a new system
  continuousAttack = false; // Continuous attack/flee mode
  continuousAttackFleeing = false; // Continue attack on fleeing ship
  disableOpponents = false; // Disable opponents when possible (when you have disabling weapons and the opponent is a pirate, trader, or mantis)
  newsAutoPay = false; // by default, ask each time someone buys a newspaper
  newsAutoShow = false; // by default, don't show newspaper
  remindLoans = true; // remind you every five days about outstanding loan balances
  reserveMoney = false; // Keep enough money for insurance and mercenaries
  showTrackedRange = true; // display range when tracking a system on Short Range Chart
  trackAutoOff = true; // Automatically stop tracking a system when you get to it?
  leaveEmpty = 0; // Number of cargo bays to leave empty when buying goods

  constructor(loadFromDefaults: boolean) {
    if (loadFromDefaults) this.loadFromDefaults();
  }

  static fromHash(hash: Hash): GameOptions {
    const options = new GameOptions(false);
    options.alwaysIgnorePirates = getValueOr(
      hash,
      '_alwaysIgnorePirates',
      options.alwaysIgnorePirates,
    );
    options.alwaysIgnorePolice = getValueOr(
      hash,
      '_alwaysIgnorePolice',
      options.alwaysIgnorePolice,
    );
    options.alwaysIgnoreTradeInOrbit = getValueOr(
      hash,
      '_alwaysIgnoreTradeInOrbit',
      options.alwaysIgnoreTradeInOrbit,
    );
    options.alwaysIgnoreTraders = getValueOr(
      hash,
      '_alwaysIgnoreTraders',
      options.alwaysIgnoreTraders,
    );
    options.autoFuel = getValueOr(hash, '_autoFuel', options.autoFuel);
    options.autoRepair = getValueOr(hash, '_autoRepair', options.autoRepair);
    options.continuousAttack = getValueOr(hash, '_continuousAttack', options.continuousAttack);
    options.continuousAttackFleeing = getValueOr(
      hash,
      '_continuousAttackFleeing',
      options.continuousAttackFleeing,
    );
    options.disableOpponents = getValueOr(hash, '_disableOpponents', options.disableOpponents);
    options.newsAutoPay = getValueOr(hash, '_newsAutoPay', options.newsAutoPay);
    options.newsAutoShow = getValueOr(hash, '_newsAutoShow', options.newsAutoShow);
    options.remindLoans = getValueOr(hash, '_remindLoans', options.remindLoans);
    options.reserveMoney = getValueOr(hash, '_reserveMoney', options.reserveMoney);
    options.showTrackedRange = getValueOr(hash, '_showTrackedRange', options.showTrackedRange);
    options.trackAutoOff = getValueOr(hash, '_trackAutoOff', options.trackAutoOff);
    options.leaveEmpty = getValueOr(hash, '_leaveEmpty', options.leaveEmpty);
    return options;
  }

  copyValues(source: GameOptions): void {
    this.alwaysIgnorePirates = source.alwaysIgnorePirates;
    this.alwaysIgnorePolice = source.alwaysIgnorePolice;
    this.alwaysIgnoreTradeInOrbit = source.alwaysIgnoreTradeInOrbit;
    this.alwaysIgnoreTraders = source.alwaysIgnoreTraders;
    this.autoFuel = source.autoFuel;
    this.autoRepair = source.autoRepair;
    this.continuousAttack = source.continuousAttack;
    this.continuousAttackFleeing = source.continuousAttackFleeing;
    this.disableOpponents = source.disableOpponents;
    this.newsAutoPay = source.newsAutoPay;
    this.newsAutoShow = source.newsAutoShow;
    this.remindLoans = source.remindLoans;
    this.reserveMoney = source.reserveMoney;
    this.showTrackedRange = source.showTrackedRange;
    this.trackAutoOff = source.trackAutoOff;
    this.leaveEmpty = source.leaveEmpty;
  }

  loadFromDefaults(): void {
    this.copyValues(
      defaultOptions === null ? new GameOptions(false) : GameOptions.fromHash(defaultOptions),
    );
  }

  serialize(): Hash {
    return {
      _alwaysIgnorePirates: this.alwaysIgnorePirates,
      _alwaysIgnorePolice: this.alwaysIgnorePolice,
      _alwaysIgnoreTradeInOrbit: this.alwaysIgnoreTradeInOrbit,
      _alwaysIgnoreTraders: this.alwaysIgnoreTraders,
      _autoFuel: this.autoFuel,
      _autoRepair: this.autoRepair,
      _continuousAttack: this.continuousAttack,
      _continuousAttackFleeing: this.continuousAttackFleeing,
      _disableOpponents: this.disableOpponents,
      _newsAutoPay: this.newsAutoPay,
      _newsAutoShow: this.newsAutoShow,
      _remindLoans: this.remindLoans,
      _reserveMoney: this.reserveMoney,
      _showTrackedRange: this.showTrackedRange,
      _trackAutoOff: this.trackAutoOff,
      _leaveEmpty: this.leaveEmpty,
    };
  }
}
