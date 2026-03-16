"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { motion } from "framer-motion";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // Handle specific Supabase error types
        if (error.message.includes("fetch")) {
            setError("Connection Error: Failed to reach the authentication server. Please check your internet connection and ensure that NEXT_PUBLIC_SUPABASE_URL is correctly configured in your .env file.");
        } else {
            setError(error.message);
        }
        throw error;
      }

      if (data.user) {
        router.push("/welcome");
      }
    } catch (err: any) {
      if (!error) { // Error already set above if it was a Supabase error
        setError(err.message || "Login failed. Please check your credentials.");
      }
      console.error("Login error details:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-black">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-md space-y-8"
      >
        <div className="flex flex-col items-center space-y-4">
          <div className="relative w-40 h-20 md:w-48 md:h-24">
            <Image
              src="/logo.jpg"
              alt="Wedding Shop ERP"
              fill
              className="object-contain"
              priority
            />
          </div>
          <div className="text-center space-y-1">
            <h1 className="text-3xl font-black text-white tracking-tight">
              Kabaaya <span className="text-[#D4AF37]">ERP</span>
            </h1>
            <p className="text-[10px] text-[#D4AF37] font-black uppercase tracking-[0.2em]">
              Premium Wedding Wear
            </p>
          </div>
          <p className="text-gray-500 font-medium">Please sign in to continue</p>
        </div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="bg-[#1C1C1E] p-8 rounded-[2.5rem] border border-[#2C2C2E] shadow-2xl"
        >
          <form onSubmit={handleLogin} className="space-y-6">
            <Input
              label="Email Address"
              type="email"
              placeholder="admin@shop.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="bg-red-500/10 border border-red-500/50 p-3 rounded-xl"
              >
                <p className="text-red-500 text-xs font-bold text-center uppercase tracking-wider">
                  {error}
                </p>
              </motion.div>
            )}

            <Button
              type="submit"
              className="w-full h-14"
              isLoading={loading}
            >
              Sign In
            </Button>
          </form>
        </motion.div>

        <div className="text-center">
          <p className="text-gray-600 text-xs font-bold uppercase tracking-widest">
            &copy; {new Date().getFullYear()} Kabaaya Wedding Shop
          </p>
        </div>
      </motion.div>
    </main>
  );
}
