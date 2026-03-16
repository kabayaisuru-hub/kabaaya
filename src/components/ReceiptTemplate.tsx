import React, { forwardRef } from "react";
import { format } from "date-fns";
import { Shirt, User, Phone, CreditCard, CalendarDays } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface ReceiptItem {
  item_code: string;
  pickup_date: string;
  return_date: string;
}

interface ReceiptTemplateProps {
  data: {
    customer_name: string;
    customer_phone: string;
    customer_nic: string;
    items: ReceiptItem[];
    total_amount: number;
    advance_paid: number;
    signature_data?: string;
    invoice_no?: string;
  };
}

export const ReceiptTemplate = forwardRef<HTMLDivElement, ReceiptTemplateProps>(
  ({ data }, ref) => {
    const balanceDue = data.total_amount - data.advance_paid;

    return (
      <div 
        ref={ref}
        id="printable-receipt"
        className="p-12 font-sans flex flex-col"
        style={{
          width: '794px', // Exactly 210mm at 96 DPI
          backgroundColor: '#ffffff',
          color: '#000000',
          position: 'absolute',
          left: '-9999px',
          top: '0',
          boxSizing: 'border-box',
          fontSize: '16px',
          minHeight: '1123px', // A4 height at 96 DPI
        }}
      >
        {/* Header Section: Boutique Style */}
        <div className="flex justify-between items-end mb-12 pb-8" style={{ borderBottom: '2px solid #D4AF37' }}>
          {/* Left Side: Prominent Branding */}
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <img 
                src="/logo.jpg" 
                alt="Logo" 
                className="h-16" 
                style={{ display: 'block' }}
              />
              <div>
                <h1 style={{ margin: 0, padding: 0, fontSize: '42px', fontWeight: '900', color: '#D4AF37', letterSpacing: '-0.02em', lineHeight: '1' }}>KABAAYA</h1>
                <p style={{ margin: 0, padding: 0, fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.3em', color: '#6b7280', marginTop: '4px' }}>Premium Wedding Wear</p>
              </div>
            </div>
            <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#6B7280', marginTop: '16px' }}>
              <p style={{ margin: '2px 0' }}>Galagama, Belihuloya.</p>
              <p style={{ margin: '2px 0' }}>071 8932662 / 076 0201662</p>
              <p style={{ margin: '8px 0', color: '#000000' }}>Date: {format(new Date(), "yyyy-MM-dd")}</p>
            </div>
          </div>

          {/* Right Side: Invoice Header */}
          <div className="text-right">
            <h2 style={{ fontSize: '24px', fontWeight: '900', color: '#000000', margin: 0 }}>INVOICE</h2>
            {data.invoice_no && (
              <p style={{ fontSize: '14px', fontWeight: '900', color: '#D4AF37', marginTop: '4px' }}>INVOICE: <span style={{ color: '#000000' }}>{data.invoice_no}</span></p>
            )}
            <p style={{ fontSize: '10px', fontWeight: '800', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.2em', marginTop: '4px' }}>Official Receipt</p>
          </div>
        </div>

        {/* Customer Information Grid */}
        <div className="mb-12 p-8" style={{ backgroundColor: '#F9FAFB', borderRadius: '24px' }}>
          <div className="grid grid-cols-3 gap-8">
            <div>
              <p style={{ fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#9CA3AF', marginBottom: '4px' }}>Customer Name</p>
              <p style={{ fontSize: '16px', fontWeight: '800', color: '#000000' }}>{data.customer_name}</p>
            </div>
            <div>
              <p style={{ fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#9CA3AF', marginBottom: '4px' }}>Phone Number</p>
              <p style={{ fontSize: '16px', fontWeight: '800', color: '#000000' }}>{data.customer_phone}</p>
            </div>
            <div>
              <p style={{ fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#9CA3AF', marginBottom: '4px' }}>NIC / ID</p>
              <p style={{ fontSize: '16px', fontWeight: '800', color: '#000000' }}>{data.customer_nic}</p>
            </div>
          </div>
        </div>

        {/* Item Table: Supports Multiple Items */}
        <div className="mb-8 flex-grow">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#1C1C1E' }}>
                <th style={{ padding: '16px', textAlign: 'left', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '11px', color: '#D4AF37', borderTopLeftRadius: '16px' }}>Item Code</th>
                <th style={{ padding: '16px', textAlign: 'center', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '11px', color: '#D4AF37' }}>Pickup Date</th>
                <th style={{ padding: '16px', textAlign: 'right', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '11px', color: '#D4AF37', borderTopRightRadius: '16px' }}>Return Date</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item, index) => (
                <tr key={index}>
                  <td style={{ padding: '16px', fontSize: '16px', fontWeight: '900', color: '#000000', borderBottom: '1px solid #F3F4F6' }}>{item.item_code}</td>
                  <td style={{ padding: '16px', fontSize: '16px', fontWeight: '800', color: '#000000', borderBottom: '1px solid #F3F4F6', textAlign: 'center' }}>{format(new Date(item.pickup_date), "yyyy-MM-dd")}</td>
                  <td style={{ padding: '16px', fontSize: '16px', fontWeight: '800', color: '#000000', borderBottom: '1px solid #F3F4F6', textAlign: 'right' }}>{format(new Date(item.return_date), "yyyy-MM-dd")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Financial Details Table */}
        <div style={{ marginLeft: 'auto', width: '50%', marginBottom: '48px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                <td style={{ padding: '12px', fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#6b7280', borderBottom: '1px solid #f3f4f6' }}>Total Amount</td>
                <td style={{ padding: '12px', textAlign: 'right', fontSize: '14px', fontWeight: '700', color: '#000000', borderBottom: '1px solid #f3f4f6' }}>{formatCurrency(data.total_amount)}</td>
              </tr>
              <tr>
                <td style={{ padding: '12px', fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#6b7280', borderBottom: '1px solid #f3f4f6' }}>Advance Paid</td>
                <td style={{ padding: '12px', textAlign: 'right', fontSize: '14px', fontWeight: '700', color: '#000000', borderBottom: '1px solid #f3f4f6' }}>{formatCurrency(data.advance_paid)}</td>
              </tr>
              <tr style={{ backgroundColor: '#f9fafb' }}>
                <td style={{ padding: '16px 12px', fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#000000' }}>Balance Due</td>
                <td style={{ padding: '16px 12px', textAlign: 'right', fontSize: '20px', fontWeight: '900', color: '#D4AF37' }}>{formatCurrency(balanceDue)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Terms & Conditions (Sinhala) */}
        <div style={{ paddingTop: '40px', borderTop: '1px solid #f3f4f6' }}>
          <h3 style={{ fontSize: '13px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#000000', marginBottom: '16px' }}>Terms & Conditions (කොන්දේසි):</h3>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
            {[
              "ප්‍රමාද වන සෑම දිනකම රු. 250/- ක අතිරේක ගාස්තුවක් අය කරනු ලැබේ.",
              "ඇඳුම්වලට සිදුවන හානි සඳහා පාරිභෝගිකයා සම්පූර්ණයෙන් වගකිව යුතුය.",
              "ඇඳුම් නිවසේදී සේදීම හෝ අයන් කිරීම (Iron) නොකළ යුතුය.",
              "අත්තිකාරම් මුදල් නැවත ලබා දෙනු නොලැබේ.",
              "ඇඳුම රැගෙන යාමට පෙර එහි තත්ත්වය පරීක්ෂා කර බැලීම පාරිභෝගිකයාගේ වගකීමකි."
            ].map((text, i) => (
              <li key={i} style={{ display: 'flex', gap: '12px', marginBottom: '8px', fontSize: '11px', fontWeight: '500', lineHeight: '1.6', color: '#4B5563' }}>
                <span style={{ fontWeight: '900', color: '#D4AF37' }}>•</span>
                <span>{text}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Signatures Section */}
        <div style={{ marginTop: '64px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '40px' }}>
          <div style={{ textAlign: 'center', width: '250px' }}>
            <div style={{ paddingBottom: '8px', borderBottom: '1px solid #d1d5db', marginBottom: '8px' }}>
              <p style={{ fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#6b7280', margin: 0 }}>Customer Signature</p>
            </div>
            <div style={{ height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img 
                id="pdf-signature" 
                crossOrigin="anonymous"
                src={data.signature_data || "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="} 
                alt="Customer Sig" 
                style={{ 
                  width: '200px',
                  height: '60px', 
                  objectFit: 'contain',
                  backgroundColor: 'transparent',
                  opacity: 0
                }} 
              />
            </div>
          </div>
          
          <div style={{ textAlign: 'center', width: '250px' }}>
            <div style={{ paddingBottom: '8px', borderBottom: '1px solid #d1d5db', marginBottom: '8px' }}>
              <p style={{ fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#6b7280', margin: 0 }}>Authorized Signature</p>
            </div>
            <div style={{ height: '64px' }}></div>
          </div>
        </div>

        <div style={{ textAlign: 'center', fontSize: '9px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.3em', color: '#9CA3AF' }}>
          This is a computer generated receipt.
        </div>
      </div>
    );
  }
);

ReceiptTemplate.displayName = "ReceiptTemplate";
