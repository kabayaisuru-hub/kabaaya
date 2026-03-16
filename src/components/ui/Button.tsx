import * as React from "react"
import { cn } from "@/lib/utils"
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg' | 'icon'
  isLoading?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, children, disabled, ...props }, ref) => {
    const variants = {
      primary: 'bg-[#D4AF37] text-black hover:bg-[#B8962E] active:scale-95 shadow-lg shadow-[#D4AF37]/20',
      secondary: 'bg-[#2C2C2E] text-white hover:bg-[#3A3A3C] active:scale-95',
      outline: 'border border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37]/10 active:scale-95',
      ghost: 'text-white hover:bg-white/10 active:scale-95',
    }

    const sizes = {
      sm: 'px-3 py-1.5 text-sm rounded-lg',
      md: 'px-6 py-3 rounded-xl font-bold',
      lg: 'px-8 py-4 text-lg rounded-2xl font-bold',
      icon: 'p-2 rounded-lg',
    }

    return (
      <button
        ref={ref}
        disabled={isLoading || disabled}
        className={cn(
          'inline-flex items-center justify-center transition-all disabled:opacity-50 disabled:pointer-events-none',
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {isLoading ? (
          <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : null}
        {children}
      </button>
    )
  }
)
Button.displayName = "Button"
