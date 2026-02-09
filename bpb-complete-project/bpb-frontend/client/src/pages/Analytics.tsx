/**
 * Analytics Page - Message distribution analytics and charts
 * Design: Command Center dark theme with teal accents
 */
import { useState, useMemo } from "react";
import {
  BarChart3, Activity, Package, TrendingUp, MessageSquare,
  CheckCircle2, XCircle, Clock
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import DashboardLayout from "@/components/DashboardLayout";
import { packagesApi, messagesApi } from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import { motion } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Area, AreaChart, Legend
} from "recharts";

const ANALYTICS_BG = "https://private-us-east-1.manuscdn.com/sessionFile/FrAGzK0RSeaSLJYgAvdIsd/sandbox/ZCprEzMGxdlqKJJZHbcR1g-img-4_1770591771000_na1fn_YnBiLWFuYWx5dGljcy1iZw.png?x-oss-process=image/resize,w_1920,h_1920/format,webp/quality,q_80&Expires=1798761600&Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9wcml2YXRlLXVzLWVhc3QtMS5tYW51c2Nkbi5jb20vc2Vzc2lvbkZpbGUvRnJBR3pLMFJTZWFTTEpZZ0F2ZElzZC9zYW5kYm94L1pDcHJFek1HeGRscUtKSlpIYmNSMWctaW1nLTRfMTc3MDU5MTc3MTAwMF9uYTFmbl9ZbkJpTFdGdVlXeDVkR2xqY3kxaVp3LnBuZz94LW9zcy1wcm9jZXNzPWltYWdlL3Jlc2l6ZSx3XzE5MjAsaF8xOTIwL2Zvcm1hdCx3ZWJwL3F1YWxpdHkscV84MCIsIkNvbmRpdGlvbiI6eyJEYXRlTGVzc1RoYW4iOnsiQVdTOkVwb2NoVGltZSI6MTc5ODc2MTYwMH19fV19&Key-Pair-Id=K2HSFNDJXOU9YS&Signature=lDeY9BzO9xXMkLqvktDyZBqTTqq22TKuFDzqrUMB-svKOs2cP2yWyYFLqe504rNAaJFUx5oyhOWJZM1zMs-Y6wVFfdxm4ljQF3lySxd6PLDLwzUO4HJt47iUJ7-k3OEcEkPhxjOMpXy8z2WUv65lSSSPikFMh5HAaC~m0oRLndEntJ2z-4SUDN-IKjxELR0UXAKvVk842wqPsh0C1lR09J5dNn3G7UohQNj3qfmDZydFxnnIajG8WNwJjNQqc1WZvJMlGH9-9-Ez6X42jvyiYiwDoiKR3Ay5mltNtHka9dCfsBuIBoWS4St~N8l1m-zosptPMDPWXiALIyuAo3EX8g__";

