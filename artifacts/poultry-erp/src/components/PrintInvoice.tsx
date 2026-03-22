import { formatCurrency, formatDate, statusLabels } from "@/lib/utils";

interface OrderItem {
  quantity: number;
  unitPrice: string;
  product?: { name: string } | null;
}

interface DeliveryLog {
  id: number;
  collectedAmount: string | number;
  deliveredQuantity: number;
}

interface CompanySettings {
  name?: string;
  address?: string;
  phone?: string;
  commercialRegNo?: string;
  logoUrl?: string;
}

interface PrintInvoiceProps {
  order: {
    id: number;
    orderDate: string;
    status: string;
    customer?: { name?: string | null; phone?: string | null; location?: string | null } | null;
    agent?: { name?: string } | null;
    items: OrderItem[];
  };
  logs?: DeliveryLog[];
  company?: CompanySettings;
}

export default function PrintInvoice({ order, logs = [], company }: PrintInvoiceProps) {
  const totalAmount = order.items.reduce(
    (sum, item) => sum + item.quantity * parseFloat(item.unitPrice),
    0
  );

  const statusBg =
    order.status === "delivered"
      ? { bg: "#d1fae5", color: "#065f46" }
      : order.status === "cancelled"
      ? { bg: "#fee2e2", color: "#991b1b" }
      : { bg: "#fef3c7", color: "#92400e" };

  const companyName = company?.name?.trim() || "نظام إدارة تجارة الدواجن";

  return (
    <div
      id="print-invoice"
      style={{
        fontFamily: "'Cairo', 'Tajawal', Arial, sans-serif",
        direction: "rtl",
        color: "#111",
        padding: "0 24px",
      }}
    >
      {/* Header */}
      <div
        style={{
          borderBottom: "3px solid #059669",
          paddingBottom: 16,
          marginBottom: 24,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        {/* Company info (right) */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {company?.logoUrl && (
            <img
              src={company.logoUrl}
              alt="شعار الشركة"
              style={{ height: 60, width: "auto", objectFit: "contain" }}
            />
          )}
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: "#059669", margin: 0 }}>
              {companyName}
            </h1>
            {company?.address && (
              <p style={{ fontSize: 11, color: "#555", marginTop: 2 }}>{company.address}</p>
            )}
            {company?.phone && (
              <p style={{ fontSize: 11, color: "#555", marginTop: 1 }} dir="ltr">
                {company.phone}
              </p>
            )}
            {company?.commercialRegNo && (
              <p style={{ fontSize: 11, color: "#777", marginTop: 1 }}>
                السجل التجاري: {company.commercialRegNo}
              </p>
            )}
          </div>
        </div>

        {/* Invoice number + date (left) */}
        <div style={{ textAlign: "left" }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#111" }}>فاتورة #{order.id}</div>
          <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>{formatDate(order.orderDate)}</div>
        </div>
      </div>

      {/* Status */}
      <div style={{ marginBottom: 20 }}>
        <span
          style={{
            display: "inline-block",
            padding: "4px 16px",
            borderRadius: 99,
            fontWeight: 700,
            fontSize: 13,
            background: statusBg.bg,
            color: statusBg.color,
            border: "1px solid currentColor",
          }}
        >
          الحالة: {statusLabels[order.status]}
        </span>
      </div>

      {/* Two columns: customer + agent */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 24,
          marginBottom: 24,
        }}
      >
        {/* Customer */}
        <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: 16 }}>
          <h3
            style={{
              fontSize: 14,
              fontWeight: 800,
              marginBottom: 12,
              borderBottom: "1px solid #e5e7eb",
              paddingBottom: 8,
            }}
          >
            بيانات العميل
          </h3>
          <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
            <tbody>
              <tr>
                <td style={{ color: "#666", padding: "4px 0" }}>الاسم</td>
                <td style={{ fontWeight: 700, textAlign: "left" }}>{order.customer?.name ?? "—"}</td>
              </tr>
              <tr>
                <td style={{ color: "#666", padding: "4px 0" }}>الهاتف</td>
                <td style={{ fontWeight: 700, textAlign: "left", direction: "ltr" }}>
                  {order.customer?.phone ?? "—"}
                </td>
              </tr>
              <tr>
                <td style={{ color: "#666", padding: "4px 0" }}>الموقع</td>
                <td style={{ fontWeight: 700, textAlign: "left" }}>
                  {order.customer?.location || "غير محدد"}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Agent / Delivery */}
        <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: 16 }}>
          <h3
            style={{
              fontSize: 14,
              fontWeight: 800,
              marginBottom: 12,
              borderBottom: "1px solid #e5e7eb",
              paddingBottom: 8,
            }}
          >
            بيانات التوصيل
          </h3>
          <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
            <tbody>
              <tr>
                <td style={{ color: "#666", padding: "4px 0" }}>المندوب</td>
                <td style={{ fontWeight: 700, textAlign: "left" }}>
                  {order.agent?.name ?? "غير معين"}
                </td>
              </tr>
              <tr>
                <td style={{ color: "#666", padding: "4px 0" }}>التاريخ</td>
                <td style={{ fontWeight: 700, textAlign: "left" }}>{formatDate(order.orderDate)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Products table */}
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 14, fontWeight: 800, marginBottom: 12 }}>تفاصيل الطلبية</h3>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "#f0fdf4", borderBottom: "2px solid #059669" }}>
              <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700 }}>المنتج</th>
              <th style={{ padding: "10px 12px", textAlign: "center", fontWeight: 700 }}>الكمية</th>
              <th style={{ padding: "10px 12px", textAlign: "center", fontWeight: 700 }}>سعر الوحدة</th>
              <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 700 }}>الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item, idx) => (
              <tr
                key={idx}
                style={{
                  borderBottom: "1px solid #e5e7eb",
                  background: idx % 2 === 0 ? "#fff" : "#f9fafb",
                }}
              >
                <td style={{ padding: "10px 12px", fontWeight: 600 }}>{item.product?.name}</td>
                <td style={{ padding: "10px 12px", textAlign: "center" }}>{item.quantity}</td>
                <td style={{ padding: "10px 12px", textAlign: "center" }}>
                  {formatCurrency(parseFloat(item.unitPrice))}
                </td>
                <td style={{ padding: "10px 12px", textAlign: "left", fontWeight: 700 }}>
                  {formatCurrency(item.quantity * parseFloat(item.unitPrice))}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ borderTop: "2px solid #059669", background: "#f0fdf4" }}>
              <td colSpan={3} style={{ padding: "12px", fontWeight: 800, fontSize: 15 }}>
                الإجمالي الكلي
              </td>
              <td
                style={{
                  padding: "12px",
                  textAlign: "left",
                  fontWeight: 800,
                  fontSize: 17,
                  color: "#059669",
                }}
              >
                {formatCurrency(totalAmount)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Delivery log summary */}
      {logs.length > 0 && (
        <div
          style={{
            border: "1px solid #a7f3d0",
            borderRadius: 10,
            padding: 16,
            background: "#f0fdf4",
            marginBottom: 24,
          }}
        >
          <h3 style={{ fontSize: 14, fontWeight: 800, color: "#065f46", marginBottom: 12 }}>
            ملخص التوصيل
          </h3>
          {logs.map((log, i) => (
            <div
              key={i}
              style={{
                fontSize: 13,
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 6,
              }}
            >
              <span style={{ color: "#065f46" }}>
                المبلغ المحصل: <strong>{formatCurrency(log.collectedAmount)}</strong>
              </span>
              <span style={{ color: "#065f46" }}>
                الكمية المسلمة: <strong>{log.deliveredQuantity}</strong>
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div
        style={{
          borderTop: "1px solid #e5e7eb",
          paddingTop: 16,
          textAlign: "center",
          fontSize: 11,
          color: "#999",
        }}
      >
        تم إصدار هذه الفاتورة بواسطة {companyName} —{" "}
        {new Date().toLocaleDateString("ar-EG")}
      </div>
    </div>
  );
}
