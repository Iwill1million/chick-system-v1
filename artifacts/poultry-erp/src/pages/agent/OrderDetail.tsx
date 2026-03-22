import { useState } from "react";
import { useParams } from "wouter";
import { useGetOrder, useUpdateOrderStatus, useCreateDeliveryLog, useGetDeliveryLogs, UpdateOrderStatusRequestStatus } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button, Card, Badge, Modal, Input } from "@/components/ui-components";
import { formatCurrency, formatDate, statusColors, statusLabels } from "@/lib/utils";
import { MapPin, Phone, Calendar, Package, ArrowRight, Truck, CheckCircle2, XCircle } from "lucide-react";
import { Link } from "wouter";
import OrderHistoryTimeline from "@/components/OrderHistoryTimeline";

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const orderId = parseInt(id!);
  const queryClient = useQueryClient();

  const { data: order, isLoading } = useGetOrder(orderId);
  const { data: logs = [] } = useGetDeliveryLogs(orderId);
  
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [logData, setLogData] = useState({ collectedAmount: "", deliveredQuantity: "", fuelExpense: "0", otherExpenses: "0", notes: "" });

  const statusMut = useUpdateOrderStatus({
    mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: [`/api/orders/${orderId}`] }) }
  });

  const logMut = useCreateDeliveryLog({
    mutation: { onSuccess: () => { 
      queryClient.invalidateQueries({ queryKey: [`/api/delivery-logs/${orderId}`] });
      // If logging delivery, automatically set status to delivered
      statusMut.mutate({ id: orderId, data: { status: "delivered" } });
      setIsLogModalOpen(false); 
    }}
  });

  if (isLoading || !order) return <div className="p-8 text-center animate-pulse">جاري التحميل...</div>;

  const totalAmount = order.items.reduce((sum, item) => sum + (item.quantity * parseFloat(item.unitPrice)), 0);
  const totalQty = order.items.reduce((sum, item) => sum + item.quantity, 0);

  const updateStatus = (status: UpdateOrderStatusRequestStatus) => {
    statusMut.mutate({ id: orderId, data: { status } });
  };

  const handleLogSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    logMut.mutate({
      data: {
        orderId,
        collectedAmount: logData.collectedAmount,
        deliveredQuantity: parseInt(logData.deliveredQuantity),
        fuelExpense: logData.fuelExpense,
        otherExpenses: logData.otherExpenses,
        notes: logData.notes
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
          <div className="flex justify-between items-center pb-3 border-b border-border/50">
            <span className="text-muted-foreground">الاسم</span>
            <span className="font-bold">{order.customer.name}</span>
          </div>
          <div className="flex justify-between items-center pb-3 border-b border-border/50">
            <span className="text-muted-foreground">الهاتف</span>
            <span className="font-bold text-primary flex items-center gap-2" dir="ltr">{order.customer.phone} <Phone className="w-4 h-4"/></span>
          </div>
          <div className="flex justify-between items-center pb-3 border-b border-border/50">
            <span className="text-muted-foreground">الموقع</span>
            <span className="font-bold text-left max-w-[60%]">{order.customer.location || 'غير محدد'}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">تاريخ الطلب</span>
            <span className="font-bold flex items-center gap-2">{formatDate(order.orderDate)} <Calendar className="w-4 h-4 text-muted-foreground"/></span>
          </div>
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
            <div key={log.id} className="text-sm space-y-2 text-emerald-900">
              <div className="flex justify-between"><span>المبلغ المحصل:</span> <span className="font-bold">{formatCurrency(log.collectedAmount)}</span></div>
              <div className="flex justify-between"><span>الكمية المسلمة:</span> <span className="font-bold">{log.deliveredQuantity}</span></div>
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
          <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => {
            setLogData(prev => ({...prev, collectedAmount: totalAmount.toString(), deliveredQuantity: totalQty.toString()}));
            setIsLogModalOpen(true);
          }}>إنهاء وتسجيل التوصيل <CheckCircle2 className="w-4 h-4 ml-2"/></Button>
        )}
        
        {/* Always allow cancelling unless already cancelled/delivered */}
        {['pending', 'preparing', 'delivering'].includes(order.status) && (
          <div className="flex flex-col items-end gap-1 flex-1">
            <Button variant="outline" className="w-full text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => updateStatus("cancelled")} isLoading={statusMut.isPending}><XCircle className="w-4 h-4 ml-2"/> إلغاء الطلب</Button>
            <p className="text-xs text-muted-foreground text-center w-full">سيتم إعادة الكميات المحجوزة إلى المخزون تلقائياً</p>
          </div>
        )}
      </div>

      {/* Delivery Log Modal */}
      <Modal isOpen={isLogModalOpen} onClose={() => setIsLogModalOpen(false)} title="تسجيل بيانات التوصيل">
        <form onSubmit={handleLogSubmit} className="space-y-4">
          <div className="p-4 bg-primary/5 rounded-xl border border-primary/20 mb-4">
            <p className="text-sm text-primary mb-1">المطلوب تحصيله من العميل:</p>
            <p className="text-2xl font-bold text-primary">{formatCurrency(totalAmount)}</p>
          </div>
          
          <Input label="المبلغ المحصل فعلياً *" required type="number" step="0.01" value={logData.collectedAmount} onChange={e => setLogData({...logData, collectedAmount: e.target.value})} />
          <Input label="الكمية المسلمة فعلياً *" required type="number" value={logData.deliveredQuantity} onChange={e => setLogData({...logData, deliveredQuantity: e.target.value})} />
          
          <div className="grid grid-cols-2 gap-4">
            <Input label="مصاريف بنزين" type="number" step="0.01" value={logData.fuelExpense} onChange={e => setLogData({...logData, fuelExpense: e.target.value})} />
            <Input label="مصاريف أخرى" type="number" step="0.01" value={logData.otherExpenses} onChange={e => setLogData({...logData, otherExpenses: e.target.value})} />
          </div>
          <Input label="ملاحظات العميل / التوصيل" value={logData.notes} onChange={e => setLogData({...logData, notes: e.target.value})} />
          
          <div className="pt-4">
            <Button type="submit" className="w-full" isLoading={logMut.isPending}>تأكيد التسليم</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
