import { useQuery } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import { History } from "lucide-react";
import { Card } from "@/components/ui-components";

const statusLabels: Record<string, string> = {
  pending: "قيد الانتظار",
  preparing: "جاري التجهيز",
  delivering: "جاري التوصيل",
  delivered: "تم التوصيل",
  cancelled: "ملغي",
};

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  preparing: "bg-blue-100 text-blue-800 border-blue-200",
  delivering: "bg-orange-100 text-orange-800 border-orange-200",
  delivered: "bg-emerald-100 text-emerald-800 border-emerald-200",
  cancelled: "bg-red-100 text-red-800 border-red-200",
};

const statusDots: Record<string, string> = {
  pending: "bg-yellow-400",
  preparing: "bg-blue-500",
  delivering: "bg-orange-500",
  delivered: "bg-emerald-500",
  cancelled: "bg-red-500",
};

interface HistoryEntry {
  id: number;
  orderId: number;
  changedBy: { id: number; name: string };
  oldStatus: string;
  newStatus: string;
  notes?: string | null;
  changedAt: string;
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("ar-SA", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface Props {
  orderId: number;
}

export default function OrderHistoryTimeline({ orderId }: Props) {
  const { data: history = [], isLoading } = useQuery({
    queryKey: [`/api/orders/${orderId}/history`],
    queryFn: () => customFetch<HistoryEntry[]>(`/api/orders/${orderId}/history`),
    refetchOnWindowFocus: false,
  });

  if (isLoading) return null;

  if (history.length === 0) {
    return (
      <Card className="p-5">
        <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
            <History className="w-4 h-4 text-muted-foreground" />
          </div>
          سجل التعديلات
        </h3>
        <p className="text-sm text-muted-foreground text-center py-2">لا توجد تعديلات مسجلة بعد</p>
      </Card>
    );
  }

  return (
    <Card className="p-5">
      <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
          <History className="w-4 h-4 text-muted-foreground" />
        </div>
        سجل التعديلات
        <span className="text-sm font-normal text-muted-foreground mr-1">({history.length})</span>
      </h3>

      <div className="relative">
        {history.map((entry, idx) => (
          <div key={entry.id} className="flex gap-3 pb-5 last:pb-0 relative">
            {/* Vertical line */}
            {idx < history.length - 1 && (
              <div className="absolute right-[11px] top-6 bottom-0 w-px bg-border" />
            )}

            {/* Dot */}
            <div className={`relative z-10 w-6 h-6 rounded-full flex-shrink-0 mt-1 flex items-center justify-center ${statusDots[entry.newStatus] ?? "bg-gray-400"}`}>
              <div className="w-2 h-2 rounded-full bg-white" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${statusColors[entry.oldStatus] ?? "bg-gray-100 text-gray-700"}`}>
                  {statusLabels[entry.oldStatus] ?? entry.oldStatus}
                </span>
                <span className="text-muted-foreground text-xs">←</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${statusColors[entry.newStatus] ?? "bg-gray-100 text-gray-700"}`}>
                  {statusLabels[entry.newStatus] ?? entry.newStatus}
                </span>
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                <span>بواسطة: <span className="font-semibold text-foreground">{entry.changedBy.name}</span></span>
                <span>{formatDateTime(entry.changedAt)}</span>
              </div>
              {entry.notes && (
                <div className="mt-1.5 flex items-start gap-1.5 text-xs text-red-700 bg-red-50 border border-red-100 rounded-lg px-2.5 py-1.5">
                  <span className="font-bold shrink-0">سبب الإلغاء:</span>
                  <span className="italic">{entry.notes}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
