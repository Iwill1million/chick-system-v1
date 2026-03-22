import { useState } from "react";
import {
  useListOrders,
  useCreateOrder,
  useUpdateOrder,
  useDeleteOrder,
  useListCustomers,
  useListUsers,
  useListProducts,
} from "@workspace/api-client-react";
import type {
  OrderWithDetails,
  OrderItemInput,
  CreateOrderRequest,
  UpdateOrderRequest,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button, Input, Select, Modal, Table, Th, Td, Card, Badge } from "@/components/ui-components";
import { formatCurrency, formatDate, statusColors, statusLabels } from "@/lib/utils";
import { Plus, Edit2, Trash2, Eye, PlusCircle, MinusCircle } from "lucide-react";
import { Link } from "wouter";

interface ItemRow {
  productId: string;
  quantity: number;
  unitPrice: string;
}

interface OrderFormState {
  customerId: string;
  agentId: string;
  orderDate: string;
  deliveryDate: string;
  notes: string;
  items: ItemRow[];
}

const emptyForm = (): OrderFormState => ({
  customerId: "",
  agentId: "",
  orderDate: new Date().toISOString().split("T")[0] ?? "",
  deliveryDate: "",
  notes: "",
  items: [{ productId: "", quantity: 1, unitPrice: "" }],
});

