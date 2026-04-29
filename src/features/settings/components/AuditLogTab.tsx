import React, {
  useState,
  useCallback,
  useEffect,
  useRef,
} from 'react';
import { Search, X, ChevronLeft, ChevronRight, Download } from 'lucide-react';

import { Button } from '@/shared/components/ui/Button';
import { Spinner } from '@/shared/components/ui/Spinner';
import { formatDateTime } from '@/shared/utils/formatDate';
import { exportCsv } from '@/shared/utils/exportCsv';
import { useServices } from '@/core/ServiceContainerContext';
import { useUiStore } from '@/stores/uiStore';
import { cn } from '@/shared/utils/cn';
import type { AuditLogEntry, AuditLogFilters } from '../types/audit.types';
import { ACTION_CATEGORY_LABELS } from '../types/audit.types';

// ─── Action badge colour ──────────────────────────────────────────────────────

function getActionColour(action: string): string {
  if (action.includes('LOGIN') || action.includes('LOGOUT') || action.includes('SESSION')) {
    return 'bg-blue-50 text-blue-700';
  }
  if (action.includes('VOIDED') || action.includes('DISABLED') || action.includes('FAILED')) {
    return 'bg-red-50 text-red-700';
  }
  if (action.includes('CREATED') || action.includes('ACTIVATED') || action.includes('ENABLED')) {
    return 'bg-green-50 text-green-700';
  }
  if (action.includes('UPDATED') || action.includes('RESET') || action.includes('CHANGED')) {
    return 'bg-amber-50 text-amber-700';
  }
  return 'bg-cream-dark text-text-secondary';
}

// ─── Detail expander ──────────────────────────────────────────────────────────

const EntryDetail: React.FC<{ entry: AuditLogEntry }> = ({ entry }) => {
  const [expanded, setExpanded] = useState(false);

  const hasDetail =
    entry.metadata !== null ||
    entry.oldValue !== null ||
    entry.newValue !== null ||
    entry.entityId !== null;

  if (!hasDetail) return null;

  return (
    <div className="mt-1">
      <button
        onClick={() => setExpanded((s) => !s)}
        className="text-[10px] font-semibold text-primary hover:text-primary-light transition-colors"
      >
        {expanded ? 'Hide detail ▲' : 'Show detail ▼'}
      </button>
      {expanded && (
        <pre className="mt-1 max-h-40 overflow-auto rounded bg-cream px-3 py-2 text-[10px] text-text-secondary leading-relaxed">
          {JSON.stringify(
            {
              entityType: entry.entityType,
              entityId: entry.entityId,
              metadata: entry.metadata,
              oldValue: entry.oldValue,
              newValue: entry.newValue,
            },
            null,
            2,
          )}
        </pre>
      )}
    </div>
  );
};

// ─── Filter bar ───────────────────────────────────────────────────────────────

interface FilterBarProps {
  filters: AuditLogFilters;
  staff: Array<{ id: string; name: string }>;
  onChange: (partial: Partial<AuditLogFilters>) => void;
}

const DATE_RANGE_LABELS = {
  today: 'Today',
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  all: 'All time',
} as const;

const FilterBar: React.FC<FilterBarProps> = React.memo(
  ({ filters, staff, onChange }) => {
    const [localSearch, setLocalSearch] = useState(filters.search);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleSearch = useCallback(
      (value: string): void => {
        setLocalSearch(value);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(
          () => onChange({ search: value }),
          300,
        );
      },
      [onChange],
    );

    return (
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-border bg-white px-4 py-3">
        {/* Search */}
        <div className="relative" style={{ minWidth: 200, flex: 1 }}>
          <Search
            size={13}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary"
          />
          <input
            value={localSearch}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search actions..."
            className="w-full rounded-md border border-border bg-cream py-2 pl-8 pr-3 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {localSearch && (
            <button
              onClick={() => handleSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Date range */}
        <div className="flex gap-1">
          {(
            Object.keys(DATE_RANGE_LABELS) as Array<
              keyof typeof DATE_RANGE_LABELS
            >
          ).map((range) => (
            <button
              key={range}
              onClick={() => onChange({ dateRange: range })}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-semibold transition-colors',
                filters.dateRange === range
                  ? 'border-primary bg-primary-pale text-primary'
                  : 'border-border bg-white text-text-secondary hover:bg-cream',
              )}
            >
              {DATE_RANGE_LABELS[range]}
            </button>
          ))}
        </div>

        {/* Actor filter */}
        <select
          value={filters.actorId ?? ''}
          onChange={(e) =>
            onChange({ actorId: e.target.value || null })
          }
          className="rounded-md border border-border bg-cream px-3 py-1.5 text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">All users</option>
          {staff.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>

        {/* Category filter */}
        <select
          value={filters.actionCategory ?? ''}
          onChange={(e) =>
            onChange({ actionCategory: e.target.value || null })
          }
          className="rounded-md border border-border bg-cream px-3 py-1.5 text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">All categories</option>
          {ACTION_CATEGORY_LABELS.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>
    );
  },
);
FilterBar.displayName = 'FilterBar';

