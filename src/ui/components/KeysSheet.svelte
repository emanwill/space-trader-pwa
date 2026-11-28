<script lang="ts">
  import Modal from '../dialogs/Modal.svelte';
  import { wide } from '../media.svelte';

  let { onclose }: { onclose: () => void } = $props();
  const tabs = $derived(
    wide.matches ? 'Trade, Station, Shipyard, Captain' : 'Trade, Map, Station, Shipyard, Captain',
  );

  const GAME: [string, string][] = [
    ['1 – 5', ''],
    ['← →  or  [ ]', 'Previous / next system in range'],
    ['W', 'Warp (trading first, if you set up an order)'],
    ['/', 'Find a system (or enter a code)'],
    ['?', 'This list'],
  ];
  const ENCOUNTER: [string, string][] = [
    ['A', 'Attack'],
    ['F', 'Flee'],
    ['I', 'Ignore'],
    ['S', 'Submit'],
    ['U', 'Surrender'],
    ['B', 'Bribe'],
    ['T', 'Trade'],
    ['P', 'Plunder'],
    ['O', 'Board'],
    ['M', 'Meet'],
    ['D', 'Drink'],
    ['Y', 'Yield'],
    ['Space', 'Stop continuous attack or flight'],
  ];
  const DIALOGS: [string, string][] = [
    ['Enter', 'The highlighted button'],
    ['Esc', 'Cancel, No, or close'],
    ['Tab', 'Move between buttons'],
  ];
</script>

<Modal title="Keyboard shortcuts" oncancel={onclose}>
  {#each [{ title: 'Docked', rows: GAME }, { title: 'Encounters', rows: ENCOUNTER }, { title: 'Dialogs', rows: DIALOGS }] as group (group.title)}
    <h3>{group.title}</h3>
    <dl class="facts">
      {#each group.rows as [key, what] (key)}
        <dt><span class="key">{key}</span></dt>
        <dd>{what || tabs}</dd>
      {/each}
    </dl>
  {/each}
  {#snippet actions()}
    <button class="primary" onclick={onclose}>Close</button>
  {/snippet}
</Modal>

<style>
  .key {
    display: inline-block;
    min-width: 1.6rem;
    padding: 0 0.35rem;
    border: 1px solid var(--border);
    border-radius: 4px;
    background: var(--surface-2);
    color: var(--text);
    font-size: 0.85rem;
    text-align: center;
  }
</style>
