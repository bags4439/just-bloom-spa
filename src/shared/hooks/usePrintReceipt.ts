import { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';

export function usePrintReceipt(): {
  receiptRef: React.RefObject<HTMLDivElement | null>;
  print: () => void;
} {
  const receiptRef = useRef<HTMLDivElement>(null);

  const print = useReactToPrint({
    contentRef: receiptRef as React.RefObject<HTMLElement>,
    documentTitle: 'Just Bloom Spa — Receipt',
    pageStyle: `
      @page {
        size: 80mm auto;
        margin: 0;
      }
      @media print {
        body {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
      }
    `,
  });

  return { receiptRef, print };
}
