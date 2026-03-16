import React, { forwardRef } from "react";
import { format } from "date-fns";
import { Scissors, User, Phone, MapPin, Receipt, Scissors as ScissorsIcon } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface TailoringItem {
  item_code: string;
  item_description: string;
  fabric_source: string;
  measurement_unit: string;
  quantity_used: number;
  fabric_rate: number;
  total_fabric_cost: number;
  stitching_price: number;
  item_total: number;
}

interface TailoringReceiptProps {
  data: {
    invoice_id: string;
    cr_book_page_number: string;
    customer_name: string;
    customer_phone: string;
    customer_address: string;
    items: TailoringItem[];
    total_amount: number;
    advance_paid: number;
    discount_amount: number;
    discount_type: 'fixed' | 'percentage';
    grand_total: number;
    due_date?: string;
    notes?: string;
    created_at: string;
  };
}

export const TailoringReceiptTemplate = forwardRef<HTMLDivElement, TailoringReceiptProps>(
  ({ data }, ref) => {
    const subtotal = data.items.reduce((acc, curr) => acc + curr.item_total, 0);
    const balanceDue = data.total_amount - data.advance_paid;

    return (
      <div 
        ref={ref}
        id="tailoring-receipt"
        className="p-16 font-sans flex flex-col"
        style={{
          width: '794px',
          backgroundColor: '#ffffff',
          color: '#000000',
          position: 'absolute',
          left: '-9999px',
          top: '0',
          boxSizing: 'border-box',
          fontSize: '14px',
          minHeight: '1123px',
        }}
      >
        {/* Header */}
        <div className="flex justify-between items-start mb-12 pb-8" style={{ borderBottom: '3px solid #D4AF37' }}>
          <div className="flex gap-6 items-center">
            <img src="/logo.jpg" alt="Logo" className="h-24 w-24 object-contain" />
            <div className="space-y-1">
              <h1 style={{ margin: 0, padding: 0, fontSize: '56px', fontWeight: '950', color: '#D4AF37', letterSpacing: '-0.04em', lineHeight: '0.9' }}>KABAAYA</h1>
              <p style={{ fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.4em', color: '#6B7280' }}>Bespoke Tailoring & Luxury Wear</p>
              <div style={{ fontSize: '12px', fontWeight: '700', color: '#111827', marginTop: '8px' }}>
                <p style={{ margin: 0 }}>No 188, Galagama, Belihuloya</p>
                <p style={{ margin: 0 }}>Tel: 071 8932662 / 076 0201662</p>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div style={{ backgroundColor: '#D4AF37', color: '#FFFFFF', padding: '12px 24px', borderRadius: '12px', display: 'inline-block' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '900', margin: 0, letterSpacing: '0.05em' }}>RECEIPT</h2>
            </div>
            <div className="mt-4">
              <p style={{ fontSize: '16px', fontWeight: '900', color: '#000000' }}>{data.invoice_id}</p>
              <p style={{ fontSize: '10px', fontWeight: '800', color: '#9CA3AF', textTransform: 'uppercase' }}>CR Page: {data.cr_book_page_number}</p>
              <p style={{ fontSize: '11px', fontWeight: '700', marginTop: '4px' }}>Date: {format(new Date(data.created_at || new Date()), "MMM dd, yyyy")}</p>
            </div>
          </div>
        </div>

        {/* Customer Info */}
        <div className="grid grid-cols-2 gap-12 mb-12 p-10" style={{ backgroundColor: '#F9FAFB', borderRadius: '32px', border: '1px solid #F3F4F6' }}>
          <div className="space-y-2">
            <p style={{ fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.2em', color: '#9CA3AF' }}>Billed To</p>
            <p style={{ fontSize: '22px', fontWeight: '950', color: '#111827', lineHeight: '1.1' }}>{data.customer_name}</p>
            <div className="flex items-center gap-2 text-gray-600 font-bold">
              <Phone size={14} />
              <p style={{ fontSize: '14px' }}>{data.customer_phone}</p>
            </div>
          </div>
          <div className="text-right space-y-2">
            <p style={{ fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.2em', color: '#9CA3AF' }}>Collection Date</p>
            <p style={{ fontSize: '22px', fontWeight: '950', color: '#D4AF37' }}>{data.due_date ? format(new Date(data.due_date), "MMM dd, yyyy") : 'TBD'}</p>
            {data.customer_address && (
              <p style={{ fontSize: '12px', fontWeight: '600', color: '#6B7280' }}>{data.customer_address}</p>
            )}
          </div>
        </div>

        {/* Itemized Table */}
        <div className="mb-12 flex-grow overflow-hidden" style={{ borderRadius: '24px', border: '1px solid #F3F4F6' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#000000' }}>
                <th style={{ padding: '16px 20px', textAlign: 'left', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '10px', color: '#D4AF37' }}>Description</th>
                <th style={{ padding: '16px 20px', textAlign: 'center', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '10px', color: '#D4AF37' }}>Source</th>
                <th style={{ padding: '16px 20px', textAlign: 'center', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '10px', color: '#D4AF37' }}>Qty</th>
                <th style={{ padding: '16px 20px', textAlign: 'right', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '10px', color: '#D4AF37' }}>Fees</th>
                <th style={{ padding: '16px 20px', textAlign: 'right', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '10px', color: '#D4AF37' }}>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item, index) => (
                <tr key={index} style={{ borderBottom: '1px solid #F3F4F6' }}>
                  <td style={{ padding: '24px 20px' }}>
                    <p style={{ fontSize: '14px', fontWeight: '900', color: '#111827' }}>{item.item_description}</p>
                    <p style={{ fontSize: '10px', fontWeight: '800', color: '#D4AF37', textTransform: 'uppercase', marginTop: '2px' }}>Code: {item.item_code || '---'}</p>
                  </td>
                  <td style={{ padding: '24px 20px', textAlign: 'center' }}>
                    {item.fabric_source === 'Customer Provided' ? (
                      <span style={{ fontSize: '10px', fontWeight: '900', padding: '4px 10px', backgroundColor: '#FEF3C7', color: '#D97706', borderRadius: '8px', textTransform: 'uppercase' }}>Customer material</span>
                    ) : (
                      <span style={{ fontSize: '10px', fontWeight: '900', padding: '4px 10px', backgroundColor: '#ECFDF5', color: '#059669', borderRadius: '8px', textTransform: 'uppercase' }}>Shop stock</span>
                    )}
                  </td>
                  <td style={{ padding: '24px 20px', textAlign: 'center', fontWeight: '900', fontSize: '14px' }}>
                    {item.quantity_used || 0}{item.measurement_unit}
                  </td>
                  <td style={{ padding: '24px 20px', textAlign: 'right' }}>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: '#6B7280' }}>
                      <p>Stitching: {formatCurrency(item.stitching_price)}</p>
                      {item.fabric_source === 'Shop Stock' && (
                        <p>Fabric: {formatCurrency(item.total_fabric_cost)}</p>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '24px 20px', textAlign: 'right', fontWeight: '900', fontSize: '16px', color: '#111827' }}>
                    {formatCurrency(item.item_total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Financial Summary */}
        <div style={{ marginLeft: 'auto', width: '45%' }}>
          <div className="space-y-4 p-8" style={{ backgroundColor: '#F9FAFB', borderRadius: '24px' }}>
            <div className="flex justify-between items-center pb-3" style={{ borderBottom: '1px solid #E5E7EB' }}>
              <span style={{ fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', color: '#6B7280' }}>Bill Subtotal</span>
              <span style={{ fontSize: '14px', fontWeight: '800' }}>{formatCurrency(subtotal)}</span>
            </div>
            {data.discount_amount > 0 && (
              <div className="flex justify-between items-center pb-3" style={{ borderBottom: '1px solid #E5E7EB' }}>
                <span style={{ fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', color: '#EF4444' }}>Discount</span>
                <span style={{ fontSize: '14px', fontWeight: '800', color: '#EF4444' }}>-{formatCurrency(subtotal - data.grand_total)}</span>
              </div>
            )}
            <div className="flex justify-between items-center pb-3">
              <span style={{ fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', color: '#6B7280' }}>Advance Paid</span>
              <span style={{ fontSize: '14px', fontWeight: '800', color: '#10B981' }}>{formatCurrency(data.advance_paid)}</span>
            </div>
            <div className="flex justify-between items-center pt-2">
              <span style={{ fontSize: '12px', fontWeight: '900', textTransform: 'uppercase', color: '#000000' }}>Final Balance</span>
              <span style={{ fontSize: '28px', fontWeight: '950', color: '#D4AF37', letterSpacing: '-0.02em' }}>{formatCurrency(balanceDue)}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-auto pt-12 text-center space-y-4">
          <div style={{ padding: '20px', backgroundColor: '#FFFBEB', borderRadius: '16px', border: '1px solid #FEF3C7', color: '#92400E' }}>
            <p style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Terms & Conditions</p>
            <p style={{ fontSize: '12px', marginTop: '4px', fontWeight: '600' }}>Please retain this receipt for garment collection. KABAAYA holds no responsibility for unclaimed items after 60 days. Delivery dates are subject to work volume.</p>
          </div>
          <p style={{ fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.5em', color: '#9CA3AF' }}>Thank you for choosing KABAAYA</p>
        </div>
      </div>
    );
  }
);

TailoringReceiptTemplate.displayName = "TailoringReceiptTemplate";