export default function Orders() {
  const queryClient = useQueryClient();
  const { data: orders = [], isLoading } = useListOrders();
  const { data: customers = [] } = useListCustomers();
  const { data: users = [] } = useListUsers();
  const { data: products = [] } = useListProducts();

  const agents = users.filter((u) => u.role === "agent");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<OrderWithDetails | null>(null);
  const [formData, setFormData] = useState<OrderFormState>(emptyForm());

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["/api/orders"] });

  const createMut = useCreateOrder({
    mutation: {
      onSuccess: () => {
        invalidate();
        setIsModalOpen(false);
      },
    },
  });

  const updateMut = useUpdateOrder({
    mutation: {
      onSuccess: () => {
        invalidate();
        setIsModalOpen(false);
        setEditingOrder(null);
      },
    },
  });

  const deleteMut = useDeleteOrder({
    mutation: { onSuccess: invalidate },
  });

  const openAdd = () => {
    setEditingOrder(null);
    setFormData(emptyForm());
    setIsModalOpen(true);
  };

  const openEdit = (order: OrderWithDetails) => {
    setEditingOrder(order);
    setFormData({
      customerId: order.customerId.toString(),
      agentId: order.agentId?.toString() ?? "",
      orderDate: order.orderDate.split("T")[0] ?? order.orderDate,
      deliveryDate: order.deliveryDate?.split("T")[0] ?? "",
      notes: order.notes ?? "",
      items: order.items.map((item) => ({
        productId: item.productId.toString(),
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
    });
    setIsModalOpen(true);
  };

  const handleProductChange = (index: number, productId: string) => {
    const product = products.find((p) => p.id.toString() === productId);
    const newItems = [...formData.items];
    const row = newItems[index];
    if (!row) return;
    row.productId = productId;
    if (product) row.unitPrice = product.unitPrice;
    setFormData({ ...formData, items: newItems });
  };

  const addItem = () =>
    setFormData({
      ...formData,
      items: [...formData.items, { productId: "", quantity: 1, unitPrice: "" }],
    });

  const removeItem = (index: number) =>
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index),
    });

  const updateItem = (index: number, field: keyof ItemRow, value: string | number) => {
    const newItems = [...formData.items];
    const row = newItems[index];
    if (!row) return;
    (row as Record<keyof ItemRow, string | number>)[field] = value;
    setFormData({ ...formData, items: newItems });
  };

  const buildItems = (): OrderItemInput[] =>
    formData.items
      .filter((i) => i.productId !== "")
      .map((i) => ({
        productId: parseInt(i.productId),
        quantity: Number(i.quantity),
        unitPrice: i.unitPrice,
      }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (editingOrder) {
      const data: UpdateOrderRequest = {
        customerId: parseInt(formData.customerId),
        agentId: formData.agentId ? parseInt(formData.agentId) : undefined,
        orderDate: formData.orderDate,
        deliveryDate: formData.deliveryDate || undefined,
        notes: formData.notes || undefined,
        items: buildItems(),
      };
      updateMut.mutate({ id: editingOrder.id, data });
    } else {
      const data: CreateOrderRequest = {
        customerId: parseInt(formData.customerId),
        agentId: formData.agentId ? parseInt(formData.agentId) : undefined,
        orderDate: formData.orderDate,
        deliveryDate: formData.deliveryDate || undefined,
        notes: formData.notes || undefined,
        items: buildItems(),
      };
      createMut.mutate({ data });
    }
  };

  const isPending = createMut.isPending || updateMut.isPending;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-display font-bold">إدارة الطلبات</h2>
        <Button onClick={openAdd} className="gap-2">
          <Plus className="w-5 h-5" /> طلب جديد
        </Button>
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
              {orders.map((o) => {
                const total = o.items.reduce(
                  (sum, item) => sum + item.quantity * parseFloat(item.unitPrice),
                  0
                );
                return (
                  <tr key={o.id} className="hover:bg-secondary/20 transition-colors">
                    <Td className="font-bold">#{o.id}</Td>
                    <Td>{o.customer?.name}</Td>
                    <Td>{formatDate(o.orderDate)}</Td>
                    <Td>
                      {o.agent?.name || (
                        <span className="text-muted-foreground">غير محدد</span>
                      )}
                    </Td>
                    <Td>
                      <Badge className={statusColors[o.status]}>{statusLabels[o.status]}</Badge>
                    </Td>
                    <Td className="font-bold text-primary">{formatCurrency(total)}</Td>
                    <Td>
                      <div className="flex gap-2">
                        <Link
                          href={`/agent/orders/${o.id}`}
                          className="p-2 hover:bg-secondary rounded-lg transition-colors text-primary"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(o)}
                          title="تعديل الطلب"
                        >
                          <Edit2 className="w-4 h-4 text-primary" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm("هل أنت متأكد من حذف الطلب؟"))
                              deleteMut.mutate({ id: o.id });
                          }}
                        >
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

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingOrder(null);
        }}
        title={editingOrder ? `تعديل الطلب #${editingOrder.id}` : "إنشاء طلب جديد"}
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="العميل *"
              required
              options={customers.map((c) => ({
                label: `${c.name} (${c.phone || ""})`,
                value: c.id,
              }))}
              value={formData.customerId}
              onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
            />
            <Select
              label="المندوب"
              options={[
                { label: "— بدون مندوب —", value: "" },
                ...agents.map((a) => ({ label: a.name, value: a.id })),
              ]}
              value={formData.agentId}
              onChange={(e) => setFormData({ ...formData, agentId: e.target.value })}
            />
            <Input
              label="تاريخ الطلب *"
              required
              type="date"
              value={formData.orderDate}
              onChange={(e) => setFormData({ ...formData, orderDate: e.target.value })}
            />
            <Input
              label="تاريخ التوصيل المتوقع"
              type="date"
              value={formData.deliveryDate}
              onChange={(e) => setFormData({ ...formData, deliveryDate: e.target.value })}
            />
          </div>

          <div className="p-4 border-2 border-border/50 rounded-xl bg-secondary/10 space-y-4">
            <h3 className="font-bold text-foreground mb-2">المنتجات</h3>
            {formData.items.map((item, index) => (
              <div key={index} className="flex flex-wrap md:flex-nowrap gap-3 items-end">
                <div className="flex-1 min-w-[200px]">
                  <Select
                    label={index === 0 ? "المنتج *" : undefined}
                    required
                    options={products.map((p) => ({ label: p.name, value: p.id }))}
                    value={item.productId}
                    onChange={(e) => handleProductChange(index, e.target.value)}
                  />
                </div>
                <div className="w-24">
                  <Input
                    label={index === 0 ? "الكمية *" : undefined}
                    required
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => updateItem(index, "quantity", e.target.value)}
                  />
                </div>
                <div className="w-32">
                  <Input
                    label={index === 0 ? "السعر *" : undefined}
                    required
                    type="number"
                    step="0.01"
                    value={item.unitPrice}
                    onChange={(e) => updateItem(index, "unitPrice", e.target.value)}
                  />
                </div>
                {formData.items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    className="p-3 text-destructive hover:bg-destructive/10 rounded-xl mb-1"
                  >
                    <MinusCircle className="w-5 h-5" />
                  </button>
                )}
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addItem}
              className="w-full mt-2 border-dashed"
            >
              <PlusCircle className="w-4 h-4 ml-2" /> إضافة منتج آخر
            </Button>
          </div>

          <Input
            label="ملاحظات الطلب"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          />

          <div className="pt-4 flex justify-end gap-3 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsModalOpen(false);
                setEditingOrder(null);
              }}
            >
              إلغاء
            </Button>
            <Button type="submit" isLoading={isPending}>
              {editingOrder ? "حفظ التعديلات" : "تأكيد الطلب"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
