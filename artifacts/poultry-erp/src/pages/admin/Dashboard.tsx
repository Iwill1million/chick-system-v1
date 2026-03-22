import { useState } from "react";
import { useGetFinanceSummary, customFetch } from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import type { Product } from "@workspace/api-client-react";
import { Card, Select, Input } from "@/components/ui-components";
import { formatCurrency, statusLabels } from "@/lib/utils";
import {
  ShoppingCart,
  CheckCircle,
  TrendingUp,
  Wallet,
  AlertTriangle,
  CreditCard,
  Users,
} from "lucide-react";
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
  LineChart,
  Line,
} from "recharts";
import { motion } from "framer-motion";
import { Link } from "wouter";

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
  badge?: string;
  badgeColor?: "green" | "blue" | "orange";
  subtitle?: string;
}

function StatCard({ title, value, icon: Icon, badge, badgeColor = "green", subtitle }: StatCardProps) {
  const badgeClasses = {
    green: "text-emerald-700 bg-emerald-100",
    blue: "text-blue-700 bg-blue-100",
    orange: "text-orange-700 bg-orange-100",
  };

  return (
    <motion.div variants={{ hidden: { opacity: 0, scale: 0.9 }, show: { opacity: 1, scale: 1 } }}>
      <Card className="p-6 flex flex-col justify-between h-full relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-32 h-32 bg-primary/5 rounded-full -translate-x-16 -translate-y-16 group-hover:scale-110 transition-transform duration-500" />
        <div className="flex justify-between items-start mb-4 relative z-10">
          <div className="p-3 rounded-xl bg-primary/10 text-primary">
            <Icon className="w-6 h-6" />
          </div>
          {badge && (
            <span className={`text-xs font-bold px-2 py-1 rounded-md ${badgeClasses[badgeColor]}`}>
              {badge}
            </span>
          )}
        </div>
        <div className="relative z-10">
          <p className="text-sm font-semibold text-muted-foreground mb-1">{title}</p>
          <p className="text-3xl font-display font-extrabold text-foreground">{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
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

  const deliveryRate = summary.totalOrders > 0
    ? Math.round((summary.deliveredOrders / summary.totalOrders) * 100)
    : 0;

  // Format daily orders dates for display (show day/month)
  const dailyOrdersData = summary.dailyOrders.map((d) => ({
    date: d.date.slice(5), // "MM-DD"
    count: d.count,
  }));

  // Top 5 customers by real balance (already sorted from API)
  const topCustomers = summary.customerBalances.slice(0, 5);

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
      {/* Header + filters */}
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

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard
          title="إجمالي الإيرادات"
          value={formatCurrency(summary.totalRevenue)}
          icon={TrendingUp}
          subtitle="الطلبات غير الملغاة فقط"
        />
        <StatCard
          title="المبلغ المحصل"
          value={formatCurrency(summary.totalCollected)}
          icon={Wallet}
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
          badge={summary.totalOrders > 0 ? `${deliveryRate}%` : undefined}
          badgeColor="green"
          subtitle="نسبة التسليم"
        />
        <StatCard
          title="الرصيد المتراكم"
          value={formatCurrency(summary.totalReceivables)}
          icon={CreditCard}
          badge="كل الوقت"
          badgeColor="blue"
          subtitle="مستحقات جميع العملاء"
        />
      </div>

      {/* Charts row 1: Pie + Agent Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div variants={itemVariants} className="lg:col-span-1">
          <Card className="p-6 h-full flex flex-col">
            <h3 className="text-lg font-bold mb-6">الطلبات حسب الحالة</h3>
            <div className="flex-1 min-h-[280px]">
              {pieData.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                  لا توجد طلبات في هذه الفترة
                </div>
              ) : (
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
              )}
            </div>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants} className="lg:col-span-2">
          <Card className="p-6 h-full flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold">أداء المندوبين</h3>
              <Link href="/agents/report" className="text-xs text-primary hover:underline font-semibold">
                تقرير مفصّل ←
              </Link>
            </div>
            <div className="flex-1 min-h-[280px]">
              {summary.agentPerformance.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                  لا توجد بيانات مندوبين في هذه الفترة
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={summary.agentPerformance}
                    margin={{ top: 10, right: 50, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis
                      dataKey="agentName"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#6b7280", fontSize: 12 }}
                      dy={10}
                    />
                    {/* Left Y axis: money (totalCollected) */}
                    <YAxis
                      yAxisId="money"
                      orientation="right"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#6b7280", fontSize: 11 }}
                      dx={10}
                      tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                    />
                    {/* Right Y axis: count (ordersCompleted) */}
                    <YAxis
                      yAxisId="count"
                      orientation="left"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#6b7280", fontSize: 11 }}
                      dx={-10}
                      allowDecimals={false}
                    />
                    <RechartsTooltip
                      formatter={(val, name) => [
                        name === "ordersCompleted" ? `${val} طلب` : formatCurrency(String(val)),
                        name === "ordersCompleted" ? "الطلبات المنجزة" : "التحصيل",
                      ]}
                    />
                    <Legend wrapperStyle={{ paddingTop: "20px" }} />
                    <Bar
                      yAxisId="count"
                      dataKey="ordersCompleted"
                      name="الطلبات المنجزة"
                      fill="hsl(var(--primary))"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={40}
                    />
                    <Bar
                      yAxisId="money"
                      dataKey="totalCollected"
                      name="التحصيل"
                      fill="hsl(var(--accent))"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={40}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Daily orders line chart */}
      {dailyOrdersData.length > 0 && (
        <motion.div variants={itemVariants}>
          <Card className="p-6">
            <h3 className="text-lg font-bold mb-6">الطلبات اليومية</h3>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyOrdersData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#6b7280", fontSize: 11 }}
                    dy={8}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#6b7280", fontSize: 11 }}
                    dx={-8}
                    allowDecimals={false}
                  />
                  <RechartsTooltip
                    formatter={(val) => [`${val} طلب`, "عدد الطلبات"]}
                    labelFormatter={(label) => `التاريخ: ${label}`}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    name="الطلبات"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: "hsl(var(--primary))" }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </motion.div>
      )}

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
                    <p className="text-xs text-muted-foreground">
                      {p.type === "chicks" ? "كتاكيت" : p.type === "chickens" ? "فراخ" : "أخرى"}
                    </p>
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

      {/* Customer balances + product sales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div variants={itemVariants}>
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">أعلى العملاء رصيداً</h3>
              <Users className="w-5 h-5 text-muted-foreground" />
            </div>
            {topCustomers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">لا يوجد عملاء</p>
            ) : (
              <div className="space-y-3">
                {topCustomers.map((c, i) => {
                  const bal = parseFloat(c.balance);
                  return (
                    <div
                      key={i}
                      className="flex justify-between items-center p-3 rounded-xl hover:bg-secondary/50 transition-colors border border-transparent hover:border-border/50"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0">
                          {i + 1}
                        </span>
                        <div>
                          <p className="font-bold text-foreground">{c.customerName}</p>
                          <p className="text-xs text-muted-foreground">{c.totalOrders} طلبات في الفترة</p>
                        </div>
                      </div>
                      <div className="text-left">
                        <p className={`font-bold ${bal > 0 ? "text-destructive" : bal < 0 ? "text-emerald-600" : "text-muted-foreground"}`}>
                          {formatCurrency(c.balance)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {bal > 0 ? "مستحق" : bal < 0 ? "رصيد دائن" : "مسوّى"}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="p-6">
            <h3 className="text-lg font-bold mb-4">مبيعات المنتجات</h3>
            {summary.productSales.filter(p => p.unitsSold > 0).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">لا توجد مبيعات في هذه الفترة</p>
            ) : (
              <div className="space-y-3">
                {summary.productSales
                  .filter(p => p.unitsSold > 0)
                  .sort((a, b) => parseFloat(b.totalRevenue) - parseFloat(a.totalRevenue))
                  .map((p, i) => (
                    <div
                      key={i}
                      className="flex justify-between items-center p-3 rounded-xl hover:bg-secondary/50 transition-colors border border-transparent hover:border-border/50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-sm flex-shrink-0">
                          {p.unitsSold}
                        </div>
                        <div>
                          <p className="font-bold text-foreground">{p.productName}</p>
                          <p className="text-xs text-muted-foreground">وحدة مباعة</p>
                        </div>
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-foreground">{formatCurrency(p.totalRevenue)}</p>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
