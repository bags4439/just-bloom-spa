import React, { useState, useCallback, useEffect } from 'react';
import { Plus, Pencil, Power, RotateCcw } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { Badge } from '@/shared/components/ui/Badge';
import { Modal } from '@/shared/components/ui/Modal';
import { Spinner } from '@/shared/components/ui/Spinner';
import { PageHeader } from '@/shared/components/layout/PageHeader';
import { formatCurrencyCompact } from '@/shared/utils/formatCurrency';
import { useServices } from '@/core/ServiceContainerContext';
import { useAuthStore, selectUser, selectSessionId } from '@/stores/authStore';
import { useUiStore } from '@/stores/uiStore';
import { cn } from '@/shared/utils/cn';
import { UserRole } from '@/features/auth/types';
import { usePermission } from '@/features/auth/hooks/usePermission';
import { Permission } from '@/features/auth/types';
import type { SpaService, SpaServiceCategory } from '@/features/spa-services/types';
import type { UserRecord } from '@/features/auth/types';
import type { AppConfig } from '@/config/app.config';
import { ServiceModal } from './ServiceModal';
import { StaffModal } from './StaffModal';
import { ResetPasswordModal } from './ResetPasswordModal';
import { AuditLogTab } from './AuditLogTab';
import { BackupSection } from './BackupSection';

type Tab = 'services' | 'staff' | 'general' | 'audit';

// ─── Services tab ─────────────────────────────────────────────────────────────

const ServicesTab: React.FC = () => {
  const { spaServiceService } = useServices();
  const user = useAuthStore(selectUser);
  const sessionId = useAuthStore(selectSessionId);
  const addToast = useUiStore((s) => s.addToast);

  const [services, setServices] = useState<SpaService[]>([]);
  const [categories, setCategories] = useState<SpaServiceCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<SpaService | null>(null);

  const load = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      const [svcs, cats] = await Promise.all([
        spaServiceService.getAll(),
        spaServiceService.getCategories(),
      ]);
      setServices(svcs);
      setCategories(cats);
    } catch (err) {
      addToast({ variant: 'error', message: err instanceof Error ? err.message : 'Failed to load services' });
    } finally {
      setIsLoading(false);
    }
  }, [spaServiceService, addToast]);

  useEffect(() => { void load(); }, [load]);

  const handleToggle = useCallback(
    async (service: SpaService): Promise<void> => {
      if (!user || !sessionId) return;
      try {
        await spaServiceService.toggleActive(service.id, !service.isActive, user, sessionId);
        addToast({
          variant: 'success',
          message: `${service.name} ${service.isActive ? 'deactivated' : 'activated'}`,
        });
        void load();
      } catch (err) {
        addToast({ variant: 'error', message: err instanceof Error ? err.message : 'Failed to update service' });
      }
    },
    [spaServiceService, user, sessionId, addToast, load],
  );

  // Group by category
  const grouped = services.reduce<Record<string, SpaService[]>>((acc, s) => {
    const cat = s.categoryName;
    if (!acc[cat]) acc[cat] = [];
    acc[cat]!.push(s);
    return acc;
  }, {});

  return (
    <>
      <div className="mb-4 flex justify-between items-center">
        <p className="text-sm text-text-secondary">
          {services.length} service{services.length !== 1 ? 's' : ''} across {Object.keys(grouped).length} categor{Object.keys(grouped).length !== 1 ? 'ies' : 'y'}
        </p>
        <Button onClick={() => { setEditingService(null); setIsModalOpen(true); }} leftIcon={<Plus size={14} />}>
          Add service
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner size="md" /></div>
      ) : services.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-white py-16 text-center">
          <p className="text-sm font-medium text-text-primary">No services yet</p>
          <p className="mt-1 text-sm text-text-secondary">Add your first service to start recording transactions.</p>
          <Button className="mt-4" onClick={() => setIsModalOpen(true)} leftIcon={<Plus size={14} />}>
            Add service
          </Button>
        </div>
      ) : (
        Object.entries(grouped).map(([catName, svcs]) => (
          <div key={catName} className="mb-4 rounded-lg border border-border bg-white overflow-hidden">
            <div className="bg-cream px-5 py-3 border-b border-border">
              <p className="text-xs font-bold uppercase tracking-wider text-text-secondary">{catName}</p>
            </div>
            <table className="w-full border-collapse text-sm">
              <tbody>
                {svcs.map((s) => (
                  <tr key={s.id} className="border-t border-border first:border-0">
                    <td className="px-5 py-3">
                      <div>
                        <p className={cn('font-medium', s.isActive ? 'text-text-primary' : 'text-text-tertiary line-through')}>
                          {s.name}
                        </p>
                        {s.description && (
                          <p className="text-xs text-text-tertiary mt-0.5">{s.description}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3 font-semibold text-primary">
                      {formatCurrencyCompact(s.pricePesewas)}
                    </td>
                    <td className="px-5 py-3">
                      <Badge variant={s.isActive ? 'success' : 'neutral'}>
                        {s.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2 justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => { setEditingService(s); setIsModalOpen(true); }}
                          leftIcon={<Pencil size={12} />}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => void handleToggle(s)}
                          leftIcon={<Power size={12} />}
                        >
                          {s.isActive ? 'Deactivate' : 'Activate'}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))
      )}

      <ServiceModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingService(null); }}
        onSuccess={() => void load()}
        categories={categories}
        existing={editingService}
      />
    </>
  );
};

