import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { supabase } from './supabase';
import { formatCurrency } from './utils';

// Helper to load image as Base64 for jsPDF
const loadImage = (url: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.src = url;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/jpeg'));
        };
        img.onerror = reject;
    });
};

export async function generateFinancialReport() {
    try {
        const today = new Date();
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
        const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
        const reportPeriod = `${format(new Date(firstDayOfMonth), 'MMMM yyyy')}`;

        // Fetch Bookings (Rentals)
        const { data: bookingsData, error: bookingsError } = await supabase
            .from("bookings")
            .select("id, created_at, total_amount, status, item_ids")
            .in("status", ["Confirmed", "PickedUp", "Returned"])
            .gte("created_at", firstDayOfMonth)
            .lte("created_at", lastDayOfMonth);
            
        if (bookingsError) throw bookingsError;

        // Fetch Inventory (to resolve item_code from item_ids)
        const { data: inventoryData } = await supabase
            .from("inventory")
            .select("id, item_code, name");
        const inventoryMap = new Map((inventoryData || []).map((i: any) => [i.id, i]));

        // Fetch Tailoring Orders
        const { data: tailoringData, error: tailoringError } = await supabase
            .from("tailoring_orders")
            .select("id, created_at, total_amount")
            .gte("created_at", firstDayOfMonth)
            .lte("created_at", lastDayOfMonth);
            
        if (tailoringError) throw tailoringError;

        // Fetch Expenses
        const { data: expensesData, error: expensesError } = await supabase
            .from("expenses")
            .select("id, expense_date, category, amount, description")
            .gte("expense_date", firstDayOfMonth)
            .lte("expense_date", lastDayOfMonth);
            
        if (expensesError) throw expensesError;

        // Process Data
        const totalRentalIncome = bookingsData?.reduce((acc, curr) => acc + Number(curr.total_amount), 0) || 0;
        const totalTailoringIncome = tailoringData?.reduce((acc, curr) => acc + Number(curr.total_amount), 0) || 0;
        const totalRevenue = totalRentalIncome + totalTailoringIncome;
        
        const totalExpenses = expensesData?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;
        const netProfitValue = totalRevenue - totalExpenses;

        // Combine and sort transactions
        let transactions: any[] = [];
        bookingsData?.forEach(b => {
            const codes = (b.item_ids || []).map((id: string) => inventoryMap.get(id)?.item_code || '').filter(Boolean).join(', ');
            const desc = codes ? `${codes} - Booking #${b.id.substring(0, 8)}` : `Booking #${b.id.substring(0, 8)}`;
            transactions.push({ date: b.created_at, type: 'Rental', desc, amount: Number(b.total_amount) });
        });
        tailoringData?.forEach(t => transactions.push({ date: t.created_at, type: 'Tailoring', desc: `Order #${t.id.substring(0, 8)}`, amount: Number(t.total_amount) }));
        expensesData?.forEach(e => transactions.push({ date: e.expense_date, type: 'Expense', desc: e.description || e.category, amount: -Number(e.amount) }));
        transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        // --- Initialize PDF ---
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 20;

        // Colors
        const primaryDark: [number, number, number] = [28, 28, 30]; // Matches dashboard background
        const lightGray: [number, number, number] = [240, 240, 240];
        const goldAccent: [number, number, number] = [212, 175, 55];

        // --- Logo Integration ---
        try {
            const logoData = await loadImage('/logo.jpg');
            doc.addImage(logoData, 'JPEG', margin, 15, 25, 12);
        } catch (e) {
            console.warn("Logo failed to load, skipping...");
        }

        // --- Header Branding ---
        doc.setTextColor(goldAccent[0], goldAccent[1], goldAccent[2]);
        doc.setFontSize(22);
        doc.setFont("helvetica", "bold");
        doc.text("KABAAYA", margin + 30, 22);
        
        doc.setTextColor(100, 100, 100);
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.text("PREMIUM WEDDING WEAR", margin + 30, 26, { charSpace: 1 });

        doc.setTextColor(0, 0, 0);
        doc.setFontSize(18);
        doc.setFont("helvetica", "bold");
        doc.text("MONTHLY STATEMENT", pageWidth - margin, 22, { align: "right" });
        
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(reportPeriod, pageWidth - margin, 27, { align: "right" });

        // --- Business Details ---
        let startY = 45;
        doc.setDrawColor(goldAccent[0], goldAccent[1], goldAccent[2]);
        doc.setLineWidth(0.5);
        doc.line(margin, startY - 5, pageWidth - margin, startY - 5);

        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text("BUSINESS INFORMATION", margin, startY);
        doc.setFont("helvetica", "normal");
        doc.text([
            "Galagama, Belihuloya.",
            "Phone: 071 8932662 / 076 0201662",
            "Email: info@kabaaya.com"
        ], margin, startY + 6);

        doc.setFont("helvetica", "bold");
        doc.text("DOCUMENT DETAILS", pageWidth - margin - 60, startY);
        doc.setFont("helvetica", "normal");
        doc.text([
            `Generated: ${format(today, 'MMM dd, yyyy HH:mm')}`,
            `Status: Official Statement`,
            `Currency: LKR`
        ], pageWidth - margin - 60, startY + 6);

        startY += 25;

        // --- Financial Overview Table ---
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("FINANCIAL OVERVIEW", margin, startY);
        startY += 6;

        autoTable(doc, {
            startY: startY,
            head: [['Description', 'Amount (LKR)']],
            body: [
                ['Total Rental Income', formatCurrency(totalRentalIncome)],
                ['Total Tailoring Income', formatCurrency(totalTailoringIncome)],
                ['Total Revenue', formatCurrency(totalRevenue)],
                ['Total Expenses', `(${formatCurrency(totalExpenses)})`],
            ],
            theme: 'grid',
            headStyles: { fillColor: lightGray, textColor: 0, fontStyle: 'bold', fontSize: 10 },
            bodyStyles: { fontSize: 10 },
            columnStyles: { 1: { halign: 'right' } },
            margin: { left: margin, right: margin },
        });

        startY = (doc as any).lastAutoTable.finalY + 15;

        // --- Transaction Breakdown ---
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("TRANSACTION BREAKDOWN", margin, startY);
        startY += 6;

        const tableData = transactions.map(t => [
            format(new Date(t.date), 'dd/MM/yyyy'),
            t.type,
            t.desc,
            t.amount < 0 ? `(${formatCurrency(Math.abs(t.amount))})` : formatCurrency(t.amount)
        ]);

        autoTable(doc, {
            startY: startY,
            head: [['Date', 'Category', 'Description', 'Amount (LKR)']],
            body: tableData,
            theme: 'striped',
            headStyles: { fillColor: lightGray, textColor: 0, fontStyle: 'bold', fontSize: 9 },
            bodyStyles: { fontSize: 9, cellPadding: 2 },
            columnStyles: {
                0: { cellWidth: 22 },            // Date
                1: { cellWidth: 22 },            // Category
                2: { cellWidth: 'auto' },        // Description — fills remaining space
                3: { cellWidth: 38, halign: 'right' }, // Amount — fixed width, right-aligned
            },
            margin: { left: margin, right: margin },
            didDrawPage: (data) => {
                doc.setFontSize(8);
                doc.setTextColor(150, 150, 150);
                doc.text(`Kabaaya ERP - Page ${data.pageNumber}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
                doc.setTextColor(0, 0, 0);
            }
        });

        // --- Summary Section (Bank-Friendly Card) ---
        startY = (doc as any).lastAutoTable.finalY + 20;

        // Check for page break
        if (startY > doc.internal.pageSize.getHeight() - 60) {
            doc.addPage();
            startY = 20;
        }

        const summaryBoxWidth = 80;
        const summaryX = pageWidth - margin - summaryBoxWidth;

        doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
        doc.roundedRect(summaryX, startY, summaryBoxWidth, 40, 3, 3, 'F');
        
        doc.setDrawColor(200);
        doc.roundedRect(summaryX, startY, summaryBoxWidth, 40, 3, 3, 'D');

        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.setFont("helvetica", "bold");
        doc.text("REPORT SUMMARY", summaryX + 5, startY + 8);

        doc.setTextColor(0);
        doc.setFont("helvetica", "normal");
        doc.text("Total Income:", summaryX + 5, startY + 18);
        doc.text(formatCurrency(totalRevenue), pageWidth - margin - 5, startY + 18, { align: 'right' });

        doc.text("Total Expenses:", summaryX + 5, startY + 25);
        doc.text(formatCurrency(totalExpenses), pageWidth - margin - 5, startY + 25, { align: 'right' });

        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.text("Net Profit:", summaryX + 5, startY + 34);
        if (netProfitValue >= 0) {
            doc.setTextColor(0, 100, 0); // Green for profit
        } else {
            doc.setTextColor(150, 0, 0); // Red for loss
        }
        doc.text(formatCurrency(netProfitValue), pageWidth - margin - 5, startY + 34, { align: 'right' });
        doc.setTextColor(0, 0, 0); // Reset to black

        // --- Certification ---
        doc.setTextColor(0);
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text("I hereby certify that this statement represents a true and accurate record of the transactions for the specified period.", margin, startY + 10, { maxWidth: 80 });

        doc.line(margin, startY + 30, margin + 50, startY + 30);
        doc.text("Authorized Signature", margin, startY + 35);

        // Save it
        doc.save(`Kabaaya_Statement_${reportPeriod.replace(' ', '_')}.pdf`);
        return true;

    } catch (error) {
        console.error("Error generating financial report:", error);
        return false;
    }
}