const CHART_COLORS = ["#00d4aa", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444"];

export default function Analytics() {
  const { data: packages } = useApi(() => packagesApi.list());
  const [selectedPkg, setSelectedPkg] = useState<string>("");
  const [days, setDays] = useState(7);

  const { data: analytics, loading } = useApi(
    () => selectedPkg ? messagesApi.analytics(selectedPkg, days) : Promise.resolve(null),
    [selectedPkg, days]
  );

  // Generate sample chart data based on analytics or defaults
  const dailyData = useMemo(() => {
    if (analytics?.daily_breakdown) return analytics.daily_breakdown;
    const data = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      data.push({
        date: d.toLocaleDateString("en", { month: "short", day: "numeric" }),
        sent: Math.floor(Math.random() * 50),
        delivered: Math.floor(Math.random() * 45),
        failed: Math.floor(Math.random() * 5),
      });
    }
    return data;
  }, [analytics, days]);

  const statusPieData = useMemo(() => {
    if (analytics) {
      return [
        { name: "Delivered", value: analytics.delivered || 0 },
        { name: "Sent", value: analytics.sent || 0 },
        { name: "Queued", value: analytics.queued || 0 },
        { name: "Failed", value: analytics.failed || 0 },
      ].filter(d => d.value > 0);
    }
    return [
      { name: "Delivered", value: 65 },
      { name: "Sent", value: 20 },
      { name: "Queued", value: 10 },
      { name: "Failed", value: 5 },
    ];
  }, [analytics]);

  const hourlyData = useMemo(() => {
    if (analytics?.hourly_breakdown) return analytics.hourly_breakdown;
    return Array.from({ length: 24 }, (_, i) => ({
      hour: `${i}:00`,
      messages: Math.floor(Math.random() * 20),
    }));
  }, [analytics]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header with background */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative overflow-hidden rounded-xl border border-border"
        >
          <div className="absolute inset-0 bg-cover bg-center opacity-20" style={{ backgroundImage: `url(${ANALYTICS_BG})` }} />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/90 to-background/70" />
          <div className="relative px-8 py-6">
            <h1 className="text-xl font-bold font-mono text-foreground flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Analytics
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Message distribution performance and delivery metrics
            </p>
          </div>
        </motion.div>

        {/* Controls */}
        <div className="flex items-center gap-3">
          <Select value={selectedPkg} onValueChange={setSelectedPkg}>
            <SelectTrigger className="w-[200px] bg-secondary/30">
              <SelectValue placeholder="Select package..." />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border">
              {packages?.map((pkg: any) => (
                <SelectItem key={pkg.id} value={pkg.id}>
                  <span className="flex items-center gap-2"><Package className="h-3 w-3" /> {pkg.name}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
            <SelectTrigger className="w-[130px] bg-secondary/30">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border">
              <SelectItem value="1">Last 24h</SelectItem>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="14">Last 14 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total Sent", value: analytics?.total_sent || 0, icon: MessageSquare, color: "text-primary" },
            { label: "Delivered", value: analytics?.delivered || 0, icon: CheckCircle2, color: "text-emerald" },
            { label: "Failed", value: analytics?.failed || 0, icon: XCircle, color: "text-coral" },
            { label: "Avg Delivery", value: analytics?.avg_delivery_time ? `${analytics.avg_delivery_time}s` : "—", icon: Clock, color: "text-cyan" },
          ].map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="border-glow bg-card/80">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{s.label}</p>
                      <p className={`text-2xl font-bold font-mono ${s.color} mt-1`}>{s.value}</p>
                    </div>
                    <s.icon className={`h-5 w-5 ${s.color} opacity-50`} />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Daily trend */}
          <div className="lg:col-span-2">
            <Card className="border-glow bg-card/80">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-mono flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Daily Message Volume
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={dailyData}>
                    <defs>
                      <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#00d4aa" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#00d4aa" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorDelivered" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#6b7280" }} />
                    <YAxis tick={{ fontSize: 10, fill: "#6b7280" }} />
                    <RTooltip contentStyle={{ background: "#0d1526", border: "1px solid rgba(0,212,170,0.3)", borderRadius: "8px", fontSize: "12px" }} />
                    <Area type="monotone" dataKey="sent" stroke="#00d4aa" fill="url(#colorSent)" strokeWidth={2} />
                    <Area type="monotone" dataKey="delivered" stroke="#0ea5e9" fill="url(#colorDelivered)" strokeWidth={2} />
                    <Bar dataKey="failed" fill="#ef4444" opacity={0.6} />
                    <Legend wrapperStyle={{ fontSize: "11px" }} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Status pie */}
          <Card className="border-glow bg-card/80">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-mono flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                Delivery Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={statusPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {statusPieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <RTooltip contentStyle={{ background: "#0d1526", border: "1px solid rgba(0,212,170,0.3)", borderRadius: "8px", fontSize: "12px" }} />
                  <Legend wrapperStyle={{ fontSize: "11px" }} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Hourly distribution */}
        <Card className="border-glow bg-card/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-mono flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              Hourly Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={hourlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="hour" tick={{ fontSize: 9, fill: "#6b7280" }} interval={2} />
                <YAxis tick={{ fontSize: 10, fill: "#6b7280" }} />
                <RTooltip contentStyle={{ background: "#0d1526", border: "1px solid rgba(0,212,170,0.3)", borderRadius: "8px", fontSize: "12px" }} />
                <Bar dataKey="messages" fill="#00d4aa" radius={[2, 2, 0, 0]} opacity={0.8} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
