<script lang="ts">
  // GameEnd: how the game ended, the score and the high-score verdict, on one page.
  import { alertImage } from '../images';
  import { ui } from '../web-ui.svelte';

  const page = $derived(ui.gameOver);
</script>

{#if page}
  <div class="game-over" role="dialog" aria-modal="true" aria-labelledby="game-over-title">
    {#if page.image !== null}
      <img class="pixel art" src={alertImage(page.image)} width="320" height="320" alt="" />
    {/if}
    <h1 id="game-over-title">{page.title}</h1>
    {#if page.score}
      <p class="score">{page.score}</p>
    {/if}
    {#if page.result}
      <p class="dim">{page.result}</p>
    {/if}
    {#if page.resolve}
      <!-- svelte-ignore a11y_autofocus -->
      <button class="primary" autofocus onclick={() => page.resolve?.()}>Continue</button>
    {/if}
  </div>
{/if}

<style>
  .game-over {
    position: fixed;
    inset: 0;
    z-index: 200;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    padding: 1.5rem;
    text-align: center;
    background: var(--bg);
    animation: fade 0.4s ease-out;
  }
  .art {
    width: 160px;
    height: 160px;
  }
  @media (min-width: 22rem) and (min-height: 38rem) {
    .art {
      width: 320px;
      height: 320px;
    }
  }
  h1 {
    color: var(--accent);
  }
  .score {
    font-size: 1.2rem;
    font-weight: 600;
  }
  button {
    min-width: 12rem;
  }
  @keyframes fade {
    from {
      opacity: 0;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .game-over {
      animation: none;
    }
  }
</style>
