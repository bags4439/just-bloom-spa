import React from 'react';

import { formatCurrencyCompact } from '@/shared/utils/formatCurrency';
import { formatDateTime } from '@/shared/utils/formatDate';

export interface ReceiptData {
  transactionId: string;
  timestamp: string;
  customerName: string | null;
  staffName: string;
  serviceNames: string[];
  grossPesewas: number;
  discountPesewas: number;
  netPesewas: number;
  amountPaidPesewas: number;
  changePesewas: number;
  primaryChannel: string;
  loyaltyPointsAwarded: number;
  loyaltyPointsBalance?: number;
  spaName: string;
  tagline: string;
  address: string;
  phone: string;
}

interface Props {
  data: ReceiptData;
}

export const Receipt = React.forwardRef<HTMLDivElement, Props>(
  ({ data }, ref) => (
    <div
      ref={ref}
      style={{
        width: '80mm',
        boxSizing: 'border-box',
        fontFamily: "'DM Sans', Arial, sans-serif",
        fontSize: '12px',
        color: '#1A2920',
        padding: '12px 8mm',
        background: 'white',
      }}
    >
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '12px' }}>
        {/* Lotus SVG */}
        <svg
          width="32"
          height="32"
          viewBox="0 0 44 44"
          fill="none"
          style={{ display: 'block', margin: '0 auto 6px' }}
        >
          <path
            d="M22 36C22 36 8 28 8 17C8 11 14 6 22 6C30 6 36 11 36 17C36 28 22 36 22 36Z"
            stroke="#C4962A"
            strokeWidth="1.5"
            fill="none"
          />
          <path
            d="M22 36C22 36 4 26 4 13C4 7 11 3 22 7"
            stroke="#C4962A"
            strokeWidth="1"
            fill="none"
            opacity="0.5"
          />
          <path
            d="M22 36C22 36 40 26 40 13C40 7 33 3 22 7"
            stroke="#C4962A"
            strokeWidth="1"
            fill="none"
            opacity="0.5"
          />
          <circle cx="22" cy="18" r="3.5" stroke="#C4962A" strokeWidth="1.5" fill="none" />
        </svg>
        <div style={{ fontWeight: 700, fontSize: '15px', letterSpacing: '-0.3px' }}>
          {data.spaName}
        </div>
        <div
          style={{
            fontSize: '9px',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: '#C4962A',
            marginTop: '2px',
          }}
        >
          {data.tagline}
        </div>
        <div style={{ fontSize: '10px', color: '#5A7060', marginTop: '4px' }}>
          {data.address}
        </div>
        <div style={{ fontSize: '10px', color: '#5A7060' }}>{data.phone}</div>
      </div>

      <div
        style={{
          borderTop: '1px dashed #DDE8E2',
          borderBottom: '1px dashed #DDE8E2',
          padding: '8px 0',
          marginBottom: '10px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
          <span style={{ color: '#5A7060' }}>Receipt</span>
          <span style={{ fontFamily: 'monospace', fontSize: '11px' }}>
            {data.transactionId.slice(0, 8).toUpperCase()}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
          <span style={{ color: '#5A7060' }}>Date</span>
          <span>{formatDateTime(data.timestamp)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
          <span style={{ color: '#5A7060' }}>Staff</span>
          <span>{data.staffName}</span>
        </div>
        {data.customerName && (
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#5A7060' }}>Customer</span>
            <span>{data.customerName}</span>
          </div>
        )}
      </div>

      {/* Services */}
      <div style={{ marginBottom: '10px' }}>
        {data.serviceNames.map((name, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '3px 0',
              borderBottom: '1px solid #F0EDE5',
            }}
          >
            <span>{name}</span>
          </div>
        ))}

        {data.discountPesewas > 0 && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '3px 0',
              color: '#5A7060',
            }}
          >
            <span>Discount</span>
            <span>- {formatCurrencyCompact(data.discountPesewas)}</span>
          </div>
        )}
      </div>

      {/* Totals */}
      <div
        style={{
          borderTop: '1px solid #DDE8E2',
          paddingTop: '8px',
          marginBottom: '10px',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontWeight: 700,
            fontSize: '14px',
            marginBottom: '5px',
          }}
        >
          <span>Total</span>
          <span style={{ color: '#1D4D35' }}>
            {formatCurrencyCompact(data.netPesewas)}
          </span>
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            color: '#5A7060',
            marginBottom: '3px',
          }}
        >
          <span>Payment ({data.primaryChannel.toUpperCase()})</span>
          <span>{formatCurrencyCompact(data.amountPaidPesewas)}</span>
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            color: '#5A7060',
          }}
        >
          <span>Change</span>
          <span>{formatCurrencyCompact(data.changePesewas)}</span>
        </div>
      </div>

      {/* Loyalty */}
      {data.loyaltyPointsAwarded > 0 && (
        <div
          style={{
            background: '#FAF6EE',
            border: '1px solid #DDE8E2',
            borderRadius: '6px',
            padding: '8px 10px',
            marginBottom: '10px',
            textAlign: 'center',
          }}
        >
          <div style={{ color: '#C4962A', fontWeight: 600, fontSize: '11px' }}>
            +{data.loyaltyPointsAwarded} loyalty points earned
          </div>
          {data.loyaltyPointsBalance !== undefined && (
            <div style={{ color: '#5A7060', fontSize: '10px', marginTop: '2px' }}>
              Balance: {data.loyaltyPointsBalance} points
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div
        style={{
          borderTop: '1px dashed #DDE8E2',
          paddingTop: '10px',
          textAlign: 'center',
          color: '#8A9E90',
          fontSize: '10px',
          letterSpacing: '0.06em',
        }}
      >
        <div style={{ fontWeight: 600, marginBottom: '2px' }}>
          Thank you for visiting {data.spaName}
        </div>
        <div style={{ fontStyle: 'italic' }}>{data.tagline}</div>
      </div>
    </div>
  ),
);
Receipt.displayName = 'Receipt';
