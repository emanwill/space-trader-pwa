<script lang="ts">
  // FormOptions. It edits a copy: Ok applies it to the game, Cancel drops it.
  // Without a game only the defaults can be edited (OptionsNoGame).
  import { onMount } from 'svelte';
  import { AlertType } from '../../engine/data/enums';
  import { GameOptions } from '../../engine/model/game-options';
  import Modal from '../dialogs/Modal.svelte';
  import { app } from '../state.svelte';
  import { theme, type ThemeChoice } from '../theme.svelte';
  import { ui } from '../web-ui.svelte';

  let { onclose }: { onclose: () => void } = $props();

  const hasGame = app.game !== null;
  // A plain object mirror of the options, so the checkboxes are reactive.
  let o = $state(snapshot(load()));

  function load(): GameOptions {
    const options = new GameOptions(!hasGame);
    if (hasGame) options.copyValues(app.game!.options);
    return options;
  }

  function snapshot(options: GameOptions) {
    return { ...options };
  }

  function toOptions(): GameOptions {
    const options = new GameOptions(false);
    Object.assign(options, $state.snapshot(o));
    return options;
  }

  onMount(() => {
    if (!hasGame) void ui.alert(AlertType.OptionsNoGame);
  });

  // UpdateContinueAttackFleeing, UpdateIgnoreTradersDealing, UpdateNewsAutoShow.
  $effect(() => {
    if (!o.continuousAttack) o.continuousAttackFleeing = false;
    if (!o.alwaysIgnoreTraders) o.alwaysIgnoreTradeInOrbit = false;
    if (!o.newsAutoPay) o.newsAutoShow = false;
  });

  async function ok(): Promise<void> {
    const options = toOptions();
    await app.task(() => app.session!.setOptions(options));
    onclose();
  }

  async function loadDefaults(): Promise<void> {
    const options = toOptions();
    await app.task(() => app.session!.loadDefaultOptions(options));
    o = snapshot(options);
  }

  async function saveDefaults(): Promise<void> {
    const options = toOptions();
    if (await app.task(() => app.session!.saveDefaultOptions(options)))
      ui.toast('Options', 'Saved as the defaults for new games.');
  }

  const clampEmpty = () =>
    (o.leaveEmpty = Math.max(0, Math.min(99, Math.trunc(o.leaveEmpty || 0))));
</script>

<Modal title="Options" wide oncancel={onclose}>
  <section class="group">
    <h3>Display</h3>
    <label class="number">
      <select
        value={theme.choice}
        onchange={(e) => theme.set((e.currentTarget as HTMLSelectElement).value as ThemeChoice)}
      >
        <option value="system">System</option>
        <option value="dark">Dark</option>
        <option value="light">Light</option>
      </select>
      Theme <span class="faint">(this device; applies at once)</span>
    </label>
  </section>
  <section class="group">
    <h3>Arrival</h3>
    <label>
      <input type="checkbox" bind:checked={o.autoFuel} /> Get full fuel tanks on arrival
    </label>
    <label>
      <input type="checkbox" bind:checked={o.autoRepair} /> Get full hull repairs on arrival
    </label>
    <label><input type="checkbox" bind:checked={o.newsAutoPay} /> Always pay for newspaper</label>
    <label class="sub" class:off={!o.newsAutoPay}>
      <input type="checkbox" bind:checked={o.newsAutoShow} disabled={!o.newsAutoPay} />
      Show newspaper on arrival
    </label>
    <label><input type="checkbox" bind:checked={o.remindLoans} /> Remind about loans</label>
  </section>

  <section class="group">
    <h3>Trading and travel</h3>
    <label>
      <input type="checkbox" bind:checked={o.reserveMoney} /> Reserve money for warp costs
    </label>
    <label class="number">
      <input
        class="num"
        type="number"
        min="0"
        max="99"
        inputmode="numeric"
        bind:value={o.leaveEmpty}
        onchange={clampEmpty}
      />
      Cargo bays to leave empty when buying goods in-system
    </label>
    <label>
      <input type="checkbox" bind:checked={o.showTrackedRange} /> Show range to tracked system
    </label>
    <label><input type="checkbox" bind:checked={o.trackAutoOff} /> Stop tracking on arrival</label>
  </section>

  <section class="group">
    <h3>Encounters</h3>
    <p class="dim">Always ignore when it is safe:</p>
    <div class="row">
      <label><input type="checkbox" bind:checked={o.alwaysIgnorePirates} /> Pirates</label>
      <label><input type="checkbox" bind:checked={o.alwaysIgnorePolice} /> Police</label>
      <label><input type="checkbox" bind:checked={o.alwaysIgnoreTraders} /> Traders</label>
    </div>
    <label class="sub" class:off={!o.alwaysIgnoreTraders}>
      <input
        type="checkbox"
        bind:checked={o.alwaysIgnoreTradeInOrbit}
        disabled={!o.alwaysIgnoreTraders}
      />
      Ignore dealing traders
    </label>
    <label>
      <input type="checkbox" bind:checked={o.continuousAttack} /> Continuous attack and flight
    </label>
    <label class="sub" class:off={!o.continuousAttack}>
      <input
        type="checkbox"
        bind:checked={o.continuousAttackFleeing}
        disabled={!o.continuousAttack}
      />
      Continue attacking fleeing ship
    </label>
    <label>
      <input type="checkbox" bind:checked={o.disableOpponents} /> Attempt to disable opponents when possible
    </label>
  </section>

  <div class="row defaults">
    <button class="small" disabled={app.busy} onclick={loadDefaults}>Load from defaults</button>
    <button class="small" disabled={app.busy} onclick={saveDefaults}>Save as defaults</button>
  </div>

  {#snippet actions()}
    <button onclick={onclose}>Cancel</button>
    <button class="primary" disabled={!hasGame || app.busy} onclick={ok}>Ok</button>
  {/snippet}
</Modal>

<style>
  .group {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }
  label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    min-height: 2rem;
  }
  label input[type='checkbox'] {
    min-height: 0;
    width: 1.15rem;
    height: 1.15rem;
    flex: none;
    accent-color: var(--accent);
  }
  .sub {
    padding-left: 1.6rem;
  }
  .off {
    color: var(--text-faint);
  }
  .number input {
    width: 4.5rem;
    min-height: 2.25rem;
    flex: none;
  }
  .row label {
    min-width: 6rem;
  }
  .defaults {
    padding-top: 0.5rem;
    border-top: 1px solid var(--border);
  }
</style>
