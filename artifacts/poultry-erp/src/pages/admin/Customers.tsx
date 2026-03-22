import { useState } from "react";
import { useListCustomers, useCreateCustomer, useUpdateCustomer, useDeleteCustomer } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button, Input, Modal, Table, Th, Td, Card } from "@/components/ui-components";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Plus, Edit2, Trash2, Search } from "lucide-react";

export default function Customers() {
  const queryClient = useQueryClient();
  const { data: customers = [], isLoading } = useListCustomers();
  
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ name: "", phone: "", location: "", openingBalance: "0", notes: "" });

  const createMut = useCreateCustomer({
    mutation: { onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/customers"] }); setIsModalOpen(false); } }
  });
  const updateMut = useUpdateCustomer({
    mutation: { onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/customers"] }); setIsModalOpen(false); } }
  });
  const deleteMut = useDeleteCustomer({
    mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/customers"] }) }
  });

  const filtered = customers.filter(c => c.name.includes(search) || (c.phone && c.phone.includes(search)));

  const openAdd = () => {
    setEditingId(null);
    setFormData({ name: "", phone: "", location: "", openingBalance: "0", notes: "" });
    setIsModalOpen(true);
  };

  const openEdit = (c: any) => {
    setEditingId(c.id);
    setFormData({ name: c.name, phone: c.phone || "", location: c.location || "", openingBalance: c.openingBalance, notes: c.notes || "" });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      updateMut.mutate({ id: editingId, data: formData });
    } else {
      createMut.mutate({ data: formData });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-display font-bold">إدارة العملاء</h2>
        <Button onClick={openAdd} className="gap-2"><Plus className="w-5 h-5"/> عميل جديد</Button>
      </div>

      <Card className="p-4 sm:p-6">
        <div className="mb-6 relative max-w-md">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
          <Input 
            placeholder="بحث بالاسم أو الهاتف..." 
            value={search} 
            onChange={e => setSearch(e.target.value)}
            className="pr-12"
          />
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-muted-foreground animate-pulse">جاري التحميل...</div>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>الاسم</Th>
                <Th>الهاتف</Th>
                <Th>الموقع</Th>
                <Th>الرصيد الافتتاحي</Th>
                <Th>تاريخ التسجيل</Th>
                <Th>إجراءات</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id} className="hover:bg-secondary/20 transition-colors">
                  <Td className="font-bold">{c.name}</Td>
                  <Td dir="ltr" className="text-right">{c.phone || '-'}</Td>
                  <Td>{c.location || '-'}</Td>
                  <Td className="font-bold text-primary">{formatCurrency(c.openingBalance)}</Td>
                  <Td>{formatDate(c.createdAt)}</Td>
                  <Td>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Edit2 className="w-4 h-4 text-blue-600" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => { if(confirm('هل أنت متأكد؟')) deleteMut.mutate({ id: c.id }) }}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </Td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><Td className="text-center py-8 text-muted-foreground">لا يوجد عملاء</Td></tr>
              )}
            </tbody>
          </Table>
        )}
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? "تعديل عميل" : "إضافة عميل"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="اسم العميل *" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="رقم الهاتف" dir="ltr" className="text-right" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
            <Input label="الرصيد الافتتاحي" type="number" step="0.01" value={formData.openingBalance} onChange={e => setFormData({...formData, openingBalance: e.target.value})} />
          </div>
          <Input label="الموقع / العنوان" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-foreground/80">ملاحظات</label>
            <textarea 
              className="flex min-h-[100px] w-full rounded-xl border-2 border-border bg-card px-4 py-2 text-sm focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
              value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})}
            />
          </div>
          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>إلغاء</Button>
            <Button type="submit" isLoading={createMut.isPending || updateMut.isPending}>حفظ</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
