<script lang="ts">
  import type { Ship } from '../../engine/model/ship';
  import { shipImage } from '../images';

  let { ship, label }: { ship: Ship; label: string } = $props();
  const hullPct = $derived(Math.floor((100 * ship.hull) / ship.hullStrength));
  const shieldPct = $derived(
    ship.shieldStrength > 0 ? Math.floor((100 * ship.shieldCharge) / ship.shieldStrength) : null,
  );
  const state = $derived(
    shieldPct !== null && shieldPct > 0
      ? hullPct < 100
        ? 'shields-damaged'
        : 'shields'
      : hullPct < 100
        ? 'damaged'
        : 'normal',
  );
</script>

<figure>
  <img class="pixel" src={shipImage(ship.imageIndex, state)} width="128" height="104" alt="" />
  <figcaption>
    <strong>{label}</strong>
    <span class="dim">{ship.name}</span>
    <span class="num">Hull {hullPct}%</span>
    <span class="num">{shieldPct === null ? 'No shields' : `Shields ${shieldPct}%`}</span>
  </figcaption>
</figure>

<style>
  figure {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
    margin: 0;
    flex: 1;
    min-width: 0;
  }
  figcaption {
    display: flex;
    flex-direction: column;
    align-items: center;
    font-size: 0.9rem;
  }
</style>