// ─── Staff tab ────────────────────────────────────────────────────────────────

const StaffTab: React.FC = () => {
  const { staffService } = useServices();
  const user = useAuthStore(selectUser);
  const sessionId = useAuthStore(selectSessionId);
  const addToast = useUiStore((s) => s.addToast);
  const canManageManagers = usePermission(Permission.MANAGE_MANAGERS);

  const [staff, setStaff] = useState<UserRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState<UserRecord | null>(null);

  const load = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      const all = await staffService.getAll();
      setStaff(all);
    } catch (err) {
      addToast({ variant: 'error', message: err instanceof Error ? err.message : 'Failed to load staff' });
    } finally {
      setIsLoading(false);
    }
  }, [staffService, addToast]);

  useEffect(() => { void load(); }, [load]);

  const handleToggleActive = useCallback(
    async (member: UserRecord): Promise<void> => {
      if (!user || !sessionId) return;
      try {
        await staffService.setActive(member.id, !member.isActive, user, sessionId);
        addToast({
          variant: 'success',
          message: `${member.name} ${member.isActive ? 'disabled' : 'enabled'}`,
        });
        void load();
      } catch (err) {
        addToast({ variant: 'error', message: err instanceof Error ? err.message : 'Failed to update account' });
      }
    },
    [staffService, user, sessionId, addToast, load],
  );

  const isCurrentUser = (member: UserRecord): boolean => member.id === user?.id;

  const canActOn = (member: UserRecord): boolean => {
    if (isCurrentUser(member)) return false;
    if (member.role === UserRole.OWNER) return false;
    if (member.role === UserRole.MANAGER && !canManageManagers) return false;
    return true;
  };

  const roleVariant = (role: string) => {
    if (role === UserRole.OWNER) return 'info';
    if (role === UserRole.MANAGER) return 'warning';
    return 'neutral';
  };

  return (
    <>
      <div className="mb-4 flex justify-between items-center">
        <p className="text-sm text-text-secondary">
          {staff.length} account{staff.length !== 1 ? 's' : ''}
        </p>
        <Button onClick={() => setIsCreateOpen(true)} leftIcon={<Plus size={14} />}>
          Add staff
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner size="md" /></div>
      ) : (
        <div className="rounded-lg border border-border bg-white overflow-hidden">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-cream">
                {['Name', 'Username', 'Role', 'Status', ''].map((h) => (
                  <th key={h} className="px-5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-text-tertiary">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {staff.map((member) => (
                <tr key={member.id} className="border-t border-border" style={{ opacity: member.isActive ? 1 : 0.6 }}>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-pale text-sm font-bold text-primary">
                        {member.name[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-text-primary">{member.name}</p>
                        {isCurrentUser(member) && (
                          <p className="text-[10px] text-text-tertiary">You</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 font-mono text-xs text-text-secondary">{member.username}</td>
                  <td className="px-5 py-3">
                    <Badge variant={roleVariant(member.role) as 'info' | 'warning' | 'neutral'}>
                      {member.role}
                    </Badge>
                  </td>
                  <td className="px-5 py-3">
                    <Badge variant={member.isActive ? 'success' : 'danger'}>
                      {member.isActive ? 'Active' : 'Disabled'}
                    </Badge>
                    {member.mustChangePassword && member.isActive && (
                      <span className="ml-2 text-[10px] text-amber-600 font-semibold">
                        ⚠ Password change required
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    {canActOn(member) && (
                      <div className="flex items-center gap-2 justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setResetTarget(member)}
                          leftIcon={<RotateCcw size={12} />}
                        >
                          Reset password
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => void handleToggleActive(member)}
                          leftIcon={<Power size={12} />}
                        >
                          {member.isActive ? 'Disable' : 'Enable'}
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <StaffModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={() => void load()}
      />

      {resetTarget && (
        <ResetPasswordModal
          isOpen={true}
          onClose={() => setResetTarget(null)}
          onSuccess={() => { void load(); setResetTarget(null); }}
          targetUser={resetTarget}
        />
      )}
    </>
  );
};

// ─── General tab ──────────────────────────────────────────────────────────────

const sessionSchema = z.object({
  minutes: z.string().refine(
    (v) => !isNaN(parseInt(v)) && parseInt(v) >= 1 && parseInt(v) <= 120,
    { message: 'Enter a value between 1 and 120 minutes' },
  ),
});

const receiptSchema = z.object({
  receiptSpaName: z.string().min(1, 'Required'),
  receiptTagline: z.string().max(100),
  receiptAddress: z.string().min(1, 'Required'),
  receiptPhone: z.string().min(1, 'Required'),
});

const GeneralTab: React.FC = () => {
  const { settingsService, sessionService } = useServices();
  const user = useAuthStore(selectUser);
  const addToast = useUiStore((s) => s.addToast);
  const setReceiptConfig = useUiStore((s) => s.setReceiptConfig);

  const [config, setConfig] = useState<AppConfig | null>(null);
  const [sessionModalOpen, setSessionModalOpen] = useState(false);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);

  const loadConfig = useCallback((): void => {
    void settingsService.getAll().then(setConfig);
  }, [settingsService]);

  useEffect(() => { loadConfig(); }, [loadConfig]);

  const {
    register: regSession, handleSubmit: handleSession,
    formState: { errors: sessionErrors, isSubmitting: sessionSubmitting }, reset: resetSession,
  } = useForm({ resolver: zodResolver(sessionSchema) });

  const {
    register: regReceipt, handleSubmit: handleReceipt,
    formState: { errors: receiptErrors, isSubmitting: receiptSubmitting }, reset: resetReceipt,
  } = useForm({ resolver: zodResolver(receiptSchema) });

  useEffect(() => {
    if (config && sessionModalOpen) {
      resetSession({ minutes: String(config.sessionTimeoutMinutes) });
    }
  }, [config, sessionModalOpen, resetSession]);

  useEffect(() => {
    if (config && receiptModalOpen) {
      resetReceipt({
        receiptSpaName: config.receiptSpaName,
        receiptTagline: config.receiptTagline,
        receiptAddress: config.receiptAddress,
        receiptPhone: config.receiptPhone,
      });
    }
  }, [config, receiptModalOpen, resetReceipt]);

  const onSessionSubmit = useCallback(
    async (data: { minutes: string }): Promise<void> => {
      if (!user) return;
      settingsService.updateSessionTimeout(parseInt(data.minutes), user.id);
      sessionService.setTimeoutMinutes(parseInt(data.minutes));
      addToast({ variant: 'success', message: 'Session timeout updated' });
      loadConfig();
      setSessionModalOpen(false);
    },
    [settingsService, sessionService, user, addToast, loadConfig],
  );

  const onReceiptSubmit = useCallback(
    async (data: z.infer<typeof receiptSchema>): Promise<void> => {
      if (!user) return;
      settingsService.updateReceiptConfig(data, user.id);
      setReceiptConfig({
        spaName: data.receiptSpaName,
        tagline: data.receiptTagline,
        address: data.receiptAddress,
        phone: data.receiptPhone,
      });
      addToast({ variant: 'success', message: 'Receipt settings updated' });
      loadConfig();
      setReceiptModalOpen(false);
    },
    [settingsService, user, addToast, loadConfig, setReceiptConfig],
  );

  if (!config) {
    return <div className="flex justify-center py-16"><Spinner size="md" /></div>;
  }

  const settingRows = [
    {
      label: 'Session timeout',
      description: 'Screen locks after this many minutes of inactivity',
      value: `${config.sessionTimeoutMinutes} minutes`,
      onEdit: () => setSessionModalOpen(true),
    },
    {
      label: 'Loyalty points rate',
      description: 'Points earned per GHS spent by a customer',
      value: `1 point per GHS ${config.loyaltyPointsPerGhs}`,
      onEdit: null,
    },
    {
      label: 'Receipt spa name',
      description: 'Shown at the top of every printed receipt',
      value: config.receiptSpaName,
      onEdit: () => setReceiptModalOpen(true),
    },
    {
      label: 'Receipt tagline',
      description: 'Tagline shown on receipts',
      value: config.receiptTagline,
      onEdit: null,
    },
    {
      label: 'Receipt address',
      description: 'Spa address shown on receipts',
      value: config.receiptAddress,
      onEdit: null,
    },
    {
      label: 'Receipt phone',
      description: 'Phone number shown on receipts',
      value: config.receiptPhone,
      onEdit: null,
    },
  ];

  return (
    <>
      <div className="rounded-lg border border-border bg-white overflow-hidden">
        {settingRows.map((row, i) => (
          <div
            key={row.label}
            className={cn(
              'flex items-center justify-between px-5 py-4',
              i > 0 && 'border-t border-border',
            )}
          >
            <div>
              <p className="text-sm font-medium text-text-primary">{row.label}</p>
              <p className="mt-0.5 text-xs text-text-tertiary">{row.description}</p>
            </div>
            <div className="ml-8 flex items-center gap-3 shrink-0">
              <span className="text-sm text-text-secondary">{row.value}</span>
              {row.onEdit && (
                <Button variant="outline" size="sm" onClick={row.onEdit} leftIcon={<Pencil size={12} />}>
                  Edit
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Session timeout modal */}
      <Modal isOpen={sessionModalOpen} onClose={() => setSessionModalOpen(false)} title="Session timeout" size="sm">
        <form onSubmit={(e) => void handleSession(onSessionSubmit)(e)} className="flex flex-col gap-4" noValidate>
          <Input
            label="Timeout (minutes)"
            type="number"
            min="1"
            max="120"
            autoFocus
            hint="Between 1 and 120 minutes"
            error={sessionErrors.minutes?.message as string | undefined}
            {...regSession('minutes')}
          />
          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={() => setSessionModalOpen(false)} className="flex-1 justify-center">Cancel</Button>
            <Button type="submit" isLoading={sessionSubmitting} className="flex-1 justify-center">Save</Button>
          </div>
        </form>
      </Modal>

      {/* Receipt config modal */}
      <Modal isOpen={receiptModalOpen} onClose={() => setReceiptModalOpen(false)} title="Receipt settings" size="sm">
        <form onSubmit={(e) => void handleReceipt(onReceiptSubmit)(e)} className="flex flex-col gap-4" noValidate>
          <Input label="Spa name" autoFocus error={receiptErrors.receiptSpaName?.message as string | undefined} {...regReceipt('receiptSpaName')} />
          <Input label="Tagline" error={receiptErrors.receiptTagline?.message as string | undefined} {...regReceipt('receiptTagline')} />
          <Input label="Address" error={receiptErrors.receiptAddress?.message as string | undefined} {...regReceipt('receiptAddress')} />
          <Input label="Phone" error={receiptErrors.receiptPhone?.message as string | undefined} {...regReceipt('receiptPhone')} />
          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={() => setReceiptModalOpen(false)} className="flex-1 justify-center">Cancel</Button>
            <Button type="submit" isLoading={receiptSubmitting} className="flex-1 justify-center">Save</Button>
          </div>
        </form>
      </Modal>

      <BackupSection />
    </>
  );
};

// ─── Main page ────────────────────────────────────────────────────────────────

const SettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('services');

  const tabs: Array<{ id: Tab; label: string }> = [
    { id: 'services', label: 'Services' },
    { id: 'staff', label: 'Staff' },
    { id: 'general', label: 'General' },
    { id: 'audit', label: 'Audit log' },
  ];

  return (
    <div className="p-9">
      <PageHeader title="Settings" subtitle="Services, staff accounts, and app configuration" />

      <div className="mb-6 flex gap-1 border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'px-5 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px',
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-text-secondary hover:text-text-primary',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'services' && <ServicesTab />}
      {activeTab === 'staff' && <StaffTab />}
      {activeTab === 'general' && <GeneralTab />}
      {activeTab === 'audit' && <AuditLogTab />}
    </div>
  );
};

export default SettingsPage;
