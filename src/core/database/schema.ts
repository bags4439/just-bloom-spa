export const SCHEMA_VERSION = 2;

export const SCHEMA_SQL = `
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS schema_version (
    version INTEGER NOT NULL,
    applied_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_by TEXT,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('staff', 'manager', 'owner')),
    is_active INTEGER NOT NULL DEFAULT 1,
    must_change_password INTEGER NOT NULL DEFAULT 1,
    created_by TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    deleted_at TEXT
  );

  CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    loyalty_points INTEGER NOT NULL DEFAULT 0,
    notes TEXT,
    created_by TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    deleted_at TEXT
  );

  CREATE TABLE IF NOT EXISTS service_categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS services (
    id TEXT PRIMARY KEY,
    category_id TEXT NOT NULL REFERENCES service_categories(id),
    name TEXT NOT NULL,
    description TEXT,
    price_pesewas INTEGER NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_by TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    deleted_at TEXT
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    ts TEXT NOT NULL,
    ts_is_manual INTEGER NOT NULL DEFAULT 0,
    type TEXT NOT NULL DEFAULT 'sale' CHECK (type IN ('sale', 'expense')),
    staff_id TEXT NOT NULL REFERENCES users(id),
    customer_id TEXT REFERENCES customers(id),
    gross_pesewas INTEGER NOT NULL DEFAULT 0,
    discount_pesewas INTEGER NOT NULL DEFAULT 0,
    loyalty_redeemed_pesewas INTEGER NOT NULL DEFAULT 0,
    amount_paid_pesewas INTEGER NOT NULL DEFAULT 0,
    change_pesewas INTEGER NOT NULL DEFAULT 0,
    net_pesewas INTEGER NOT NULL DEFAULT 0,
    notes TEXT,
    voided_at TEXT,
    void_reason TEXT,
    voided_by TEXT REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS transaction_items (
    id TEXT PRIMARY KEY,
    transaction_id TEXT NOT NULL REFERENCES transactions(id),
    service_id TEXT NOT NULL REFERENCES services(id),
    price_at_time_pesewas INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS transaction_payments (
    id TEXT PRIMARY KEY,
    transaction_id TEXT NOT NULL REFERENCES transactions(id),
    channel TEXT NOT NULL CHECK (channel IN ('cash', 'momo', 'bank', 'split')),
    amount_pesewas INTEGER NOT NULL,
    reference_no TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS expenses (
    id TEXT PRIMARY KEY,
    ts TEXT NOT NULL,
    staff_id TEXT NOT NULL REFERENCES users(id),
    category TEXT NOT NULL,
    amount_pesewas INTEGER NOT NULL,
    payment_channel TEXT NOT NULL CHECK (payment_channel IN ('cash', 'momo', 'bank')),
    reference_no TEXT,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS other_income (
    id TEXT PRIMARY KEY,
    ts TEXT NOT NULL,
    staff_id TEXT NOT NULL REFERENCES users(id),
    category TEXT NOT NULL,
    amount_pesewas INTEGER NOT NULL,
    payment_channel TEXT NOT NULL CHECK (payment_channel IN ('cash', 'momo', 'bank')),
    reference_no TEXT,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS loyalty_ledger (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL REFERENCES customers(id),
    transaction_id TEXT REFERENCES transactions(id),
    points_delta INTEGER NOT NULL,
    balance_after INTEGER NOT NULL,
    note TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS day_closures (
    id TEXT PRIMARY KEY,
    close_date TEXT NOT NULL UNIQUE,
    closed_by TEXT NOT NULL REFERENCES users(id),
    expected_cash_pesewas INTEGER NOT NULL,
    actual_cash_pesewas INTEGER NOT NULL,
    discrepancy_pesewas INTEGER NOT NULL,
    notes TEXT,
    closed_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    actor_id TEXT,
    session_id TEXT,
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id TEXT,
    old_value TEXT,
    new_value TEXT,
    metadata TEXT,
    ip_hint TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_transactions_staff ON transactions(staff_id);
  CREATE INDEX IF NOT EXISTS idx_transactions_customer ON transactions(customer_id);
  CREATE INDEX IF NOT EXISTS idx_transactions_ts ON transactions(ts);
  CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_id);
  CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
  CREATE INDEX IF NOT EXISTS idx_other_income_ts ON other_income(ts);
  CREATE INDEX IF NOT EXISTS idx_expenses_ts ON expenses(ts);
`;

export const SEED_SQL = `
  INSERT OR IGNORE INTO service_categories (id, name, description, display_order) VALUES
    ('cat-massage', 'Massage', 'Body massage therapies', 1),
    ('cat-facial', 'Facial', 'Facial treatments', 2),
    ('cat-nails', 'Nails', 'Nail care services', 3),
    ('cat-body', 'Body', 'Body treatments', 4);
`;

// Migrations keyed by version number.
// Each migration runs only once when upgrading from a previous version.
export const MIGRATIONS: Record<number, string> = {
  2: `
    CREATE TABLE IF NOT EXISTS other_income (
      id TEXT PRIMARY KEY,
      ts TEXT NOT NULL,
      staff_id TEXT NOT NULL REFERENCES users(id),
      category TEXT NOT NULL,
      amount_pesewas INTEGER NOT NULL,
      payment_channel TEXT NOT NULL CHECK (payment_channel IN ('cash', 'momo', 'bank')),
      reference_no TEXT,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_other_income_ts ON other_income(ts);
  `,
};
