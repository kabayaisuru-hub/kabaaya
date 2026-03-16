"use client";

import React from "react";
import { motion } from "framer-motion";

export function AppleLoader() {
  const bars = Array.from({ length: 12 });
  
  return (
    <div className="flex items-center justify-center p-8">
      <div className="relative w-8 h-8">
        {bars.map((_, i) => (
          <motion.div
            key={i}
            className="absolute left-1/2 top-0 w-[2px] h-2 bg-gray-400 rounded-full origin-[center_16px]"
            style={{ rotate: i * 30 }}
            animate={{ opacity: [0.2, 1, 0.2] }}
            transition={{
              repeat: Infinity,
              duration: 1,
              ease: "linear",
              delay: i * 0.08,
            }}
          />
        ))}
      </div>
    </div>
  );
}
