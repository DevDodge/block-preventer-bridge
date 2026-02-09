/**
 * Messages Page - Send messages and view history
 * Design: Command Center dark theme with teal accents
 * Enhanced: Queue items with countdown timers and error display
 */
import { useState, useMemo, useCallback, useEffect } from "react";
import {
  MessageSquare, Send, Search, Activity, Clock, CheckCircle2,
  XCircle, AlertTriangle, Package, Filter, RefreshCw, Calendar, ChevronDown, Timer, Zap, Trash2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DashboardLayout from "@/components/DashboardLayout";
import { packagesApi, messagesApi } from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import { toast } from "sonner";
import { motion } from "framer-motion";

const PAGE_SIZE = 25;

export default function Messages() {
  const { data: packages } = useApi(() => packagesApi.list());
  const [selectedPkg, setSelectedPkg] = useState<string>("");
  const [showSend, setShowSend] = useState(false);
  const [sendMode, setSendMode] = useState<"open" | "reply" | "schedule">("open");
  const [statusFilter, setStatusFilter] = useState("all");

  // Pagination state
  const [allMessages, setAllMessages] = useState<any[]>([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const { data: initialMessages, loading: msgsLoading, refetch: refetchMsgs } = useApi(
    () => selectedPkg ? messagesApi.list(selectedPkg, { status: statusFilter !== "all" ? statusFilter : undefined, limit: PAGE_SIZE, offset: 0 }) : Promise.resolve([]),
    [selectedPkg, statusFilter]
  );

  // Sync initial messages to allMessages state
  useState(() => {
    if (initialMessages && initialMessages.length > 0) {
      setAllMessages(initialMessages);
      setHasMore(initialMessages.length === PAGE_SIZE);
      setOffset(initialMessages.length);
    }
  });

  // Reset pagination when package or filter changes
  const handlePackageChange = (pkgId: string) => {
    setSelectedPkg(pkgId);
    setAllMessages([]);
    setOffset(0);
    setHasMore(true);
  };

  const handleFilterChange = (filter: string) => {
    setStatusFilter(filter);
    setAllMessages([]);
    setOffset(0);
    setHasMore(true);
  };

  // Load more messages
  const loadMore = async () => {
    if (!selectedPkg || loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const more = await messagesApi.list(selectedPkg, {
        status: statusFilter !== "all" ? statusFilter : undefined,
        limit: PAGE_SIZE,
        offset: offset
      });
      if (more.length < PAGE_SIZE) {
        setHasMore(false);
      }
      setAllMessages(prev => [...prev, ...more]);
      setOffset(prev => prev + more.length);
    } catch (err) {
      toast.error("Failed to load more messages");
    } finally {
      setLoadingMore(false);
    }
  };

  // Use initialMessages if allMessages is empty
  const messages = allMessages.length > 0 ? allMessages : (initialMessages || []);

  const { data: queueStatus } = useApi(
    () => selectedPkg ? messagesApi.queueStatus(selectedPkg) : Promise.resolve(null),
    [selectedPkg]
  );

  // Queue items for developer view
  const [queueItems, setQueueItems] = useState<any[]>([]);
  const [queueLoading, setQueueLoading] = useState(false);
  const [showQueueView, setShowQueueView] = useState(true);
  const [countdown, setCountdown] = useState(0); // Trigger re-render for countdown
  const [errorDialog, setErrorDialog] = useState<{ open: boolean; error: string; item: any }>({ open: false, error: "", item: null });

  // Fetch queue items
  const fetchQueueItems = async () => {
    if (!selectedPkg) return;
    setQueueLoading(true);
    try {
      const items = await messagesApi.queueItems(selectedPkg);
      setQueueItems(items);
    } catch (err) {
      console.error("Failed to fetch queue items", err);
    } finally {
      setQueueLoading(false);
    }
  };

  // Fetch queue items when package changes
  useEffect(() => {
    if (selectedPkg) {
      fetchQueueItems();
    }
  }, [selectedPkg]);

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
      refetchMsgs();
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
      refetchMsgs();
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
      refetchMsgs();
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

  // Delete all messages handler
  const handleDeleteAllMessages = async () => {
    if (!selectedPkg) return;
    if (!confirm("Are you sure you want to delete ALL messages? This will also delete delivery logs and queue items. This action cannot be undone.")) return;
    try {
      const result = await messagesApi.deleteAll(selectedPkg);
      toast.success(result.message || `Deleted ${result.deleted} message(s)`);
      setAllMessages([]);
      refetchMsgs();
    } catch (err: any) {
      toast.error(err.message);
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
              Send messages and monitor delivery status
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
            <Button
              variant={showQueueView ? "default" : "outline"}
              size="sm"
              onClick={() => { setShowQueueView(true); fetchQueueItems(); }}
              className="gap-1 text-xs"
            >
              <Timer className="h-3.5 w-3.5" /> Queue
            </Button>
            <Button
              variant={!showQueueView ? "default" : "outline"}
              size="sm"
              onClick={() => setShowQueueView(false)}
              className="gap-1 text-xs"
            >
              <MessageSquare className="h-3.5 w-3.5" /> History
            </Button>
            <Select value={statusFilter} onValueChange={handleFilterChange}>
              <SelectTrigger className="w-[130px] bg-secondary/30 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="queued">Queued</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => { refetchMsgs(); fetchQueueItems(); }} className="gap-1 border-border">
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </Button>
          </div>
        </div>

        {/* Queue Items View (Developer) */}
        {!selectedPkg ? (
          <Card className="border-glow bg-card/80">
            <CardContent className="flex flex-col items-center py-16">
              <Package className="h-12 w-12 text-muted-foreground/20 mb-4" />
              <p className="text-sm text-muted-foreground">Select a package to view messages</p>
            </CardContent>
          </Card>
        ) : showQueueView ? (
          /* Queue Items with Countdown */
          queueLoading ? (
            <div className="flex items-center justify-center py-20">
              <Activity className="h-6 w-6 text-primary animate-spin" />
            </div>
          ) : queueItems && queueItems.length > 0 ? (
            <div className="space-y-2">
              {/* Delete All Queue Button */}
              <div className="flex justify-end mb-2">
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
              <div className="grid grid-cols-12 gap-2 px-4 py-2 text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                <div className="col-span-1">Status</div>
                <div className="col-span-1">Mode</div>
                <div className="col-span-1">Countdown</div>
                <div className="col-span-2">Recipient</div>
                <div className="col-span-2">Profile</div>
                <div className="col-span-1">Attempt</div>
                <div className="col-span-4">Error / Send Time</div>
              </div>

              {queueItems.map((item: any, i: number) => {
                const secondsLeft = getSecondsRemaining(item.scheduled_send_at);
                const isFailed = item.status === "failed";
                const isSent = item.status === "sent";
                const isProcessing = item.status === "processing";

                return (
                  <motion.div key={item.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.015 }}>
                    <div className={`grid grid-cols-12 gap-2 items-center rounded-lg border px-4 py-3 transition-all ${isFailed ? "border-coral/50 bg-coral/5" :
                      isSent ? "border-emerald/30 bg-emerald/5" :
                        isProcessing ? "border-amber-400/50 bg-amber-400/5" :
                          "border-border/50 bg-card/60 hover:border-primary/20"
                      }`}>
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

                      {/* Error / Time - Clickable for full error */}
                      <div className="col-span-4">
                        {item.last_error ? (
                          <button
                            onClick={() => setErrorDialog({ open: true, error: item.last_error, item })}
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
          )
        ) : (
          /* Original Messages History View */
          msgsLoading ? (
            <div className="flex items-center justify-center py-20">
              <Activity className="h-6 w-6 text-primary animate-spin" />
            </div>
          ) : messages && messages.length > 0 ? (
            <div className="space-y-2">
              {/* Delete All Messages Button */}
              <div className="flex justify-end mb-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDeleteAllMessages}
                  className="gap-1 text-xs border-coral/30 text-coral hover:bg-coral/10 hover:text-coral"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete All Messages
                </Button>
              </div>
              {/* Header row */}
              <div className="grid grid-cols-12 gap-3 px-4 py-2 text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                <div className="col-span-1">Status</div>
                <div className="col-span-2">Recipient</div>
                <div className="col-span-3">Message</div>
                <div className="col-span-2">Profile</div>
                <div className="col-span-1">Mode</div>
                <div className="col-span-1">Attempts</div>
                <div className="col-span-2">Time</div>
              </div>

              {messages.map((msg: any, i: number) => (
                <motion.div key={msg.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}>
                  <div className="grid grid-cols-12 gap-3 items-center rounded-lg border border-border/50 bg-card/60 px-4 py-3 hover:border-primary/20 transition-all">
                    <div className="col-span-1 flex items-center gap-1.5">
                      {statusIcon(msg.status)}
                      <span className="text-[10px] font-mono text-muted-foreground capitalize">{msg.status}</span>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs font-mono text-foreground truncate">{msg.recipient_number || msg.conversation_id || "—"}</p>
                    </div>
                    <div className="col-span-3">
                      <p className="text-xs text-foreground truncate">{msg.message_text}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs text-muted-foreground truncate">{msg.profile_name || "Auto"}</p>
                    </div>
                    <div className="col-span-1">
                      <Badge variant="outline" className="text-[9px] border-primary/20 text-primary">{msg.mode}</Badge>
                    </div>
                    <div className="col-span-1 text-center">
                      <span className="text-xs font-mono text-muted-foreground">{msg.attempts || 0}</span>
                    </div>
                    <div className="col-span-2">
                      <p className="text-[10px] text-muted-foreground font-mono">
                        {msg.created_at ? new Date(msg.created_at).toLocaleString() : "—"}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}

              {/* Load More Button */}
              {hasMore && messages.length >= PAGE_SIZE && (
                <div className="flex justify-center pt-4">
                  <Button
                    variant="outline"
                    onClick={loadMore}
                    disabled={loadingMore}
                    className="gap-2 border-border text-xs"
                  >
                    {loadingMore ? (
                      <Activity className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5" />
                    )}
                    {loadingMore ? "Loading..." : `Load More (${messages.length} loaded)`}
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <Card className="border-glow bg-card/80">
              <CardContent className="flex flex-col items-center py-16">
                <MessageSquare className="h-12 w-12 text-muted-foreground/20 mb-4" />
                <p className="text-sm text-muted-foreground">No messages yet</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Send your first message to get started</p>
                <Button onClick={() => setShowSend(true)} size="sm" className="mt-3 gap-2">
                  <Send className="h-3.5 w-3.5" /> Send Message
                </Button>
              </CardContent>
            </Card>
          )
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
              Messages are distributed through the Block Preventer Bridge
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
                  placeholder="conv-uuid..."
                  className="bg-secondary/30 font-mono"
                />
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
                <Send className="h-4 w-4" /> Reply via BPB
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
              <div className="grid grid-cols-2 gap-3">
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
                  <Label className="text-xs">Scheduled Time</Label>
                  <Input
                    type="datetime-local"
                    value={scheduleForm.scheduled_at}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, scheduled_at: e.target.value })}
                    className="bg-secondary/30 font-mono"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Message Content</Label>
                <Textarea
                  value={scheduleForm.content}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, content: e.target.value })}
                  placeholder="Type your scheduled message..."
                  className="bg-secondary/30 min-h-[80px]"
                />
              </div>
              <div className="flex items-center gap-4 p-3 rounded-lg border border-border/50 bg-secondary/20">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="dripMode"
                    checked={scheduleForm.drip_mode}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, drip_mode: e.target.checked })}
                    className="rounded border-border"
                  />
                  <Label htmlFor="dripMode" className="text-xs cursor-pointer">Drip Mode</Label>
                </div>
                {scheduleForm.drip_mode && (
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground">Interval:</Label>
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
    </DashboardLayout>
  );
}
