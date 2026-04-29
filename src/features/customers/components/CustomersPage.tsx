import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, ChevronRight, X } from 'lucide-react';

import { ROUTES } from '@/config/routes';
import { Button } from '@/shared/components/ui/Button';
import { Spinner } from '@/shared/components/ui/Spinner';
import { PageHeader } from '@/shared/components/layout/PageHeader';
import { formatCurrencyCompact } from '@/shared/utils/formatCurrency';
import { formatDate } from '@/shared/utils/formatDate';
import { useServices } from '@/core/ServiceContainerContext';
import { useUiStore } from '@/stores/uiStore';
import type { CustomerWithStats, Customer } from '../types';
import { CustomerModal } from './CustomerModal';

const CustomerRow: React.FC<{
  customer: CustomerWithStats;
  onClick: () => void;
}> = React.memo(({ customer, onClick }) => (
  <tr
    onClick={onClick}
    className="cursor-pointer border-t border-border transition-colors hover:bg-cream"
  >
    <td className="px-5 py-3">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-pale text-sm font-bold text-primary">
          {customer.name[0]?.toUpperCase()}
        </div>
        <span className="font-medium text-text-primary">{customer.name}</span>
      </div>
    </td>
    <td className="px-5 py-3 text-sm text-text-secondary">{customer.phone}</td>
    <td className="px-5 py-3 text-sm text-text-secondary">{customer.email ?? '—'}</td>
    <td className="px-5 py-3 text-sm font-semibold text-text-primary">
      {customer.visitCount}
    </td>
    <td className="px-5 py-3 text-sm font-semibold text-primary">
      {formatCurrencyCompact(customer.totalSpendPesewas)}
    </td>
    <td className="px-5 py-3">
      <span className="inline-flex items-center rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-semibold text-accent">
        {customer.loyaltyPoints} pts
      </span>
    </td>
    <td className="px-5 py-3 text-sm text-text-secondary">
      {customer.lastVisitTs ? formatDate(customer.lastVisitTs) : '—'}
    </td>
    <td className="px-5 py-3 text-text-tertiary">
      <ChevronRight size={15} />
    </td>
  </tr>
));
CustomerRow.displayName = 'CustomerRow';

const CustomersPage: React.FC = () => {
  const navigate = useNavigate();
  const { customerService } = useServices();
  const addToast = useUiStore((s) => s.addToast);

  const [customers, setCustomers] = useState<CustomerWithStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(
    async (q?: string): Promise<void> => {
      setIsLoading(true);
      try {
        const data = await customerService.getAll(q);
        setCustomers(data);
      } catch (err) {
        addToast({
          variant: 'error',
          message: err instanceof Error ? err.message : 'Failed to load customers',
        });
      } finally {
        setIsLoading(false);
      }
    },
    [customerService, addToast],
  );

  useEffect(() => { void load(); }, [load]);

  const handleSearchChange = useCallback(
    (value: string): void => {
      setSearch(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => void load(value), 300);
    },
    [load],
  );

  const handleCreated = useCallback(
    (_customer: Customer): void => {
      void load(search);
    },
    [load, search],
  );

  const handleRowClick = useCallback(
    (id: string): void => {
      navigate((ROUTES.CUSTOMER_DETAIL as string).replace(':id', id));
    },
    [navigate],
  );

  return (
    <div className="p-9">
      <PageHeader
        title="Customers"
        subtitle={`${customers.length} registered customer${customers.length !== 1 ? 's' : ''}`}
        action={
          <Button
            onClick={() => setIsModalOpen(true)}
            leftIcon={<Plus size={15} />}
          >
            Add customer
          </Button>
        }
      />

      {/* Search */}
      <div className="mb-4 relative max-w-sm">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary"
        />
        <input
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Search by name or phone..."
          className="w-full rounded-lg border border-border bg-white py-2.5 pl-9 pr-9 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary"
        />
        {search && (
          <button
            onClick={() => handleSearchChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border bg-white">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Spinner size="md" />
          </div>
        ) : customers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-sm font-medium text-text-primary">
              {search ? 'No customers found' : 'No customers yet'}
            </p>
            <p className="mt-1 text-sm text-text-secondary">
              {search
                ? 'Try a different search term.'
                : 'Add your first customer to get started.'}
            </p>
            {!search && (
              <Button
                className="mt-4"
                onClick={() => setIsModalOpen(true)}
                leftIcon={<Plus size={14} />}
              >
                Add customer
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-cream">
                  {[
                    'Name', 'Phone', 'Email', 'Visits',
                    'Total spend', 'Loyalty', 'Last visit', '',
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
                {customers.map((c) => (
                  <CustomerRow
                    key={c.id}
                    customer={c}
                    onClick={() => handleRowClick(c.id)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <CustomerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleCreated}
      />
    </div>
  );
};

export default CustomersPage;