// ─── Pagination ───────────────────────────────────────────────────────────────

interface PaginationProps {
  page: number;
  total: number;
  pageSize: number;
  onChange: (page: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({
  page,
  total,
  pageSize,
  onChange,
}) => {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = Math.min((page - 1) * pageSize + 1, total);
  const to = Math.min(page * pageSize, total);

  if (total === 0) return null;

  return (
    <div className="flex items-center justify-between border-t border-border px-5 py-3 text-sm">
      <span className="text-text-tertiary text-xs">
        Showing {from}-{to} of {total} entries
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(page - 1)}
          disabled={page <= 1}
          className="flex h-7 w-7 items-center justify-center rounded border border-border bg-white text-text-secondary transition-colors hover:bg-cream disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft size={14} />
        </button>
        <span className="px-2 text-xs text-text-secondary">
          {page} / {totalPages}
        </span>
        <button
          onClick={() => onChange(page + 1)}
          disabled={page >= totalPages}
          className="flex h-7 w-7 items-center justify-center rounded border border-border bg-white text-text-secondary transition-colors hover:bg-cream disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
};

// ─── Main tab ─────────────────────────────────────────────────────────────────

export const AuditLogTab: React.FC = () => {
  const { auditLogService, staffService } = useServices();
  const addToast = useUiStore((s) => s.addToast);

  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [staff, setStaff] = useState<Array<{ id: string; name: string }>>([]);
  const [filters, setFilters] = useState<AuditLogFilters>({
    actorId: null,
    actionCategory: null,
    dateRange: '7d',
    search: '',
  });

  // Load staff list for actor filter
  useEffect(() => {
    void staffService.getAll().then((all) =>
      setStaff(all.map((s) => ({ id: s.id, name: s.name }))),
    );
  }, [staffService]);

  const load = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      const result = await auditLogService.getEntries(filters, page);
      setEntries(result.entries);
      setTotal(result.total);
      setPageSize(result.pageSize);
    } catch (err) {
      addToast({
        variant: 'error',
        message:
          err instanceof Error ? err.message : 'Failed to load audit log',
      });
    } finally {
      setIsLoading(false);
    }
  }, [auditLogService, filters, page, addToast]);

  useEffect(() => { void load(); }, [load]);

  // Reset to page 1 when filters change
  const handleFilterChange = useCallback(
    (partial: Partial<AuditLogFilters>): void => {
      setFilters((prev) => ({ ...prev, ...partial }));
      setPage(1);
    },
    [],
  );

  const handleExport = useCallback((): void => {
    if (entries.length === 0) return;
    exportCsv(
      `audit_log_${new Date().toISOString().slice(0, 10)}`,
      entries.map((e) => ({
        Timestamp: formatDateTime(e.createdAt),
        Actor: e.actorName ?? 'System',
        Action: e.action,
        'Entity type': e.entityType ?? '',
        'Entity ID': e.entityId ?? '',
        Metadata: e.metadata ? JSON.stringify(e.metadata) : '',
      })),
    );
  }, [entries]);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-text-secondary">
          Read-only record of all system activity
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExport}
          leftIcon={<Download size={13} />}
          disabled={entries.length === 0}
        >
          Export CSV
        </Button>
      </div>

      <FilterBar
        filters={filters}
        staff={staff}
        onChange={handleFilterChange}
      />

      <div className="rounded-lg border border-border bg-white overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Spinner size="md" />
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-sm font-medium text-text-primary">
              No audit entries found
            </p>
            <p className="mt-1 text-sm text-text-secondary">
              Try adjusting your filters.
            </p>
          </div>
        ) : (
          <>
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-cream">
                  {[
                    'Timestamp',
                    'Actor',
                    'Action',
                    'Entity',
                    'Detail',
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-text-tertiary"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr
                    key={entry.id}
                    className="border-t border-border align-top"
                  >
                    <td className="px-5 py-3 text-xs text-text-tertiary whitespace-nowrap">
                      {formatDateTime(entry.createdAt)}
                    </td>
                    <td className="px-5 py-3">
                      <p className="text-sm font-medium text-text-primary">
                        {entry.actorName ?? 'System'}
                      </p>
                      {entry.sessionId && (
                        <p className="mt-0.5 font-mono text-[10px] text-text-tertiary">
                          {entry.sessionId.slice(0, 8)}
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={cn(
                          'inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold',
                          getActionColour(entry.action),
                        )}
                      >
                        {entry.action}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs text-text-secondary">
                      {entry.entityType && (
                        <p className="font-medium capitalize">
                          {entry.entityType.replace('_', ' ')}
                        </p>
                      )}
                      {entry.entityId && (
                        <p className="font-mono text-[10px] text-text-tertiary">
                          {entry.entityId.slice(0, 8)}
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <EntryDetail entry={entry} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination
              page={page}
              total={total}
              pageSize={pageSize}
              onChange={setPage}
            />
          </>
        )}
      </div>
    </div>
  );
};
