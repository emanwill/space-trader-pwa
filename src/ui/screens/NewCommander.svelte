<script lang="ts">
  // FormNewCommander: name, difficulty and 20 skill points (each skill 1 to 10).
  import { Difficulty } from '../../engine/data/enums';
  import { Strings } from '../../engine/data/strings';
  import Stepper from '../components/Stepper.svelte';
  import { app } from '../state.svelte';
  import { imageUrl } from '../images';

  const TOTAL = 20;
  const SKILLS = ['Pilot', 'Fighter', 'Trader', 'Engineer'] as const;
  const HINTS = [
    'Better at fleeing and dodging.',
    'Better at hitting in combat.',
    'Better prices when buying.',
    'Better repairs and shields.',
  ];

  let name = $state('');
  let difficulty = $state(Difficulty.Normal);
  let skills = $state([1, 1, 1, 1]);
  const points = $derived(TOTAL - skills.reduce((a, b) => a + b, 0));
  const ready = $derived(points === 0 && name.trim().length > 0);

  async function start(): Promise<void> {
    if (!ready || !app.session) return;
    const [pilot, fighter, trader, engineer] = skills as [number, number, number, number];
    await app.task(async () => {
      await app.session!.newGame({
        name: name.trim(),
        difficulty,
        pilot,
        fighter,
        trader,
        engineer,
      });
      app.tab = 'trade';
      app.screen = 'game';
    });
  }

  function random(): void {
    const next = [1, 1, 1, 1];
    for (let left = TOTAL - 4; left > 0;) {
      const i = Math.floor(Math.random() * 4);
      if (next[i]! < 10) {
        next[i]!++;
        left--;
      }
    }
    skills = next;
  }
</script>

<main class="screen narrow">
  <header class="row">
    <img class="pixel" src={imageUrl('logo')} width="44" height="42" alt="" />
    <h1>New commander</h1>
  </header>

  <form
    class="stack"
    onsubmit={(e) => {
      e.preventDefault();
      void start();
    }}
  >
    <label class="stack field">
      <span class="dim">Name</span>
      <input bind:value={name} maxlength="30" autocomplete="off" />
    </label>

    <label class="stack field">
      <span class="dim">Difficulty</span>
      <select bind:value={difficulty}>
        {#each Strings.DifficultyLevels as level, i (level)}
          <option value={i}>{level}</option>
        {/each}
      </select>
    </label>

    <section class="card">
      <div class="card-head">
        <h2>Skills</h2>
        <span class:warn={points !== 0} class="num">{points} points left</span>
      </div>
      {#each SKILLS as skill, i (skill)}
        <div class="skill">
          <div>
            <div>{skill}</div>
            <div class="faint hint">{HINTS[i]}</div>
          </div>
          <Stepper
            label={skill}
            value={skills[i]!}
            min={1}
            max={Math.min(10, skills[i]! + points)}
            onchange={(v) => (skills[i] = v)}
          />
        </div>
      {/each}
      <div class="row">
        <button type="button" class="small" onclick={random}>Random</button>
        <button type="button" class="small" onclick={() => (skills = [5, 5, 5, 5])}>Even</button>
      </div>
    </section>

    <div class="row">
      <button type="button" onclick={() => (app.screen = app.game ? 'game' : 'title')}>
        Cancel
      </button>
      <span class="spacer"></span>
      <button class="primary" type="submit" disabled={!ready || app.busy}>Start game</button>
    </div>
  </form>
</main>

<style>
  .narrow {
    max-width: 30rem;
    padding-top: calc(1rem + env(safe-area-inset-top, 0));
  }
  .field {
    gap: 0.3rem;
  }
  .skill {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
  }
  .hint {
    font-size: 0.85rem;
  }
</style>
