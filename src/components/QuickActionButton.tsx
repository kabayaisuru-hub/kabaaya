import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface QuickActionButtonProps {
  label: string;
  icon: LucideIcon;
  onClick?: () => void;
  className?: string;
}

export function QuickActionButton({
  label,
  icon: Icon,
  onClick,
  className
}: QuickActionButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center p-4 bg-[#1C1C1E] border border-[#2C2C2E] rounded-3xl space-y-2 hover:bg-[#2C2C2E] transition-all active:scale-90 group h-28 w-full shadow-lg",
        className
      )}
    >
      <div className="p-3 bg-black rounded-2xl border border-white/5 group-hover:border-[#D4AF37]/50 transition-all">
        <Icon className="text-[#D4AF37]" size={24} />
      </div>
      <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest group-hover:text-white transition-colors">
        {label}
      </span>
    </button>
  );
}
