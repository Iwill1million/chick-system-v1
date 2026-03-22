import { useState } from "react";
import { useListOrders, useCreateOrder, useDeleteOrder, useListCustomers, useListUsers, useListProducts } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button, Input, Select, Modal, Table, Th, Td, Card, Badge } from "@/components/ui-components";
import { formatCurrency, formatDate, statusColors, statusLabels } from "@/lib/utils";
import { Plus, Edit2, Trash2, Eye, PlusCircle, MinusCircle } from "lucide-react";
import { Link } from "wouter";

export default function Orders() {
  const queryClient = useQueryClient();
  const { data: orders = [], isLoading } = useListOrders();
  const { data: customers = [] } = useListCustomers();
  const { data: users = [] } = useListUsers();
  const { data: products = [] } = useListProducts();
  
  const agents = users.filter(u => u.role === 'agent');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<any>({ 
    customerId: "", agentId: "", orderDate: new Date().toISOString().split('T')[0], 
    deliveryDate: "", notes: "", items: [] 
  });

  const createMut = useCreateOrder({
    mutation: { onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/orders"] }); setIsModalOpen(false); } }
  });
  const deleteMut = useDeleteOrder({
    mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/orders"] }) }
  });

  const openAdd = () => {
    setFormData({ 
      customerId: "", agentId: "", orderDate: new Date().toISOString().split('T')[0], 
      deliveryDate: "", notes: "", items: [{ productId: "", quantity: 1, unitPrice: "" }] 
    });
    setIsModalOpen(true);
  };

  const handleProductChange = (index: number, productId: string) => {
    const product = products.find(p => p.id.toString() === productId);
    const newItems = [...formData.items];
    newItems[index].productId = productId;
    if (product) newItems[index].unitPrice = product.unitPrice;
    setFormData({ ...formData, items: newItems });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      ...formData,
      customerId: parseInt(formData.customerId),
      agentId: formData.agentId ? parseInt(formData.agentId) : undefined,
      items: formData.items.filter((i:any) => i.productId).map((i:any) => ({
        productId: parseInt(i.productId),
        quantity: parseInt(i.quantity),
        unitPrice: i.unitPrice.toString()
      }))
    };
    createMut.mutate({ data });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-display font-bold">إدارة الطلبات</h2>
        <Button onClick={openAdd} className="gap-2"><Plus className="w-5 h-5"/> طلب جديد</Button>
      </div>

      <Card className="p-4 sm:p-6">
        {isLoading ? (
          <div className="py-12 text-center text-muted-foreground animate-pulse">جاري التحميل...</div>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>رقم الطلب</Th>
                <Th>العميل</Th>
                <Th>تاريخ الطلب</Th>
                <Th>المندوب</Th>
                <Th>الحالة</Th>
                <Th>الإجمالي</Th>
                <Th>إجراءات</Th>
              </tr>
            </thead>
            <tbody>
              {orders.map(o => {
                const total = o.items.reduce((sum, item) => sum + (item.quantity * parseFloat(item.unitPrice)), 0);
                return (
                  <tr key={o.id} className="hover:bg-secondary/20 transition-colors">
                    <Td className="font-bold">#{o.id}</Td>
                    <Td>{o.customer?.name}</Td>
                    <Td>{formatDate(o.orderDate)}</Td>
                    <Td>{o.agent?.name || <span className="text-muted-foreground">غير محدد</span>}</Td>
                    <Td><Badge className={statusColors[o.status]}>{statusLabels[o.status]}</Badge></Td>
                    <Td className="font-bold text-primary">{formatCurrency(total)}</Td>
                    <Td>
                      <div className="flex gap-2">
                        <Link href={`/agent/orders/${o.id}`} className="p-2 hover:bg-secondary rounded-lg transition-colors text-primary">
                          <Eye className="w-4 h-4" />
                        </Link>
                        <Button variant="ghost" size="icon" onClick={() => { if(confirm('هل أنت متأكد من حذف الطلب؟')) deleteMut.mutate({ id: o.id }) }}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="إنشاء طلب جديد">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select 
              label="العميل *" required 
              options={customers.map(c => ({ label: `${c.name} (${c.phone || ''})`, value: c.id }))}
              value={formData.customerId} onChange={e => setFormData({...formData, customerId: e.target.value})} 
            />
            <Select 
              label="المندوب" 
              options={agents.map(a => ({ label: a.name, value: a.id }))}
              value={formData.agentId} onChange={e => setFormData({...formData, agentId: e.target.value})} 
            />
            <Input label="تاريخ الطلب *" required type="date" value={formData.orderDate} onChange={e => setFormData({...formData, orderDate: e.target.value})} />
            <Input label="تاريخ التوصيل المتوقع" type="date" value={formData.deliveryDate} onChange={e => setFormData({...formData, deliveryDate: e.target.value})} />
          </div>

          <div className="p-4 border-2 border-border/50 rounded-xl bg-secondary/10 space-y-4">
            <h3 className="font-bold text-foreground mb-2">المنتجات</h3>
            {formData.items.map((item: any, index: number) => (
              <div key={index} className="flex flex-wrap md:flex-nowrap gap-3 items-end">
                <div className="flex-1 min-w-[200px]">
                  <Select 
                    label={index === 0 ? "المنتج *" : undefined} required
                    options={products.map(p => ({ label: p.name, value: p.id }))}
                    value={item.productId} onChange={e => handleProductChange(index, e.target.value)} 
                  />
                </div>
                <div className="w-24">
                  <Input label={index === 0 ? "الكمية *" : undefined} required type="number" min="1" value={item.quantity} onChange={e => {
                    const newItems = [...formData.items]; newItems[index].quantity = e.target.value; setFormData({...formData, items: newItems});
                  }} />
                </div>
                <div className="w-32">
                  <Input label={index === 0 ? "السعر *" : undefined} required type="number" step="0.01" value={item.unitPrice} onChange={e => {
                    const newItems = [...formData.items]; newItems[index].unitPrice = e.target.value; setFormData({...formData, items: newItems});
                  }} />
                </div>
                {formData.items.length > 1 && (
                  <button type="button" onClick={() => setFormData({...formData, items: formData.items.filter((_:any, i:number) => i !== index)})} className="p-3 text-destructive hover:bg-destructive/10 rounded-xl mb-1">
                    <MinusCircle className="w-5 h-5" />
                  </button>
                )}
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => setFormData({...formData, items: [...formData.items, { productId: "", quantity: 1, unitPrice: "" }]})} className="w-full mt-2 border-dashed">
              <PlusCircle className="w-4 h-4 ml-2" /> إضافة منتج آخر
            </Button>
          </div>
          
          <Input label="ملاحظات الطلب" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />
          
          <div className="pt-4 flex justify-end gap-3 border-t border-border">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>إلغاء</Button>
            <Button type="submit" isLoading={createMut.isPending}>تأكيد الطلب</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
