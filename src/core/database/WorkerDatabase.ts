import type { Database, SqlValue } from '@/shared/types';

// Proxies all DB calls to the SQLite Web Worker.
// Implements the same Database interface so BaseRepository works unchanged.

export class WorkerDatabase implements Database {
  private worker: Worker;
  private pending = new Map<
    number,
    { resolve: (val: unknown) => void; reject: (err: Error) => void }
  >();
  private nextId = 1;

  constructor(worker: Worker) {
    this.worker = worker;
    this.worker.onmessage = (event: MessageEvent<{
      id: number;
      result?: unknown;
      error?: string;
    }>) => {
      const { id, result, error } = event.data;
      const handler = this.pending.get(id);
      if (!handler) return;
      this.pending.delete(id);
      if (error !== undefined) {
        handler.reject(new Error(error));
      } else {
        handler.resolve(result);
      }
    };
  }

  private call<T>(type: string, sql: string, bind?: SqlValue[]): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const id = this.nextId++;
      this.pending.set(id, {
        resolve: (val) => resolve(val as T),
        reject,
      });
      this.worker.postMessage({ type, id, sql, bind });
    });
  }

  execAsync(sql: string, bind?: SqlValue[]): Promise<void> {
    return this.call<null>('exec', sql, bind).then(() => undefined);
  }

  async selectArraysAsync(sql: string, bind?: SqlValue[]): Promise<SqlValue[][]> {
    return this.call<SqlValue[][]>('selectArrays', sql, bind);
  }

  async selectValueAsync(sql: string, bind?: SqlValue[]): Promise<SqlValue | undefined> {
    const result = await this.call<SqlValue | null>('selectValue', sql, bind);
    return result === null ? undefined : result;
  }

  close(): void {
    this.worker.terminate();
  }
}
