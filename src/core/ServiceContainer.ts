import type { Database } from '@/shared/types';
import { SqliteUserRepository } from '@/features/auth/repositories/SqliteUserRepository';
import { SqliteTransactionQueryRepository } from '@/features/transactions/repositories/SqliteTransactionQueryRepository';
import { SqliteTransactionRepository } from '@/features/transactions/repositories/SqliteTransactionRepository';
import { SqliteOtherIncomeRepository } from '@/features/transactions/repositories/SqliteOtherIncomeRepository';
import { SqliteExpenseQueryRepository } from '@/features/transactions/repositories/SqliteExpenseQueryRepository';
import { SqliteDayClosureRepository } from '@/features/reports/repositories/SqliteDayClosureRepository';
import { SqliteSpaServiceRepository } from '@/features/spa-services/repositories/SqliteSpaServiceRepository';
import { SqliteCustomerRepository } from '@/features/customers/repositories/SqliteCustomerRepository';
import { DashboardService } from '@/features/reports/services/DashboardService';
import { TransactionService } from '@/features/transactions/services/TransactionService';
import { AuditService } from './services/AuditService';
import { AuthService } from './services/AuthService';
import { SessionService } from './services/SessionService';

export class ServiceContainer {
  private static instance: ServiceContainer | null = null;

  public readonly auditService: AuditService;
  public readonly authService: AuthService;
  public readonly sessionService: SessionService;
  public readonly dashboardService: DashboardService;
  public readonly transactionService: TransactionService;
  public readonly spaServiceRepo: SqliteSpaServiceRepository;
  public readonly customerRepo: SqliteCustomerRepository;
  public readonly transactionQueryRepo: SqliteTransactionQueryRepository;
  public readonly expenseQueryRepo: SqliteExpenseQueryRepository;
  public readonly otherIncomeRepo: SqliteOtherIncomeRepository;

  private constructor(db: Database) {
    const userRepo = new SqliteUserRepository(db);
    const transactionQueryRepo = new SqliteTransactionQueryRepository(db);
    const transactionRepo = new SqliteTransactionRepository(db);
    const dayClosureRepo = new SqliteDayClosureRepository(db);
    const spaServiceRepo = new SqliteSpaServiceRepository(db);
    const customerRepo = new SqliteCustomerRepository(db);
    const otherIncomeRepo = new SqliteOtherIncomeRepository(db);
    const expenseQueryRepo = new SqliteExpenseQueryRepository(db);

    this.auditService = new AuditService(db);
    this.authService = new AuthService(userRepo, this.auditService);
    this.sessionService = new SessionService(this.auditService);
    this.dashboardService = new DashboardService(
      transactionQueryRepo,
      dayClosureRepo,
      this.auditService,
      otherIncomeRepo,
    );
    this.transactionService = new TransactionService(
      transactionRepo,
      customerRepo,
      this.auditService,
      transactionQueryRepo,
      otherIncomeRepo,
    );
    this.spaServiceRepo = spaServiceRepo;
    this.customerRepo = customerRepo;
    this.transactionQueryRepo = transactionQueryRepo;
    this.expenseQueryRepo = expenseQueryRepo;
    this.otherIncomeRepo = otherIncomeRepo;
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
