import { useState } from "react";
import { useRoute, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import { Button, Input, Modal, Card } from "@/components/ui-components";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ArrowRight, Plus, Trash2, Printer, TrendingDown, TrendingUp, Wallet, FileText } from "lucide-react";
import { motion } from "framer-motion";

interface CustomerInfo {
  id: number;
  name: string;
  phone: string | null;
  location: string | null;
  openingBalance: string;
}

interface StatementSummary {
  openingBalance: string;
  totalOrders: string;
  totalPaid: string;
  currentBalance: string;
}

interface OrderTx {
  type: "order";
  date: string;
  id: number;
  status: string;
  total: number;
  notes: string | null;
  runningBalance: number;
}

interface PaymentTx {
  type: "payment";
  date: string;
  id: number;
  amount: number;
  notes: string | null;
  createdByName: string | null;
  runningBalance: number;
}

type Transaction = OrderTx | PaymentTx;

interface StatementResponse {
  customer: CustomerInfo;
  summary: StatementSummary;
  transactions: Transaction[];
}

const statusLabels: Record<string, string> = {
  pending: "قيد الانتظار",
  preparing: "جاري التجهيز",
  delivering: "جاري التوصيل",
  delivered: "تم التوصيل",
  cancelled: "ملغي",
};

const statusColors: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  preparing: "bg-blue-100 text-blue-800",
  delivering: "bg-orange-100 text-orange-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

