import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { describe, expect, it } from 'vitest';
import { IndexedDbStore, type KeyValueStore, MemoryStore } from '../../src/app/storage';

const stores: [string, () => Promise<KeyValueStore>][] = [
  ['MemoryStore', () => Promise.resolve(new MemoryStore())],
  ['IndexedDbStore', () => IndexedDbStore.open('test', new IDBFactory())],
];

describe.each(stores)('%s', (_name, open) => {
  it('gets, sets and deletes', async () => {
    const store = await open();
    expect(await store.get('a')).toBeUndefined();
    await store.set('a', { x: [1, 2, null], y: 'z' });
    expect(await store.get('a')).toEqual({ x: [1, 2, null], y: 'z' });
    await store.set('a', 5);
    expect(await store.get('a')).toBe(5);
    await store.delete('a');
    expect(await store.get('a')).toBeUndefined();
    await store.delete('missing');
  });

  it('stores copies, not references', async () => {
    const store = await open();
    const value = { n: 1 };
    await store.set('v', value);
    value.n = 2;
    const read = await store.get<{ n: number }>('v');
    expect(read).toEqual({ n: 1 });
    read!.n = 3;
    expect(await store.get('v')).toEqual({ n: 1 });
  });

  it('lists keys by prefix, in order', async () => {
    const store = await open();
    for (const key of ['save/b', 'autosave', 'save/a', 'saves', 'high-scores'])
      await store.set(key, 1);
    expect(await store.keys('save/')).toEqual(['save/a', 'save/b']);
    expect(await store.keys()).toEqual(['autosave', 'high-scores', 'save/a', 'save/b', 'saves']);
  });
});

describe('IndexedDbStore', () => {
  it('keeps data across reopening the database', async () => {
    const factory = new IDBFactory();
    const first = await IndexedDbStore.open('persist', factory);
    await first.set('k', 'v');
    first.close();
    const second = await IndexedDbStore.open('persist', factory);
    expect(await second.get('k')).toBe('v');
  });
});
