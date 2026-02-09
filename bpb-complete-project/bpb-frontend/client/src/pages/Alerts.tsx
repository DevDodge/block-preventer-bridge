/**
 * Alerts Page - System alerts and notifications
 * Design: Command Center dark theme with teal accents
 */
import { useState } from "react";
import {
  Bell, AlertTriangle, CheckCircle2, Info, XCircle,
  Activity, Eye, Trash2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import DashboardLayout from "@/components/DashboardLayout";
import { alertsApi } from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import { toast } from "sonner";
import { motion } from "framer-motion";

const EMPTY_STATE = "https://private-us-east-1.manuscdn.com/sessionFile/FrAGzK0RSeaSLJYgAvdIsd/sandbox/ZCprEzMGxdlqKJJZHbcR1g-img-3_1770591773000_na1fn_YnBiLWVtcHR5LXN0YXRl.png?x-oss-process=image/resize,w_1920,h_1920/format,webp/quality,q_80&Expires=1798761600&Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9wcml2YXRlLXVzLWVhc3QtMS5tYW51c2Nkbi5jb20vc2Vzc2lvbkZpbGUvRnJBR3pLMFJTZWFTTEpZZ0F2ZElzZC9zYW5kYm94L1pDcHJFek1HeGRscUtKSlpIYmNSMWctaW1nLTNfMTc3MDU5MTc3MzAwMF9uYTFmbl9ZbkJpTFdWdGNIUjVMWE4wWVhSbC5wbmc~eC1vc3MtcHJvY2Vzcz1pbWFnZS9yZXNpemUsd18xOTIwLGhfMTkyMC9mb3JtYXQsd2VicC9xdWFsaXR5LHFfODAiLCJDb25kaXRpb24iOnsiRGF0ZUxlc3NUaGFuIjp7IkFXUzpFcG9jaFRpbWUiOjE3OTg3NjE2MDB9fX1dfQ__&Key-Pair-Id=K2HSFNDJXOU9YS&Signature=RDM2h9Cti4Js31a9BIYVLWFcQbXZtc57R-RlsY3GM9a558-eMMDKEdUk~-todBCkHr-3L7DO4rXVCRSxYcxyMttq-ohIt7ztei1WPX4B-i3ENdxi9ZzZ6GE3RaHw498xlbR6P306m6nnrA78ku~e3GoX03W7U0X10eRwDVpCAO76n4S~MB-cHx6ofqHyRKklGmuj37MAjV73CR-BIhZjd7MxYB2MP8KLB-NgiWj7g8A6gnwQ1ajpLzX7bHOBpqCE2bAUJa3R~Jo~0jBRV7AlWoAMpq0qIHL4Szq-dMrOr~nO9-hVJ6ndIS~CqclZ-GAxjXvsp~VyNgaSsgLAYFiyfA__";

export default function Alerts() {
  const [filter, setFilter] = useState("all");
  const { data: alerts, loading, refetch } = useApi(
    () => alertsApi.list(undefined, filter === "unread"),
    [filter]
  );

  const handleMarkRead = async (id: string) => {
    try {
      await alertsApi.markRead(id);
      toast.success("Alert marked as read");
      refetch();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const severityIcon = (severity: string) => {
    switch (severity) {
      case "critical": return <XCircle className="h-4 w-4 text-coral" />;
      case "warning": return <AlertTriangle className="h-4 w-4 text-amber-warn" />;
      case "info": return <Info className="h-4 w-4 text-cyan" />;
      default: return <Bell className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const severityColor = (severity: string) => {
    switch (severity) {
      case "critical": return "bg-coral/15 text-coral border-coral/30";
      case "warning": return "bg-amber-warn/15 text-amber-warn border-amber-warn/30";
      case "info": return "bg-cyan/15 text-cyan border-cyan/30";
      default: return "bg-secondary text-muted-foreground";
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold font-mono text-foreground flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              Alerts
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              System alerts, warnings, and block risk notifications
            </p>
          </div>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[140px] bg-secondary/30">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border">
              <SelectItem value="all">All Alerts</SelectItem>
              <SelectItem value="unread">Unread Only</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Alert list */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Activity className="h-6 w-6 text-primary animate-spin" />
          </div>
        ) : alerts && alerts.length > 0 ? (
          <div className="space-y-3">
            {alerts.map((alert: any, i: number) => (
              <motion.div key={alert.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}>
                <Card className={`border-glow-hover bg-card/80 transition-all ${!alert.read_at ? "border-l-2 border-l-primary" : ""}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="mt-0.5">{severityIcon(alert.severity)}</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-sm font-semibold text-foreground">{alert.title}</h3>
                          <Badge className={`text-[10px] ${severityColor(alert.severity)}`}>
                            {alert.severity}
                          </Badge>
                          {!alert.read_at && (
                            <Badge className="bg-primary/15 text-primary border-primary/30 text-[10px]">New</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{alert.message}</p>
                        <p className="text-[10px] text-muted-foreground/60 mt-2 font-mono">
                          {alert.created_at ? new Date(alert.created_at).toLocaleString() : "—"}
                        </p>
                      </div>
                      {!alert.read_at && (
                        <Button variant="ghost" size="sm" onClick={() => handleMarkRead(alert.id)} className="text-xs text-muted-foreground hover:text-primary gap-1">
                          <Eye className="h-3.5 w-3.5" /> Mark Read
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        ) : (
          <Card className="border-glow bg-card/80">
            <CardContent className="flex flex-col items-center py-16">
              <img src={EMPTY_STATE} alt="No alerts" className="h-24 w-24 opacity-30 mb-4" />
              <p className="text-sm text-muted-foreground">No alerts</p>
              <p className="text-xs text-muted-foreground/60 mt-1">All systems are running smoothly</p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
