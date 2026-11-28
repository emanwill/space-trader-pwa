<script lang="ts">
  import { onMount } from 'svelte';
  import { GameSession } from '../app/session';
  import { IndexedDbStore, MemoryStore, requestPersistentStorage } from '../app/storage';
  import AboutSheet from './components/AboutSheet.svelte';
  import GameOverScreen from './components/GameOverScreen.svelte';
  import MonsterSheet from './components/MonsterSheet.svelte';
  import OptionsSheet from './components/OptionsSheet.svelte';
  import KeysSheet from './components/KeysSheet.svelte';
  import TestPanel from './components/TestPanel.svelte';
  import { onKeydown } from './keys.svelte';
  import Toasts from './components/Toasts.svelte';
  import UpdateBanner from './components/UpdateBanner.svelte';
  import { pwa } from './pwa.svelte';
  import { theme } from './theme.svelte';
  import DialogHost from './dialogs/DialogHost.svelte';
  import GameShell from './screens/GameShell.svelte';
  import NewCommander from './screens/NewCommander.svelte';
  import Title from './screens/Title.svelte';
  import { app } from './state.svelte';
  import TravelScreen from './travel/TravelScreen.svelte';
  import { travel } from './travel.svelte';
  import { ui } from './web-ui.svelte';

  onMount(async () => {
    pwa.start();
    theme.apply();
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

<svelte:window onkeydown={onKeydown} />

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

{#if app.sheet === 'options'}
  <OptionsSheet onclose={() => (app.sheet = null)} />
{:else if app.sheet === 'about'}
  <AboutSheet onclose={() => (app.sheet = null)} />
{:else if app.sheet === 'monster' && app.game}
  <MonsterSheet onclose={() => (app.sheet = null)} />
{:else if app.sheet === 'test'}
  <TestPanel onclose={() => (app.sheet = null)} />
{:else if app.sheet === 'keys'}
  <KeysSheet onclose={() => (app.sheet = null)} />
{/if}
{#if travel.shown}
  <TravelScreen />
{/if}
<DialogHost />
<Toasts />
<UpdateBanner />
<GameOverScreen />

<style>
  .loading {
    display: grid;
    place-items: center;
    min-height: 100dvh;
  }
</style>
