import React from 'react';
import { Document, Page, View, Text, Image, StyleSheet, Svg, Polyline } from '@react-pdf/renderer';
import { styles, GOLD } from './SharedStyles';
import { KABAAYA_LOGO_BASE64 } from './LogoBase64';
import { format } from 'date-fns';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', currencyDisplay: 'symbol' }).format(amount);

interface RentalItem {
  item_code: string;
  pickup_date: string;
  return_date: string;
}

interface RentalData {
  invoice_no?: string;
  customer_name: string;
  customer_phone: string;
  customer_nic: string;
  items: RentalItem[];
  total_amount: number;
  advance_paid: number;
  signature_data?: string;
}

const sigStyles = StyleSheet.create({
  signatureImage: {
    width: 150,
    height: 60,
    objectFit: 'contain',
    marginBottom: 4,
  },
  signatureSvg: {
    width: 150,
    height: 60,
    marginBottom: 4,
  },
});

const Signature = ({ data }: { data?: string }) => {
  if (!data) return null;

  try {
    // Check if it's a JSON string (points array)
    if (data.startsWith('[') && data.endsWith(']')) {
      const points = JSON.parse(data);
      
      // Calculate bounding box to scale/translate correctly if needed
      // For now, assume the canvas size was consistent or we can just render it.
      // Signature Pad coordinates are based on the canvas size at the time of signing.
      
      return (
        <Svg style={sigStyles.signatureSvg} viewBox="0 0 500 150">
          {points.map((stroke: any[], i: number) => (
            <Polyline
              key={i}
              points={stroke.map(p => `${p.x},${p.y}`).join(' ')}
              fill="none"
              stroke="black"
              strokeWidth={2}
            />
          ))}
        </Svg>
      );
    }
  } catch (e) {
    // If parsing fails, it might be a URL
  }

  // Fallback to Image if it's a URL or base64 PNG
  return <Image src={data} style={sigStyles.signatureImage} />;
};

const Header = () => (
  <View style={styles.header}>
    <Image src={KABAAYA_LOGO_BASE64} style={styles.logo} />
    <Text style={styles.brandName}>KABAAYA</Text>
    <Text style={styles.tagline}>PREMIUM WEDDING WEAR &amp; LUXURY TAILORING</Text>
    <Text style={styles.addressLine}>No 188, Galagama, Belihuloya</Text>
    <Text style={styles.phoneLine}>Tel: 071 8932662 / 076 0201662</Text>
    <View style={styles.titleBadge}>
      <Text style={styles.titleBadgeText}>RENTAL INVOICE</Text>
    </View>
  </View>
);

export const RentalInvoicePDF = ({ data }: { data: RentalData }) => {
  const balance = (data.total_amount ?? 0) - (data.advance_paid ?? 0);
  const returnDate = data.items && data.items.length > 0 ? data.items[0].return_date : null;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Header />
        <View style={styles.divider} />

        {/* Meta Row */}
        <View style={styles.metaRow}>
          <View>
            <Text style={styles.metaLabel}>Invoice No</Text>
            <Text style={styles.metaValue}>{data.invoice_no || 'N/A'}</Text>
          </View>
          <View>
            <Text style={styles.metaLabel}>Date</Text>
            <Text style={styles.metaValue}>{format(new Date(), 'dd MMM yyyy')}</Text>
          </View>
        </View>

        {/* Customer Box */}
        <View style={styles.customerBox}>
          <Text style={styles.customerLabel}>Customer Details</Text>
          <Text style={styles.customerName}>{data.customer_name}</Text>
          <Text style={styles.customerDetail}>Phone: {data.customer_phone}  |  NIC: {data.customer_nic}</Text>
        </View>

        {/* Items Table */}
        <View style={styles.table}>
          {/* Header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, styles.colItem]}>Item Code</Text>
            <Text style={[styles.tableHeaderCell, styles.colPickup]}>Pickup Date</Text>
            <Text style={[styles.tableHeaderCell, styles.colReturn]}>Return Date</Text>
          </View>
          {data.items.map((item, index) => (
            <View key={index} style={[styles.tableRow, index % 2 !== 0 ? styles.tableRowAlt : {}]}>
              <Text style={[styles.tableCell, styles.colItem]}>{item.item_code}</Text>
              <Text style={[styles.tableCell, styles.colPickup]}>
                {format(new Date(item.pickup_date), 'dd MMM yyyy')}
              </Text>
              <Text style={[styles.tableCell, styles.colReturn]}>
                {format(new Date(item.return_date), 'dd MMM yyyy')}
              </Text>
            </View>
          ))}
        </View>

        {/* Summary Box */}
        <View style={styles.summarySection}>
          <View style={styles.summaryBox}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>{formatCurrency(data.total_amount)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: '#006600' }]}>Advance Paid</Text>
              <Text style={[styles.summaryValue, { color: '#006600' }]}>  {formatCurrency(data.advance_paid)}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabelGold}>Balance Due</Text>
              <Text style={styles.summaryValueGold}>{formatCurrency(balance)}</Text>
            </View>
          </View>
        </View>

        {/* Rental Agreement Box */}
        <View style={styles.agreementBox}>
          <Text style={styles.agreementTitle}>Rental Agreement & Conditions</Text>
          
          <View style={styles.agreementRow}>
            <Text style={styles.agreementBullet}>•</Text>
            <Text style={styles.agreementText}>
              <Text style={{ fontFamily: 'Helvetica-Bold' }}>Return Date & Time: </Text>
              <Text style={styles.agreementHighlight}>
                {returnDate ? format(new Date(returnDate), 'dd MMM yyyy') : 'N/A'} (Please return on time)
              </Text>
            </Text>
          </View>

          <View style={styles.agreementRow}>
            <Text style={styles.agreementBullet}>•</Text>
            <Text style={styles.agreementText}>
              <Text style={{ fontFamily: 'Helvetica-Bold' }}>Late Fee: </Text>
              A penalty of Rs. 250.00 will be charged for each day the item is returned late.
            </Text>
          </View>

          <View style={styles.agreementRow}>
            <Text style={styles.agreementBullet}>•</Text>
            <Text style={styles.agreementText}>
              <Text style={{ fontFamily: 'Helvetica-Bold' }}>Damage Policy: </Text>
              The customer is strictly responsible for any stains, tears, burns, or broken buttons. Repair or replacement costs will be charged accordingly.
            </Text>
          </View>

          <View style={styles.agreementRow}>
            <Text style={styles.agreementBullet}>•</Text>
            <Text style={styles.agreementText}>
              <Text style={{ fontFamily: 'Helvetica-Bold' }}>Cleaning: </Text>
              DO NOT WASH. We handle the dry cleaning process.
            </Text>
          </View>

          <View style={styles.agreementRow}>
            <Text style={styles.agreementBullet}>•</Text>
            <Text style={styles.agreementText}>
              <Text style={{ fontFamily: 'Helvetica-Bold' }}>Security Deposit: </Text>
              Refundable only if the item is returned in its original condition.
            </Text>
          </View>
        </View>

        {/* Signatures */}
        <View style={styles.signatureSection}>
          <View style={styles.signatureBlock}>
            <Signature data={data.signature_data} />
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>Customer Signature</Text>
          </View>
          <View style={styles.signatureBlockRight}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>Authorized Signature</Text>
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
