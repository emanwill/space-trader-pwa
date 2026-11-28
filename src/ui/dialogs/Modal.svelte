<script lang="ts">
  // A dialog sheet. Keeps keyboard focus inside while it's on top, gives it
  // back when it closes, and answers Escape with `oncancel`.
  import { onMount, type Snippet } from 'svelte';

  interface Props {
    title?: string;
    /** Hidden behind another dialog. */
    covered?: boolean;
    wide?: boolean;
    /** A story card: an accent edge. */
    accent?: boolean;
    /** What Escape does; omit if the dialog can't be dismissed. */
    oncancel?: () => void;
    children: Snippet;
    actions?: Snippet;
  }

  let {
    title,
    covered = false,
    wide = false,
    accent = false,
    oncancel,
    children,
    actions,
  }: Props = $props();
  const titleId = `dialog-title-${Math.random().toString(36).slice(2)}`;
  let modal: HTMLElement | undefined = $state();

  const FOCUSABLE =
    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea, [tabindex]:not([tabindex="-1"])';

  function focusables(): HTMLElement[] {
    return modal ? [...modal.querySelectorAll<HTMLElement>(FOCUSABLE)] : [];
  }

  onMount(() => {
    const previous = document.activeElement as HTMLElement | null;
    // Let autofocus win; otherwise focus the dialog itself, so screen readers
    // read the title and Tab starts inside.
    queueMicrotask(() => {
      if (modal && !modal.contains(document.activeElement)) modal.focus();
    });
    return () => {
      // After this frame: the screen behind may still be inert right now.
      setTimeout(() => {
        if (previous?.isConnected && !document.querySelector('.backdrop')) previous.focus();
      });
    };
  });

  // Back on top after a dialog over it closed: take focus again.
  $effect(() => {
    if (!covered && modal && !modal.contains(document.activeElement)) modal.focus();
  });

  function onkeydown(event: KeyboardEvent): void {
    if (covered) return;
    if (event.key === 'Escape' && oncancel) {
      event.preventDefault();
      event.stopPropagation();
      oncancel();
    } else if (event.key === 'Tab') {
      const items = focusables();
      if (items.length === 0) return;
      const first = items[0]!;
      const last = items.at(-1)!;
      if (
        event.shiftKey &&
        (document.activeElement === first || document.activeElement === modal)
      ) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  }
</script>

<div class="backdrop" class:covered>
  <div
    class="modal"
    class:wide
    class:accent
    role="dialog"
    aria-modal="true"
    aria-labelledby={title ? titleId : undefined}
    tabindex="-1"
    bind:this={modal}
    {onkeydown}
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
    background: var(--backdrop);
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
    box-shadow: 0 -8px 32px var(--shadow);
    animation: rise 0.16s ease-out;
  }
  .modal:focus {
    outline: none;
  }
  .modal.accent {
    border-top: 3px solid var(--accent);
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
