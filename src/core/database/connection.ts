import type { Database } from '@/shared/types';
import { SCHEMA_SQL, SCHEMA_VERSION, SEED_SQL } from './schema';

let dbInstance: Database | null = null;
let initPromise: Promise<Database> | null = null;

async function initialiseSchema(db: Database): Promise<void> {
  db.exec(SCHEMA_SQL);

  const currentVersion =
    (db.selectValue('SELECT MAX(version) FROM schema_version') as number | null) ?? 0;

  if (currentVersion < SCHEMA_VERSION) {
    db.exec(SEED_SQL);
    db.exec('INSERT INTO schema_version (version) VALUES (?)', { bind: [SCHEMA_VERSION] });
  }
}

export async function getDatabase(): Promise<Database> {
  if (dbInstance) return dbInstance;
  if (initPromise) return initPromise;

  initPromise = (async (): Promise<Database> => {
    const sqlite3InitModule = (
      await import('@sqlite.org/sqlite-wasm')
    ).default as (opts: { print: (s: string) => void; printErr: (s: string) => void }) => Promise<{
      oo1: {
        OpfsDb: new (path: string) => Database;
        DB: new () => Database;
      };
      'opfs'?: unknown;
    }>;

    const sqlite3 = await sqlite3InitModule({
      print: () => undefined,
      printErr: (msg) => console.error('[SQLite]', msg),
    });

    let db: Database;

    if ('opfs' in sqlite3) {
      db = new sqlite3.oo1.OpfsDb('/just-bloom-spa.db');
    } else {
      console.warn('[DB] OPFS unavailable — using in-memory DB. Data will not persist.');
      db = new sqlite3.oo1.DB();
    }

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
