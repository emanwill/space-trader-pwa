<script lang="ts">
  import { ui } from '../web-ui.svelte';
  import AlertView from './AlertView.svelte';
  import CargoTransferView from './CargoTransferView.svelte';
  import PromptView from './PromptView.svelte';
  import QuantityView from './QuantityView.svelte';
</script>

{#each ui.stack as dialog, i (dialog)}
  {@const covered = i < ui.stack.length - 1}
  {#if dialog.kind === 'alert'}
    <AlertView {dialog} {covered} />
  {:else if dialog.kind === 'prompt'}
    <PromptView {dialog} {covered} />
  {:else if dialog.kind === 'quantity'}
    <QuantityView {dialog} {covered} />
  {:else if dialog.kind === 'encounter'}
    <!-- Shown by the travel view. -->
  {:else}
    <CargoTransferView {dialog} {covered} />
  {/if}
{/each}
