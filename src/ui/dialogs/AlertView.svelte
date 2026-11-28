<script lang="ts">
  import { DialogResult } from '../../engine/data/alerts';
  import { alertImage } from '../images';
  import type { AlertDialog } from '../web-ui.svelte';
  import Modal from './Modal.svelte';

  let { dialog, covered }: { dialog: AlertDialog; covered: boolean } = $props();

  // Escape: the only button, or the one that declines (No, Cancel); questions
  // without one can't be dismissed.
  const cancel = $derived.by(() => {
    if (dialog.buttons.length === 1) return dialog.buttons[0]!.result;
    const decline = dialog.buttons.find(
      (b) => b.result === DialogResult.No || b.result === DialogResult.Cancel,
    );
    return decline?.result ?? null;
  });
</script>

<Modal
  title={dialog.title}
  {covered}
  accent={dialog.alertKind === 'story'}
  oncancel={cancel === null ? undefined : () => dialog.resolve(cancel!)}
>
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
