<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    title?: string;
    /** Hidden behind another dialog. */
    covered?: boolean;
    wide?: boolean;
    children: Snippet;
    actions?: Snippet;
  }

  let { title, covered = false, wide = false, children, actions }: Props = $props();
  const titleId = `dialog-title-${Math.random().toString(36).slice(2)}`;
</script>

<div class="backdrop" class:covered>
  <div
    class="modal"
    class:wide
    role="dialog"
    aria-modal="true"
    aria-labelledby={title ? titleId : undefined}
  >
    {#if title}
      <h2 id={titleId}>{title}</h2>
    {/if}
    <div class="body">
      {@render children()}
    </div>
    {#if actions}
      <div class="actions">
        {@render actions()}
      </div>
    {/if}
  </div>
</div>

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    z-index: 100;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    padding: env(safe-area-inset-top, 0) env(safe-area-inset-right, 0) 0
      env(safe-area-inset-left, 0);
    background: rgb(4 6 14 / 0.7);
  }
  .backdrop.covered {
    visibility: hidden;
  }
  .modal {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    width: 100%;
    max-width: 30rem;
    max-height: 92dvh;
    padding: 1.25rem 1.25rem calc(1.25rem + env(safe-area-inset-bottom, 0));
    border: 1px solid var(--border);
    border-bottom: 0;
    border-radius: var(--radius) var(--radius) 0 0;
    background: var(--surface);
    box-shadow: 0 -8px 32px rgb(0 0 0 / 0.5);
    animation: rise 0.16s ease-out;
  }
  .modal.wide {
    max-width: 40rem;
  }
  .body {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    overflow-y: auto;
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 0.5rem;
  }
  .actions :global(button) {
    flex: 1 1 8rem;
  }
  @media (min-width: 40rem) {
    .backdrop {
      align-items: center;
      padding: 1rem;
    }
    .modal {
      border-bottom: 1px solid var(--border);
      border-radius: var(--radius);
      padding-bottom: 1.25rem;
    }
    .actions :global(button) {
      flex: 0 1 auto;
      min-width: 6rem;
    }
  }
  @keyframes rise {
    from {
      transform: translateY(1.5rem);
      opacity: 0;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .modal {
      animation: none;
    }
  }
</style>
