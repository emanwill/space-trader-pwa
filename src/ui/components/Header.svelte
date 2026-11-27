<script lang="ts">
  // The persistent status bar: where you are, and the numbers you check most.
  import { formatMoney } from '../../engine/format';
  import { app } from '../state.svelte';

  let { onmenu }: { onmenu: () => void } = $props();

  const view = $derived.by(() => {
    const game = app.game;
    if (!game) return null;
    const cmdr = game.commander;
    const ship = cmdr.ship;
    return {
      system: cmdr.currentSystem!.name,
      day: cmdr.days,
      cash: formatMoney(cmdr.cash),
      debt: cmdr.debt > 0 ? formatMoney(cmdr.debt) : null,
      bays: `${ship.filledCargoBays}/${ship.cargoBays}`,
      fuel: `${ship.fuel}/${ship.fuelTanks}`,
      fuelLow: ship.fuel < ship.fuelTanks,
      hull: Math.floor((100 * ship.hull) / ship.hullStrength),
    };
  });
</script>

<header class="header">
  {#if view}
    <div class="where">
      <strong class="system">{view.system}</strong>
      <span class="dim num">Day {view.day}</span>
    </div>
    <dl class="stats">
      <div>
        <dt>Cash</dt>
        <dd class="num">{view.cash}</dd>
      </div>
      {#if view.debt}
        <div>
          <dt>Debt</dt>
          <dd class="num bad">{view.debt}</dd>
        </div>
      {/if}
      <div>
        <dt>Bays</dt>
        <dd class="num">{view.bays}</dd>
      </div>
      <div>
        <dt>Fuel</dt>
        <dd class="num" class:warn={view.fuelLow}>{view.fuel}</dd>
      </div>
      <div>
        <dt>Hull</dt>
        <dd class="num" class:warn={view.hull < 100}>{view.hull}%</dd>
      </div>
    </dl>
  {/if}
  <button class="ghost menu" aria-label="Game menu" onclick={onmenu}>☰</button>
</header>

<style>
  .header {
    grid-area: header;
    position: sticky;
    top: 0;
    z-index: 20;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    min-height: var(--header-h);
    padding: env(safe-area-inset-top, 0) calc(0.25rem + env(safe-area-inset-right, 0)) 0
      calc(0.75rem + env(safe-area-inset-left, 0));
    border-bottom: 1px solid var(--border);
    background: var(--surface);
  }
  .where {
    display: flex;
    flex-direction: column;
    min-width: 0;
    line-height: 1.15;
  }
  .system {
    color: var(--accent);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .where .dim {
    font-size: 0.8rem;
  }
  .stats {
    display: flex;
    flex: 1;
    justify-content: flex-end;
    gap: 0.9rem;
    margin: 0;
    overflow-x: auto;
    scrollbar-width: none;
  }
  .stats div {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    line-height: 1.15;
  }
  .stats dt {
    color: var(--text-dim);
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .stats dd {
    margin: 0;
    font-weight: 600;
    font-size: 0.9rem;
    white-space: nowrap;
  }
  .menu {
    font-size: 1.3rem;
    width: var(--tap);
    padding: 0;
  }
  @media (max-width: 26rem) {
    .stats {
      gap: 0.6rem;
    }
    .stats dd {
      font-size: 0.82rem;
    }
  }
</style>
