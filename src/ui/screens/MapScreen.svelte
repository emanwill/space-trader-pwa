<script lang="ts">
  // The map: the galaxy with search (the original's Find) and the target card.
  import GalaxyMap from '../map/GalaxyMap.svelte';
  import TargetCard from '../map/TargetCard.svelte';
  import { app } from '../state.svelte';

  let query = $state('');
  let focus = $state(0);
  let notFound = $state(false);
  let chart: ReturnType<typeof GalaxyMap> | undefined = $state();

  const names = $derived(app.game?.universe.map((s) => s.name) ?? []);

  async function find(): Promise<void> {
    const q = query.trim().toLowerCase();
    if (!q) return;
    // Game.SelectedSystemName picks the first system whose name contains the text.
    notFound = !names.some((name) => name.toLowerCase().includes(q));
    if (notFound) return;
    await app.run((game) => {
      game.selectedSystemName = q;
    });
    focus++;
    query = '';
  }
</script>

<section class="map-screen">
  <form
    class="search"
    onsubmit={(e) => {
      e.preventDefault();
      void find();
    }}
  >
    <input
      type="search"
      placeholder="Find a system"
      aria-label="Find a system"
      list="system-names"
      bind:value={query}
      oninput={() => (notFound = false)}
    />
    <datalist id="system-names">
      {#each names as name (name)}
        <option value={name}></option>
      {/each}
    </datalist>
    <button type="submit" class="small">Find</button>
    <span class="spacer"></span>
    <button type="button" class="small" aria-label="Zoom out" onclick={() => chart?.zoom(1.4)}>
      −
    </button>
    <button type="button" class="small" aria-label="Zoom in" onclick={() => chart?.zoom(1 / 1.4)}>
      +
    </button>
    <button type="button" class="small" onclick={() => chart?.recentre()}>Here</button>
  </form>
  {#if notFound}
    <p class="warn not-found">No system matches “{query}”.</p>
  {/if}
  <GalaxyMap mode="full" {focus} bind:this={chart} />
  <div class="card-slot">
    <TargetCard compact />
  </div>
</section>

<style>
  .map-screen {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-width: 0;
    /* Fill the space between the header and the tab bar. */
    height: calc(
      100dvh - var(--header-h) - var(--tabbar-h) - env(safe-area-inset-top, 0) -
        env(safe-area-inset-bottom, 0)
    );
  }
  :global(.map-pane) .map-screen {
    height: auto;
  }
  .search {
    display: flex;
    gap: 0.4rem;
    padding: 0.5rem;
    border-bottom: 1px solid var(--border);
  }
  .search input {
    flex: 1 1 8rem;
    min-width: 0;
    min-height: 2.25rem;
  }
  .not-found {
    padding: 0.25rem 0.75rem;
  }
  .card-slot {
    max-height: 45%;
    overflow-y: auto;
    padding: 0.5rem;
    border-top: 1px solid var(--border);
  }
  .card-slot:empty {
    display: none;
  }
</style>
