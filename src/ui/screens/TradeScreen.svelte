<script lang="ts">
  // The Trade screen (PLAN.md §4.1): the cargo panel with the target system's
  // estimates, inline buy/sell quantities, and the warp button.
  import { Strings } from '../../engine/data/strings';
  import { formatMoney, formatNumber, multiples } from '../../engine/format';
  import { wormholeExists } from '../../engine/functions';
  import { idiv } from '../../engine/math';
  import Stepper from '../components/Stepper.svelte';
  import GalaxyMap from '../map/GalaxyMap.svelte';
  import { wide } from '../media.svelte';
  import { app } from '../state.svelte';
  import { blockerText, systemFacts } from '../text';
  import { plan, planView, trade, warp } from '../trade-plan.svelte';

  // On short screens (a phone held sideways) the market needs the room.
  let showMap = $state(typeof window === 'undefined' || window.innerHeight >= 560);

  const view = $derived.by(() => {
    const game = app.game;
    if (!game) return null;
    const current = game.commander.currentSystem!;
    const target = game.warpSystem;
    const p = planView(game);
    const inRange = game.destinations;
    return {
      game,
      plan: p,
      target:
        target && target !== current
          ? {
              name: target.name,
              distance: target.distance,
              inRange: target.destOk,
              viaWormhole: wormholeExists(current, target),
              facts: systemFacts(target, game),
              index: inRange.indexOf(target.id),
            }
          : null,
      rangeCount: inRange.length,
      blocker: p.blocker === null ? null : blockerText(p.blocker, game),
      profitableHeld: p.rows.filter((r) => r.sellProfitable && r.min < 0),
    };
  });

  const money = (n: number) => formatMoney(n);
  const signed = (n: number) => (n > 0 ? '+' : n < 0 ? '−' : '') + formatNumber(Math.abs(n));

  function cycle(forward: boolean): void {
    void app.run((game) => game.selectNextSystemWithinRange(forward));
  }

  // Swipe the destination bar to cycle.
  let swipeX: number | null = null;
  function onpointerdown(e: PointerEvent): void {
    swipeX = e.clientX;
  }
  function onpointerup(e: PointerEvent): void {
    if (swipeX !== null && Math.abs(e.clientX - swipeX) > 50) cycle(e.clientX < swipeX);
    swipeX = null;
  }

  function setQuantity(item: number, quantity: number): void {
    const game = app.game;
    if (game) plan.set(game, item, quantity);
  }

  function dump(item: number): void {
    void app.run((game) => game.cargoDump(item));
  }

  function sellProfitable(): void {
    const game = app.game;
    if (!game || !view) return;
    plan.setMany(game, Object.fromEntries(view.profitableHeld.map((r) => [r.item, r.min])));
  }
</script>

