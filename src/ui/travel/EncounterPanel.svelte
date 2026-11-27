<script lang="ts">
  // FormEncounter: both ships, the encounter type, the player's choices, the
  // continuous attack/flee indicator, and tribbles if the hold has them.
  import { AlertType } from '../../engine/data/enums';
  import { EncounterChoice } from '../../engine/game-ui';
  import { TribbleSpots, tribblePictures } from '../../engine/views';
  import ShipPicture from '../components/ShipPicture.svelte';
  import { imageUrl } from '../images';
  import { app } from '../state.svelte';
  import type { EncounterView } from '../../engine/game-ui';
  import { ui, type EncounterDialog } from '../web-ui.svelte';

  interface Props {
    /** The round on screen. */
    round: EncounterView;
    /** The live dialog, or null between rounds (while the engine acts on a choice). */
    dialog: EncounterDialog | null;
    /** No other dialog is open over the encounter. */
    active: boolean;
    /** The trip is over: show the last round without its buttons. */
    finished?: boolean;
  }

  let { round, dialog, active, finished = false }: Props = $props();

  const LABELS: Record<EncounterChoice, string> = {
    [EncounterChoice.Attack]: 'Attack',
    [EncounterChoice.Board]: 'Board',
    [EncounterChoice.Bribe]: 'Bribe',
    [EncounterChoice.Drink]: 'Drink',
    [EncounterChoice.Flee]: 'Flee',
    [EncounterChoice.Ignore]: 'Ignore',
    [EncounterChoice.Int]: 'Stop',
    [EncounterChoice.Meet]: 'Meet',
    [EncounterChoice.Plunder]: 'Plunder',
    [EncounterChoice.Submit]: 'Submit',
    [EncounterChoice.Surrender]: 'Surrender',
    [EncounterChoice.Trade]: 'Trade',
    [EncounterChoice.Yield]: 'Yield',
    [EncounterChoice.Tick]: 'Continue',
    [EncounterChoice.Close]: 'Close',
  };
  // The original's encounter type pictures, by Game.EncounterImageIndex.
  const TYPE_IMAGES = ['alien', 'pirate', 'police', 'special', 'trader'];
  const TYPE_NAMES = ['Alien', 'Pirate', 'Police', 'Special', 'Trader'];

  const view = $derived.by(() => {
    const game = app.game;
    if (!game) return null;
    const index = game.encounterImageIndex;
    return {
      you: game.commander.ship,
      opponent: game.opponent,
      type: index >= 0 ? { image: imageUrl(TYPE_IMAGES[index]!), name: TYPE_NAMES[index]! } : null,
      tribbles: tribblePictures(game.commander.ship),
      options: game.options,
    };
  });

  const buttons = $derived(
    round.choices.filter(
      (c) => c !== EncounterChoice.Tick && c !== EncounterChoice.Close && c !== EncounterChoice.Int,
    ),
  );
  const continuous = $derived(round.continuous);

  // FormEncounter.UpdateTribbles: random spots and pictures, placed once and
  // only redrawn if the number of tribbles changes.
  let tribbleSpots = $state<{ spot: number; picture: number }[]>([]);
  const tribbleCount = $derived(view?.tribbles ?? 0);
  $effect(() => {
    const count = tribbleCount;
    if (count === tribbleSpots.length) return;
    const taken = new Set<number>();
    const spots: { spot: number; picture: number }[] = [];
    for (let i = 0; i < count; i++) {
      let spot = Math.floor(Math.random() * TribbleSpots);
      while (taken.has(spot)) spot = (spot + 1) % TribbleSpots;
      taken.add(spot);
      spots.push({ spot, picture: Math.floor(Math.random() * 8) });
    }
    tribbleSpots = spots;
  });

  // The continuous-attack timer: another round every second unless stopped.
  // The indicator alternates pictures each round, as the original's did.
  let blink = $state(0);
  $effect(() => {
    if (continuous && active && dialog) {
      const live = dialog;
      const timer = setTimeout(() => {
        blink = 1 - blink;
        live.resolve(EncounterChoice.Tick);
      }, 1000);
      return () => clearTimeout(timer);
    }
  });

  function toggleRepeat(event: Event): void {
    const on = (event.currentTarget as HTMLInputElement).checked;
    const options = app.game?.options;
    if (!options) return;
    options.continuousAttack = on;
    options.continuousAttackFleeing = on;
    app.bump();
  }
