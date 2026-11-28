<script lang="ts">
  // One SVG chart for both of the original's charts. "full" pans and zooms
  // over the whole galaxy (the galactic chart); "mini" is fixed on the current
  // system at about the short-range chart's scale. Tapping a system selects
  // it; tapping a wormhole marker selects the wormhole's destination.
  import { Consts } from '../../engine/data/consts';
  import { Strings } from '../../engine/data/strings';
  import { multiples, stringVars } from '../../engine/format';
  import { distance } from '../../engine/functions';
  import { app } from '../state.svelte';

  interface Props {
    mode: 'full' | 'mini';
    /** Increment to centre the full map on the selected system. */
    focus?: number;
  }

  let { mode, focus = 0 }: Props = $props();

  const W = Consts.GalaxyWidth;
  const H = Consts.GalaxyHeight;
  const MINI_WIDTH = Consts.MaxRange * 2 + 10;
  const MIN_WIDTH = 16;
  const MAX_WIDTH = W * 1.6;
  /** Screen pixels between a system and its wormhole marker. */
  const WORM_PX = 11;

  let width = $state(0);
  let height = $state(0);

  const map = $derived.by(() => {
    const game = app.game;
    if (!game) return null;
    const cmdr = game.commander;
    const current = cmdr.currentSystem!;
    const wormholes = game.wormholes;
    const tracked = game.trackedSystem;
    return {
      current,
      fuel: cmdr.ship.fuel,
      warpId: game.warpSystem?.id ?? -1,
      wormholeSelected: game.targetWormhole ? game.selectedSystemId : -1,
      trackedId: tracked?.id ?? -1,
      tracked:
        tracked && tracked !== current
          ? {
              system: tracked,
              dist: distance(current, tracked),
              label: game.options.showTrackedRange
                ? stringVars(
                    Strings.ChartDistance,
                    multiples(distance(current, tracked), Strings.DistanceUnit),
                    tracked.name,
                  )
                : null,
            }
          : null,
      systems: game.universe.map((s) => ({
        id: s.id,
        x: s.x,
        y: s.y,
        name: s.name,
        visited: s.visited,
        inRange: s.destOk,
        wormhole: wormholes.includes(s.id),
      })),
      links: wormholes.map((from, i) => {
        const a = game.universe[from]!;
        const b = game.universe[wormholes[(i + 1) % wormholes.length]!]!;
        return { from, x1: a.x, y1: a.y, x2: b.x, y2: b.y };
      }),
    };
  });

  // The full map's view: centre and width in galaxy units.
  let cx = $state(W / 2);
  let cy = $state(H / 2);
  let viewWidth = $state(Consts.MaxRange * 3.2);

  // Re-centre on the current system when it changes (after a warp).
  let centredOn = -1;
  $effect(() => {
    const id = map?.current.id ?? -1;
    if (id !== centredOn && map) {
      centredOn = id;
      cx = map.current.x;
      cy = map.current.y;
    }
  });

  // Centre on the selection when asked (search, quest links).
  let lastFocus = 0;
  $effect(() => {
    if (focus !== lastFocus) {
      lastFocus = focus;
      const game = app.game;
      const target = game?.warpSystem;
      if (target) {
        cx = target.x;
        cy = target.y;
      }
    }
  });

  const view = $derived.by(() => {
    const aspect = width > 0 && height > 0 ? height / width : H / W;
    if (mode === 'mini' && map) {
      // Fit the short-range area in whichever dimension is smaller.
      const w = aspect < 1 ? MINI_WIDTH / aspect : MINI_WIDTH;
      const h = w * aspect;
      return { x: map.current.x - w / 2, y: map.current.y - h / 2, w, h };
    }
    const w = viewWidth;
    const h = w * aspect;
    return { x: cx - w / 2, y: cy - h / 2, w, h };
  });

  /** Galaxy units per screen pixel. */
  const k = $derived(width > 0 ? view.w / width : 1);
  const showAllNames = $derived(k < 0.3);

  function toGalaxy(clientX: number, clientY: number, svg: SVGSVGElement): [number, number] {
    const rect = svg.getBoundingClientRect();
    return [view.x + (clientX - rect.left) * k, view.y + (clientY - rect.top) * k];
  }

  function select(id: number, wormhole: boolean): void {
    void app.run((game) => {
      game.selectedSystemId = id;
      if (wormhole) game.targetWormhole = true;
    });
  }

  function tap(clientX: number, clientY: number, svg: SVGSVGElement): void {
    if (!map) return;
    const [gx, gy] = toGalaxy(clientX, clientY, svg);
    let best: { id: number; wormhole: boolean; d: number } | null = null;
    for (const s of map.systems) {
      const d = Math.hypot(s.x - gx, s.y - gy);
      if (!best || d < best.d) best = { id: s.id, wormhole: false, d };
      if (s.wormhole) {
        const dw = Math.hypot(s.x + WORM_PX * k - gx, s.y - gy);
        if (dw < best.d) best = { id: s.id, wormhole: true, d: dw };
      }
    }
    if (best && best.d <= 16 * k) select(best.id, best.wormhole);
  }

  // Pointer handling: one pointer drags (or taps), two pointers pinch.
  const pointers = new Map<number, { x: number; y: number }>();
  let moved = 0;
  let pinch: { d: number; w: number } | null = null;

  function clampView(): void {
    viewWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, viewWidth));
    cx = Math.max(-10, Math.min(W + 10, cx));
    cy = Math.max(-10, Math.min(H + 10, cy));
  }

  function onpointerdown(e: PointerEvent): void {
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 1) moved = 0;
    if (pointers.size === 2 && mode === 'full') {
      const [a, b] = [...pointers.values()] as [{ x: number; y: number }, { x: number; y: number }];
      pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), w: viewWidth };
    }
  }

  function onpointermove(e: PointerEvent): void {
    const last = pointers.get(e.pointerId);
    if (!last) return;
    const dx = e.clientX - last.x;
    const dy = e.clientY - last.y;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    moved += Math.abs(dx) + Math.abs(dy);
    if (mode !== 'full') return;
    if (pinch && pointers.size === 2) {
      const [a, b] = [...pointers.values()] as [{ x: number; y: number }, { x: number; y: number }];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (d > 0) viewWidth = (pinch.w * pinch.d) / d;
      clampView();
    } else if (pointers.size === 1) {
      cx -= dx * k;
      cy -= dy * k;
      clampView();
    }
  }

  function onpointerup(e: PointerEvent): void {
    const wasSingle = pointers.size === 1;
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinch = null;
    if (wasSingle && moved < 8) tap(e.clientX, e.clientY, e.currentTarget as SVGSVGElement);
  }

  function onwheel(e: WheelEvent): void {
    if (mode !== 'full') return;
    e.preventDefault();
    const svg = e.currentTarget as SVGSVGElement;
    const [gx, gy] = toGalaxy(e.clientX, e.clientY, svg);
    const factor = Math.exp(e.deltaY * 0.0015);
    const next = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, viewWidth * factor));
    const ratio = next / viewWidth;
    // Keep the point under the cursor where it is.
    cx = gx + (cx - gx) * ratio;
    cy = gy + (cy - gy) * ratio;
    viewWidth = next;
    clampView();
  }

  export function zoom(factor: number): void {
    viewWidth *= factor;
    clampView();
  }

  export function recentre(): void {
    if (map) {
      cx = map.current.x;
      cy = map.current.y;
    }
  }

  /** The tracked-system arrow: 25 px from the current system towards it. */
  const arrow = $derived.by(() => {
    if (!map?.tracked || map.tracked.dist === 0) return null;
    const { current } = map;
    const t = map.tracked.system;
    const len = Math.hypot(t.x - current.x, t.y - current.y);
    const ux = (t.x - current.x) / len;
    const uy = (t.y - current.y) / len;
    const tip = 25 * k;
    const side = 4 * k;
    return [
      [current.x + ux * tip, current.y + uy * tip],
      [current.x - uy * side, current.y + ux * side],
      [current.x + uy * side, current.y - ux * side],
    ]
      .map((p) => p.join(','))
      .join(' ');
  });
