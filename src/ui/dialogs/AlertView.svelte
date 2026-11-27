<script lang="ts">
  import { alertImage } from '../images';
  import type { AlertDialog } from '../web-ui.svelte';
  import Modal from './Modal.svelte';

  let { dialog, covered }: { dialog: AlertDialog; covered: boolean } = $props();
</script>

<Modal title={dialog.title} {covered}>
  {#if dialog.image !== null}
    <img class="pixel art" src={alertImage(dialog.image)} width="320" height="320" alt="" />
  {/if}
  {#if dialog.message}
    <p class="pre-line">{dialog.message}</p>
  {/if}
  {#snippet actions()}
    {#each dialog.buttons as button, i (button.text)}
      <!-- svelte-ignore a11y_autofocus -->
      <button
        class:primary={i === 0}
        autofocus={i === 0}
        onclick={() => dialog.resolve(button.result)}
      >
        {button.text}
      </button>
    {/each}
  {/snippet}
</Modal>

<style>
  .art {
    align-self: center;
    max-width: 100%;
    height: auto;
  }
</style>
