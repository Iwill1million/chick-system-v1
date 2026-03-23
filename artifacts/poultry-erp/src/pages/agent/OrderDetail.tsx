import { useState, useRef } from "react";
import { useParams } from "wouter";
import { useGetOrder, useUpdateOrderStatus, useCreateDeliveryLog, useGetDeliveryLogs, UpdateOrderStatusRequestStatus, customFetch } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button, Card, Badge, Modal } from "@/components/ui-components";
import { formatCurrency, formatDate, statusColors, statusLabels } from "@/lib/utils";
import { MapPin, Phone, Calendar, Package, ArrowRight, Truck, CheckCircle2, XCircle, Plus, Trash2, Upload, Image as ImageIcon, Banknote, Wallet, CreditCard } from "lucide-react";
import { Link } from "wouter";
import OrderHistoryTimeline from "@/components/OrderHistoryTimeline";
import CancelOrderModal from "@/components/CancelOrderModal";

const expenseCategoryLabels: Record<string, string> = {
  fuel: "وقود",
  food: "أكل ومشروبات",
  collection_fee: "رسوم تحصيل",
  other: "أخرى",
};

const paymentMethodConfig = [
  { value: "cash", label: "كاش", icon: Banknote, color: "text-emerald-700 border-emerald-300 bg-emerald-50" },
  { value: "transfer", label: "تحويل بنكي", icon: CreditCard, color: "text-blue-700 border-blue-300 bg-blue-50" },
  { value: "wallet", label: "محفظة إلكترونية", icon: Wallet, color: "text-violet-700 border-violet-300 bg-violet-50" },
] as const;

