<script lang="ts">
  // FormViewHighScores.
  import type { HighScoreLine } from '../../engine/high-scores';
  import Modal from '../dialogs/Modal.svelte';
  import { app } from '../state.svelte';

  let { onclose }: { onclose: () => void } = $props();
  let lines = $state<HighScoreLine[] | null>(null);

  async function refresh(): Promise<void> {
    lines = (await app.session?.highScores()) ?? [];
  }
  void refresh();

  async function clear(): Promise<void> {
    if (await app.task(() => app.session!.clearHighScores())) await refresh();
  }
</script>

<Modal title="High scores">
  {#if lines === null}
    <p class="dim">Loading…</p>
  {:else if lines.length === 0}
    <p class="dim">No high scores yet.</p>
  {:else}
    <ol class="scores">
      {#each lines as line, i (i)}
        <li>
          <div class="card-head">
            <strong>{line.name}</strong>
            <span class="num score">{line.score}%</span>
          </div>
          <p class="dim">{line.status}</p>
        </li>
      {/each}
    </ol>
  {/if}
  {#snippet actions()}
    {#if lines?.length}
      <button class="danger" onclick={clear}>Clear</button>
    {/if}
    <button class="primary" onclick={onclose}>Close</button>
  {/snippet}
</Modal>

<style>
  .scores {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin: 0;
    padding-left: 1.5rem;
  }
  .score {
    color: var(--accent);
    font-weight: 700;
  }
</style>
