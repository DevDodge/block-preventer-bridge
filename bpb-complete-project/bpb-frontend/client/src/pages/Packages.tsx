/**
 * Packages Page - CRUD for message distribution packages
 * Design: Command Center dark theme with teal accents
 */
import { useState, useCallback } from "react";
import { Link, useLocation } from "wouter";
import {
  Package, Plus, Trash2, Edit, Settings, Users, MessageSquare,
  Activity, ChevronRight, Search, MoreVertical, Zap, Copy, Check
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import DashboardLayout from "@/components/DashboardLayout";
import { packagesApi } from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function Packages() {
  const { data: packages, loading, refetch } = useApi(() => packagesApi.list());
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editPkg, setEditPkg] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [, navigate] = useLocation();

  const [form, setForm] = useState({
    name: "", description: "", distribution_mode: "smart",
    max_messages_per_hour: 20, max_messages_per_3hours: 45, max_messages_per_day: 120,
    max_concurrent_sends: 4, freeze_duration_hours: 4,
    rush_hour_threshold: 10, rush_hour_multiplier: 2.0,
    quiet_mode_threshold: 5, quiet_mode_multiplier: 0.5,
    auto_adjust_limits: true, auto_adjust_interval_minutes: 360, auto_pause_on_failures: true,
    retry_failed_messages: true, retry_attempts: 3,
  });

  const handleCreate = async () => {
    try {
      await packagesApi.create(form);
      toast.success("Package created successfully");
      setShowCreate(false);
      setForm({ ...form, name: "", description: "" });
      refetch();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleUpdate = async () => {
    if (!editPkg) return;
    try {
      await packagesApi.update(editPkg.id, form);
      toast.success("Package updated successfully");
      setShowEdit(false);
      refetch();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await packagesApi.delete(id);
      toast.success("Package deleted");
      refetch();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const openEdit = async (pkg: any) => {
    try {
      const full = await packagesApi.get(pkg.id);
      setEditPkg(full);
      setForm({
        name: full.name, description: full.description || "",
        distribution_mode: full.distribution_mode,
        max_messages_per_hour: full.max_messages_per_hour,
        max_messages_per_3hours: full.max_messages_per_3hours,
        max_messages_per_day: full.max_messages_per_day,
        max_concurrent_sends: full.max_concurrent_sends,
        freeze_duration_hours: full.freeze_duration_hours,
        rush_hour_threshold: full.rush_hour_threshold,
        rush_hour_multiplier: full.rush_hour_multiplier,
        quiet_mode_threshold: full.quiet_mode_threshold,
        quiet_mode_multiplier: full.quiet_mode_multiplier,
        auto_adjust_limits: full.auto_adjust_limits,
        auto_adjust_interval_minutes: full.auto_adjust_interval_minutes || 360,
        auto_pause_on_failures: full.auto_pause_on_failures,
        retry_failed_messages: full.retry_failed_messages,
        retry_attempts: full.retry_attempts,
      });
      setShowEdit(true);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const filtered = packages?.filter((p: any) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  ) || [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold font-mono text-foreground flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              Packages
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage your message distribution packages and their settings
            </p>
          </div>
          <Button onClick={() => { setForm({ ...form, name: "", description: "" }); setShowCreate(true); }} className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
            <Plus className="h-4 w-4" />
            New Package
          </Button>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search packages..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-secondary/30 border-border/50"
          />
        </div>

        {/* Package Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Activity className="h-6 w-6 text-primary animate-spin" />
          </div>
        ) : filtered.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((pkg: any, i: number) => (
              <motion.div
                key={pkg.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className="border-glow border-glow-hover bg-card/80 backdrop-blur-sm transition-all duration-200 group">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
                          <Package className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-foreground">{pkg.name}</h3>
                          <p className="text-[11px] text-muted-foreground">{pkg.description || "No description"}</p>
                          <div className="flex items-center gap-1 mt-1">
                            <span className="text-[9px] font-mono text-muted-foreground/70 truncate max-w-[150px]">
                              ID: {pkg.id.slice(0, 8)}...
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigator.clipboard.writeText(pkg.id);
                                toast.success("Package ID copied!");
                              }}
                              className="p-0.5 rounded hover:bg-primary/10 transition-colors"
                              title="Copy full ID"
                            >
                              <Copy className="h-3 w-3 text-muted-foreground hover:text-primary" />
                            </button>
                          </div>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-popover border-border">
                          <DropdownMenuItem onClick={() => openEdit(pkg)} className="gap-2 text-xs">
                            <Edit className="h-3.5 w-3.5" /> Edit Settings
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDelete(pkg.id)} className="gap-2 text-xs text-destructive">
                            <Trash2 className="h-3.5 w-3.5" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* Stats row */}
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <div className="text-center rounded-md bg-secondary/40 py-2">
                        <p className="text-lg font-bold font-mono text-foreground">{pkg.total_profiles || 0}</p>
                        <p className="text-[10px] text-muted-foreground uppercase">Profiles</p>
                      </div>
                      <div className="text-center rounded-md bg-secondary/40 py-2">
                        <p className="text-lg font-bold font-mono text-foreground">{pkg.messages_today || 0}</p>
                        <p className="text-[10px] text-muted-foreground uppercase">Today</p>
                      </div>
                      <div className="text-center rounded-md bg-secondary/40 py-2">
                        <p className="text-lg font-bold font-mono text-foreground">{pkg.queue_size || 0}</p>
                        <p className="text-[10px] text-muted-foreground uppercase">Queue</p>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">
                          {pkg.distribution_mode}
                        </Badge>
                        <Badge
                          className={pkg.status === "active"
                            ? "bg-emerald/15 text-emerald border-emerald/30 text-[10px]"
                            : "bg-secondary text-muted-foreground text-[10px]"
                          }
                        >
                          {pkg.status}
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/packages/${pkg.id}`)}
                        className="text-xs text-muted-foreground hover:text-primary gap-1"
                      >
                        Details <ChevronRight className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        ) : (
          <Card className="border-glow bg-card/80">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Package className="h-12 w-12 text-muted-foreground/20 mb-4" />
              <p className="text-sm text-muted-foreground mb-1">No packages found</p>
              <p className="text-xs text-muted-foreground/60 mb-4">Create your first package to start distributing messages</p>
              <Button onClick={() => setShowCreate(true)} className="gap-2">
                <Zap className="h-4 w-4" /> Create Package
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create Dialog */}
      <PackageFormDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        title="Create New Package"
        form={form}
        setForm={setForm}
        onSubmit={handleCreate}
        submitLabel="Create Package"
      />

      {/* Edit Dialog */}
      <PackageFormDialog
        open={showEdit}
        onOpenChange={setShowEdit}
        title="Edit Package Settings"
        form={form}
        setForm={setForm}
        onSubmit={handleUpdate}
        submitLabel="Save Changes"
      />
    </DashboardLayout>
  );
}

function PackageFormDialog({ open, onOpenChange, title, form, setForm, onSubmit, submitLabel }: any) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-mono flex items-center gap-2">
            <Package className="h-4 w-4 text-primary" />
            {title}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-xs">
            Configure your package distribution settings
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Basic Info */}
          <div className="space-y-3">
            <h4 className="text-xs font-mono text-primary uppercase tracking-wider">Basic Info</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Package Name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="E-Commerce Orders" className="bg-secondary/30" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Distribution Mode</Label>
                <Select value={form.distribution_mode} onValueChange={(v) => setForm({ ...form, distribution_mode: v })}>
                  <SelectTrigger className="bg-secondary/30"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="round_robin">Round Robin</SelectItem>
                    <SelectItem value="random">Random</SelectItem>
                    <SelectItem value="weighted">Weighted</SelectItem>
                    <SelectItem value="smart">Smart (Recommended)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Description</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional description..." className="bg-secondary/30" />
            </div>
          </div>

          {/* Rate Limits */}
          <div className="space-y-3">
            <h4 className="text-xs font-mono text-primary uppercase tracking-wider">Rate Limits</h4>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Per Hour</Label>
                <Input type="number" value={form.max_messages_per_hour} onChange={(e) => setForm({ ...form, max_messages_per_hour: +e.target.value })} className="bg-secondary/30 font-mono" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Per 3 Hours</Label>
                <Input type="number" value={form.max_messages_per_3hours} onChange={(e) => setForm({ ...form, max_messages_per_3hours: +e.target.value })} className="bg-secondary/30 font-mono" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Per Day</Label>
                <Input type="number" value={form.max_messages_per_day} onChange={(e) => setForm({ ...form, max_messages_per_day: +e.target.value })} className="bg-secondary/30 font-mono" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Concurrent Sends</Label>
                <Input type="number" value={form.max_concurrent_sends} onChange={(e) => setForm({ ...form, max_concurrent_sends: +e.target.value })} className="bg-secondary/30 font-mono" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Freeze Duration (hrs)</Label>
                <Input type="number" value={form.freeze_duration_hours} onChange={(e) => setForm({ ...form, freeze_duration_hours: +e.target.value })} className="bg-secondary/30 font-mono" />
              </div>
            </div>
          </div>

          {/* Queue Settings */}
          <div className="space-y-3">
            <h4 className="text-xs font-mono text-primary uppercase tracking-wider">Queue Behavior</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Rush Hour Threshold</Label>
                <Input type="number" value={form.rush_hour_threshold} onChange={(e) => setForm({ ...form, rush_hour_threshold: +e.target.value })} className="bg-secondary/30 font-mono" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Rush Multiplier</Label>
                <Input type="number" step="0.1" value={form.rush_hour_multiplier} onChange={(e) => setForm({ ...form, rush_hour_multiplier: +e.target.value })} className="bg-secondary/30 font-mono" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Quiet Mode Threshold</Label>
                <Input type="number" value={form.quiet_mode_threshold} onChange={(e) => setForm({ ...form, quiet_mode_threshold: +e.target.value })} className="bg-secondary/30 font-mono" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Quiet Multiplier</Label>
                <Input type="number" step="0.1" value={form.quiet_mode_multiplier} onChange={(e) => setForm({ ...form, quiet_mode_multiplier: +e.target.value })} className="bg-secondary/30 font-mono" />
              </div>
            </div>
          </div>

          {/* Automation */}
          <div className="space-y-3">
            <h4 className="text-xs font-mono text-primary uppercase tracking-wider">Automation</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-md bg-secondary/30 p-3">
                <div>
                  <p className="text-sm text-foreground">Auto-Adjust Limits</p>
                  <p className="text-[11px] text-muted-foreground">Dynamically adjust based on performance</p>
                </div>
                <Switch checked={form.auto_adjust_limits} onCheckedChange={(v) => setForm({ ...form, auto_adjust_limits: v })} />
              </div>
              {form.auto_adjust_limits && (
                <div className="space-y-1.5 pl-4">
                  <Label className="text-xs">Adjust Interval (minutes)</Label>
                  <p className="text-[10px] text-muted-foreground">How often auto-adjust can modify limits</p>
                  <Input type="number" value={form.auto_adjust_interval_minutes} onChange={(e) => setForm({ ...form, auto_adjust_interval_minutes: +e.target.value })} className="bg-secondary/30 font-mono max-w-[160px]" min={30} />
                </div>
              )}
              <div className="flex items-center justify-between rounded-md bg-secondary/30 p-3">
                <div>
                  <p className="text-sm text-foreground">Auto-Pause on Failures</p>
                  <p className="text-[11px] text-muted-foreground">Pause profiles when failure threshold is hit</p>
                </div>
                <Switch checked={form.auto_pause_on_failures} onCheckedChange={(v) => setForm({ ...form, auto_pause_on_failures: v })} />
              </div>
              <div className="flex items-center justify-between rounded-md bg-secondary/30 p-3">
                <div>
                  <p className="text-sm text-foreground">Retry Failed Messages</p>
                  <p className="text-[11px] text-muted-foreground">Automatically retry with exponential backoff</p>
                </div>
                <Switch checked={form.retry_failed_messages} onCheckedChange={(v) => setForm({ ...form, retry_failed_messages: v })} />
              </div>
              {form.retry_failed_messages && (
                <div className="space-y-1.5 pl-4">
                  <Label className="text-xs">Max Retry Attempts</Label>
                  <Input type="number" value={form.retry_attempts} onChange={(e) => setForm({ ...form, retry_attempts: +e.target.value })} className="bg-secondary/30 font-mono max-w-[120px]" />
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="border-border">Cancel</Button>
          <Button onClick={onSubmit} className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2">
            <Zap className="h-3.5 w-3.5" />
            {submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
