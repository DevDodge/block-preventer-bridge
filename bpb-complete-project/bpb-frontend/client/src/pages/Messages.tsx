/**
 * Messages Page - Send messages and monitor queue
 * Design: Command Center dark theme with teal accents
 * Enhanced: Queue items with countdown timers, message content preview, error display
 */
import { useState, useCallback, useEffect } from "react";
import {
  MessageSquare, Send, Activity, Clock, CheckCircle2,
  XCircle, AlertTriangle, Package, RefreshCw, Calendar, Timer, Zap, Trash2, Eye
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DashboardLayout from "@/components/DashboardLayout";
import { packagesApi, messagesApi, systemApi } from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function Messages() {
  const { data: packages } = useApi(() => packagesApi.list());
  const { data: settings } = useApi(() => systemApi.getSettings());
  const [selectedPkg, setSelectedPkg] = useState<string>("");
  const [showSend, setShowSend] = useState(false);
  const [sendMode, setSendMode] = useState<"open" | "reply" | "schedule">("open");
  const [statusFilter, setStatusFilter] = useState("all");

  // Message content display mode from settings
  const contentDisplayMode = settings?.message_content_display || "hover";

  const { data: queueStatus } = useApi(
    () => selectedPkg ? messagesApi.queueStatus(selectedPkg) : Promise.resolve(null),
    [selectedPkg]
  );

  // Queue items
  const [queueItems, setQueueItems] = useState<any[]>([]);
  const [queueLoading, setQueueLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [errorDialog, setErrorDialog] = useState<{ open: boolean; error: string; item: any }>({ open: false, error: "", item: null });
  const [contentDialog, setContentDialog] = useState<{ open: boolean; item: any }>({ open: false, item: null });

  // Fetch queue items
  const fetchQueueItems = async () => {
    if (!selectedPkg) return;
    setQueueLoading(true);
    try {
      const items = await messagesApi.queueItems(selectedPkg, statusFilter !== "all" ? statusFilter : undefined);
      setQueueItems(items);
    } catch (err) {
      console.error("Failed to fetch queue items", err);
    } finally {
      setQueueLoading(false);
    }
  };

  // Fetch queue items when package or filter changes
  useEffect(() => {
    if (selectedPkg) {
      fetchQueueItems();
    }
  }, [selectedPkg, statusFilter]);

  // Countdown timer - update every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(c => c + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Format seconds to mm:ss or hh:mm:ss
  const formatCountdown = (seconds: number) => {
    if (seconds <= 0) return "Now";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // Calculate live countdown from scheduled_send_at
  const getSecondsRemaining = (scheduledAt: string | null) => {
    if (!scheduledAt) return 0;
    const sendTime = new Date(scheduledAt).getTime();
    const now = Date.now();
    return Math.max(0, Math.floor((sendTime - now) / 1000));
  };

  const handlePackageChange = (pkgId: string) => {
    setSelectedPkg(pkgId);
    setQueueItems([]);
  };

  const handleFilterChange = (filter: string) => {
    setStatusFilter(filter);
    setQueueItems([]);
  };

  const [openForm, setOpenForm] = useState({
    recipients: "", content: "", message_type: "text",
  });
  const [replyForm, setReplyForm] = useState({
    recipient: "", content: "", message_type: "text", conversation_id: "",
  });
  const [scheduleForm, setScheduleForm] = useState({
    recipients: "", content: "", message_type: "text",
    scheduled_at: "", drip_mode: false, drip_interval_minutes: 30,
  });

  const handleSendOpen = async () => {
    if (!selectedPkg) { toast.error("Select a package first"); return; }
    if (!openForm.recipients || !openForm.content) { toast.error("Fill all fields"); return; }
    try {
      const payload = {
        message_type: openForm.message_type,
        content: openForm.content,
        recipients: openForm.recipients.split(",").map(r => r.trim()).filter(Boolean),
      };
      const result = await messagesApi.sendOpen(selectedPkg, payload);
      toast.success(`Message queued: ${result.total_recipients || 1} recipient(s)`);
      setOpenForm({ recipients: "", content: "", message_type: "text" });
      setShowSend(false);
      fetchQueueItems();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleSendReply = async () => {
    if (!selectedPkg) { toast.error("Select a package first"); return; }
    if (!replyForm.recipient || !replyForm.content) { toast.error("Fill all fields"); return; }
    try {
      const payload = {
        message_type: replyForm.message_type,
        content: replyForm.content,
        recipient: replyForm.recipient,
        conversation_id: replyForm.conversation_id || undefined,
      };
      const result = await messagesApi.sendReply(selectedPkg, payload);
      toast.success(`Reply sent via ${result.profile_used || "auto-selected profile"}`);
      setReplyForm({ recipient: "", content: "", message_type: "text", conversation_id: "" });
      setShowSend(false);
      fetchQueueItems();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleSchedule = async () => {
    if (!selectedPkg) { toast.error("Select a package first"); return; }
    if (!scheduleForm.recipients || !scheduleForm.content || !scheduleForm.scheduled_at) {
      toast.error("Fill all fields including scheduled time"); return;
    }
    try {
      const payload = {
        message_type: scheduleForm.message_type,
        content: scheduleForm.content,
        recipients: scheduleForm.recipients.split(",").map(r => r.trim()).filter(Boolean),
        scheduled_at: new Date(scheduleForm.scheduled_at).toISOString(),
        drip_mode: scheduleForm.drip_mode,
        drip_interval_minutes: scheduleForm.drip_interval_minutes,
      };
      const result = await messagesApi.schedule(selectedPkg, payload);
      toast.success(`Message scheduled for ${new Date(scheduleForm.scheduled_at).toLocaleString()}`);
      setScheduleForm({ recipients: "", content: "", message_type: "text", scheduled_at: "", drip_mode: false, drip_interval_minutes: 30 });
      setShowSend(false);
      fetchQueueItems();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case "delivered": return <CheckCircle2 className="h-3.5 w-3.5 text-emerald" />;
      case "sent": return <Send className="h-3.5 w-3.5 text-primary" />;
      case "queued": return <Clock className="h-3.5 w-3.5 text-amber-warn" />;
      case "failed": return <XCircle className="h-3.5 w-3.5 text-coral" />;
      default: return <Clock className="h-3.5 w-3.5 text-muted-foreground" />;
    }
  };

  // Delete all queue items handler
  const handleDeleteAllQueue = async () => {
    if (!selectedPkg) return;
    if (!confirm("Are you sure you want to delete ALL queue items? This action cannot be undone.")) return;
    try {
      const result = await messagesApi.deleteAllQueue(selectedPkg);
      toast.success(result.message || `Deleted ${result.deleted} queue item(s)`);
      fetchQueueItems();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // Handle content click/hover
  const handleContentInteraction = (item: any) => {
    if (contentDisplayMode === "click") {
      setContentDialog({ open: true, item });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold font-mono text-foreground flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              Messages
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Send messages and monitor delivery queue
            </p>
          </div>
          <Button
            onClick={() => setShowSend(true)}
            disabled={!selectedPkg}
            className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Send className="h-4 w-4" />
            Send Message
          </Button>
        </div>

        {/* Package selector + Queue status */}
        <div className="flex items-center gap-4">
          <div className="flex-1 max-w-xs">
            <Select value={selectedPkg} onValueChange={handlePackageChange}>
              <SelectTrigger className="bg-secondary/30">
                <SelectValue placeholder="Select a package..." />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                {packages?.map((pkg: any) => (
                  <SelectItem key={pkg.id} value={pkg.id}>
                    <span className="flex items-center gap-2">
                      <Package className="h-3 w-3" /> {pkg.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {queueStatus && (
            <div className="flex items-center gap-4 text-xs font-mono">
              <span className="text-muted-foreground">Queue: <span className="text-primary font-bold">{queueStatus.queue_size || 0}</span></span>
              <span className="text-muted-foreground">Mode: <span className="text-primary">{queueStatus.queue_mode || "—"}</span></span>
              <span className="text-muted-foreground">Active: <span className="text-emerald">{queueStatus.active_profiles || 0}</span></span>
              {queueStatus.next_send_at && (
                <span className="text-muted-foreground">Next: <span className="text-amber-400 font-bold">{formatCountdown(getSecondsRemaining(queueStatus.next_send_at))}</span></span>
              )}
            </div>
          )}

          <div className="flex items-center gap-2 ml-auto">
            <Select value={statusFilter} onValueChange={handleFilterChange}>
              <SelectTrigger className="w-[130px] bg-secondary/30 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="waiting">Waiting</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => fetchQueueItems()} className="gap-1 border-border">
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </Button>
          </div>
        </div>

        {/* Queue Items View */}
        {!selectedPkg ? (
          <Card className="border-glow bg-card/80">
            <CardContent className="flex flex-col items-center py-16">
              <Package className="h-12 w-12 text-muted-foreground/20 mb-4" />
              <p className="text-sm text-muted-foreground">Select a package to view messages</p>
            </CardContent>
          </Card>
        ) : queueLoading ? (
          <div className="flex items-center justify-center py-20">
            <Activity className="h-6 w-6 text-primary animate-spin" />
          </div>
        ) : queueItems && queueItems.length > 0 ? (
          <div className="space-y-2">
            {/* Delete All Queue Button */}
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-muted-foreground font-mono">{queueItems.length} item(s) · Content: {contentDisplayMode}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDeleteAllQueue}
                className="gap-1 text-xs border-coral/30 text-coral hover:bg-coral/10 hover:text-coral"
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete All Queue
              </Button>
            </div>
            {/* Header row */}
            <div className="grid grid-cols-14 gap-2 px-4 py-2 text-[10px] font-mono text-muted-foreground uppercase tracking-wider" style={{ gridTemplateColumns: 'repeat(14, minmax(0, 1fr))' }}>
              <div className="col-span-1">Status</div>
              <div className="col-span-1">Mode</div>
              <div className="col-span-1">Countdown</div>
              <div className="col-span-2">Recipient</div>
              <div className="col-span-2">Profile</div>
              <div className="col-span-1">Attempt</div>
              <div className="col-span-2">Queued At</div>
              <div className="col-span-4">Error / Send Time</div>
            </div>

            {queueItems.map((item: any, i: number) => {
              const secondsLeft = getSecondsRemaining(item.scheduled_send_at);
              const isFailed = item.status === "failed";
              const isSent = item.status === "sent";
              const isProcessing = item.status === "processing";

              return (
                <motion.div key={item.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.015 }}>
                  <div
                    className={`relative group grid gap-2 items-center rounded-lg border px-4 py-3 transition-all cursor-pointer ${isFailed ? "border-coral/50 bg-coral/5" :
                      isSent ? "border-emerald/30 bg-emerald/5" :
                        isProcessing ? "border-amber-400/50 bg-amber-400/5" :
                          "border-border/50 bg-card/60 hover:border-primary/20"
                      }`}
                    style={{ gridTemplateColumns: 'repeat(14, minmax(0, 1fr))' }}
                    onClick={() => handleContentInteraction(item)}
                  >
                    {/* Status */}
                    <div className="col-span-1 flex items-center gap-1">
                      {isFailed ? <XCircle className="h-3 w-3 text-coral" /> :
                        isSent ? <CheckCircle2 className="h-3 w-3 text-emerald" /> :
                          isProcessing ? <Zap className="h-3 w-3 text-amber-400 animate-pulse" /> :
                            <Clock className="h-3 w-3 text-primary" />}
                      <span className={`text-[9px] font-mono capitalize ${isFailed ? "text-coral" :
                        isSent ? "text-emerald" :
                          isProcessing ? "text-amber-400" :
                            "text-muted-foreground"
                        }`}>{item.status}</span>
                    </div>

                    {/* Mode */}
                    <div className="col-span-1">
                      <Badge variant="outline" className={`text-[8px] px-1 py-0 ${item.mode === "reply" ? "border-purple-500/30 text-purple-400" : "border-blue-500/30 text-blue-400"}`}>
                        {item.mode === "reply" ? "Reply" : "Open"}
                      </Badge>
                    </div>

                    {/* Countdown */}
                    <div className="col-span-1">
                      {isSent ? (
                        <span className="text-xs font-mono text-emerald">✓</span>
                      ) : isFailed ? (
                        <span className="text-xs font-mono text-coral">✗</span>
                      ) : isProcessing ? (
                        <span className="text-[10px] font-mono text-amber-400 animate-pulse">...</span>
                      ) : secondsLeft === 0 ? (
                        <span className="text-[10px] font-mono text-amber-400 font-bold animate-pulse">Now!</span>
                      ) : (
                        <span className={`text-xs font-mono font-bold ${secondsLeft < 60 ? "text-amber-400" :
                          secondsLeft < 300 ? "text-yellow-500" :
                            "text-primary"
                          }`}>{formatCountdown(secondsLeft)}</span>
                      )}
                    </div>

                    {/* Recipient */}
                    <div className="col-span-2">
                      <p className="text-xs font-mono text-foreground truncate">{item.recipient}</p>
                    </div>

                    {/* Profile */}
                    <div className="col-span-2">
                      <p className="text-xs text-muted-foreground truncate">{item.profile_name}</p>
                    </div>

                    {/* Attempt */}
                    <div className="col-span-1 text-center">
                      <span className={`text-xs font-mono ${item.attempt_count >= item.max_attempts ? "text-coral" : "text-muted-foreground"
                        }`}>{item.attempt_count}/{item.max_attempts}</span>
                    </div>

                    {/* Queued At */}
                    <div className="col-span-2">
                      {item.created_at ? (
                        <p className="text-[10px] text-muted-foreground font-mono">
                          {new Date(item.created_at).toLocaleString([], { month: '2-digit', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
                        </p>
                      ) : (
                        <span className="text-[10px] text-muted-foreground">—</span>
                      )}
                    </div>

                    {/* Error / Time */}
                    <div className="col-span-4">
                      {item.last_error ? (
                        <button
                          onClick={(e) => { e.stopPropagation(); setErrorDialog({ open: true, error: item.last_error, item }); }}
                          className="text-left text-[10px] text-coral font-mono truncate hover:underline cursor-pointer flex items-center gap-1 w-full"
                          title="Click to view full error"
                        >
                          <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{item.last_error}</span>
                        </button>
                      ) : item.sent_at ? (
                        <p className="text-[10px] text-emerald/80 font-mono">
                          ✓ {new Date(item.sent_at).toLocaleString()}
                        </p>
                      ) : item.scheduled_send_at ? (
                        <p className="text-[10px] text-muted-foreground font-mono">
                          @ {new Date(item.scheduled_send_at).toLocaleTimeString()}
                        </p>
                      ) : (
                        <span className="text-[10px] text-muted-foreground">—</span>
                      )}
                    </div>

                    {/* Hover tooltip for message content */}
                    {contentDisplayMode === "hover" && item.content && (
                      /* col-span-14 to span full row */
                      <div className="col-span-14 hidden group-hover:block animate-in fade-in slide-in-from-top-1 duration-200 pt-2">
                        <div className="p-3 rounded-lg bg-secondary/20 border border-primary/10">
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <Eye className="h-3 w-3 text-primary" />
                            <span className="text-[10px] font-mono text-primary uppercase">Message Content</span>
                          </div>
                          <p className="text-xs text-foreground whitespace-pre-wrap break-words max-h-32 overflow-y-auto">{item.content}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <Card className="border-glow bg-card/80">
            <CardContent className="flex flex-col items-center py-16">
              <Timer className="h-12 w-12 text-muted-foreground/20 mb-4" />
              <p className="text-sm text-muted-foreground">No items in queue</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Send a message to see queue items</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Send Message Dialog */}
      <Dialog open={showSend} onOpenChange={setShowSend}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-mono flex items-center gap-2">
              <Send className="h-4 w-4 text-primary" /> Send Message
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Messages are distributed through the Whats Guard
            </DialogDescription>
          </DialogHeader>

          <Tabs value={sendMode} onValueChange={(v) => setSendMode(v as "open" | "reply")} className="mt-2">
            <TabsList className="bg-secondary/30 border border-border/50 w-full">
              <TabsTrigger value="open" className="flex-1 data-[state=active]:bg-primary/15 data-[state=active]:text-primary text-xs">
                New Conversation
              </TabsTrigger>
              <TabsTrigger value="reply" className="flex-1 data-[state=active]:bg-primary/15 data-[state=active]:text-primary text-xs">
                Reply
              </TabsTrigger>
              <TabsTrigger value="schedule" className="flex-1 data-[state=active]:bg-primary/15 data-[state=active]:text-primary text-xs">
                <Calendar className="h-3 w-3 mr-1" /> Schedule
              </TabsTrigger>
            </TabsList>

            <TabsContent value="open" className="space-y-3 mt-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Recipients (comma-separated)</Label>
                <Input
                  value={openForm.recipients}
                  onChange={(e) => setOpenForm({ ...openForm, recipients: e.target.value })}
                  placeholder="+201066..., +201077..."
                  className="bg-secondary/30 font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Message Type</Label>
                <Select value={openForm.message_type} onValueChange={(v) => setOpenForm({ ...openForm, message_type: v })}>
                  <SelectTrigger className="bg-secondary/30"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="text">Text</SelectItem>
                    <SelectItem value="template">Template</SelectItem>
                    <SelectItem value="media">Media</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Message Content</Label>
                <Textarea
                  value={openForm.content}
                  onChange={(e) => setOpenForm({ ...openForm, content: e.target.value })}
                  placeholder="Type your message..."
                  className="bg-secondary/30 min-h-[100px]"
                />
              </div>
              <Button onClick={handleSendOpen} className="w-full bg-primary text-primary-foreground gap-2">
                <Send className="h-4 w-4" /> Send via BPB
              </Button>
            </TabsContent>

            <TabsContent value="reply" className="space-y-3 mt-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Recipient Number</Label>
                  <Input
                    value={replyForm.recipient}
                    onChange={(e) => setReplyForm({ ...replyForm, recipient: e.target.value })}
                    placeholder="+201066..."
                    className="bg-secondary/30 font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Conversation ID (optional)</Label>
                  <Input
                    value={replyForm.conversation_id}
                    onChange={(e) => setReplyForm({ ...replyForm, conversation_id: e.target.value })}
                    placeholder="conv-xxx"
                    className="bg-secondary/30 font-mono text-xs"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Message Type</Label>
                <Select value={replyForm.message_type} onValueChange={(v) => setReplyForm({ ...replyForm, message_type: v })}>
                  <SelectTrigger className="bg-secondary/30"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="text">Text</SelectItem>
                    <SelectItem value="template">Template</SelectItem>
                    <SelectItem value="media">Media</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Message Content</Label>
                <Textarea
                  value={replyForm.content}
                  onChange={(e) => setReplyForm({ ...replyForm, content: e.target.value })}
                  placeholder="Type your reply..."
                  className="bg-secondary/30 min-h-[100px]"
                />
              </div>
              <Button onClick={handleSendReply} className="w-full bg-primary text-primary-foreground gap-2">
                <Send className="h-4 w-4" /> Send Reply (Instant)
              </Button>
            </TabsContent>

            <TabsContent value="schedule" className="space-y-3 mt-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Recipients (comma-separated)</Label>
                <Input
                  value={scheduleForm.recipients}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, recipients: e.target.value })}
                  placeholder="+201066..., +201077..."
                  className="bg-secondary/30 font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Message Type</Label>
                <Select value={scheduleForm.message_type} onValueChange={(v) => setScheduleForm({ ...scheduleForm, message_type: v })}>
                  <SelectTrigger className="bg-secondary/30"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="text">Text</SelectItem>
                    <SelectItem value="template">Template</SelectItem>
                    <SelectItem value="media">Media</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Message Content</Label>
                <Textarea
                  value={scheduleForm.content}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, content: e.target.value })}
                  placeholder="Type your message..."
                  className="bg-secondary/30 min-h-[100px]"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Scheduled Time</Label>
                <Input
                  type="datetime-local"
                  value={scheduleForm.scheduled_at}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, scheduled_at: e.target.value })}
                  className="bg-secondary/30 font-mono text-xs"
                />
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={scheduleForm.drip_mode}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, drip_mode: e.target.checked })}
                    className="h-3.5 w-3.5"
                  />
                  <Label className="text-xs">Drip Mode</Label>
                </div>
                {scheduleForm.drip_mode && (
                  <div className="flex items-center gap-1.5">
                    <Label className="text-xs">Interval:</Label>
                    <Input
                      type="number"
                      value={scheduleForm.drip_interval_minutes}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, drip_interval_minutes: parseInt(e.target.value) || 30 })}
                      className="w-20 h-7 bg-secondary/30 font-mono text-xs"
                      min={1}
                    />
                    <span className="text-xs text-muted-foreground">min</span>
                  </div>
                )}
              </div>
              <Button onClick={handleSchedule} className="w-full bg-primary text-primary-foreground gap-2">
                <Calendar className="h-4 w-4" /> Schedule Message
              </Button>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Error Details Dialog */}
      <Dialog open={errorDialog.open} onOpenChange={(open) => setErrorDialog({ ...errorDialog, open })}>
        <DialogContent className="bg-card border-coral/30 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-coral flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" /> Error Details
            </DialogTitle>
            <DialogDescription>
              Full terminal error log for debugging
            </DialogDescription>
          </DialogHeader>
          {errorDialog.item && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Recipient:</span>
                  <p className="font-mono text-foreground">{errorDialog.item.recipient}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Profile:</span>
                  <p className="text-foreground">{errorDialog.item.profile_name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Mode:</span>
                  <Badge variant="outline" className={`text-xs ${errorDialog.item.mode === "reply" ? "border-purple-500/30 text-purple-400" : "border-blue-500/30 text-blue-400"}`}>
                    {errorDialog.item.mode === "reply" ? "Reply" : "Open"}
                  </Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">Attempts:</span>
                  <p className="font-mono text-coral">{errorDialog.item.attempt_count}/{errorDialog.item.max_attempts}</p>
                </div>
              </div>
              <div>
                <span className="text-muted-foreground text-sm">Full Error:</span>
                <pre className="mt-2 p-4 bg-secondary/30 rounded-lg border border-coral/20 text-coral text-xs font-mono whitespace-pre-wrap overflow-auto max-h-64">
                  {errorDialog.error}
                </pre>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setErrorDialog({ open: false, error: "", item: null })}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Message Content Dialog (click mode) */}
      <Dialog open={contentDialog.open} onOpenChange={(open) => setContentDialog({ ...contentDialog, open })}>
        <DialogContent className="bg-card border-primary/30 max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-mono flex items-center gap-2">
              <Eye className="h-4 w-4 text-primary" /> Message Content
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {contentDialog.item?.recipient && `To: ${contentDialog.item.recipient}`}
              {contentDialog.item?.profile_name && ` · Via: ${contentDialog.item.profile_name}`}
            </DialogDescription>
          </DialogHeader>
          {contentDialog.item && (
            <div className="space-y-3">
              <div className="p-4 bg-secondary/30 rounded-lg border border-border/50">
                <p className="text-sm text-foreground whitespace-pre-wrap break-words">{contentDialog.item.content || "No content"}</p>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="rounded-md bg-secondary/20 px-3 py-2 text-center">
                  <span className="text-muted-foreground">Status</span>
                  <p className="font-mono text-foreground capitalize">{contentDialog.item.status}</p>
                </div>
                <div className="rounded-md bg-secondary/20 px-3 py-2 text-center">
                  <span className="text-muted-foreground">Type</span>
                  <p className="font-mono text-foreground">{contentDialog.item.message_type}</p>
                </div>
                <div className="rounded-md bg-secondary/20 px-3 py-2 text-center">
                  <span className="text-muted-foreground">Attempts</span>
                  <p className="font-mono text-foreground">{contentDialog.item.attempt_count}/{contentDialog.item.max_attempts}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setContentDialog({ open: false, item: null })}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
