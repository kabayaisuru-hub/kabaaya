import React from 'react';
import { pdf } from '@react-pdf/renderer';
import { format } from 'date-fns';
import { supabase } from './supabase';
import { FinancialStatementPDF } from '../components/pdf/FinancialStatementPDF';

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

    // Fetch Bookings (Rentals)
    const { data: bookingsData, error: bookingsError } = await supabase
      .from('bookings')
      .select('id, created_at, total_amount, status, item_ids')
      .in('status', ['Confirmed', 'PickedUp', 'Returned'])
      .gte('created_at', firstDayOfMonth)
      .lte('created_at', lastDayOfMonth);
    if (bookingsError) throw bookingsError;

    // Fetch Inventory (to resolve item_code)
    const { data: inventoryData } = await supabase.from('inventory').select('id, item_code, name');
    const inventoryMap = new Map((inventoryData || []).map((i: any) => [i.id, i]));

    // Fetch Tailoring Orders
    const { data: tailoringData, error: tailoringError } = await supabase
      .from('tailoring_orders')
      .select('id, created_at, total_amount')
      .gte('created_at', firstDayOfMonth)
      .lte('created_at', lastDayOfMonth);
    if (tailoringError) throw tailoringError;

    // Fetch Expenses
    const { data: expensesData, error: expensesError } = await supabase
      .from('expenses')
      .select('id, expense_date, category, amount, description')
      .gte('expense_date', firstDayOfMonth)
      .lte('expense_date', lastDayOfMonth);
    if (expensesError) throw expensesError;

    // Totals
    const totalRentalIncome = bookingsData?.reduce((acc: number, curr: any) => acc + Number(curr.total_amount), 0) || 0;
    const totalTailoringIncome = tailoringData?.reduce((acc: number, curr: any) => acc + Number(curr.total_amount), 0) || 0;
    const totalRevenue = totalRentalIncome + totalTailoringIncome;
    const totalExpenses = expensesData?.reduce((acc: number, curr: any) => acc + Number(curr.amount), 0) || 0;
    const netProfit = totalRevenue - totalExpenses;

    // Transactions list
    const transactions: any[] = [];
    bookingsData?.forEach((b: any) => {
      const codes = (b.item_ids || []).map((id: string) => inventoryMap.get(id)?.item_code || '').filter(Boolean).join(', ');
      const desc = codes ? `${codes} - Booking #${b.id.substring(0, 8)}` : `Booking #${b.id.substring(0, 8)}`;
      transactions.push({ date: b.created_at, type: 'Rental', desc, amount: Number(b.total_amount) });
    });
    tailoringData?.forEach((t: any) =>
      transactions.push({ date: t.created_at, type: 'Tailoring', desc: `Order #${t.id.substring(0, 8)}`, amount: Number(t.total_amount) })
    );
    expensesData?.forEach((e: any) =>
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
