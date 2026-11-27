<script lang="ts">
  import { importGame, startNewGame } from '../actions';
  import HighScoresSheet from '../components/HighScoresSheet.svelte';
  import SavesSheet from '../components/SavesSheet.svelte';
  import { imageUrl } from '../images';
  import { app } from '../state.svelte';

  let sheet = $state<'saves' | 'scores' | null>(null);
</script>

<main class="title">
  <img class="pixel splash" src={imageUrl('splash')} width="320" height="320" alt="" />
  <h1>Space Trader</h1>
  <p class="dim">Trade goods, upgrade your ship and battle pirates across the galaxy.</p>
  <nav class="menu">
    <button class="primary" disabled={app.busy} onclick={startNewGame}>New game</button>
    <button disabled={app.busy} onclick={() => (sheet = 'saves')}>Load game</button>
    <button disabled={app.busy} onclick={importGame}>Import save file</button>
    <button disabled={app.busy} onclick={() => (sheet = 'scores')}>High scores</button>
    <div class="row pair">
      <button disabled={app.busy} onclick={() => (app.sheet = 'options')}>Options</button>
      <button disabled={app.busy} onclick={() => (app.sheet = 'about')}>About</button>
    </div>
  </nav>
  <p class="faint credit">
    A port of Space Trader for Windows 2.00 by Jay French, after the Palm game by Pieter Spronck.
    Free software under the GNU GPL.
  </p>
</main>

{#if sheet === 'saves'}
  <SavesSheet onclose={() => (sheet = null)} />
{:else if sheet === 'scores'}
  <HighScoresSheet onclose={() => (sheet = null)} />
{/if}

<style>
  .title {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    min-height: 100dvh;
    padding: calc(1.5rem + env(safe-area-inset-top, 0)) 1rem
      calc(1.5rem + env(safe-area-inset-bottom, 0));
    text-align: center;
  }
  /* 2× where it fits, else 1×: pixel art only scales by whole numbers. */
  .splash {
    width: 160px;
    height: 160px;
  }
  @media (min-width: 22rem) and (min-height: 40rem) {
    .splash {
      width: 320px;
      height: 320px;
    }
  }
  h1 {
    color: var(--accent);
    letter-spacing: 0.05em;
  }
  .menu {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    width: min(18rem, 100%);
  }
  .pair button {
    flex: 1;
  }
  .credit {
    max-width: 26rem;
    margin-top: auto;
    font-size: 0.8rem;
  }
</style>
