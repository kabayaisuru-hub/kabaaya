"use client";

import React, { useState, useEffect } from "react";
import { 
  Plus, 
  Trash2, 
  ArrowLeft,
  Receipt,
  Pencil,
  X,
  CreditCard,
  Calendar,
  ChevronRight
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { AppleLoader } from "@/components/AppleLoader";
import { cn, formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import Link from "next/link";
import { deleteExpense, listExpensesByDate, saveExpense } from "@/lib/firebase-db";

type ExpenseCategory = 'Vehicle' | 'Petrol' | 'Shop Rent' | 'Tea/Meals' | 'Light Bill' | 'Water Bill' | 'Other';

interface Expense {
  id: string;
  category: ExpenseCategory;
  amount: number;
  description: string;
  expense_date: string;
  created_at: string;
}

const CATEGORIES: ExpenseCategory[] = ['Vehicle', 'Petrol', 'Shop Rent', 'Tea/Meals', 'Light Bill', 'Water Bill', 'Other'];

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    category: 'Other' as ExpenseCategory,
    amount: "",
    description: "",
    expense_date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchTodayExpenses();
  }, []);

  const fetchTodayExpenses = async () => {
    setLoading(true);
    const today = new Date().toISOString().split('T')[0];
    try {
      const data = await listExpensesByDate(today);
      setExpenses(data || []);
    } catch (error) {
      console.error("Error fetching today's expenses:", error);
    }
    setLoading(false);
  };

  const totalsToday = expenses.reduce((acc, curr) => acc + Number(curr.amount), 0);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const payload = {
      category: formData.category,
      amount: parseFloat(formData.amount),
      description: formData.description,
      expense_date: formData.expense_date
    };

    try {
      await saveExpense(payload, editingExpenseId || undefined);
      setIsFormOpen(false);
      resetForm();
      fetchTodayExpenses();
    } catch (error) {
      alert(
        error instanceof Error ? `Error saving expense: ${error.message}` : "Error saving expense."
      );
    }
    setLoading(false);
  };

  const resetForm = () => {
    setFormData({
      category: 'Other',
      amount: "",
      description: "",
      expense_date: new Date().toISOString().split('T')[0]
    });
    setEditingExpenseId(null);
  };

  const handleEdit = (expense: Expense) => {
    setEditingExpenseId(expense.id);
    setFormData({
      category: expense.category,
      amount: expense.amount.toString(),
      description: expense.description || "",
      expense_date: expense.expense_date
    });
    setIsFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this expense?")) return;
    
    setLoading(true);
    try {
      await deleteExpense(id);
      fetchTodayExpenses();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to delete expense.");
    }
    setLoading(false);
  };

  return (
    <div className="p-4 space-y-6 max-w-lg mx-auto pb-40">
      {/* Header */}
      <div className="flex flex-col gap-6">
        <div>
          <Link href="/dashboard" className="inline-flex items-center gap-2 text-gray-500 hover:text-white transition-colors mb-4 group">
            <div className="p-2 rounded-xl bg-white/5 border border-white/5 group-hover:bg-white/10 transition-colors">
                <ArrowLeft size={16} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest">Dash Board</span>
          </Link>
          <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-black tracking-tight text-white">Expenses</h1>
                <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-1">Daily Log</p>
              </div>
              <div className="p-3 bg-red-500/10 rounded-2xl border border-red-500/20">
                  <Receipt className="text-red-500" size={24} />
              </div>
          </div>
        </div>

        {/* Summary Card */}
        <div className="bg-[#1C1C1E] border border-white/5 rounded-3xl p-6 relative overflow-hidden group">
            <div className="absolute -right-10 -top-10 w-32 h-32 bg-red-500/10 blur-3xl rounded-full" />
            <div className="relative">
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Total Expenses Today</p>
                <h2 className="text-3xl font-black text-white">{formatCurrency(totalsToday)}</h2>
            </div>
        </div>

        <button 
          onClick={() => {
            resetForm();
            setIsFormOpen(true);
          }}
          className="w-full bg-white text-black font-black py-4 rounded-2xl flex items-center justify-center gap-2 shadow-xl active:scale-95 transition-all"
        >
          <Plus size={20} strokeWidth={3} />
          <span className="text-sm uppercase tracking-widest">Add Daily Expense</span>
        </button>
      </div>

      {/* Expense List */}
      <div className="space-y-4">
        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest px-1">Today's Transactions</h3>
        {loading && expenses.length === 0 ? (
          <AppleLoader />
        ) : expenses.length === 0 ? (
          <div className="text-center py-12 bg-white/5 rounded-[2.5rem] border border-dashed border-white/10">
            <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">No expenses logged today</p>
          </div>
        ) : (
          expenses.map((expense) => (
            <motion.div 
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={expense.id}
              className="bg-[#1C1C1E] border border-white/5 rounded-3xl p-5 hover:bg-white/5 transition-all group"
            >
              <div className="flex justify-between items-start">
                <div className="flex gap-4">
                    <div className="p-3 bg-red-500/10 rounded-xl border border-red-500/10">
                        <CreditCard className="text-red-500" size={18} />
                    </div>
                    <div>
                        <h4 className="text-white font-bold text-sm">{expense.category}</h4>
                        <p className="text-[10px] text-gray-500 font-medium">{expense.description || 'No description'}</p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-white font-black">{formatCurrency(expense.amount)}</p>
                    <div className="flex gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleEdit(expense)} className="p-1.5 text-gray-500 hover:text-blue-500">
                            <Pencil size={14} />
                        </button>
                        <button onClick={() => handleDelete(expense.id)} className="p-1.5 text-gray-500 hover:text-red-500">
                            <Trash2 size={14} />
                        </button>
                    </div>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Form Modal */}
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
              className="relative w-full max-w-lg bg-[#121212] rounded-t-[3rem] sm:rounded-[3rem] border-t sm:border border-white/10 p-8 shadow-2xl overflow-hidden"
            >
              <button onClick={() => setIsFormOpen(false)} className="absolute top-6 right-6 text-gray-500 hover:text-white">
                <X size={24} />
              </button>

              <h2 className="text-2xl font-black tracking-tight mb-8 text-white">
                {editingExpenseId ? "Edit Expense" : "New Expense"}
              </h2>

              <form onSubmit={handleSave} className="space-y-6">
                <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Category</label>
                    <select 
                        required
                        value={formData.category}
                        onChange={(e) => setFormData({...formData, category: e.target.value as ExpenseCategory})}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-5 text-sm focus:outline-none focus:border-red-500/50 text-white appearance-none"
                    >
                        {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                </div>

                <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Amount (Rs.)</label>
                    <input 
                        required
                        type="number"
                        placeholder="0.00"
                        value={formData.amount}
                        onChange={(e) => setFormData({...formData, amount: e.target.value})}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-5 text-sm focus:outline-none focus:border-red-500/50 text-white"
                    />
                </div>

                <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Description</label>
                    <input 
                        placeholder="What was it for?"
                        value={formData.description}
                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-5 text-sm focus:outline-none focus:border-red-500/50 text-white"
                    />
                </div>

                <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Date</label>
                    <div className="relative">
                        <Calendar size={14} className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500" />
                        <input 
                            required
                            type="date"
                            value={formData.expense_date}
                            onChange={(e) => setFormData({...formData, expense_date: e.target.value})}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-5 text-sm focus:outline-none focus:border-red-500/50 text-white"
                        />
                    </div>
                </div>

                <button 
                    disabled={loading}
                    className="w-full bg-red-500 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 mt-4 enabled:active:scale-95 transition-all disabled:opacity-50"
                >
                    {editingExpenseId ? "Update Entry" : "Save Expense"}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
