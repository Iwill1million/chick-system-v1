import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import { Card, Input, Select } from "@/components/ui-components";
import { formatCurrency } from "@/lib/utils";
import { motion } from "framer-motion";
import { Printer, Users, CheckCircle, Wallet, TrendingDown, TrendingUp } from "lucide-react";

type DateRangeOption = "daily" | "weekly" | "monthly" | "all" | "custom";

interface AgentReportItem {
  agentId: number;
  agentName: string;
  ordersCompleted: number;
  totalCollected: string;
  totalFuelExpense: string;
  totalOtherExpenses: string;
  netAmount: string;
}

function toYMD(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function computeRange(option: DateRangeOption, customFrom: string, customTo: string) {
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
      return { from: customFrom || toYMD(from), to: customTo || toYMD(to) };
  }
  return { from: toYMD(from), to: toYMD(to) };
}

function SummaryCard({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}) {
  return (
    <motion.div variants={{ hidden: { opacity: 0, scale: 0.9 }, show: { opacity: 1, scale: 1 } }}>
      <Card className="p-5 flex items-center gap-4 relative overflow-hidden">
        <div className={`p-3 rounded-xl ${color} flex-shrink-0`}>
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <p className="text-sm font-semibold text-muted-foreground">{title}</p>
          <p className="text-2xl font-display font-extrabold text-foreground">{value}</p>
        </div>
      </Card>
    </motion.div>
  );
}

const dateRangeOptions: { value: string; label: string }[] = [
  { value: "daily", label: "اليوم الماضي" },
  { value: "weekly", label: "الأسبوع الماضي" },
  { value: "monthly", label: "الشهر الماضي" },
  { value: "all", label: "كل الوقت" },
  { value: "custom", label: "نطاق مخصص" },
];

