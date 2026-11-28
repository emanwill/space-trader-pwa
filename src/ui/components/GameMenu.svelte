<script lang="ts">
  // The original's Game menu: new, load, save, save as, retire, high scores,
  // plus export and import of save files.
  import { exportGame, importGame, retire, save, saveAs, startNewGame } from '../actions';
  import Modal from '../dialogs/Modal.svelte';
  import { app } from '../state.svelte';
  import HighScoresSheet from './HighScoresSheet.svelte';
  import MessagesSheet from './MessagesSheet.svelte';
  import SavesSheet from './SavesSheet.svelte';

  let { onclose }: { onclose: () => void } = $props();
  let sheet = $state<'saves' | 'scores' | 'messages' | null>(null);

  function then(action: () => unknown): () => Promise<void> {
    return async () => {
      onclose();
      await action();
    };
  }
</script>

{#if sheet === 'saves'}
  <SavesSheet
    onclose={() => {
      sheet = null;
      onclose();
    }}
  />
{:else if sheet === 'scores'}
  <HighScoresSheet onclose={() => (sheet = null)} />
{:else if sheet === 'messages'}
  <MessagesSheet onclose={() => (sheet = null)} />
{:else}
  <Modal title="Game" oncancel={onclose}>
    <p class="dim">
      {app.session?.saveSlotName
        ? `Saving to “${app.session.saveSlotName}”.`
        : 'Not saved to a slot yet.'} Your progress is also kept automatically on this device.
    </p>
    <nav class="menu">
      <button onclick={then(save)}>Save</button>
      <button onclick={then(saveAs)}>Save as…</button>
      <button onclick={() => (sheet = 'saves')}>Load…</button>
      <button onclick={then(exportGame)}>Export save file</button>
      <button onclick={then(importGame)}>Import save file…</button>
      <button onclick={then(startNewGame)}>New game…</button>
      <button onclick={() => (sheet = 'scores')}>High scores</button>
      <button onclick={() => (sheet = 'messages')}>Messages</button>
      <button onclick={then(() => (app.sheet = 'options'))}>Options…</button>
      <button onclick={then(() => (app.sheet = 'about'))}>About</button>
      <button onclick={then(() => (app.sheet = 'keys'))}>Keyboard shortcuts</button>
      {#if app.game?.cheatEnabled}
        <button onclick={then(() => (app.sheet = 'monster'))}>Monster.com</button>
        <button onclick={then(() => (app.sheet = 'test'))}>Test panel</button>
      {/if}
      <button class="danger" onclick={then(retire)}>Retire…</button>
    </nav>
    {#snippet actions()}
      <button class="primary" onclick={onclose}>Close</button>
    {/snippet}
  </Modal>
{/if}

<style>
  .menu {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
  }
</style>
