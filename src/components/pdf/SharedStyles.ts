import { StyleSheet } from '@react-pdf/renderer';

// Core brand colors
export const GOLD = '#D4AF37';
export const DARK_HEADER = '#1e293b';
export const DARK_TEXT = '#1a1a1a';
export const LIGHT_TEXT = '#555555';
export const MID_TEXT = '#333333';
export const PAGE_BG = '#ffffff';
export const ROW_ALT = '#f8f6f2';
export const BORDER = '#e0d9cc';

export const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    backgroundColor: PAGE_BG,
    paddingTop: 30,
    paddingBottom: 40,
    paddingHorizontal: 36,
  },

  // --- Header ---
  header: {
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: 18,
  },
  logo: {
    width: 64,
    height: 64,
    objectFit: 'contain',
    marginBottom: 8,
  },
  brandName: {
    fontSize: 28,
    fontFamily: 'Helvetica-Bold',
    color: GOLD,
    letterSpacing: 4,
    textAlign: 'center',
  },
  tagline: {
    fontSize: 7.5,
    color: LIGHT_TEXT,
    letterSpacing: 2,
    marginTop: 4,
    textAlign: 'center',
  },
  addressLine: {
    fontSize: 9,
    color: MID_TEXT,
    marginTop: 2,
    textAlign: 'center',
  },
  phoneLine: {
    fontSize: 9,
    color: MID_TEXT,
    marginTop: 1,
    textAlign: 'center',
  },

  // --- Title Badge ---
  titleBadge: {
    backgroundColor: DARK_HEADER,
    paddingVertical: 5,
    paddingHorizontal: 24,
    borderRadius: 3,
    marginTop: 12,
    alignSelf: 'center',
  },
  titleBadgeText: {
    color: GOLD,
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 2,
    textAlign: 'center',
  },

  // --- Gold Divider ---
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: GOLD,
    marginVertical: 10,
  },

  // --- Meta Info Row ---
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  metaLabel: {
    fontSize: 8,
    color: LIGHT_TEXT,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metaValue: {
    fontSize: 9,
    color: DARK_TEXT,
    marginTop: 2,
  },

  // --- Customer Box ---
  customerBox: {
    backgroundColor: ROW_ALT,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 3,
    padding: 10,
    marginBottom: 14,
  },
  customerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  customerLabel: {
    fontSize: 7.5,
    color: LIGHT_TEXT,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  customerName: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: DARK_TEXT,
  },
  customerDetail: {
    fontSize: 9,
    color: MID_TEXT,
    marginTop: 2,
  },
  customerHighlight: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: GOLD,
    textAlign: 'right',
  },

  // --- Table ---
  table: {
    marginBottom: 14,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: DARK_HEADER,
    paddingVertical: 6,
    paddingHorizontal: 6,
  },
  tableHeaderCell: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: GOLD,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  tableRowAlt: {
    backgroundColor: ROW_ALT,
  },
  tableCell: {
    fontSize: 9,
    color: DARK_TEXT,
  },
  tableCellSub: {
    fontSize: 8,
    color: LIGHT_TEXT,
    marginTop: 2,
  },

  // Column widths for Tailoring
  colDesc: { flex: 3 },
  colSource: { flex: 2 },
  colQty: { flex: 1, textAlign: 'center' },
  colFees: { flex: 2.5 },
  colSubtotal: { flex: 1.5, textAlign: 'right' },

  // Column widths for Rental
  colItem: { flex: 2 },
  colPickup: { flex: 2 },
  colReturn: { flex: 2 },

  // --- Summary Box ---
  summarySection: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 20,
  },
  summaryBox: {
    backgroundColor: ROW_ALT,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 3,
    padding: 12,
    width: 200,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  summaryLabel: {
    fontSize: 9,
    color: MID_TEXT,
  },
  summaryValue: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: DARK_TEXT,
  },
  summaryLabelGold: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: GOLD,
    marginTop: 4,
  },
  summaryValueGold: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: GOLD,
    marginTop: 4,
  },
  summaryDivider: {
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    marginVertical: 5,
  },

  // --- Signatures ---
  signatureSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 30,
  },
  signatureBlock: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    width: '40%',
  },
  signatureBlockRight: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    width: '40%',
  },
  signatureLine: {
    borderBottomWidth: 1,
    borderBottomColor: DARK_TEXT,
    width: '100%',
    marginBottom: 4,
  },
  signatureLabel: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: LIGHT_TEXT,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // --- Footer ---
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 36,
    right: 36,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: BORDER,
    paddingTop: 6,
  },
  footerText: {
    fontSize: 7,
    color: LIGHT_TEXT,
  },
  footerBrand: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: GOLD,
  },

  // --- Notes ---
  noteText: {
    fontSize: 8,
    color: LIGHT_TEXT,
    fontStyle: 'italic',
    marginTop: 6,
    maxWidth: '55%',
  },
});
