import type { Database } from '@/shared/types';
import { SqliteUserRepository } from '@/features/auth/repositories/SqliteUserRepository';
import { SqliteTransactionQueryRepository } from '@/features/transactions/repositories/SqliteTransactionQueryRepository';
import { SqliteTransactionRepository } from '@/features/transactions/repositories/SqliteTransactionRepository';
import { SqliteOtherIncomeRepository } from '@/features/transactions/repositories/SqliteOtherIncomeRepository';
import { SqliteExpenseQueryRepository } from '@/features/transactions/repositories/SqliteExpenseQueryRepository';
import { SqliteDayClosureRepository } from '@/features/reports/repositories/SqliteDayClosureRepository';
import { SqliteSpaServiceRepository } from '@/features/spa-services/repositories/SqliteSpaServiceRepository';
import { SqliteCustomerRepository } from '@/features/customers/repositories/SqliteCustomerRepository';
import { SqliteReportRepository } from '@/features/reports/repositories/SqliteReportRepository';
import { SqliteAuditLogRepository } from '@/features/settings/repositories/SqliteAuditLogRepository';
import { DashboardService } from '@/features/reports/services/DashboardService';
import { TransactionService } from '@/features/transactions/services/TransactionService';
import { CustomerService } from '@/features/customers/services/CustomerService';
import { SpaServiceService } from '@/features/spa-services/services/SpaServiceService';
import { StaffService } from '@/features/staff/services/StaffService';
import { SettingsService } from '@/features/settings/services/SettingsService';
import { ReportService } from '@/features/reports/services/ReportService';
import { AuditLogService } from '@/features/settings/services/AuditLogService';
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
  public readonly customerService: CustomerService;
  public readonly spaServiceService: SpaServiceService;
  public readonly staffService: StaffService;
  public readonly settingsService: SettingsService;
  public readonly reportService: ReportService;
  public readonly auditLogService: AuditLogService;
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
    const reportRepo = new SqliteReportRepository(db);
    const auditLogRepo = new SqliteAuditLogRepository(db);

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
    this.customerService = new CustomerService(customerRepo, this.auditService);
    this.spaServiceService = new SpaServiceService(spaServiceRepo, this.auditService);
    this.staffService = new StaffService(userRepo, this.auditService);
    this.settingsService = new SettingsService(db);
    this.reportService = new ReportService(reportRepo);
    this.auditLogService = new AuditLogService(auditLogRepo);
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