</script>

{#if view}
  <section class="encounter" class:waiting={!dialog} aria-label="Encounter">
    <div class="ships">
      <figure>
        <figcaption>
          <strong>You</strong>
          <span class="dim">{view.you.name}</span>
        </figcaption>
        <ShipPicture ship={view.you} />
        <div class="num stats">
          <span>{view.you.hullText}</span>
          <span>{view.you.shieldText}</span>
        </div>
      </figure>
      <div class="vs">
        {#if view.type}
          <img
            class="pixel"
            src={view.type.image}
            width="24"
            height="24"
            alt={view.type.name}
            title={view.type.name}
          />
        {/if}
      </div>
      <figure>
        <figcaption>
          <strong>Opponent</strong>
          <span class="dim">{view.opponent.name}</span>
        </figcaption>
        <ShipPicture ship={view.opponent} />
        <div class="num stats">
          <span>{view.opponent.hullText}</span>
          <span>{view.opponent.shieldText}</span>
        </div>
      </figure>

      {#if tribbleSpots.length > 0}
        <div class="tribbles">
          {#each tribbleSpots as t (t.spot)}
            <button
              class="tribble"
              style:grid-area="{Math.floor(t.spot / 6) + 1} / {(t.spot % 6) + 1}"
              aria-label="A tribble"
              onclick={() => ui.alert(AlertType.TribblesSqueek)}
            >
              <img class="pixel" src={imageUrl(`trib${t.picture}`)} width="24" height="24" alt="" />
            </button>
          {/each}
        </div>
      {/if}
    </div>

    <div class="text">
      <p class="pre-line">{round.text}</p>
      {#if round.action}
        <p class="pre-line action">{round.action}</p>
      {/if}
    </div>

    {#if !finished}
      <div class="actions">
        {#if continuous}
          <div class="continuous">
            <img class="pixel" src={imageUrl(`continuous${blink}`)} width="27" height="27" alt="" />
            <span>Continuing…</span>
            <button
              class="primary"
              disabled={!active || !dialog}
              onclick={() => dialog?.resolve(EncounterChoice.Int)}
            >
              Stop
            </button>
          </div>
        {:else}
          {#each buttons as choice (choice)}
            <button disabled={!active || !dialog} onclick={() => dialog?.resolve(choice)}>
              {LABELS[choice]}
            </button>
          {/each}
          {#if round.choices.includes(EncounterChoice.Close)}
            <button
              class="ghost"
              disabled={!active || !dialog}
              onclick={() => dialog?.resolve(EncounterChoice.Close)}
            >
              Close
            </button>
          {/if}
        {/if}
      </div>
      {#if buttons.includes(EncounterChoice.Attack) || buttons.includes(EncounterChoice.Flee) || continuous}
        <label class="repeat dim">
          <input type="checkbox" checked={view.options.continuousAttack} onchange={toggleRepeat} />
          Keep attacking or fleeing each round until something changes
        </label>
      {/if}
    {/if}
  </section>
{/if}

<style>
  .encounter.waiting .actions,
  .encounter.waiting .repeat {
    opacity: 0.5;
  }
  .encounter {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  .ships {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
  }
  figure {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
    margin: 0;
  }
  figcaption {
    display: flex;
    flex-direction: column;
    align-items: center;
    line-height: 1.2;
  }
  .stats {
    display: flex;
    flex-direction: column;
    align-items: center;
    font-size: 0.85rem;
  }
  .vs {
    width: 24px;
  }
  .tribbles {
    position: absolute;
    inset: 0;
    display: grid;
    grid-template: repeat(6, 1fr) / repeat(6, 1fr);
    pointer-events: none;
  }
  .tribble {
    min-height: 0;
    padding: 0;
    border: 0;
    background: none;
    place-self: center;
    pointer-events: auto;
  }
  .text {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    padding: 0.75rem;
    border-radius: var(--radius-sm);
    background: var(--surface-2);
  }
  .action {
    color: var(--warn);
  }
  .actions {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(7rem, 1fr));
    gap: 0.5rem;
  }
  .continuous {
    grid-column: 1 / -1;
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  .continuous span {
    flex: 1;
  }
  .repeat {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.85rem;
  }
  .repeat input {
    min-height: 0;
    width: 1.1rem;
    height: 1.1rem;
    accent-color: var(--accent);
  }
</style>
