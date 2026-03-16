import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatusCardProps {
  title: string;
  subtitle: string;
  count?: number;
  icon: LucideIcon;
  iconBgColor: string;
  iconColor: string;
  className?: string;
}

export function StatusCard({
  title,
  subtitle,
  count,
  icon: Icon,
  iconBgColor,
  iconColor,
  className
}: StatusCardProps) {
  return (
    <div className={cn(
      "bg-[#555555] rounded-2xl p-5 flex items-center justify-between shadow-lg border border-white/5 active:scale-[0.98] transition-all",
      className
    )}>
      <div className="flex items-center gap-5">
        <div className={cn("p-3 rounded-xl flex items-center justify-center shadow-md", iconBgColor)}>
          <Icon size={24} className={iconColor} />
        </div>
        <div className="space-y-0.5">
          <h4 className="text-gray-100 font-bold text-base leading-tight">
            {title}
          </h4>
          <p className="text-gray-300/80 text-sm font-medium">
            {subtitle}
          </p>
        </div>
      </div>
      
      {count !== undefined && (
        <span className="text-white font-bold text-xl">
          {count}
        </span>
      )}
    </div>
  );
}
