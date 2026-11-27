<script lang="ts">
  // The station: system info, the special event, the newspaper, fuel and
  // repairs, the bank, and crew for hire. (The original's System Info and
  // Dock panels, and its Bank and Personnel windows.)
  import { Consts } from '../../engine/data/consts';
  import { Strings } from '../../engine/data/strings';
  import { formatMoney, formatPercent, multiples, stringVars } from '../../engine/format';
  import * as services from '../../engine/services';
  import AmountPicker from '../components/AmountPicker.svelte';
  import { app } from '../state.svelte';
  import { systemFacts } from '../text';

  const view = $derived.by(() => {
    const game = app.game;
    if (!game) return null;
    const cmdr = game.commander;
    const ship = cmdr.ship;
    const system = cmdr.currentSystem!;
    const event = system.showSpecialButton() ? system.specialEvent : null;
    const tanksEmpty = ship.fuelTanks - ship.fuel;
    const hullLoss = ship.hullStrength - ship.hull;
    const crew = ship.crew.slice(1);
    return {
      system: { name: system.name, facts: systemFacts(system, game) },
      event: event && {
        title: event.title,
        text: event.text,
        price: event.price,
        messageOnly: event.messageOnly,
      },
      fuel: {
        status: stringVars(Strings.DockFuelStatus, multiples(ship.fuel, Strings.DistanceUnit)),
        cost:
          tanksEmpty > 0
            ? stringVars(Strings.DockFuelCost, formatMoney(tanksEmpty * ship.fuelCost))
            : Strings.DockFuelFull,
        max: services.maxFuelPurchase(game),
        step: ship.fuelCost,
        needed: tanksEmpty > 0,
      },
      hull: {
        status: stringVars(
          Strings.DockHullStatus,
          String(Math.floor((100 * ship.hull) / ship.hullStrength)),
        ),
        cost:
          hullLoss > 0
            ? stringVars(Strings.DockHullCost, formatMoney(hullLoss * ship.repairCost))
            : Strings.DockHullFull,
        max: services.maxRepairPurchase(game),
        step: ship.repairCost,
        needed: hullLoss > 0,
      },
      bank: {
        debt: cmdr.debt,
        maxLoan: services.maxLoan(game),
        canBorrow: Math.max(0, services.maxLoan(game) - cmdr.debt),
        canRepay: Math.min(cmdr.debt, cmdr.cash),
        insured: cmdr.insurance,
        shipValue: ship.baseWorth(true),
        noClaim: cmdr.noClaim,
        maxNoClaim: cmdr.noClaim === Consts.MaxNoClaim,
        insuranceCost: game.insuranceCosts,
        escapePod: ship.escapePod,
      },
      crew: crew.map((member, slot) => ({ slot, member })),
      forHire: system.mercenariesForHire,
      quartersFree: ship.freeCrewQuarters,
    };
  });

  const run = (action: Parameters<typeof app.run>[0]) => () => void app.run(action);
</script>

