<script lang="ts">
  import { Consts } from '../../engine/data/consts';
  import { CargoBuyOp, CargoSellOp } from '../../engine/data/enums';
  import { formatMoney } from '../../engine/format';
  import type { QuantityDialog } from '../web-ui.svelte';
  import Modal from './Modal.svelte';

  let { dialog, covered }: { dialog: QuantityDialog; covered: boolean } = $props();
  const request = $derived(dialog.request);
  // The starting value only; the field is edited from there.
  // svelte-ignore state_referenced_locally
  let amount = $state(dialog.request.max);

  const verb = $derived.by(() => {
    if (request.kind === 'buy') return request.op === CargoBuyOp.Plunder ? 'Take' : 'Buy';
    switch (request.op) {
      case CargoSellOp.Dump:
        return 'Dump';
      case CargoSellOp.Jettison:
        return 'Jettison';
      default:
        return 'Sell';
    }
  });
  const name = $derived(Consts.TradeItems[request.tradeItem]!.name);
  const clamped = $derived(Math.max(0, Math.min(request.max, Math.trunc(amount || 0))));
  const limit = $derived(
    request.unitPrice !== 0
      ? `Up to ${request.max} at ${formatMoney(Math.abs(request.unitPrice))} each.`
      : `Up to ${request.max}.`,
  );
  const total = $derived(clamped * Math.abs(request.unitPrice));
</script>

<Modal title="{verb} {name}" {covered} oncancel={() => dialog.resolve(0)}>
  <p class="dim">{limit}</p>
  <div class="row">
    <input
      class="num qty"
      type="number"
      inputmode="numeric"
      min="0"
      max={request.max}
      bind:value={amount}
      aria-label="Quantity"
    />
    <button class="small" onclick={() => (amount = request.max)}>Max</button>
    {#if request.unitPrice !== 0}
      <span class="spacer"></span>
      <span class="num">{request.unitPrice < 0 ? 'Cost' : 'Total'}: {formatMoney(total)}</span>
    {/if}
  </div>
  <input type="range" min="0" max={request.max} bind:value={amount} aria-label="Quantity" />
  {#snippet actions()}
    <button onclick={() => dialog.resolve(0)}>Cancel</button>
    <button class="primary" disabled={clamped === 0} onclick={() => dialog.resolve(clamped)}>
      {verb}
      {clamped}
    </button>
  {/snippet}
</Modal>

<style>
  .qty {
    width: 6rem;
  }
</style>
