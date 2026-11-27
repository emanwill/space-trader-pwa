<script lang="ts">
  // FormPlunder and FormJettison: take cargo from the opponent, or dump your own.
  import { Consts } from '../../engine/data/consts';
  import { app } from '../state.svelte';
  import { ui, type CargoDialog } from '../web-ui.svelte';
  import Modal from './Modal.svelte';

  let { dialog, covered }: { dialog: CargoDialog; covered: boolean } = $props();
  const plunder = $derived(dialog.kind === 'plunder');

  const view = $derived.by(() => {
    const game = app.game;
    if (!game) return null;
    const source = plunder ? game.opponent : game.commander.ship;
    return {
      rows: Consts.TradeItems.map((item, i) => ({ i, name: item.name, qty: source.cargo[i]! })),
      bays: `${game.commander.ship.filledCargoBays}/${game.commander.ship.cargoBays}`,
    };
  });

  let working = $state(false);
  async function act(i: number, all: boolean): Promise<void> {
    const game = app.game;
    if (!game || working) return;
    working = true;
    try {
      if (plunder) await game.cargoPlunder(i, all);
      else await game.cargoJettison(i, all);
    } finally {
      working = false;
      app.bump();
    }
  }
</script>

<Modal title={plunder ? 'Plunder' : 'Jettison cargo'} {covered}>
  <p class="dim">
    {plunder ? "The opponent's hold." : 'Your hold.'} Your bays:
    <span class="num">{view?.bays}</span>
  </p>
  <ul class="list">
    {#each (view?.rows ?? []).filter((r) => r.qty > 0) as row (row.i)}
      <li class:empty={row.qty === 0}>
        <span class="name">{row.name}</span>
        <span class="num">{row.qty}</span>
        <button class="small" disabled={row.qty === 0 || working} onclick={() => act(row.i, false)}>
          {plunder ? 'Take' : 'Dump'}…
        </button>
        <button class="small" disabled={row.qty === 0 || working} onclick={() => act(row.i, true)}>
          All
        </button>
      </li>
    {:else}
      <li class="none dim">{plunder ? 'Their hold is empty.' : 'Your hold is empty.'}</li>
    {/each}
  </ul>
  {#snippet actions()}
    {#if plunder}
      <button disabled={working} onclick={() => ui.jettison()}>Jettison…</button>
    {/if}
    <button class="primary" disabled={working} onclick={() => dialog.resolve()}>Done</button>
  {/snippet}
</Modal>

<style>
  .list {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  li {
    display: grid;
    grid-template-columns: 1fr 3rem auto auto;
    align-items: center;
    gap: 0.5rem;
  }
  li.none {
    display: block;
  }
  li.empty .name,
  li.empty .num {
    color: var(--text-faint);
  }
  .num {
    text-align: right;
  }
</style>
