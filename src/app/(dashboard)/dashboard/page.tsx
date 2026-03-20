"use client";

import React from "react";
import {
  Calendar,
  Clock,
  Truck,
  CheckCircle2,
  AlertTriangle,
  Download,
  TrendingUp,
  Users,
  ShoppingBag,
  DollarSign,
  ChevronRight,
  ArrowUpRight,
  Receipt
} from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { cn, formatCurrency } from "@/lib/utils";
import { FestiveAlert } from "@/components/FestiveAlert";
import { GlobalSearch } from "@/components/GlobalSearch";
import { generateFinancialReport } from "@/lib/generateFinancialReport";
import { format } from "date-fns";
import { getDashboardSnapshot } from "@/lib/firebase-db";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  Legend,
  PieChart,
  Pie,
  Cell
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from "@/components/ui/Card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import { BottomNavigation } from "@/components/BottomNavigation";

const GOLD = "#D4AF37";

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
    netProfit: 0,
    availableInventory: 0,
    rentalTotal: 0,
    tailoringTotal: 0
  });
  const [chartData, setChartData] = React.useState<any[]>([]);
  const [monthlyChartData, setMonthlyChartData] = React.useState<any[]>([]);
  const [recentActivity, setRecentActivity] = React.useState<any[]>([]);
  const [reportLoading, setReportLoading] = React.useState(false);

  const fetchStats = async () => {
    const snapshot = await getDashboardSnapshot();
    setChartData(snapshot.chartData);
    setMonthlyChartData(snapshot.monthlyChartData);
    setRecentActivity(snapshot.recentActivity);
    setStats(snapshot.stats);
  };

  React.useEffect(() => {
    setIsLoaded(true);
    fetchStats();
  }, []);

  if (!isLoaded) return <div className="min-h-screen bg-black" />;

  const splitData = [
    { name: 'Rentals', value: stats.rentalTotal, color: GOLD },
    { name: 'Tailoring', value: stats.tailoringTotal, color: '#FFFFFF' }
  ];

  const StatCard = ({ title, value, subtitle, icon: Icon, color, href }: any) => (
    <Link href={href}>
      <Card className="hover:bg-white/10 transition-all cursor-pointer group border-white/5">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-xs font-black text-gray-400 uppercase tracking-widest">{title}</CardTitle>
          <div className={cn("p-2 rounded-lg bg-white/5", color)}>
            <Icon size={16} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-black tracking-tighter text-white">{value}</div>
          <p className="text-[10px] text-gray-500 font-medium mt-1">{subtitle}</p>
          <div className="mt-4 flex items-center text-[10px] font-bold text-[#D4AF37] opacity-0 group-hover:opacity-100 transition-opacity">
            View Details <ArrowUpRight size={10} className="ml-1" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );

  return (
    <div className="min-h-screen bg-transparent pb-24">
      <main className="p-4 space-y-6">
        <FestiveAlert />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-white tracking-tighter">Dashboard</h1>
            <p className="text-gray-400 text-sm font-medium">Welcome back to Kabaya Hub</p>
          </div>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={async () => {
              setReportLoading(true);
              await generateFinancialReport();
              setReportLoading(false);
            }}
            disabled={reportLoading}
            className="bg-[#D4AF37] hover:bg-[#D4AF37]/90 px-6 py-3 rounded-2xl flex items-center justify-center gap-2 border border-[#D4AF37]/20 transition-all shadow-lg shadow-[#D4AF37]/10"
          >
            {reportLoading ? (
              <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
            ) : (
              <Download size={18} className="text-black" />
            )}
            <span className="text-sm font-black text-black">Generate Monthly Report</span>
          </motion.button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            title="Monthly Income"
            value={formatCurrency(stats.monthlyIncome)}
            subtitle="Total earnings this month"
            icon={TrendingUp}
            color="text-green-500"
            href="/expenses"
          />
          <StatCard
            title="Active Rentals"
            value={stats.activeRentals}
            subtitle="Blazers items currently out"
            icon={ShoppingBag}
            color="text-[#D4AF37]"
            href="/bookings?status=Active"
          />
          <StatCard
            title="Overdue"
            value={stats.overdueRentals}
            subtitle="Items past return date"
            icon={AlertTriangle}
            color={stats.overdueRentals > 0 ? "text-red-500" : "text-gray-500"}
            href="/bookings?status=Active"
          />
          <StatCard
            title="Ready Collection"
            value={stats.readyForCollection}
            subtitle="Tailoring waiting for pickup"
            icon={Truck}
            color="text-blue-500"
            href="/tailoring?status=Completed"
          />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg font-black tracking-tight flex items-center gap-2">
                <DollarSign size={18} className="text-[#D4AF37]" />
                Revenue Breakdown
              </CardTitle>
              <CardDescription>Daily income trend for the current month</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={GOLD} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={GOLD} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#6B7280', fontSize: 10, fontWeight: 'bold' }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#6B7280', fontSize: 10, fontWeight: 'bold' }}
                      tickFormatter={(val) => `Rs.${val/1000}k`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1c1c1e',
                        borderColor: 'rgba(255,255,255,0.1)',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        color: '#fff'
                      }}
                      itemStyle={{ color: GOLD }}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke={GOLD}
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorRev)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-black tracking-tight flex items-center gap-2">
                <Users size={18} className="text-[#D4AF37]" />
                Business Split
              </CardTitle>
              <CardDescription>Rentals vs Tailoring Income</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center flex-col items-center">
              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={splitData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {splitData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1c1c1e',
                        borderColor: 'rgba(255,255,255,0.1)',
                        borderRadius: '12px',
                        fontSize: '11px'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 w-full space-y-2">
                {splitData.map((item) => (
                  <div key={item.name} className="flex items-center justify-between text-xs font-bold">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-gray-400">{item.name}</span>
                    </div>
                    <span className="text-white">{formatCurrency(item.value)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Global Search Bar */}
        <GlobalSearch />

        {/* Recent Activity Section */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg font-black tracking-tight">Recent Activity</CardTitle>
              <CardDescription>Latest bookings and tailoring orders</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentActivity.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-bold text-white pr-4">
                      {item.customer_name}
                      <p className="text-[10px] text-gray-500 font-medium">
                        {format(new Date(item.created_at), 'MMM dd, h:mm a')}
                      </p>
                    </TableCell>
                    <TableCell>
                      <span className={cn(
                        "px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
                        item.type === 'Rental' ? "bg-[#D4AF37]/10 text-[#D4AF37]" : "bg-blue-500/10 text-blue-500"
                      )}>
                        {item.type}
                      </span>
                    </TableCell>
                    <TableCell className="font-bold text-white whitespace-nowrap">
                      {formatCurrency(item.total_amount)}
                    </TableCell>
                    <TableCell>
                      <span className={cn(
                        "px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
                        item.status === 'Returned' || item.status === 'Completed' ? "bg-green-500/10 text-green-500" :
                        item.status === 'Cancelled' ? "bg-red-500/10 text-red-500" : "bg-white/10 text-gray-300"
                      )}>
                        {item.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={item.type === 'Rental' ? `/bookings` : `/tailoring`}
                        className="text-[#D4AF37] hover:underline text-xs font-black inline-flex items-center"
                      >
                        View <ChevronRight size={14} />
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

      </main>
      <BottomNavigation />
    </div>
  );
}
