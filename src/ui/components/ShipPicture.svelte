<script lang="ts">
  // A ship drawn as the original's PaintShipImage did: damaged strips from the
  // left as the hull weakens, shielded strips from the right while shields hold.
  import type { Ship } from '../../engine/model/ship';
  import { shipPictureStrips } from '../../engine/views';
  import { shipImage } from '../images';

  let { ship, scale = 2 }: { ship: Ship; scale?: 1 | 2 | 3 } = $props();
  const W = 64;
  const strips = $derived(shipPictureStrips(ship));
</script>

<div class="picture" style:width="{W * scale}px" style:height="{52 * scale}px">
  {#each strips as strip (strip.picture)}
    <img
      class="pixel"
      src={shipImage(ship.imageIndex, strip.picture)}
      width={W * scale}
      height={52 * scale}
      alt=""
      style:clip-path="inset(0 {((W - strip.to) / W) * 100}% 0 {(strip.from / W) * 100}%)"
    />
  {/each}
</div>

<style>
  .picture {
    position: relative;
    flex: none;
  }
  img {
    position: absolute;
    inset: 0;
  }
</style>
