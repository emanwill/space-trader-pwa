<script lang="ts">
  // Placeholder screen until the docked UI exists (Phase 5).
  const img = (name: string) => `${import.meta.env.BASE_URL}images/${name}.png`;
  const ships = ['ship0', 'ship2', 'ship5', 'ship9'];
</script>

<main>
  <img class="pixel splash" src={img('splash')} width="320" height="320" alt="" />
  <h1>Space Trader</h1>
  <p class="dim">A port of Space Trader for Windows 2.00 — under construction.</p>
  <div class="ships">
    {#each ships as ship (ship)}
      <img class="pixel" src={img(ship)} width="128" height="104" alt="" />
    {/each}
  </div>
</main>

<style>
  main {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    padding: 2rem 1rem;
    text-align: center;
  }
  .splash {
    max-width: 100%;
    height: auto;
  }
  h1 {
    margin: 0;
    color: var(--accent);
    letter-spacing: 0.05em;
  }
  .dim {
    margin: 0;
    color: var(--text-dim);
  }
  .ships {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 0.5rem;
  }
</style>
