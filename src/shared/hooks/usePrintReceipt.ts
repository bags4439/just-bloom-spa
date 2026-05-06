import { useCallback } from 'react';

import type { ReceiptData } from '@/shared/components/layout/Receipt';
import { formatDateTime } from '@/shared/utils/formatDate';

export function usePrint(): {
  print: (data: ReceiptData) => void;
} {
  const print = useCallback((data: ReceiptData): void => {
    let printRoot = document.getElementById('print-receipt-root');
    if (!printRoot) {
      printRoot = document.createElement('div');
      printRoot.id = 'print-receipt-root';
      document.body.appendChild(printRoot);
    }

    const html = buildReceiptHtml(data);
    printRoot.innerHTML = html;

    setTimeout(() => {
      window.print();
      setTimeout(() => {
        printRoot.innerHTML = '';
      }, 500);
    }, 50);
  }, []);

  return { print };
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildReceiptHtml(data: ReceiptData): string {
  const discount =
    data.discountPesewas > 0
      ? `<div style="display:flex;justify-content:space-between;padding:3px 0;color:#5A7060;">
        <span>Discount</span>
        <span>- ${formatGhs(data.discountPesewas)}</span>
       </div>`
      : '';

  const customer = data.customerName
    ? `<div style="display:flex;justify-content:space-between;margin-bottom:3px;">
        <span style="color:#5A7060;">Customer</span>
        <span>${escapeHtml(data.customerName)}</span>
       </div>`
    : '';

  const loyalty =
    data.loyaltyPointsAwarded > 0
      ? `<div style="background:#FAF6EE;border:1px solid #DDE8E2;border-radius:6px;
                   padding:8px 10px;margin-bottom:10px;text-align:center;">
        <div style="color:#C4962A;font-weight:600;font-size:11px;">
          +${data.loyaltyPointsAwarded} loyalty points earned
        </div>
       </div>`
      : '';

  const services = data.serviceNames
    .map(
      (name) =>
        `<div style="display:flex;justify-content:space-between;padding:3px 0;
                     border-bottom:1px solid #F0EDE5;">
          <span>${escapeHtml(name)}</span>
         </div>`,
    )
    .join('');

  const staffDisplay = data.staffName.trim() ? escapeHtml(data.staffName) : '—';

  return `
    <div style="width:80mm;box-sizing:border-box;font-family:'DM Sans',Arial,sans-serif;
                font-size:12px;color:#1A2920;padding:12px 8mm;background:white;">

      <!-- Header -->
      <div style="text-align:center;margin-bottom:12px;">
        <svg width="32" height="32" viewBox="0 0 44 44" fill="none"
             style="display:block;margin:0 auto 6px;">
          <path d="M22 36C22 36 8 28 8 17C8 11 14 6 22 6C30 6 36 11 36 17C36 28 22 36 22 36Z"
                stroke="#C4962A" stroke-width="1.5" fill="none"/>
          <path d="M22 36C22 36 4 26 4 13C4 7 11 3 22 7"
                stroke="#C4962A" stroke-width="1" fill="none" opacity="0.5"/>
          <path d="M22 36C22 36 40 26 40 13C40 7 33 3 22 7"
                stroke="#C4962A" stroke-width="1" fill="none" opacity="0.5"/>
          <circle cx="22" cy="18" r="3.5" stroke="#C4962A" stroke-width="1.5" fill="none"/>
        </svg>
        <div style="font-weight:700;font-size:15px;">${escapeHtml(data.spaName)}</div>
        <div style="font-size:9px;letter-spacing:0.12em;text-transform:uppercase;
                    color:#C4962A;margin-top:2px;">${escapeHtml(data.tagline)}</div>
        <div style="font-size:10px;color:#5A7060;margin-top:4px;">${escapeHtml(data.address)}</div>
        <div style="font-size:10px;color:#5A7060;">${escapeHtml(data.phone)}</div>
      </div>

      <!-- Transaction info -->
      <div style="border-top:1px dashed #DDE8E2;border-bottom:1px dashed #DDE8E2;
                  padding:8px 0;margin-bottom:10px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:3px;">
          <span style="color:#5A7060;">Receipt</span>
          <span style="font-family:monospace;font-size:11px;">
            ${escapeHtml(data.transactionId.slice(0, 8).toUpperCase())}
          </span>
        </div>
        <div style="display:flex;justify-content:space-between;margin-bottom:3px;">
          <span style="color:#5A7060;">Date</span>
          <span>${escapeHtml(formatDateTime(data.timestamp))}</span>
        </div>
        <div style="display:flex;justify-content:space-between;margin-bottom:3px;">
          <span style="color:#5A7060;">Staff</span>
          <span>${staffDisplay}</span>
        </div>
        ${customer}
      </div>

      <!-- Services -->
      <div style="margin-bottom:10px;">
        ${services}
        ${discount}
      </div>

      <!-- Totals -->
      <div style="border-top:1px solid #DDE8E2;padding-top:8px;margin-bottom:10px;">
        <div style="display:flex;justify-content:space-between;
                    font-weight:700;font-size:14px;margin-bottom:5px;">
          <span>Total</span>
          <span style="color:#1D4D35;">${formatGhs(data.netPesewas)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;
                    color:#5A7060;margin-bottom:3px;">
          <span>Payment (${escapeHtml(data.primaryChannel.toUpperCase())})</span>
          <span>${formatGhs(data.amountPaidPesewas)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;color:#5A7060;">
          <span>Change</span>
          <span>${formatGhs(data.changePesewas)}</span>
        </div>
      </div>

      ${loyalty}

      <!-- Footer -->
      <div style="border-top:1px dashed #DDE8E2;padding-top:10px;text-align:center;
                  color:#8A9E90;font-size:10px;letter-spacing:0.06em;">
        <div style="font-weight:600;margin-bottom:2px;">
          Thank you for visiting ${escapeHtml(data.spaName)}
        </div>
        <div style="font-style:italic;">${escapeHtml(data.tagline)}</div>
      </div>

    </div>
  `;
}

function formatGhs(pesewas: number): string {
  return `GHS ${(pesewas / 100).toFixed(2)}`;
}
