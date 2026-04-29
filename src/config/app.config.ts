export const DEFAULT_APP_CONFIG = {
  sessionTimeoutMinutes: 15,
  sessionWarningMinutes: 2,
  loyaltyPointsPerGhs: 10,
  loyaltyRedemptionRate: 100,
  loyaltyRedemptionValue: 10,
  voidWindowMinutes: 5,
  currency: 'GHS',
  currencyLocale: 'en-GH',
  dateLocale: 'en-GB',
  receiptSpaName: 'Just Bloom Spa',
  receiptTagline: 'Rest. Reset. Glow.',
  receiptAddress: 'Adenta – Rowi Junction, Accra, Ghana',
  receiptPhone: '024 011 3992',
  receiptInstagram: '@justbloomspa',
} as const;

export interface AppConfig {
  sessionTimeoutMinutes: number;
  sessionWarningMinutes: number;
  loyaltyPointsPerGhs: number;
  loyaltyRedemptionRate: number;
  loyaltyRedemptionValue: number;
  voidWindowMinutes: number;
  currency: string;
  currencyLocale: string;
  dateLocale: string;
  receiptSpaName: string;
  receiptTagline: string;
  receiptAddress: string;
  receiptPhone: string;
  receiptInstagram: string;
}

export type AppConfigKey = keyof AppConfig;