interface ExpenseRow {
  category: "fuel" | "food" | "collection_fee" | "other";
  amount: string;
  description: string;
}

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const orderId = parseInt(id!);
  const queryClient = useQueryClient();

  const { data: order, isLoading } = useGetOrder(orderId);
  const { data: logs = [] } = useGetDeliveryLogs(orderId);

  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const [collectedAmount, setCollectedAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "transfer" | "wallet">("cash");
  const [paymentImageUrl, setPaymentImageUrl] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [deliveredItems, setDeliveredItems] = useState<Record<number, number>>({});
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isUploading, setIsUploading] = useState(false);

  const uploadReceiptFile = async (file: File): Promise<string | null> => {
    setIsUploading(true);
    try {
      const { uploadURL, objectPath } = await customFetch<{ uploadURL: string; objectPath: string }>(
        "/api/storage/uploads/request-url",
        {
          method: "POST",
          body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type || "application/octet-stream" }),
        }
      );
      await fetch(uploadURL, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type || "application/octet-stream" },
      });
      const { serveUrl } = await customFetch<{ serveUrl: string; objectPath: string }>(
        "/api/storage/uploads/complete",
        { method: "POST", body: JSON.stringify({ objectPath }) }
      );
      return serveUrl;
    } catch {
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const statusMut = useUpdateOrderStatus({
    mutation: { onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/orders/${orderId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/orders/${orderId}/history`] });
    }}
  });

  const logMut = useCreateDeliveryLog({
    mutation: { onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/delivery-logs/${orderId}`] });
      statusMut.mutate({ id: orderId, data: { status: "delivered" } });
      setIsLogModalOpen(false);
    }}
  });

  if (isLoading || !order) return <div className="p-8 text-center animate-pulse">جاري التحميل...</div>;

  const totalAmount = order.items.reduce((sum, item) => sum + (item.quantity * parseFloat(item.unitPrice)), 0);

  const openLogModal = () => {
    const initial: Record<number, number> = {};
    order.items.forEach(item => { initial[item.productId] = item.quantity; });
    setDeliveredItems(initial);
    setCollectedAmount(totalAmount.toString());
    setPaymentMethod("cash");
    setPaymentImageUrl("");
    setNotes("");
    setExpenses([]);
    setIsLogModalOpen(true);
  };

  const updateStatus = (status: UpdateOrderStatusRequestStatus) => {
    statusMut.mutate({ id: orderId, data: { status } });
  };

  const handleCancelConfirm = () => {
    statusMut.mutate({ id: orderId, data: { status: "cancelled", reason: cancelReason.trim() || undefined } }, {
      onSuccess: () => {
        setIsCancelModalOpen(false);
        setCancelReason("");
      }
    });
  };

  const addExpense = () => setExpenses(prev => [...prev, { category: "other", amount: "", description: "" }]);
  const removeExpense = (idx: number) => setExpenses(prev => prev.filter((_, i) => i !== idx));
  const updateExpense = (idx: number, field: keyof ExpenseRow, value: string) => {
    setExpenses(prev => prev.map((e, i) => i === idx ? { ...e, [field]: value } : e));
  };

  const totalExpenses = expenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
  const totalDeliveredQty = Object.values(deliveredItems).reduce((s, v) => s + v, 0);

  const handleLogSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const items = order.items.map(item => ({
      productId: item.productId,
      orderedQty: item.quantity,
      deliveredQty: deliveredItems[item.productId] ?? item.quantity,
    }));
    const validExpenses = expenses.filter(ex => parseFloat(ex.amount) > 0);
    const fuelTotal = validExpenses.filter(e => e.category === "fuel").reduce((s, e) => s + parseFloat(e.amount), 0);
    const otherTotal = validExpenses.filter(e => e.category !== "fuel").reduce((s, e) => s + parseFloat(e.amount), 0);

    logMut.mutate({
      data: {
        orderId,
        collectedAmount,
        deliveredQuantity: totalDeliveredQty,
        fuelExpense: fuelTotal.toString(),
        otherExpenses: otherTotal.toString(),
        notes,
        paymentMethod,
        paymentImageUrl: paymentImageUrl || undefined,
        items,
        expenses: validExpenses.map(ex => ({
          category: ex.category,
          amount: ex.amount,
          description: ex.description || undefined,
        })),
      }
    });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/agent/orders" className="p-2 bg-card border border-border rounded-full hover:bg-secondary">
          <ArrowRight className="w-5 h-5" />
        </Link>
        <h2 className="text-2xl font-display font-bold flex-1">طلب #{order.id}</h2>
        <Badge className={statusColors[order.status]}>{statusLabels[order.status]}</Badge>
      </div>

      {/* Customer Info */}
      <Card className="p-5">
        <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary"><MapPin className="w-4 h-4"/></div> بيانات العميل</h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center pb-3 border-b border-border/50"><span className="text-muted-foreground">الاسم</span><span className="font-bold">{order.customer.name}</span></div>
          <div className="flex justify-between items-center pb-3 border-b border-border/50"><span className="text-muted-foreground">الهاتف</span><span className="font-bold text-primary flex items-center gap-2" dir="ltr">{order.customer.phone} <Phone className="w-4 h-4"/></span></div>
          <div className="flex justify-between items-center pb-3 border-b border-border/50"><span className="text-muted-foreground">الموقع</span><span className="font-bold text-left max-w-[60%]">{order.customer.location || 'غير محدد'}</span></div>
          <div className="flex justify-between items-center"><span className="text-muted-foreground">تاريخ الطلب</span><span className="font-bold flex items-center gap-2">{formatDate(order.orderDate)} <Calendar className="w-4 h-4 text-muted-foreground"/></span></div>
        </div>
      </Card>

      {/* Products */}
      <Card className="p-5">
        <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-accent"><Package className="w-4 h-4"/></div> تفاصيل الطلبية</h3>
        <div className="space-y-4">
          {order.items.map((item, idx) => (
            <div key={idx} className="flex justify-between items-center p-3 bg-secondary/20 rounded-xl">
              <div className="flex gap-3 items-center">
                <span className="w-8 h-8 rounded-lg bg-background border border-border flex items-center justify-center font-bold text-sm">{item.quantity}</span>
                <span className="font-bold">{item.product?.name}</span>
              </div>
              <span className="font-bold text-primary">{formatCurrency(item.quantity * parseFloat(item.unitPrice))}</span>
            </div>
          ))}
          <div className="pt-4 mt-2 border-t border-dashed border-border flex justify-between items-center">
            <span className="font-bold text-lg">الإجمالي المطلوب</span>
            <span className="font-display font-extrabold text-2xl text-primary">{formatCurrency(totalAmount)}</span>
          </div>
        </div>
      </Card>

      {/* Existing Logs */}
      {logs.length > 0 && (
        <Card className="p-5 bg-emerald-50/50 border-emerald-100">
          <h3 className="font-bold text-lg mb-4 text-emerald-800 flex items-center gap-2"><CheckCircle2 className="w-5 h-5"/> تم التسليم</h3>
          {logs.map(log => (
            <div key={log.id} className="text-sm space-y-3 text-emerald-900">
              <div className="flex justify-between font-bold text-base border-b border-emerald-200 pb-2 mb-2">
                <span>المبلغ المحصل:</span>
                <span className="text-emerald-700">{formatCurrency(log.collectedAmount)}</span>
              </div>
              {log.paymentMethod && (
                <div className="flex justify-between text-xs">
                  <span>طريقة الدفع:</span>
                  <span className="font-semibold">{paymentMethodConfig.find(p => p.value === log.paymentMethod)?.label ?? log.paymentMethod}</span>
                </div>
              )}
              {log.items && log.items.length > 0 && (
                <div>
                  <p className="text-xs text-emerald-700 font-semibold mb-1">المنتجات المسلّمة:</p>
                  {log.items.map(item => (
                    <div key={item.id} className="flex justify-between text-xs py-0.5">
                      <span>{item.productName}</span>
                      <span>{item.deliveredQty} / {item.orderedQty}</span>
                    </div>
                  ))}
                </div>
              )}
              {log.expenses && log.expenses.length > 0 && (
                <div>
                  <p className="text-xs text-emerald-700 font-semibold mb-1">المصاريف:</p>
                  {log.expenses.map(exp => (
                    <div key={exp.id} className="flex justify-between text-xs py-0.5">
                      <span>{expenseCategoryLabels[exp.category]}{exp.description ? ` — ${exp.description}` : ''}</span>
                      <span>{formatCurrency(exp.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </Card>
      )}

      {/* Order History Timeline */}
      <OrderHistoryTimeline orderId={orderId} />

      {/* Action Buttons */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-card border-t border-border shadow-[0_-10px_40px_rgba(0,0,0,0.05)] md:relative md:bg-transparent md:border-0 md:shadow-none md:p-0 flex flex-wrap gap-3">
        {order.status === 'pending' && (
          <Button className="flex-1" onClick={() => updateStatus("preparing")} isLoading={statusMut.isPending}>بدء التجهيز</Button>
        )}
        {order.status === 'preparing' && (
          <Button className="flex-1 bg-orange-600 hover:bg-orange-700 text-white" onClick={() => updateStatus("delivering")} isLoading={statusMut.isPending}>بدء التوصيل <Truck className="w-4 h-4 ml-2"/></Button>
        )}
        {order.status === 'delivering' && (
          <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={openLogModal}>إنهاء وتسجيل التوصيل <CheckCircle2 className="w-4 h-4 ml-2"/></Button>
        )}
        {['pending', 'preparing', 'delivering'].includes(order.status) && (
          <div className="flex flex-col items-end gap-1 flex-1">
            <Button variant="outline" className="w-full text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => setIsCancelModalOpen(true)} isLoading={statusMut.isPending}><XCircle className="w-4 h-4 ml-2"/> إلغاء الطلب</Button>
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
        isLoading={statusMut.isPending}
      />

      {/* Delivery Log Modal */}
      <Modal isOpen={isLogModalOpen} onClose={() => setIsLogModalOpen(false)} title="تسجيل بيانات التوصيل">
        <form onSubmit={handleLogSubmit} className="space-y-6 max-h-[75vh] overflow-y-auto pb-2 px-1">

          {/* Collected Amount */}
          <div className="p-4 bg-primary/5 rounded-xl border border-primary/20">
            <p className="text-sm text-primary mb-1">الإجمالي المطلوب من العميل:</p>
            <p className="text-xl font-bold text-primary mb-3">{formatCurrency(totalAmount)}</p>
            <label className="block text-sm font-medium mb-1.5">المبلغ المحصل فعلياً *</label>
            <input
              required
              type="number"
              step="0.01"
              value={collectedAmount}
              onChange={e => setCollectedAmount(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* Payment Method */}
          <div>
            <p className="text-sm font-medium mb-2">طريقة التحصيل *</p>
            <div className="grid grid-cols-3 gap-2">
              {paymentMethodConfig.map(({ value, label, icon: Icon, color }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => { setPaymentMethod(value); if (value !== "transfer") setPaymentImageUrl(""); }}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all text-xs font-semibold ${paymentMethod === value ? color + " border-current" : "border-border text-muted-foreground bg-secondary/20"}`}
                >
                  <Icon className="w-5 h-5" />
                  {label}
                </button>
              ))}
            </div>

            {/* Receipt Upload (transfer only) */}
            {paymentMethod === "transfer" && (
              <div className="mt-3">
                <p className="text-xs font-medium text-muted-foreground mb-2">صورة إيصال التحويل (اختيارية)</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const url = await uploadReceiptFile(file);
                      if (url) setPaymentImageUrl(url);
                    }
                  }}
                />
                {paymentImageUrl ? (
                  <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-xl">
                    <ImageIcon className="w-4 h-4 text-blue-600 shrink-0" />
                    <span className="text-xs text-blue-700 flex-1 truncate">تم رفع الإيصال بنجاح</span>
                    <button type="button" onClick={() => { setPaymentImageUrl(""); if (fileInputRef.current) fileInputRef.current.value = ""; }} className="text-xs text-destructive">إزالة</button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="w-full flex items-center gap-2 p-3 border-2 border-dashed border-blue-300 rounded-xl text-sm text-blue-700 hover:bg-blue-50 transition-colors disabled:opacity-50"
                  >
                    <Upload className="w-4 h-4" />
                    {isUploading ? "جاري الرفع..." : "رفع صورة الإيصال"}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Delivered Items */}
          <div>
            <p className="text-sm font-medium mb-2">الكميات المسلّمة فعلياً</p>
            <div className="space-y-2">
              {order.items.map(item => (
                <div key={item.productId} className="flex items-center justify-between p-3 bg-secondary/20 rounded-xl">
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{item.product?.name}</p>
                    <p className="text-xs text-muted-foreground">مطلوب: {item.quantity}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setDeliveredItems(prev => ({ ...prev, [item.productId]: Math.max(0, (prev[item.productId] ?? item.quantity) - 1) }))} className="w-7 h-7 rounded-lg bg-secondary border border-border flex items-center justify-center text-lg font-bold hover:bg-border">−</button>
                    <span className="w-8 text-center font-bold">{deliveredItems[item.productId] ?? item.quantity}</span>
                    <button type="button" onClick={() => setDeliveredItems(prev => ({ ...prev, [item.productId]: (prev[item.productId] ?? item.quantity) + 1 }))} className="w-7 h-7 rounded-lg bg-secondary border border-border flex items-center justify-center text-lg font-bold hover:bg-border">+</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Expenses */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium">المصاريف</p>
              <button type="button" onClick={addExpense} className="flex items-center gap-1 text-xs text-primary hover:underline">
                <Plus className="w-3.5 h-3.5" /> إضافة بند
              </button>
            </div>
            {expenses.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-3 bg-secondary/20 rounded-xl">لا توجد مصاريف — اضغط "إضافة بند" لإضافة مصروف</p>
            )}
            <div className="space-y-2">
              {expenses.map((exp, idx) => (
                <div key={idx} className="p-3 bg-secondary/20 rounded-xl space-y-2">
                  <div className="flex gap-2">
                    <select
                      value={exp.category}
                      onChange={e => updateExpense(idx, "category", e.target.value)}
                      className="flex-1 rounded-lg border border-border bg-background px-2 py-1.5 text-sm focus:outline-none"
                    >
                      {Object.entries(expenseCategoryLabels).map(([val, label]) => (
                        <option key={val} value={val}>{label}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="المبلغ"
                      value={exp.amount}
                      onChange={e => updateExpense(idx, "amount", e.target.value)}
                      className="w-24 rounded-lg border border-border bg-background px-2 py-1.5 text-sm focus:outline-none"
                    />
                    <button type="button" onClick={() => removeExpense(idx)} className="p-1.5 text-destructive hover:bg-destructive/10 rounded-lg">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="وصف (اختياري)"
                    value={exp.description}
                    onChange={e => updateExpense(idx, "description", e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm focus:outline-none"
                  />
                </div>
              ))}
            </div>
            {expenses.length > 0 && (
              <div className="flex justify-between text-sm font-semibold mt-2 px-1">
                <span>إجمالي المصاريف</span>
                <span className="text-amber-700">{formatCurrency(totalExpenses.toString())}</span>
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium mb-1.5">ملاحظات (اختيارية)</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="ملاحظات العميل أو التوصيل..."
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div className="pt-2">
            <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" isLoading={logMut.isPending || isUploading}>
              <CheckCircle2 className="w-4 h-4 ml-2" /> تأكيد التسليم
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
