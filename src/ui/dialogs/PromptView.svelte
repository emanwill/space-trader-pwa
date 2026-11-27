<script lang="ts">
  import type { PromptDialog } from '../web-ui.svelte';
  import Modal from './Modal.svelte';

  let { dialog, covered }: { dialog: PromptDialog; covered: boolean } = $props();
  // The starting value only; the field is edited from there.
  // svelte-ignore state_referenced_locally
  let value = $state(dialog.value);
</script>

<Modal title={dialog.title} {covered}>
  <form
    id="prompt-form"
    onsubmit={(e) => {
      e.preventDefault();
      if (value.trim()) dialog.resolve(value.trim());
    }}
  >
    <label class="stack">
      <span class="dim">{dialog.label}</span>
      <!-- svelte-ignore a11y_autofocus -->
      <input bind:value autofocus maxlength="40" />
    </label>
  </form>
  {#snippet actions()}
    <button onclick={() => dialog.resolve(null)}>Cancel</button>
    <button class="primary" type="submit" form="prompt-form" disabled={!value.trim()}>
      {dialog.confirm}
    </button>
  {/snippet}
</Modal>
