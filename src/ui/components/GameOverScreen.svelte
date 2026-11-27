<script lang="ts">
  // GameEnd: how the game ended, the score and the high-score verdict, on one page.
  import type { HighScoreLine } from '../../engine/high-scores';
  import { alertImage } from '../images';
  import { app } from '../state.svelte';
  import { ui } from '../web-ui.svelte';

  const page = $derived(ui.gameOver);

  // Once the verdict is in, show the table (the new entry is already saved).
  let table = $state<HighScoreLine[]>([]);
  $effect(() => {
    if (page?.result) void app.session?.highScores().then((lines) => (table = lines));
    else table = [];
  });
  // The score text is "You achieved a score of 12.3%."; match the entry by its score.
  const mine = $derived(page?.score?.match(/([\d,]+\.\d)%/)?.[1] ?? null);
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
    {#if table.length > 0}
      <ol class="scores">
        {#each table as line, i (i)}
          <li class:mine={line.score === mine}>
            <span class="name">{line.name}</span>
            <span class="num">{line.score}%</span>
          </li>
        {/each}
      </ol>
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
  .scores {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    width: min(20rem, 100%);
    margin: 0;
    padding-left: 1.5rem;
    text-align: left;
  }
  .scores li {
    padding: 0.2rem 0.5rem;
    border-radius: var(--radius-sm);
  }
  .scores li span {
    display: inline-flex;
  }
  .scores .name {
    width: 70%;
  }
  .scores li.mine {
    background: rgb(242 201 76 / 0.15);
    color: var(--accent);
    font-weight: 700;
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
