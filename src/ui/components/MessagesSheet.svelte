<script lang="ts">
  // Messages shown so far, so a toast that disappeared can be read again.
  import Modal from '../dialogs/Modal.svelte';
  import { ui } from '../web-ui.svelte';

  let { onclose }: { onclose: () => void } = $props();
  const messages = $derived([...ui.messages].reverse());
</script>

<Modal title="Messages" oncancel={onclose}>
  {#if messages.length === 0}
    <p class="dim">No messages yet.</p>
  {:else}
    <ul class="messages">
      {#each messages as message (message.id)}
        <li>
          <strong>{message.title}</strong>
          <p class="dim pre-line">{message.text}</p>
        </li>
      {/each}
    </ul>
  {/if}
  {#snippet actions()}
    <button class="primary" onclick={onclose}>Close</button>
  {/snippet}
</Modal>

<style>
  .messages {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }
</style>
