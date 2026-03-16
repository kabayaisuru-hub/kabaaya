"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  CalendarPlus, 
  Scissors, 
  Briefcase, 
  Package,
  Receipt 
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Bookings", icon: CalendarPlus, href: "/bookings" }, 
  { label: "Tailoring", icon: Scissors, href: "/tailoring" },
  { label: "Expenses", icon: Receipt, href: "/expenses" },
  { label: "Inventory", icon: Package, href: "/inventory" },
];

export function BottomNavigation() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#121212] border-t border-white/5 px-4 pb-safe-area-inset-bottom shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
      <div className="flex justify-around items-center h-24 max-w-lg mx-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center space-y-2 transition-all w-full",
                isActive ? "text-white" : "text-gray-400"
              )}
            >
              <div className={cn(
                "relative p-3 rounded-2xl transition-all duration-300",
                isActive && "text-[#00BFFF] drop-shadow-[0_0_10px_rgba(0,191,255,0.8)]"
              )}>
                <Icon size={32} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span className={cn(
                    "text-[10px] font-medium tracking-tight whitespace-nowrap",
                    isActive ? "text-white" : "text-gray-400"
                )}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
