import type { Database, SqlValue } from '@/shared/types';
import { SCHEMA_SQL, SCHEMA_VERSION, SEED_SQL, MIGRATIONS } from './schema';

// Async database proxy that works with the Web Worker.
// BaseRepository methods are all updated to be async-compatible.
export interface AsyncDatabase {
  execAsync(sql: string, bind?: SqlValue[]): Promise<void>;
  selectArraysAsync(sql: string, bind?: SqlValue[]): Promise<SqlValue[][]>;
  selectValueAsync(sql: string, bind?: SqlValue[]): Promise<SqlValue | undefined>;
  close(): void;
}

let dbInstance: AsyncDatabase | null = null;
let initPromise: Promise<AsyncDatabase> | null = null;

async function initialiseSchema(db: AsyncDatabase): Promise<void> {
  await db.execAsync(SCHEMA_SQL);

  const currentVersion =
    (await db.selectValueAsync('SELECT MAX(version) FROM schema_version')) as number | null ?? 0;

  if (currentVersion < 1) {
    await db.execAsync(SEED_SQL);
    await db.execAsync(
      'INSERT INTO schema_version (version) VALUES (?)',
      [1],
    );
  }

  const startFrom = Math.max(currentVersion, 1);
  for (let v = startFrom + 1; v <= SCHEMA_VERSION; v++) {
    const migration = MIGRATIONS[v];
    if (migration) {
      await db.execAsync(migration);
      await db.execAsync(
        'INSERT INTO schema_version (version) VALUES (?)',
        [v],
      );
    }
  }
}

export async function getDatabase(): Promise<AsyncDatabase> {
  if (dbInstance) return dbInstance;
  if (initPromise) return initPromise;

  initPromise = (async (): Promise<AsyncDatabase> => {
    // Create worker — Vite handles the ?worker import
    const worker = new Worker(
      new URL('./sqlite.worker.ts', import.meta.url),
      { type: 'module' },
    );

    // Wait for worker to initialise SQLite
    await new Promise<void>((resolve, reject) => {
      const initId = 0;
      const handler = (event: MessageEvent<{ id: number; result?: unknown; error?: string }>) => {
        if (event.data.id !== initId) return;
        worker.removeEventListener('message', handler);
        if (event.data.error) {
          reject(new Error(event.data.error));
        } else {
          resolve();
        }
      };
      worker.addEventListener('message', handler);
      worker.postMessage({ type: 'init', id: initId });
    });

    // Create async proxy
    const db = createAsyncProxy(worker);
    await initialiseSchema(db);
    dbInstance = db;
    return db;
  })();

  return initPromise;
}

export function resetDatabaseInstance(): void {
  dbInstance = null;
  initPromise = null;
}

function createAsyncProxy(worker: Worker): Database {
  const pending = new Map<
    number,
    { resolve: (val: unknown) => void; reject: (err: Error) => void }
  >();
  let nextId = 1;

  worker.onmessage = (event: MessageEvent<{ id: number; result?: unknown; error?: string }>) => {
    const { id, result, error } = event.data;
    const handler = pending.get(id);
    if (!handler) return;
    pending.delete(id);
    if (error !== undefined) {
      handler.reject(new Error(error));
    } else {
      handler.resolve(result ?? null);
    }
  };

  function call<T>(type: string, sql: string, bind?: SqlValue[]): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const id = nextId++;
      pending.set(id, {
        resolve: (val) => resolve(val as T),
        reject,
      });
      worker.postMessage({ type, id, sql, bind });
    });
  }

  return {
    execAsync: (sql, bind) => call<void>('exec', sql, bind),
    selectArraysAsync: (sql, bind) => call<SqlValue[][]>('selectArrays', sql, bind),
    selectValueAsync: async (sql, bind) => {
      const result = await call<SqlValue | null>('selectValue', sql, bind);
      return result === null ? undefined : result;
    },
    close: () => worker.terminate(),
  };
}
