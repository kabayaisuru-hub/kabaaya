"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Menu,
  Mail,
  ChevronDown,
  Calendar,
  Clock,
  Scissors,
  Phone,
  Truck,
  Search,
  CheckCircle2,
  Printer,
  Trash2,
  Pencil,
  Receipt,
  AlertTriangle,
  Download
} from "lucide-react";
import { BottomNavigation } from "@/components/BottomNavigation";
import { StatusCard } from "@/components/StatusCard";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { cn, formatCurrency } from "@/lib/utils";
import { generatePDFReceipt } from "@/lib/generatePDF";
import { TailoringReceiptTemplate } from "@/components/TailoringReceiptTemplate";
import { FestiveAlert } from "@/components/FestiveAlert";
import { GlobalSearch } from "@/components/GlobalSearch";
import { format } from "date-fns";
import { generateFinancialReport } from "@/lib/generateFinancialReport";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip
} from "recharts";

export default function Dashboard() {
  const [isLoaded, setIsLoaded] = React.useState(false);
  const [stats, setStats] = React.useState({
    historyCount: 0,
    activeRentals: 0,
    overdueRentals: 0,
    readyForCollection: 0,
    dailyIncome: 0,
    monthlyIncome: 0,
    dailyExpenses: 0,
    monthlyExpenses: 0,
    netProfit: 0
  });
  const [chartData, setChartData] = React.useState<any[]>([]);

  const [readyOrders, setReadyOrders] = React.useState<any[]>([]);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [reportLoading, setReportLoading] = React.useState(false);

  const fetchStats = async () => {
    const today = new Date().toISOString().split('T')[0];
    const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

    // 1. History (Returned this month)
    const { count: hCount } = await supabase
      .from("bookings")
      .select("*", { count: 'exact', head: true })
      .eq("status", "Returned")
      .gte("created_at", firstDayOfMonth);

    // 2. Active Rentals (excluding overdue for separate count if desired, or keep as total)
    const { count: aCount } = await supabase
      .from("bookings")
      .select("*", { count: 'exact', head: true })
      .in("status", ["Confirmed", "PickedUp"]);

    // 2b. Overdue Rentals (PickedUp/Confirmed but return date < today)
    const { count: oCount } = await supabase
      .from("bookings")
      .select("*", { count: 'exact', head: true })
      .in("status", ["Confirmed", "PickedUp"])
      .lt("return_date", today);

    // 3. Ready for Collection (Tailoring status = 'Ready')
    const { count: tCount, data: tData } = await supabase
      .from("tailoring_orders")
      .select("*, items:tailoring_items(*)", { count: 'exact' })
      .eq("status", "Ready")
      .order("created_at", { ascending: false });

    // 4. Available Inventory
    const { count: iCount } = await supabase
      .from("inventory")
      .select("*", { count: 'exact', head: true })
      .eq("status", "Available")
      .eq("category", "Blazer");

    // 5. Daily Expenses
    const { data: dExpData } = await supabase
      .from("expenses")
      .select("amount")
      .eq("expense_date", today);
    const dailyExpenses = dExpData?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;

    // 6. Monthly Expenses
    const { data: mExpData } = await supabase
      .from("expenses")
      .select("amount")
      .gte("expense_date", firstDayOfMonth);
    const monthlyExpenses = mExpData?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;

    // 7. Income Calcs & Chart Data Generation
    // We need daily breakdown for the chart, and total sums for the cards.

    // Total Rental Income (Confirmed/PickedUp/Returned) for the month
    const { data: rentalData } = await supabase
      .from("bookings")
      .select("created_at, total_amount")
      .neq("status", "Cancelled")
      .gte("created_at", firstDayOfMonth);

    // Total Tailoring Income for the month
    const { data: tailoringData } = await supabase
      .from("tailoring_orders")
      .select("created_at, total_amount")
      .gte("created_at", firstDayOfMonth);

    let dailyIncome = 0;
    let monthlyIncome = 0;
    const dailyRevenues: Record<string, number> = {};

    // Helper to process revenue
    const processRevenue = (data: any[] | null) => {
      data?.forEach(item => {
        const dateStr = item.created_at.split('T')[0];
        const amount = Number(item.total_amount);

        monthlyIncome += amount;
        if (dateStr === today) {
          dailyIncome += amount;
        }

        dailyRevenues[dateStr] = (dailyRevenues[dateStr] || 0) + amount;
      });
    };

    processRevenue(rentalData);
    processRevenue(tailoringData);

    const netProfit = monthlyIncome - monthlyExpenses;

    // Build Chart Data (last 7 days or whole month depending on preference, we'll do whole month up to today)
    const newChartData = [];
    let start = new Date(firstDayOfMonth);
    const end = new Date(today);

    while (start <= end) {
      const dStr = start.toISOString().split('T')[0];
      newChartData.push({
        name: format(start, 'MMM dd'),
        revenue: dailyRevenues[dStr] || 0
      });
      start.setDate(start.getDate() + 1);
    }

    setChartData(newChartData);

    setStats({
      historyCount: hCount || 0,
      activeRentals: aCount || 0,
      overdueRentals: oCount || 0,
      readyForCollection: tCount || 0,
      availableInventory: iCount || 0,
      dailyIncome,
      monthlyIncome,
      dailyExpenses,
      monthlyExpenses,
      netProfit
    });
    setReadyOrders(tData || []);
  };

  const handleDeliverAndPrint = async (order: any) => {
    setLoading(true);
    // Change status to Completed
    const { error } = await supabase
      .from("tailoring_orders")
      .update({ status: "Completed" })
      .eq("id", order.id);

    if (error) {
      alert("Error updating status: " + error.message);
    } else {
      // Generate PDF
      await generatePDFReceipt("tailoring-receipt", `Receipt_${order.invoice_id}.pdf`);
      // Refresh data
      fetchStats();
    }
    setLoading(false);
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!confirm("Are you sure you want to delete this order?")) return;
    setLoading(true);
    const { error } = await supabase
      .from("tailoring_orders")
      .delete()
      .eq("id", orderId);
    
    if (error) alert("Error deleting order: " + error.message);
    else fetchStats();
    setLoading(false);
  };

  React.useEffect(() => {
    setIsLoaded(true);
    fetchStats();
  }, []);

  if (!isLoaded) return <div className="min-h-screen bg-black" />;

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="min-h-screen bg-transparent">
      <main className="p-4 space-y-6">
        <FestiveAlert />
        {/* Revenue Trend Card - Glassmorphism look */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-6 shadow-2xl overflow-hidden group"
        >
          {/* Subtle background glow */}
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-[#D4AF37]/10 blur-[100px] rounded-full pointer-events-none" />

          <div className="relative z-10">
            <div className="flex justify-between items-start mb-6">
              <div className="space-y-1">
                <h3 className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Analytics Overview</h3>
                <h2 className="text-white font-black text-2xl tracking-tighter">Daily Revenue Trend</h2>
              </div>
              <button
                onClick={async () => {
                  setReportLoading(true);
                  await generateFinancialReport();
                  setReportLoading(false);
                }}
                disabled={reportLoading}
                className="bg-[#D4AF37] hover:bg-[#D4AF37]/80 px-4 py-2 rounded-xl flex items-center gap-2 border border-[#D4AF37]/20 transition-colors"
              >
                {reportLoading ? (
                  <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                ) : (
                  <Download size={14} className="text-black" />
                )}
                <span className="text-xs font-black text-black">Report</span>
              </button>
            </div>

            {/* Professional Recharts Integration */}
            <div className="h-48 w-full mb-6">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#D4AF37" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1c1c1e',
                      borderColor: 'rgba(255,255,255,0.1)',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: 'bold'
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#D4AF37"
                    strokeWidth={4}
                    fillOpacity={1}
                    fill="url(#colorRev)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-1 gap-3 p-1 md:grid-cols-3 md:gap-4 md:p-0">
              <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 md:p-5 border border-white/10 shadow-inner">
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Today&apos;s Income</p>
                <div className="flex items-center gap-1">
                  <span className="text-lg md:text-xl font-black text-green-400">{formatCurrency(stats.dailyIncome)}</span>
                </div>
              </div>
              <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 md:p-5 border border-white/10 shadow-inner">
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Today&apos;s Expenses</p>
                <div className="flex items-center gap-1">
                  <span className="text-lg md:text-xl font-black text-red-400">{formatCurrency(stats.dailyExpenses)}</span>
                </div>
              </div>
              <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 md:p-5 border border-white/10 shadow-inner">
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Net Profit (Monthly)</p>
                <div className="flex items-center gap-1">
                  <span className="text-lg md:text-xl font-black text-white">{formatCurrency(stats.netProfit)}</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Global Search Bar */}
        <GlobalSearch />

        {/* Financial Summary Cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[#1C1C1E]/50 backdrop-blur-md rounded-[2rem] p-5 border border-white/5 border-t-green-500/30">
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Today's Income</p>
            <p className="text-xl font-black text-green-500">{formatCurrency(stats.dailyIncome)}</p>
          </div>
          <div className="bg-[#1C1C1E]/50 backdrop-blur-md rounded-[2rem] p-5 border border-white/5 border-t-red-500/30">
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Today's Expenses</p>
            <p className="text-xl font-black text-red-400">{formatCurrency(stats.dailyExpenses)}</p>
          </div>
          <div className="bg-[#1C1C1E]/50 backdrop-blur-md rounded-[2rem] p-5 border border-white/5 border-t-green-500/30">
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Monthly Total Income</p>
            <p className="text-xl font-black text-green-500">{formatCurrency(stats.monthlyIncome)}</p>
          </div>
          <div className="bg-[#1C1C1E]/50 backdrop-blur-md rounded-[2rem] p-5 border border-white/5 border-t-red-500/30">
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Monthly Total Expenses</p>
            <p className="text-xl font-black text-red-400">{formatCurrency(stats.monthlyExpenses)}</p>
          </div>
        </div>

        {/* Ready for Collection Section */}
        {readyOrders.length > 0 && (
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Ready for Collection</h3>
                <h2 className="text-white font-black text-2xl tracking-tighter">Finished Jobs</h2>
              </div>
              <span className="bg-green-500/20 text-green-500 text-[10px] font-black px-3 py-1 rounded-full">{readyOrders.length} Orders</span>
            </div>

            {/* Search Bar */}
            <div className="relative group mb-6">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-gray-500 group-focus-within:text-[#D4AF37] transition-colors">
                <Search size={18} />
              </div>
              <input
                type="text"
                placeholder="Search by Name, Phone, or KT-Number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#1C1C1E] border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 transition-all placeholder:text-gray-600"
              />
            </div>

            {/* Orders List */}
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {readyOrders.filter(order =>
                order.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                order.customer_phone.includes(searchQuery) ||
                order.invoice_id.toLowerCase().includes(searchQuery.toLowerCase())
              ).map((order) => (
                <div key={order.id} className="bg-[#1C1C1E]/50 rounded-2xl p-4 border border-white/5">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] bg-[#D4AF37]/10 text-[#D4AF37] px-2 py-0.5 rounded-lg border border-[#D4AF37]/20 font-black tracking-widest uppercase">
                          {order.invoice_id}
                        </span>
                        <span className="text-[10px] bg-white/5 text-gray-400 px-2 py-0.5 rounded-lg border border-white/5 font-bold uppercase">
                          {order.items?.length || 0} Items
                        </span>
                      </div>
                      <h4 className="text-lg font-black text-white">{order.customer_name}</h4>
                      <p className="text-gray-400 text-sm">{order.customer_phone}</p>
                    </div>
                    <a href={`tel:${order.customer_phone}`} className="bg-[#34C759] text-white p-2 rounded-full hover:bg-[#34C759]/80 transition-colors">
                      <Phone size={16} fill="currentColor" />
                    </a>
                  </div>

                  <div className="flex justify-between items-center">
                    <div className="text-right">
                      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Balance Due</p>
                      <p className="text-lg font-black text-red-500">{formatCurrency(order.balance_due)}</p>
                    </div>

                    <div className="flex gap-2">
                      <Link
                        href={`/tailoring?id=${order.id}`}
                        className="bg-white/5 text-white px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-colors flex items-center"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => handleDeleteOrder(order.id)}
                        className="bg-red-500/20 text-red-500 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-red-500/30 transition-colors"
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => handleDeliverAndPrint(order)}
                        disabled={loading}
                        className="bg-[#D4AF37] text-black px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-[#D4AF37]/80 transition-colors"
                      >
                        {loading ? "..." : "Deliver & Print"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Pills - Cleaner look */}
        <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
          {["Sales Log", "Quick Booking", "Inventory Status"].map((label) => (
            <button key={label} className="bg-white/5 border border-white/5 py-3 px-6 rounded-2xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap hover:bg-[#D4AF37] hover:text-black transition-all active:scale-95">
              {label}
            </button>
          ))}
        </div>

        {/* Status List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-xs font-black text-gray-500 uppercase tracking-[0.3em]">Operational Status</h3>
            <span className="text-[10px] font-bold text-[#D4AF37]">{today}</span>
          </div>

          <Link href="/bookings?status=Returned">
            <StatusCard
              title="Returned / History"
              subtitle="Total rentals completed this month"
              count={stats.historyCount}
              icon={CheckCircle2}
              iconBgColor="bg-green-500/20"
              iconColor="text-green-500"
              className="bg-[#1C1C1E]/50 backdrop-blur-md cursor-pointer hover:bg-white/5 transition-all"
            />
          </Link>

          {stats.overdueRentals > 0 && (
            <Link href="/bookings?status=Active">
              <StatusCard
                title="Overdue Rentals"
                subtitle="Items past their expected return date"
                count={stats.overdueRentals}
                icon={AlertTriangle}
                iconBgColor="bg-red-500"
                iconColor="text-white"
                className="bg-red-500/10 backdrop-blur-md cursor-pointer hover:bg-red-500/20 transition-all border-red-500/50 animate-pulse"
              />
            </Link>
          )}

          <Link href="/bookings?status=Active">
            <StatusCard
              title="Active Rentals"
              subtitle="Blazers currently with customers"
              count={stats.activeRentals}
              icon={Calendar}
              iconBgColor="bg-[#D4AF37]"
              iconColor="text-black"
              className="bg-[#1C1C1E]/50 backdrop-blur-md cursor-pointer hover:bg-white/5 transition-all"
            />
          </Link>
          <Link href="/tailoring?status=Ready">
            <StatusCard
              title="Ready for Collection"
              subtitle="Finished jobs waiting for pickup"
              count={stats.readyForCollection}
              icon={Truck}
              iconBgColor="bg-green-500/20"
              iconColor="text-green-500"
              className="bg-[#1C1C1E]/50 backdrop-blur-md cursor-pointer hover:bg-white/5 transition-all border-green-500/10"
            />
          </Link>
          <Link href="/inventory">
            <StatusCard
              title="Available Inventory"
              subtitle="Blazers ready to be rented"
              count={stats.availableInventory}
              icon={Clock}
              iconBgColor="bg-blue-500/10"
              iconColor="text-blue-500"
              className="bg-[#1C1C1E]/50 backdrop-blur-md cursor-pointer hover:bg-white/5 transition-all border-[#D4AF37]/10"
            />
          </Link>
        </div>

      </main>
      <BottomNavigation />
    </div>
  );
}
