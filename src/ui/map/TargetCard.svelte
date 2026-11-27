<script lang="ts">
  // The Target System panel: the selected system's facts and the Warp, Track
  // and Jump buttons.
  import { wormholeExists } from '../../engine/functions';
  import { multiples } from '../../engine/format';
  import { Strings } from '../../engine/data/strings';
  import { trackSelectedSystem } from '../../engine/services';
  import { app } from '../state.svelte';
  import { blockerText, systemFacts } from '../text';
  import { jump, planView, warp } from '../trade-plan.svelte';

  let { compact = false }: { compact?: boolean } = $props();

  const view = $derived.by(() => {
    const game = app.game;
    const target = game?.warpSystem;
    if (!game || !target) return null;
    const current = game.commander.currentSystem!;
    const p = planView(game);
    return {
      name: target.name,
      here: target === current,
      distance: target.distance,
      viaWormhole: wormholeExists(current, target),
      facts: systemFacts(target, game),
      inRange: target.destOk,
      tracked: game.trackedSystem === target,
      canTrack: !target.destOk && target !== current,
      canJump: game.canSuperWarp && target !== current,
      blocker: p.blocker === null ? null : blockerText(p.blocker, game),
      pendingTrade: !p.empty,
    };
  });
</script>

{#if view}
  <section class="card target" class:compact>
    <div class="card-head">
      <h2>{view.name}</h2>
      <span class="dim num">
        {#if view.here}
          You are here
        {:else if view.viaWormhole}
          Wormhole · {multiples(view.distance, Strings.DistanceUnit)} away
        {:else}
          {multiples(view.distance, Strings.DistanceUnit)}
        {/if}
      </span>
    </div>
    <dl class="facts">
      <dt>Size</dt>
      <dd>{view.facts.size}</dd>
      <dt>Tech level</dt>
      <dd>{view.facts.tech}</dd>
      <dt>Government</dt>
      <dd>{view.facts.government}</dd>
      <dt>Resources</dt>
      <dd>{view.facts.resource}</dd>
      <dt>Police</dt>
      <dd>{view.facts.police}</dd>
      <dt>Pirates</dt>
      <dd>{view.facts.pirates}</dd>
    </dl>
    {#if !view.here}
      {#if view.blocker}
        <p class="warn">{view.blocker}</p>
      {/if}
      <div class="row">
        {#if view.inRange}
          <button
            class="primary"
            disabled={app.busy || view.blocker !== null}
            onclick={() => warp()}
          >
            {view.pendingTrade ? 'Trade & warp' : 'Warp'}
          </button>
        {/if}
        {#if view.canTrack}
          <button
            disabled={app.busy}
            onclick={() =>
              app.run((g) => {
                if (view.tracked) g.trackedSystemId = -1;
                else trackSelectedSystem(g);
              })}
          >
            {view.tracked ? 'Stop tracking' : 'Track'}
          </button>
        {/if}
        {#if view.canJump}
          <button disabled={app.busy} onclick={() => jump()}>Jump</button>
        {/if}
        {#if view.inRange && app.tab === 'map'}
          <button class="ghost" onclick={() => (app.tab = 'trade')}>Prices</button>
        {/if}
      </div>
    {/if}
  </section>
{/if}

<style>
  .target {
    gap: 0.6rem;
  }
  .compact .facts {
    grid-template-columns: max-content 1fr max-content 1fr;
    font-size: 0.9rem;
  }
</style>
