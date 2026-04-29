import type { Database } from '@/shared/types';
import { SqliteUserRepository } from '@/features/auth/repositories/SqliteUserRepository';
import { SqliteTransactionQueryRepository } from '@/features/transactions/repositories/SqliteTransactionQueryRepository';
import { SqliteDayClosureRepository } from '@/features/reports/repositories/SqliteDayClosureRepository';
import { DashboardService } from '@/features/reports/services/DashboardService';
import { AuditService } from './services/AuditService';
import { AuthService } from './services/AuthService';
import { SessionService } from './services/SessionService';

export class ServiceContainer {
  private static instance: ServiceContainer | null = null;

  public readonly auditService: AuditService;
  public readonly authService: AuthService;
  public readonly sessionService: SessionService;
  public readonly dashboardService: DashboardService;

  private constructor(db: Database) {
    const userRepo = new SqliteUserRepository(db);
    const transactionQueryRepo = new SqliteTransactionQueryRepository(db);
    const dayClosureRepo = new SqliteDayClosureRepository(db);

    this.auditService = new AuditService(db);
    this.authService = new AuthService(userRepo, this.auditService);
    this.sessionService = new SessionService(this.auditService);
    this.dashboardService = new DashboardService(
      transactionQueryRepo,
      dayClosureRepo,
      this.auditService,
    );
  }

  static initialize(db: Database): ServiceContainer {
    if (!ServiceContainer.instance) {
      ServiceContainer.instance = new ServiceContainer(db);
    }
    return ServiceContainer.instance;
  }

  static getInstance(): ServiceContainer {
    if (!ServiceContainer.instance) {
      throw new Error('ServiceContainer has not been initialized');
    }
    return ServiceContainer.instance;
  }

  static reset(): void {
    ServiceContainer.instance = null;
  }
}
