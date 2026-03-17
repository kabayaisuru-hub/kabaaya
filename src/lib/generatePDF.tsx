import React from 'react';
import { pdf } from '@react-pdf/renderer';
import { RentalInvoicePDF } from '../components/pdf/RentalInvoicePDF';
import { TailoringReceiptPDF } from '../components/pdf/TailoringReceiptPDF';

// Helper: converts a blob to a download
const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
};

// ─── Rental / Booking Receipt ─────────────────────────────────────────────────
export const generatePDFReceipt = async (data: any, filename: string): Promise<boolean> => {
  try {
    const blob = await pdf(<RentalInvoicePDF data={data} />).toBlob();
    downloadBlob(blob, filename);
    return true;
  } catch (error) {
    console.error('Rental Invoice PDF generation failed:', error);
    return false;
  }
};

// ─── Tailoring Job Card ───────────────────────────────────────────────────────
export const generateTailoringPDF = async (data: any, filename: string): Promise<boolean> => {
  try {
    const blob = await pdf(<TailoringReceiptPDF data={data} />).toBlob();
    downloadBlob(blob, filename);
    return true;
  } catch (error) {
    console.error('Tailoring Receipt PDF generation failed:', error);
    return false;
  }
};
