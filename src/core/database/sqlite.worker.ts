import sqlite3InitModule from '@sqlite.org/sqlite-wasm';

// This file runs inside a Web Worker.
// It initialises SQLite with OPFS and handles messages from the main thread.

type MessageData =
  | { type: 'exec'; id: number; sql: string; bind?: unknown[] }
  | { type: 'selectArrays'; id: number; sql: string; bind?: unknown[] }
  | { type: 'selectValue'; id: number; sql: string; bind?: unknown[] }
  | { type: 'init'; id: number };

let db: {
  exec: (sql: string, opts?: { bind?: unknown[] }) => unknown;
  selectArrays: (sql: string, bind?: unknown[]) => unknown[][];
  selectValue: (sql: string, bind?: unknown[]) => unknown;
} | null = null;

async function initDb(): Promise<void> {
  const sqlite3 = await sqlite3InitModule({
    print: () => undefined,
    printErr: (msg: string) => console.error('[SQLite Worker]', msg),
  });

  if ('opfs' in sqlite3) {
    db = new (sqlite3 as unknown as {
      oo1: {
        OpfsDb: new (path: string) => typeof db;
      };
    }).oo1.OpfsDb('/just-bloom-spa.db');
    console.log('[DB Worker] OPFS database opened — data will persist.');
  } else {
    db = new (sqlite3 as unknown as {
      oo1: {
        DB: new () => typeof db;
      };
    }).oo1.DB();
    console.warn('[DB Worker] OPFS unavailable — using in-memory DB.');
  }
}

self.onmessage = async (event: MessageEvent<MessageData>): Promise<void> => {
  const { type, id } = event.data;

  try {
    if (type === 'init') {
      await initDb();
      self.postMessage({ id, result: 'ok' });
      return;
    }

    if (!db) {
      self.postMessage({ id, error: 'Database not initialised' });
      return;
    }

    if (type === 'exec') {
      const { sql, bind } = event.data as Extract<MessageData, { type: 'exec' }>;
      db.exec(sql, bind ? { bind } : undefined);
      self.postMessage({ id, result: null });
    } else if (type === 'selectArrays') {
      const { sql, bind } = event.data as Extract<MessageData, { type: 'selectArrays' }>;
      const rows = db.selectArrays(sql, bind);
      self.postMessage({ id, result: rows });
    } else if (type === 'selectValue') {
      const { sql, bind } = event.data as Extract<MessageData, { type: 'selectValue' }>;
      const value = db.selectValue(sql, bind);
      self.postMessage({ id, result: value ?? null });
    } else {
      self.postMessage({ id, error: `Unknown message type: ${String(type)}` });
    }
  } catch (err) {
    self.postMessage({
      id,
      error: err instanceof Error ? err.message : String(err),
    });
  }
};
