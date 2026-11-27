<script lang="ts">
  // A credit amount with a slider, a number field and an action button: the
  // inline replacement for the original's amount dialogs (fuel, repairs, loans).
  import { formatMoney } from '../../engine/format';

  interface Props {
    label: string;
    max: number;
    /** Amounts move in steps of this many credits (e.g. the price of one unit). */
    step?: number;
    action: string;
    /** Also offer a button for the full amount. */
    allLabel?: string;
    disabled?: boolean;
    /** Start at the full amount (fuel, repairs) rather than zero (loans). */
    startFull?: boolean;
    onconfirm: (amount: number) => void;
  }

  let {
    label,
    max,
    step = 1,
    action,
    allLabel,
    disabled = false,
    startFull = false,
    onconfirm,
  }: Props = $props();
  let amount = $state(0);
  const clamped = $derived(Math.max(0, Math.min(max, Math.trunc(Number(amount) || 0))));

  // Reset when the limit changes (after buying or borrowing).
  let lastMax = -1;
  $effect(() => {
    if (max !== lastMax) {
      lastMax = max;
      amount = startFull ? max : 0;
    }
  });
</script>

<div class="picker">
  <div class="row">
    <input
      class="num amount"
      type="number"
      inputmode="numeric"
      min="0"
      {max}
      {step}
      bind:value={amount}
      aria-label={label}
      disabled={disabled || max === 0}
    />
    <span class="dim">of {formatMoney(max)}</span>
    <span class="spacer"></span>
    <button class="small" disabled={disabled || clamped === 0} onclick={() => onconfirm(clamped)}>
      {action}
    </button>
    {#if allLabel}
      <button class="small primary" disabled={disabled || max === 0} onclick={() => onconfirm(max)}>
        {allLabel}
      </button>
    {/if}
  </div>
  <input
    type="range"
    min="0"
    {max}
    {step}
    bind:value={amount}
    aria-label={label}
    disabled={disabled || max === 0}
  />
</div>

<style>
  .picker {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  .amount {
    width: 7.5rem;
  }
</style>
