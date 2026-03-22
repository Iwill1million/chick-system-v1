import { useState } from "react";
import {
  useListUsers,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
} from "@workspace/api-client-react";
import type { UserProfile } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button, Input, Modal, Table, Th, Td, Card, Badge } from "@/components/ui-components";
import { Plus, Edit2, Trash2 } from "lucide-react";

interface UserFormState {
  name: string;
  phone: string;
  username: string;
  password: string;
  role: "admin" | "agent";
}

const emptyForm = (): UserFormState => ({
  name: "",
  phone: "",
  username: "",
  password: "",
  role: "agent",
});

export default function Agents() {
  const queryClient = useQueryClient();
  const { data: users = [], isLoading } = useListUsers();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<UserFormState>(emptyForm());

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["/api/users"] });

  const createMut = useCreateUser({
    mutation: {
      onSuccess: () => {
        invalidate();
        setIsModalOpen(false);
      },
    },
  });
  const updateMut = useUpdateUser({
    mutation: {
      onSuccess: () => {
        invalidate();
        setIsModalOpen(false);
      },
    },
  });
  const deleteMut = useDeleteUser({
    mutation: { onSuccess: invalidate },
  });

  const openAdd = () => {
    setEditingId(null);
    setFormData(emptyForm());
    setIsModalOpen(true);
  };

  const openEdit = (u: UserProfile) => {
    setEditingId(u.id);
    setFormData({
      name: u.name,
      phone: u.phone ?? "",
      username: u.username,
      password: "",
      role: u.role === "admin" ? "admin" : "agent",
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      const data: Partial<UserFormState> = { ...formData };
      if (!data.password) delete data.password;
      updateMut.mutate({ id: editingId, data });
    } else {
      createMut.mutate({ data: formData });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-display font-bold">إدارة الموظفين والمندوبين</h2>
        <Button onClick={openAdd} className="gap-2">
          <Plus className="w-5 h-5" /> موظف جديد
        </Button>
      </div>

      <Card className="p-4 sm:p-6">
        {isLoading ? (
          <div className="py-12 text-center text-muted-foreground animate-pulse">جاري التحميل...</div>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>الاسم</Th>
                <Th>اسم المستخدم</Th>
                <Th>الهاتف</Th>
                <Th>الصلاحية</Th>
                <Th>إجراءات</Th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-secondary/20 transition-colors">
                  <Td className="font-bold">{u.name}</Td>
                  <Td dir="ltr" className="text-right">
                    {u.username}
                  </Td>
                  <Td dir="ltr" className="text-right">
                    {u.phone || "-"}
                  </Td>
                  <Td>
                    <Badge variant={u.role === "admin" ? "default" : "outline"}>
                      {u.role === "admin" ? "مدير" : "مندوب"}
                    </Badge>
                  </Td>
                  <Td>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(u)}>
                        <Edit2 className="w-4 h-4 text-blue-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (confirm("هل أنت متأكد؟")) deleteMut.mutate({ id: u.id });
                        }}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? "تعديل موظف" : "إضافة موظف"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="الاسم بالكامل *"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
          <Input
            label="رقم الهاتف"
            dir="ltr"
            className="text-right"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          />
          <Input
            label="اسم المستخدم (للدخول) *"
            required
            dir="ltr"
            className="text-right"
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
          />
          <Input
            label={
              editingId ? "كلمة المرور (اتركه فارغاً لعدم التغيير)" : "كلمة المرور *"
            }
            required={!editingId}
            type="password"
            dir="ltr"
            className="text-right"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-foreground/80">الصلاحية *</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer p-3 border-2 border-border rounded-xl flex-1 hover:border-primary transition-colors">
                <input
                  type="radio"
                  name="role"
                  value="agent"
                  checked={formData.role === "agent"}
                  onChange={() => setFormData({ ...formData, role: "agent" })}
                  className="w-4 h-4 text-primary"
                />
                <span className="font-semibold">مندوب توصيل</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer p-3 border-2 border-border rounded-xl flex-1 hover:border-primary transition-colors">
                <input
                  type="radio"
                  name="role"
                  value="admin"
                  checked={formData.role === "admin"}
                  onChange={() => setFormData({ ...formData, role: "admin" })}
                  className="w-4 h-4 text-primary"
                />
                <span className="font-semibold">مدير نظام</span>
              </label>
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              إلغاء
            </Button>
            <Button type="submit" isLoading={createMut.isPending || updateMut.isPending}>
              حفظ
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
