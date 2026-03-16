import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface DashboardCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: string;
    isUp: boolean;
  };
  className?: string;
  onClick?: () => void;
}

export function DashboardCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  className,
  onClick
}: DashboardCardProps) {
  return (
    <div 
      onClick={onClick}
      className={cn(
        "bg-[#1C1C1E] border border-[#2C2C2E] p-6 rounded-[2rem] shadow-xl hover:bg-[#2C2C2E]/50 transition-all active:scale-[0.98] cursor-pointer group",
        className
      )}
    >
      <div className="flex justify-between items-start mb-4">
        <div className="p-3 bg-black rounded-2xl border border-white/5 group-hover:border-[#D4AF37]/30 transition-colors">
          <Icon className="text-[#D4AF37]" size={24} />
        </div>
        {trend && (
          <span className={cn(
            "text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-widest",
            trend.isUp ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
          )}>
            {trend.isUp ? "↑" : "↓"} {trend.value}
          </span>
        )}
      </div>
      
      <div className="space-y-1">
        <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">
          {title}
        </p>
        <h3 className="text-3xl font-black text-white tracking-tight">
          {value}
        </h3>
        {subtitle && (
          <p className="text-gray-500 text-[10px] font-medium">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}
