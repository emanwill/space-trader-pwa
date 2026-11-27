<script lang="ts">
  import { onMount } from 'svelte';
  import { GameSession } from '../app/session';
  import { IndexedDbStore, MemoryStore, requestPersistentStorage } from '../app/storage';
  import DialogHost from './dialogs/DialogHost.svelte';
  import GameShell from './screens/GameShell.svelte';
  import NewCommander from './screens/NewCommander.svelte';
  import Title from './screens/Title.svelte';
  import { app } from './state.svelte';
  import { ui } from './web-ui.svelte';

  onMount(async () => {
    let store;
    try {
      store = await IndexedDbStore.open();
      void requestPersistentStorage();
    } catch (error) {
      console.error(error);
      store = new MemoryStore();
      void ui.message(
        'Saving is unavailable',
        'This browser is not letting the game store data (private browsing can do this). ' +
          'You can play, but nothing will be saved when you close the page.',
      );
    }
    try {
      app.session = await GameSession.open(store, ui);
      app.screen = app.session.game ? 'game' : 'title';
    } catch (error) {
      console.error(error);
      app.error = error instanceof Error ? error.message : String(error);
    }
  });
</script>

{#if app.error}
  <main class="screen">
    <h1>Something went wrong</h1>
    <p class="dim">{app.error}</p>
    <button onclick={() => location.reload()}>Reload</button>
  </main>
{:else if app.screen === 'loading'}
  <main class="loading" aria-busy="true"><span class="dim">Loading…</span></main>
{:else if app.screen === 'title'}
  <Title />
{:else if app.screen === 'new-commander'}
  <NewCommander />
{:else}
  <GameShell />
{/if}

<DialogHost />

<style>
  .loading {
    display: grid;
    place-items: center;
    min-height: 100dvh;
  }
</style>
