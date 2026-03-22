import { useState } from "react";
import { useListOrders, useGetMe } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Card, Badge } from "@/components/ui-components";
import { formatCurrency, formatDate, statusColors, statusLabels } from "@/lib/utils";
import { MapPin, Phone, Clock, ChevronLeft } from "lucide-react";
import { motion } from "framer-motion";

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

  const filteredOrders = activeTab === "all" ? orders : orders.filter(o => o.status === activeTab);

  if (isLoading) return <div className="p-8 text-center animate-pulse">جاري تحميل الطلبات...</div>;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <h2 className="text-2xl font-display font-bold">المهام اليومية</h2>

      {/* Tabs */}
      <div className="flex overflow-x-auto pb-2 gap-2 hide-scrollbar">
        {tabs.map(tab => (
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
                        <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-md">#{o.id}</span>
                      </div>
                      <Badge className={statusColors[o.status]}>{statusLabels[o.status]}</Badge>
                    </div>
                    <div className="text-left">
                      <span className="block font-bold text-primary text-lg">
                        {formatCurrency(o.items.reduce((sum, item) => sum + (item.quantity * parseFloat(item.unitPrice)), 0))}
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
