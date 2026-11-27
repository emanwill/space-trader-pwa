// Game lifecycle actions shared by the title screen and the in-game menu.

import { DialogResult } from '../engine/data/alerts';
import { app } from './state.svelte';
import { ui } from './web-ui.svelte';

const YES_NO = [
  { text: 'Yes', result: DialogResult.Yes },
  { text: 'No', result: DialogResult.No },
];

/** Asks before throwing away unsaved progress (GameAbandonConfirm). */
async function confirmAbandon(): Promise<boolean> {
  return (await app.task(() => app.session!.confirmAbandon())) ?? false;
}

export async function startNewGame(): Promise<void> {
  if (await confirmAbandon()) app.screen = 'new-commander';
}

export async function loadSave(id: string): Promise<boolean> {
  if (!(await confirmAbandon())) return false;
  const loaded = await app.task(() => app.session!.loadSave(id));
  if (loaded) enterGame();
  return loaded ?? false;
}

export async function deleteSave(id: string, name: string): Promise<boolean> {
  const answer = await ui.message('Delete save', `Delete the save “${name}”?`, YES_NO);
  if (answer !== DialogResult.Yes) return false;
  await app.task(() => app.session!.deleteSave(id));
  return true;
}

/** Save: to the current slot, or asks for a name the first time. */
export async function save(): Promise<void> {
  const session = app.session!;
  if (session.saveSlotName !== null) {
    if (await app.task(() => session.save()))
      void ui.message('Saved', `Saved as “${session.saveSlotName}”.`);
  } else await saveAs();
}

export async function saveAs(): Promise<void> {
  const session = app.session!;
  const name = await ui.prompt(
    'Save game',
    'Save name',
    session.saveSlotName ?? session.game?.commander.name ?? '',
    'Save',
  );
  if (name === null) return;
  const existing = (await session.listSaves()).some((slot) => slot.name === name);
  if (
    existing &&
    name !== session.saveSlotName &&
    (await ui.message('Replace save', `Replace the save “${name}”?`, YES_NO)) !== DialogResult.Yes
  )
    return;
  if (await app.task(() => session.saveAs(name))) void ui.message('Saved', `Saved as “${name}”.`);
}

export function exportGame(): void {
  const { fileName, text } = app.session!.exportGame();
  download(fileName, text);
}

export async function exportSave(id: string): Promise<void> {
  const file = await app.session!.exportSave(id);
  if (file) download(file.fileName, file.text);
}

export async function importGame(): Promise<void> {
  if (!(await confirmAbandon())) return;
  const file = await pickFile('.json,application/json');
  if (!file) return;
  const text = await file.text();
  if (await app.task(() => app.session!.importSave(text, file.name))) enterGame();
}

export async function retire(): Promise<void> {
  await app.task(() => app.session!.retire());
}

export function enterGame(): void {
  app.tab = 'trade';
  app.screen = 'game';
}

function download(fileName: string, text: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

function pickFile(accept: string): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.addEventListener('change', () => resolve(input.files?.[0] ?? null));
    input.addEventListener('cancel', () => resolve(null));
    input.click();
  });
}
