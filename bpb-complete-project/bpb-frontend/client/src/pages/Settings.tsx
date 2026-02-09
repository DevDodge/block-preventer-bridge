/**
 * Settings Page - System configuration, Zentra API settings, and preferences
 * Design: Command Center dark theme with teal accents
 */
import { useState } from "react";
import {
  Settings as SettingsIcon, Globe, Shield, Bell, Database,
  Save, RefreshCw, Activity, Zap, Server
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DashboardLayout from "@/components/DashboardLayout";
import { systemApi } from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function Settings() {
  const { data: health } = useApi(() => systemApi.health());

  const [zentraConfig, setZentraConfig] = useState({
    base_url: "https://api.zentra.io",
    default_token: "",
    timeout_seconds: 30,
    max_retries: 3,
  });

  const [notifConfig, setNotifConfig] = useState({
    email_alerts: true,
    webhook_url: "",
    alert_on_block_risk: true,
    alert_on_profile_frozen: true,
    alert_on_daily_limit: true,
    alert_threshold_risk: 70,
  });

  const [systemConfig, setSystemConfig] = useState({
    default_cooldown_base: 30,
    default_cooldown_max: 300,
    health_check_interval: 60,
    log_retention_days: 30,
    auto_cleanup: true,
  });

  const handleSaveZentra = () => {
    localStorage.setItem("bpb_zentra_config", JSON.stringify(zentraConfig));
    toast.success("Zentra configuration saved");
  };

  const handleSaveNotif = () => {
    localStorage.setItem("bpb_notif_config", JSON.stringify(notifConfig));
    toast.success("Notification settings saved");
  };

  const handleSaveSystem = () => {
    localStorage.setItem("bpb_system_config", JSON.stringify(systemConfig));
    toast.success("System settings saved");
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl font-bold font-mono text-foreground flex items-center gap-2">
            <SettingsIcon className="h-5 w-5 text-primary" />
            Settings
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure system behavior, Zentra integration, and notifications
          </p>
        </div>

        <Tabs defaultValue="zentra" className="space-y-4">
          <TabsList className="bg-secondary/30 border border-border/50">
            <TabsTrigger value="zentra" className="data-[state=active]:bg-primary/15 data-[state=active]:text-primary gap-1.5 text-xs">
              <Globe className="h-3.5 w-3.5" /> Zentra API
            </TabsTrigger>
            <TabsTrigger value="notifications" className="data-[state=active]:bg-primary/15 data-[state=active]:text-primary gap-1.5 text-xs">
              <Bell className="h-3.5 w-3.5" /> Notifications
            </TabsTrigger>
            <TabsTrigger value="system" className="data-[state=active]:bg-primary/15 data-[state=active]:text-primary gap-1.5 text-xs">
              <Server className="h-3.5 w-3.5" /> System
            </TabsTrigger>
          </TabsList>

          {/* Zentra API Tab */}
          <TabsContent value="zentra">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="border-glow bg-card/80">
                <CardHeader>
                  <CardTitle className="text-base font-mono flex items-center gap-2">
                    <Globe className="h-4 w-4 text-primary" />
                    Zentra API Configuration
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Base URL</Label>
                      <Input
                        value={zentraConfig.base_url}
                        onChange={(e) => setZentraConfig({ ...zentraConfig, base_url: e.target.value })}
                        className="bg-secondary/30 font-mono text-xs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Default API Token</Label>
                      <Input
                        type="password"
                        value={zentraConfig.default_token}
                        onChange={(e) => setZentraConfig({ ...zentraConfig, default_token: e.target.value })}
                        placeholder="Bearer token..."
                        className="bg-secondary/30 font-mono text-xs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Timeout (seconds)</Label>
                      <Input
                        type="number"
                        value={zentraConfig.timeout_seconds}
                        onChange={(e) => setZentraConfig({ ...zentraConfig, timeout_seconds: +e.target.value })}
                        className="bg-secondary/30 font-mono"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Max Retries</Label>
                      <Input
                        type="number"
                        value={zentraConfig.max_retries}
                        onChange={(e) => setZentraConfig({ ...zentraConfig, max_retries: +e.target.value })}
                        className="bg-secondary/30 font-mono"
                      />
                    </div>
                  </div>

                  {/* Connection test */}
                  <div className="flex items-center justify-between rounded-md bg-secondary/30 p-4 border border-border/50">
                    <div className="flex items-center gap-3">
                      <Activity className="h-4 w-4 text-emerald status-pulse" />
                      <div>
                        <p className="text-sm text-foreground">Connection Status</p>
                        <p className="text-[11px] text-muted-foreground">
                          API: {health?.status === "healthy" ? "Connected" : "Checking..."} · DB: Connected
                        </p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="gap-1 border-border text-xs">
                      <RefreshCw className="h-3 w-3" /> Test
                    </Button>
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={handleSaveZentra} className="gap-2 bg-primary text-primary-foreground">
                      <Save className="h-3.5 w-3.5" /> Save Configuration
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="border-glow bg-card/80">
                <CardHeader>
                  <CardTitle className="text-base font-mono flex items-center gap-2">
                    <Bell className="h-4 w-4 text-primary" />
                    Alert & Notification Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between rounded-md bg-secondary/30 p-3">
                      <div>
                        <p className="text-sm text-foreground">Email Alerts</p>
                        <p className="text-[11px] text-muted-foreground">Receive alerts via email</p>
                      </div>
                      <Switch checked={notifConfig.email_alerts} onCheckedChange={(v) => setNotifConfig({ ...notifConfig, email_alerts: v })} />
                    </div>
                    <div className="flex items-center justify-between rounded-md bg-secondary/30 p-3">
                      <div>
                        <p className="text-sm text-foreground">Block Risk Alerts</p>
                        <p className="text-[11px] text-muted-foreground">Alert when profile risk exceeds threshold</p>
                      </div>
                      <Switch checked={notifConfig.alert_on_block_risk} onCheckedChange={(v) => setNotifConfig({ ...notifConfig, alert_on_block_risk: v })} />
                    </div>
                    <div className="flex items-center justify-between rounded-md bg-secondary/30 p-3">
                      <div>
                        <p className="text-sm text-foreground">Profile Frozen Alerts</p>
                        <p className="text-[11px] text-muted-foreground">Alert when a profile gets frozen</p>
                      </div>
                      <Switch checked={notifConfig.alert_on_profile_frozen} onCheckedChange={(v) => setNotifConfig({ ...notifConfig, alert_on_profile_frozen: v })} />
                    </div>
                    <div className="flex items-center justify-between rounded-md bg-secondary/30 p-3">
                      <div>
                        <p className="text-sm text-foreground">Daily Limit Alerts</p>
                        <p className="text-[11px] text-muted-foreground">Alert when daily limit is approaching</p>
                      </div>
                      <Switch checked={notifConfig.alert_on_daily_limit} onCheckedChange={(v) => setNotifConfig({ ...notifConfig, alert_on_daily_limit: v })} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Webhook URL</Label>
                      <Input
                        value={notifConfig.webhook_url}
                        onChange={(e) => setNotifConfig({ ...notifConfig, webhook_url: e.target.value })}
                        placeholder="https://hooks.example.com/..."
                        className="bg-secondary/30 font-mono text-xs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Risk Alert Threshold</Label>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={notifConfig.alert_threshold_risk}
                        onChange={(e) => setNotifConfig({ ...notifConfig, alert_threshold_risk: +e.target.value })}
                        className="bg-secondary/30 font-mono"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={handleSaveNotif} className="gap-2 bg-primary text-primary-foreground">
                      <Save className="h-3.5 w-3.5" /> Save Settings
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* System Tab */}
          <TabsContent value="system">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="border-glow bg-card/80">
                <CardHeader>
                  <CardTitle className="text-base font-mono flex items-center gap-2">
                    <Server className="h-4 w-4 text-primary" />
                    System Configuration
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Base Cooldown (seconds)</Label>
                      <Input
                        type="number"
                        value={systemConfig.default_cooldown_base}
                        onChange={(e) => setSystemConfig({ ...systemConfig, default_cooldown_base: +e.target.value })}
                        className="bg-secondary/30 font-mono"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Max Cooldown (seconds)</Label>
                      <Input
                        type="number"
                        value={systemConfig.default_cooldown_max}
                        onChange={(e) => setSystemConfig({ ...systemConfig, default_cooldown_max: +e.target.value })}
                        className="bg-secondary/30 font-mono"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Health Check Interval (sec)</Label>
                      <Input
                        type="number"
                        value={systemConfig.health_check_interval}
                        onChange={(e) => setSystemConfig({ ...systemConfig, health_check_interval: +e.target.value })}
                        className="bg-secondary/30 font-mono"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Log Retention (days)</Label>
                      <Input
                        type="number"
                        value={systemConfig.log_retention_days}
                        onChange={(e) => setSystemConfig({ ...systemConfig, log_retention_days: +e.target.value })}
                        className="bg-secondary/30 font-mono"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between rounded-md bg-secondary/30 p-3">
                    <div>
                      <p className="text-sm text-foreground">Auto Cleanup</p>
                      <p className="text-[11px] text-muted-foreground">Automatically clean old logs and delivery records</p>
                    </div>
                    <Switch checked={systemConfig.auto_cleanup} onCheckedChange={(v) => setSystemConfig({ ...systemConfig, auto_cleanup: v })} />
                  </div>

                  {/* System info */}
                  <div className="space-y-2 mt-4">
                    <h4 className="text-xs font-mono text-primary uppercase tracking-wider">System Info</h4>
                    {[
                      { label: "API Version", value: health?.version || "1.0.0" },
                      { label: "Status", value: health?.status || "checking" },
                      { label: "Database", value: "PostgreSQL" },
                      { label: "Backend", value: "FastAPI + Uvicorn" },
                      { label: "Integration", value: "Zentra WhatsApp API" },
                    ].map((item) => (
                      <div key={item.label} className="flex justify-between text-xs rounded-md bg-secondary/20 px-3 py-2">
                        <span className="text-muted-foreground">{item.label}</span>
                        <span className="font-mono text-foreground">{item.value}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={handleSaveSystem} className="gap-2 bg-primary text-primary-foreground">
                      <Save className="h-3.5 w-3.5" /> Save Settings
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
