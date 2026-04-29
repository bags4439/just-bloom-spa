/// <reference types="vite/client" />
/// <reference types="@testing-library/jest-dom" />

declare module '@sqlite.org/sqlite-wasm' {
  type SqlValue = string | number | null | Uint8Array;

  interface Sqlite3InitOptions {
    print?: (s: string) => void;
    printErr?: (s: string) => void;
  }

  interface SqliteDatabase {
    exec: (sql: string, options?: { bind?: SqlValue[] }) => SqliteDatabase;
    selectArrays: (sql: string, bind?: SqlValue[]) => SqlValue[][];
    selectValue: (sql: string, bind?: SqlValue[]) => SqlValue | undefined;
    close: () => void;
  }

  interface Sqlite3Module {
    opfs?: unknown;
    oo1: {
      OpfsDb: new (path: string) => SqliteDatabase;
      DB: new () => SqliteDatabase;
    };
  }

  const initSqlite3: (options?: Sqlite3InitOptions) => Promise<Sqlite3Module>;
  export default initSqlite3;
}