{#if view}
  <section class="trade">
    <div class="top">
      {#if !wide.matches && showMap}
        <GalaxyMap mode="mini" />
      {/if}
      <div
        class="dest"
        role="group"
        aria-label="Destination"
        {onpointerdown}
        {onpointerup}
        onpointercancel={() => (swipeX = null)}
      >
        <button
          class="ghost cycle"
          aria-label="Previous system in range"
          disabled={view.rangeCount === 0}
          onclick={() => cycle(false)}
        >
          ◀
        </button>
        <div class="dest-info">
          {#if view.target}
            <div class="dest-name">
              <strong>{view.target.name}</strong>
              <span class="dim num">
                {view.target.viaWormhole
                  ? 'via wormhole'
                  : multiples(view.target.distance, Strings.DistanceUnit)}
                {#if view.target.index >= 0}· {view.target.index + 1}/{view.rangeCount}{/if}
              </span>
            </div>
            <div class="dest-facts dim">
              {view.target.facts.tech} · {view.target.facts.government} · Police {view.target.facts
                .police} · Pirates {view.target.facts.pirates}
            </div>
          {:else}
            <div class="dim">
              {view.rangeCount > 0
                ? `${view.rangeCount} systems in range. Tap ◀ ▶ or the map.`
                : 'No systems in range. Buy fuel at the station.'}
            </div>
          {/if}
        </div>
        <button
          class="ghost cycle"
          aria-label="Next system in range"
          disabled={view.rangeCount === 0}
          onclick={() => cycle(true)}
        >
          ▶
        </button>
        {#if !wide.matches}
          <button
            class="ghost small map-toggle"
            aria-pressed={showMap}
            onclick={() => (showMap = !showMap)}
          >
            {showMap ? 'Hide map' : 'Map'}
          </button>
        {/if}
      </div>
    </div>

    <div class="rows" role="table" aria-label="Market">
      <div class="head" role="row">
        <span role="columnheader">Item</span>
        <span role="columnheader" class="r">Buy · stock</span>
        <span role="columnheader" class="r">Sell · hold</span>
        <span role="columnheader" class="r">
          {view.target ? `At ${view.target.name}` : 'Target'}
        </span>
        <span role="columnheader" class="c">Order</span>
      </div>
      {#each view.plan.rows as row (row.item)}
        {@const avg = row.held > 0 ? idiv(row.paid, row.held) : 0}
        <div class="item" role="row" class:ordered={row.quantity !== 0}>
          <span class="name" role="cell">
            {row.name}
            {#if row.illegal}
              <span
                class="illegal"
                title="Illegal{view.target
                  ? `. Police at ${view.target.name}: ${view.target.facts.police}`
                  : ''}"
              >
                ⚠
              </span>
            {/if}
          </span>
          <span class="buy r num" role="cell">
            <span class="label">Buy</span>
            {#if row.buyPrice > 0}
              <span class:good={row.buyProfitable}>{money(row.buyPrice)}</span>
              <span class="faint">· {row.stock} left</span>
            {:else}
              <span class="faint">{Strings.CargoBuyNA}</span>
            {/if}
          </span>
          <span class="sell r num" role="cell">
            <span class="label">Sell</span>
            {#if row.sellPrice > 0}
              <span class:good={row.sellProfitable}>{money(row.sellPrice)}</span>
            {:else}
              <span class="faint">{Strings.CargoSellNA}</span>
            {/if}
            {#if row.held > 0}
              <span class="hold">
                · hold {row.held} <span class="faint">(paid {money(avg)})</span>
              </span>
            {/if}
          </span>
          <span class="est r num" role="cell">
            {#if row.estimate !== null}
              <span>~{money(row.estimate)}</span>
              {#if row.margin !== null}
                <span class:good={row.margin > 0} class:bad={row.margin < 0}>
                  {signed(row.margin)} ({signed(row.marginPercent ?? 0)}%)
                </span>
              {/if}
            {:else}
              <span class="faint">—</span>
            {/if}
          </span>
          <span class="order" role="cell">
            {#if row.min < 0 || row.max > 0}
              <Stepper
                label={row.name}
                value={row.quantity}
                min={row.min}
                max={row.max}
                signed
                disabled={app.busy}
                onchange={(q) => setQuantity(row.item, q)}
              />
              {#if row.max > 0}
                <button
                  class="small"
                  disabled={app.busy || row.quantity === row.max}
                  onclick={() => setQuantity(row.item, row.max)}
                >
                  Max
                </button>
              {/if}
              {#if row.min < 0}
                <button
                  class="small"
                  disabled={app.busy || row.quantity === row.min}
                  onclick={() => setQuantity(row.item, row.min)}
                >
                  All
                </button>
              {/if}
            {:else if row.held > 0}
              <button class="small" disabled={app.busy} onclick={() => dump(row.item)}>
                Dump…
              </button>
            {/if}
          </span>
        </div>
      {/each}
    </div>

    <footer class="plan">
      <div class="totals num">
        <span>
          Bays <strong class:warn={view.plan.baysAfter > view.plan.bays}>
            {view.plan.baysAfter}/{view.plan.bays}
          </strong>
        </span>
        <span>Cash <strong>{money(view.plan.cashAfter)}</strong></span>
        {#if view.plan.estimate && view.target && view.plan.baysAfter > 0}
          {@const profit = view.plan.estimate.value - view.plan.estimate.cost}
          <span>
            Hold at {view.target.name}
            <strong>~{money(view.plan.estimate.value)}</strong>
            {#if view.plan.estimate.cost > 0}
              <span class:good={profit > 0} class:bad={profit < 0}>({signed(profit)})</span>
            {/if}
          </span>
        {/if}
      </div>
      {#if view.plan.trip && view.target}
        {@const trip = view.plan.trip}
        <div class="trip dim num">
          Trip: {trip.fuel > 0 ? multiples(trip.fuel, Strings.DistanceUnit) : 'no fuel (wormhole)'}
          {#if trip.total > 0}
            · costs {money(trip.total)}
            <span class="faint">
              ({[
                trip.mercenaries && `crew ${money(trip.mercenaries)}`,
                trip.insurance && `insurance ${money(trip.insurance)}`,
                trip.wormholeTax && `wormhole tax ${money(trip.wormholeTax)}`,
                trip.interest && `interest ${money(trip.interest)}`,
              ]
                .filter(Boolean)
                .join(', ')})
            </span>
          {/if}
        </div>
      {/if}
      {#if view.blocker && view.target}
        <p class="warn">{view.blocker}</p>
      {/if}
      <div class="row buttons">
        {#if !view.plan.empty}
          <button class="small" disabled={app.busy} onclick={() => plan.clear()}>Clear</button>
          <button disabled={app.busy} onclick={() => trade()}>
            {view.plan.buying > 0 && view.plan.selling > 0
              ? 'Trade'
              : view.plan.buying > 0
                ? `Buy ${view.plan.buying}`
                : `Sell ${view.plan.selling}`}
          </button>
        {:else if view.profitableHeld.length > 0}
          <button class="small" disabled={app.busy} onclick={sellProfitable}>
            Sell profitable
          </button>
        {/if}
        <span class="spacer"></span>
        <button
          class="primary warp"
          disabled={app.busy || view.plan.blocker !== null}
          onclick={() => warp()}
        >
          {view.plan.empty ? 'Warp' : 'Trade & warp'}{view.target ? ` to ${view.target.name}` : ''}
        </button>
      </div>
    </footer>
  </section>
{/if}

<style>
  .trade {
    display: flex;
    flex-direction: column;
    min-height: 100%;
  }
  .top {
    position: sticky;
    top: calc(var(--header-h) + env(safe-area-inset-top, 0px));
    z-index: 5;
    background: var(--bg);
    border-bottom: 1px solid var(--border);
  }
  :global(.shell.wide) .top {
    top: 0;
  }
  .dest {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.35rem 0.25rem;
    touch-action: pan-y;
  }
  .cycle {
    width: var(--tap);
    padding: 0;
    font-size: 1.1rem;
  }
  .dest-info {
    flex: 1;
    min-width: 0;
    text-align: center;
  }
  .dest-name {
    display: flex;
    justify-content: center;
    align-items: baseline;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  .dest-name strong {
    font-size: 1.05rem;
  }
  .dest-facts {
    font-size: 0.82rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .map-toggle {
    font-size: 0.8rem;
  }

  /* Market rows: two-line cards on phones, a table on wider screens. */
  .rows {
    display: flex;
    flex-direction: column;
    padding: 0.25rem 0.5rem;
    container-type: inline-size;
  }
  .head {
    display: none;
  }
  .item {
    display: grid;
    grid-template-columns: 1fr auto;
    grid-template-areas:
      'name order'
      'buy order'
      'sell est';
    gap: 0.1rem 0.75rem;
    padding: 0.55rem 0.25rem;
    border-bottom: 1px solid var(--border);
    font-size: 0.92rem;
  }
  .item.ordered {
    background: var(--accent-soft);
  }
  .name {
    grid-area: name;
    font-weight: 600;
  }
  .buy {
    grid-area: buy;
  }
  .sell {
    grid-area: sell;
  }
  .est {
    grid-area: est;
  }
  .order {
    grid-area: order;
    display: flex;
    flex-wrap: nowrap;
    align-items: center;
    justify-content: flex-end;
    gap: 0.25rem;
  }
  .buy,
  .sell {
    text-align: left;
  }
  .est {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
  }
  .label {
    color: var(--text-faint);
    font-size: 0.8rem;
    margin-right: 0.15rem;
  }
  .illegal {
    color: var(--warn);
    cursor: help;
  }
  .hold {
    color: var(--text);
  }

  /* A table when the pane is wide enough. */
  @container (min-width: 46rem) {
    .head,
    .item {
      display: grid;
      grid-template-columns: minmax(5.5rem, 1fr) 7rem 9rem 7rem 15.5rem;
      grid-template-areas: 'name buy sell est order';
      align-items: center;
    }
    .head {
      position: sticky;
      gap: 0 0.75rem;
      padding: 0.4rem 0.25rem;
      color: var(--text-dim);
      font-size: 0.8rem;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    .buy,
    .sell,
    .r {
      text-align: right;
    }
    .label {
      display: none;
    }
    .c {
      text-align: center;
    }
    .sell {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
    }
  }

  .plan {
    position: sticky;
    bottom: calc(var(--tabbar-h) + env(safe-area-inset-bottom, 0));
    z-index: 5;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    margin-top: auto;
    padding: 0.6rem 0.75rem;
    border-top: 1px solid var(--border);
    background: var(--surface);
  }
  :global(.shell.wide) .plan {
    bottom: 0;
  }
  /* Too short to pin both the destination bar and the footer. */
  @media (max-height: 34rem) {
    .top,
    .plan {
      position: static;
    }
  }
  .totals {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem 1rem;
  }
  .trip {
    font-size: 0.85rem;
  }
  .buttons {
    flex-wrap: nowrap;
  }
  .buttons button {
    white-space: nowrap;
  }
  .warp {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
