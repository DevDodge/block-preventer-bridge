/**
 * Settings Page - System configuration, Zentra API settings, and preferences
 * Design: Command Center dark theme with teal accents
 * Now loads/saves from backend API instead of localStorage
 */
import { useState, useEffect } from "react";
import {
  Settings as SettingsIcon, Globe, Shield, Bell, Database,
  Save, RefreshCw, Activity, Zap, Server, Loader2
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
  const { data: health, refetch: refetchHealth } = useApi(() => systemApi.health());
  const { data: settings, loading: settingsLoading, refetch: refetchSettings } = useApi(() => systemApi.getSettings());

  const [saving, setSaving] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);

  // Local form state — populated from backend
  const [formData, setFormData] = useState({
    // System / Cooldown
    global_cooldown_min: 300,
    global_cooldown_max: 900,
    max_daily_messages_global: 500,
    // Auto-pause
    auto_pause_enabled: true,
    auto_pause_failure_threshold: 5,
    auto_pause_success_rate_threshold: 70.0,
    // Block detection
    block_detection_enabled: true,
    risk_alert_threshold: 60,
    auto_adjust_limits_global: true,
    // Active hours
    active_hours_start: "04:00",
    active_hours_end: "00:00",
    // Notifications
    webhook_url: "",
    webhook_enabled: false,
    notification_email: "",
    email_notifications_enabled: false,
    // UI
    theme: "dark",
    timezone: "UTC",
    message_content_display: "hover",
  });

  // Sync backend settings into form when loaded
  useEffect(() => {
    if (settings) {
      setFormData((prev) => ({
        ...prev,
        ...Object.fromEntries(
          Object.entries(settings).filter(([k]) => k !== "id" && k !== "updated_at")
        ),
      }));
    }
  }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await systemApi.updateSettings(formData);
      toast.success("Settings saved successfully");
      refetchSettings();
    } catch (err: any) {
      toast.error(err.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    try {
      const result = await systemApi.health();
      if (result?.status === "healthy") {
        toast.success("Connection successful — API is healthy");
      } else {
        toast.warning("API responded but status is: " + (result?.status || "unknown"));
      }
      refetchHealth();
    } catch (err: any) {
      toast.error("Connection failed: " + (err.message || "Unknown error"));
    } finally {
      setTestingConnection(false);
    }
  };

  const updateField = (key: string, value: any) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  if (settingsLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 text-primary animate-spin" />
          <span className="ml-2 text-sm text-muted-foreground">Loading settings...</span>
        </div>
      </DashboardLayout>
    );
  }

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

        <Tabs defaultValue="system" className="space-y-4">
          <TabsList className="bg-secondary/30 border border-border/50">
            <TabsTrigger value="system" className="data-[state=active]:bg-primary/15 data-[state=active]:text-primary gap-1.5 text-xs">
              <Server className="h-3.5 w-3.5" /> System
            </TabsTrigger>
            <TabsTrigger value="notifications" className="data-[state=active]:bg-primary/15 data-[state=active]:text-primary gap-1.5 text-xs">
              <Bell className="h-3.5 w-3.5" /> Notifications
            </TabsTrigger>
            <TabsTrigger value="zentra" className="data-[state=active]:bg-primary/15 data-[state=active]:text-primary gap-1.5 text-xs">
              <Globe className="h-3.5 w-3.5" /> Connection
            </TabsTrigger>
          </TabsList>

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
                      <Label className="text-xs">Min Cooldown (seconds)</Label>
                      <Input
                        type="number"
                        value={formData.global_cooldown_min}
                        onChange={(e) => updateField("global_cooldown_min", +e.target.value)}
                        className="bg-secondary/30 font-mono"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Max Cooldown (seconds)</Label>
                      <Input
                        type="number"
                        value={formData.global_cooldown_max}
                        onChange={(e) => updateField("global_cooldown_max", +e.target.value)}
                        className="bg-secondary/30 font-mono"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Max Daily Messages (Global)</Label>
                      <Input
                        type="number"
                        value={formData.max_daily_messages_global}
                        onChange={(e) => updateField("max_daily_messages_global", +e.target.value)}
                        className="bg-secondary/30 font-mono"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Risk Alert Threshold</Label>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={formData.risk_alert_threshold}
                        onChange={(e) => updateField("risk_alert_threshold", +e.target.value)}
                        className="bg-secondary/30 font-mono"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Active Hours Start</Label>
                      <Input
                        value={formData.active_hours_start}
                        onChange={(e) => updateField("active_hours_start", e.target.value)}
                        placeholder="04:00"
                        className="bg-secondary/30 font-mono text-xs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Active Hours End</Label>
                      <Input
                        value={formData.active_hours_end}
                        onChange={(e) => updateField("active_hours_end", e.target.value)}
                        placeholder="00:00"
                        className="bg-secondary/30 font-mono text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-3 mt-2">
                    <div className="flex items-center justify-between rounded-md bg-secondary/30 p-3">
                      <div>
                        <p className="text-sm text-foreground">Auto-Pause on Failures</p>
                        <p className="text-[11px] text-muted-foreground">Automatically pause profiles with high failure rates</p>
                      </div>
                      <Switch checked={formData.auto_pause_enabled} onCheckedChange={(v) => updateField("auto_pause_enabled", v)} />
                    </div>
                    <div className="flex items-center justify-between rounded-md bg-secondary/30 p-3">
                      <div>
                        <p className="text-sm text-foreground">Block Detection</p>
                        <p className="text-[11px] text-muted-foreground">Enable automatic block detection and risk analysis</p>
                      </div>
                      <Switch checked={formData.block_detection_enabled} onCheckedChange={(v) => updateField("block_detection_enabled", v)} />
                    </div>
                    <div className="flex items-center justify-between rounded-md bg-secondary/30 p-3">
                      <div>
                        <p className="text-sm text-foreground">Auto-Adjust Limits</p>
                        <p className="text-[11px] text-muted-foreground">Dynamically adjust rate limits based on performance</p>
                      </div>
                      <Switch checked={formData.auto_adjust_limits_global} onCheckedChange={(v) => updateField("auto_adjust_limits_global", v)} />
                    </div>
                  </div>

                  {formData.auto_pause_enabled && (
                    <div className="grid grid-cols-2 gap-4 mt-2">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Failure Threshold (count)</Label>
                        <Input
                          type="number"
                          value={formData.auto_pause_failure_threshold}
                          onChange={(e) => updateField("auto_pause_failure_threshold", +e.target.value)}
                          className="bg-secondary/30 font-mono"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Success Rate Threshold (%)</Label>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={formData.auto_pause_success_rate_threshold}
                          onChange={(e) => updateField("auto_pause_success_rate_threshold", +e.target.value)}
                          className="bg-secondary/30 font-mono"
                        />
                      </div>
                    </div>
                  )}

                  {/* Message Content Display */}
                  <div className="space-y-3 mt-4">
                    <h4 className="text-xs font-mono text-primary uppercase tracking-wider">Queue UI</h4>
                    <div className="flex items-center justify-between rounded-md bg-secondary/30 p-3">
                      <div>
                        <p className="text-sm text-foreground">Message Content Display</p>
                        <p className="text-[11px] text-muted-foreground">How to show message content in the queue view</p>
                      </div>
                      <Select value={formData.message_content_display} onValueChange={(v) => updateField("message_content_display", v)}>
                        <SelectTrigger className="w-[120px] bg-secondary/30 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-popover border-border">
                          <SelectItem value="hover">On Hover</SelectItem>
                          <SelectItem value="click">On Click</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* System info */}
                  <div className="space-y-2 mt-4">
                    <h4 className="text-xs font-mono text-primary uppercase tracking-wider">System Info</h4>
                    {[
                      { label: "API Version", value: health?.version || "1.0.0" },
                      { label: "Status", value: health?.status || "checking" },
                      { label: "Background Processor", value: health?.background_processor || "unknown" },
                      { label: "Database", value: "PostgreSQL" },
                      { label: "Backend", value: "FastAPI + Uvicorn" },
                      { label: "Integration", value: "Zentra WhatsApp API" },
                      { label: "Timezone", value: formData.timezone },
                    ].map((item) => (
                      <div key={item.label} className="flex justify-between text-xs rounded-md bg-secondary/20 px-3 py-2">
                        <span className="text-muted-foreground">{item.label}</span>
                        <span className="font-mono text-foreground">{item.value}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={handleSave} disabled={saving} className="gap-2 bg-primary text-primary-foreground">
                      {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                      Save Settings
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
                        <p className="text-sm text-foreground">Email Notifications</p>
                        <p className="text-[11px] text-muted-foreground">Receive alerts via email</p>
                      </div>
                      <Switch checked={formData.email_notifications_enabled} onCheckedChange={(v) => updateField("email_notifications_enabled", v)} />
                    </div>
                    <div className="flex items-center justify-between rounded-md bg-secondary/30 p-3">
                      <div>
                        <p className="text-sm text-foreground">Webhook Notifications</p>
                        <p className="text-[11px] text-muted-foreground">Send alerts to a webhook URL</p>
                      </div>
                      <Switch checked={formData.webhook_enabled} onCheckedChange={(v) => updateField("webhook_enabled", v)} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Notification Email</Label>
                      <Input
                        type="email"
                        value={formData.notification_email}
                        onChange={(e) => updateField("notification_email", e.target.value)}
                        placeholder="admin@example.com"
                        className="bg-secondary/30 font-mono text-xs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Webhook URL</Label>
                      <Input
                        value={formData.webhook_url}
                        onChange={(e) => updateField("webhook_url", e.target.value)}
                        placeholder="https://hooks.example.com/..."
                        className="bg-secondary/30 font-mono text-xs"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={handleSave} disabled={saving} className="gap-2 bg-primary text-primary-foreground">
                      {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                      Save Settings
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Connection Tab */}
          <TabsContent value="zentra">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="border-glow bg-card/80">
                <CardHeader>
                  <CardTitle className="text-base font-mono flex items-center gap-2">
                    <Globe className="h-4 w-4 text-primary" />
                    Connection & Health
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Connection test */}
                  <div className="flex items-center justify-between rounded-md bg-secondary/30 p-4 border border-border/50">
                    <div className="flex items-center gap-3">
                      <Activity className={`h-4 w-4 ${health?.status === "healthy" ? "text-emerald status-pulse" : "text-amber-warn"}`} />
                      <div>
                        <p className="text-sm text-foreground">API Connection Status</p>
                        <p className="text-[11px] text-muted-foreground">
                          API: {health?.status === "healthy" ? "Connected" : "Disconnected"} · 
                          Version: {health?.version || "—"} · 
                          Processor: {health?.background_processor || "—"}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleTestConnection}
                      disabled={testingConnection}
                      className="gap-1 border-border text-xs"
                    >
                      {testingConnection ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                      Test Connection
                    </Button>
                  </div>

                  <div className="text-xs text-muted-foreground/60 mt-2">
                    <p>Zentra API credentials are configured per-profile (each profile has its own zentra_uuid and zentra_api_token). 
                    Go to a package's profile settings to configure individual API credentials.</p>
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