export default function CustomerStatement() {
  const [, params] = useRoute("/customers/:id/statement");
  const customerId = parseInt(params?.id ?? "0", 10);
  const queryClient = useQueryClient();

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ amount: "", paymentDate: new Date().toISOString().slice(0, 10), notes: "" });

  const queryKey = [`/api/customers/${customerId}/statement`];
  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => customFetch<StatementResponse>(`/api/customers/${customerId}/statement`),
    enabled: !!customerId,
  });

  const addPaymentMut = useMutation({
    mutationFn: (body: { amount: string; paymentDate: string; notes?: string }) =>
      customFetch<unknown>(`/api/customers/${customerId}/payments`, { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setIsPaymentModalOpen(false);
      setPaymentForm({ amount: "", paymentDate: new Date().toISOString().slice(0, 10), notes: "" });
    },
  });

  const deletePaymentMut = useMutation({
    mutationFn: (paymentId: number) =>
      customFetch<unknown>(`/api/customers/${customerId}/payments/${paymentId}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const handlePrint = () => window.print();

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="animate-spin h-10 w-10 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const { customer, summary, transactions } = data;
  const balance = parseFloat(summary.currentBalance);
  const isDebtPositive = balance > 0;

  return (
    <div className="space-y-6 print:p-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <Link href="/customers">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h2 className="text-2xl font-display font-bold">كشف حساب</h2>
            <p className="text-muted-foreground text-sm">{customer.name}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePrint} className="gap-2">
            <Printer className="w-4 h-4" /> طباعة
          </Button>
          <Button onClick={() => setIsPaymentModalOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" /> تسجيل دفعة
          </Button>
        </div>
      </div>

      <div className="hidden print:block mb-6">
        <h1 className="text-2xl font-bold">كشف حساب العميل: {customer.name}</h1>
        {customer.phone && <p className="text-sm text-gray-600">{customer.phone}</p>}
        {customer.location && <p className="text-sm text-gray-600">{customer.location}</p>}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4 text-center">
          <p className="text-xs text-muted-foreground mb-1">رصيد افتتاحي</p>
          <p className="text-xl font-bold font-display">{formatCurrency(summary.openingBalance)}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-xs text-muted-foreground mb-1">إجمالي الطلبات</p>
          <p className="text-xl font-bold font-display text-destructive">{formatCurrency(summary.totalOrders)}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-xs text-muted-foreground mb-1">إجمالي المدفوع</p>
          <p className="text-xl font-bold font-display text-primary">{formatCurrency(summary.totalPaid)}</p>
        </Card>
        <Card className={`p-4 text-center border-2 ${isDebtPositive ? "border-destructive/30 bg-red-50/50" : "border-primary/30 bg-emerald-50/50"}`}>
          <p className="text-xs text-muted-foreground mb-1">الرصيد الحالي</p>
          <p className={`text-xl font-bold font-display ${isDebtPositive ? "text-destructive" : "text-primary"}`}>
            {formatCurrency(summary.currentBalance)}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {isDebtPositive ? "مستحق للتحصيل" : "لا توجد مستحقات"}
          </p>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-border flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          <h3 className="font-bold text-lg">سجل المعاملات</h3>
        </div>

        {transactions.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            لا توجد معاملات بعد
          </div>
        ) : (
          <div className="divide-y divide-border">
            {summary.openingBalance !== "0.00" && (
              <div className="flex items-center justify-between px-4 sm:px-6 py-3 bg-secondary/20">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                    <Wallet className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">رصيد افتتاحي</p>
                  </div>
                </div>
                <div className="text-left">
                  <p className="font-bold text-sm text-destructive">+ {formatCurrency(summary.openingBalance)}</p>
                  <p className="text-xs text-muted-foreground">رصيد: {formatCurrency(summary.openingBalance)}</p>
                </div>
              </div>
            )}

            {transactions.map((tx, idx) => (
              <motion.div
                key={`${tx.type}-${tx.id}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: idx * 0.02 }}
                className="flex items-center justify-between px-4 sm:px-6 py-3 hover:bg-secondary/20 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${tx.type === "payment" ? "bg-primary/10" : "bg-destructive/10"}`}>
                    {tx.type === "payment"
                      ? <TrendingDown className="w-4 h-4 text-primary" />
                      : <TrendingUp className="w-4 h-4 text-destructive" />
                    }
                  </div>
                  <div className="min-w-0">
                    {tx.type === "order" ? (
                      <>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link href={`/orders/${tx.id}`}>
                            <span className="font-semibold text-sm hover:text-primary transition-colors">طلب #{tx.id}</span>
                          </Link>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${statusColors[tx.status]}`}>
                            {statusLabels[tx.status]}
                          </span>
                        </div>
                        {tx.notes && <p className="text-xs text-muted-foreground truncate">{tx.notes}</p>}
                        <p className="text-xs text-muted-foreground" dir="ltr">{tx.date}</p>
                      </>
                    ) : (
                      <>
                        <p className="font-semibold text-sm">دفعة نقدية</p>
                        {tx.createdByName && <p className="text-xs text-muted-foreground">بواسطة: {tx.createdByName}</p>}
                        {tx.notes && <p className="text-xs text-muted-foreground truncate">{tx.notes}</p>}
                        <p className="text-xs text-muted-foreground" dir="ltr">{tx.date}</p>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0 mr-2">
                  <div className="text-left">
                    {tx.type === "order" && tx.status !== "cancelled" && (
                      <p className="font-bold text-sm text-destructive">+ {formatCurrency(tx.total)}</p>
                    )}
                    {tx.type === "order" && tx.status === "cancelled" && (
                      <p className="font-bold text-sm text-muted-foreground line-through">{formatCurrency(tx.total)}</p>
                    )}
                    {tx.type === "payment" && (
                      <p className="font-bold text-sm text-primary">- {formatCurrency(tx.amount)}</p>
                    )}
                    <p className="text-xs text-muted-foreground">رصيد: {formatCurrency(tx.runningBalance)}</p>
                  </div>

                  {tx.type === "payment" && (
                    <button
                      className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive/60 hover:text-destructive transition-colors print:hidden"
                      onClick={() => { if (confirm("حذف هذه الدفعة؟")) deletePaymentMut.mutate(tx.id); }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </Card>

      <div className={`hidden print:block mt-6 p-4 border-2 rounded-lg ${isDebtPositive ? "border-red-400" : "border-green-400"}`}>
        <p className="text-lg font-bold">
          الرصيد الإجمالي المستحق: {formatCurrency(summary.currentBalance)}
        </p>
      </div>

      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title="تسجيل دفعة جديدة"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">العميل: <span className="font-bold text-foreground">{customer.name}</span></p>
          <Input
            label="المبلغ (جنيه) *"
            type="number"
            step="0.01"
            min="0.01"
            required
            value={paymentForm.amount}
            onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
          />
          <Input
            label="تاريخ الدفعة *"
            type="date"
            required
            value={paymentForm.paymentDate}
            onChange={(e) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })}
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-foreground/80">ملاحظات</label>
            <textarea
              className="flex min-h-[80px] w-full rounded-xl border-2 border-border bg-card px-4 py-2 text-sm focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
              value={paymentForm.notes}
              onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
              placeholder="ملاحظة اختيارية..."
            />
          </div>
          <div className="pt-2 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setIsPaymentModalOpen(false)}>
              إلغاء
            </Button>
            <Button
              onClick={() => addPaymentMut.mutate({
                amount: paymentForm.amount,
                paymentDate: paymentForm.paymentDate,
                notes: paymentForm.notes || undefined,
              })}
              isLoading={addPaymentMut.isPending}
              disabled={!paymentForm.amount || parseFloat(paymentForm.amount) <= 0}
            >
              حفظ الدفعة
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
