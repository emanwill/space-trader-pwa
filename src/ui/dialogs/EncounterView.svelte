<script lang="ts">
  // A plain encounter screen: the original's texts and buttons. Phase 6
  // replaces it with the full travel and combat view.
  import { onDestroy } from 'svelte';
  import { EncounterChoice } from '../../engine/game-ui';
  import { app } from '../state.svelte';
  import type { EncounterDialog } from '../web-ui.svelte';
  import Modal from './Modal.svelte';
  import ShipStatus from './ShipStatus.svelte';

  let { dialog, covered }: { dialog: EncounterDialog; covered: boolean } = $props();

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

  const game = $derived(app.game);
  const buttons = $derived(
    dialog.view.choices.filter((c) => c !== EncounterChoice.Tick && c !== EncounterChoice.Close),
  );

  // Continuous attack or flight: run the next round after a moment unless stopped.
  let timer: ReturnType<typeof setTimeout> | undefined;
  $effect(() => {
    if (dialog.view.continuous && !covered) {
      timer = setTimeout(() => dialog.resolve(EncounterChoice.Tick), 1000);
      return () => clearTimeout(timer);
    }
  });
  onDestroy(() => clearTimeout(timer));
</script>

<Modal title="Encounter" {covered} wide>
  {#if game}
    <div class="ships">
      <ShipStatus ship={game.commander.ship} label="You" />
      <ShipStatus ship={game.opponent} label="Opponent" />
    </div>
  {/if}
  <p class="pre-line">{dialog.view.text}</p>
  {#if dialog.view.action}
    <p class="pre-line dim">{dialog.view.action}</p>
  {/if}
  {#snippet actions()}
    {#each buttons as choice (choice)}
      <button onclick={() => dialog.resolve(choice)}>{LABELS[choice]}</button>
    {/each}
    {#if dialog.view.choices.includes(EncounterChoice.Close)}
      <button class="ghost" onclick={() => dialog.resolve(EncounterChoice.Close)}>Close</button>
    {/if}
  {/snippet}
</Modal>

<style>
  .ships {
    display: flex;
    gap: 1rem;
    justify-content: space-around;
  }
</style>
