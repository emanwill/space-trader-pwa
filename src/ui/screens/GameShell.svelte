<script lang="ts">
  import Header from '../components/Header.svelte';
  import GameMenu from '../components/GameMenu.svelte';
  import { wide } from '../media.svelte';
  import { app, type Tab } from '../state.svelte';
  import CaptainScreen from './CaptainScreen.svelte';
  import MapScreen from './MapScreen.svelte';
  import ShipyardScreen from './ShipyardScreen.svelte';
  import StationScreen from './StationScreen.svelte';
  import TradeScreen from './TradeScreen.svelte';

  const TABS: { id: Tab; label: string; icon: string }[] = [
    { id: 'trade', label: 'Trade', icon: '⇄' },
    { id: 'map', label: 'Map', icon: '✦' },
    { id: 'station', label: 'Station', icon: '⌂' },
    { id: 'shipyard', label: 'Shipyard', icon: '⚙' },
    { id: 'captain', label: 'Captain', icon: '☰' },
  ];

  let menuOpen = $state(false);
  // On wide screens the map has its own pane, so it isn't a tab.
  const tabs = $derived(wide.matches ? TABS.filter((t) => t.id !== 'map') : TABS);
  const tab = $derived(wide.matches && app.tab === 'map' ? 'trade' : app.tab);
</script>

<div class="shell" class:wide={wide.matches}>
  <Header onmenu={() => (menuOpen = true)} />

  {#if wide.matches}
    <aside class="map-pane">
      <MapScreen />
    </aside>
  {/if}

  <main class="content">
    {#if tab === 'trade'}
      <TradeScreen />
    {:else if tab === 'map'}
      <MapScreen />
    {:else if tab === 'station'}
      <StationScreen />
    {:else if tab === 'shipyard'}
      <ShipyardScreen />
    {:else}
      <CaptainScreen />
    {/if}
  </main>

  <nav class="tabs" aria-label="Sections">
    {#each tabs as t (t.id)}
      <button
        class="tab"
        class:active={tab === t.id}
        aria-current={tab === t.id ? 'page' : undefined}
        onclick={() => (app.tab = t.id)}
      >
        <span class="icon" aria-hidden="true">{t.icon}</span>
        <span>{t.label}</span>
      </button>
    {/each}
  </nav>
</div>

{#if menuOpen}
  <GameMenu onclose={() => (menuOpen = false)} />
{/if}

<style>
  .shell {
    display: grid;
    grid-template-rows: auto 1fr auto;
    grid-template-areas: 'header' 'content' 'tabs';
    min-height: 100dvh;
  }
  .content {
    grid-area: content;
    min-width: 0;
    padding-bottom: calc(var(--tabbar-h) + env(safe-area-inset-bottom, 0));
  }
  .tabs {
    position: fixed;
    inset: auto 0 0 0;
    z-index: 20;
    display: flex;
    padding: 0 env(safe-area-inset-right, 0) env(safe-area-inset-bottom, 0)
      env(safe-area-inset-left, 0);
    border-top: 1px solid var(--border);
    background: var(--surface);
  }
  .tab {
    flex: 1;
    flex-direction: column;
    gap: 0;
    height: var(--tabbar-h);
    min-height: 0;
    padding: 0;
    border: 0;
    border-radius: 0;
    background: none;
    color: var(--text-dim);
    font-size: 0.75rem;
    font-weight: 600;
  }
  .tab .icon {
    font-size: 1.2rem;
    line-height: 1;
  }
  .tab.active {
    color: var(--accent);
  }
  .tab:hover:not(:disabled) {
    background: var(--surface-2);
  }

  /* Wide: map pane on the left, tabs across the top of the content. */
  .shell.wide {
    grid-template-columns: minmax(24rem, 1fr) minmax(32rem, 1.25fr);
    grid-template-rows: auto auto 1fr;
    grid-template-areas: 'header header' 'map tabs' 'map content';
    height: 100dvh;
  }
  .wide .map-pane {
    grid-area: map;
    display: flex;
    min-height: 0;
    border-right: 1px solid var(--border);
  }
  .wide .content {
    overflow-y: auto;
    padding-bottom: env(safe-area-inset-bottom, 0);
  }
  .wide .tabs {
    position: static;
    grid-area: tabs;
    padding: 0 0.5rem;
    border-top: 0;
    border-bottom: 1px solid var(--border);
    background: var(--bg);
  }
  .wide .tab {
    flex: 0 1 8rem;
    flex-direction: row;
    gap: 0.4rem;
    height: 2.75rem;
    font-size: 0.95rem;
    border-bottom: 2px solid transparent;
  }
  .wide .tab.active {
    border-bottom-color: var(--accent);
  }
</style>
