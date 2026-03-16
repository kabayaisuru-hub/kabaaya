"use client";
import React, { useState, useEffect, useRef, Suspense, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Search,
  Plus,
  X,
  ArrowLeft,
  Scissors,
  User,
  Phone,
  CreditCard,
  CheckCircle2,
  Clock,
  Shirt,
  AlertTriangle,
  PhoneCall,
  Printer,
  Trash2,
  Pencil,
  Eye,
  ChevronRight,
  BadgeCheck,
  MapPin,
  Fingerprint,
  Calendar,
  Ruler,
  PlusCircle,
  FileText,
  Download
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { AppleLoader } from "@/components/AppleLoader";
import { cn, formatCurrency } from "@/lib/utils";
// import { TailoringReceiptTemplate } from "@/components/TailoringReceiptTemplate";
import { generatePDFReceipt, generateTailoringPDF } from "@/lib/generatePDF";
import { format, isBefore, startOfToday } from "date-fns";

interface Customer {
  id: string;
  name: string;
  phone: string;
  address?: string;
}

interface InventoryItem {
  id: string;
  item_code: string;
  name: string;
  category: string;
  unit_selling_price: number;
  current_stock_quantity: number;
}

interface TailoringItem {
  id?: string;
  item_code: string;
  item_description: string;
  fabric_source: 'Shop Stock' | 'Customer Provided';
  inventory_item_id?: string;
  measurement_unit: 'm' | 'yd';
  quantity_used: number;
  fabric_rate: number;
  total_fabric_cost: number;
  stitching_price: number;
  item_total: number;
}

interface TailoringOrder {
  id: string;
  invoice_id: string;
  cr_book_page_number: string;
  customer_name: string;
  customer_address: string;
  customer_phone: string;
  total_amount: number;
  advance_paid: number;
  balance_due: number;
  status: 'Pending' | 'Completed';
  due_date: string;
  notes?: string;
  discount_amount: number;
  discount_type: 'fixed' | 'percentage';
  grand_total: number;
  created_at: string;
  items?: TailoringItem[];
}

// ─────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────
const toMeters = (qty: number, unit: 'm' | 'yd') =>
  unit === 'yd' ? qty * 0.9144 : qty;

export default function TailoringPage() {
  return (
    <Suspense fallback={<AppleLoader />}>
      <TailoringContent />
    </Suspense>
  );
}

function TailoringContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get("status");

  const [orders, setOrders] = useState<TailoringOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<TailoringOrder | null>(null);
  const [deletingOrder, setDeletingOrder] = useState<TailoringOrder | null>(null);
  const [nextInvoiceId, setNextInvoiceId] = useState("KT-2000");
  // const receiptRef = useRef<HTMLDivElement>(null);
  const [printData, setPrintData] = useState<any>(null);
  const [fabricInventory, setFabricInventory] = useState<InventoryItem[]>([]);

  // Form State
  const [formData, setFormData] = useState({
    invoice_id: "",
    cr_book_page_number: "",
    customer_name: "",
    customer_address: "",
    customer_phone: "",
    due_date: "",
    notes: "",
    advance_paid: 0,
    discount_amount: 0,
    discount_type: 'fixed' as 'fixed' | 'percentage',
    items: [] as TailoringItem[]
  });

  const fetchData = async () => {
    setLoading(true);
    const { data: oData, error: oError } = await supabase
      .from('tailoring_orders')
      .select('*, items:tailoring_items(*)')
      .order('created_at', { ascending: false });

    if (oError) console.error("Error fetching tailoring orders:", oError);
    else setOrders(oData || []);

    setLoading(false);
  };

  const fetchNextId = async () => {
    const { data } = await supabase
      .from('tailoring_orders')
      .select('cr_book_page_number')
      .not('cr_book_page_number', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1);

    if (data && data.length > 0 && data[0].cr_book_page_number) {
      const lastVal = data[0].cr_book_page_number;
      // Try to parse if it's KT-XXXX format
      const match = lastVal.match(/KT-(\d+)/);
      if (match) {
        const num = parseInt(match[1]);
        return `KT-${num + 1}`;
      }
    }
    // Default: find highest KT number from all records
    const { data: allData } = await supabase
      .from('tailoring_orders')
      .select('cr_book_page_number')
      .not('cr_book_page_number', 'is', null);

    if (allData && allData.length > 0) {
      const nums = allData
        .map((r: any) => { const m = (r.cr_book_page_number || '').match(/KT-(\d+)/); return m ? parseInt(m[1]) : 0; })
        .filter((n: number) => n > 0);
      if (nums.length > 0) {
        const max = Math.max(...nums);
        return `KT-${max + 1}`;
      }
    }
    return 'KT-1900';
  };

  const loadNextId = async () => {
    const next = await fetchNextId();
    setNextInvoiceId(next);
    return next;
  };

  useEffect(() => {
    fetchData();
    loadNextId();
    fetchFabricInventory();
  }, []);

  const fetchFabricInventory = async () => {
    const { data } = await supabase
      .from('inventory')
      .select('id, item_code, name, category, unit_selling_price, current_stock_quantity')
      .eq('category', 'Fabric')
      .eq('status', 'Available')
      .order('name');

    if (data) setFabricInventory(data);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customer_name || !formData.customer_phone || formData.items.length === 0) {
      alert("Please fill in customer details and add at least one item.");
      return;
    }

    setSaving(true);
    const orderPayload = {
      cr_book_page_number: formData.cr_book_page_number,
      customer_name: formData.customer_name,
      customer_address: formData.customer_address,
      customer_phone: formData.customer_phone,
      due_date: formData.due_date,
      notes: formData.notes,
      advance_paid: Number(formData.advance_paid),
      discount_amount: Number(formData.discount_amount),
      discount_type: formData.discount_type,
      total_amount: formData.items.reduce((acc, curr) => acc + curr.item_total, 0),
      grand_total: calculateGrandTotal(),
      balance_due: calculateGrandTotal() - Number(formData.advance_paid),
      status: 'Pending'
    };

    const { data: orderData, error: orderError } = await supabase
      .from('tailoring_orders')
      .insert([orderPayload])
      .select()
      .single();

    if (orderError) {
      alert("Error creating order: " + orderError.message);
    } else if (orderData) {
      // Insert Job Card Items
      const itemsPayload = formData.items.map(item => ({
        ...item,
        order_id: orderData.id
      }));

      const { error: itemsError } = await supabase
        .from('tailoring_items')
        .insert(itemsPayload);

      if (itemsError) {
        alert("Order created but items failed: " + itemsError.message);
      } else {
        // Inventory Integration: Deduct stock for items using shop fabric
        for (const item of formData.items) {
          if (item.inventory_item_id && item.fabric_source === 'Shop Stock' && item.quantity_used > 0) {
            // First, get current stock
            const { data: currentItem } = await supabase
              .from('inventory')
              .select('current_stock_quantity')
              .eq('id', item.inventory_item_id)
              .single();

            if (currentItem) {
              const qtyInMeters = toMeters(Number(item.quantity_used), (item as any).measurement_unit || 'm');
              const newStock = Math.max(0, Number(currentItem.current_stock_quantity) - qtyInMeters);
              await supabase
                .from('inventory')
                .update({ current_stock_quantity: newStock })
                .eq('id', item.inventory_item_id);
            }
          }
        }
      }

      setIsFormOpen(false);
      resetForm();
      fetchData();
      const next = await fetchNextId();
      setNextInvoiceId(next);
    }
    setSaving(false);
  };

  const handleStatusUpdate = async (orderId: string, newStatus: 'Pending' | 'Completed') => {
    setSaving(true);
    const { error } = await supabase
      .from('tailoring_orders')
      .update({ status: newStatus })
      .eq('id', orderId);

    if (error) alert("Status update failed: " + error.message);
    else {
      if (selectedOrder) setSelectedOrder({ ...selectedOrder, status: newStatus });
      fetchData();
    }
    setSaving(false);
  };

  const handleDeleteOrder = async () => {
    if (!deletingOrder) return;
    setSaving(true);
    
    await supabase.from('tailoring_items').delete().eq('tailoring_order_id', deletingOrder.id);
    const { error } = await supabase.from('tailoring_orders').delete().eq('id', deletingOrder.id);
    
    if (error) alert("Failed to delete order: " + error.message);
    else {
      setDeletingOrder(null);
      fetchData();
    }
    setSaving(false);
  };

  const resetForm = () => {
    setFormData({
      invoice_id: "",
      cr_book_page_number: nextInvoiceId,
      customer_name: "",
      customer_address: "",
      customer_phone: "",
      due_date: "",
      notes: "",
      advance_paid: 0,
      discount_amount: 0,
      discount_type: 'fixed' as 'fixed' | 'percentage',
      items: []
    });
  };

  const calculateGrandTotal = () => {
    const total = formData.items.reduce((acc, curr) => acc + curr.item_total, 0);
    if (formData.discount_type === 'percentage') {
      return total - (total * (formData.discount_amount / 100));
    }
    return Math.max(0, total - formData.discount_amount);
  };


  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, {
        item_code: "",
        item_description: "",
        fabric_source: 'Shop Stock',
        inventory_item_id: "",
        measurement_unit: 'm' as 'm' | 'yd',
        quantity_used: 0,
        fabric_rate: 0,
        total_fabric_cost: 0,
        stitching_price: 0,
        item_total: 0
      }]
    });
  };


  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...formData.items];
    let item = { ...newItems[index] };

    // Update the specific field
    if (field === 'inventory_select') {
      const selectedFabric = fabricInventory.find(f => f.id === value);
      if (selectedFabric) {
        item.inventory_item_id = selectedFabric.id;
        item.item_code = selectedFabric.item_code; // Sync the code!
        item.fabric_rate = selectedFabric.unit_selling_price || 0;
        item.item_description = item.item_description || selectedFabric.name;
      } else {
        item.inventory_item_id = "";
        item.item_code = "";
        item.fabric_rate = 0;
      }
    } else {
      item = { ...item, [field]: value };
    }

    // Logic for Fabric Source change
    if (field === 'fabric_source' && value === 'Customer Provided') {
      item.inventory_item_id = "";
      item.item_code = item.item_code || ""; // Keep code if already typed? Or clear? Usually clear for provider
      item.fabric_rate = 0;
      item.total_fabric_cost = 0;
    }

    // Recalculate Fabric Cost (Quantity * Rate, aware of m/yd)
    if (item.fabric_source === 'Shop Stock') {
      const qty = Number(item.quantity_used) || 0;
      const rate = Number(item.fabric_rate) || 0;
      const unit = item.measurement_unit || 'm';
      
      // If rate is per meter, we convert quantity to meters first
      item.total_fabric_cost = toMeters(qty, unit) * rate;
    } else {
      item.total_fabric_cost = 0;
    }

    // Recalculate Item Total (Fabric + Stitching)
    item.item_total = Number(item.total_fabric_cost) + Number(item.stitching_price || 0);

    newItems[index] = item;
    setFormData({ ...formData, items: newItems });
  };

  const removeItem = (index: number) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index)
    });
  };

  const handlePrint = async (order: TailoringOrder) => {
    setLoading(true);
    const success = await generateTailoringPDF(order, `JobCard_${order.invoice_id}.pdf`);
    setLoading(false);
  };

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const matchesSearch = o.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.customer_phone.includes(searchQuery) ||
        o.invoice_id.toLowerCase().includes(searchQuery.toLowerCase());

      if (initialStatus === "Completed") return matchesSearch && o.status === "Completed";
      return matchesSearch && o.status !== "Completed";
    });
  }, [orders, searchQuery, initialStatus]);

  const todayStr = startOfToday().toISOString().split('T')[0];
  return (
    <div className="p-4 space-y-6 max-w-lg mx-auto pb-40">
      {/* Global loader during actions */}
      <AnimatePresence>
        {(loading || saving) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-[#121212]/80 backdrop-blur-sm flex items-center justify-center"
          >
            <AppleLoader />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col gap-4">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-gray-500 hover:text-white transition-colors group">
          <div className="p-2 rounded-xl bg-white/5 border border-white/5 group-hover:bg-white/10 transition-colors">
            <ArrowLeft size={16} />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest">Dash Board</span>
        </Link>
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black tracking-tight underline decoration-[#D4AF37]/30">
              {initialStatus === "Delivered" ? "Delivery History" : "Tailoring"}
            </h1>
            <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-1">
              {initialStatus === "Delivered" ? "Completed Jobs" : "Bespoke Management"}
            </p>
          </div>
          <button
            onClick={() => { resetForm(); setIsFormOpen(true); }}
            className="w-12 h-12 bg-[#D4AF37] rounded-2xl flex items-center justify-center text-black shadow-lg shadow-[#D4AF37]/20 active:scale-95 transition-transform"
          >
            <Plus size={24} strokeWidth={3} />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative group">
        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-gray-500 group-focus-within:text-[#D4AF37] transition-colors">
          <Search size={18} />
        </div>
        <input
          type="text"
          placeholder="Search items, invoices, customers..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-[#1C1C1E] border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 transition-all placeholder:text-gray-600"
        />
      </div>

      <div className="space-y-3">
        {!loading && (filteredOrders?.length || 0) === 0 ? (
          <div className="text-center py-12 bg-white/5 rounded-[2.5rem] border border-dashed border-white/10">
            <p className="text-gray-500 text-sm font-medium">No tailoring orders found</p>
          </div>
        ) : (
          filteredOrders.map((order) => {
            const isPending = order.status === 'Pending';
            const isOverdue = isPending && order.due_date && isBefore(new Date(order.due_date), startOfToday());

            return (
              <motion.div
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                key={order.id}
                className={cn(
                  "group relative bg-[#1C1C1E] border border-white/5 rounded-[2.5rem] overflow-hidden transition-all duration-300 hover:border-[#D4AF37]/30 shadow-xl",
                  isOverdue ? "ring-1 ring-red-500/20" : ""
                )}
              >
                {/* Top Row: Bill No & Status */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-white/5 bg-white/[0.02]">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-[#D4AF37] animate-pulse" />
                    <span className="text-xs font-black tracking-[0.2em] text-[#D4AF37] uppercase">
                      {order.invoice_id}
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStatusUpdate(order.id, isPending ? 'Completed' : 'Pending');
                    }}
                    className={cn(
                      "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all active:scale-90 border",
                      isPending 
                        ? "bg-amber-500/10 text-amber-500 border-amber-500/20 shadow-lg shadow-amber-500/10" 
                        : "bg-[#1e293b] text-blue-300 border-white/10 shadow-lg"
                    )}
                  >
                    {order.status === 'Completed' ? 'Complete' : order.status}
                  </button>
                </div>

                {/* Middle Content */}
                <div className="p-7 space-y-5" onClick={() => setSelectedOrder(order)}>
                  <div className="space-y-1">
                    <h3 className="text-2xl font-black tracking-tight text-white group-hover:text-[#D4AF37] transition-colors line-clamp-1">
                      {order.customer_name}
                    </h3>
                    <p className="text-sm font-bold text-gray-500 flex items-center gap-2">
                       <Phone size={14} className="text-[#D4AF37]/50" />
                       {order.customer_phone}
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-4 pt-2">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest flex items-center gap-1.5">
                        <Calendar size={10} className="text-[#D4AF37]" />
                        Collection Date
                      </span>
                      <span className={cn(
                        "text-sm font-black",
                        isOverdue ? "text-red-400" : "text-white"
                      )}>
                        {order.due_date ? format(new Date(order.due_date), "MMM dd, yyyy") : "TBD"}
                      </span>
                    </div>
                    
                    <div className="text-right flex flex-col gap-1">
                      <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Balance</span>
                      <span className="text-lg font-black text-[#D4AF37]">
                        {formatCurrency(order.balance_due)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bottom Action Bar */}
                <div className="grid grid-cols-2 gap-px bg-white/5 border-t border-white/5 relative z-10">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePrint(order);
                    }}
                    className="flex items-center justify-center gap-2 py-5 bg-transparent hover:bg-white/5 transition-colors group/btn active:scale-95 duration-200"
                  >
                    <Download size={18} className="text-[#D4AF37] group-hover/btn:translate-y-0.5 transition-transform" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#D4AF37]">Download PDF</span>
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      // Logic for edit order would go here, using setSelectedOrder for now
                      setSelectedOrder(order);
                      setIsFormOpen(true);
                      setFormData({
                        invoice_id: order.invoice_id,
                        cr_book_page_number: order.cr_book_page_number,
                        customer_name: order.customer_name,
                        customer_address: order.customer_address,
                        customer_phone: order.customer_phone,
                        due_date: order.due_date,
                        notes: order.notes || "",
                        advance_paid: order.advance_paid,
                        discount_amount: order.discount_amount,
                        discount_type: order.discount_type,
                        items: order.items || []
                      });
                    }}
                    className="flex items-center justify-center gap-2 py-5 bg-transparent hover:bg-white/5 transition-colors group/btn border-l border-white/5 active:scale-95 duration-200"
                  >
                    <Pencil size={18} className="text-white group-hover/btn:rotate-12 transition-transform" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-white">Edit Order</span>
                  </button>
                </div>

                {/* Primary Action Bar (Complete / Delete) */}
                <div className="grid grid-cols-2 gap-px bg-white/5 border-t border-white/5 relative z-10">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStatusUpdate(order.id, 'Completed');
                    }}
                    className="flex items-center justify-center gap-2 py-5 bg-[#1e293b] hover:bg-[#1e293b]/80 transition-colors group/btn active:scale-95 duration-200"
                  >
                    <CheckCircle2 size={18} className="text-blue-300 group-hover/btn:scale-110 transition-transform" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-blue-300">Complete</span>
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeletingOrder(order);
                    }}
                    className="flex items-center justify-center gap-2 py-5 bg-red-500/5 hover:bg-red-500/10 transition-colors group/btn border-l border-white/5 active:scale-95 duration-200"
                  >
                    <Trash2 size={18} className="text-red-500 group-hover/btn:scale-110 transition-transform" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-red-500">Delete</span>
                  </button>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deletingOrder && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDeletingOrder(null)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="bg-[#1C1C1E] w-full max-w-sm rounded-[3rem] p-8 relative border border-white/10 shadow-2xl text-center">
              <div className="w-16 h-16 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto mb-6">
                <AlertTriangle size={32} />
              </div>
              <h3 className="text-2xl font-black text-white mb-2">Delete Order?</h3>
              <p className="text-gray-400 text-sm font-bold mb-8">This action cannot be undone. Are you sure you want to permanently delete <span className="text-white">{deletingOrder.invoice_id}</span> ({deletingOrder.customer_name})?</p>
              <div className="flex gap-4">
                <button onClick={() => setDeletingOrder(null)} className="flex-1 py-4 bg-white/5 rounded-2xl text-white font-black uppercase tracking-widest text-xs active:scale-95 transition-all outline-none">Cancel</button>
                <button onClick={handleDeleteOrder} disabled={saving} className="flex-1 py-4 bg-red-500 rounded-2xl text-white font-black uppercase tracking-widest text-xs active:scale-95 transition-all disabled:opacity-50 flex justify-center items-center gap-2 outline-none">
                  {saving ? <AppleLoader /> : "Delete"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modals will be added here */}
      <TailoringModals
        isFormOpen={isFormOpen}
        setIsFormOpen={setIsFormOpen}
        selectedOrder={selectedOrder}
        setSelectedOrder={setSelectedOrder}
        formData={formData}
        setFormData={setFormData}
        nextInvoiceId={nextInvoiceId}
        saving={saving}
        handleSave={handleSave}
        addItem={addItem}
        updateItem={updateItem}
        removeItem={removeItem}
        handleStatusUpdate={handleStatusUpdate}
        handlePrint={handlePrint}
        fabricInventory={fabricInventory}
        calculateGrandTotal={calculateGrandTotal}
      />
    </div>
  );
}