{#if view}
  <div class="screen">
    <section class="card">
      <div class="card-head">
        <h2>{view.system.name}</h2>
        <button class="small" disabled={app.busy} onclick={run((g) => g.showNewspaper())}>
          Newspaper
        </button>
      </div>
      <dl class="facts">
        <dt>Size</dt>
        <dd>{view.system.facts.size}</dd>
        <dt>Tech level</dt>
        <dd>{view.system.facts.tech}</dd>
        <dt>Government</dt>
        <dd>{view.system.facts.government}</dd>
        <dt>Resources</dt>
        <dd>{view.system.facts.resource}</dd>
        <dt>Police</dt>
        <dd>{view.system.facts.police}</dd>
        <dt>Pirates</dt>
        <dd>{view.system.facts.pirates}</dd>
      </dl>
      <p class="dim">This system is currently {view.system.facts.pressure}.</p>
    </section>

    {#if view.event}
      <section class="card event">
        <h2>{view.event.title}</h2>
        <p class="pre-line">{view.event.text}</p>
        <div class="row">
          {#if view.event.price > 0}
            <span class="dim">Costs {formatMoney(view.event.price)}</span>
          {/if}
          <span class="spacer"></span>
          <button
            class="primary"
            disabled={app.busy}
            onclick={run((g) => services.acceptSpecialEvent(g))}
          >
            {view.event.messageOnly ? 'Ok' : 'Accept'}
          </button>
        </div>
      </section>
    {/if}

    <section class="card">
      <h2>Fuel</h2>
      <p>{view.fuel.status} <span class="dim">{view.fuel.cost}</span></p>
      {#if view.fuel.needed}
        <AmountPicker
          label="Credits to spend on fuel"
          max={view.fuel.max}
          step={view.fuel.step}
          action="Buy"
          startFull
          allLabel="Fill up"
          disabled={app.busy}
          onconfirm={(amount) => app.run((g) => services.buyFuel(g, amount))}
        />
      {/if}
    </section>

    <section class="card">
      <h2>Repairs</h2>
      <p>{view.hull.status} <span class="dim">{view.hull.cost}</span></p>
      {#if view.hull.needed}
        <AmountPicker
          label="Credits to spend on repairs"
          max={view.hull.max}
          step={view.hull.step}
          action="Repair"
          startFull
          allLabel="Full repair"
          disabled={app.busy}
          onconfirm={(amount) => app.run((g) => services.buyRepairs(g, amount))}
        />
      {/if}
    </section>

    <section class="card">
      <h2>Bank</h2>
      <dl class="facts">
        <dt>Debt</dt>
        <dd class="num" class:bad={view.bank.debt > 0}>{formatMoney(view.bank.debt)}</dd>
        <dt>Credit limit</dt>
        <dd class="num">{formatMoney(view.bank.maxLoan)}</dd>
      </dl>
      {#if view.bank.canBorrow > 0}
        <h3>Borrow</h3>
        <AmountPicker
          label="Amount to borrow"
          max={view.bank.canBorrow}
          action="Borrow"
          disabled={app.busy}
          onconfirm={(amount) => app.run((g) => services.getLoan(g, amount))}
        />
      {:else}
        <p class="dim">The bank won't lend you more.</p>
      {/if}
      {#if view.bank.debt > 0}
        <h3>Repay</h3>
        <AmountPicker
          label="Amount to repay"
          max={view.bank.canRepay}
          action="Repay"
          disabled={app.busy}
          onconfirm={(amount) => app.run((g) => services.payBackLoan(g, amount))}
        />
      {/if}
    </section>

    <section class="card">
      <h2>Insurance</h2>
      <dl class="facts">
        <dt>Ship value</dt>
        <dd class="num">{formatMoney(view.bank.shipValue)}</dd>
        <dt>No-claim</dt>
        <dd class="num">
          {formatPercent(view.bank.noClaim)}{#if view.bank.maxNoClaim}
            <span class="dim"> (maximum)</span>{/if}
        </dd>
        <dt>Cost</dt>
        <dd class="num">
          {stringVars(Strings.MoneyRateSuffix, formatMoney(view.bank.insuranceCost))}
        </dd>
      </dl>
      {#if !view.bank.insured && !view.bank.escapePod}
        <p class="dim">Insurance needs an escape pod, sold at the shipyard.</p>
      {/if}
      <div class="row">
        <button
          class:primary={!view.bank.insured && view.bank.escapePod}
          class:danger={view.bank.insured}
          disabled={app.busy}
          onclick={run((g) => services.toggleInsurance(g))}
        >
          {stringVars(
            Strings.BankInsuranceButtonText,
            view.bank.insured ? Strings.BankInsuranceButtonStop : Strings.BankInsuranceButtonBuy,
          )}
        </button>
      </div>
    </section>

    <section class="card">
      <h2>Crew</h2>
      {#if view.crew.length === 0}
        <p class="dim">{Strings.PersonnelNoQuarters}</p>
      {:else}
        <ul class="people">
          {#each view.crew as { slot, member } (slot)}
            <li>
              {#if member}
                {@render person(member, true)}
              {:else}
                <span class="faint">{Strings.PersonnelVacancy}</span>
              {/if}
            </li>
          {/each}
        </ul>
      {/if}
      <h3>For hire here</h3>
      {#if view.forHire.length === 0}
        <p class="dim">{Strings.PersonnelNoMercenaries}</p>
      {:else}
        <ul class="people">
          {#each view.forHire as member (member.id)}
            <li>{@render person(member, false)}</li>
          {/each}
        </ul>
      {/if}
    </section>
  </div>
{/if}

{#snippet person(member: import('../../engine/model/crew-member').CrewMember, aboard: boolean)}
  <div class="person">
    <div>
      <strong>{member.name}</strong>
      {#if member.rate > 0}
        <span class="dim num">{stringVars(Strings.MoneyRateSuffix, formatMoney(member.rate))}</span>
      {/if}
      <div class="dim num skills">
        Pilot {member.pilot} · Fighter {member.fighter} · Trader {member.trader} · Engineer {member.engineer}
      </div>
    </div>
    {#if services.canHireOrFire(member)}
      <button
        class="small"
        class:danger={aboard}
        disabled={app.busy}
        onclick={run((g) => services.hireOrFire(g, member))}
      >
        {aboard ? Strings.MercenaryFire : Strings.MercenaryHire}
      </button>
    {/if}
  </div>
{/snippet}

<style>
  .event {
    border-color: var(--accent);
  }
  .people {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .person {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
  }
  .skills {
    font-size: 0.85rem;
  }
</style>
