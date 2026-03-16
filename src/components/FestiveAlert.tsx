"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Moon, Star, Sparkles, X, Gift, Calendar } from "lucide-react";
import { getHolidayForDate, getUpcomingHoliday, Holiday } from "@/lib/holidays";

export function FestiveAlert() {
  const [activeHoliday, setActiveHoliday] = useState<Holiday | null>(null);
  const [isUpcoming, setIsUpcoming] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const today = new Date();
    const current = getHolidayForDate(today);
    const upcoming = getUpcomingHoliday(today, 3);

    if (current) {
      setActiveHoliday(current);
      setIsUpcoming(false);
      setIsVisible(true);
    } else if (upcoming) {
      setActiveHoliday(upcoming);
      setIsUpcoming(true);
      setIsVisible(true);
    }
  }, []);

  if (!isVisible || !activeHoliday) return null;

  const isPoya = activeHoliday.type === 'Poya';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative mb-6 overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-[#1C1C1E] to-[#0A0A0A] border border-white/10 p-6 shadow-2xl"
      >
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {isPoya ? (
            <motion.div
              animate={{ 
                scale: [1, 1.2, 1],
                opacity: [0.1, 0.3, 0.1] 
              }}
              transition={{ duration: 4, repeat: Infinity }}
              className="absolute -right-10 -top-10 w-40 h-40 bg-blue-500/20 rounded-full blur-3xl"
            />
          ) : (
            <motion.div
              animate={{ 
                scale: [1, 1.5, 1],
                opacity: [0.1, 0.2, 0.1] 
              }}
              transition={{ duration: 5, repeat: Infinity }}
              className="absolute -right-20 -bottom-20 w-60 h-60 bg-[#D4AF37]/10 rounded-full blur-3xl"
            />
          )}
        </div>

        <div className="relative flex items-center justify-between gap-4">
          <div className="flex items-center gap-5">
            <div className={`p-4 rounded-2xl ${isPoya ? 'bg-blue-500/10' : 'bg-[#D4AF37]/10'} border border-white/5`}>
              {isPoya ? (
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 5, repeat: Infinity }}
                >
                  <Moon className="text-blue-400" size={28} />
                </motion.div>
              ) : activeHoliday.name.includes('Christmas') ? (
                <Gift className="text-red-500" size={28} />
              ) : (
                <Sparkles className="text-[#D4AF37]" size={28} />
              )}
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className={`text-[9px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded-full ${isUpcoming ? 'bg-orange-500/10 text-orange-500' : 'bg-green-500/10 text-green-500'}`}>
                  {isUpcoming ? 'Upcoming Holiday' : 'Today is a Holiday'}
                </span>
                {isUpcoming && (
                    <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">
                        In {Math.ceil((new Date(activeHoliday.date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} Days
                    </span>
                )}
              </div>
              <h3 className="text-xl font-black text-white tracking-tight">
                {activeHoliday.name}
              </h3>
              <p className="text-gray-400 text-xs font-medium">
                {isPoya 
                  ? "May the blessings of the full moon bring peace and prosperity."
                  : `Wishing you a wonderful ${activeHoliday.name} celebration.`}
              </p>
            </div>
          </div>

          <button 
            onClick={() => setIsVisible(false)}
            className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl transition-colors text-gray-500 hover:text-white border border-white/5"
          >
            <X size={18} />
          </button>
        </div>

        {/* Floating Particles for Poya */}
        {isPoya && (
          <div className="absolute inset-0 pointer-events-none">
             {[...Array(6)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0 }}
                  animate={{ 
                    opacity: [0, 1, 0],
                    y: [-20, -60],
                    x: [Math.random() * 20 - 10, Math.random() * 20 - 10]
                  }}
                  transition={{ 
                    duration: 3 + Math.random() * 2, 
                    repeat: Infinity,
                    delay: i * 0.5
                  }}
                  className="absolute"
                  style={{ 
                    right: `${10 + (i * 15)}%`, 
                    bottom: '20%' 
                  }}
                >
                  <Star size={8} className="text-blue-400/40" />
                </motion.div>
             ))}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
