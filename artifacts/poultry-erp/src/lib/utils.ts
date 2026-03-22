import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: string | number) {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("ar-EG", {
    style: "currency",
    currency: "EGP",
    minimumFractionDigits: 0,
  }).format(num);
}

export function formatDate(dateStr: string) {
  try {
    return format(new Date(dateStr), "PPP", { locale: ar });
  } catch {
    return dateStr;
  }
}

export const statusColors: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 border-amber-200",
  preparing: "bg-blue-100 text-blue-800 border-blue-200",
  delivering: "bg-orange-100 text-orange-800 border-orange-200",
  delivered: "bg-green-100 text-green-800 border-green-200",
  cancelled: "bg-red-100 text-red-800 border-red-200",
};

export const statusLabels: Record<string, string> = {
  pending: "قيد الانتظار",
  preparing: "جاري التجهيز",
  delivering: "جاري التوصيل",
  delivered: "تم التوصيل",
  cancelled: "ملغي",
};
