<script lang="ts">
  // The trip, full screen: the route and progress, the current encounter, and
  // a log of everything that happened, in place of a chain of alerts.
  import { Consts } from '../../engine/data/consts';
  import { Strings } from '../../engine/data/strings';
  import { multiples } from '../../engine/format';
  import { app } from '../state.svelte';
  import { travel } from '../travel.svelte';
  import { ui, type EncounterDialog } from '../web-ui.svelte';
  import EncounterPanel from './EncounterPanel.svelte';

  const encounter = $derived(
    ([...ui.stack].reverse().find((d) => d.kind === 'encounter') as EncounterDialog | undefined) ??
      null,
  );
  // Interactive only when no dialog is open over it.
  const active = $derived(encounter !== null && ui.top === encounter);

  const progress = $derived.by(() => {
    if (travel.arrived) return 1;
    const clicks = app.game?.clicks ?? Consts.StartClicks;
    return Math.max(0, Math.min(1, (Consts.StartClicks - clicks) / Consts.StartClicks));
  });
  const clicksLeft = $derived(travel.arrived ? 0 : (app.game?.clicks ?? 0));
  // The current round is on the encounter panel; don't repeat it in the log.
  const log = $derived(
    travel.log.filter(
      (e) =>
        !(
          encounter &&
          e.kind === 'event' &&
          (e.text === encounter.view.text || e.text === encounter.view.action)
        ),
    ),
  );
  const here = $derived(app.game?.commander.currentSystem?.name ?? travel.to);

  let logEl: HTMLElement | undefined = $state();
  $effect(() => {
    void travel.log.length;
    logEl?.scrollTo({ top: logEl.scrollHeight });
  });
</script>

<div class="travel" role="dialog" aria-modal="true" aria-label="Travelling">
  <header class="route">
    <div class="names">
      <span>{travel.from}</span>
      <span class="arrow" aria-hidden="true">→</span>
      <strong>{travel.arrived ? here : travel.to}</strong>
    </div>
    <div
      class="bar"
      role="progressbar"
      aria-valuemin="0"
      aria-valuemax={Consts.StartClicks}
      aria-valuenow={Consts.StartClicks - clicksLeft}
    >
      <div class="fill" style:width="{progress * 100}%"></div>
    </div>
    <span class="dim num clicks">
      {travel.arrived
        ? 'Arrived'
        : clicksLeft > 0
          ? `${multiples(clicksLeft, Strings.DistanceSubunit)} to go`
          : 'Arriving'}
    </span>
  </header>

  <div class="body" bind:this={logEl}>
    {#if travel.encounter}
      <EncounterPanel
        round={travel.encounter}
        dialog={encounter}
        {active}
        finished={travel.arrived}
      />
    {/if}

    <section class="log" aria-live="polite" aria-label="Trip log">
      {#each log as entry (entry.id)}
        <div class="entry {entry.kind}">
          {#if entry.title}<strong>{entry.title}</strong>{/if}
          <span class="pre-line">{entry.text}</span>
        </div>
      {:else}
        <p class="faint">Travelling…</p>
      {/each}
    </section>
  </div>

  {#if travel.arrived}
    <footer class="done">
      <button class="primary" onclick={() => travel.continue()}>Continue to {here}</button>
    </footer>
  {/if}
</div>

<style>
  .travel {
    position: fixed;
    inset: 0;
    z-index: 50;
    display: flex;
    flex-direction: column;
    padding: env(safe-area-inset-top, 0) env(safe-area-inset-right, 0)
      env(safe-area-inset-bottom, 0) env(safe-area-inset-left, 0);
    background: var(--bg);
  }
  .route {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--border);
    background: var(--surface);
  }
  .names {
    display: flex;
    gap: 0.5rem;
    align-items: baseline;
  }
  .arrow {
    color: var(--text-dim);
  }
  .names strong {
    color: var(--accent);
  }
  .bar {
    height: 6px;
    border-radius: 3px;
    background: var(--surface-3);
    overflow: hidden;
  }
  .fill {
    height: 100%;
    background: var(--accent);
    transition: width 0.3s;
  }
  .clicks {
    font-size: 0.8rem;
  }
  .body {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    flex: 1;
    min-height: 0;
    width: 100%;
    max-width: 40rem;
    margin: 0 auto;
    padding: 1rem;
    overflow-y: auto;
  }
  .log {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    font-size: 0.9rem;
  }
  .entry {
    display: flex;
    flex-direction: column;
    padding-left: 0.6rem;
    border-left: 2px solid var(--border);
  }
  .entry.event {
    color: var(--text-dim);
  }
  .entry.story,
  .entry.confirm {
    border-left-color: var(--accent);
  }
  .entry.notice {
    border-left-color: var(--link);
  }
  .done {
    display: flex;
    justify-content: center;
    padding: 0.75rem 1rem calc(0.75rem + env(safe-area-inset-bottom, 0));
    border-top: 1px solid var(--border);
    background: var(--surface);
  }
  .done button {
    width: min(24rem, 100%);
  }
</style>
