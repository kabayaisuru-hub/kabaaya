"use client";

import React from "react";
import { Search, X, Calendar, Scissors, Package, Phone, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { formatCurrency } from "@/lib/utils";

interface BookingResult {
  id: string;
  customer_name: string;
  customer_phone: string;
  pickup_date: string;
  return_date: string;
  total_amount: number;
  status: string;
  item_ids: string[];
}

interface TailoringResult {
  id: string;
  invoice_id: string;
  customer_name: string;
  customer_phone: string;
  total_amount: number;
  status: string;
  created_at: string;
  items: { item_description: string; stitching_price: number }[];
}

interface InventoryResult {
  id: string;
  item_code: string;
  name: string;
  category: string;
  size: string | null;
  color: string | null;
  status: string;
}

export function GlobalSearch() {
  const [query, setQuery] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [bookings, setBookings] = React.useState<BookingResult[]>([]);
  const [tailoring, setTailoring] = React.useState<TailoringResult[]>([]);
  const [inventory, setInventory] = React.useState<InventoryResult[]>([]);
  const [hasSearched, setHasSearched] = React.useState(false);
  const debounceRef = React.useRef<NodeJS.Timeout | null>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const totalResults = bookings.length + tailoring.length + inventory.length;

  const performSearch = async (searchTerm: string) => {
    if (searchTerm.length < 2) {
      setBookings([]);
      setTailoring([]);
      setInventory([]);
      setHasSearched(false);
      return;
    }

    setIsLoading(true);
    setHasSearched(true);
    const q = `%${searchTerm}%`;

    try {
      const [bookingRes, tailoringRes, inventoryRes] = await Promise.all([
        // Bookings: search by name or phone
        supabase
          .from("bookings")
          .select("id, customer_name, customer_phone, pickup_date, return_date, total_amount, status, item_ids")
          .or(`customer_name.ilike.${q},customer_phone.ilike.${q}`)
          .order("created_at", { ascending: false })
          .limit(10),

        // Tailoring Orders: search by name, phone, or invoice_id
        supabase
          .from("tailoring_orders")
          .select("id, invoice_id, customer_name, customer_phone, total_amount, status, created_at, items:tailoring_items(item_description, stitching_price)")
          .or(`customer_name.ilike.${q},customer_phone.ilike.${q},invoice_id.ilike.${q}`)
          .order("created_at", { ascending: false })
          .limit(10),

        // Inventory: search by item_code or name
        supabase
          .from("inventory")
          .select("id, item_code, name, category, size, color, status")
          .or(`item_code.ilike.${q},name.ilike.${q}`)
          .order("created_at", { ascending: false })
          .limit(10),
      ]);

      setBookings((bookingRes.data as BookingResult[]) || []);
      setTailoring((tailoringRes.data as TailoringResult[]) || []);
      setInventory((inventoryRes.data as InventoryResult[]) || []);

      // Cross-link: If searching by blazer code, also find bookings linked to that inventory item
      if (searchTerm.toUpperCase().startsWith("B-") && inventoryRes.data && inventoryRes.data.length > 0) {
        const inventoryIds = inventoryRes.data.map((item: InventoryResult) => item.id);
        
        // Find bookings that contain any of these inventory IDs
        const { data: linkedBookings } = await supabase
          .from("bookings")
          .select("id, customer_name, customer_phone, pickup_date, return_date, total_amount, status, item_ids")
          .order("created_at", { ascending: false })
          .limit(20);

        if (linkedBookings) {
          const filtered = linkedBookings.filter((b: BookingResult) =>
            b.item_ids?.some((itemId: string) => inventoryIds.includes(itemId))
          );
          // Merge without duplicates
          setBookings(prev => {
            const existingIds = new Set(prev.map(b => b.id));
            const newOnes = filtered.filter((b: BookingResult) => !existingIds.has(b.id));
            return [...prev, ...newOnes];
          });
        }
      }
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      performSearch(val.trim());
    }, 300);
  };

  const clearSearch = () => {
    setQuery("");
    setBookings([]);
    setTailoring([]);
    setInventory([]);
    setHasSearched(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Confirmed": return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "PickedUp": return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      case "Returned": return "bg-green-500/20 text-green-400 border-green-500/30";
      case "Cancelled": return "bg-red-500/20 text-red-400 border-red-500/30";
      case "Pending": return "bg-gray-500/20 text-gray-400 border-gray-500/30";
      case "Measuring": return "bg-purple-500/20 text-purple-400 border-purple-500/30";
      case "Sewing": return "bg-orange-500/20 text-orange-400 border-orange-500/30";
      case "Ready": return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
      case "Completed": return "bg-green-500/20 text-green-400 border-green-500/30";
      case "Available": return "bg-green-500/20 text-green-400 border-green-500/30";
      case "Rented": return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      case "Sold": return "bg-red-500/20 text-red-400 border-red-500/30";
      default: return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="relative"
    >
      {/* Search Input */}
      <div className="relative">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10">
          {isLoading ? (
            <Loader2 className="text-[#D4AF37] animate-spin" size={20} />
          ) : (
            <Search className="text-gray-500" size={20} />
          )}
        </div>
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          placeholder="Search by name, phone, or blazer number..."
          className="w-full h-14 bg-[#1C1C1E] border border-[#2C2C2E] rounded-2xl pl-12 pr-12 text-white text-sm font-medium placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/40 focus:border-[#D4AF37]/60 transition-all"
        />
        {query && (
          <button
            onClick={clearSearch}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="text-gray-500" size={18} />
          </button>
        )}
      </div>

      {/* Results */}
      <AnimatePresence>
        {hasSearched && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="mt-3 overflow-hidden"
          >
            {totalResults === 0 && !isLoading ? (
              <div className="bg-[#1C1C1E]/80 backdrop-blur-md border border-[#2C2C2E] rounded-2xl p-8 text-center">
                <Search className="mx-auto text-gray-600 mb-3" size={32} />
                <p className="text-gray-500 text-sm font-bold">No results found</p>
                <p className="text-gray-600 text-xs mt-1">Try a different name, phone number, or blazer code</p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Result Count */}
                {totalResults > 0 && (
                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">
                    {totalResults} result{totalResults !== 1 ? "s" : ""} found
                  </p>
                )}

                {/* Booking Results */}
                {bookings.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 px-1">
                      <Calendar size={14} className="text-blue-400" />
                      <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">
                        Bookings ({bookings.length})
                      </span>
                    </div>
                    {bookings.map((booking) => (
                      <motion.div
                        key={`booking-${booking.id}`}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="bg-[#1C1C1E]/80 backdrop-blur-md border border-[#2C2C2E] rounded-2xl p-4 hover:border-blue-500/30 transition-all"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <h4 className="text-white font-bold text-sm truncate">{booking.customer_name}</h4>
                            <a
                              href={`tel:${booking.customer_phone}`}
                              className="flex items-center gap-1.5 mt-1 group/phone"
                            >
                              <Phone size={12} className="text-[#D4AF37] group-hover/phone:text-green-400 transition-colors" />
                              <span className="text-gray-400 text-xs group-hover/phone:text-green-400 transition-colors">
                                {booking.customer_phone}
                              </span>
                            </a>
                          </div>
                          <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border uppercase tracking-wider ${getStatusColor(booking.status)}`}>
                            {booking.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-3 bg-black/30 rounded-xl px-3 py-2">
                          <Calendar size={12} className="text-gray-500 shrink-0" />
                          <span className="text-gray-400 text-xs">
                            {formatDate(booking.pickup_date)} → {formatDate(booking.return_date)}
                          </span>
                          <span className="ml-auto text-[#D4AF37] text-xs font-bold">
                            {formatCurrency(booking.total_amount)}
                          </span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}

                {/* Tailoring Results */}
                {tailoring.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 px-1">
                      <Scissors size={14} className="text-purple-400" />
                      <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest">
                        Tailoring ({tailoring.length})
                      </span>
                    </div>
                    {tailoring.map((order) => (
                      <motion.div
                        key={`tailoring-${order.id}`}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="bg-[#1C1C1E]/80 backdrop-blur-md border border-[#2C2C2E] rounded-2xl p-4 hover:border-purple-500/30 transition-all"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="text-white font-bold text-sm truncate">{order.customer_name}</h4>
                              <span className="text-[10px] font-bold text-[#D4AF37] bg-[#D4AF37]/10 px-2 py-0.5 rounded-full shrink-0">
                                {order.invoice_id}
                              </span>
                            </div>
                            {order.customer_phone && (
                              <a
                                href={`tel:${order.customer_phone}`}
                                className="flex items-center gap-1.5 mt-1 group/phone"
                              >
                                <Phone size={12} className="text-[#D4AF37] group-hover/phone:text-green-400 transition-colors" />
                                <span className="text-gray-400 text-xs group-hover/phone:text-green-400 transition-colors">
                                  {order.customer_phone}
                                </span>
                              </a>
                            )}
                          </div>
                          <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border uppercase tracking-wider ${getStatusColor(order.status)}`}>
                            {order.status}
                          </span>
                        </div>
                        {/* Items & Stitching Price */}
                        {order.items && order.items.length > 0 && (
                          <div className="mt-3 space-y-1.5">
                            {order.items.map((item, idx) => (
                              <div key={idx} className="flex items-center justify-between bg-black/30 rounded-xl px-3 py-2">
                                <span className="text-gray-400 text-xs truncate mr-2">{item.item_description}</span>
                                <span className="text-purple-400 text-xs font-bold shrink-0">
                                  {formatCurrency(item.stitching_price)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="flex items-center justify-between mt-2 px-1">
                          <span className="text-gray-600 text-[10px]">
                            {formatDate(order.created_at)}
                          </span>
                          <span className="text-[#D4AF37] text-xs font-bold">
                            Total: {formatCurrency(order.total_amount)}
                          </span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}

                {/* Inventory Results */}
                {inventory.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 px-1">
                      <Package size={14} className="text-[#D4AF37]" />
                      <span className="text-[10px] font-black text-[#D4AF37] uppercase tracking-widest">
                        Inventory ({inventory.length})
                      </span>
                    </div>
                    {inventory.map((item) => (
                      <motion.div
                        key={`inventory-${item.id}`}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="bg-[#1C1C1E]/80 backdrop-blur-md border border-[#2C2C2E] rounded-2xl p-4 hover:border-[#D4AF37]/30 transition-all"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-[#D4AF37] font-black text-sm">{item.item_code}</span>
                              <span className="text-[10px] font-bold text-gray-500 bg-white/5 px-2 py-0.5 rounded-full uppercase">
                                {item.category}
                              </span>
                            </div>
                            <h4 className="text-white font-medium text-sm mt-1">{item.name}</h4>
                            <div className="flex items-center gap-3 mt-1.5">
                              {item.size && (
                                <span className="text-gray-500 text-xs">Size: <span className="text-gray-300">{item.size}</span></span>
                              )}
                              {item.color && (
                                <span className="text-gray-500 text-xs">Color: <span className="text-gray-300">{item.color}</span></span>
                              )}
                            </div>
                          </div>
                          <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border uppercase tracking-wider ${getStatusColor(item.status)}`}>
                            {item.status}
                          </span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
