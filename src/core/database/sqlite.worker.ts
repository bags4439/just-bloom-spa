// This file runs inside a Web Worker.
// It initialises SQLite with OPFS and handles messages from the main thread.

type SqlValue = string | number | null | Uint8Array;

interface OO1Db {
  exec(sql: string, opts?: {
    bind?: SqlValue[];
    returnValue?: string;
    resultRows?: SqlValue[][];
    columnNames?: string[];
    callback?: (row: SqlValue[]) => void;
  }): OO1Db;
}

type MessageData =
  | { type: 'exec'; id: number; sql: string; bind?: SqlValue[] }
  | { type: 'selectArrays'; id: number; sql: string; bind?: SqlValue[] }
  | { type: 'selectValue'; id: number; sql: string; bind?: SqlValue[] }
  | { type: 'init'; id: number };

let db: OO1Db | null = null;

async function initDb(): Promise<void> {
  // Dynamic import of sqlite3 wasm module
  const { default: sqlite3InitModule } = await import(
    '@sqlite.org/sqlite-wasm'
  ) as { default: (opts: { print: () => void; printErr: (s: string) => void }) => Promise<unknown> };

  const sqlite3 = await sqlite3InitModule({
    print: () => undefined,
    printErr: (msg: string) => console.error('[SQLite Worker]', msg),
  }) as {
    oo1: {
      OpfsDb: new (path: string) => OO1Db;
      DB: new () => OO1Db;
    };
    opfs?: unknown;
  };

  if ('opfs' in sqlite3) {
    db = new sqlite3.oo1.OpfsDb('/just-bloom-spa.db');
    console.log('[DB Worker] OPFS database opened — data will persist.');
  } else {
    db = new sqlite3.oo1.DB();
    console.warn('[DB Worker] OPFS unavailable — using in-memory DB.');
  }
}

function execSingle(sql: string, bind?: SqlValue[]): void {
  if (!db) throw new Error('Database not initialised');
  // returnValue: 'this' is required — without it SQLite WASM OO1
  // tries to read returnValue from an undefined internal result object.
  db.exec(sql, { bind, returnValue: 'this' });
}

function selectArrays(sql: string, bind?: SqlValue[]): SqlValue[][] {
  if (!db) throw new Error('Database not initialised');
  const resultRows: SqlValue[][] = [];
  db.exec(sql, {
    bind,
    returnValue: 'this',
    callback: (row: SqlValue[]) => {
      resultRows.push([...row]);
    },
  });
  return resultRows;
}

function selectValue(sql: string, bind?: SqlValue[]): SqlValue | null {
  if (!db) throw new Error('Database not initialised');
  const rows: SqlValue[][] = [];
  db.exec(sql, {
    bind,
    returnValue: 'this',
    callback: (row: SqlValue[]) => {
      rows.push([...row]);
    },
  });
  const firstRow = rows[0];
  if (!firstRow || firstRow.length === 0) return null;
  return firstRow[0] ?? null;
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
      execSingle(sql, bind);
      self.postMessage({ id, result: null });
    } else if (type === 'selectArrays') {
      const { sql, bind } = event.data as Extract<MessageData, { type: 'selectArrays' }>;
      const rows = selectArrays(sql, bind);
      self.postMessage({ id, result: rows });
    } else if (type === 'selectValue') {
      const { sql, bind } = event.data as Extract<MessageData, { type: 'selectValue' }>;
      const value = selectValue(sql, bind);
      self.postMessage({ id, result: value });
    } else {
      self.postMessage({ id, error: `Unknown message type` });
    }
  } catch (err) {
    self.postMessage({
      id,
      error: err instanceof Error ? err.message : String(err),
    });
  }
};
