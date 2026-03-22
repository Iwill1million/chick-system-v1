import React, { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

// BUTTON
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "destructive";
  size?: "sm" | "md" | "lg" | "icon";
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", isLoading, children, disabled, ...props }, ref) => {
    const variants = {
      primary: "bg-gradient-to-l from-primary to-primary/90 text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 active:translate-y-0",
      secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
      outline: "border-2 border-border bg-transparent hover:bg-secondary/50 text-foreground",
      ghost: "bg-transparent hover:bg-secondary/50 text-foreground",
      destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-lg shadow-destructive/20",
    };

    const sizes = {
      sm: "h-9 px-4 text-sm",
      md: "h-11 px-6 text-base",
      lg: "h-14 px-8 text-lg",
      icon: "h-11 w-11 p-2 flex items-center justify-center",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          "inline-flex items-center justify-center rounded-xl font-display font-bold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {isLoading ? (
          <span className="animate-spin mr-2 h-5 w-5 border-2 border-current border-t-transparent rounded-full" />
        ) : null}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";

// INPUT
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  label?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, label, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && <label className="text-sm font-semibold text-foreground/80">{label}</label>}
        <input
          ref={ref}
          className={cn(
            "flex h-12 w-full rounded-xl border-2 border-border bg-card px-4 py-2 text-sm text-foreground shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/10 disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/10",
            className
          )}
          {...props}
        />
        {error && <span className="text-xs text-destructive font-medium">{error}</span>}
      </div>
    );
  }
);
Input.displayName = "Input";

// SELECT
export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { label: string; value: string | number }[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, options, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && <label className="text-sm font-semibold text-foreground/80">{label}</label>}
        <select
          ref={ref}
          className={cn(
            "flex h-12 w-full rounded-xl border-2 border-border bg-card px-4 py-2 text-sm text-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/10 disabled:cursor-not-allowed disabled:opacity-50 appearance-none",
            error && "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/10",
            className
          )}
          {...props}
        >
          <option value="" disabled>اختر...</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && <span className="text-xs text-destructive font-medium">{error}</span>}
      </div>
    );
  }
);
Select.displayName = "Select";

// CARD
export function Card({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("bg-card rounded-2xl border border-border/50 shadow-xl shadow-black/[0.02] overflow-hidden", className)} {...props}>
      {children}
    </div>
  );
}

// BADGE
export function Badge({ className, children, variant = "default" }: { className?: string, children: React.ReactNode, variant?: "default" | "outline" | "soft" }) {
  return (
    <span className={cn(
      "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold transition-colors",
      variant === "default" && "bg-primary text-primary-foreground",
      variant === "outline" && "border border-border text-foreground",
      variant === "soft" && "bg-secondary text-secondary-foreground",
      className
    )}>
      {children}
    </span>
  );
}

// MODAL
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-lg bg-card rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-card z-10">
              <h2 className="text-xl font-display font-bold text-foreground">{title}</h2>
              <button onClick={onClose} className="p-2 rounded-full hover:bg-secondary transition-colors">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// TABLE (Simple generic wrapper)
export function Table({ children, className }: { children: React.ReactNode, className?: string }) {
  return (
    <div className="w-full overflow-auto">
      <table className={cn("w-full text-sm text-right", className)}>
        {children}
      </table>
    </div>
  );
}
export function Th({ children, className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return <th className={cn("px-6 py-4 font-bold text-muted-foreground bg-secondary/30 border-b border-border", className)} {...props}>{children}</th>;
}
export function Td({ children, className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn("px-6 py-4 border-b border-border/50", className)} {...props}>{children}</td>;
}