</script>

<div class="map {mode}" bind:clientWidth={width} bind:clientHeight={height}>
  {#if map && width > 0}
    <svg
      viewBox="{view.x} {view.y} {view.w} {view.h}"
      role="application"
      aria-label={mode === 'full' ? 'Galaxy map' : 'Nearby systems'}
      {onpointerdown}
      {onpointermove}
      {onpointerup}
      onpointercancel={(e) => pointers.delete(e.pointerId)}
      {onwheel}
    >
      <rect class="galaxy" x="0" y="0" width={W} height={H} rx={2 * k} />

      {#if map.fuel > 0}
        <circle
          class="range"
          cx={map.current.x}
          cy={map.current.y}
          r={map.fuel}
          stroke-width={1.5 * k}
          stroke-dasharray="{4 * k} {3 * k}"
        />
      {/if}

      {#each map.links as link (link.from)}
        <line
          class="link"
          class:selected={link.from === map.wormholeSelected}
          x1={link.x1 + WORM_PX * k}
          y1={link.y1}
          x2={link.x2}
          y2={link.y2}
          stroke-width={(link.from === map.wormholeSelected ? 2 : 1) * k}
          stroke-dasharray={link.from === map.wormholeSelected ? undefined : `${3 * k} ${3 * k}`}
        />
      {/each}

      {#if arrow}
        <polygon class="arrow" points={arrow} />
      {/if}

      <!-- Names first, so systems are drawn over them. -->
      {#each map.systems as s (s.id)}
        {#if showAllNames || (mode === 'mini' && s.inRange) || s.id === map.current.id || s.id === map.warpId || s.id === map.trackedId}
          <text
            class="name"
            class:here={s.id === map.current.id}
            class:target={s.id === map.warpId}
            class:out={!s.inRange && s.id !== map.current.id}
            x={s.x}
            y={s.y - 7 * k}
            font-size={11 * k}
            stroke-width={3 * k}
          >
            {s.name}
          </text>
        {/if}
      {/each}

      {#each map.systems as s (s.id)}
        {#if s.id === map.warpId}
          <path
            class="target-mark"
            d="M{s.x - 9 * k} {s.y}h{18 * k}M{s.x} {s.y - 9 * k}v{18 * k}"
            stroke-width={1.5 * k}
          />
        {/if}
        {#if s.id === map.trackedId}
          <path
            class="track-mark"
            d="M{s.x - 6 * k} {s.y - 6 * k}l{12 * k} {12 * k}M{s.x - 6 * k} {s.y + 6 * k}l{12 *
              k} {-12 * k}"
            stroke-width={1.5 * k}
          />
        {/if}
        <circle
          class="system"
          class:visited={s.visited}
          class:in-range={s.inRange}
          cx={s.x}
          cy={s.y}
          r={(mode === 'mini' ? 4 : 3.5) * k}
          stroke-width={1.5 * k}
        />
        {#if s.id === map.current.id}
          <circle class="here-ring" cx={s.x} cy={s.y} r={7.5 * k} stroke-width={2 * k} />
        {/if}
        {#if s.wormhole}
          <circle
            class="wormhole"
            class:selected={s.id === map.wormholeSelected}
            cx={s.x + WORM_PX * k}
            cy={s.y}
            r={3 * k}
            stroke-width={1.5 * k}
          />
        {/if}
      {/each}
    </svg>
    {#if mode === 'mini' && map.tracked?.label}
      <p class="tracked-label">{map.tracked.label}</p>
    {/if}
  {/if}
</div>

<style>
  .map {
    position: relative;
    flex: 1;
    min-height: 0;
    overflow: hidden;
    background: radial-gradient(ellipse at center, var(--map-glow) 0%, var(--map-bg) 75%);
    user-select: none;
  }
  .map.mini {
    height: 11rem;
    flex: none;
  }
  svg {
    display: block;
    width: 100%;
    height: 100%;
    touch-action: none;
    cursor: pointer;
  }
  .full svg {
    cursor: grab;
  }
  .galaxy {
    fill: var(--map-galaxy);
  }
  .range {
    fill: var(--map-range-fill);
    stroke: var(--map-range);
  }
  .link {
    stroke: var(--wormhole);
    opacity: 0.35;
  }
  .link.selected {
    opacity: 1;
  }
  .arrow {
    fill: var(--map-arrow);
  }
  .name {
    fill: var(--text-dim);
    stroke: var(--map-bg);
    paint-order: stroke;
    text-anchor: middle;
    pointer-events: none;
  }
  .name.out {
    fill: var(--text-faint);
  }
  .name.here {
    fill: var(--accent);
    font-weight: 700;
  }
  .name.target {
    fill: var(--text);
    font-weight: 700;
  }
  .system {
    fill: var(--map-bg);
    stroke: var(--map-system);
  }
  .system.visited {
    fill: var(--map-system);
  }
  .system.in-range {
    stroke: var(--map-system-near);
  }
  .system.in-range.visited {
    fill: var(--map-system-near);
  }
  .here-ring {
    fill: none;
    stroke: var(--accent);
  }
  .target-mark {
    stroke: var(--text);
  }
  .track-mark {
    stroke: var(--map-arrow);
  }
  .wormhole {
    fill: var(--map-bg);
    stroke: var(--wormhole);
  }
  .wormhole.selected {
    fill: var(--wormhole);
  }
  .tracked-label {
    position: absolute;
    left: 0.5rem;
    bottom: 0.3rem;
    margin: 0;
    font-size: 0.8rem;
    color: var(--text-dim);
    pointer-events: none;
  }
</style>
