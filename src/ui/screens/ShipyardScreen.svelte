<script lang="ts">
  // The shipyard: escape pod, ships for sale (Form_ShipList) and equipment
  // (Form_Equipment). The custom ship designer is deferred.
  import { onMount } from 'svelte';
  import { Consts } from '../../engine/data/consts';
  import { EquipmentType } from '../../engine/data/enums';
  import { Strings } from '../../engine/data/strings';
  import { formatMoney, formatNumber, multiples } from '../../engine/format';
  import type { Equipment } from '../../engine/model/equipment';
  import type { Shield } from '../../engine/model/shield';
  import type { Weapon } from '../../engine/model/weapon';
  import * as services from '../../engine/services';
  import { equipmentImage, shipImage } from '../images';
  import { app } from '../state.svelte';

  // FormShipList's constructor warned about tribbles once per visit.
  onMount(() => {
    if (app.game && app.game.commander.ship.tribbles > 0 && !app.game.tribbleMessage)
      void app.run((g) => services.shipListOpened(g));
  });

  function power(item: Equipment): string {
    switch (item.equipmentType) {
      case EquipmentType.Weapon:
        return `Power ${(item as Weapon).power}`;
      case EquipmentType.Shield:
        return `Power ${(item as Shield).power}`;
      default:
        return '';
    }
  }

  const view = $derived.by(() => {
    const game = app.game;
    if (!game) return null;
    const cmdr = game.commander;
    const ship = cmdr.ship;
    const noTech = services.shipyardNoTech(game);
    const prices = services.shipPrices(game);
    const owned = [EquipmentType.Weapon, EquipmentType.Shield, EquipmentType.Gadget].flatMap(
      (type) =>
        ship
          .equipmentByType(type)
          .map((item, slot) => ({ item, slot, type }))
          .filter(
            (e): e is { item: Equipment; slot: number; type: EquipmentType } => e.item !== null,
          ),
    );
    return {
      noTech,
      pod: ship.escapePod
        ? Strings.ShipyardPodInstalled
        : noTech
          ? Strings.ShipyardPodNoSale
          : cmdr.cash < 2000
            ? Strings.ShipyardPodIF
            : Strings.ShipyardPodCost,
      canBuyPod: services.canBuyEscapePod(game),
      hasDesigner: cmdr.currentSystem!.shipyard !== null,
      ships: Consts.ShipSpecs.slice(0, Consts.MaxShip + 1).map((spec) => ({
        spec,
        price: prices[spec.type] ?? null,
        mine: spec.type === ship.type,
        forSale: spec.minimumTechLevel <= cmdr.currentSystem!.techLevel,
      })),
      forSale: noTech ? [] : services.equipmentForSale(),
      owned,
      slots: {
        weapon: ship.freeSlotsWeapon,
        shield: ship.freeSlotsShield,
        gadget: ship.freeSlotsGadget,
      },
      debt: cmdr.debt > 0,
    };
  });

  const description = (item: Equipment) =>
    Strings.EquipmentDescriptions[item.equipmentType]?.[item.subType] ?? '';
</script>

