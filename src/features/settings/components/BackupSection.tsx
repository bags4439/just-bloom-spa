import React, { useRef, useState, useCallback } from 'react';
import { Download, Upload, AlertTriangle } from 'lucide-react';

import { Button } from '@/shared/components/ui/Button';
import { Modal } from '@/shared/components/ui/Modal';
import { useServices } from '@/core/ServiceContainerContext';
import { useAuthStore, selectUser, selectSessionId } from '@/stores/authStore';
import { useUiStore } from '@/stores/uiStore';
import { usePermission } from '@/features/auth/hooks/usePermission';
import { Permission } from '@/features/auth/types';

export const BackupSection: React.FC = () => {
  const { backupService } = useServices();
  const user = useAuthStore(selectUser);
  const sessionId = useAuthStore(selectSessionId);
  const addToast = useUiStore((s) => s.addToast);
  const canExport = usePermission(Permission.EXPORT_DATA);
  const canRestore = usePermission(Permission.RESTORE_DATA);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingBackupInfo, setPendingBackupInfo] = useState<string | null>(null);

  // ── Export ──────────────────────────────────────────────────────────────────

  const handleExport = useCallback(async (): Promise<void> => {
    if (!user || !sessionId) return;
    setIsExporting(true);
    try {
      const backup = await backupService.exportBackup(user, sessionId);
      const json = JSON.stringify(backup, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const date = new Date().toISOString().slice(0, 10);
      link.setAttribute('href', url);
      link.setAttribute('download', `just-bloom-spa-backup-${date}.json`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      addToast({ variant: 'success', message: 'Backup exported successfully' });
    } catch (err) {
      addToast({
        variant: 'error',
        message: err instanceof Error ? err.message : 'Export failed',
      });
    } finally {
      setIsExporting(false);
    }
  }, [backupService, user, sessionId, addToast]);

  // ── Restore — step 1: pick file ─────────────────────────────────────────────

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
      const file = e.target.files?.[0] ?? null;
      if (!file) return;

      // Reset input so same file can be re-selected if needed
      if (fileInputRef.current) fileInputRef.current.value = '';

      try {
        const text = await file.text();
        const data: unknown = JSON.parse(text);
        const backup = backupService.validateBackupFile(data);
        const exportedAt = new Date(backup.exportedAt).toLocaleString('en-GB');
        const rowCount = backup.tables.reduce(
          (s, t) => s + t.rows.length,
          0,
        );
        setPendingFile(file);
        setPendingBackupInfo(
          `Exported: ${exportedAt} · ${backup.tables.length} tables · ${rowCount.toLocaleString()} rows`,
        );
        setConfirmOpen(true);
      } catch (err) {
        addToast({
          variant: 'error',
          message: err instanceof Error ? err.message : 'Invalid backup file',
        });
      }
    },
    [backupService, addToast],
  );

  // ── Restore — step 2: confirm ───────────────────────────────────────────────

  const handleConfirmRestore = useCallback(async (): Promise<void> => {
    if (!user || !sessionId || !pendingFile) return;
    setIsRestoring(true);
    setConfirmOpen(false);

    try {
      const text = await pendingFile.text();
      const data: unknown = JSON.parse(text);
      const backup = backupService.validateBackupFile(data);
      await backupService.restoreBackup(backup, user, sessionId);
      setPendingFile(null);
      setPendingBackupInfo(null);
      addToast({
        variant: 'success',
        message: 'Backup restored successfully. Refreshing...',
        duration: 3000,
      });
      // Reload the page after a short delay so the app re-reads the restored DB
      setTimeout(() => window.location.reload(), 2500);
    } catch (err) {
      addToast({
        variant: 'error',
        message: err instanceof Error ? err.message : 'Restore failed',
      });
    } finally {
      setIsRestoring(false);
    }
  }, [backupService, user, sessionId, pendingFile, addToast]);

  const handleCancelRestore = useCallback((): void => {
    setConfirmOpen(false);
    setPendingFile(null);
    setPendingBackupInfo(null);
  }, []);

  if (!canExport && !canRestore) return null;

  return (
    <>
      <div className="mt-6 border-t border-border pt-6">
        <p className="mb-1 text-sm font-semibold text-text-primary">
          Data backup &amp; restore
        </p>
        <p className="mb-4 text-xs text-text-tertiary">
          Since this app runs offline, export a backup regularly to protect your
          data. Store it somewhere safe — a USB drive or cloud storage.
        </p>

        <div className="flex gap-3">
          {canExport && (
            <Button
              variant="outline"
              isLoading={isExporting}
              onClick={() => void handleExport()}
              leftIcon={<Download size={14} />}
            >
              Export backup (JSON)
            </Button>
          )}
          {canRestore && (
            <Button
              variant="outline"
              isLoading={isRestoring}
              onClick={() => fileInputRef.current?.click()}
              leftIcon={<Upload size={14} />}
            >
              Restore from backup
            </Button>
          )}
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          onChange={(e) => void handleFileChange(e)}
          className="sr-only"
          aria-hidden="true"
        />
      </div>

      {/* Confirmation modal */}
      <Modal
        isOpen={confirmOpen}
        onClose={handleCancelRestore}
        title="Restore from backup"
        size="sm"
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-3 rounded-lg bg-amber-50 px-4 py-3">
            <AlertTriangle
              size={18}
              className="mt-0.5 shrink-0 text-amber-600"
            />
            <div>
              <p className="text-sm font-semibold text-amber-800">
                This will replace all current data
              </p>
              <p className="mt-1 text-xs text-amber-700">
                All transactions, customers, staff, and settings will be
                replaced with the backup. This cannot be undone.
              </p>
            </div>
          </div>

          {pendingBackupInfo && (
            <div className="rounded-lg bg-cream px-4 py-3 text-xs text-text-secondary">
              <span className="font-semibold text-text-primary">
                Backup details:
              </span>{' '}
              {pendingBackupInfo}
            </div>
          )}

          <p className="text-sm text-text-secondary">
            Are you sure you want to continue?
          </p>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancelRestore}
              className="flex-1 justify-center"
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => void handleConfirmRestore()}
              className="flex-1 justify-center"
            >
              Yes, restore backup
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};
