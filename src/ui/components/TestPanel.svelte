<script lang="ts">
  // FormTest ("Test" cheat): shows any alert with up to three values, then the
  // button chosen; and the text of any special event.
  import { DialogResult } from '../../engine/data/alerts';
  import { AlertType, SpecialEventType } from '../../engine/data/enums';
  import { Consts } from '../../engine/data/consts';
  import Modal from '../dialogs/Modal.svelte';
  import { ui } from '../web-ui.svelte';

  let { onclose }: { onclose: () => void } = $props();

  const alertTypes = Object.values(AlertType).filter((v): v is AlertType => typeof v === 'number');
  const eventTypes = Object.values(SpecialEventType).filter(
    (v): v is SpecialEventType =>
      typeof v === 'number' && v >= SpecialEventType.Artifact && v < SpecialEventType.WildGetsOut,
  );

  let alertType = $state(AlertType.Alert);
  let values = $state(['', '', '']);
  let eventType = $state(SpecialEventType.Artifact);

  async function testAlert(): Promise<void> {
    const result = await ui.alert(alertType, ...values);
    await ui.message('Result', `The result was ${DialogResult[result] ?? result}`);
  }

  async function testEvent(): Promise<void> {
    const event = Consts.SpecialEvents[eventType]!;
    await ui.message(
      event.title,
      event.text,
      event.messageOnly
        ? undefined
        : [
            { text: 'Yes', result: DialogResult.Yes },
            { text: 'No', result: DialogResult.No },
          ],
    );
  }
</script>

<Modal title="Test" oncancel={onclose}>
  <section class="stack">
    <h3>Alert</h3>
    <select bind:value={alertType} aria-label="Alert type">
      {#each alertTypes as type (type)}
        <option value={type}>{AlertType[type]}</option>
      {/each}
    </select>
    {#each values as _, i (i)}
      <input bind:value={values[i]} placeholder="Value {i + 1}" aria-label="Value {i + 1}" />
    {/each}
    <button onclick={testAlert}>Test alert</button>
  </section>
  <section class="stack">
    <h3>Special event</h3>
    <select bind:value={eventType} aria-label="Special event">
      {#each eventTypes as type (type)}
        <option value={type}>{SpecialEventType[type]}</option>
      {/each}
    </select>
    <button onclick={testEvent}>Test special event</button>
  </section>
  {#snippet actions()}
    <button class="primary" onclick={onclose}>Close</button>
  {/snippet}
</Modal>

<style>
  .stack {
    gap: 0.5rem;
  }
</style>
