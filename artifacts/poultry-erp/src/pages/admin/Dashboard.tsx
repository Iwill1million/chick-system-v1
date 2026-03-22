import { useState } from "react";
import { useGetFinanceSummary, customFetch } from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import type { Product } from "@workspace/api-client-react";
import { Card, Select, Input } from "@/components/ui-components";
import { formatCurrency, statusLabels, statusColors } from "@/lib/utils";
import { ShoppingCart, CheckCircle, TrendingUp, Wallet, ArrowUpRight, AlertTriangle, CreditCard } from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts";
import { motion } from "framer-motion";

type DateRangeOption = "daily" | "weekly" | "monthly" | "all" | "custom";

interface DateRange {
  from: string;
  to: string;
}

function toYMD(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function computeRange(option: DateRangeOption, customFrom: string, customTo: string): DateRange {
  const to = new Date();
  const from = new Date();

  switch (option) {
    case "daily":
      from.setDate(from.getDate() - 1);
      break;
    case "weekly":
      from.setDate(from.getDate() - 7);
      break;
    case "monthly":
      from.setMonth(from.getMonth() - 1);
      break;
    case "all":
      from.setFullYear(from.getFullYear() - 10);
      break;
    case "custom":
      return {
        from: customFrom || toYMD(from),
        to: customTo || toYMD(to),
      };
  }

  return { from: toYMD(from), to: toYMD(to) };
}

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: string;
}

function StatCard({ title, value, icon: Icon, trend }: StatCardProps) {
  return (
    <motion.div variants={{ hidden: { opacity: 0, scale: 0.9 }, show: { opacity: 1, scale: 1 } }}>
      <Card className="p-6 flex flex-col justify-between h-full relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-32 h-32 bg-primary/5 rounded-full -translate-x-16 -translate-y-16 group-hover:scale-110 transition-transform duration-500" />
        <div className="flex justify-between items-start mb-4 relative z-10">
          <div className="p-3 rounded-xl bg-primary/10 text-primary">
            <Icon className="w-6 h-6" />
          </div>
          {trend && (
            <span className="flex items-center text-xs font-bold text-emerald-600 bg-emerald-100 px-2 py-1 rounded-md">
              <ArrowUpRight className="w-3 h-3 ml-1" />
              {trend}
            </span>
          )}
        </div>
        <div className="relative z-10">
          <p className="text-sm font-semibold text-muted-foreground mb-1">{title}</p>
          <p className="text-3xl font-display font-extrabold text-foreground">{value}</p>
        </div>
      </Card>
    </motion.div>
  );
}

