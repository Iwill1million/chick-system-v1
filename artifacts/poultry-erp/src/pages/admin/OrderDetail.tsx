import { useState } from "react";
import { useParams } from "wouter";
import { useGetOrder, useGetDeliveryLogs, useUpdateOrderStatus, customFetch } from "@workspace/api-client-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, Badge, Button } from "@/components/ui-components";
import { formatCurrency, formatDate, statusColors, statusLabels } from "@/lib/utils";
import { MapPin, Phone, Calendar, Package, ArrowRight, Truck, CheckCircle2, Printer, RotateCcw, MessageCircle, Send, AlertCircle, XCircle, Banknote, CreditCard, Wallet, Image as ImageIcon } from "lucide-react";
import { Link } from "wouter";
import PrintInvoice from "@/components/PrintInvoice";
import OrderHistoryTimeline from "@/components/OrderHistoryTimeline";
import CancelOrderModal from "@/components/CancelOrderModal";

const expenseCategoryLabels: Record<string, string> = {
  fuel: "وقود",
  food: "أكل ومشروبات",
  collection_fee: "رسوم تحصيل",
  other: "أخرى",
};

const paymentMethodConfig: Record<string, { label: string; icon: typeof Banknote; color: string }> = {
  cash: { label: "كاش", icon: Banknote, color: "text-emerald-700 bg-emerald-50 border-emerald-200" },
  transfer: { label: "تحويل بنكي", icon: CreditCard, color: "text-blue-700 bg-blue-50 border-blue-200" },
  wallet: { label: "محفظة إلكترونية", icon: Wallet, color: "text-violet-700 bg-violet-50 border-violet-200" },
};

interface CompanySettings {
  name: string;
  address: string;
  phone: string;
  commercialRegNo: string;
  logoUrl: string;
}

interface WhatsappLog {
  id: number;
  customerId: number;
  orderId: number | null;
  messageType: "order_confirmation" | "delivery_notice" | "customer_statement";
  status: "sent" | "failed";
  toPhone: string;
  errorMessage: string | null;
  sentAt: string;
}

const messageTypeLabels: Record<string, string> = {
  order_confirmation: "تأكيد الطلب",
  delivery_notice: "إشعار التسليم",
  customer_statement: "كشف الحساب",
};

