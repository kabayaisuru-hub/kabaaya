import React from 'react';
import { pdf } from '@react-pdf/renderer';
import { format } from 'date-fns';
import { FinancialStatementPDF } from '../components/pdf/FinancialStatementPDF';
import {
  listBookings,
  listExpenses,
  listInventoryItems,
  listTailoringOrders,
} from '@/lib/firebase-db';

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

export async function generateFinancialReport() {
  try {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
    const reportPeriod = format(new Date(firstDayOfMonth), 'MMMM yyyy');

    const [allBookings, inventoryData, allTailoringOrders, allExpenses] = await Promise.all([
      listBookings(),
      listInventoryItems(),
      listTailoringOrders(),
      listExpenses(),
    ]);

    const bookingsData = allBookings.filter(
      (booking) =>
        ['Confirmed', 'PickedUp', 'Returned'].includes(booking.status) &&
        booking.created_at >= firstDayOfMonth &&
        booking.created_at <= lastDayOfMonth
    );
    const inventoryMap = new Map((inventoryData || []).map((item) => [item.id, item]));
    const tailoringData = allTailoringOrders.filter(
      (order) => order.created_at >= firstDayOfMonth && order.created_at <= lastDayOfMonth
    );
    const expensesData = allExpenses.filter(
      (expense) =>
        expense.expense_date >= firstDayOfMonth && expense.expense_date <= lastDayOfMonth
    );

    // Totals
    const totalRentalIncome = bookingsData.reduce((acc, curr) => acc + Number(curr.total_amount), 0);
    const totalTailoringIncome = tailoringData.reduce((acc, curr) => acc + Number(curr.total_amount), 0);
    const totalRevenue = totalRentalIncome + totalTailoringIncome;
    const totalExpenses = expensesData.reduce((acc, curr) => acc + Number(curr.amount), 0);
    const netProfit = totalRevenue - totalExpenses;

    // Transactions list
    const transactions: any[] = [];
    bookingsData.forEach((b) => {
      const codes = (b.item_ids || []).map((id: string) => inventoryMap.get(id)?.item_code || '').filter(Boolean).join(', ');
      const desc = codes ? `${codes} - Booking #${b.id.substring(0, 8)}` : `Booking #${b.id.substring(0, 8)}`;
      transactions.push({ date: b.created_at, type: 'Rental', desc, amount: Number(b.total_amount) });
    });
    tailoringData.forEach((t) =>
      transactions.push({ date: t.created_at, type: 'Tailoring', desc: `Order #${t.id.substring(0, 8)}`, amount: Number(t.total_amount) })
    );
    expensesData.forEach((e) =>
      transactions.push({ date: e.expense_date, type: 'Expense', desc: e.description || e.category, amount: -Number(e.amount) })
    );
    transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const reportData = {
      reportPeriod,
      totalRentalIncome,
      totalTailoringIncome,
      totalRevenue,
      totalExpenses,
      netProfit,
      transactions,
    };

    const blob = await pdf(<FinancialStatementPDF data={reportData} />).toBlob();
    downloadBlob(blob, `Kabaaya_Statement_${reportPeriod.replace(' ', '_')}.pdf`);
    return true;
  } catch (error) {
    console.error('Error generating financial report:', error);
    return false;
  }
}
