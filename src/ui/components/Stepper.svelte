<script lang="ts">
  // A number with − and + buttons. Tapping the number lets you type one.
  interface Props {
    value: number;
    min: number;
    max: number;
    label: string;
    onchange: (value: number) => void;
    /** Shows the value as a signed number (e.g. "+3", "−2"). */
    signed?: boolean;
    disabled?: boolean;
  }

  let { value, min, max, label, onchange, signed = false, disabled = false }: Props = $props();
  let editing = $state(false);
  let draft = $state('');

  function set(next: number): void {
    const clamped = Math.max(min, Math.min(max, Math.trunc(next)));
    if (clamped !== value) onchange(clamped);
  }

  function startEdit(): void {
    draft = String(value);
    editing = true;
  }

  function commit(): void {
    const n = Number(draft);
    if (draft.trim() !== '' && Number.isFinite(n)) set(n);
    editing = false;
  }

  const shown = $derived(signed && value > 0 ? `+${value}` : value < 0 ? `−${-value}` : `${value}`);
</script>

<div class="stepper" role="group" aria-label={label}>
  <button
    class="small step"
    aria-label="Less {label}"
    disabled={disabled || value <= min}
    onclick={() => set(value - 1)}
  >
    −
  </button>
  {#if editing}
    <!-- svelte-ignore a11y_autofocus -->
    <input
      class="num value"
      type="number"
      inputmode="numeric"
      bind:value={draft}
      {min}
      {max}
      autofocus
      aria-label={label}
      onblur={commit}
      onkeydown={(e) => {
        if (e.key === 'Enter') commit();
        if (e.key === 'Escape') editing = false;
      }}
    />
  {:else}
    <button
      class="small ghost num value"
      class:pos={signed && value > 0}
      class:neg={signed && value < 0}
      {disabled}
      aria-label="{label}: {value}. Tap to type a number."
      onclick={startEdit}
    >
      {shown}
    </button>
  {/if}
  <button
    class="small step"
    aria-label="More {label}"
    disabled={disabled || value >= max}
    onclick={() => set(value + 1)}
  >
    +
  </button>
</div>

<style>
  .stepper {
    display: inline-flex;
    align-items: center;
    gap: 0.2rem;
  }
  .step {
    width: 2.25rem;
    padding: 0;
    font-size: 1.1rem;
  }
  .value {
    width: 3.2rem;
    min-height: 2.25rem;
    padding: 0 0.2rem;
    text-align: center;
  }
  .pos {
    color: var(--good);
  }
  .neg {
    color: var(--warn);
  }
</style>
