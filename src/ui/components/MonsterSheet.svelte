<script lang="ts">
  // FormMonster ("Monster.com" cheat): every mercenary and where they are, the
  // quests available now, and the shipyards. Headers sort; systems are links.
  import {
    monsterMercenaries,
    monsterQuests,
    monsterShipyards,
    type MercenarySort,
  } from '../../engine/views';
  import Modal from '../dialogs/Modal.svelte';
  import { app } from '../state.svelte';

  let { onclose }: { onclose: () => void } = $props();
  let mercSort = $state<MercenarySort>('N');
  let questSort = $state<'S' | 'D'>('S');
  let yardSort = $state<'S' | 'D'>('S');

  const view = $derived.by(() => {
    const game = app.game;
    if (!game) return null;
    return {
      mercs: monsterMercenaries(game, mercSort),
      quests: monsterQuests(game, questSort),
      yards: monsterShipyards(game, yardSort),
    };
  });

  function show(systemId: number): void {
    void app.run((game) => {
      game.selectedSystemId = systemId;
    });
    app.tab = 'map';
    onclose();
  }

  const MERC_COLUMNS: [MercenarySort, string][] = [
    ['I', 'ID'],
    ['N', 'Name'],
    ['P', 'Pilot'],
    ['F', 'Fighter'],
    ['T', 'Trader'],
    ['E', 'Engineer'],
    ['S', 'System'],
  ];
</script>

<Modal title="Monster.com" wide>
  {#if view}
    <h3>Mercenaries</h3>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            {#each MERC_COLUMNS as [key, label] (key)}
              <th class:active={mercSort === key}>
                <button class="link" onclick={() => (mercSort = key)}>{label}</button>
              </th>
            {/each}
          </tr>
        </thead>
        <tbody>
          {#each view.mercs as m (m.id)}
            <tr>
              <td class="num">{m.id}</td>
              <td>{m.name}</td>
              <td class="num">{m.pilot}</td>
              <td class="num">{m.fighter}</td>
              <td class="num">{m.trader}</td>
              <td class="num">{m.engineer}</td>
              <td>
                {#if m.systemId !== null}
                  {@const id = m.systemId}
                  <button class="link" onclick={() => show(id)}>{m.where}</button>
                {:else}
                  {m.where}
                {/if}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    {#each [{ title: 'Quests', rows: view.quests, sort: questSort, set: (s: 'S' | 'D') => (questSort = s) }, { title: 'Shipyards', rows: view.yards, sort: yardSort, set: (s: 'S' | 'D') => (yardSort = s) }] as list (list.title)}
      <h3>{list.title}</h3>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th class:active={list.sort === 'S'}>
                <button class="link" onclick={() => list.set('S')}>System</button>
              </th>
              <th class:active={list.sort === 'D'}>
                <button class="link" onclick={() => list.set('D')}>Description</button>
              </th>
            </tr>
          </thead>
          <tbody>
            {#each list.rows as row (row.systemId)}
              <tr>
                <td>
                  <button class="link" onclick={() => show(row.systemId)}>{row.system}</button>
                </td>
                <td>{row.description}</td>
              </tr>
            {:else}
              <tr><td colspan="2" class="dim">None</td></tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/each}
  {/if}
  {#snippet actions()}
    <button class="primary" onclick={onclose}>Close</button>
  {/snippet}
</Modal>

<style>
  .table-wrap {
    overflow-x: auto;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.88rem;
  }
  th,
  td {
    padding: 0.25rem 0.5rem;
    text-align: left;
    white-space: nowrap;
  }
  th button {
    color: var(--text-dim);
    text-decoration: none;
  }
  th.active button {
    color: var(--accent);
  }
  tbody tr:nth-child(odd) {
    background: var(--surface-2);
  }
  td.num {
    text-align: right;
  }
</style>
