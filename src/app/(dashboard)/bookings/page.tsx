"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import DatePicker from "react-datepicker";
import SignatureCanvas from "react-signature-canvas";
import "react-datepicker/dist/react-datepicker.css";
import { format, isBefore, startOfToday } from "date-fns";
import { 
  Search, 
  Plus, 
  X, 
  ArrowLeft,
  CalendarDays,
  User,
  Phone,
  CreditCard,
  CheckCircle2,
  XCircle,
  Clock,
  Shirt,
  AlertTriangle,
  PhoneCall,
  Undo2,
  Download,
  CheckCircle,
  Trash2,
  Pencil,
  Eye
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { AppleLoader } from "@/components/AppleLoader";
import { cn, formatCurrency } from "@/lib/utils";
import { generatePDFReceipt } from "@/lib/generatePDF";
// import { ReceiptTemplate } from "@/components/ReceiptTemplate";

interface InventoryItem {
  id: string;
  item_code: string;
  name: string;
  category: string;
  unit_selling_price: number;
}

interface Booking {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_nic: string;
  item_ids: string[];
  pickup_date: string;
  return_date: string;
  total_amount: number;
  advance_paid: number;
  status: "Confirmed" | "PickedUp" | "Returned" | "Cancelled";
  created_at: string;
  signature_url?: string;
  signature_data?: string;
}

function BookingsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialStatus = searchParams.get("status");

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [cancellingBooking, setCancellingBooking] = useState<Booking | null>(null);
  const [returningBooking, setReturningBooking] = useState<Booking | null>(null);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [viewingBooking, setViewingBooking] = useState<Booking | null>(null);

  // Conflict toast state
  const [conflictAlert, setConflictAlert] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastBooking, setLastBooking] = useState<any>(null);
  const [itemSearchQuery, setItemSearchQuery] = useState("");
  const [bookedDates, setBookedDates] = useState<Date[]>([]);
  const sigCanvas = useRef<SignatureCanvas>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowCustomerSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  // Form State
  const [formData, setFormData] = useState({
    customer_name: "",
    customer_phone: "",
    customer_nic: "",
    item_ids: [] as string[],
    selected_items: [] as InventoryItem[],
    pickup_date: null as Date | null,
    return_date: null as Date | null,
    total_amount: 0,
    advance_paid: 0,
  });

  // Customer Auto-Fill State
  const [customerSuggestions, setCustomerSuggestions] = useState<any[]>([]);
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);
  const [isReturningCustomer, setIsReturningCustomer] = useState(false);
  const [searchingCustomer, setSearchingCustomer] = useState(false);

  // Debounced Search Effect
  useEffect(() => {
    let debounceTimer: NodeJS.Timeout;
    
    const searchCustomers = async () => {
        if (formData.customer_name.length < 2 && formData.customer_phone.length < 3 && formData.customer_nic.length < 3) {
            setCustomerSuggestions([]);
            setShowCustomerSuggestions(false);
            return;
        }

        setSearchingCustomer(true);

        const { data, error } = await supabase
            .from("bookings")
            .select("customer_name, customer_phone, customer_nic")
            .or(`customer_name.ilike.%${formData.customer_name}%,customer_phone.ilike.%${formData.customer_phone}%,customer_nic.ilike.%${formData.customer_nic}%`)
            .order("created_at", { ascending: false })
            .limit(5);

        if (!error && data) {
            // Filter unique customers based on phone number
            const uniqueCustomers = data.filter((v, i, a) => a.findIndex(t => (t.customer_phone === v.customer_phone)) === i);
            
            // Smart Filter: Only show if the name doesn't perfectly match a selected returning customer
            const perfectlyMatchesTyped = uniqueCustomers.some(c => c.customer_name.toLowerCase() === formData.customer_name.toLowerCase());
            
            setCustomerSuggestions(uniqueCustomers);
            setShowCustomerSuggestions((uniqueCustomers?.length || 0) > 0 && !perfectlyMatchesTyped);
        }
        setSearchingCustomer(false);
    };

    if (isFormOpen && !isReturningCustomer) {
        debounceTimer = setTimeout(searchCustomers, 400);
    }

    return () => clearTimeout(debounceTimer);
  }, [formData.customer_name, formData.customer_phone, formData.customer_nic, isFormOpen, isReturningCustomer]);

  // Fetch booked dates for selected items to highlight in calendar
  useEffect(() => {
    if (formData.selected_items.length > 0 && isFormOpen) {
        const fetchBookedDates = async () => {
            const itemIds = formData.selected_items.map(i => i.id);
            // Using 'ov' for array overlaps in Supabase
            const { data, error } = await supabase
                .from("bookings")
                .select("pickup_date, return_date")
                .in("status", ["Confirmed", "PickedUp"])
                .filter('item_ids', 'ov', `{${itemIds.join(',')}}`);

            if (!error && data) {
                const dates: Date[] = [];
                data.forEach(b => {
                    let current = new Date(b.pickup_date);
                    const end = new Date(b.return_date);
                    while (current <= end) {
                        dates.push(new Date(current));
                        current.setDate(current.getDate() + 1);
                    }
                });
                setBookedDates(dates);
            }
        };
        fetchBookedDates();
    } else {
        setBookedDates([]);
    }
  }, [formData.selected_items, isFormOpen]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);

    const { data: bData, error: bError } = await supabase
      .from("bookings")
      .select(`*`)
      .order("created_at", { ascending: false });

    const { data: iData, error: iError } = await supabase
      .from("inventory")
      .select("id, item_code, name, category, unit_selling_price")
      .eq("category", "Blazer")
      .order("item_code", { ascending: true });

    if (bError) console.error("Error fetching bookings:", bError);
    if (iError) console.error("Error fetching inventory:", iError);

    setBookings(bData || []);
    setInventoryItems(iData || []);
    setLoading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.pickup_date || !formData.return_date || formData.selected_items.length === 0) return;
    
    setSaving(true);
    setConflictAlert(null);

    const pickupStr = format(formData.pickup_date, "yyyy-MM-dd");
    const returnStr = format(formData.return_date, "yyyy-MM-dd");

    // 1. Conflict Check for each item
    for (const item of formData.selected_items) {
        const query = supabase
          .from("bookings")
          .select(`id, customer_name, pickup_date, return_date`)
          .filter("item_ids", "cs", `{${item.id}}`) // Contains item ID
          .neq("status", "Cancelled")
          .neq("status", "Returned")
          .lte("pickup_date", returnStr)
          .gte("return_date", pickupStr);

        if (editingBooking) {
            query.neq("id", editingBooking.id);
        }

        const { data: conflicts, error: conflictError } = await query;

        if (conflictError) {
          setConflictAlert("Error checking availability. Please try again.");
          setSaving(false);
          return;
        }

        if (conflicts && conflicts.length > 0) {
          const conflict = conflicts[0];
          const pickupFormatted = new Date(conflict.pickup_date).toLocaleDateString();
          const returnFormatted = new Date(conflict.return_date).toLocaleDateString();
          
          setConflictAlert(`Conflict: ${item.item_code} is already reserved by ${conflict.customer_name} from ${pickupFormatted} to ${returnFormatted}.`);
          setSaving(false);
          return;
        }
    }

    // 2. Capture Signature as JSON / Points
    let signatureData: string | undefined = undefined;
    
    if (sigCanvas.current && !sigCanvas.current.isEmpty()) {
       // Capture points as JSON string
       const points = sigCanvas.current.toData();
       signatureData = JSON.stringify(points);
    } else if (editingBooking?.signature_data) {
      signatureData = editingBooking.signature_data;
    }

    // 3. Save/Update booking
    const itemIds = formData.selected_items.map(i => i.id);
    const bookingPayload = {
      customer_name: formData.customer_name,
      customer_phone: formData.customer_phone,
      customer_nic: formData.customer_nic,
      item_ids: itemIds,
      pickup_date: pickupStr,
      return_date: returnStr,
      total_amount: formData.total_amount,
      advance_paid: formData.advance_paid,
      status: editingBooking ? editingBooking.status : "Confirmed",
      signature_url: editingBooking?.signature_url, // Keep old URL if it exists
      signature_data: signatureData,
    };

    let result;
    if (editingBooking) {
        result = await supabase
            .from("bookings")
            .update(bookingPayload)
            .eq("id", editingBooking.id)
            .select();
    } else {
        result = await supabase
            .from("bookings")
            .insert([bookingPayload])
            .select();
    }

    const { data: insertedData, error: insertError } = result;

    if (insertError) {
      setConflictAlert("Error saving booking: " + insertError.message);
    } else {
      // Create custom display-only invoice number matching KB-1500+ logic
      const { count } = await supabase.from('bookings').select('*', { count: 'exact', head: true });
      const currentCount = count || 1;
      const customInvoiceNo = `KB-${1500 + currentCount}`;
      
      const newBookingObj = {
        customer_name: formData.customer_name,
        customer_phone: formData.customer_phone,
        customer_nic: formData.customer_nic,
        items: formData.selected_items.map(i => ({
          item_code: i.item_code,
          pickup_date: pickupStr,
          return_date: returnStr
        })),
        total_amount: formData.total_amount,
        advance_paid: formData.advance_paid,
        signature_data: signatureData || editingBooking?.signature_url,
        invoice_no: customInvoiceNo
      };
      
      setLastBooking(newBookingObj);
      setShowSuccess(true);
      fetchData();
      
      // Close modal and reset form for a smooth user flow
      setIsFormOpen(false);
      resetForm();

      // --- AUTOMATIC PDF DOWNLOAD TRIGGER ---
      setTimeout(async () => {
        setLoading(true);
        const filename = `${newBookingObj.invoice_no}_${newBookingObj.customer_name.replace(/\s+/g, "_")}.pdf`;
        await generatePDFReceipt(newBookingObj, filename);
        setLoading(false);
      }, 500);
      // --------------------------------------
      // --------------------------------------
    }
    setSaving(false);
  };

  const handleHardDeleteBooking = async () => {
    if (!cancellingBooking) return;
    setSaving(true);
    // Hard delete from database
    const { error } = await supabase
      .from("bookings")
      .delete()
      .eq("id", cancellingBooking.id);

    if (error) {
      alert("Error deleting booking: " + error.message);
    } else {
      setCancellingBooking(null);
      fetchData();
    }
    setSaving(false);
  };

  const handleMarkReturned = async (bookingId: string) => {
    setSaving(true);
    
    // 1. Get the booking to find associated items
    const { data: bookingData } = await supabase
      .from("bookings")
      .select("item_ids")
      .eq("id", bookingId)
      .single();

    // 2. Update booking status
    const { error } = await supabase
      .from("bookings")
      .update({ status: "Returned" })
      .eq("id", bookingId);

    if (error) {
      alert("Error returning booking: " + error.message);
    } else {
      // 3. Update associated inventory items to 'Available'
      if (bookingData && bookingData.item_ids && bookingData.item_ids.length > 0) {
        await supabase
          .from("inventory")
          .update({ status: "Available" })
          .in("id", bookingData.item_ids);
      }
      fetchData();
    }
    setSaving(false);
  };

  const resetForm = () => {
    setFormData({
      customer_name: "",
      customer_phone: "",
      customer_nic: "",
      item_ids: [],
      selected_items: [],
      pickup_date: null,
      return_date: null,
      total_amount: 0,
      advance_paid: 0,
    });
    setConflictAlert(null);
    setIsReturningCustomer(false);
    setCustomerSuggestions([]);
    setShowCustomerSuggestions(false);
    setEditingBooking(null);
  };

  // Smart Sorting: Active first (Confirmed/PickedUp) sorted by earliest return_date. Then inactive (Returned/Cancelled).
  const sortedBookings = [...(bookings || [])].sort((a, b) => {
    const aActive = a.status === "Confirmed" || a.status === "PickedUp";
    const bActive = b.status === "Confirmed" || b.status === "PickedUp";

    if (aActive && !bActive) return -1;
    if (!aActive && bActive) return 1;

    // Both active or both inactive, sort by return date ascending (earliest first)
    const dateA = new Date(a.return_date).getTime();
    const dateB = new Date(b.return_date).getTime();
    return dateA - dateB;
  });

  const filteredBookings = sortedBookings.filter((b) => {
    // 1. Text Search Filter
    const itemCodes = (b.item_ids || []).map(id => inventoryItems.find(i => i.id === id)?.item_code || "").join(" ").toLowerCase();
    const matchesSearch = b.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          b.customer_phone.includes(searchQuery) ||
                          itemCodes.includes(searchQuery.toLowerCase());
    
    // 2. Initial Status Filter from URL
    if (initialStatus === "Returned") {
      return matchesSearch && b.status === "Returned";
    }

    // Default: Show only active items (Confirmed/PickedUp)
    // This addresses the user's request to hide returned items on the main bookings page
    const isActive = b.status === "Confirmed" || b.status === "PickedUp";
    return matchesSearch && isActive;
  });

  const formatSriLankanPhone = (phone: string) => {
      let cleaned = phone.replace(/\D/g, '');
      if (cleaned.startsWith('0')) {
          cleaned = cleaned.substring(1);
      }
      return `+94${cleaned}`;
  };

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

      {/* Conflict Toast */}
      <AnimatePresence>
        {conflictAlert && (
          <motion.div
            initial={{ opacity: 0, y: -30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[200] w-[90vw] max-w-sm"
          >
            <div className="bg-[#1C1C1E]/90 backdrop-blur-2xl border border-[#D4AF37]/40 rounded-3xl p-5 shadow-2xl shadow-black/50 flex items-start gap-4">
              <div className="shrink-0 w-10 h-10 rounded-xl bg-[#D4AF37]/10 flex items-center justify-center">
                <AlertTriangle size={20} className="text-[#D4AF37]" />
              </div>
              <div className="flex-1">
                <p className="text-[11px] font-black text-[#D4AF37] uppercase tracking-widest mb-1">Conflict Detected</p>
                <p className="text-xs text-gray-300 leading-relaxed font-bold">{conflictAlert}</p>
              </div>
              <button onClick={() => setConflictAlert(null)} className="text-gray-500 hover:text-white">
                <X size={18} />
              </button>
            </div>
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
            <h1 className="text-2xl font-black tracking-tight">
              {initialStatus === "Returned" ? "Booking History" : "Bookings"}
            </h1>
            <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-1">
              {initialStatus === "Returned" ? "Settled Orders" : "Order Management"}
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
          placeholder="Search by customer, phone, or item..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-[#1C1C1E] border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 transition-all placeholder:text-gray-600"
        />
      </div>

      <div className="space-y-3">
        {!loading && (filteredBookings?.length || 0) === 0 ? (
          <div className="text-center py-12 bg-white/5 rounded-[2.5rem] border border-dashed border-white/10">
            <p className="text-gray-500 text-sm font-medium">No bookings found</p>
          </div>
        ) : (
          filteredBookings.map((booking) => {
            const isOverdue = (booking.status === "Confirmed" || booking.status === "PickedUp") && isBefore(new Date(booking.return_date), new Date(todayStr));

            return (
                <motion.div
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={booking.id}
                  className={cn(
                      "border rounded-3xl p-5 hover:bg-white/5 transition-all relative overflow-hidden",
                      isOverdue ? "bg-red-500/5 border-red-500/50" : "bg-[#1C1C1E] border-white/5"
                  )}
                >
                  {/* Overdue highlight element */}
                  {isOverdue && (
                      <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 blur-3xl -z-10 rounded-full blur-2xl translate-x-10 -translate-y-10" />
                  )}

                  <div className="flex justify-between items-start mb-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {(booking.item_ids || []).map((id: string) => {
                            const item = inventoryItems.find(i => i.id === id);
                            return (
                                <span key={id} className={cn(
                                    "text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-widest",
                                    isOverdue ? "bg-red-500/20 text-red-500" : "bg-[#D4AF37]/10 text-[#D4AF37]"
                                )}>
                                  {item?.item_code || "..."}
                                </span>
                            );
                        })}
                        <span className={cn(
                          "text-[9px] font-black px-2 py-1 rounded-full uppercase tracking-tighter flex items-center gap-1",
                          booking.status === "Confirmed" ? "bg-blue-500/10 text-blue-500" :
                          booking.status === "PickedUp" ? "bg-yellow-500/10 text-yellow-500" :
                          booking.status === "Returned" ? "bg-green-500/10 text-green-500" :
                          "bg-red-500/10 text-red-500"
                        )}>
                          {booking.status === "Confirmed" && <CheckCircle2 size={10} />}
                          {booking.status === "Cancelled" && <XCircle size={10} />}
                          {booking.status === "PickedUp" && <Clock size={10} />}
                          {booking.status === "Returned" && <CheckCircle2 size={10} />}
                          {booking.status}
                        </span>
                        {isOverdue && (
                            <span className="text-[9px] font-black bg-red-500 text-white px-2 py-1 rounded-full uppercase tracking-widest animate-pulse border border-red-400">
                                Overdue
                            </span>
                        )}
                      </div>
                      <h3 className="text-lg font-bold text-white tracking-tight pt-1 flex items-center gap-2">
                        <User size={14} className="text-gray-500" /> {booking.customer_name}
                      </h3>
                      <div className="flex items-center gap-2 text-[10px] text-gray-400 font-bold">
                        <Phone size={10} /> {booking.customer_phone}
                        <a 
                            href={`tel:${formatSriLankanPhone(booking.customer_phone)}`}
                            className="p-1.5 bg-green-500/10 text-green-500 rounded-lg ml-2 hover:bg-green-500/20 transition-colors"
                            title="Call Customer"
                        >
                            <PhoneCall size={12} />
                        </a>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setViewingBooking(booking)}
                        className="p-2 bg-blue-500/10 rounded-xl text-blue-500 hover:bg-blue-500/20 transition-all border border-blue-500/20"
                        title="View Details"
                      >
                        <Eye size={18} />
                      </button>
                      {booking.status !== "Returned" && (
                        <button
                          onClick={() => {
                            setEditingBooking(booking);
                            setFormData({
                              customer_name: booking.customer_name,
                              customer_phone: booking.customer_phone,
                              customer_nic: booking.customer_nic,
                              item_ids: booking.item_ids,
                              selected_items: inventoryItems.filter(i => booking.item_ids.includes(i.id)),
                              pickup_date: new Date(booking.pickup_date),
                              return_date: new Date(booking.return_date),
                              total_amount: booking.total_amount,
                              advance_paid: booking.advance_paid,
                            });
                            setIsFormOpen(true);
                          }}
                          className="p-2 bg-white/5 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-all border border-white/5"
                          title="Edit Booking"
                        >
                          <Pencil size={18} />
                        </button>
                      )}
                      <button
                        onClick={() => setCancellingBooking(booking)}
                        className="p-2 bg-red-500/10 rounded-xl text-red-500 hover:bg-red-500/20 transition-all border border-red-500/20"
                        title="Delete Booking"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-[#121212] p-3 rounded-2xl border border-white/5">
                      <div className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-1 flex items-center gap-1">
                        <CalendarDays size={10} /> Pickup
                      </div>
                      <div className="text-sm font-bold text-white">{new Date(booking.pickup_date).toLocaleDateString()}</div>
                    </div>
                    <div className={cn(
                        "p-3 rounded-2xl border",
                        isOverdue ? "bg-red-950/30 border-red-500/30" : "bg-[#121212] border-white/5"
                    )}>
                      <div className={cn(
                          "text-[9px] font-black uppercase tracking-widest mb-1 flex items-center gap-1",
                          isOverdue ? "text-red-400" : "text-gray-500"
                      )}>
                        <CalendarDays size={10} /> Return
                      </div>
                      <div className={cn(
                          "text-sm font-bold",
                          isOverdue ? "text-red-500" : "text-white"
                      )}>{new Date(booking.return_date).toLocaleDateString()}</div>
                    </div>
                  </div>

                    <div className="flex justify-between items-center pt-4 border-t border-white/5">
                      <div className="flex flex-col gap-0.5">
                        <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1">
                          <CreditCard size={10} /> Advance Paid
                        </div>
                        <div className="text-sm font-bold text-white">Rs. {booking.advance_paid.toFixed(2)}</div>
                        <div className="text-[9px] font-black text-[#D4AF37] uppercase tracking-tighter mt-0.5">
                          Balance: Rs. {(booking.total_amount - booking.advance_paid).toFixed(2)}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-0.5">Total</div>
                          <div className="text-sm font-black text-[#D4AF37]">
                              Rs. {booking.total_amount.toFixed(2)}
                          </div>
                        </div>
                        {(booking.status === "Confirmed" || booking.status === "PickedUp") && (
                            <button
                                onClick={() => setReturningBooking(booking)}
                                className="bg-green-500/10 text-green-500 text-[10px] font-black uppercase px-4 py-3 rounded-2xl border border-green-500/20 active:scale-95 transition-transform flex items-center gap-1.5 hover:bg-green-500/20"
                            >
                                <Undo2 size={12} /> Return
                            </button>
                        )}
                      </div>
                    </div>
                </motion.div>
            );
          })
        )}
      </div>

      {/* New Booking Form */}
      <AnimatePresence>
        {isFormOpen && (
          <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !saving && setIsFormOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="relative w-full max-w-lg bg-[#121212] rounded-t-[3rem] sm:rounded-[3rem] border-t sm:border border-white/10 p-8 pt-10 shadow-2xl max-h-[92vh] overflow-y-auto"
            >
              <button
                type="button"
                onClick={() => !saving && setIsFormOpen(false)}
                className="absolute top-6 right-6 text-gray-500 hover:text-white"
              >
                <X size={24} />
              </button>

              <h2 className="text-xl font-black tracking-tight mb-1">New Booking</h2>
              <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-8">Reserve a Blazer</p>

              <form onSubmit={handleSave} className="space-y-6 pb-32">
                {/* Customer Details */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center border-b border-white/10 pb-2">
                      <h3 className="text-xs font-black text-[#D4AF37] uppercase tracking-widest">
                        Customer Details
                      </h3>
                      <AnimatePresence>
                          {isReturningCustomer && (
                              <motion.span 
                                  initial={{ opacity: 0, scale: 0.8 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0, scale: 0.8 }}
                                  className="text-[9px] font-black bg-blue-500/10 text-blue-500 px-2 py-1 rounded-full uppercase tracking-widest border border-blue-500/20 flex items-center gap-1"
                              >
                                  <CheckCircle2 size={10} /> Returning Customer
                              </motion.span>
                          )}
                      </AnimatePresence>
                  </div>

                  <div className="relative" ref={dropdownRef}>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Full Name</label>
                        <input
                          required
                          placeholder="Full Name"
                          value={formData.customer_name}
                          autoComplete="off"
                          onChange={(e) => {
                              setFormData({ ...formData, customer_name: e.target.value });
                              setIsReturningCustomer(false);
                          }}
                          className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 px-5 text-sm focus:outline-none focus:border-[#D4AF37]/50"
                        />
                      </div>

                      {/* Customer Suggestions Dropdown */}
                      <AnimatePresence>
                          {showCustomerSuggestions && customerSuggestions.length > 0 && (
                              <motion.div
                                  initial={{ opacity: 0, y: -10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: -10 }}
                                  className="absolute top-full left-0 right-0 mt-2 bg-[#1C1C1E] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-[200] flex flex-col"
                              >
                                  <div className="p-3 border-b border-white/5 flex justify-between items-center bg-white/5">
                                      <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest pl-2 font-black">Matching Customers</span>
                                      <button 
                                          type="button" 
                                          onClick={() => setShowCustomerSuggestions(false)}
                                          className="p-1 px-3 bg-white/5 hover:bg-white/10 text-[9px] font-black uppercase tracking-widest rounded-lg transition-colors border border-white/5"
                                      >
                                          Close
                                      </button>
                                  </div>
                                  <div className="max-h-[200px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
                              {customerSuggestions.map((customer, idx) => (
                                      <button
                                          key={idx}
                                          type="button"
                                          onClick={() => {
                                              setFormData(prev => ({
                                                  ...prev,
                                                  customer_name: customer.customer_name,
                                                  customer_phone: customer.customer_phone,
                                                  customer_nic: customer.customer_nic || prev.customer_nic
                                              }));
                                              setIsReturningCustomer(true);
                                              setShowCustomerSuggestions(false);
                                          }}
                                          className="w-full text-left px-5 py-4 border-b border-white/5 hover:bg-white/5 transition-colors flex flex-col gap-1 last:border-0"
                                      >
                                          <div className="font-bold text-white text-sm">{customer.customer_name}</div>
                                          <div className="flex gap-3 text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                                              <span className="flex items-center gap-1"><Phone size={10} /> {customer.customer_phone}</span>
                                              {customer.customer_nic && <span className="flex items-center gap-1"><CreditCard size={10} /> {customer.customer_nic}</span>}
                                          </div>
                                      </button>
                                  ))}
                                  </div>
                              </motion.div>
                          )}
                      </AnimatePresence>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Phone</label>
                        <input
                          required
                          placeholder="07X XXX XXXX"
                          value={formData.customer_phone}
                          autoComplete="off"
                          onChange={(e) => {
                              setFormData({ ...formData, customer_phone: e.target.value });
                              setIsReturningCustomer(false);
                          }}
                          className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 px-5 text-sm focus:outline-none focus:border-[#D4AF37]/50"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">NIC</label>
                        <input
                          required
                          placeholder="NIC Number"
                          value={formData.customer_nic}
                          autoComplete="off"
                          onChange={(e) => {
                              setFormData({ ...formData, customer_nic: e.target.value });
                              setIsReturningCustomer(false);
                          }}
                          className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 px-5 text-sm focus:outline-none focus:border-[#D4AF37]/50"
                        />
                      </div>
                  </div>
                </div>

                {/* Items Selection */}
                <div className="space-y-4 pt-4 border-t border-white/10">
                    <h3 className="text-xs font-black text-[#D4AF37] uppercase tracking-widest">
                       Select Items
                    </h3>
                    
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-gray-500 group-focus-within:text-[#D4AF37] transition-colors">
                            <Search size={16} />
                        </div>
                        <input 
                            type="text"
                            placeholder="Type blazer name or code (e.g. B-101)..."
                            value={itemSearchQuery}
                            autoComplete="off"
                            onChange={(e) => setItemSearchQuery(e.target.value)}
                            className="w-full bg-[#1C1C1E] border border-white/5 rounded-2xl py-3 pl-12 pr-5 text-sm focus:outline-none focus:border-[#D4AF37]/50 transition-all placeholder:text-gray-600"
                        />
                    </div>

                    <AnimatePresence>
                        {itemSearchQuery.length > 0 && (
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.98 }}
                                className="max-h-48 overflow-y-auto custom-scrollbar border border-white/10 rounded-2xl bg-[#1C1C1E] shadow-2xl"
                            >
                                {(() => {
                                    const filtered = inventoryItems.filter(i => 
                                        !formData.selected_items.find(si => si.id === i.id) &&
                                        (i.name.toLowerCase().includes(itemSearchQuery.toLowerCase()) || 
                                         i.item_code.toLowerCase().includes(itemSearchQuery.toLowerCase()))
                                    );
                                    
                                    if (filtered.length === 0) {
                                        return (
                                            <div className="p-8 text-center">
                                                <p className="text-gray-500 text-[11px] font-black uppercase tracking-widest">No matching blazers found</p>
                                            </div>
                                        );
                                    }

                                    return filtered.map(item => (
                                        <button
                                            key={item.id}
                                            type="button"
                                            onClick={() => {
                                                const newSelected = [...formData.selected_items, item];
                                                setFormData({
                                                    ...formData,
                                                    selected_items: newSelected,
                                                    total_amount: newSelected.reduce((sum, i) => sum + i.unit_selling_price, 0)
                                                });
                                                setItemSearchQuery("");
                                            }}
                                            className="w-full text-left px-5 py-4 border-b border-white/5 hover:bg-white/5 transition-colors flex justify-between items-center last:border-0"
                                        >
                                            <div className="flex flex-col gap-0.5">
                                                <div className="font-bold text-sm text-white">{item.name}</div>
                                                <div className="text-[10px] text-[#D4AF37] font-black uppercase tracking-widest">{item.item_code}</div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="text-[10px] font-black text-gray-500">{formatCurrency(item.unit_selling_price)}</div>
                                                <Plus size={16} className="text-[#D4AF37]" />
                                            </div>
                                        </button>
                                    ));
                                })()}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {formData.selected_items.length > 0 && (
                        <div className="space-y-2">
                            {formData.selected_items.map(item => (
                                <div key={item.id} className="flex justify-between items-center p-3 rounded-xl bg-white/5 border border-white/5">
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold">{item.name}</span>
                                        <span className="text-[10px] text-gray-500">{item.item_code}</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const newSelected = formData.selected_items.filter(i => i.id !== item.id);
                                            setFormData({
                                                ...formData,
                                                selected_items: newSelected,
                                                total_amount: newSelected.reduce((sum, i) => sum + i.unit_selling_price, 0)
                                            });
                                        }}
                                        className="p-1.5 bg-red-500/10 text-red-500 rounded-lg"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Dates Selection */}
                <div className="pt-4 border-t border-white/10">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Pickup Date</label>
                          <DatePicker
                              selected={formData.pickup_date}
                              onChange={(date: Date | null) => setFormData({...formData, pickup_date: date})}
                              minDate={new Date()}
                              excludeDates={bookedDates}
                              dayClassName={(date) => 
                                bookedDates.some(d => d.getDate() === date.getDate() && d.getMonth() === date.getMonth() && d.getFullYear() === date.getFullYear()) 
                                ? "!bg-red-500 !text-white opacity-80 rounded-full" : ""
                              }
                              placeholderText="Select Date"
                              className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 px-5 text-sm focus:outline-none focus:border-[#D4AF37]/50"
                              wrapperClassName="w-full"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Return Date</label>
                          <DatePicker
                              selected={formData.return_date}
                              onChange={(date: Date | null) => setFormData({...formData, return_date: date})}
                              minDate={formData.pickup_date || new Date()}
                              excludeDates={bookedDates}
                              dayClassName={(date) => 
                                bookedDates.some(d => d.getDate() === date.getDate() && d.getMonth() === date.getMonth() && d.getFullYear() === date.getFullYear()) 
                                ? "!bg-red-500 !text-white opacity-80 rounded-full" : ""
                              }
                              placeholderText="Select Date"
                              className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 px-5 text-sm focus:outline-none focus:border-[#D4AF37]/50"
                              wrapperClassName="w-full"
                          />
                        </div>
                    </div>
                </div>

                {/* Financials */}
                <div className="space-y-4 pt-4 border-t border-white/10">
                  <div className="flex justify-between items-center bg-[#D4AF37]/10 p-4 rounded-2xl border border-[#D4AF37]/20">
                     <span className="text-sm font-black text-[#D4AF37] uppercase tracking-widest">Total Amount</span>
                     <span className="text-xl font-black text-white">{formatCurrency(formData.total_amount)}</span>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Advance Amount Paid</label>
                    <input
                      type="number"
                      placeholder="Amount in LKR"
                      value={formData.advance_paid || ""}
                      onChange={(e) => setFormData({ ...formData, advance_paid: Number(e.target.value) })}
                      className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 px-5 text-sm focus:outline-none focus:border-[#D4AF37]/50"
                    />
                  </div>
                </div>

                {/* Digital Signature */}
                <div className="space-y-3 pt-4 border-t border-white/10">
                   <div className="flex justify-between items-center">
                     <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Customer Signature</label>
                     <button type="button" onClick={() => sigCanvas.current?.clear()} className="text-[10px] text-red-400 font-bold uppercase tracking-widest">Clear</button>
                   </div>
                   <div className="bg-white rounded-2xl overflow-hidden border-2 border-dashed border-gray-600 focus-within:border-[#D4AF37] transition-all">
                       <SignatureCanvas
                         ref={sigCanvas}
                         penColor="black"
                         canvasProps={{className: 'w-full h-32'}}
                       />
                   </div>
                   <p className="text-[9px] text-gray-500 text-center">Please ask the customer to sign inside the box above to acknowledge terms.</p>
                </div>

                <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#121212] via-[#121212] to-transparent z-50">
                    <button
                      type="submit"
                      disabled={saving || formData.selected_items.length === 0 || !formData.pickup_date || !formData.return_date}
                      className="w-full max-w-lg mx-auto block bg-[#D4AF37] text-black font-black py-4 rounded-2xl shadow-[0_0_20px_rgba(212,175,55,0.3)] active:scale-95 transition-transform disabled:opacity-50 disabled:active:scale-100"
                    >
                      {saving ? "SAVING..." : (editingBooking ? "UPDATE BOOKING" : "CONFIRM BOOKING")}
                    </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {cancellingBooking && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setCancellingBooking(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-xs bg-[#1C1C1E] border border-white/10 rounded-[2.5rem] p-8 text-center space-y-6 shadow-2xl"
            >
              <div className="w-16 h-16 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto">
                <AlertTriangle size={32} />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-black tracking-tight">Delete Booking?</h3>
                <p className="text-gray-400 text-xs font-bold leading-relaxed">
                  This action is permanent. It will remove the booking and free up the items.
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <button
                  onClick={handleHardDeleteBooking}
                  disabled={saving}
                  className="w-full bg-red-500 text-white font-black py-4 rounded-2xl active:scale-95 transition-transform disabled:opacity-50"
                >
                  {saving ? "DELETING..." : "DELETE"}
                </button>
                <button
                  onClick={() => setCancellingBooking(null)}
                  className="w-full bg-white/5 text-gray-400 font-black py-4 rounded-2xl hover:text-white transition-colors"
                >
                  CANCEL
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Viewing Booking Details Modal */}
      <AnimatePresence>
        {viewingBooking && (
          <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setViewingBooking(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="relative w-full max-w-sm bg-[#1C1C1E] rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="p-6 pb-2 shrink-0">
                  <div className="flex justify-between items-start mb-4">
                      <div>
                          <h3 className="text-xl font-black text-white mb-1">Booking Details</h3>
                          <span className={cn(
                              "text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full",
                              viewingBooking.status === "Confirmed" ? "bg-blue-500/10 text-blue-500" :
                              viewingBooking.status === "Returned" ? "bg-green-500/10 text-green-500" :
                              "bg-[#D4AF37]/10 text-[#D4AF37]"
                          )}>
                              {viewingBooking.status}
                          </span>
                      </div>
                      <button onClick={() => setViewingBooking(null)} className="p-2 bg-white/5 rounded-full text-gray-400 hover:text-white">
                          <X size={16} />
                      </button>
                  </div>
              </div>

              <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
                  <div>
                      <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Customer</p>
                      <p className="font-bold text-white text-lg">{viewingBooking.customer_name}</p>
                      <p className="text-sm text-gray-400 font-medium">{viewingBooking.customer_phone}</p>
                      <p className="text-xs text-gray-500">{viewingBooking.customer_nic}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                      <div className="bg-[#121212] p-3 rounded-2xl border border-white/5">
                          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Pickup</p>
                          <p className="font-bold text-white">{new Date(viewingBooking.pickup_date).toLocaleDateString()}</p>
                      </div>
                      <div className="bg-[#121212] p-3 rounded-2xl border border-white/5">
                          <p className="text-[10px] font-black text-[#D4AF37] uppercase tracking-widest mb-1">Return</p>
                          <p className="font-bold text-[#D4AF37]">{new Date(viewingBooking.return_date).toLocaleDateString()}</p>
                      </div>
                  </div>

                  <div>
                      <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Items</p>
                      <div className="space-y-2">
                          {(viewingBooking.item_ids || []).map(id => {
                              const item = inventoryItems.find(i => i.id === id);
                              return (
                                  <div key={id} className="flex justify-between items-center p-3 rounded-xl bg-white/5 border border-white/5">
                                      <span className="text-sm font-bold text-white">{item?.name || "Unknown"}</span>
                                      <span className="text-[10px] text-[#D4AF37] font-black tracking-widest bg-[#D4AF37]/10 px-2 py-1 rounded-md">
                                          {item?.item_code || "Unknown"}
                                      </span>
                                  </div>
                              );
                          })}
                      </div>
                  </div>

                  <div className="bg-[#121212] p-4 rounded-2xl border border-white/5 space-y-2">
                       <div className="flex justify-between items-center">
                           <span className="text-xs font-bold text-gray-500">Total</span>
                           <span className="text-sm font-black text-white">{formatCurrency(viewingBooking.total_amount)}</span>
                       </div>
                       <div className="flex justify-between items-center">
                           <span className="text-xs font-bold text-gray-500">Advance</span>
                           <span className="text-sm font-black text-white">{formatCurrency(viewingBooking.advance_paid)}</span>
                       </div>
                       <div className="h-px bg-white/10 w-full my-2" />
                       <div className="flex justify-between items-center">
                           <span className="text-xs font-black text-[#D4AF37] uppercase tracking-widest">Balance</span>
                           <span className="text-lg font-black text-[#D4AF37]">{formatCurrency(viewingBooking.total_amount - viewingBooking.advance_paid)}</span>
                       </div>
                  </div>

                  {viewingBooking.signature_url && (
                      <div className="bg-white p-2 rounded-xl">
                          <img src={viewingBooking.signature_url} alt="Signature" className="w-full h-auto" />
                      </div>
                  )}
              </div>

              <div className="p-4 bg-[#121212] border-t border-white/5 shrink-0 space-y-3">
                  <button
                    onClick={async () => {
                        const customInvoiceNo = `KB-${1500 + bookings.length}`; // Approximation
                        const data = {
                            customer_name: viewingBooking.customer_name,
                            customer_phone: viewingBooking.customer_phone,
                            customer_nic: viewingBooking.customer_nic,
                            items: inventoryItems
                                .filter(i => viewingBooking.item_ids.includes(i.id))
                                .map(i => ({
                                    item_code: i.item_code,
                                    pickup_date: viewingBooking.pickup_date,
                                    return_date: viewingBooking.return_date
                                })),
                            total_amount: viewingBooking.total_amount,
                            advance_paid: viewingBooking.advance_paid,
                            signature_data: viewingBooking.signature_data || viewingBooking.signature_url,
                            invoice_no: customInvoiceNo
                        };
                        setLoading(true);
                        const filename = `${customInvoiceNo}_${viewingBooking.customer_name.replace(/\s+/g, "_")}.pdf`;
                        await generatePDFReceipt(data, filename);
                        setLoading(false);
                    }}
                    className="w-full bg-[#D4AF37] text-black font-black py-4 rounded-2xl active:scale-95 transition-transform flex items-center justify-center gap-2"
                  >
                    <Download size={18} /> DOWNLOAD RECEIPT
                  </button>
                  <button
                    onClick={() => setViewingBooking(null)}
                    className="w-full bg-white/10 text-white font-black py-4 rounded-2xl active:scale-95 transition-transform"
                  >
                    CLOSE DETAILS
                  </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Return Confirmation Modal */}
      <AnimatePresence>
        {returningBooking && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 text-left">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setReturningBooking(null)}
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-sm bg-[#1C1C1E] border border-white/10 rounded-[2.5rem] p-8 shadow-2xl overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-green-500/50" />
              
              <div className="flex flex-col items-center text-center mb-8">
                <div className="w-16 h-16 bg-green-500/10 rounded-2xl flex items-center justify-center text-green-500 mb-4 border border-green-500/20">
                  <Undo2 size={28} />
                </div>
                <h2 className="text-xl font-black text-white tracking-tight">Confirm Return</h2>
                <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">Settlement Details</p>
              </div>

              <div className="space-y-4 mb-8">
                <div className="bg-[#121212] p-5 rounded-3xl border border-white/5 space-y-3 text-left">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500 font-bold">Total Amount</span>
                    <span className="text-white font-black">Rs. {returningBooking.total_amount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500 font-bold">Advance Paid</span>
                    <span className="text-white font-black text-green-500">- Rs. {returningBooking.advance_paid.toFixed(2)}</span>
                  </div>
                  <div className="h-px bg-white/5 w-full my-1" />
                  <div className="flex justify-between items-center pt-1">
                    <span className="text-xs font-black text-[#D4AF37] uppercase tracking-widest">Balance to Collect</span>
                    <span className="text-2xl font-black text-[#D4AF37]">
                      Rs. {(returningBooking.total_amount - returningBooking.advance_paid).toFixed(2)}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-4 bg-blue-500/5 rounded-2xl border border-blue-500/10 text-left">
                   <CheckCircle2 size={18} className="text-blue-500 shrink-0" />
                   <p className="text-[10px] text-blue-200 leading-tight font-medium">
                     Please collect the remaining balance from <span className="font-bold text-white">{returningBooking.customer_name}</span> before confirming.
                   </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <button
                  onClick={async () => {
                    await handleMarkReturned(returningBooking.id);
                    setReturningBooking(null);
                    // Redirect to History after settlement as requested
                    router.push('/bookings?status=Returned');
                  }}
                  className="w-full bg-green-500 text-black font-black py-4 rounded-2xl active:scale-95 transition-transform shadow-lg shadow-green-500/20"
                >
                  CONFIRM & SETTLE
                </button>
                <button
                  onClick={() => setReturningBooking(null)}
                  className="w-full bg-white/5 text-gray-400 font-black py-4 rounded-2xl active:scale-95 transition-transform border border-white/5 hover:bg-white/10 hover:text-white"
                >
                  CANCEL
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
    </div>
  );
}

export default function BookingsPage() {
  return (
    <Suspense fallback={<AppleLoader />}>
      <BookingsContent />
    </Suspense>
  );
}
