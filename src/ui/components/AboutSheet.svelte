<script lang="ts">
  // Form_About, with the port's own credits.
  import Modal from '../dialogs/Modal.svelte';
  import { imageUrl } from '../images';

  let { onclose }: { onclose: () => void } = $props();
  const source = 'https://github.com/emanwill/space-trader-pwa';
</script>

<Modal title="About Space Trader">
  <div class="about">
    <img class="pixel" src={imageUrl('splash')} width="160" height="160" alt="" />
    <div class="stack">
      <p>
        Space Trader for Windows 2.00<br />
        Copyright © 2005 by Jay French
      </p>
      <p>Palm version copyright © 2000–2002 by Pieter Spronck</p>
      <p>Pictures copyright © 2000 by Alexander Lawrence</p>
      <p class="dim">
        This web port keeps the original game's rules and art. Like the original, it is free
        software under the GNU General Public License (version 2 or later).
      </p>
      <p class="dim">
        Source: <a href={source} target="_blank" rel="noopener">{source.replace('https://', '')}</a>
      </p>
    </div>
  </div>
  {#snippet actions()}
    <button class="primary" onclick={onclose}>Close</button>
  {/snippet}
</Modal>

<style>
  .about {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    align-items: flex-start;
  }
  .about img {
    flex: none;
  }
  .stack {
    flex: 1 1 14rem;
    gap: 0.6rem;
  }
  a {
    color: var(--link);
    overflow-wrap: anywhere;
  }
</style>
