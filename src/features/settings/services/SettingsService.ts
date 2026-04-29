import type { Database, SqlValue } from '@/shared/types';
import { DEFAULT_APP_CONFIG, type AppConfig } from '@/config/app.config';

type SettingKey = keyof AppConfig;

export class SettingsService {
  constructor(private readonly db: Database) {}

  private get(key: SettingKey): string | null {
    try {
      const value = this.db.selectValue(
        `SELECT value FROM app_settings WHERE key = ?`,
        [key],
      );
      return value !== undefined ? String(value) : null;
    } catch {
      return null;
    }
  }

  private set(key: SettingKey, value: string, updatedBy: string): void {
    const now = new Date().toISOString();
    this.db.exec(
      `INSERT INTO app_settings (key, value, updated_by, updated_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET
         value = excluded.value,
         updated_by = excluded.updated_by,
         updated_at = excluded.updated_at`,
      { bind: [key, value, updatedBy, now] },
    );
  }

  getAll(): AppConfig {
    return {
      sessionTimeoutMinutes: Number(
        this.get('sessionTimeoutMinutes') ?? DEFAULT_APP_CONFIG.sessionTimeoutMinutes,
      ),
      sessionWarningMinutes: Number(
        this.get('sessionWarningMinutes') ?? DEFAULT_APP_CONFIG.sessionWarningMinutes,
      ),
      loyaltyPointsPerGhs: Number(
        this.get('loyaltyPointsPerGhs') ?? DEFAULT_APP_CONFIG.loyaltyPointsPerGhs,
      ),
      loyaltyRedemptionRate: Number(
        this.get('loyaltyRedemptionRate') ?? DEFAULT_APP_CONFIG.loyaltyRedemptionRate,
      ),
      loyaltyRedemptionValue: Number(
        this.get('loyaltyRedemptionValue') ?? DEFAULT_APP_CONFIG.loyaltyRedemptionValue,
      ),
      voidWindowMinutes: Number(
        this.get('voidWindowMinutes') ?? DEFAULT_APP_CONFIG.voidWindowMinutes,
      ),
      currency: DEFAULT_APP_CONFIG.currency,
      currencyLocale: DEFAULT_APP_CONFIG.currencyLocale,
      dateLocale: DEFAULT_APP_CONFIG.dateLocale,
      receiptSpaName:
        this.get('receiptSpaName') ?? DEFAULT_APP_CONFIG.receiptSpaName,
      receiptTagline:
        this.get('receiptTagline') ?? DEFAULT_APP_CONFIG.receiptTagline,
      receiptAddress:
        this.get('receiptAddress') ?? DEFAULT_APP_CONFIG.receiptAddress,
      receiptPhone:
        this.get('receiptPhone') ?? DEFAULT_APP_CONFIG.receiptPhone,
      receiptInstagram:
        this.get('receiptInstagram') ?? DEFAULT_APP_CONFIG.receiptInstagram,
    };
  }

  updateSessionTimeout(minutes: number, updatedBy: string): void {
    this.set('sessionTimeoutMinutes', String(minutes), updatedBy);
  }

  updateLoyaltyRate(pointsPerGhs: number, updatedBy: string): void {
    this.set('loyaltyPointsPerGhs', String(pointsPerGhs), updatedBy);
  }

  updateReceiptConfig(
    config: { receiptSpaName: string; receiptTagline: string; receiptAddress: string; receiptPhone: string },
    updatedBy: string,
  ): void {
    this.set('receiptSpaName', config.receiptSpaName, updatedBy);
    this.set('receiptTagline', config.receiptTagline, updatedBy);
    this.set('receiptAddress', config.receiptAddress, updatedBy);
    this.set('receiptPhone', config.receiptPhone, updatedBy);
  }
}
