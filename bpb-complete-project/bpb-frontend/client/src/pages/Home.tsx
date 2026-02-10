/**
 * Dashboard Home - Command Center Overview
 * Design: Dark theme, teal accents, circuit-board aesthetic
 * Shows: System overview, package summaries, recent activity, health status
 */
import { useEffect, useState } from "react";
import { Link } from "wouter";
import {
  Package, Users, MessageSquare, Shield, Activity, ArrowUpRight,
  TrendingUp, AlertTriangle, CheckCircle2, Clock, Zap, BarChart3, Bell
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import DashboardLayout from "@/components/DashboardLayout";
import { packagesApi, systemApi, alertsApi } from "@/lib/api";
import { useApi, usePolling } from "@/hooks/useApi";
import { motion } from "framer-motion";

const HERO_BG = "https://private-us-east-1.manuscdn.com/sessionFile/FrAGzK0RSeaSLJYgAvdIsd/sandbox/ZCprEzMGxdlqKJJZHbcR1g-img-1_1770591775000_na1fn_YnBiLWhlcm8tYmc.png?x-oss-process=image/resize,w_1920,h_1920/format,webp/quality,q_80&Expires=1798761600&Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9wcml2YXRlLXVzLWVhc3QtMS5tYW51c2Nkbi5jb20vc2Vzc2lvbkZpbGUvRnJBR3pLMFJTZWFTTEpZZ0F2ZElzZC9zYW5kYm94L1pDcHJFek1HeGRscUtKSlpIYmNSMWctaW1nLTFfMTc3MDU5MTc3NTAwMF9uYTFmbl9ZbkJpTFdobGNtOHRZbWMucG5nP3gtb3NzLXByb2Nlc3M9aW1hZ2UvcmVzaXplLHdfMTkyMCxoXzE5MjAvZm9ybWF0LHdlYnAvcXVhbGl0eSxxXzgwIiwiQ29uZGl0aW9uIjp7IkRhdGVMZXNzVGhhbiI6eyJBV1M6RXBvY2hUaW1lIjoxNzk4NzYxNjAwfX19XX0_&Key-Pair-Id=K2HSFNDJXOU9YS&Signature=f7sj68D-qBx2cn8qgmesnWVrbB-4ZmqVUeBuztmKjl0c6O4Iv2Dx2Qpu086v-~EY2oXRwhvHujWCynCRZX11L4YnekWfBMw0guV8F2VBV~VeWimviCi-J-hHY20YaLGjIZ4tLSAs80WEAy6377M-tYqQsu2v7VvMSLb-zAuLMmcMl-dX5xBaDgTjkRaIc-wi3JHp0fiLF2exHi3jOck0xl2WY0vF1yxGlTTiqN6G4z0HLIAQIvMD41gMbNwbnkjJnmfcmH1z4z0q8eQMxUVTZDazwtKHw3jV3XOwWl5lQ7CB7jGG359GnHXC7IR3DHpVYpJrP6Lh~iWhrrJ2TlvQVg__";

function MetricCard({ icon: Icon, label, value, trend, color }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="border-glow border-glow-hover bg-card/80 backdrop-blur-sm transition-all duration-200">
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
              <span className="text-2xl font-bold font-mono text-foreground metric-value">{value}</span>
            </div>
            <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-${color}/10 border border-${color}/20`}>
              <Icon className={`h-5 w-5 text-${color}`} />
            </div>
          </div>
          {trend && (
            <div className="mt-3 flex items-center gap-1 text-xs">
              <TrendingUp className="h-3 w-3 text-emerald" />
              <span className="text-emerald font-mono">{trend}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function Home() {
  const { data: packages, loading: pkgLoading } = usePolling(() => packagesApi.list(), 10000);
  const { data: health } = usePolling(() => systemApi.health(), 15000);
  const { data: alerts } = useApi(() => alertsApi.list(undefined, true));

  const totalProfiles = packages?.reduce((sum: number, p: any) => sum + (p.total_profiles || 0), 0) || 0;
  const activeProfiles = packages?.reduce((sum: number, p: any) => sum + (p.active_profiles || 0), 0) || 0;
  const totalMessages = packages?.reduce((sum: number, p: any) => sum + (p.messages_today || 0), 0) || 0;
  const totalQueue = packages?.reduce((sum: number, p: any) => sum + (p.queue_size || 0), 0) || 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Hero banner */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="relative overflow-hidden rounded-xl border border-border"
        >
          <div
            className="absolute inset-0 bg-cover bg-center opacity-30"
            style={{ backgroundImage: `url(${HERO_BG})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-transparent" />
          <div className="relative px-8 py-8">
            <div className="flex items-center gap-3 mb-2">
              <Shield className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold font-mono text-foreground tracking-tight">
                Command Center
              </h1>
            </div>
            <p className="text-sm text-muted-foreground max-w-lg">
              Monitor and control your WhatsApp message distribution. Smart rate limiting,
              profile health tracking, and block prevention — all in real-time.
            </p>
            <div className="flex items-center gap-4 mt-4">
              <Link href="/packages">
                <Button size="sm" className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
                  <Package className="h-3.5 w-3.5" />
                  Manage Packages
                </Button>
              </Link>
              <Link href="/messages">
                <Button size="sm" variant="outline" className="gap-2 border-primary/30 text-primary hover:bg-primary/10">
                  <MessageSquare className="h-3.5 w-3.5" />
                  Send Messages
                </Button>
              </Link>
            </div>
          </div>
        </motion.div>

        {/* Metric cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            icon={Package}
            label="Active Packages"
            value={packages?.filter((p: any) => p.status === "active").length || 0}
            color="primary"
          />
          <MetricCard
            icon={Users}
            label="Total Profiles"
            value={totalProfiles}
            trend={activeProfiles > 0 ? `${activeProfiles} active` : undefined}
            color="cyan"
          />
          <MetricCard
            icon={MessageSquare}
            label="Messages Today"
            value={totalMessages}
            color="emerald"
          />
          <MetricCard
            icon={Clock}
            label="Queue Size"
            value={totalQueue}
            color="amber-warn"
          />
        </div>

        {/* Packages overview + Alerts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Packages list */}
          <div className="lg:col-span-2">
            <Card className="border-glow bg-card/80 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-mono flex items-center gap-2">
                    <Package className="h-4 w-4 text-primary" />
                    Active Packages
                  </CardTitle>
                  <Link href="/packages">
                    <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-primary gap-1">
                      View All <ArrowUpRight className="h-3 w-3" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {pkgLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Activity className="h-5 w-5 text-primary animate-spin" />
                  </div>
                ) : packages && packages.length > 0 ? (
                  packages.slice(0, 5).map((pkg: any, i: number) => (
                    <motion.div
                      key={pkg.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <Link href={`/packages/${pkg.id}`}>
                        <div className="flex items-center justify-between rounded-lg border border-border/50 bg-secondary/30 p-4 hover:border-primary/30 hover:bg-secondary/50 transition-all cursor-pointer">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 border border-primary/20">
                              <Package className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-foreground">{pkg.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {pkg.total_profiles || 0} profiles · {pkg.distribution_mode}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="text-sm font-mono text-foreground">{pkg.messages_today || 0}</p>
                              <p className="text-[10px] text-muted-foreground uppercase">msgs today</p>
                            </div>
                            <Badge
                              variant={pkg.status === "active" ? "default" : "secondary"}
                              className={pkg.status === "active" ? "bg-emerald/15 text-emerald border-emerald/30" : ""}
                            >
                              {pkg.status}
                            </Badge>
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Package className="h-10 w-10 text-muted-foreground/30 mb-3" />
                    <p className="text-sm text-muted-foreground">No packages yet</p>
                    <Link href="/packages">
                      <Button size="sm" className="mt-3 gap-2">
                        <Zap className="h-3.5 w-3.5" />
                        Create First Package
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* System status + Alerts */}
          <div className="space-y-4">
            {/* System Health */}
            <Card className="border-glow bg-card/80 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-mono flex items-center gap-2">
                  <Activity className="h-4 w-4 text-emerald" />
                  System Health
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">API Status</span>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald status-pulse" />
                    <span className="text-xs font-mono text-emerald">
                      {health?.status === "healthy" ? "Healthy" : "Checking..."}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Database</span>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald status-pulse" />
                    <span className="text-xs font-mono text-emerald">Connected</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">WhatsApp API</span>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-amber-warn" />
                    <span className="text-xs font-mono text-amber-warn">Standby</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Version</span>
                  <span className="text-xs font-mono text-muted-foreground">{health?.version || "1.0.0"}</span>
                </div>
              </CardContent>
            </Card>

            {/* Recent Alerts */}
            <Card className="border-glow bg-card/80 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-mono flex items-center gap-2">
                    <Bell className="h-4 w-4 text-amber-warn" />
                    Alerts
                  </CardTitle>
                  <Link href="/alerts">
                    <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-primary gap-1">
                      All <ArrowUpRight className="h-3 w-3" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {alerts && alerts.length > 0 ? (
                  <div className="space-y-2">
                    {alerts.slice(0, 3).map((alert: any) => (
                      <div key={alert.id} className="flex items-start gap-2 rounded-md bg-secondary/30 p-3 border border-border/50">
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-warn mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs font-medium text-foreground">{alert.title}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{alert.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center py-6 text-center">
                    <CheckCircle2 className="h-8 w-8 text-emerald/30 mb-2" />
                    <p className="text-xs text-muted-foreground">No active alerts</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1">All systems nominal</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}


