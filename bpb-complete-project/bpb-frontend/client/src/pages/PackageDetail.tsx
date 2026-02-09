/**
 * PackageDetail - Deep view of a single package with profiles, stats, and sending
 */
import { useState } from "react";
import { useParams, Link } from "wouter";
import {
  Package, Users, Plus, ArrowLeft, Activity, Shield, Zap,
  MessageSquare, Trash2, Play, Pause, Eye, Heart, AlertTriangle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DashboardLayout from "@/components/DashboardLayout";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { packagesApi, profilesApi } from "@/lib/api";
import { useApi, usePolling } from "@/hooks/useApi";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function PackageDetail() {
  const params = useParams<{ id: string }>();
  const packageId = params.id || "";
  const { data: pkg, loading, refetch } = usePolling(() => packagesApi.get(packageId), 10000, [packageId]);
  const { data: stats, refetch: refetchStats } = usePolling(() => packagesApi.stats(packageId), 10000, [packageId]);
  const [showAddProfile, setShowAddProfile] = useState(false);
  const [showHealth, setShowHealth] = useState(false);
  const [healthData, setHealthData] = useState<any>(null);

  const [profileForm, setProfileForm] = useState({
    name: "", phone_number: "", zentra_uuid: "", zentra_api_token: "",
    manual_priority: 5, account_age_months: 0,
  });

  const handleAddProfile = async () => {
    try {
      await profilesApi.create(packageId, profileForm);
      toast.success("Profile added successfully");
      setShowAddProfile(false);
      setProfileForm({ name: "", phone_number: "", zentra_uuid: "", zentra_api_token: "", manual_priority: 5, account_age_months: 0 });
      refetch();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleToggleStatus = async (profileId: string, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "paused" : "active";
    try {
      await profilesApi.toggleStatus(packageId, profileId, newStatus);
      toast.success(`Profile ${newStatus}`);
      refetch();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDeleteProfile = async (profileId: string) => {
    try {
      await profilesApi.delete(packageId, profileId);
      toast.success("Profile removed");
      refetch();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const viewHealth = async (profileId: string) => {
    try {
      const data = await profilesApi.health(packageId, profileId);
      setHealthData(data);
      setShowHealth(true);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-20">
          <Activity className="h-6 w-6 text-primary animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  if (!pkg) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-muted-foreground">Package not found</p>
          <Link href="/packages"><Button variant="outline" className="mt-4 gap-2"><ArrowLeft className="h-4 w-4" /> Back</Button></Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/packages">
              <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground hover:text-primary">
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold font-mono text-foreground flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                {pkg.name}
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">{pkg.description || "No description"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={pkg.status === "active" ? "bg-emerald/15 text-emerald border-emerald/30" : ""}>{pkg.status}</Badge>
            <Badge variant="outline" className="border-primary/30 text-primary font-mono text-xs">{pkg.distribution_mode}</Badge>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Profiles", value: pkg.total_profiles, sub: `${pkg.active_profiles} active`, color: "text-cyan" },
            { label: "Today", value: stats?.total_messages_today || 0, sub: `${stats?.total_messages_hour || 0}/hr`, color: "text-primary" },
            { label: "Queue", value: pkg.queue_size, sub: pkg.queue_mode, color: "text-amber-warn" },
            { label: "Failed", value: stats?.total_failed || 0, sub: "today", color: "text-coral" },
          ].map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="border-glow bg-card/80">
                <CardContent className="p-4 text-center">
                  <p className={`text-2xl font-bold font-mono ${s.color}`}>{s.value}</p>
                  <p className="text-[10px] text-muted-foreground uppercase mt-1">{s.label}</p>
                  <p className="text-[10px] text-muted-foreground/60">{s.sub}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <Tabs defaultValue="profiles" className="space-y-4">
          <TabsList className="bg-secondary/30 border border-border/50">
            <TabsTrigger value="profiles" className="data-[state=active]:bg-primary/15 data-[state=active]:text-primary gap-1.5 text-xs">
              <Users className="h-3.5 w-3.5" /> Profiles ({pkg.profiles?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="limits" className="data-[state=active]:bg-primary/15 data-[state=active]:text-primary gap-1.5 text-xs">
              <Shield className="h-3.5 w-3.5" /> Limits & Settings
            </TabsTrigger>
          </TabsList>

          {/* Profiles Tab */}
          <TabsContent value="profiles" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => setShowAddProfile(true)} size="sm" className="gap-2 bg-primary text-primary-foreground">
                <Plus className="h-3.5 w-3.5" /> Add Profile
              </Button>
            </div>

            {pkg.profiles && pkg.profiles.length > 0 ? (
              <div className="space-y-3">
                {pkg.profiles.map((profile: any, i: number) => (
                  <motion.div key={profile.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}>
                    <Card className="border-glow-hover bg-card/80">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan/10 border border-cyan/20">
                              <Users className="h-5 w-5 text-cyan" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-semibold text-foreground">{profile.name}</p>
                                <Badge className={
                                  profile.status === "active" ? "bg-emerald/15 text-emerald border-emerald/30 text-[10px]" :
                                  profile.status === "paused" ? "bg-amber-warn/15 text-amber-warn border-amber-warn/30 text-[10px]" :
                                  "bg-secondary text-muted-foreground text-[10px]"
                                }>{profile.status}</Badge>
                              </div>
                              <p className="text-xs text-muted-foreground">{profile.phone_number || "No phone"} · Priority: {profile.manual_priority}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-6">
                            {/* Stats */}
                            <div className="hidden sm:grid grid-cols-4 gap-4 text-center">
                              <div>
                                <p className="text-sm font-mono font-bold text-foreground">{profile.weight_score}</p>
                                <p className="text-[9px] text-muted-foreground uppercase">Weight</p>
                              </div>
                              <div>
                                <p className="text-sm font-mono font-bold text-foreground">{profile.health_score}</p>
                                <p className="text-[9px] text-muted-foreground uppercase">Health</p>
                              </div>
                              <div>
                                <p className={`text-sm font-mono font-bold ${profile.risk_score > 50 ? "text-coral" : profile.risk_score > 20 ? "text-amber-warn" : "text-emerald"}`}>
                                  {profile.risk_score}
                                </p>
                                <p className="text-[9px] text-muted-foreground uppercase">Risk</p>
                              </div>
                              <div>
                                <p className="text-sm font-mono font-bold text-foreground">{profile.messages_sent_today}</p>
                                <p className="text-[9px] text-muted-foreground uppercase">Today</p>
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => viewHealth(profile.id)} title="View Health">
                                <Heart className="h-3.5 w-3.5 text-muted-foreground hover:text-primary" />
                              </Button>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleToggleStatus(profile.id, profile.status)} title={profile.status === "active" ? "Pause" : "Resume"}>
                                {profile.status === "active" ? <Pause className="h-3.5 w-3.5 text-muted-foreground hover:text-amber-warn" /> : <Play className="h-3.5 w-3.5 text-muted-foreground hover:text-emerald" />}
                              </Button>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleDeleteProfile(profile.id)} title="Remove">
                                <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                              </Button>
                            </div>
                          </div>
                        </div>

                        {/* Usage bars */}
                        <div className="grid grid-cols-3 gap-3 mt-4">
                          {[
                            { label: "Hourly", used: profile.messages_sent_hour, max: pkg.max_messages_per_hour },
                            { label: "3-Hour", used: profile.messages_sent_3hours, max: pkg.max_messages_per_3hours },
                            { label: "Daily", used: profile.messages_sent_today, max: pkg.max_messages_per_day },
                          ].map((bar) => {
                            const pct = Math.min(100, (bar.used / Math.max(bar.max, 1)) * 100);
                            return (
                              <div key={bar.label} className="space-y-1">
                                <div className="flex justify-between text-[10px]">
                                  <span className="text-muted-foreground">{bar.label}</span>
                                  <span className="font-mono text-muted-foreground">{bar.used}/{bar.max}</span>
                                </div>
                                <Progress value={pct} className="h-1.5" />
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            ) : (
              <Card className="border-glow bg-card/80">
                <CardContent className="flex flex-col items-center py-12">
                  <Users className="h-10 w-10 text-muted-foreground/20 mb-3" />
                  <p className="text-sm text-muted-foreground">No profiles in this package</p>
                  <Button onClick={() => setShowAddProfile(true)} size="sm" className="mt-3 gap-2">
                    <Plus className="h-3.5 w-3.5" /> Add First Profile
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Limits Tab */}
          <TabsContent value="limits">
            <Card className="border-glow bg-card/80">
              <CardContent className="p-6">
                {/* Distribution Mode Selector */}
                <div className="mb-6 p-4 rounded-lg bg-secondary/20 border border-border/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-mono text-primary uppercase tracking-wider mb-1">Distribution Strategy</h4>
                      <p className="text-[11px] text-muted-foreground">
                        {pkg.distribution_mode === "round_robin" && "Evenly distributes messages across all active profiles in rotation."}
                        {pkg.distribution_mode === "random" && "Randomly assigns each message to an available profile."}
                        {pkg.distribution_mode === "weighted" && "Distributes proportionally based on each profile's weight score."}
                        {pkg.distribution_mode === "smart" && "AI-driven: considers health, risk, capacity, and success rate for optimal routing."}
                      </p>
                    </div>
                    <Select
                      value={pkg.distribution_mode}
                      onValueChange={async (mode) => {
                        try {
                          await packagesApi.update(packageId, { distribution_mode: mode });
                          toast.success(`Distribution mode changed to ${mode}`);
                          refetch();
                        } catch (err: any) {
                          toast.error(err.message);
                        }
                      }}
                    >
                      <SelectTrigger className="w-[160px] bg-secondary/30 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border">
                        <SelectItem value="round_robin">Round Robin</SelectItem>
                        <SelectItem value="random">Random</SelectItem>
                        <SelectItem value="weighted">Weighted</SelectItem>
                        <SelectItem value="smart">Smart (AI)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="text-xs font-mono text-primary uppercase tracking-wider">Rate Limits</h4>
                    {[
                      { label: "Messages per Hour", value: pkg.max_messages_per_hour },
                      { label: "Messages per 3 Hours", value: pkg.max_messages_per_3hours },
                      { label: "Messages per Day", value: pkg.max_messages_per_day },
                      { label: "Concurrent Sends", value: pkg.max_concurrent_sends },
                      { label: "Freeze Duration", value: `${pkg.freeze_duration_hours} hours` },
                    ].map((item) => (
                      <div key={item.label} className="flex justify-between items-center rounded-md bg-secondary/30 px-4 py-2.5">
                        <span className="text-xs text-muted-foreground">{item.label}</span>
                        <span className="text-sm font-mono font-bold text-foreground">{item.value}</span>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-4">
                    <h4 className="text-xs font-mono text-primary uppercase tracking-wider">Queue & Automation</h4>
                    {[
                      { label: "Rush Hour Threshold", value: pkg.rush_hour_threshold },
                      { label: "Rush Multiplier", value: `${pkg.rush_hour_multiplier}x` },
                      { label: "Quiet Threshold", value: pkg.quiet_mode_threshold },
                      { label: "Quiet Multiplier", value: `${pkg.quiet_mode_multiplier}x` },
                      { label: "Retry Attempts", value: pkg.retry_attempts },
                    ].map((item) => (
                      <div key={item.label} className="flex justify-between items-center rounded-md bg-secondary/30 px-4 py-2.5">
                        <span className="text-xs text-muted-foreground">{item.label}</span>
                        <span className="text-sm font-mono font-bold text-foreground">{item.value}</span>
                      </div>
                    ))}
                    <div className="space-y-2 mt-4">
                      {[
                        { label: "Auto-Adjust Limits", enabled: pkg.auto_adjust_limits },
                        { label: "Auto-Pause on Failures", enabled: pkg.auto_pause_on_failures },
                        { label: "Retry Failed Messages", enabled: pkg.retry_failed_messages },
                      ].map((item) => (
                        <div key={item.label} className="flex justify-between items-center rounded-md bg-secondary/30 px-4 py-2.5">
                          <span className="text-xs text-muted-foreground">{item.label}</span>
                          <Badge className={item.enabled ? "bg-emerald/15 text-emerald border-emerald/30 text-[10px]" : "bg-secondary text-muted-foreground text-[10px]"}>
                            {item.enabled ? "Enabled" : "Disabled"}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Add Profile Dialog */}
      <Dialog open={showAddProfile} onOpenChange={setShowAddProfile}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-mono flex items-center gap-2"><Users className="h-4 w-4 text-primary" /> Add Profile</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">Connect a WhatsApp profile via Zentra</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Profile Name</Label>
                <Input value={profileForm.name} onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })} placeholder="Sales WA #1" className="bg-secondary/30" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Phone Number</Label>
                <Input value={profileForm.phone_number} onChange={(e) => setProfileForm({ ...profileForm, phone_number: e.target.value })} placeholder="+201066..." className="bg-secondary/30" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Zentra Device UUID</Label>
              <Input value={profileForm.zentra_uuid} onChange={(e) => setProfileForm({ ...profileForm, zentra_uuid: e.target.value })} placeholder="device-uuid-xxx" className="bg-secondary/30 font-mono text-xs" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Zentra API Token</Label>
              <Input type="password" value={profileForm.zentra_api_token} onChange={(e) => setProfileForm({ ...profileForm, zentra_api_token: e.target.value })} placeholder="Bearer token..." className="bg-secondary/30 font-mono text-xs" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Priority (1-10)</Label>
                <Input type="number" min={1} max={10} value={profileForm.manual_priority} onChange={(e) => setProfileForm({ ...profileForm, manual_priority: +e.target.value })} className="bg-secondary/30 font-mono" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Account Age (months)</Label>
                <Input type="number" min={0} value={profileForm.account_age_months} onChange={(e) => setProfileForm({ ...profileForm, account_age_months: +e.target.value })} className="bg-secondary/30 font-mono" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddProfile(false)}>Cancel</Button>
            <Button onClick={handleAddProfile} className="bg-primary text-primary-foreground gap-2"><Plus className="h-3.5 w-3.5" /> Add Profile</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Health Dialog */}
      <Dialog open={showHealth} onOpenChange={setShowHealth}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-mono flex items-center gap-2"><Heart className="h-4 w-4 text-primary" /> Profile Health Report</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">{healthData?.profile_name}</DialogDescription>
          </DialogHeader>
          {healthData && (
            <div className="space-y-4 py-2 max-h-[70vh] overflow-y-auto">
              {/* Top scores */}
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="rounded-md bg-secondary/30 p-3">
                  <p className="text-xl font-bold font-mono text-emerald">{healthData.health_score}</p>
                  <p className="text-[10px] text-muted-foreground">Health</p>
                </div>
                <div className="rounded-md bg-secondary/30 p-3">
                  <p className={`text-xl font-bold font-mono ${healthData.risk_score > 50 ? "text-coral" : healthData.risk_score > 20 ? "text-amber-warn" : "text-emerald"}`}>{healthData.risk_score}</p>
                  <p className="text-[10px] text-muted-foreground">Risk</p>
                </div>
                <div className="rounded-md bg-secondary/30 p-3">
                  <p className="text-xl font-bold font-mono text-primary">{healthData.weight_score}</p>
                  <p className="text-[10px] text-muted-foreground">Weight</p>
                </div>
                <div className="rounded-md bg-secondary/30 p-3">
                  <Badge className={`text-[10px] ${healthData.risk_level === "high" ? "bg-coral/15 text-coral" : healthData.risk_level === "medium" ? "bg-amber-warn/15 text-amber-warn" : "bg-emerald/15 text-emerald"}`}>
                    {healthData.risk_level || "low"} risk
                  </Badge>
                  <p className="text-[10px] text-muted-foreground mt-1">Level</p>
                </div>
              </div>

              {/* Limits Usage */}
              {healthData.limits_usage && (
                <div className="space-y-2">
                  <h4 className="text-xs font-mono text-cyan uppercase">Limits Usage</h4>
                  {Object.entries(healthData.limits_usage).map(([key, val]: any) => (
                    <div key={key} className="space-y-1">
                      <div className="flex justify-between text-[10px]">
                        <span className="text-muted-foreground capitalize">{key.replace(/_/g, " ")}</span>
                        <span className="font-mono text-muted-foreground">{val.used}/{val.limit} ({val.pct}%)</span>
                      </div>
                      <Progress value={val.pct} className="h-1.5" />
                    </div>
                  ))}
                </div>
              )}

              {/* Statistics */}
              {healthData.statistics && (
                <div className="space-y-2">
                  <h4 className="text-xs font-mono text-primary uppercase">Statistics</h4>
                  <div className="grid grid-cols-2 gap-1.5">
                    {Object.entries(healthData.statistics).map(([key, val]: any) => (
                      <div key={key} className="flex justify-between text-xs rounded-md bg-secondary/20 px-3 py-1.5">
                        <span className="text-muted-foreground">{key.replace(/_/g, " ")}</span>
                        <span className="font-mono text-foreground">{typeof val === "number" ? (Number.isInteger(val) ? val : val.toFixed(1)) : val}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Weight Breakdown */}
              <div className="space-y-2">
                <h4 className="text-xs font-mono text-primary uppercase">Weight Breakdown</h4>
                {healthData.weight_breakdown && Object.entries(healthData.weight_breakdown).map(([key, val]: any) => (
                  <div key={key} className="flex justify-between text-xs rounded-md bg-secondary/20 px-3 py-1.5">
                    <span className="text-muted-foreground">{key.replace(/_/g, " ")}</span>
                    <span className="font-mono text-foreground">{typeof val === "number" ? val.toFixed(2) : val}</span>
                  </div>
                ))}
              </div>

              {/* Risk Breakdown */}
              {healthData.risk_breakdown?.patterns?.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-mono text-coral uppercase">Risk Patterns</h4>
                  {healthData.risk_breakdown.patterns.map((pattern: any, i: number) => (
                    <div key={i} className="rounded-md bg-coral/5 border border-coral/20 p-2.5">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-semibold text-foreground">{pattern.pattern || pattern.name}</span>
                        <Badge className="bg-coral/15 text-coral text-[10px]">{pattern.score || pattern.risk_score}</Badge>
                      </div>
                      {pattern.recommendation && <p className="text-[11px] text-muted-foreground">{pattern.recommendation}</p>}
                    </div>
                  ))}
                </div>
              )}

              {/* Block Indicators */}
              {healthData.block_indicators?.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-mono text-coral uppercase">Block Indicators</h4>
                  {healthData.block_indicators.map((indicator: any, i: number) => (
                    <div key={i} className="flex items-start gap-2 rounded-md bg-coral/5 border border-coral/20 p-2.5">
                      <AlertTriangle className="h-3.5 w-3.5 text-coral mt-0.5 shrink-0" />
                      <p className="text-xs text-foreground">{typeof indicator === "string" ? indicator : indicator.description || indicator.indicator}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Recommendations */}
              {healthData.recommendations?.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-mono text-amber-warn uppercase">Recommendations</h4>
                  {healthData.recommendations.map((rec: string, i: number) => (
                    <div key={i} className="flex items-start gap-2 rounded-md bg-amber-warn/5 border border-amber-warn/20 p-2.5">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-warn mt-0.5 shrink-0" />
                      <p className="text-xs text-foreground">{rec}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
