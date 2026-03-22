import { useParams } from "wouter";
import { useGetOrder, useGetDeliveryLogs } from "@workspace/api-client-react";
import { Card, Badge } from "@/components/ui-components";
import { formatCurrency, formatDate, statusColors, statusLabels } from "@/lib/utils";
import { MapPin, Phone, Calendar, Package, ArrowRight, Truck, CheckCircle2, Printer } from "lucide-react";
import { Link } from "wouter";

export default function AdminOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const orderId = parseInt(id!);

  const { data: order, isLoading } = useGetOrder(orderId);
  const { data: logs = [] } = useGetDeliveryLogs(orderId);

  if (isLoading || !order) return <div className="p-8 text-center animate-pulse">جاري التحميل...</div>;

  const totalAmount = order.items.reduce((sum, item) => sum + (item.quantity * parseFloat(item.unitPrice)), 0);

  return (
    <>
      {/* ===== Hidden Print Invoice ===== */}
      <div id="print-invoice" style={{ fontFamily: "'Cairo', 'Tajawal', Arial, sans-serif", direction: "rtl", color: "#111", padding: "0 24px" }}>
        {/* Header */}
        <div style={{ borderBottom: "3px solid #059669", paddingBottom: 16, marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: "#059669", margin: 0 }}>نظام إدارة تجارة الدواجن</h1>
            <p style={{ fontSize: 12, color: "#666", marginTop: 4 }}>فاتورة طلب رسمية</p>
          </div>
          <div style={{ textAlign: "left" }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#111" }}>طلب #{order.id}</div>
            <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>{formatDate(order.orderDate)}</div>
          </div>
        </div>

        {/* Status badge */}
        <div style={{ marginBottom: 20 }}>
          <span style={{
            display: "inline-block",
            padding: "4px 16px",
            borderRadius: 99,
            fontWeight: 700,
            fontSize: 13,
            background: order.status === "delivered" ? "#d1fae5" : order.status === "cancelled" ? "#fee2e2" : "#fef3c7",
            color: order.status === "delivered" ? "#065f46" : order.status === "cancelled" ? "#991b1b" : "#92400e",
            border: "1px solid currentColor",
          }}>
            الحالة: {statusLabels[order.status]}
          </span>
        </div>

        {/* Two column: customer + agent */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 24 }}>
          {/* Customer */}
          <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 800, marginBottom: 12, borderBottom: "1px solid #e5e7eb", paddingBottom: 8 }}>بيانات العميل</h3>
            <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
              <tbody>
                <tr>
                  <td style={{ color: "#666", padding: "4px 0" }}>الاسم</td>
                  <td style={{ fontWeight: 700, textAlign: "left" }}>{order.customer?.name ?? "—"}</td>
                </tr>
                <tr>
                  <td style={{ color: "#666", padding: "4px 0" }}>الهاتف</td>
                  <td style={{ fontWeight: 700, textAlign: "left", direction: "ltr" }}>{order.customer?.phone ?? "—"}</td>
                </tr>
                <tr>
                  <td style={{ color: "#666", padding: "4px 0" }}>الموقع</td>
                  <td style={{ fontWeight: 700, textAlign: "left" }}>{order.customer?.location || "غير محدد"}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Agent */}
          <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 800, marginBottom: 12, borderBottom: "1px solid #e5e7eb", paddingBottom: 8 }}>بيانات التوصيل</h3>
            <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
              <tbody>
                <tr>
                  <td style={{ color: "#666", padding: "4px 0" }}>المندوب</td>
                  <td style={{ fontWeight: 700, textAlign: "left" }}>{order.agent?.name ?? "غير معين"}</td>
                </tr>
                <tr>
                  <td style={{ color: "#666", padding: "4px 0" }}>التاريخ</td>
                  <td style={{ fontWeight: 700, textAlign: "left" }}>{formatDate(order.orderDate)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Products Table */}
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 14, fontWeight: 800, marginBottom: 12 }}>تفاصيل الطلبية</h3>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#f0fdf4", borderBottom: "2px solid #059669" }}>
                <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700 }}>المنتج</th>
                <th style={{ padding: "10px 12px", textAlign: "center", fontWeight: 700 }}>الكمية</th>
                <th style={{ padding: "10px 12px", textAlign: "center", fontWeight: 700 }}>سعر الوحدة</th>
                <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 700 }}>الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item, idx) => (
                <tr key={idx} style={{ borderBottom: "1px solid #e5e7eb", background: idx % 2 === 0 ? "#fff" : "#f9fafb" }}>
                  <td style={{ padding: "10px 12px", fontWeight: 600 }}>{item.product?.name}</td>
                  <td style={{ padding: "10px 12px", textAlign: "center" }}>{item.quantity}</td>
                  <td style={{ padding: "10px 12px", textAlign: "center" }}>{formatCurrency(parseFloat(item.unitPrice))}</td>
                  <td style={{ padding: "10px 12px", textAlign: "left", fontWeight: 700 }}>{formatCurrency(item.quantity * parseFloat(item.unitPrice))}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: "2px solid #059669", background: "#f0fdf4" }}>
                <td colSpan={3} style={{ padding: "12px", fontWeight: 800, fontSize: 15 }}>الإجمالي الكلي</td>
                <td style={{ padding: "12px", textAlign: "left", fontWeight: 800, fontSize: 17, color: "#059669" }}>{formatCurrency(totalAmount)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Delivery log summary if present */}
        {logs.length > 0 && (
          <div style={{ border: "1px solid #a7f3d0", borderRadius: 10, padding: 16, background: "#f0fdf4", marginBottom: 24 }}>
            <h3 style={{ fontSize: 14, fontWeight: 800, color: "#065f46", marginBottom: 12 }}>ملخص التوصيل</h3>
            {logs.map((log, i) => (
              <div key={i} style={{ fontSize: 13, display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ color: "#065f46" }}>المبلغ المحصل: <strong>{formatCurrency(log.collectedAmount)}</strong></span>
                <span style={{ color: "#065f46" }}>الكمية المسلمة: <strong>{log.deliveredQuantity}</strong></span>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: 16, textAlign: "center", fontSize: 11, color: "#999" }}>
          تم إصدار هذه الفاتورة من نظام إدارة تجارة الدواجن — {new Date().toLocaleDateString("ar-EG")}
        </div>
      </div>

      {/* ===== Screen View ===== */}
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

        {logs.length === 0 && order.status !== "delivered" && (
          <Card className="p-5 text-center text-muted-foreground">
            <p className="text-sm">لم يتم تسجيل أي توصيل بعد</p>
          </Card>
        )}
      </div>
    </>
  );
}
