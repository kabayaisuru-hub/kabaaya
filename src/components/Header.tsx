"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Menu, FileText, Loader2, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { generateFinancialReport } from "@/lib/generateFinancialReport";
import { motion, Variants } from "framer-motion";
import { signOutFromFirebase } from "@/lib/firebase-auth";

export function Header() {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleDownloadReport = async () => {
    setIsGenerating(true);
    await generateFinancialReport();
    setIsGenerating(false);
  };

  const handleLogout = async () => {
    setIsSigningOut(true);

    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      await signOutFromFirebase().catch(() => undefined);
      router.push("/login");
      router.refresh();
      setIsSigningOut(false);
    }
  };

  const text = "Premium Wedding Wear";
  const letters = text.split("");

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: (i: number = 1) => ({
      opacity: 1,
      transition: { staggerChildren: 0.05, delayChildren: 0.04 * i },
    }),
  };

  const childVariants: Variants = {
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: "spring",
        damping: 15,
        stiffness: 150,
      },
    },
    hidden: {
      opacity: 0,
      y: 15,
      scale: 0.8,
      transition: {
        type: "spring",
        damping: 15,
        stiffness: 150,
      },
    },
  };

  const logoVariants: Variants = {
    pulse: {
      scale: [1, 1.05, 1],
      opacity: [0.8, 1, 0.8],
      transition: {
        duration: 3,
        repeat: Infinity,
        ease: "easeInOut",
      },
    },
  };

  return (
    <header className="bg-[#121212]/80 backdrop-blur-md sticky top-0 z-50 px-6 py-5 flex items-center justify-between border-b border-white/5">
      <div className="flex items-center gap-4">
        <button className="text-white hover:opacity-70 transition-opacity">
          <Menu size={32} />
        </button>
        
        <div className="flex flex-col">
          <motion.div 
            className="relative w-20 h-10 overflow-hidden"
            variants={logoVariants}
            animate="pulse"
          >
            <Image 
              src="/logo.jpg" 
              alt="Shop Logo" 
              fill 
              className="object-contain object-left"
              priority
            />
          </motion.div>
          <motion.div 
            className="flex mt-1"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {letters.map((letter, index) => (
              <motion.span
                key={index}
                variants={childVariants}
                className="text-[10px] bg-gradient-to-b from-[#D4AF37] via-[#FFF5D6] to-[#C5A028] bg-clip-text text-transparent font-black uppercase tracking-[0.2em] inline-block filter drop-shadow-[0_0_1px_rgba(212,175,55,0.3)]"
              >
                {letter === " " ? "\u00A0" : letter}
              </motion.span>
            ))}
          </motion.div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={handleLogout}
          disabled={isSigningOut}
          className="text-white hover:text-red-400 transition-colors disabled:opacity-50 flex items-center gap-2 bg-white/5 px-3 py-2 rounded-xl border border-white/10"
          title="Sign Out"
        >
          {isSigningOut ? (
            <Loader2 size={20} className="animate-spin text-red-400" />
          ) : (
            <LogOut size={20} />
          )}
          <span className="text-xs font-bold hidden sm:inline">Sign Out</span>
        </button>

        <button
          onClick={handleDownloadReport}
          disabled={isGenerating}
          className="text-white hover:text-[#D4AF37] transition-colors disabled:opacity-50 flex items-center gap-2 bg-white/5 px-3 py-2 rounded-xl border border-white/10"
          title="Download Financial Report"
        >
          {isGenerating ? (
            <Loader2 size={20} className="animate-spin text-[#D4AF37]" />
          ) : (
            <FileText size={20} />
          )}
          <span className="text-xs font-bold hidden sm:inline">Report</span>
        </button>
      </div>
    </header>
  );
}