// ─────────────────────────────────────────────
// Searchable Fabric Combobox Component
// ─────────────────────────────────────────────
function FabricCombobox({
  fabricInventory,
  value,
  onSelect,
}: {
  fabricInventory: any[];
  value: string; // currently selected inventory_item_id
  onSelect: (fabric: any) => void;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = fabricInventory.find((f) => f.id === value);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = query.trim() === ''
    ? fabricInventory
    : fabricInventory.filter((f) =>
        f.item_code.toLowerCase().includes(query.toLowerCase()) ||
        f.name.toLowerCase().includes(query.toLowerCase())
      );

  const notFound = query.trim() !== '' && filtered.length === 0;

  return (
    <div ref={ref} className="relative">
      {/* Input */}
      <div
        className={cn(
          'flex items-center gap-3 bg-black/30 border rounded-2xl px-4 py-3.5 transition-all cursor-text',
          open ? 'border-[#D4AF37]/50 ring-1 ring-[#D4AF37]/20' : 'border-white/5'
        )}
        onClick={() => { setOpen(true); setQuery(''); }}
      >
        <Search size={15} className="text-gray-600 shrink-0" />
        {open ? (
          <input
            autoFocus
            type="text"
            value={query}
            placeholder="Type code or name..."
            onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
            className="flex-1 bg-transparent text-sm font-bold text-white placeholder:text-gray-700 focus:outline-none"
          />
        ) : (
          <span className={cn('flex-1 text-sm font-bold truncate', selected ? 'text-white' : 'text-gray-700')}>
            {selected ? `[${selected.item_code}] ${selected.name}` : '-- Search by Code or Name --'}
          </span>
        )}
        {selected && !open && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onSelect(null); setQuery(''); }}
            className="text-gray-600 hover:text-red-400 transition-colors p-1 rounded-lg"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 right-0 top-full mt-2 z-[300] bg-[#1C1C1E] border border-white/10 rounded-2xl overflow-hidden shadow-2xl max-h-60 overflow-y-auto"
          >
            {notFound ? (
              <div className="px-5 py-4 text-center">
                <p className="text-xs font-black text-red-400 uppercase tracking-widest">Not Found</p>
                <p className="text-[10px] text-gray-600 mt-1">No fabric matches "{query}"</p>
              </div>
            ) : (
              filtered.map((fabric) => (
                <button
                  key={fabric.id}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onSelect(fabric);
                    setOpen(false);
                    setQuery('');
                  }}
                  className={cn(
                    'w-full text-left px-5 py-4 border-b border-white/5 last:border-0 transition-colors active:bg-[#D4AF37]/10',
                    value === fabric.id ? 'bg-[#D4AF37]/10' : 'hover:bg-white/5'
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-black text-[#D4AF37] bg-[#D4AF37]/10 px-2 py-0.5 rounded-lg shrink-0">{fabric.item_code}</span>
                        <span className="text-sm font-bold text-white truncate">{fabric.name}</span>
                      </div>
                      <p className="text-[10px] text-gray-500 font-bold mt-0.5">Rs. {fabric.unit_selling_price}/m</p>
                    </div>
                    <span className={cn(
                      'text-[9px] font-black px-2 py-1 rounded-lg shrink-0',
                      fabric.current_stock_quantity < 2 ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'
                    )}>
                      {fabric.current_stock_quantity}m
                    </span>
                  </div>
                </button>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TailoringModals({
  isFormOpen, setIsFormOpen, selectedOrder, setSelectedOrder,
  formData, setFormData, nextInvoiceId, saving,
  handleSave, addItem, updateItem, removeItem, handleStatusUpdate,
  handlePrint, fabricInventory, calculateGrandTotal
}: any) {
  return (
    <AnimatePresence>
      {/* New Order Form (Placeholder for now, will implement full multi-item form) */}
      {isFormOpen && (
        <div key="form-modal" className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsFormOpen(false)} className="absolute inset-0 bg-black/80 backdrop-blur-xl" />
          <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="bg-[#1C1C1E] w-full max-w-lg rounded-[3rem] p-8 relative border border-white/10 shadow-2xl overflow-y-auto max-h-[90vh] custom-scrollbar">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-2xl font-black tracking-tight">{formData.cr_book_page_number || nextInvoiceId}</h2>
                <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em] mt-1">
                  Bill No · Auto-assigned · Editable
                </p>
              </div>
              <button onClick={() => setIsFormOpen(false)} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-gray-500 hover:text-white transition-colors"><X size={20} /></button>
            </div>

            <form onSubmit={handleSave} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2 px-1">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Customer Name</label>
                  <input type="text" placeholder="Full Name..." value={formData.customer_name} onChange={e => setFormData({ ...formData, customer_name: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm focus:outline-none focus:ring-1 focus:ring-[#D4AF37]/50 transition-all font-bold" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 px-1">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Phone</label>
                    <input type="tel" placeholder="Mobile..." value={formData.customer_phone} onChange={e => setFormData({ ...formData, customer_phone: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm focus:outline-none focus:ring-1 focus:ring-[#D4AF37]/50 transition-all font-bold" />
                  </div>
                  <div className="space-y-2 px-1">
                    <label className="text-[10px] font-black text-[#D4AF37]/70 uppercase tracking-widest ml-1">Bill No. ✏️</label>
                    <input
                      type="text"
                      placeholder={nextInvoiceId}
                      value={formData.cr_book_page_number || nextInvoiceId}
                      onChange={e => setFormData({ ...formData, cr_book_page_number: e.target.value })}
                      className="w-full bg-[#D4AF37]/5 border border-[#D4AF37]/30 rounded-2xl p-4 text-sm focus:outline-none focus:ring-1 focus:ring-[#D4AF37]/50 transition-all font-black text-[#D4AF37]"
                    />
                  </div>
                </div>
                <div className="space-y-2 px-1">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Due Date</label>
                  <input type="date" value={formData.due_date} onChange={e => setFormData({ ...formData, due_date: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm focus:outline-none focus:ring-1 focus:ring-[#D4AF37]/50 transition-all font-bold text-white invert-calendar-icon" />
                </div>

                {/* Multi-Item Component (Job Card) */}
                <div className="space-y-4 pt-4">
                  <div className="flex items-center justify-between px-1 mb-2">
                    <h3 className="text-[10px] font-black text-[#D4AF37] uppercase tracking-[0.3em]">Job Card Items</h3>
                  </div>

                  {formData.items.length === 0 && (
                    <div className="text-center py-8 bg-white/[0.02] rounded-3xl border border-dashed border-white/10">
                      <Scissors size={24} className="text-gray-600 mx-auto mb-2" />
                      <p className="text-gray-600 text-xs font-bold">Tap 'Add Item' to start the job card</p>
                    </div>
                  )}

                  {formData.items.map((item: any, index: number) => {
                    const selectedFabric = fabricInventory.find((f: any) => f.id === item.inventory_item_id);
                    const stockInMeters = selectedFabric?.current_stock_quantity ?? 0;
                    
                    // Validation Logic
                    const qtyInMeters = toMeters(Number(item.quantity_used), item.measurement_unit || 'm');
                    const isInsufficient = item.fabric_source === 'Shop Stock' && selectedFabric && qtyInMeters > stockInMeters;

                    const displayStock = item.measurement_unit === 'yd'
                      ? (stockInMeters / 0.9144).toFixed(2)
                      : stockInMeters.toFixed(2);
                    const isLowStock = stockInMeters < 2;

                    return (
                      <div key={index} className="bg-white/[0.03] rounded-3xl border border-white/10 overflow-hidden">
                        {/* Item Header */}
                        <div className="flex items-center justify-between px-5 py-3 border-b border-white/5 bg-white/[0.02]">
                          <span className="text-[9px] font-black text-[#D4AF37] uppercase tracking-[0.3em]">Item {index + 1}</span>
                          <button type="button" onClick={() => removeItem(index)} className="p-2 rounded-lg bg-red-500/10 text-red-400 active:scale-90 transition-transform">
                            <Trash2 size={14} />
                          </button>
                        </div>

                        <div className="p-5 space-y-4">
                          {/* Item Code + Description */}
                          <div className="space-y-3">
                            <div className="space-y-1">
                              <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Item Code</label>
                              <input type="text" placeholder="e.g. SHT-001" value={item.item_code} onChange={e => updateItem(index, 'item_code', e.target.value)} className="w-full bg-black/30 border border-white/5 rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#D4AF37]/40 font-bold text-white placeholder:text-gray-700 transition-all" />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Description</label>
                              <input type="text" placeholder="e.g. Slim Fit Shirt..." value={item.item_description} onChange={e => updateItem(index, 'item_description', e.target.value)} className="w-full bg-black/30 border border-white/5 rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#D4AF37]/40 font-bold text-white placeholder:text-gray-700 transition-all" />
                            </div>
                          </div>

                          {/* Fabric Source Toggle */}
                          <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Fabric Source</label>
                            <div className="grid grid-cols-2 gap-2 bg-black/30 p-1.5 rounded-2xl border border-white/5">
                              {['Shop Stock', 'Customer Provided'].map((source) => (
                                <button
                                  key={source}
                                  type="button"
                                  onClick={() => updateItem(index, 'fabric_source', source)}
                                  className={cn(
                                    "py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
                                    item.fabric_source === source
                                      ? "bg-[#D4AF37] text-black shadow-lg shadow-[#D4AF37]/20"
                                      : "text-gray-500 hover:text-white active:bg-white/5"
                                  )}
                                >
                                  {source === 'Shop Stock' ? '🏪 Shop' : '🧵 Customer'}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Shop Stock: Fabric Lookup */}
                          {item.fabric_source === 'Shop Stock' && (
                            <div className="space-y-3">
                              <div className="space-y-1.5">
                                <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest flex items-center justify-between">
                                  Search Fabric by Code or Name
                                  {selectedFabric && (
                                    <span className={cn("text-[8px] font-black px-2 py-0.5 rounded-lg", isLowStock ? "bg-red-500/10 text-red-500" : "bg-green-500/10 text-green-500")}>
                                      Stock: {displayStock} {item.measurement_unit}
                                    </span>
                                  )}
                                </label>
                                <FabricCombobox
                                  fabricInventory={fabricInventory}
                                  value={item.inventory_item_id || ''}
                                  onSelect={(fabric) => updateItem(index, 'inventory_select', fabric?.id || '')}
                                />
                              </div>

                              {/* Quantity + Unit */}
                              <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                  <label className={cn("text-[9px] font-black uppercase tracking-widest", isInsufficient ? "text-red-500" : "text-gray-500")}>
                                    Quantity {isInsufficient && "— ⚠ Insufficient Stock!"}
                                  </label>
                                  <input 
                                    type="number" 
                                    step="0.1" 
                                    min="0" 
                                    value={item.quantity_used} 
                                    onChange={e => updateItem(index, 'quantity_used', parseFloat(e.target.value) || 0)} 
                                    className={cn(
                                      "w-full bg-black/30 border rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:ring-1 font-bold transition-all",
                                      isInsufficient 
                                        ? "border-red-500/50 text-red-500 focus:ring-red-500/40" 
                                        : "border-white/5 text-white focus:ring-[#D4AF37]/40"
                                    )} 
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Unit</label>
                                  <div className="grid grid-cols-2 gap-1.5 h-[50px] bg-black/30 border border-white/5 rounded-2xl p-1">
                                    {['m', 'yd'].map(u => (
                                      <button key={u} type="button" onClick={() => updateItem(index, 'measurement_unit', u)} className={cn("rounded-xl text-xs font-black uppercase transition-all", item.measurement_unit === u ? "bg-white text-black" : "text-gray-500")}>
                                        {u}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </div>

                              {/* Auto-calculated fabric price */}
                              <div className="flex items-center justify-between bg-[#D4AF37]/5 border border-[#D4AF37]/10 rounded-2xl px-4 py-3">
                                <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Fabric Cost</span>
                                <span className="text-sm font-black text-[#D4AF37]">{formatCurrency(item.total_fabric_cost)}</span>
                              </div>
                            </div>
                          )}

                          {/* Customer Provided: record quantity for reference only */}
                          {item.fabric_source === 'Customer Provided' && (
                            <div className="space-y-3">
                              <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                  <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Qty (Reference)</label>
                                  <input type="number" step="0.1" min="0" value={item.quantity_used} onChange={e => updateItem(index, 'quantity_used', parseFloat(e.target.value) || 0)} className="w-full bg-black/30 border border-white/5 rounded-2xl px-4 py-3.5 text-sm focus:outline-none font-bold text-white transition-all" />
                                </div>
                                <div className="space-y-1.5">
                                  <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Unit</label>
                                  <div className="grid grid-cols-2 gap-1.5 h-[50px] bg-black/30 border border-white/5 rounded-2xl p-1">
                                    {['m', 'yd'].map(u => (
                                      <button key={u} type="button" onClick={() => updateItem(index, 'measurement_unit', u)} className={cn("rounded-xl text-xs font-black uppercase transition-all", item.measurement_unit === u ? "bg-white text-black" : "text-gray-500")}>
                                        {u}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 rounded-2xl px-4 py-3">
                                <span className="text-lg">🧵</span>
                                <p className="text-[9px] font-black text-orange-500 uppercase tracking-widest">Customer Material — Fabric Price: Rs. 0.00</p>
                              </div>
                            </div>
                          )}

                          {/* Stitching Price */}
                          <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Stitching / Labour Charge</label>
                            <input type="number" min="0" value={item.stitching_price} onChange={e => updateItem(index, 'stitching_price', parseFloat(e.target.value) || 0)} className="w-full bg-[#D4AF37]/5 border border-[#D4AF37]/20 rounded-2xl px-4 py-3.5 text-sm font-black text-[#D4AF37] focus:outline-none focus:ring-1 focus:ring-[#D4AF37]/40 transition-all" placeholder="e.g. 1500" />
                          </div>

                          {/* Item Subtotal */}
                          <div className="flex justify-between items-center bg-white/5 rounded-2xl px-4 py-3 border border-white/5">
                            <p className="text-[9px] text-gray-500 font-black uppercase tracking-widest">Item Subtotal</p>
                            <p className="text-lg font-black text-white">{formatCurrency(item.item_total)}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  <button 
                    type="button" 
                    onClick={addItem} 
                    className="w-full bg-[#D4AF37]/10 border border-[#D4AF37]/20 text-[#D4AF37] font-black py-4 rounded-3xl active:scale-95 transition-transform flex items-center justify-center gap-2 mt-2 group hover:bg-[#D4AF37]/20"
                  >
                    <Plus size={18} className="group-hover:rotate-90 transition-transform duration-300" />
                    <span className="text-xs uppercase tracking-widest">Add Another Item</span>
                  </button>
                </div>

                <div className="space-y-4 pt-6 border-t border-white/5">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex justify-between">
                        Discount
                        <select 
                          value={formData.discount_type} 
                          onChange={e => setFormData({...formData, discount_type: e.target.value as any})}
                          className="bg-transparent text-[8px] border-none focus:ring-0 cursor-pointer text-[#D4AF37]"
                        >
                          <option value="fixed">Rs.</option>
                          <option value="percentage">%</option>
                        </select>
                      </label>
                      <input type="number" value={formData.discount_amount} onChange={e => setFormData({ ...formData, discount_amount: Number(e.target.value) })} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:outline-none font-bold text-white" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Advance Paid</label>
                      <input type="number" value={formData.advance_paid} onChange={e => setFormData({ ...formData, advance_paid: Number(e.target.value) })} className="w-full bg-green-500/10 border border-green-500/20 text-green-500 text-right font-black rounded-xl p-3 text-sm focus:outline-none" />
                    </div>
                  </div>

                  <div className="bg-white/5 rounded-2xl p-6 flex justify-between items-center group">
                    <div className="space-y-1">
                      <p className="text-xs font-black uppercase tracking-widest">Grand Total</p>
                      <p className="text-[9px] text-gray-500 font-bold italic line-through opacity-50">
                        Sub: {formatCurrency(formData.items.reduce((acc: number, curr: any) => acc + curr.item_total, 0))}
                      </p>
                    </div>
                    <p className="text-2xl font-black text-white">{formatCurrency(calculateGrandTotal())}</p>
                  </div>
                </div>
              </div>

              <button 
                type="submit" 
                disabled={saving || formData.items.some((item: any) => {
                  const fabric = fabricInventory.find((f: any) => f.id === item.inventory_item_id);
                  const qtyInMeters = toMeters(Number(item.quantity_used), item.measurement_unit || 'm');
                  return item.fabric_source === 'Shop Stock' && fabric && qtyInMeters > fabric.current_stock_quantity;
                })} 
                className="w-full bg-[#D4AF37] disabled:bg-gray-800 disabled:text-gray-500 disabled:shadow-none text-black font-black py-4 rounded-2xl active:scale-95 transition-transform shadow-lg shadow-[#D4AF37]/20 flex items-center justify-center gap-2"
              >
                {saving ? <AppleLoader /> : (<><BadgeCheck size={20} /> INITIALIZE REGISTRY</>)}
              </button>
            </form>
          </motion.div>
        </div>
      )}

      {/* Order Details Modal (Placeholder) */}
      {selectedOrder && (
        <div key="details-modal" className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center">
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            onClick={() => setSelectedOrder(null)} 
            className="absolute inset-0 bg-black/90 backdrop-blur-md" 
          />
          <motion.div 
            initial={{ y: "100%" }} 
            animate={{ y: 0 }} 
            exit={{ y: "100%" }} 
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="bg-[#1C1C1E] w-full max-w-lg rounded-t-[2.5rem] sm:rounded-[3rem] p-6 sm:p-10 relative border-t border-x border-white/10 sm:border shadow-2xl overflow-y-auto max-h-[95vh] custom-scrollbar"
          >
            {/* Mobile Handle */}
            <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto mb-8 sm:hidden" />

            <div className="flex justify-between items-start mb-8 sm:mb-12">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] bg-[#D4AF37]/10 text-[#D4AF37] px-2.5 py-1 rounded-lg border border-[#D4AF37]/20 font-black tracking-widest uppercase">
                    {selectedOrder.invoice_id}
                  </span>
                  <span className={cn(
                    "text-[10px] px-2.5 py-1 rounded-lg font-black tracking-widest uppercase border",
                    selectedOrder.status === 'Completed' ? "bg-blue-500/10 text-blue-400 border-blue-500/20" : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                  )}>
                    {selectedOrder.status === 'Completed' ? 'Complete' : 'Pending'}
                  </span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black tracking-tighter text-white">{selectedOrder.customer_name}</h2>
                <div className="flex items-center gap-2 mt-2">
                   <Phone size={12} className="text-gray-500" />
                   <p className="text-gray-500 text-xs font-bold">{selectedOrder.customer_phone}</p>
                </div>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/5 flex items-center justify-center text-gray-500 hover:text-white transition-colors border border-white/5"><X size={20} /></button>
            </div>

            <div className="space-y-8 sm:space-y-10">
              {/* Execution Status Toggle - Minimalist */}
              <div className="grid grid-cols-2 gap-2 bg-black/40 p-1.5 rounded-2xl border border-white/5">
                {['Pending', 'Completed'].map((s) => (
                  <button
                    key={s}
                    disabled={saving}
                    onClick={() => handleStatusUpdate(selectedOrder.id, s as any)}
                    className={cn(
                      "py-3.5 rounded-[1.2rem] text-[10px] font-black uppercase tracking-widest transition-all duration-300",
                      selectedOrder.status === s 
                        ? (s === 'Completed' ? "bg-[#1e293b] text-blue-300 shadow-xl shadow-blue-500/10 border border-white/10" : "bg-amber-500/10 text-amber-500 border border-amber-500/20") 
                        : "text-gray-500 hover:text-white"
                    )}
                  >
                    {s === 'Completed' ? 'Mark Complete' : 'Keep Pending'}
                  </button>
                ))}
              </div>

              {/* Job Card Items Display - Clean List */}
              <div className="space-y-4">
                <p className="text-[10px] font-black text-[#D4AF37] uppercase tracking-[0.4em] px-1 opacity-50">Job Details</p>
                <div className="divide-y divide-white/5 overflow-hidden rounded-3xl border border-white/5 bg-white/[0.01]">
                  {selectedOrder.items?.map((item: any, idx: number) => (
                    <div key={idx} className="p-5 sm:p-6 space-y-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/10 flex items-center justify-center text-[#D4AF37]">
                          <Scissors size={18} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-black text-white truncate">{item.item_description}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[9px] text-[#D4AF37] font-black uppercase tracking-widest">{item.item_code}</span>
                            <span className="w-1 h-1 rounded-full bg-white/10" />
                            <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">{item.fabric_source}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-black text-white">{formatCurrency(item.item_total)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Financial Summary - Receipt Style */}
              <div className="space-y-6">
                <p className="text-[10px] font-black text-[#D4AF37] uppercase tracking-[0.4em] px-1 opacity-50">Statement</p>
                <div className="bg-white/[0.03] rounded-[2rem] p-6 sm:p-8 space-y-4 border border-white/5">
                  <div className="space-y-3 pb-4 border-b border-white/5">
                    <div className="flex justify-between items-center text-xs font-bold">
                      <span className="text-gray-500 uppercase tracking-widest">Initial Subtotal</span>
                      <span className="text-white">{formatCurrency(selectedOrder.total_amount)}</span>
                    </div>
                    {selectedOrder.discount_amount > 0 && (
                      <div className="flex justify-between items-center text-xs font-bold">
                        <span className="text-orange-500 uppercase tracking-widest">
                          Discount ({selectedOrder.discount_type === 'percentage' ? selectedOrder.discount_amount + '%' : 'Fixed'})
                        </span>
                        <span className="text-orange-500">
                          -{selectedOrder.discount_type === 'percentage' 
                            ? formatCurrency(selectedOrder.total_amount * (selectedOrder.discount_amount / 100))
                            : formatCurrency(selectedOrder.discount_amount)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Grand Total</span>
                      <span className="text-xl font-black text-white">{formatCurrency(selectedOrder.grand_total)}</span>
                    </div>
                  </div>

                  <div className="space-y-3 pt-2">
                    <div className="flex justify-between items-center text-xs font-bold">
                      <span className="text-green-500/80 uppercase tracking-widest">Paid (Advance)</span>
                      <span className="text-green-500">{formatCurrency(selectedOrder.advance_paid)}</span>
                    </div>
                    <div className="flex justify-between items-center bg-[#D4AF37]/10 p-4 rounded-2xl border border-[#D4AF37]/10">
                      <span className="text-xs font-black text-[#D4AF37] uppercase tracking-widest">Balance Due</span>
                      <span className="text-2xl font-black text-[#D4AF37]">{formatCurrency(selectedOrder.balance_due)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 pt-2">
                <button
                  onClick={() => handlePrint(selectedOrder)}
                  className="flex-1 bg-white text-black font-black py-5 rounded-2xl active:scale-95 transition-transform flex items-center justify-center gap-3 group shadow-2xl"
                >
                  <Printer size={20} className="transition-transform group-hover:scale-110" />
                  <span className="text-[10px] uppercase tracking-[0.2em]">Print Receipt</span>
                </button>
                <a href={`tel:${selectedOrder.customer_phone}`} className="w-16 h-16 sm:w-20 sm:h-20 bg-[#34C759] text-white rounded-full flex items-center justify-center shadow-lg shadow-green-500/20 active:scale-90 transition-transform flex-shrink-0">
                  <PhoneCall size={28} fill="currentColor" />
                </a>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