export default function Dashboard() {
  const [dateRange, setDateRange] = useState<DateRangeOption>("monthly");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const { from, to } = computeRange(dateRange, customFrom, customTo);

  const { data: summary, isLoading } = useGetFinanceSummary({ from, to });
  const { data: lowStockProducts = [] } = useQuery({
    queryKey: ["/api/products", { lowStock: true }],
    queryFn: () => customFetch<Product[]>("/api/products?lowStock=true"),
  });

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  };

  if (isLoading || !summary) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="animate-spin h-10 w-10 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const PIE_COLORS = ["#fbbf24", "#3b82f6", "#f97316", "#22c55e", "#ef4444"];

  const pieData = summary.ordersByStatus.map((s) => ({
    name: statusLabels[s.status as keyof typeof statusLabels] || s.status,
    value: s.count,
  }));

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-display font-bold text-foreground">نظرة عامة</h2>
          <p className="text-muted-foreground mt-1">ملخص أداء المبيعات والتوصيل</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <div className="w-full sm:w-48">
            <Select
              options={[
                { label: "اليوم", value: "daily" },
                { label: "آخر 7 أيام", value: "weekly" },
                { label: "هذا الشهر", value: "monthly" },
                { label: "كل الوقت", value: "all" },
                { label: "نطاق مخصص", value: "custom" },
              ]}
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as DateRangeOption)}
            />
          </div>
          {dateRange === "custom" && (
            <div className="flex gap-2">
              <div className="w-36">
                <Input
                  type="date"
                  label="من"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                />
              </div>
              <div className="w-36">
                <Input
                  type="date"
                  label="إلى"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="إجمالي الإيرادات"
          value={formatCurrency(summary.totalRevenue)}
          icon={TrendingUp}
          trend="+12.5%"
        />
        <StatCard
          title="المبلغ المحصل"
          value={formatCurrency(summary.totalCollected)}
          icon={Wallet}
          trend="+8.2%"
        />
        <StatCard
          title="إجمالي الطلبات"
          value={summary.totalOrders.toString()}
          icon={ShoppingCart}
        />
        <StatCard
          title="الطلبات المنجزة"
          value={summary.deliveredOrders.toString()}
          icon={CheckCircle}
        />
        <StatCard
          title="إجمالي المستحقات"
          value={formatCurrency(summary.totalReceivables)}
          icon={CreditCard}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        <motion.div variants={itemVariants} className="lg:col-span-1">
          <Card className="p-6 h-full flex flex-col">
            <h3 className="text-lg font-bold mb-6">الطلبات حسب الحالة</h3>
            <div className="flex-1 min-h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip formatter={(val) => [`${val} طلب`, "العدد"]} />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants} className="lg:col-span-2">
          <Card className="p-6 h-full flex flex-col">
            <h3 className="text-lg font-bold mb-6">أداء المندوبين</h3>
            <div className="flex-1 min-h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={summary.agentPerformance}
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis
                    dataKey="agentName"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#6b7280" }}
                    dy={10}
                  />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "#6b7280" }} dx={-10} />
                  <RechartsTooltip
                    formatter={(val, name) => [
                      name === "ordersCompleted" ? val : formatCurrency(String(val)),
                      name === "ordersCompleted" ? "الطلبات المنجزة" : "التحصيل",
                    ]}
                  />
                  <Legend wrapperStyle={{ paddingTop: "20px" }} />
                  <Bar
                    dataKey="ordersCompleted"
                    name="الطلبات المنجزة"
                    fill="hsl(var(--primary))"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={50}
                  />
                  <Bar
                    dataKey="totalCollected"
                    name="التحصيل"
                    fill="hsl(var(--accent))"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={50}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Low Stock Warning */}
      {lowStockProducts.length > 0 && (
        <motion.div variants={itemVariants}>
          <Card className="p-6 border-destructive/30 bg-red-50/50">
            <h3 className="text-lg font-bold mb-4 text-destructive flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              منتجات تحتاج إعادة تعبئة ({lowStockProducts.length})
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {lowStockProducts.map(p => (
                <div key={p.id} className="flex justify-between items-center p-3 bg-white rounded-xl border border-destructive/20">
                  <div>
                    <p className="font-bold text-sm text-foreground">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.type === "chicks" ? "كتاكيت" : p.type === "chickens" ? "فراخ" : "أخرى"}</p>
                  </div>
                  <div className="text-left">
                    <span className="text-2xl font-extrabold text-destructive">{p.stockQuantity}</span>
                    <p className="text-xs text-muted-foreground">متبقية</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <motion.div variants={itemVariants}>
          <Card className="p-6">
            <h3 className="text-lg font-bold mb-4">أرصدة العملاء (أعلى 5)</h3>
            <div className="space-y-4">
              {summary.customerBalances.slice(0, 5).map((c, i) => (
                <div
                  key={i}
                  className="flex justify-between items-center p-3 rounded-xl hover:bg-secondary/50 transition-colors border border-transparent hover:border-border/50"
                >
                  <div>
                    <p className="font-bold text-foreground">{c.customerName}</p>
                    <p className="text-xs text-muted-foreground">{c.totalOrders} طلبات</p>
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-primary">{formatCurrency(c.totalCollected)}</p>
                    <p className="text-xs text-muted-foreground">تحصيل</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="p-6">
            <h3 className="text-lg font-bold mb-4">مبيعات المنتجات</h3>
            <div className="space-y-4">
              {summary.productSales.map((p, i) => (
                <div
                  key={i}
                  className="flex justify-between items-center p-3 rounded-xl hover:bg-secondary/50 transition-colors border border-transparent hover:border-border/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-accent/10 text-accent flex items-center justify-center font-bold">
                      {p.unitsSold}
                    </div>
                    <div>
                      <p className="font-bold text-foreground">{p.productName}</p>
                    </div>
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-foreground">{formatCurrency(p.totalRevenue)}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