export default function AgentReport() {
  const [dateRange, setDateRange] = useState<DateRangeOption>("monthly");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const { from, to } = computeRange(dateRange, customFrom, customTo);

  const { data: agents = [], isLoading } = useQuery<AgentReportItem[]>({
    queryKey: ["/api/finance/agent-report", from, to],
    queryFn: () =>
      customFetch<AgentReportItem[]>(`/api/finance/agent-report?from=${from}&to=${to}`),
  });

  const totalOrders = agents.reduce((s, a) => s + a.ordersCompleted, 0);
  const totalCollected = agents.reduce((s, a) => s + parseFloat(a.totalCollected), 0);
  const totalExpenses = agents.reduce(
    (s, a) => s + parseFloat(a.totalFuelExpense) + parseFloat(a.totalOtherExpenses),
    0,
  );
  const totalNet = agents.reduce((s, a) => s + parseFloat(a.netAmount), 0);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.08 } },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h2 className="text-2xl font-display font-bold text-foreground">تقرير أداء المندوبين</h2>
          <p className="text-sm text-muted-foreground mt-1">
            الفترة: {from} — {to}
          </p>
        </div>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors"
        >
          <Printer className="w-4 h-4" />
          طباعة التقرير
        </button>
      </div>

      {/* Print Title */}
      <div className="hidden print:block text-center mb-6">
        <h1 className="text-2xl font-bold">تقرير أداء المندوبين</h1>
        <p className="text-muted-foreground mt-1">الفترة: {from} — {to}</p>
      </div>

      {/* Filters */}
      <Card className="p-4 print:hidden">
        <div className="flex flex-col sm:flex-row gap-3 items-end">
          <div className="flex-1 min-w-0">
            <label className="block text-sm font-semibold text-muted-foreground mb-1">الفترة الزمنية</label>
            <Select
              options={dateRangeOptions}
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as DateRangeOption)}
            />
          </div>
          {dateRange === "custom" && (
            <>
              <div className="flex-1 min-w-0">
                <label className="block text-sm font-semibold text-muted-foreground mb-1">من</label>
                <Input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
              </div>
              <div className="flex-1 min-w-0">
                <label className="block text-sm font-semibold text-muted-foreground mb-1">إلى</label>
                <Input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
              </div>
            </>
          )}
        </div>
      </Card>

      {/* Summary Cards */}
      {!isLoading && (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          <SummaryCard
            title="إجمالي الطلبات"
            value={String(totalOrders)}
            icon={CheckCircle}
            color="bg-primary/10 text-primary"
          />
          <SummaryCard
            title="إجمالي المحصّل"
            value={formatCurrency(totalCollected.toFixed(2))}
            icon={Wallet}
            color="bg-emerald-100 text-emerald-600"
          />
          <SummaryCard
            title="إجمالي المصاريف"
            value={formatCurrency(totalExpenses.toFixed(2))}
            icon={TrendingDown}
            color="bg-orange-100 text-orange-600"
          />
          <SummaryCard
            title="الصافي الإجمالي"
            value={formatCurrency(totalNet.toFixed(2))}
            icon={TrendingUp}
            color="bg-blue-100 text-blue-600"
          />
        </motion.div>
      )}

      {/* Per-Agent Cards (mobile) */}
      {isLoading ? (
        <div className="text-center py-16 animate-pulse text-muted-foreground">جاري التحميل...</div>
      ) : agents.length === 0 ? (
        <Card className="p-16 text-center">
          <Users className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
          <p className="text-muted-foreground">لا يوجد مندوبون أو لا توجد بيانات في هذه الفترة</p>
        </Card>
      ) : (
        <>
          {/* Agent Cards – all screen sizes */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 print:hidden"
          >
            {agents.map((agent) => (
              <motion.div
                key={agent.agentId}
                variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
              >
                <Card className="p-5 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg flex-shrink-0">
                      {agent.agentName.charAt(0)}
                    </div>
                    <p className="font-bold text-foreground text-lg">{agent.agentName}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="bg-secondary/50 rounded-lg p-2 text-center">
                      <p className="text-muted-foreground text-xs mb-0.5">الطلبات</p>
                      <p className="font-bold text-foreground">{agent.ordersCompleted}</p>
                    </div>
                    <div className="bg-emerald-50 rounded-lg p-2 text-center">
                      <p className="text-muted-foreground text-xs mb-0.5">المحصّل</p>
                      <p className="font-bold text-emerald-700">{formatCurrency(agent.totalCollected)}</p>
                    </div>
                    <div className="bg-orange-50 rounded-lg p-2 text-center">
                      <p className="text-muted-foreground text-xs mb-0.5">وقود</p>
                      <p className="font-bold text-orange-600">{formatCurrency(agent.totalFuelExpense)}</p>
                    </div>
                    <div className="bg-orange-50 rounded-lg p-2 text-center">
                      <p className="text-muted-foreground text-xs mb-0.5">مصاريف أخرى</p>
                      <p className="font-bold text-orange-600">{formatCurrency(agent.totalOtherExpenses)}</p>
                    </div>
                  </div>
                  <div className={`flex items-center justify-between rounded-lg p-3 ${parseFloat(agent.netAmount) >= 0 ? "bg-primary/10" : "bg-destructive/10"}`}>
                    <span className="text-sm font-semibold text-muted-foreground">الصافي</span>
                    <span className={`text-lg font-bold ${parseFloat(agent.netAmount) >= 0 ? "text-primary" : "text-destructive"}`}>
                      {formatCurrency(agent.netAmount)}
                    </span>
                  </div>
                </Card>
              </motion.div>
            ))}
          </motion.div>

          {/* Table – desktop summary (for print + larger screens) */}
          <Card className="overflow-hidden print:shadow-none print:border">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-secondary/50 border-b border-border">
                    <th className="text-right px-4 py-3 font-bold text-foreground">المندوب</th>
                    <th className="text-center px-4 py-3 font-bold text-foreground">الطلبات المكتملة</th>
                    <th className="text-center px-4 py-3 font-bold text-foreground">إجمالي المحصّل</th>
                    <th className="text-center px-4 py-3 font-bold text-foreground">مصروف الوقود</th>
                    <th className="text-center px-4 py-3 font-bold text-foreground">مصاريف أخرى</th>
                    <th className="text-center px-4 py-3 font-bold text-foreground">الصافي</th>
                  </tr>
                </thead>
                <tbody>
                  {agents.map((agent, idx) => (
                    <tr
                      key={agent.agentId}
                      className={`border-b border-border/50 last:border-0 transition-colors hover:bg-secondary/30 ${idx % 2 === 0 ? "" : "bg-secondary/10"}`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-base flex-shrink-0">
                            {agent.agentName.charAt(0)}
                          </div>
                          <span className="font-semibold text-foreground">{agent.agentName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">
                          {agent.ordersCompleted}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center font-semibold text-emerald-700">
                        {formatCurrency(agent.totalCollected)}
                      </td>
                      <td className="px-4 py-3 text-center text-orange-600">
                        {formatCurrency(agent.totalFuelExpense)}
                      </td>
                      <td className="px-4 py-3 text-center text-orange-600">
                        {formatCurrency(agent.totalOtherExpenses)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`font-bold text-base ${parseFloat(agent.netAmount) >= 0 ? "text-primary" : "text-destructive"}`}
                        >
                          {formatCurrency(agent.netAmount)}
                        </span>
                      </td>
                    </tr>
                  ))}

                  {/* Totals row */}
                  <tr className="bg-secondary/60 border-t-2 border-border font-bold">
                    <td className="px-4 py-3 text-foreground">الإجمالي</td>
                    <td className="px-4 py-3 text-center text-foreground">{totalOrders}</td>
                    <td className="px-4 py-3 text-center text-emerald-700">
                      {formatCurrency(totalCollected.toFixed(2))}
                    </td>
                    <td className="px-4 py-3 text-center text-orange-600">
                      {formatCurrency(
                        agents.reduce((s, a) => s + parseFloat(a.totalFuelExpense), 0).toFixed(2),
                      )}
                    </td>
                    <td className="px-4 py-3 text-center text-orange-600">
                      {formatCurrency(
                        agents.reduce((s, a) => s + parseFloat(a.totalOtherExpenses), 0).toFixed(2),
                      )}
                    </td>
                    <td className={`px-4 py-3 text-center text-lg ${totalNet >= 0 ? "text-primary" : "text-destructive"}`}>
                      {formatCurrency(totalNet.toFixed(2))}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>

          {/* Print-only table for mobile report */}
          <div className="hidden print:block mt-4 text-xs text-muted-foreground text-center">
            تم إنشاء هذا التقرير بتاريخ {new Date().toLocaleDateString("ar-SA")}
          </div>
        </>
      )}
    </div>
  );
}
