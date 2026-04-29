export type SqlValue = string | number | null | Uint8Array;

export interface Database {
  exec(sql: string, options?: { bind?: SqlValue[] }): Database;
  selectArrays(sql: string, bind?: SqlValue[]): SqlValue[][];
  selectValue(sql: string, bind?: SqlValue[]): SqlValue | undefined;
  close(): void;
}

export type Nullable<T> = T | null;

export type AsyncState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: Error };

export type PaginatedResult<T> = {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
};

export interface TimeStamped {
  createdAt: Date;
  updatedAt: Date;
}

export interface SoftDeletable {
  deletedAt: Date | null;
}
