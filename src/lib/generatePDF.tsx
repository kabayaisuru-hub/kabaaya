import React from 'react';
import { pdf } from '@react-pdf/renderer';
import { TailoringReceiptPDF } from '../components/pdf/TailoringReceiptPDF';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

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

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', currencyDisplay: 'symbol' }).format(amount);

// ─── Rental / Booking Receipt using jsPDF ────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const generatePDFReceipt = async (data: any, filename: string): Promise<boolean> => {
  try {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Helper for centering text
    const centerText = (text: string, y: number, font: string, style: 'normal' | 'bold' | 'italic', size: number, color?: number[]) => {
      doc.setFont(font, style);
      doc.setFontSize(size);
      if (color) doc.setTextColor(color[0], color[1], color[2]);
      else doc.setTextColor(0, 0, 0);
      const textWidth = doc.getTextWidth(text);
      const x = (pageWidth - textWidth) / 2;
      doc.text(text, x, y);
    };

    // --- Header ---
    centerText("KABAAYA", 25, "helvetica", "bold", 28, [212, 175, 55]); // GOLD
    centerText("PREMIUM WEDDING WEAR & LUXURY TAILORING", 32, "helvetica", "normal", 9, [85, 85, 85]);
    centerText("No 188, Galagama, Belihuloya", 37, "helvetica", "normal", 10, [51, 51, 51]);
    centerText("Tel: 071 8932662 / 076 0201662", 42, "helvetica", "normal", 10, [51, 51, 51]);

    // Title Badge
    doc.setFillColor(30, 41, 59); // DARK_HEADER
    doc.roundedRect(pageWidth / 2 - 25, 47, 50, 8, 2, 2, 'F');
    centerText("RENTAL INVOICE", 52.5, "helvetica", "bold", 10, [212, 175, 55]);

    // Divider
    doc.setDrawColor(212, 175, 55);
    doc.setLineWidth(0.5);
    doc.line(14, 60, pageWidth - 14, 60);

    // Meta Info
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(85, 85, 85);
    doc.text(`Invoice No: ${data.invoice_no || 'N/A'}`, 14, 70);
    doc.text(`Date: ${format(new Date(), 'dd MMM yyyy')}`, pageWidth - 14, 70, { align: 'right' });

    // Customer Box
    doc.setFillColor(248, 246, 242);
    doc.setDrawColor(224, 217, 204);
    doc.roundedRect(14, 75, pageWidth - 28, 25, 3, 3, 'FD');
    
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text("CUSTOMER DETAILS", 18, 82);
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(26, 26, 26);
    doc.text(data.customer_name || 'N/A', 18, 88);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(51, 51, 51);
    doc.text(`Phone: ${data.customer_phone}  |  NIC: ${data.customer_nic}`, 18, 94);

    // Items table
    let returnDateStr = "N/A";
    if (data.items && data.items.length > 0) {
      returnDateStr = format(new Date(data.items[0].return_date), 'dd MMM yyyy');
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tableData = data.items.map((item: any) => [
      item.item_code,
      format(new Date(item.pickup_date), 'dd MMM yyyy'),
      format(new Date(item.return_date), 'dd MMM yyyy'),
    ]);

    autoTable(doc, {
      startY: 105,
      head: [['Item Code', 'Pickup Date', 'Return Date']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [30, 41, 59], textColor: [212, 175, 55], fontStyle: 'bold', halign: 'center' },
      bodyStyles: { halign: 'center' },
      styles: { font: 'helvetica', fontSize: 10, textColor: [26, 26, 26] },
      alternateRowStyles: { fillColor: [248, 246, 242] },
    });

    // eslint-disable-next-line prefer-const, @typescript-eslint/no-explicit-any
    let finalY = (doc as any).lastAutoTable.finalY + 10;

    // Financial Summary
    const balance = (data.total_amount ?? 0) - (data.advance_paid ?? 0);
    
    doc.setFillColor(248, 246, 242);
    doc.setDrawColor(224, 217, 204);
    doc.roundedRect(pageWidth - 80 - 14, finalY, 80, 28, 3, 3, 'FD');
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("Subtotal:", pageWidth - 90, finalY + 8);
    doc.setFont("helvetica", "bold");
    doc.text(formatCurrency(data.total_amount), pageWidth - 18, finalY + 8, { align: 'right' });

    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 102, 0); // Green
    doc.text("Advance Paid:", pageWidth - 90, finalY + 14);
    doc.setFont("helvetica", "bold");
    doc.text(formatCurrency(data.advance_paid), pageWidth - 18, finalY + 14, { align: 'right' });

    doc.setDrawColor(224, 217, 204);
    doc.line(pageWidth - 90, finalY + 18, pageWidth - 18, finalY + 18);

    doc.setFontSize(11);
    doc.setTextColor(212, 175, 55); // GOLD
    doc.text("Balance Due:", pageWidth - 90, finalY + 24);
    doc.text(formatCurrency(balance), pageWidth - 18, finalY + 24, { align: 'right' });

    // Rental rules Box (bottom area)
    const ruleBoxY = pageHeight - 95;

    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(30, 41, 59);
    doc.setLineWidth(0.5);
    doc.roundedRect(14, ruleBoxY, pageWidth - 28, 55, 3, 3, 'FD');
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59);
    doc.text("Rental Agreement & Conditions", 18, ruleBoxY + 8);
    
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    
    // 1. Return Date & Time
    doc.setFont("helvetica", "bold");
    doc.text("Return Date & Time:", 18, ruleBoxY + 16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(200, 0, 0); // Red highlight
    doc.text(returnDateStr, 52, ruleBoxY + 16);
    doc.setTextColor(30, 41, 59);

    // 2. Late Fee
    doc.setFont("helvetica", "bold");
    doc.text("Late Fee:", 18, ruleBoxY + 24);
    doc.setFont("helvetica", "normal");
    doc.text("A penalty of Rs. 250.00 will be charged for each day the item is returned late.", 35, ruleBoxY + 24);

    // 3. Damage Policy (Multi-line)
    doc.setFont("helvetica", "bold");
    doc.text("Damage Policy:", 18, ruleBoxY + 32);
    doc.setFont("helvetica", "normal");
    doc.text("The customer is strictly responsible for any stains, tears, burns, or broken buttons. Repair or", 45, ruleBoxY + 32);
    doc.text("replacement costs will be charged accordingly.", 45, ruleBoxY + 37);

    // 4. Cleaning
    doc.setFont("helvetica", "bold");
    doc.text("Cleaning:", 18, ruleBoxY + 45);
    doc.setFont("helvetica", "normal");
    doc.text("DO NOT WASH. We handle the dry cleaning process.", 35, ruleBoxY + 45);

    // 5. Security Deposit
    doc.setFont("helvetica", "bold");
    doc.text("Security Deposit:", 18, ruleBoxY + 52);
    doc.setFont("helvetica", "normal");
    doc.text("Refundable only if the item is returned in its original condition.", 48, ruleBoxY + 52);

    // Signatures Area
    const sigY = pageHeight - 25;

    if (data.signature_data) {
      doc.addImage(data.signature_data, 'PNG', 20, sigY - 15, 40, 12);
    }
    
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.5);
    doc.line(14, sigY, 70, sigY);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("Customer Signature", 14, sigY + 5);

    doc.line(pageWidth - 70, sigY, pageWidth - 14, sigY);
    doc.text("Authorized Signatory", pageWidth - 70, sigY + 5, { align: 'left' });

    // Footer
    centerText("KABAAYA", pageHeight - 10, "helvetica", "bold", 8, [212, 175, 55]);
    centerText("No 188, Galagama, Belihuloya • Tel: 071 8932662 / 076 0201662", pageHeight - 5, "helvetica", "normal", 7, [85, 85, 85]);

    doc.save(filename);
    return true;
  } catch (error) {
    console.error('Rental Invoice jsPDF generation failed:', error);
    return false;
  }
};

// ─── Tailoring Job Card ───────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
