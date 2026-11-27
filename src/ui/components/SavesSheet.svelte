<script lang="ts">
  import { describeSummary } from '../../app/save-files';
  import type { SaveSlot } from '../../app/session';
  import { deleteSave, exportSave, loadSave } from '../actions';
  import Modal from '../dialogs/Modal.svelte';
  import { app } from '../state.svelte';

  let { onclose }: { onclose: () => void } = $props();
  let slots = $state<SaveSlot[] | null>(null);

  async function refresh(): Promise<void> {
    slots = (await app.session?.listSaves()) ?? [];
  }
  void refresh();

  const when = (iso: string) =>
    new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
</script>

<Modal title="Load game" wide>
  {#if slots === null}
    <p class="dim">Loading…</p>
  {:else if slots.length === 0}
    <p class="dim">No saved games yet. Use Save in the game menu to make one.</p>
  {:else}
    <ul class="slots">
      {#each slots as slot (slot.id)}
        <li class="card">
          <div class="card-head">
            <strong>{slot.name}</strong>
            <span class="faint">{when(slot.savedAt)}</span>
          </div>
          <p class="dim">{describeSummary(slot.summary)} · {slot.summary.system}</p>
          <div class="row">
            <button
              class="small primary"
              onclick={async () => {
                if (await loadSave(slot.id)) onclose();
              }}
            >
              Load
            </button>
            <button class="small" onclick={() => exportSave(slot.id)}>Export</button>
            <span class="spacer"></span>
            <button
              class="small danger"
              onclick={async () => {
                if (await deleteSave(slot.id, slot.name)) await refresh();
              }}
            >
              Delete
            </button>
          </div>
        </li>
      {/each}
    </ul>
  {/if}
  {#snippet actions()}
    <button onclick={onclose}>Close</button>
  {/snippet}
</Modal>

<style>
  .slots {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .slots .card {
    gap: 0.4rem;
    padding: 0.75rem;
  }
</style>
