import React from 'react';
import { Document, Page, View, Text, Image } from '@react-pdf/renderer';
import { styles, GOLD, DARK_HEADER, LIGHT_TEXT, BORDER, MID_TEXT, DARK_TEXT, ROW_ALT } from './SharedStyles';
import { StyleSheet } from '@react-pdf/renderer';
import { format } from 'date-fns';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', currencyDisplay: 'symbol' }).format(amount);

const stmtStyles = StyleSheet.create({
  overviewRow: {
    flexDirection: 'row',
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  overviewDesc: { flex: 3, fontSize: 9, color: DARK_TEXT },
  overviewAmt: { flex: 1.5, fontSize: 9, fontFamily: 'Helvetica-Bold', color: DARK_TEXT, textAlign: 'right' },
  txRow: {
    flexDirection: 'row',
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  txDate: { flex: 1.3, fontSize: 8, color: MID_TEXT },
  txType: { flex: 1.3, fontSize: 8, color: MID_TEXT },
  txDesc: { flex: 3, fontSize: 8, color: DARK_TEXT },
  txAmt: { flex: 1.3, fontSize: 8, fontFamily: 'Helvetica-Bold', textAlign: 'right' },
  profitPositive: { color: '#006600' },
  profitNegative: { color: '#990000' },
  expenseAmt: { color: '#990000' },
  sectionTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: DARK_HEADER,
    marginBottom: 4,
    marginTop: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    borderBottomWidth: 1,
    borderBottomColor: GOLD,
    paddingBottom: 2,
  },
  statBox: {
    backgroundColor: ROW_ALT,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 3,
    padding: 12,
    marginTop: 12,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  statLabel: { fontSize: 9, color: MID_TEXT },
  statValue: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: DARK_TEXT },
  netProfitLabel: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: GOLD },
  netProfitValue: { fontSize: 12, fontFamily: 'Helvetica-Bold' },
});

const Header = ({ period }: { period: string }) => (
  <View style={styles.header}>
    <Image src="/logo.jpg" style={styles.logo} />
    <Text style={styles.brandName}>KABAAYA</Text>
    <Text style={styles.tagline}>PREMIUM WEDDING WEAR &amp; LUXURY TAILORING</Text>
    <Text style={styles.addressLine}>No 188, Galagama, Belihuloya</Text>
    <Text style={styles.phoneLine}>Tel: 071 8932662 / 076 0201662</Text>
    <View style={styles.titleBadge}>
      <Text style={styles.titleBadgeText}>MONTHLY FINANCIAL STATEMENT</Text>
    </View>
  </View>
);

interface Transaction {
  date: string;
  type: string;
  desc: string;
  amount: number;
}

interface FinancialData {
  reportPeriod: string;
  totalRentalIncome: number;
  totalTailoringIncome: number;
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  transactions: Transaction[];
}

export const FinancialStatementPDF = ({ data }: { data: FinancialData }) => {
  const isProfitable = data.netProfit >= 0;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Header period={data.reportPeriod} />
        <View style={styles.divider} />

        {/* Period Info */}
        <View style={styles.metaRow}>
          <View>
            <Text style={styles.metaLabel}>Report Period</Text>
            <Text style={styles.metaValue}>{data.reportPeriod}</Text>
          </View>
          <View>
            <Text style={styles.metaLabel}>Generated</Text>
            <Text style={styles.metaValue}>{format(new Date(), 'dd MMM yyyy')}</Text>
          </View>
          <View>
            <Text style={styles.metaLabel}>Currency</Text>
            <Text style={styles.metaValue}>LKR</Text>
          </View>
        </View>

        {/* Financial Overview */}
        <Text style={stmtStyles.sectionTitle}>Financial Overview</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, { flex: 3 }]}>Description</Text>
            <Text style={[styles.tableHeaderCell, { flex: 1.5, textAlign: 'right' }]}>Amount (LKR)</Text>
          </View>
          {[
            { label: 'Total Rental Income', value: data.totalRentalIncome },
            { label: 'Total Tailoring Income', value: data.totalTailoringIncome },
            { label: 'Total Revenue', value: data.totalRevenue },
            { label: 'Total Expenses', value: -data.totalExpenses },
          ].map((row, i) => (
            <View key={i} style={[stmtStyles.overviewRow, i % 2 !== 0 ? styles.tableRowAlt : {}]}>
              <Text style={stmtStyles.overviewDesc}>{row.label}</Text>
              <Text style={[stmtStyles.overviewAmt, row.value < 0 ? stmtStyles.expenseAmt : {}]}>
                {row.value < 0 ? `(${formatCurrency(Math.abs(row.value))})` : formatCurrency(row.value)}
              </Text>
            </View>
          ))}
        </View>

        {/* Transaction Breakdown */}
        <Text style={stmtStyles.sectionTitle}>Transaction Breakdown</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, { flex: 1.3 }]}>Date</Text>
            <Text style={[styles.tableHeaderCell, { flex: 1.3 }]}>Category</Text>
            <Text style={[styles.tableHeaderCell, { flex: 3 }]}>Description</Text>
            <Text style={[styles.tableHeaderCell, { flex: 1.3, textAlign: 'right' }]}>Amount (LKR)</Text>
          </View>
          {data.transactions.map((t, i) => (
            <View key={i} style={[stmtStyles.txRow, i % 2 !== 0 ? styles.tableRowAlt : {}]}>
              <Text style={stmtStyles.txDate}>{format(new Date(t.date), 'dd/MM/yy')}</Text>
              <Text style={stmtStyles.txType}>{t.type}</Text>
              <Text style={stmtStyles.txDesc}>{t.desc}</Text>
              <Text style={[stmtStyles.txAmt, t.amount < 0 ? stmtStyles.expenseAmt : {}]}>
                {t.amount < 0 ? `(${formatCurrency(Math.abs(t.amount))})` : formatCurrency(t.amount)}
              </Text>
            </View>
          ))}
        </View>

        {/* Summary */}
        <View style={stmtStyles.statBox}>
          <Text style={[stmtStyles.sectionTitle, { marginTop: 0 }]}>Statement Summary</Text>
          <View style={stmtStyles.statRow}>
            <Text style={stmtStyles.statLabel}>Total Income</Text>
            <Text style={stmtStyles.statValue}>{formatCurrency(data.totalRevenue)}</Text>
          </View>
          <View style={stmtStyles.statRow}>
            <Text style={stmtStyles.statLabel}>Total Expenses</Text>
            <Text style={[stmtStyles.statValue, stmtStyles.expenseAmt]}>{formatCurrency(data.totalExpenses)}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={stmtStyles.statRow}>
            <Text style={stmtStyles.netProfitLabel}>Net Profit</Text>
            <Text style={[stmtStyles.netProfitValue, isProfitable ? stmtStyles.profitPositive : stmtStyles.profitNegative]}>
              {formatCurrency(data.netProfit)}
            </Text>
          </View>
        </View>

        {/* Signature */}
        <View style={[styles.signatureSection, { marginTop: 20 }]}>
          <View style={styles.signatureBlock}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>Manager Signature</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerBrand}>KABAAYA</Text>
          <Text style={styles.footerText}>Official Business Record</Text>
          <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
};
