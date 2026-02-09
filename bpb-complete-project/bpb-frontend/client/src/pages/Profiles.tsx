/**
 * Profiles Page - View all profiles across all packages
 * Design: Command Center dark theme with teal accents
 */
import { useState, useMemo, useEffect } from "react";
import { Link } from "wouter";
import {
  Users, Search, Activity, Shield, Heart, Package,
  ArrowUpRight, AlertTriangle, CheckCircle2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import DashboardLayout from "@/components/DashboardLayout";
import { packagesApi } from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import { motion } from "framer-motion";

export default function Profiles() {
  const { data: packages, loading: pkgLoading } = useApi(() => packagesApi.list());
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [allProfiles, setAllProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!packages || packages.length === 0) { setLoading(pkgLoading); return; }
    setLoading(true);
    Promise.all(
      packages.map((pkg: any) =>
        packagesApi.get(pkg.id).then((detail: any) =>
          (detail.profiles || []).map((p: any) => ({
            ...p,
            packageName: detail.name,
            packageId: detail.id,
            maxDay: detail.max_messages_per_day,
          }))
        )
      )
    ).then((results) => {
      setAllProfiles(results.flat());
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [packages, pkgLoading]);

  const filtered = useMemo(() => {
    return allProfiles.filter((p: any) => {
      const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.phone_number || "").includes(search);
      const matchStatus = statusFilter === "all" || p.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [allProfiles, search, statusFilter]);

  const totalActive = allProfiles.filter((p: any) => p.status === "active").length;
  const avgHealth = allProfiles.length > 0
    ? Math.round(allProfiles.reduce((s: number, p: any) => s + (p.health_score || 0), 0) / allProfiles.length)
    : 0;
  const highRisk = allProfiles.filter((p: any) => (p.risk_score || 0) > 50).length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl font-bold font-mono text-foreground flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            All Profiles
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Monitor health, risk, and activity across all WhatsApp profiles
          </p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total", value: allProfiles.length, color: "text-cyan" },
            { label: "Active", value: totalActive, color: "text-emerald" },
            { label: "Avg Health", value: avgHealth, color: "text-primary" },
            { label: "High Risk", value: highRisk, color: "text-coral" },
          ].map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="border-glow bg-card/80">
                <CardContent className="p-4 text-center">
                  <p className={`text-2xl font-bold font-mono ${s.color}`}>{s.value}</p>
                  <p className="text-[10px] text-muted-foreground uppercase mt-1">{s.label}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search profiles..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-secondary/30 border-border/50" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px] bg-secondary/30"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-popover border-border">
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
              <SelectItem value="frozen">Frozen</SelectItem>
              <SelectItem value="blocked">Blocked</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Profile list */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Activity className="h-6 w-6 text-primary animate-spin" />
          </div>
        ) : filtered.length > 0 ? (
          <div className="space-y-2">
            {/* Table header */}
            <div className="grid grid-cols-12 gap-4 px-4 py-2 text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
              <div className="col-span-3">Profile</div>
              <div className="col-span-2">Package</div>
              <div className="col-span-1 text-center">Status</div>
              <div className="col-span-1 text-center">Health</div>
              <div className="col-span-1 text-center">Risk</div>
              <div className="col-span-1 text-center">Weight</div>
              <div className="col-span-2 text-center">Daily Usage</div>
              <div className="col-span-1 text-center">Action</div>
            </div>

            {filtered.map((profile: any, i: number) => {
              const dayPct = Math.min(100, ((profile.messages_sent_today || 0) / Math.max(profile.maxDay || 120, 1)) * 100);
              return (
                <motion.div key={profile.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }}>
                  <div className="grid grid-cols-12 gap-4 items-center rounded-lg border border-border/50 bg-card/60 px-4 py-3 hover:border-primary/20 transition-all">
                    <div className="col-span-3 flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-cyan/10 border border-cyan/20">
                        <Users className="h-4 w-4 text-cyan" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground truncate">{profile.name}</p>
                        <p className="text-[10px] text-muted-foreground">{profile.phone_number || "—"}</p>
                      </div>
                    </div>
                    <div className="col-span-2">
                      <Link href={`/packages/${profile.packageId}`}>
                        <span className="text-xs text-primary hover:underline cursor-pointer flex items-center gap-1">
                          <Package className="h-3 w-3" /> {profile.packageName}
                        </span>
                      </Link>
                    </div>
                    <div className="col-span-1 text-center">
                      <Badge className={
                        profile.status === "active" ? "bg-emerald/15 text-emerald border-emerald/30 text-[10px]" :
                        profile.status === "paused" ? "bg-amber-warn/15 text-amber-warn border-amber-warn/30 text-[10px]" :
                        profile.status === "frozen" ? "bg-cyan/15 text-cyan border-cyan/30 text-[10px]" :
                        "bg-coral/15 text-coral border-coral/30 text-[10px]"
                      }>{profile.status}</Badge>
                    </div>
                    <div className="col-span-1 text-center">
                      <span className="text-sm font-mono font-bold text-emerald">{profile.health_score || 0}</span>
                    </div>
                    <div className="col-span-1 text-center">
                      <span className={`text-sm font-mono font-bold ${(profile.risk_score || 0) > 50 ? "text-coral" : (profile.risk_score || 0) > 20 ? "text-amber-warn" : "text-emerald"}`}>
                        {profile.risk_score || 0}
                      </span>
                    </div>
                    <div className="col-span-1 text-center">
                      <span className="text-sm font-mono font-bold text-primary">{profile.weight_score || 0}</span>
                    </div>
                    <div className="col-span-2 px-2">
                      <div className="flex items-center gap-2">
                        <Progress value={dayPct} className="h-1.5 flex-1" />
                        <span className="text-[10px] font-mono text-muted-foreground w-10 text-right">{profile.messages_sent_today || 0}</span>
                      </div>
                    </div>
                    <div className="col-span-1 text-center">
                      <Link href={`/packages/${profile.packageId}`}>
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground hover:text-primary gap-1">
                          View <ArrowUpRight className="h-3 w-3" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <Card className="border-glow bg-card/80">
            <CardContent className="flex flex-col items-center py-16">
              <Users className="h-12 w-12 text-muted-foreground/20 mb-4" />
              <p className="text-sm text-muted-foreground">No profiles found</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Add profiles to your packages to see them here</p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
