// Key-value storage for saves, high scores and options. The app uses
// IndexedDbStore; tests can use MemoryStore. Values must be structured-cloneable
// (the engine's save hashes are plain JSON, so they are).

export interface KeyValueStore {
  get<T>(key: string): Promise<T | undefined>;
  set(key: string, value: unknown): Promise<void>;
  delete(key: string): Promise<void>;
  /** All keys that start with `prefix`, in key order. */
  keys(prefix?: string): Promise<string[]>;
}

export class MemoryStore implements KeyValueStore {
  private readonly data = new Map<string, unknown>();

  get<T>(key: string): Promise<T | undefined> {
    return Promise.resolve(
      this.data.has(key) ? (structuredClone(this.data.get(key)) as T) : undefined,
    );
  }

  set(key: string, value: unknown): Promise<void> {
    this.data.set(key, structuredClone(value));
    return Promise.resolve();
  }

  delete(key: string): Promise<void> {
    this.data.delete(key);
    return Promise.resolve();
  }

  keys(prefix = ''): Promise<string[]> {
    return Promise.resolve([...this.data.keys()].filter((k) => k.startsWith(prefix)).sort());
  }
}

const DB_VERSION = 1;
const STORE = 'kv';

function promisify<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'));
  });
}

/** One object store of string keys in its own database. */
export class IndexedDbStore implements KeyValueStore {
  private constructor(private readonly db: IDBDatabase) {}

  static async open(
    name = 'space-trader',
    factory: IDBFactory = indexedDB,
  ): Promise<IndexedDbStore> {
    const request = factory.open(name, DB_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE);
    };
    const db = await promisify(request);
    // Another tab upgrading the schema: close so it isn't blocked.
    db.onversionchange = () => db.close();
    return new IndexedDbStore(db);
  }

  private async run<T>(
    mode: IDBTransactionMode,
    action: (store: IDBObjectStore) => IDBRequest<T>,
  ): Promise<T> {
    const tx = this.db.transaction(STORE, mode);
    const result = promisify(action(tx.objectStore(STORE)));
    // Resolve only once the write is committed, so a save that "finished" survives a crash.
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('IndexedDB transaction failed'));
      tx.onabort = () => reject(tx.error ?? new Error('IndexedDB transaction aborted'));
    });
    return result;
  }

  async get<T>(key: string): Promise<T | undefined> {
    return (await this.run('readonly', (s) => s.get(key))) as T | undefined;
  }

  async set(key: string, value: unknown): Promise<void> {
    await this.run('readwrite', (s) => s.put(value, key));
  }

  async delete(key: string): Promise<void> {
    await this.run('readwrite', (s) => s.delete(key));
  }

  async keys(prefix = ''): Promise<string[]> {
    const range = prefix === '' ? undefined : IDBKeyRange.bound(prefix, prefix + '\uffff');
    const keys = await this.run('readonly', (s) => s.getAllKeys(range));
    return keys.map(String);
  }

  close(): void {
    this.db.close();
  }
}

/**
 * Asks the browser not to evict this site's storage under pressure. Browsers
 * may grant it silently, prompt, or refuse; saves work either way.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.storage?.persist) return false;
  if (await navigator.storage.persisted()) return true;
  return navigator.storage.persist();
}
