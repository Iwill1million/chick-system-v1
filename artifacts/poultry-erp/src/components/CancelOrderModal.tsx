import { Button, Modal } from "@/components/ui-components";
import { XCircle, AlertTriangle } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  reason: string;
  onReasonChange: (value: string) => void;
  onConfirm: () => void;
  isLoading?: boolean;
}

export default function CancelOrderModal({ isOpen, onClose, reason, onReasonChange, onConfirm, isLoading }: Props) {
  const handleClose = () => {
    onReasonChange("");
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="تأكيد إلغاء الطلب">
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-4 bg-destructive/5 border border-destructive/20 rounded-xl">
          <AlertTriangle className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
          <div className="text-sm">
            <p className="font-bold text-destructive mb-1">هل أنت متأكد من إلغاء الطلب؟</p>
            <p className="text-muted-foreground">سيتم إعادة كميات المنتجات المحجوزة إلى المخزون تلقائياً ولا يمكن التراجع عن هذا الإجراء.</p>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">
            سبب الإلغاء <span className="text-muted-foreground font-normal">(اختياري)</span>
          </label>
          <textarea
            value={reason}
            onChange={e => onReasonChange(e.target.value)}
            placeholder="أدخل سبب الإلغاء..."
            rows={3}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-destructive/30 focus:border-destructive/50"
          />
        </div>
        <div className="flex gap-3 pt-2">
          <Button variant="outline" className="flex-1" onClick={handleClose}>تراجع</Button>
          <Button
            className="flex-1 bg-destructive hover:bg-destructive/90 text-white"
            onClick={onConfirm}
            isLoading={isLoading}
          >
            <XCircle className="w-4 h-4 ml-2" /> تأكيد الإلغاء
          </Button>
        </div>
      </div>
    </Modal>
  );
}
