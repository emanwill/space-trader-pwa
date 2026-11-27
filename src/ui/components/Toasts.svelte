<script lang="ts">
  // Notices: short messages that don't need an answer.
  import { ui } from '../web-ui.svelte';
</script>

<div class="toasts" aria-live="polite">
  {#each ui.toasts as toast (toast.id)}
    <button class="toast" onclick={() => ui.dismissToast(toast.id)}>
      <strong>{toast.title}</strong>
      {#if toast.text}<span>{toast.text}</span>{/if}
    </button>
  {/each}
</div>

<style>
  .toasts {
    position: fixed;
    left: 50%;
    /* At the top, where they don't cover sheet buttons or the trade footer. */
    top: calc(var(--header-h) + env(safe-area-inset-top, 0px) + 0.5rem);
    z-index: 150;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    width: min(28rem, calc(100% - 1.5rem));
    transform: translateX(-50%);
    pointer-events: none;
  }
  .toast {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.1rem;
    min-height: 0;
    padding: 0.6rem 0.9rem;
    border-color: var(--link);
    background: var(--surface-2);
    box-shadow: 0 6px 20px rgb(0 0 0 / 0.45);
    font-weight: 400;
    text-align: left;
    pointer-events: auto;
    animation: pop 0.15s ease-out;
  }
  .toast span {
    color: var(--text-dim);
    font-size: 0.9rem;
  }
  @keyframes pop {
    from {
      transform: translateY(-0.5rem);
      opacity: 0;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .toast {
      animation: none;
    }
  }
</style>
