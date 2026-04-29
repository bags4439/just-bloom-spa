import type { TimeStamped, SoftDeletable } from '@/shared/types';

export interface Customer extends TimeStamped, SoftDeletable {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  loyaltyPoints: number;
  notes: string | null;
  createdBy: string;
}

export interface CreateCustomerDto {
  name: string;
  phone: string;
  email: string | null;
  createdBy: string;
}