export default function AdminOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const orderId = parseInt(id!);
  const queryClient = useQueryClient();

  const [sendResult, setSendResult] = useState<Record<string, { ok: boolean; error?: string } | null>>({});
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const { data: order, isLoading } = useGetOrder(orderId);
  const { data: logs = [] } = useGetDeliveryLogs(orderId);

  const cancelMut = useUpdateOrderStatus({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [`/api/orders/${orderId}`] });
        queryClient.invalidateQueries({ queryKey: [`/api/orders/${orderId}/history`] });
        setIsCancelModalOpen(false);
        setCancelReason("");
      }
    }
  });

  const handleCancelConfirm = () => {
    cancelMut.mutate({ id: orderId, data: { status: "cancelled", reason: cancelReason.trim() || undefined } });
  };

  const { data: company } = useQuery<CompanySettings>({
    queryKey: ["/api/settings"],
    queryFn: () => customFetch<CompanySettings>("/api/settings", { method: "GET" }),
    staleTime: 0,
  });

  const waLogsKey = [`/api/whatsapp/logs/order/${orderId}`];
  const { data: waLogs = [] } = useQuery<WhatsappLog[]>({
    queryKey: waLogsKey,
    queryFn: () => customFetch<WhatsappLog[]>(`/api/whatsapp/logs/order/${orderId}`),
    enabled: !!orderId,
  });

  const sendWaMut = useMutation({
    mutationFn: ({ type }: { type: "order_confirmation" | "delivery_notice" }) =>
      customFetch<{ ok: boolean; toPhone?: string; error?: string }>(
        `/api/whatsapp/${type === "order_confirmation" ? "order-confirmation" : "delivery-notice"}/${orderId}`,
        { method: "POST" }
      ),
    onSuccess: (data, variables) => {
      setSendResult(prev => ({ ...prev, [variables.type]: { ok: data.ok, error: data.error } }));
      queryClient.invalidateQueries({ queryKey: waLogsKey });
    },
    onError: (err: Error, variables) => {
      setSendResult(prev => ({ ...prev, [variables.type]: { ok: false, error: err.message } }));
      queryClient.invalidateQueries({ queryKey: waLogsKey });
    },
  });

  if (isLoading || !order) return <div className="p-8 text-center animate-pulse">جاري التحميل...</div>;

  const totalAmount = order.items.reduce((sum, item) => sum + (item.quantity * parseFloat(item.unitPrice)), 0);
  const hasPhone = !!order.customer?.phone;
  const isDelivered = order.status === "delivered";
  const isCancelled = order.status === "cancelled";

  return (
    <>
      <PrintInvoice order={order} logs={logs} company={company} />

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

        {/* WhatsApp Actions */}
        {!isCancelled && (
          <Card className="p-5 border-green-200 bg-green-50/30">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-green-800">
              <MessageCircle className="w-5 h-5" /> إرسال عبر واتساب
            </h3>

            {!hasPhone && (
              <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm mb-3">
                <AlertCircle className="w-4 h-4 shrink-0" />
                العميل لا يملك رقم هاتف مُسجَّل — يرجى إضافة رقم الهاتف في بيانات العميل أولاً.
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <button
                disabled={!hasPhone || sendWaMut.isPending}
                onClick={() => { setSendResult(prev => ({ ...prev, order_confirmation: null })); sendWaMut.mutate({ type: "order_confirmation" }); }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-green-500 bg-white hover:bg-green-50 text-green-800 text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                <Send className="w-4 h-4" />
                إرسال تأكيد الطلب
              </button>

              {isDelivered && (
                <button
                  disabled={!hasPhone || sendWaMut.isPending}
                  onClick={() => { setSendResult(prev => ({ ...prev, delivery_notice: null })); sendWaMut.mutate({ type: "delivery_notice" }); }}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-blue-500 bg-white hover:bg-blue-50 text-blue-800 text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  إرسال إشعار التسليم
                </button>
              )}
            </div>

            {/* Inline send feedback */}
            {Object.entries(sendResult).map(([type, result]) =>
              result ? (
                <div
                  key={type}
                  className={`mt-3 text-sm font-medium flex items-center gap-1.5 ${result.ok ? "text-emerald-700" : "text-destructive"}`}
                >
                  {result.ok
                    ? <><CheckCircle2 className="w-4 h-4" /> تم الإرسال بنجاح</>
                    : <><AlertCircle className="w-4 h-4" /> فشل الإرسال: {result.error}</>
                  }
                </div>
              ) : null
            )}
          </Card>
        )}

        {/* Delivery Logs */}
        {logs.length > 0 && (
          <Card className="p-5 bg-emerald-50/50 border-emerald-100">
            <h3 className="font-bold text-lg mb-4 text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" /> سجل التوصيل
            </h3>
            {logs.map(log => {
              const pmCfg = log.paymentMethod ? paymentMethodConfig[log.paymentMethod] : null;
              const totalExpenses = log.expenses?.reduce((s, e) => s + parseFloat(e.amount), 0) ?? 0;
              return (
                <div key={log.id} className="space-y-4">
                  {/* Collected amount + payment method */}
                  <div className="flex items-center justify-between p-3 bg-emerald-100/60 rounded-xl">
                    <div>
                      <p className="text-xs text-emerald-700 mb-0.5">المبلغ المحصل</p>
                      <p className="font-bold text-xl text-emerald-900">{formatCurrency(log.collectedAmount)}</p>
                    </div>
                    {pmCfg && (
                      <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-sm font-semibold ${pmCfg.color}`}>
                        <pmCfg.icon className="w-4 h-4" />
                        {pmCfg.label}
                      </div>
                    )}
                  </div>

                  {/* Receipt image */}
                  {log.paymentImageUrl && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
                      <p className="text-xs text-blue-700 font-semibold mb-2 flex items-center gap-1"><ImageIcon className="w-3.5 h-3.5" /> إيصال التحويل</p>
                      <a href={log.paymentImageUrl} target="_blank" rel="noreferrer" className="block">
                        <img
                          src={log.paymentImageUrl}
                          alt="إيصال التحويل"
                          className="max-h-40 rounded-lg object-contain border border-blue-200 cursor-pointer hover:opacity-90 transition"
                        />
                      </a>
                    </div>
                  )}

                  {/* Delivered items */}
                  {log.items && log.items.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-emerald-700 mb-2">المنتجات المسلّمة</p>
                      <div className="overflow-hidden rounded-xl border border-emerald-200">
                        <table className="w-full text-sm">
                          <thead className="bg-emerald-100/80">
                            <tr>
                              <th className="px-3 py-2 text-right font-semibold text-emerald-800">المنتج</th>
                              <th className="px-3 py-2 text-center font-semibold text-emerald-800">المطلوب</th>
                              <th className="px-3 py-2 text-center font-semibold text-emerald-800">المسلّم</th>
                            </tr>
                          </thead>
                          <tbody>
                            {log.items.map(item => (
                              <tr key={item.id} className="border-t border-emerald-100">
                                <td className="px-3 py-2 font-medium text-emerald-900">{item.productName}</td>
                                <td className="px-3 py-2 text-center text-emerald-700">{item.orderedQty}</td>
                                <td className="px-3 py-2 text-center font-bold text-emerald-900">{item.deliveredQty}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Expenses */}
                  {log.expenses && log.expenses.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-amber-700 mb-2">بنود المصاريف</p>
                      <div className="space-y-1.5">
                        {log.expenses.map(exp => (
                          <div key={exp.id} className="flex items-center justify-between p-2.5 bg-amber-50 border border-amber-100 rounded-xl text-sm">
                            <div>
                              <span className="font-medium text-amber-900">{expenseCategoryLabels[exp.category]}</span>
                              {exp.description && <span className="text-xs text-amber-700 mr-2">— {exp.description}</span>}
                            </div>
                            <span className="font-bold text-amber-900">{formatCurrency(exp.amount)}</span>
                          </div>
                        ))}
                        <div className="flex justify-between px-2.5 pt-1 font-semibold text-sm text-amber-800">
                          <span>إجمالي المصاريف</span>
                          <span>{formatCurrency(totalExpenses.toString())}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {log.notes && (
                    <div className="p-3 bg-secondary/30 rounded-xl text-sm text-muted-foreground">
                      <span className="font-semibold text-foreground ml-1">ملاحظات:</span>{log.notes}
                    </div>
                  )}
                </div>
              );
            })}
          </Card>
        )}

        {logs.length === 0 && order.status !== "delivered" && order.status !== "cancelled" && (
          <Card className="p-5 text-center text-muted-foreground">
            <p className="text-sm">لم يتم تسجيل أي توصيل بعد</p>
          </Card>
        )}

        {/* Stock restore notice */}
        {order.status === "cancelled" && (
          <Card className="p-4 bg-amber-50/60 border-amber-200 flex items-start gap-3">
            <RotateCcw className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-bold text-amber-800">تم استعادة المخزون</p>
              <p className="text-xs text-amber-700 mt-0.5">تم إعادة كميات منتجات هذا الطلب إلى المخزون تلقائياً عند الإلغاء.</p>
            </div>
          </Card>
        )}

        {/* WhatsApp Message Log */}
        {waLogs.length > 0 && (
          <Card className="p-5">
            <h3 className="font-bold text-base mb-4 flex items-center gap-2 text-muted-foreground">
              <MessageCircle className="w-4 h-4" /> سجل رسائل واتساب
            </h3>
            <div className="space-y-2">
              {waLogs.map(log => (
                <div key={log.id} className="flex items-center justify-between p-3 bg-secondary/20 rounded-xl text-sm">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${log.status === "sent" ? "bg-emerald-500" : "bg-destructive"}`} />
                    <span className="font-medium">{messageTypeLabels[log.messageType] ?? log.messageType}</span>
                    {log.errorMessage && (
                      <span className="text-xs text-destructive">— {log.errorMessage}</span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground text-left" dir="ltr">
                    <div>{log.toPhone}</div>
                    <div>{new Date(log.sentAt).toLocaleString("ar-EG")}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Order History Timeline */}
        <OrderHistoryTimeline orderId={orderId} />

        {/* Cancel Order Button (Admin) */}
        {['pending', 'preparing', 'delivering'].includes(order.status) && (
          <div className="flex flex-col items-end gap-1">
            <Button
              variant="outline"
              className="w-full text-destructive border-destructive/30 hover:bg-destructive/10"
              onClick={() => setIsCancelModalOpen(true)}
              isLoading={cancelMut.isPending}
            >
              <XCircle className="w-4 h-4 ml-2" /> إلغاء الطلب
            </Button>
            <p className="text-xs text-muted-foreground text-center w-full">سيتم إعادة الكميات المحجوزة إلى المخزون تلقائياً</p>
          </div>
        )}
      </div>

      <CancelOrderModal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        reason={cancelReason}
        onReasonChange={setCancelReason}
        onConfirm={handleCancelConfirm}
        isLoading={cancelMut.isPending}
      />
    </>
  );
}
