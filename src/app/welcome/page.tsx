"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

export default function WelcomePage() {
  const router = useRouter();
  const [showProgress, setShowProgress] = useState(false);

  useEffect(() => {
    // Show progress bar after 1s
    const progressTimer = setTimeout(() => setShowProgress(true), 1000);
    
    // Redirect after 3.5s (allowing animation to complete)
    const redirectTimer = setTimeout(() => {
      router.push("/dashboard");
    }, 4500);

    return () => {
      clearTimeout(progressTimer);
      clearTimeout(redirectTimer);
    };
  }, [router]);

  return (
    <main className="min-h-screen bg-black flex flex-col items-center justify-center p-6 overflow-hidden">
      <motion.div 
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ 
          duration: 1.2, 
          ease: [0.16, 1, 0.3, 1] 
        }}
        className="relative flex flex-col items-center space-y-12"
      >
        <div className="relative w-48 h-48 md:w-64 md:h-64">
          <Image
            src="/logo.jpg"
            alt="Wedding Shop Logo"
            fill
            className="object-contain"
            priority
          />
        </div>

        <div className="space-y-4 text-center">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="text-4xl md:text-6xl font-black text-white tracking-tighter"
          >
            Welcome, <span className="text-[#D4AF37]">Admin</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 1 }}
            className="text-gray-500 font-bold uppercase tracking-[0.3em] text-xs md:text-sm"
          >
            Initializing Wedding Shop ERP
          </motion.p>
        </div>

        <div className="w-64 md:w-80 h-1 bg-[#1C1C1E] rounded-full overflow-hidden relative">
          <AnimatePresence>
            {showProgress && (
              <motion.div 
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 3, ease: "easeInOut" }}
                className="absolute inset-0 bg-gradient-to-r from-[#D4AF37]/50 via-[#D4AF37] to-[#D4AF37]/50 shadow-[0_0_15px_rgba(212,175,55,0.5)]"
              />
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      <div className="absolute bottom-12 flex flex-col items-center space-y-2 opacity-30">
        <div className="w-1 h-12 bg-gradient-to-b from-[#D4AF37] to-transparent rounded-full animate-bounce" />
        <span className="text-[10px] font-bold text-[#D4AF37] uppercase tracking-[0.2em]">Loading System</span>
      </div>
    </main>
  );
}
