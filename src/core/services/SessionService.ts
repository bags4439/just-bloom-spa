import { DEFAULT_APP_CONFIG } from '@/config/app.config';
import type { AuditService } from './AuditService';

type SessionEventHandler = () => void;

export class SessionService {
  private timeoutHandle: ReturnType<typeof setTimeout> | null = null;
  private warningHandle: ReturnType<typeof setTimeout> | null = null;
  private onLock: SessionEventHandler = () => undefined;
  private onWarn: SessionEventHandler = () => undefined;
  private timeoutMs: number;
  private warningMs: number;

  constructor(private readonly auditService: AuditService) {
    this.timeoutMs = DEFAULT_APP_CONFIG.sessionTimeoutMinutes * 60 * 1000;
    this.warningMs = DEFAULT_APP_CONFIG.sessionWarningMinutes * 60 * 1000;
  }

  setHandlers(onLock: SessionEventHandler, onWarn: SessionEventHandler): void {
    this.onLock = onLock;
    this.onWarn = onWarn;
  }

  setTimeoutMinutes(minutes: number): void {
    this.timeoutMs = minutes * 60 * 1000;
  }

  start(): void {
    this.reset();
  }

  reset(): void {
    this.clearTimers();
    this.warningHandle = setTimeout(() => {
      this.onWarn();
    }, this.timeoutMs - this.warningMs);

    this.timeoutHandle = setTimeout(() => {
      this.lock();
    }, this.timeoutMs);
  }

  stop(): void {
    this.clearTimers();
  }

  private lock(): void {
    this.clearTimers();
    this.auditService.log({ action: 'SESSION_TIMEOUT' });
    this.onLock();
  }

  private clearTimers(): void {
    if (this.timeoutHandle) clearTimeout(this.timeoutHandle);
    if (this.warningHandle) clearTimeout(this.warningHandle);
    this.timeoutHandle = null;
    this.warningHandle = null;
  }
}
