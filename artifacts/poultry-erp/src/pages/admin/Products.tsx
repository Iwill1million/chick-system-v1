import { useState } from "react";
import { useListProducts, useCreateProduct, useUpdateProduct, useDeleteProduct } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button, Input, Select, Modal, Table, Th, Td, Card, Badge } from "@/components/ui-components";
import { formatCurrency } from "@/lib/utils";
import { Plus, Edit2, Trash2 } from "lucide-react";
import type { z } from "zod";
import { ListProductsResponseItem } from "@workspace/api-zod";

type Product = z.infer<typeof ListProductsResponseItem>;

interface ProductFormData {
  name: string;
  type: "chicks" | "chickens" | "other";
  unitPrice: string;
  stockQuantity: number | string;
  description: string;
}

export default function Products() {
  const queryClient = useQueryClient();
  const { data: products = [], isLoading } = useListProducts();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<ProductFormData>({ name: "", type: "chicks", unitPrice: "0", stockQuantity: 0, description: "" });

  const createMut = useCreateProduct({
    mutation: { onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/products"] }); setIsModalOpen(false); } }
  });
  const updateMut = useUpdateProduct({
    mutation: { onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/products"] }); setIsModalOpen(false); } }
  });
  const deleteMut = useDeleteProduct({
    mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/products"] }) }
  });

  const productTypeLabels: Record<string, string> = { chicks: "كتاكيت", chickens: "فراخ", other: "أخرى" };

  const openAdd = () => {
    setEditingId(null);
    setFormData({ name: "", type: "chicks", unitPrice: "0", stockQuantity: 0, description: "" });
    setIsModalOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditingId(p.id);
    setFormData({ name: p.name, type: p.type, unitPrice: p.unitPrice, stockQuantity: p.stockQuantity, description: p.description ?? "" });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = { ...formData, stockQuantity: parseInt(formData.stockQuantity.toString(), 10) };
    if (editingId) updateMut.mutate({ id: editingId, data });
    else createMut.mutate({ data });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-display font-bold">إدارة المنتجات</h2>
        <Button onClick={openAdd} className="gap-2"><Plus className="w-5 h-5"/> منتج جديد</Button>
      </div>

      <Card className="p-4 sm:p-6">
        {isLoading ? (
          <div className="py-12 text-center text-muted-foreground animate-pulse">جاري التحميل...</div>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>الاسم</Th>
                <Th>النوع</Th>
                <Th>سعر الوحدة</Th>
                <Th>الكمية المتوفرة</Th>
                <Th>إجراءات</Th>
              </tr>
            </thead>
            <tbody>
              {products.map(p => (
                <tr key={p.id} className="hover:bg-secondary/20 transition-colors">
                  <Td className="font-bold">{p.name}</Td>
                  <Td><Badge variant="soft">{productTypeLabels[p.type]}</Badge></Td>
                  <Td className="font-bold text-primary">{formatCurrency(p.unitPrice)}</Td>
                  <Td>
                    <span className={`font-bold ${p.stockQuantity < 100 ? 'text-destructive' : ''}`}>
                      {p.stockQuantity}
                    </span>
                  </Td>
                  <Td>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Edit2 className="w-4 h-4 text-blue-600" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => { if(confirm('هل أنت متأكد؟')) deleteMut.mutate({ id: p.id }) }}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </Td>
                </tr>
              ))}
              {products.length === 0 && (
                <tr><Td className="text-center py-8 text-muted-foreground">لا يوجد منتجات</Td></tr>
              )}
            </tbody>
          </Table>
        )}
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? "تعديل منتج" : "إضافة منتج"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="اسم المنتج *" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
          <Select 
            label="النوع *" required 
            options={[{label:"كتاكيت", value:"chicks"}, {label:"فراخ", value:"chickens"}, {label:"أخرى", value:"other"}]}
            value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as "chicks" | "chickens" | "other"})} 
          />
          <div className="grid grid-cols-2 gap-4">
            <Input label="سعر الوحدة *" required type="number" step="0.01" value={formData.unitPrice} onChange={e => setFormData({...formData, unitPrice: e.target.value})} />
            <Input label="الكمية الافتتاحية" type="number" value={formData.stockQuantity} onChange={e => setFormData({...formData, stockQuantity: e.target.value})} />
          </div>
          <Input label="وصف (اختياري)" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
          
          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>إلغاء</Button>
            <Button type="submit" isLoading={createMut.isPending || updateMut.isPending}>حفظ</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
