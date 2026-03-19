"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Menu, FileText, Loader2 } from "lucide-react";
import { generateFinancialReport } from "@/lib/generateFinancialReport";
import { motion } from "framer-motion";

export function Header() {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDownloadReport = async () => {
    setIsGenerating(true);
    await generateFinancialReport();
    setIsGenerating(false);
  };

  const text = "Premium Wedding Wear";
  const letters = text.split("");

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: (i: number = 1) => ({
      opacity: 1,
      transition: { staggerChildren: 0.05, delayChildren: 0.04 * i },
    }),
  };

  const childVariants = {
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        type: "spring",
        damping: 12,
        stiffness: 200,
      },
    },
    hidden: {
      opacity: 0,
      scale: 0.5,
      transition: {
        type: "spring",
        damping: 12,
        stiffness: 200,
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
          <div className="relative w-20 h-10 overflow-hidden">
            <Image 
              src="/logo.jpg" 
              alt="Shop Logo" 
              fill 
              className="object-contain object-left"
              priority
            />
          </div>
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
                className="text-[9px] text-[#D4AF37] font-black uppercase tracking-[0.2em] inline-block"
              >
                {letter === " " ? "\u00A0" : letter}
              </motion.span>
            ))}
          </motion.div>
        </div>
      </div>

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
    </header>
  );
}
