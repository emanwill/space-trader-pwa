<script lang="ts">
  // The commander, the ship and the quest log (Form_ViewCommander,
  // Form_ViewShip and Form_ViewQuests).
  import { Strings } from '../../engine/data/strings';
  import { formatMoney, formatNumber, multiples } from '../../engine/format';
  import { PoliceRecord } from '../../engine/model/police-record';
  import { Reputation } from '../../engine/model/reputation';
  import {
    commanderBounty,
    linkSystemNames,
    questStrings,
    shipEquipment,
    specialCargo,
  } from '../../engine/views';
  import { shipImage } from '../images';
  import { app } from '../state.svelte';

  const view = $derived.by(() => {
    const game = app.game;
    if (!game) return null;
    const cmdr = game.commander;
    const ship = cmdr.ship;
    const skill = (own: number, onShip: number) =>
      own === onShip ? `${own}` : `${own} (${onShip})`;
    return {
      name: cmdr.name,
      difficulty: Strings.DifficultyLevels[game.difficulty]!,
      days: multiples(cmdr.days, Strings.TimeUnit),
      skills: [
        ['Pilot', skill(cmdr.pilot, ship.pilot)],
        ['Fighter', skill(cmdr.fighter, ship.fighter)],
        ['Trader', skill(cmdr.trader, ship.trader)],
        ['Engineer', skill(cmdr.engineer, ship.engineer)],
      ] as const,
      cash: formatMoney(cmdr.cash),
      debt: formatMoney(cmdr.debt),
      worth: formatMoney(cmdr.worth),
      kills: formatNumber(cmdr.killsPirate + cmdr.killsPolice + cmdr.killsTrader),
      record: PoliceRecord.getPoliceRecordFromScore(cmdr.policeRecordScore).name,
      reputation: Reputation.getReputationFromScore(cmdr.reputationScore).name,
      bounty: commanderBounty(game),
      ship: {
        name: ship.name,
        image: shipImage(ship.imageIndex),
        hull: `${ship.hull}/${ship.hullStrength}`,
        fuel: multiples(ship.fuel, Strings.DistanceUnit),
        bays: `${ship.filledCargoBays}/${ship.cargoBays}`,
        equipment: shipEquipment(game),
        special: specialCargo(game),
      },
      quests: questStrings(game).map(linkSystemNames),
    };
  });

  function showSystem(id: number): void {
    void app.run((game) => {
      game.selectedSystemId = id;
    });
    app.tab = 'map';
  }
</script>

{#if view}
  <div class="screen">
    <section class="card">
      <div class="card-head">
        <h2>Commander {view.name}</h2>
        <span class="dim">{view.difficulty} · {view.days}</span>
      </div>
      <div class="grid">
        <dl class="facts">
          {#each view.skills as [label, value] (label)}
            <dt>{label}</dt>
            <dd class="num">{value}</dd>
          {/each}
        </dl>
        <dl class="facts">
          <dt>Cash</dt>
          <dd class="num">{view.cash}</dd>
          <dt>Debt</dt>
          <dd class="num">{view.debt}</dd>
          <dt>Net worth</dt>
          <dd class="num">{view.worth}</dd>
        </dl>
        <dl class="facts">
          <dt>Kills</dt>
          <dd class="num">{view.kills}</dd>
          <dt>Police record</dt>
          <dd>{view.record}</dd>
          <dt>Reputation</dt>
          <dd>{view.reputation}</dd>
          {#if view.bounty}
            <dt>{view.bounty.label}</dt>
            <dd class="num">{view.bounty.value}</dd>
          {/if}
        </dl>
      </div>
      <p class="faint small">Skills in brackets include your crew and gadgets.</p>
    </section>

    <section class="card">
      <div class="ship-head">
        <img class="pixel" src={view.ship.image} width="128" height="104" alt="" />
        <div class="stack">
          <h2>{view.ship.name}</h2>
          <dl class="facts">
            <dt>Hull</dt>
            <dd class="num">{view.ship.hull}</dd>
            <dt>Fuel</dt>
            <dd>{view.ship.fuel}</dd>
            <dt>Cargo</dt>
            <dd class="num">{view.ship.bays} bays</dd>
          </dl>
        </div>
      </div>
      <dl class="facts">
        {#each view.ship.equipment as section (section.label)}
          <dt>{section.label}</dt>
          <dd>
            {#each section.lines as line, i (i)}
              <div>{line}</div>
            {/each}
          </dd>
        {/each}
      </dl>
      <h3>Special cargo</h3>
      {#if view.ship.special.length === 0}
        <p class="dim">{Strings.SpecialCargoNone}</p>
      {:else}
        {#each view.ship.special as line, i (i)}
          <p>{line}</p>
        {/each}
      {/if}
    </section>

    <section class="card">
      <h2>Quests</h2>
      {#if view.quests.length === 0}
        <p class="dim">{Strings.QuestNone}</p>
      {:else}
        <ul class="quests">
          {#each view.quests as parts, i (i)}
            <li class="pre-line">
              {#each parts as part, j (j)}
                {#if part.system !== undefined}
                  {@const id = part.system}
                  <button class="link" onclick={() => showSystem(id)}>{part.text}</button>
                {:else}
                  {part.text}
                {/if}
              {/each}
            </li>
          {/each}
        </ul>
      {/if}
    </section>
  </div>
{/if}

<style>
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
    gap: 0.75rem 1.5rem;
  }
  .small {
    font-size: 0.85rem;
  }
  .ship-head {
    display: flex;
    gap: 1rem;
    align-items: center;
  }
  .quests {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin: 0;
    padding-left: 1.2rem;
  }
</style>
