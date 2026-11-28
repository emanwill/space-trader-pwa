<script lang="ts">
  // "A new version is available". Reloading is held back during a trip or an
  // action, since the game resumes from its autosave.
  import { pwa } from '../pwa.svelte';
  import { app } from '../state.svelte';
  import { travel } from '../travel.svelte';

  const blocked = $derived(app.busy || travel.active);
</script>

{#if pwa.needRefresh}
  <div class="banner" role="status">
    <span>
      A new version of Space Trader is available.
      {#if blocked}<span class="dim">Finish what you're doing first.</span>{/if}
    </span>
    <span class="row">
      <button class="small ghost" onclick={() => pwa.dismiss()}>Later</button>
      <button class="small primary" disabled={blocked} onclick={() => pwa.update()}>Update</button>
    </span>
  </div>
{/if}

<style>
  .banner {
    position: fixed;
    left: 50%;
    top: calc(env(safe-area-inset-top, 0px) + 0.5rem);
    z-index: 160;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem 1rem;
    width: min(32rem, calc(100% - 1rem));
    padding: 0.6rem 0.75rem;
    border: 1px solid var(--accent);
    border-radius: var(--radius);
    background: var(--surface-2);
    box-shadow: 0 6px 20px var(--shadow);
    transform: translateX(-50%);
  }
</style>
