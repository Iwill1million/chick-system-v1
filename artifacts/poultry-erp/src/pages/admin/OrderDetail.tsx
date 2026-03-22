import { useParams } from "wouter";
import { useGetOrder, useGetDeliveryLogs, customFetch } from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import { Card, Badge } from "@/components/ui-components";
import { formatCurrency, formatDate, statusColors, statusLabels } from "@/lib/utils";
import { MapPin, Phone, Calendar, Package, ArrowRight, Truck, CheckCircle2, Printer, RotateCcw } from "lucide-react";
import { Link } from "wouter";
import PrintInvoice from "@/components/PrintInvoice";
import OrderHistoryTimeline from "@/components/OrderHistoryTimeline";

interface CompanySettings {
  name: string;
  address: string;
  phone: string;
  commercialRegNo: string;
  logoUrl: string;
}

export default function AdminOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const orderId = parseInt(id!);

  const { data: order, isLoading } = useGetOrder(orderId);
  const { data: logs = [] } = useGetDeliveryLogs(orderId);
  const { data: company } = useQuery<CompanySettings>({
    queryKey: ["/api/settings"],
    queryFn: () => customFetch<CompanySettings>("/api/settings", { method: "GET" }),
    staleTime: 0,
  });

  if (isLoading || !order) return <div className="p-8 text-center animate-pulse">جاري التحميل...</div>;

  const totalAmount = order.items.reduce((sum, item) => sum + (item.quantity * parseFloat(item.unitPrice)), 0);

  return (
    <>
      {/* Hidden print invoice — shown only when window.print() is called */}
      <PrintInvoice order={order} logs={logs} company={company} />

      {/* Screen view */}
      <div className="max-w-3xl mx-auto space-y-6 pb-20">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/orders" className="p-2 bg-card border border-border rounded-full hover:bg-secondary">
            <ArrowRight className="w-5 h-5" />
          </Link>
          <h2 className="text-2xl font-display font-bold flex-1">طلب #{order.id}</h2>
          <Badge className={statusColors[order.status]}>{statusLabels[order.status]}</Badge>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">طباعة الفاتورة</span>
          </button>
        </div>

        {/* Customer Info */}
        <Card className="p-5">
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <MapPin className="w-4 h-4" />
            </div>
            بيانات العميل
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center pb-3 border-b border-border/50">
              <span className="text-muted-foreground">الاسم</span>
              <span className="font-bold">{order.customer?.name ?? "—"}</span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b border-border/50">
              <span className="text-muted-foreground">الهاتف</span>
              <span className="font-bold text-primary flex items-center gap-2" dir="ltr">
                {order.customer?.phone ?? "—"} <Phone className="w-4 h-4" />
              </span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b border-border/50">
              <span className="text-muted-foreground">الموقع</span>
              <span className="font-bold text-left max-w-[60%]">{order.customer?.location || "غير محدد"}</span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b border-border/50">
              <span className="text-muted-foreground">تاريخ الطلب</span>
              <span className="font-bold flex items-center gap-2">
                {formatDate(order.orderDate)} <Calendar className="w-4 h-4 text-muted-foreground" />
              </span>
            </div>
            {order.agent && (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">المندوب المعين</span>
                <span className="font-bold flex items-center gap-2">
                  <Truck className="w-4 h-4 text-primary" /> {order.agent.name}
                </span>
              </div>
            )}
          </div>
        </Card>

        {/* Products */}
        <Card className="p-5">
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-accent">
              <Package className="w-4 h-4" />
            </div>
            تفاصيل الطلبية
          </h3>
          <div className="space-y-4">
            {order.items.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center p-3 bg-secondary/20 rounded-xl">
                <div className="flex gap-3 items-center">
                  <span className="w-8 h-8 rounded-lg bg-background border border-border flex items-center justify-center font-bold text-sm">
                    {item.quantity}
                  </span>
                  <span className="font-bold">{item.product?.name}</span>
                </div>
                <span className="font-bold text-primary">{formatCurrency(item.quantity * parseFloat(item.unitPrice))}</span>
              </div>
            ))}
            <div className="pt-4 mt-2 border-t border-dashed border-border flex justify-between items-center">
              <span className="font-bold text-lg">الإجمالي</span>
              <span className="font-display font-extrabold text-2xl text-primary">{formatCurrency(totalAmount)}</span>
            </div>
          </div>
        </Card>

        {/* Delivery Logs */}
        {logs.length > 0 && (
          <Card className="p-5 bg-emerald-50/50 border-emerald-100">
            <h3 className="font-bold text-lg mb-4 text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" /> سجل التوصيل
            </h3>
            {logs.map(log => (
              <div key={log.id} className="text-sm space-y-2 text-emerald-900">
                <div className="flex justify-between">
                  <span>المبلغ المحصل:</span>
                  <span className="font-bold">{formatCurrency(log.collectedAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span>الكمية المسلمة:</span>
                  <span className="font-bold">{log.deliveredQuantity}</span>
                </div>
                {(parseFloat(log.fuelExpense) > 0 || parseFloat(log.otherExpenses) > 0) && (
                  <div className="flex justify-between text-xs opacity-80">
                    <span>المصاريف:</span>
                    <span>{formatCurrency(parseFloat(log.fuelExpense) + parseFloat(log.otherExpenses))}</span>
                  </div>
                )}
              </div>
            ))}
          </Card>
        )}

        {logs.length === 0 && order.status !== "delivered" && order.status !== "cancelled" && (
          <Card className="p-5 text-center text-muted-foreground">
            <p className="text-sm">لم يتم تسجيل أي توصيل بعد</p>
          </Card>
        )}

        {/* Stock restore notice — shown when order is cancelled */}
        {order.status === "cancelled" && (
          <Card className="p-4 bg-amber-50/60 border-amber-200 flex items-start gap-3">
            <RotateCcw className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-bold text-amber-800">تم استعادة المخزون</p>
              <p className="text-xs text-amber-700 mt-0.5">تم إعادة كميات منتجات هذا الطلب إلى المخزون تلقائياً عند الإلغاء.</p>
            </div>
          </Card>
        )}

        {/* Order History Timeline */}
        <OrderHistoryTimeline orderId={orderId} />
      </div>
    </>
  );
}
