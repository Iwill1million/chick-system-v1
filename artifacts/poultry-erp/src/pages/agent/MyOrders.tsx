import { useState } from "react";
import { useListOrders, useGetMe } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Card, Badge } from "@/components/ui-components";
import { formatCurrency, formatDate, statusColors, statusLabels } from "@/lib/utils";
import { MapPin, Phone, Clock, ChevronLeft, PackageCheck, Loader2, TriangleAlert, Banknote } from "lucide-react";
import { motion } from "framer-motion";

function orderTotal(order: { items: { quantity: number; unitPrice: string }[] }) {
  return order.items.reduce((sum, item) => sum + item.quantity * parseFloat(item.unitPrice), 0);
}

export default function MyOrders() {
  const { data: user } = useGetMe();
  const { data: orders = [], isLoading } = useListOrders({ agentId: user?.id });
  const [activeTab, setActiveTab] = useState<string>("all");

  const tabs = [
    { id: "all", label: "الكل" },
    { id: "pending", label: "انتظار" },
    { id: "preparing", label: "تجهيز" },
    { id: "delivering", label: "توصيل" },
    { id: "delivered", label: "مكتملة" },
  ];

  const todayStr = new Date().toDateString();
  const todayOrders = orders.filter((o) => new Date(o.orderDate).toDateString() === todayStr);

  const useAll = todayOrders.length === 0;
  const statsOrders = useAll ? orders : todayOrders;

  const totalCount = statsOrders.length;
  const completedCount = statsOrders.filter((o) => o.status === "delivered").length;
  const remainingCount = statsOrders.filter(
    (o) => !["delivered", "cancelled"].includes(o.status)
  ).length;
  const collectedAmount = statsOrders
    .filter((o) => o.status === "delivered")
    .reduce((sum, o) => sum + orderTotal(o), 0);

  const progressPercent =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const statCards = [
    {
      label: "إجمالي الطلبات",
      value: totalCount,
      icon: PackageCheck,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      label: "مكتملة",
      value: completedCount,
      icon: PackageCheck,
      color: "text-emerald-600",
      bg: "bg-emerald-100",
    },
    {
      label: "متبقية",
      value: remainingCount,
      icon: Loader2,
      color: "text-amber-600",
      bg: "bg-amber-100",
    },
    {
      label: "المحصّل",
      value: formatCurrency(collectedAmount),
      icon: Banknote,
      color: "text-blue-600",
      bg: "bg-blue-100",
    },
  ];

  const filteredOrders = activeTab === "all" ? orders : orders.filter((o) => o.status === activeTab);

  if (isLoading) return <div className="p-8 text-center animate-pulse">جاري تحميل الطلبات...</div>;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-display font-bold">المهام اليومية</h2>
        {useAll && orders.length > 0 && (
          <span className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded-full">
            إجمالي الطلبات
          </span>
        )}
      </div>

      {/* Stats Summary */}
      {orders.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-3"
        >
          <div className="grid grid-cols-2 gap-3">
            {statCards.map((card, i) => (
              <motion.div
                key={card.label}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className="p-4 flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${card.bg}`}>
                    <card.icon className={`w-5 h-5 ${card.color}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">{card.label}</p>
                    <p className={`text-lg font-bold truncate ${card.color}`}>{card.value}</p>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Progress bar */}
          <Card className="p-4 space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="font-semibold text-foreground">نسبة الإنجاز</span>
              <span className={`font-bold ${progressPercent === 100 ? "text-emerald-600" : "text-primary"}`}>
                {progressPercent}%
              </span>
            </div>
            <div className="h-2.5 w-full bg-secondary rounded-full overflow-hidden">
              <motion.div
                className={`h-full rounded-full ${progressPercent === 100 ? "bg-emerald-500" : "bg-primary"}`}
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {completedCount} من {totalCount} طلب{totalCount !== 1 ? "اً" : ""} مكتمل
            </p>
          </Card>
        </motion.div>
      )}

      {/* Tabs */}
      <div className="flex overflow-x-auto pb-2 gap-2 hide-scrollbar">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`whitespace-nowrap px-4 py-2 rounded-full font-bold text-sm transition-all ${
              activeTab === tab.id
                ? "bg-primary text-primary-foreground shadow-md"
                : "bg-card text-muted-foreground border border-border hover:bg-secondary"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Order List */}
      <div className="space-y-4">
        {filteredOrders.length === 0 ? (
          <div className="text-center py-12 bg-card rounded-2xl border border-dashed border-border text-muted-foreground">
            لا توجد طلبات في هذا القسم
          </div>
        ) : (
          filteredOrders.map((o, i) => (
            <motion.div
              key={o.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Link href={`/agent/orders/${o.id}`}>
                <Card className="p-5 hover:border-primary/50 transition-all cursor-pointer group">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-lg text-foreground">{o.customer?.name}</span>
                        <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-md">
                          #{o.id}
                        </span>
                      </div>
                      <Badge className={statusColors[o.status]}>{statusLabels[o.status]}</Badge>
                    </div>
                    <div className="text-left">
                      <span className="block font-bold text-primary text-lg">
                        {formatCurrency(orderTotal(o))}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm text-muted-foreground bg-secondary/30 p-3 rounded-xl">
                    {o.customer?.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-primary" />
                        <span dir="ltr">{o.customer.phone}</span>
                      </div>
                    )}
                    {o.customer?.location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-primary" />
                        <span>{o.customer.location}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-primary" />
                      <span>{formatDate(o.orderDate)}</span>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between text-sm font-bold text-primary group-hover:translate-x-[-4px] transition-transform">
                    <span>عرض التفاصيل والتحديث</span>
                    <ChevronLeft className="w-5 h-5" />
                  </div>
                </Card>
              </Link>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
