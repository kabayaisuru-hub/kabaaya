import React from 'react';
import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer';
import { styles, GOLD, DARK_HEADER, LIGHT_TEXT, BORDER, MID_TEXT, DARK_TEXT } from './SharedStyles';
import { format } from 'date-fns';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', currencyDisplay: 'symbol' }).format(amount);

interface TailoringItem {
  item_description: string;
  fabric_source: string;
  quantity_used: number;
  measurement_unit: string;
  stitching_price: number;
  total_fabric_cost: number;
  item_total: number;
}

interface TailoringData {
  invoice_id: string;
  cr_book_page_number?: string;
  created_at: string;
  due_date?: string;
  customer_name: string;
  customer_phone: string;
  items: TailoringItem[];
  total_amount: number;
  discount_amount: number;
  advance_paid: number;
  grand_total: number;
}

const Header = () => (
  <View style={styles.header}>
    <Image src="/logo.jpg" style={styles.logo} />
    <Text style={styles.brandName}>KABAAYA</Text>
    <Text style={styles.tagline}>PREMIUM WEDDING WEAR &amp; LUXURY TAILORING</Text>
    <Text style={styles.addressLine}>No 188, Galagama, Belihuloya</Text>
    <Text style={styles.phoneLine}>Tel: 071 8932662 / 076 0201662</Text>
    <View style={styles.titleBadge}>
      <Text style={styles.titleBadgeText}>TAILORING RECEIPT</Text>
    </View>
  </View>
);

const TableHeader = () => (
  <View style={styles.tableHeader}>
    <Text style={[styles.tableHeaderCell, styles.colDesc]}>Description</Text>
    <Text style={[styles.tableHeaderCell, styles.colSource]}>Source</Text>
    <Text style={[styles.tableHeaderCell, styles.colQty]}>Qty</Text>
    <Text style={[styles.tableHeaderCell, styles.colFees]}>Fees</Text>
    <Text style={[styles.tableHeaderCell, styles.colSubtotal]}>Subtotal</Text>
  </View>
);

const TableRow = ({ item, isAlt }: { item: TailoringItem; isAlt: boolean }) => (
  <View style={[styles.tableRow, isAlt ? styles.tableRowAlt : {}]}>
    <Text style={[styles.tableCell, styles.colDesc]}>{item.item_description}</Text>
    <Text style={[styles.tableCell, styles.colSource]}>{item.fabric_source}</Text>
    <Text style={[styles.tableCell, styles.colQty, { textAlign: 'center' }]}>
      {item.quantity_used || 0}{item.measurement_unit}
    </Text>
    <View style={styles.colFees}>
      <Text style={styles.tableCell}>Stitching: {formatCurrency(item.stitching_price)}</Text>
      <Text style={styles.tableCellSub}>
        Fabric: {item.fabric_source === 'Shop Stock' ? formatCurrency(item.total_fabric_cost) : 'N/A'}
      </Text>
    </View>
    <Text style={[styles.tableCell, styles.colSubtotal, { textAlign: 'right' }]}>
      {formatCurrency(item.item_total)}
    </Text>
  </View>
);

export const TailoringReceiptPDF = ({ data }: { data: TailoringData }) => {
  const finalBalance = (data.grand_total ?? data.total_amount) - (data.advance_paid ?? 0);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Header />
        <View style={styles.divider} />

        {/* Meta Row */}
        <View style={styles.metaRow}>
          {data.cr_book_page_number && (
            <View>
              <Text style={styles.metaLabel}>Bill No.</Text>
              <Text style={[styles.metaValue, { fontFamily: 'Helvetica-Bold', fontSize: 11 }]}>{data.cr_book_page_number}</Text>
            </View>
          )}
          <View>
            <Text style={styles.metaLabel}>Date</Text>
            <Text style={styles.metaValue}>{format(new Date(data.created_at), 'dd MMM yyyy')}</Text>
          </View>
          <View>
            <Text style={styles.metaLabel}>Invoice Ref</Text>
            <Text style={styles.metaValue}>{data.invoice_id?.substring(0, 8).toUpperCase()}</Text>
          </View>
        </View>

        {/* Customer Box */}
        <View style={styles.customerBox}>
          <View style={styles.customerRow}>
            <View>
              <Text style={styles.customerLabel}>Customer</Text>
              <Text style={styles.customerName}>{data.customer_name}</Text>
              <Text style={styles.customerDetail}>{data.customer_phone}</Text>
            </View>
            <View>
              <Text style={styles.customerLabel}>Collection Date</Text>
              <Text style={styles.customerHighlight}>
                {data.due_date ? format(new Date(data.due_date), 'dd MMM yyyy') : 'TBD'}
              </Text>
            </View>
          </View>
        </View>

        {/* Items Table */}
        <View style={styles.table}>
          <TableHeader />
          {data.items.map((item, index) => (
            <TableRow key={index} item={item} isAlt={index % 2 !== 0} />
          ))}
        </View>

        {/* Summary Box */}
        <View style={styles.summarySection}>
          <View style={styles.summaryBox}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Gross Total</Text>
              <Text style={styles.summaryValue}>{formatCurrency(data.total_amount)}</Text>
            </View>
            {data.discount_amount > 0 && (
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: '#990000' }]}>Discount</Text>
                <Text style={[styles.summaryValue, { color: '#990000' }]}>
                  -{formatCurrency(data.discount_amount)}
                </Text>
              </View>
            )}
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: '#006600' }]}>Advance Paid</Text>
              <Text style={[styles.summaryValue, { color: '#006600' }]}>
                {formatCurrency(data.advance_paid)}
              </Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabelGold}>Final Balance</Text>
              <Text style={styles.summaryValueGold}>{formatCurrency(finalBalance)}</Text>
            </View>
          </View>
        </View>

        {/* Note */}
        <Text style={styles.noteText}>
          Please retain this receipt for garment collection. Unclaimed items will be held for a maximum of 60 days.
        </Text>

        {/* Signatures */}
        <View style={styles.signatureSection}>
          <View style={styles.signatureBlock}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>Customer Signature</Text>
          </View>
          <View style={styles.signatureBlockRight}>
            <View style={styles.signatureLine} />
            <Text style={[styles.signatureLabel, { textAlign: 'right' }]}>Authorized Signature</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerBrand}>KABAAYA</Text>
          <Text style={styles.footerText}>No 188, Galagama, Belihuloya • Tel: 071 8932662 / 076 0201662</Text>
          <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
};
