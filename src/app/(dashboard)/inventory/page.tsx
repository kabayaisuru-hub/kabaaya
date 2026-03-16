"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { 
  Search, 
  Plus, 
  Pencil, 
  Trash2, 
  X, 
  ChevronRight,
  AlertCircle,
  ArrowLeft
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { AppleLoader } from "@/components/AppleLoader";
import { cn, formatCurrency } from "@/lib/utils";
import { format } from "date-fns";

type Category = "Blazer" | "Fabric" | "Product";

interface InventoryItem {
  id: string;
  category: Category;
  item_code: string;
  name: string;
  size?: string;
  color?: string;
  fabric_type?: string;
  unit?: string;
  current_stock_quantity: number;
  unit_cost_price: number;
  unit_selling_price: number;
  status: "Available" | "Rented" | "Sold";
  displayStatus?: string;
  created_at: string;
  bookings?: {
    id: string;
    customer_name: string;
    pickup_date: string;
    return_date: string;
    status: string;
  }[];
}

function InventoryContent() {
  const searchParams = useSearchParams();
  const initialFilter = searchParams.get("status");

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Category>("Blazer");
  const [searchQuery, setSearchQuery] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<InventoryItem | null>(null);
  const [bookingInfoItem, setBookingInfoItem] = useState<InventoryItem | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    item_code: "",
    name: "",
    category: "Blazer" as Category,
    size: "",
    color: "",
    fabric_type: "",
    unit: "Pcs",
    current_stock_quantity: 0,
    unit_cost_price: 0,
    unit_selling_price: 0,
    status: "Available" as "Available" | "Rented" | "Sold",
  });

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    setLoading(true);
    
    // 1. Fetch Inventory Items
    const { data: itemsData, error: itemsError } = await supabase
      .from("inventory")
      .select("*")
      .order("created_at", { ascending: false });

    // 2. Fetch Active Bookings (Not just today, any upcoming or active)
    const today = new Date().toISOString().split('T')[0];
    const { data: bookingsData, error: bookingsError } = await supabase
      .from("bookings")
      .select("item_id, customer_name, pickup_date, return_date, status")
      .in("status", ["Confirmed", "PickedUp"])
      .gte("return_date", today)
      .order("pickup_date", { ascending: true });

    if (itemsError) {
      console.error("Error fetching items:", itemsError);
    } else {
      // Create a map of item_id -> bookings[]
      const activeBookingMap = new Map<string, any[]>();
      if (bookingsData) {
          bookingsData.forEach(b => {
              if (!activeBookingMap.has(b.item_id)) {
                  activeBookingMap.set(b.item_id, []);
              }
              activeBookingMap.get(b.item_id)!.push(b);
          });
      }

      // Merge derived status and bookings array
      const processedItems = itemsData?.map(item => {
          if (item.category === "Blazer" && activeBookingMap.has(item.id)) {
              return { 
                  ...item, 
                  displayStatus: "Booked",
                  bookings: activeBookingMap.get(item.id) 
              };
          }
          return { ...item, displayStatus: item.status };
      });

      setItems(processedItems || []);
    }
    setLoading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const payload = {
      ...formData,
      category: editingItem ? editingItem.category : formData.category,
      // Default quantity for Blazers to 1 as per logic (one blazer one code)
      current_stock_quantity: (editingItem ? editingItem.category : formData.category) === "Blazer" ? 1 : formData.current_stock_quantity
    };

    let error;
    if (editingItem) {
        const { error: updateError } = await supabase
            .from("inventory")
            .update({
                name: formData.name,
                size: formData.size,
                color: formData.color,
                fabric_type: formData.fabric_type,
                unit: formData.unit,
                current_stock_quantity: payload.current_stock_quantity,
                unit_cost_price: formData.unit_cost_price,
                unit_selling_price: formData.unit_selling_price,
                status: formData.status
            })
            .eq("id", editingItem.id);
        error = updateError;
    } else {
        const { error: insertError } = await supabase
            .from("inventory")
            .insert([payload]);
        error = insertError;
    }

    if (error) {
      alert("Error saving item: " + error.message);
    } else {
      setIsFormOpen(false);
      setEditingItem(null);
      resetForm(activeTab);
      fetchItems();
    }
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!deletingItem) return;
    setLoading(true);
    const { error } = await supabase
      .from("inventory")
      .delete()
      .eq("id", deletingItem.id);

    if (error) {
      alert("Error deleting item: " + error.message);
    } else {
      setDeletingItem(null);
      fetchItems();
    }
    setLoading(false);
  };

  const resetForm = (category: Category) => {
    setFormData({
      item_code: "",
      name: "",
      category: category,
      size: "",
      color: "",
      fabric_type: "",
      unit: category === "Fabric" ? "Meters" : "Pcs",
      current_stock_quantity: 0,
      unit_cost_price: 0,
      unit_selling_price: 0,
      status: "Available",
    });
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.item_code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab = item.category === activeTab;
    
    // Status filter from Dashboard
    if (initialFilter === "Available") {
      return matchesSearch && matchesTab && item.status === "Available";
    }

    return matchesSearch && matchesTab;
  });

  return (
    <div className="p-4 space-y-6 max-w-lg mx-auto pb-40">
      {/* Header Section */}
      <div className="flex flex-col gap-6">
        <div>
          <Link href="/dashboard" className="inline-flex items-center gap-2 text-gray-500 hover:text-white transition-colors mb-4 group">
            <div className="p-2 rounded-xl bg-white/5 border border-white/5 group-hover:bg-white/10 transition-colors">
                <ArrowLeft size={16} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest">Dash Board</span>
          </Link>
          <h1 className="text-2xl font-black tracking-tight">Inventory</h1>
          <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-1">Stock Management</p>
        </div>

        {/* Specialized Add Buttons */}
        <div className="grid grid-cols-3 gap-3">
            {[
                { label: "Blazer", cat: "Blazer" as Category, icon: Plus, color: "bg-[#D4AF37]" },
                { label: "Fabric", cat: "Fabric" as Category, icon: Plus, color: "bg-[#00BFFF]" },
                { label: "Product", cat: "Product" as Category, icon: Plus, color: "bg-green-500" }
            ].map((btn) => (
                <button
                    key={btn.cat}
                    onClick={() => {
                        resetForm(btn.cat);
                        setIsFormOpen(true);
                    }}
                    className={cn(
                        "flex flex-col items-center gap-2 p-3 rounded-2xl transition-all active:scale-95 border border-white/5",
                        btn.color + "/10"
                    )}
                >
                    <div className={cn("p-2 rounded-xl", btn.color + " text-black")}>
                        <btn.icon size={20} strokeWidth={3} />
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-tighter text-white">Add {btn.label}</span>
                </button>
            ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-[#1C1C1E] p-1 rounded-2xl border border-white/5">
        {(["Blazer", "Fabric", "Product"] as Category[]).map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveTab(cat)}
            className={cn(
              "flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all",
              activeTab === cat ? "bg-white/10 text-[#D4AF37] shadow-xl" : "text-gray-500 hover:text-gray-300"
            )}
          >
            {cat}s
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative group">
        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-gray-500 group-focus-within:text-[#D4AF37] transition-colors">
          <Search size={18} />
        </div>
        <input 
          type="text"
          placeholder="Search items..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-[#1C1C1E] border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 focus:border-[#D4AF37]/50 transition-all placeholder:text-gray-600"
        />
      </div>

      {/* Item List */}
      <div className="space-y-3">
        {loading && items.length === 0 ? (
          <AppleLoader />
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-12 bg-white/5 rounded-[2.5rem] border border-dashed border-white/10">
            <p className="text-gray-500 text-sm font-medium">No {activeTab.toLowerCase()}s found</p>
          </div>
        ) : (
          filteredItems.map((item) => (
            <motion.div 
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={item.id}
              className="group bg-[#1C1C1E] border border-white/5 rounded-3xl p-5 hover:bg-white/5 transition-all"
            >
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                      <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-[#D4AF37] bg-[#D4AF37]/10 px-2 py-1 rounded-full uppercase tracking-widest">
                        {item.item_code}
                    </span>
                    <span className={cn(
                        "text-[9px] font-black px-2 py-1 rounded-full uppercase tracking-tighter",
                        (item.displayStatus || item.status) === 'Available' ? 'bg-green-500/10 text-green-500' : 
                        (item.displayStatus || item.status) === 'Booked' ? 'bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30 shadow-[0_0_10px_rgba(212,175,55,0.2)]' :
                        'bg-orange-500/10 text-orange-500'
                    )}>
                        {item.displayStatus || item.status}
                    </span>
                    {item.displayStatus === 'Booked' && (
                        <button 
                            onClick={() => setBookingInfoItem(item)}
                            className="w-5 h-5 rounded-full bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/30 flex items-center justify-center hover:bg-[#D4AF37]/20 transition-colors"
                        >
                            <span className="text-[10px] font-black italic">i</span>
                        </button>
                    )}
                  </div>
                  <h3 className="text-lg font-bold text-white tracking-tight pt-1">{item.name}</h3>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                    {item.size && <span>Size: {item.size}</span>}
                    {item.color && <span>Color: {item.color}</span>}
                    {item.fabric_type && <span>Fabric: {item.fabric_type}</span>}
                    <div className="flex items-center gap-1.5 py-1 px-2 bg-white/5 rounded-lg border border-white/5">
                        <span className="text-gray-500">Stock:</span>
                        <span className="text-white">{item.current_stock_quantity} {item.unit}</span>
                    </div>
                    <div className="flex items-center gap-1.5 py-1 px-2 bg-[#D4AF37]/5 rounded-lg border border-[#D4AF37]/10">
                        <span className="text-gray-500">Price:</span>
                        <span className="text-[#D4AF37]">{formatCurrency(item.unit_selling_price || 0)}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                        setEditingItem(item);
                        setFormData({
                            item_code: item.item_code,
                            name: item.name,
                            category: item.category,
                            size: item.size || "",
                            color: item.color || "",
                            fabric_type: item.fabric_type || "",
                            unit: item.unit || "Pcs",
                            current_stock_quantity: item.current_stock_quantity,
                            unit_cost_price: item.unit_cost_price || 0,
                            unit_selling_price: item.unit_selling_price || 0,
                            status: item.status,
                        });
                        setIsFormOpen(true);
                    }}
                    className="p-2 bg-white/5 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                  >
                    <Pencil size={18} />
                  </button>
                  <button 
                    onClick={() => setDeletingItem(item)}
                    className="p-2 bg-red-500/10 rounded-xl text-red-500 hover:bg-red-500/20 transition-all"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Form Dialog */}
      <AnimatePresence>
        {isFormOpen && (
          <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsFormOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="relative w-full max-w-lg bg-[#121212] rounded-t-[3rem] sm:rounded-[3rem] border-t sm:border border-white/10 p-8 pt-10 shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
            >
              <button 
                onClick={() => setIsFormOpen(false)}
                className="absolute top-6 right-6 text-gray-500 hover:text-white"
              >
                <X size={24} />
              </button>

              <h2 className="text-xl font-black tracking-tight mb-2">
                {editingItem ? "Edit Item" : `Add New ${formData.category}`}
              </h2>
              <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-8">
                {editingItem ? "Update item details" : "Enter information below"}
              </p>

              <form onSubmit={handleSave} className="space-y-5">
                {!editingItem && (
                   <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Item Code</label>
                    <input 
                      required
                      placeholder={`e.g., ${formData.category[0]}-001`}
                      value={formData.item_code}
                      onChange={(e) => setFormData({...formData, item_code: e.target.value})}
                      className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 px-5 text-sm focus:outline-none focus:border-[#D4AF37]/50"
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Name</label>
                  <input 
                    required
                    placeholder="Item Name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 px-5 text-sm focus:outline-none focus:border-[#D4AF37]/50"
                  />
                </div>

                {/* Category Specific Fields */}
                <div className="grid grid-cols-2 gap-4">
                  {(formData.category === "Blazer" || formData.category === "Product") && (
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Size</label>
                        <select 
                            value={formData.size}
                            onChange={(e) => setFormData({...formData, size: e.target.value})}
                            className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 px-5 text-sm focus:outline-none focus:border-[#D4AF37]/50 appearance-none text-white"
                        >
                            <option value="" className="bg-[#1C1C1E]">Select Label / Size</option>
                            <optgroup label="Standard Sizes" className="bg-[#1C1C1E] text-gray-400 font-bold">
                                <option value="XS" className="text-white">XS</option>
                                <option value="S" className="text-white">S</option>
                                <option value="M" className="text-white">M</option>
                                <option value="L" className="text-white">L</option>
                                <option value="XL" className="text-white">XL</option>
                                <option value="XXL" className="text-white">XXL</option>
                            </optgroup>
                            <optgroup label="Numbered Sizes (Blazers)" className="bg-[#1C1C1E] text-gray-400 font-bold">
                                <option value="36" className="text-white">36</option>
                                <option value="38" className="text-white">38</option>
                                <option value="40" className="text-white">40</option>
                                <option value="42" className="text-white">42</option>
                                <option value="44" className="text-white">44</option>
                                <option value="46" className="text-white">46</option>
                            </optgroup>
                            <optgroup label="Other" className="bg-[#1C1C1E] text-gray-400 font-bold">
                                <option value="Free Size" className="text-white">Free Size</option>
                                <option value="Custom" className="text-white">Custom</option>
                            </optgroup>
                        </select>
                    </div>
                  )}

                  {formData.category === "Blazer" && (
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Color</label>
                        <input 
                            placeholder="Color"
                            value={formData.color}
                            onChange={(e) => setFormData({...formData, color: e.target.value})}
                            className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 px-5 text-sm focus:outline-none focus:border-[#D4AF37]/50"
                        />
                    </div>
                  )}

                  {formData.category === "Fabric" && (
                    <div className="space-y-1.5 col-span-2">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Fabric Type</label>
                        <input 
                            required
                            placeholder="e.g., Silk, Linen"
                            value={formData.fabric_type}
                            onChange={(e) => setFormData({...formData, fabric_type: e.target.value})}
                            className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 px-5 text-sm focus:outline-none focus:border-[#D4AF37]/50"
                        />
                    </div>
                  )}
                </div>

                {(formData.category === "Fabric" || formData.category === "Product") && (
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Quantity Received</label>
                            <input 
                                type="number"
                                required
                                step="0.01"
                                value={formData.current_stock_quantity}
                                onChange={(e) => setFormData({...formData, current_stock_quantity: Number(e.target.value)})}
                                className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 px-5 text-sm focus:outline-none focus:border-[#D4AF37]/50"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Unit</label>
                            <select
                                value={formData.unit}
                                onChange={(e) => setFormData({...formData, unit: e.target.value})}
                                className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 px-5 text-sm focus:outline-none focus:border-[#D4AF37]/50 appearance-none text-white"
                            >
                                <option value="Pcs" className="bg-[#1C1C1E]">Pcs</option>
                                <option value="Meters" className="bg-[#1C1C1E]">Meters</option>
                                <option value="Yards" className="bg-[#1C1C1E]">Yards</option>
                            </select>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Unit Cost Price</label>
                        <div className="relative group">
                             <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-gray-500 text-xs font-bold">Rs.</div>
                             <input 
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="0.00"
                                value={formData.unit_cost_price || ""}
                                onChange={(e) => setFormData({...formData, unit_cost_price: parseFloat(e.target.value) || 0})}
                                className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 pl-12 pr-5 text-sm focus:outline-none focus:border-[#D4AF37]/50"
                            />
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Unit Selling Price</label>
                        <div className="relative group">
                             <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-gray-500 text-xs font-bold">Rs.</div>
                             <input 
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="0.00"
                                value={formData.unit_selling_price || ""}
                                onChange={(e) => setFormData({...formData, unit_selling_price: parseFloat(e.target.value) || 0})}
                                className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 pl-12 pr-5 text-sm focus:outline-none focus:border-[#D4AF37]/50"
                            />
                        </div>
                    </div>
                </div>

                {/* Auto-Calculation Display */}
                {(formData.category === "Fabric" || formData.category === "Product") && formData.current_stock_quantity > 0 && formData.unit_cost_price > 0 && (
                    <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="bg-[#D4AF37]/10 border border-[#D4AF37]/20 rounded-2xl p-4"
                    >
                        <p className="text-[9px] font-black text-[#D4AF37] uppercase tracking-[0.2em] mb-1">Total Inventory Value</p>
                        <p className="text-xl font-black text-white">
                            {formatCurrency(formData.current_stock_quantity * formData.unit_cost_price)}
                        </p>
                        <p className="text-[9px] text-gray-500 font-bold mt-1">
                            ({formData.current_stock_quantity} {formData.unit} × {formatCurrency(formData.unit_cost_price)} per {formData.unit?.slice(0, -1)})
                        </p>
                    </motion.div>
                )}

                <div className="space-y-1.5 pb-8">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Status</label>
                  <div className="flex gap-2">
                    {['Available', 'Rented', 'Sold'].map((s) => (
                        <button
                            key={s}
                            type="button"
                            onClick={() => setFormData({...formData, status: s as any})}
                            className={cn(
                                "flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-tighter border transition-all",
                                formData.status === s ? "bg-[#D4AF37] border-[#D4AF37] text-black" : "bg-white/5 border-white/5 text-gray-500"
                            )}
                        >
                            {s}
                        </button>
                    ))}
                  </div>
                </div>

                <button 
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#D4AF37] text-black font-black py-5 rounded-[2rem] shadow-xl shadow-[#D4AF37]/10 active:scale-95 transition-transform disabled:opacity-50"
                >
                  {loading ? "SAVING..." : editingItem ? "UPDATE ITEM" : `CONFIRM ${formData.category.toUpperCase()}`}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Booking Details Popover */}
      <AnimatePresence>
        {bookingInfoItem && (
          <div className="fixed inset-0 z-[75] flex items-center justify-center p-6">
             <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setBookingInfoItem(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-sm bg-[#1C1C1E]/90 backdrop-blur-2xl rounded-[2.5rem] p-6 shadow-2xl border border-white/10 max-h-[80vh] flex flex-col"
            >
                <div className="flex justify-between items-start mb-6 shrink-0">
                    <div>
                        <h3 className="text-xl font-black tracking-tight text-white mb-1">Booking Schedule</h3>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-[#D4AF37] bg-[#D4AF37]/10 px-2 py-1 rounded-full uppercase tracking-widest">
                                {bookingInfoItem.item_code}
                            </span>
                            <span className="text-xs text-gray-400 font-bold">{bookingInfoItem.name}</span>
                        </div>
                    </div>
                     <button 
                        onClick={() => setBookingInfoItem(null)}
                        className="p-2 bg-white/5 rounded-full text-gray-400 hover:text-white transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>

                <div className="space-y-3 overflow-y-auto pr-2 custom-scrollbar flex-1">
                    {bookingInfoItem.bookings && bookingInfoItem.bookings.length > 0 ? (
                        bookingInfoItem.bookings.map((booking, idx) => {
                            const today = new Date().toISOString().split('T')[0];
                            const isCurrent = booking.pickup_date <= today && booking.return_date >= today;

                            return (
                                <div key={idx} className={cn(
                                    "p-4 rounded-2xl border transition-colors",
                                    isCurrent ? "bg-[#D4AF37]/5 border-[#D4AF37]/30" : "bg-[#121212] border-white/5"
                                )}>
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-sm font-bold text-white">{booking.customer_name}</span>
                                        {isCurrent && (
                                            <span className="text-[8px] font-black bg-[#D4AF37] text-black px-1.5 py-0.5 rounded uppercase tracking-widest">Current</span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-4 text-xs font-medium text-gray-400">
                                        <div>
                                            <span className="text-[9px] uppercase tracking-widest text-gray-500 block mb-0.5">Pickup</span>
                                            {format(new Date(booking.pickup_date), 'MMM dd, yyyy')}
                                        </div>
                                        <div className="w-px h-6 bg-white/10" />
                                        <div>
                                            <span className="text-[9px] uppercase tracking-widest text-[#D4AF37] block mb-0.5">Return</span>
                                            <span className="text-gray-300">{format(new Date(booking.return_date), 'MMM dd, yyyy')}</span>
                                        </div>
                                    </div>
                                </div>
                            )
                        })
                    ) : (
                        <p className="text-sm text-gray-500 text-center py-4">No active bookings found.</p>
                    )}
                </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation */}
      <AnimatePresence>
        {deletingItem && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeletingItem(null)}
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-xs bg-[#1C1C1E] rounded-[2.5rem] p-8 text-center space-y-6 shadow-2xl border border-white/10"
            >
              <div className="w-16 h-16 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto">
                <Trash2 size={32} />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-black tracking-tight">Are you sure?</h3>
                <p className="text-gray-400 text-xs font-bold leading-relaxed uppercase tracking-wider">
                  You are about to delete <span className="text-white">{deletingItem.item_code}</span>. This action cannot be undone.
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={handleDelete}
                  disabled={loading}
                  className="w-full bg-red-500 text-white font-black py-4 rounded-2xl active:scale-95 transition-transform disabled:opacity-50"
                >
                  {loading ? "DELETING..." : "DELETE ITEM"}
                </button>
                <button 
                  onClick={() => setDeletingItem(null)}
                  className="w-full bg-white/5 text-gray-400 font-black py-4 rounded-2xl active:scale-95 transition-transform"
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

export default function InventoryPage() {
  return (
    <Suspense fallback={<AppleLoader />}>
      <InventoryContent />
    </Suspense>
  );
}