{#if view}
  <div class="screen">
    <section class="card">
      <h2>Escape pod</h2>
      <div class="row">
        <p>{view.pod}</p>
        <span class="spacer"></span>
        {#if view.canBuyPod}
          <button
            class="primary"
            disabled={app.busy}
            onclick={() => app.run((g) => services.buyEscapePod(g))}
          >
            Buy pod
          </button>
        {/if}
      </div>
    </section>

    <section class="stack">
      <div class="card-head">
        <h2>Ships</h2>
        <span class="dim">
          {view.noTech ? Strings.ShipyardShipNoSale : Strings.ShipyardShipForSale}
        </span>
      </div>
      {#if view.hasDesigner}
        <p class="dim">
          This system's shipyard also builds custom ships. The designer isn't available yet.
        </p>
      {/if}
      {#if !view.noTech}
        <p class="faint">Prices include the trade-in value of your current ship and equipment.</p>
        <ul class="ships">
          {#each view.ships as { spec, price, mine, forSale } (spec.type)}
            <li class="card ship" class:mine>
              <img class="pixel" src={shipImage(spec.imageIndex)} width="128" height="104" alt="" />
              <div class="ship-info">
                <div class="card-head">
                  <strong>{spec.name}</strong>
                  <span class="num">
                    {#if mine}
                      <span class="dim">{Strings.ShipBuyGotOne}</span>
                    {:else if !forSale || price === null}
                      <span class="faint">{Strings.CargoBuyNA}</span>
                    {:else}
                      <span class:bad={price > 0 && price > (app.game?.commander.cash ?? 0)}>
                        {formatMoney(price)}
                      </span>
                    {/if}
                  </span>
                </div>
                <dl class="facts small">
                  <dt>Size</dt>
                  <dd>{Strings.Sizes[spec.size]}</dd>
                  <dt>Cargo bays</dt>
                  <dd>{formatNumber(spec.cargoBays)}</dd>
                  <dt>Range</dt>
                  <dd>{multiples(spec.fuelTanks, Strings.DistanceUnit)}</dd>
                  <dt>Hull</dt>
                  <dd>{formatNumber(spec.hullStrength)}</dd>
                  <dt>Slots</dt>
                  <dd>
                    {spec.weaponSlots} weapon · {spec.shieldSlots} shield · {spec.gadgetSlots} gadget
                  </dd>
                  <dt>Crew</dt>
                  <dd>{formatNumber(spec.crewQuarters)}</dd>
                </dl>
                {#if !mine && forSale && price !== null}
                  <div class="row">
                    <span class="spacer"></span>
                    <button
                      class="small"
                      disabled={app.busy}
                      onclick={() => app.run((g) => services.buyShip(g, spec.type))}
                    >
                      Buy
                    </button>
                  </div>
                {/if}
              </div>
            </li>
          {/each}
        </ul>
      {/if}
    </section>

    <section class="stack">
      <div class="card-head">
        <h2>Equipment</h2>
        <span class="dim">
          {view.noTech ? Strings.ShipyardEquipNoSale : Strings.ShipyardEquipForSale}
        </span>
      </div>
      <p class="faint num">
        Free slots: {view.slots.weapon} weapon · {view.slots.shield} shield · {view.slots.gadget} gadget
        {#if view.debt}· You can't buy equipment while in debt.{/if}
      </p>
      <ul class="equipment">
        {#each view.forSale as item (item.imageIndex)}
          <li class="card item">
            <img
              class="pixel"
              src={equipmentImage(item.imageIndex)}
              width="64"
              height="52"
              alt=""
            />
            <div class="item-info">
              <div class="card-head">
                <strong>{item.name}</strong>
                <span class="num">{formatMoney(item.price)}</span>
              </div>
              <p class="dim small">
                {Strings.EquipmentTypes[item.equipmentType]}{power(item) ? ` · ${power(item)}` : ''}
              </p>
              <p class="small">{description(item)}</p>
            </div>
            <button
              class="small"
              disabled={app.busy}
              onclick={() => app.run((g) => services.buyEquipment(g, item))}
            >
              Buy
            </button>
          </li>
        {/each}
      </ul>

      <h3>Installed</h3>
      {#if view.owned.length === 0}
        <p class="dim">No equipment installed.</p>
      {:else}
        <ul class="equipment">
          {#each view.owned as { item, slot, type } (`${type}-${slot}`)}
            <li class="card item">
              <img
                class="pixel"
                src={equipmentImage(item.imageIndex)}
                width="64"
                height="52"
                alt=""
              />
              <div class="item-info">
                <div class="card-head">
                  <strong>{item.name}</strong>
                  <span class="num dim">sells for {formatMoney(item.sellPrice)}</span>
                </div>
                <p class="dim small">
                  {Strings.EquipmentTypes[item.equipmentType]}{power(item)
                    ? ` · ${power(item)}`
                    : ''}
                </p>
              </div>
              <button
                class="small danger"
                disabled={app.busy}
                onclick={() => app.run((g) => services.sellEquipment(g, type, slot))}
              >
                Sell
              </button>
            </li>
          {/each}
        </ul>
      {/if}
    </section>
  </div>
{/if}

<style>
  .ships,
  .equipment {
    display: grid;
    gap: 0.5rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  @media (min-width: 48rem) {
    .ships {
      grid-template-columns: 1fr 1fr;
    }
  }
  .ship {
    flex-direction: row;
    align-items: flex-start;
    gap: 0.75rem;
    padding: 0.75rem;
  }
  .ship.mine {
    border-color: var(--accent);
  }
  .ship-info,
  .item-info {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    flex: 1;
    min-width: 0;
  }
  .ship img {
    width: 64px;
    height: 52px;
  }
  @media (min-width: 30rem) {
    .ship img {
      width: 128px;
      height: 104px;
    }
  }
  .small {
    font-size: 0.85rem;
  }
  .facts.small {
    gap: 0.1rem 0.75rem;
  }
  .item {
    flex-direction: row;
    align-items: center;
    gap: 0.75rem;
    padding: 0.6rem 0.75rem;
  }
</style>
