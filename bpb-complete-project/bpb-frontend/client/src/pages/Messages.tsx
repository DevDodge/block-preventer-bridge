/**
 * Messages Page - Send messages and monitor delivery
 * Design: Command Center dark theme with teal accents
 *
 * Three main sections (tabs):
 *   1. Queue          – existing queue-based message monitoring
 *   2. Sequential     – logs from the send-sequence endpoint
 *   3. Reply Image    – logs from the reply-image endpoint
 */
import { useState, useEffect } from "react";
import {
  MessageSquare, Send, Activity, Clock, CheckCircle2,
  XCircle, AlertTriangle, Package, RefreshCw, Calendar,
  Timer, Zap, Trash2, Eye, Image, ListOrdered, Play,
  ArrowRight, Film
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogDescription
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DashboardLayout from "@/components/DashboardLayout";
import { packagesApi, messagesApi, zentraDirectApi, systemApi } from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import { toast } from "sonner";
import { motion } from "framer-motion";

// ─── Types ───────────────────────────────────────────────────
interface SequenceLog {
  id: string;
  timestamp: string;
  chat_id: string;
  total_parts: number;
  successful: number;
  failed: number;
  skipped: number;
  status: string;
  results: Array<{
    part_index: number;
    type: string;
    status: string;
    zentra_response?: any;
    error?: string;
    delay_after_ms: number;
  }>;
}

interface ReplyImageLog {
  id: string;
  timestamp: string;
  chat_id: string;
  image_url: string;
  caption: string;
  status: string;
  message: string;
  zentra_response?: any;
}

// ─── Local-storage helpers for client-side logs ──────────────
const SEQ_LOG_KEY = "bpb_sequence_logs";
const REPLY_LOG_KEY = "bpb_reply_image_logs";

function loadLogs<T>(key: string): T[] {
  try {
    return JSON.parse(localStorage.getItem(key) || "[]");
  } catch {
    return [];
  }
}
function saveLogs<T>(key: string, logs: T[]) {
  localStorage.setItem(key, JSON.stringify(logs.slice(0, 200))); // keep last 200
}

// ─── Component ───────────────────────────────────────────────
export default function Messages() {
  const { data: packages } = useApi(() => packagesApi.list());
  const { data: settings } = useApi(() => systemApi.getSettings());
  const [selectedPkg, setSelectedPkg] = useState<string>("");
  const [showSend, setShowSend] = useState(false);
  const [sendMode, setSendMode] = useState<"open" | "reply" | "schedule">("open");
  const [statusFilter, setStatusFilter] = useState("all");
  const [mainTab, setMainTab] = useState<"queue" | "sequential" | "reply-image">("queue");

  // Content display mode from settings
  const contentDisplayMode = settings?.message_content_display || "hover";

  // ── Queue state ──────────────────────────────────────────
  const { data: queueStatus } = useApi(
    () => selectedPkg ? messagesApi.queueStatus(selectedPkg) : Promise.resolve(null),
    [selectedPkg]
  );
  const [queueItems, setQueueItems] = useState<any[]>([]);
  const [queueLoading, setQueueLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [errorDialog, setErrorDialog] = useState<{ open: boolean; error: string; item: any }>({ open: false, error: "", item: null });
  const [contentDialog, setContentDialog] = useState<{ open: boolean; item: any }>({ open: false, item: null });

  // ── Sequential Messages state ────────────────────────────
  const [seqLogs, setSeqLogs] = useState<SequenceLog[]>(() => loadLogs<SequenceLog>(SEQ_LOG_KEY));
  const [seqDetailDialog, setSeqDetailDialog] = useState<{ open: boolean; log: SequenceLog | null }>({ open: false, log: null });
  const [seqSending, setSeqSending] = useState(false);
  const [seqForm, setSeqForm] = useState({
    device_uuid: "", api_key: "", chat_id: "",
    partsText: '[\n  { "type": "text", "text": "Hello!" },\n  { "type": "image", "imageLink": "https://example.com/photo.jpg", "caption": "Check this out" }\n]'
  });

  // ── Reply Image state ────────────────────────────────────
  const [replyImgLogs, setReplyImgLogs] = useState<ReplyImageLog[]>(() => loadLogs<ReplyImageLog>(REPLY_LOG_KEY));
  const [replyImgSending, setReplyImgSending] = useState(false);
  const [replyImgForm, setReplyImgForm] = useState({
    device_uuid: "", api_key: "", chat_id: "",
    image_url: "", caption: ""
  });

  // ── Queue helpers ────────────────────────────────────────
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

  useEffect(() => { if (selectedPkg) fetchQueueItems(); }, [selectedPkg, statusFilter]);
  useEffect(() => { const iv = setInterval(() => setCountdown(c => c + 1), 1000); return () => clearInterval(iv); }, []);

  const formatCountdown = (seconds: number) => {
    if (seconds <= 0) return "Now";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const getSecondsRemaining = (scheduledAt: string | null) => {
    if (!scheduledAt) return 0;
    return Math.max(0, Math.floor((new Date(scheduledAt).getTime() - Date.now()) / 1000));
  };

  const handlePackageChange = (pkgId: string) => { setSelectedPkg(pkgId); setQueueItems([]); };
  const handleFilterChange = (filter: string) => { setStatusFilter(filter); setQueueItems([]); };

  const handleDeleteAllQueue = async () => {
    if (!selectedPkg) return;
    if (!confirm("Are you sure you want to delete ALL queue items? This action cannot be undone.")) return;
    try {
      const result = await messagesApi.deleteAllQueue(selectedPkg);
      toast.success(result.message || `Deleted ${result.deleted} queue item(s)`);
      fetchQueueItems();
    } catch (err: any) { toast.error(err.message); }
  };

  const handleContentInteraction = (item: any) => {
    if (contentDisplayMode === "click") setContentDialog({ open: true, item });
  };

  // ── Send forms (existing) ────────────────────────────────
  const [openForm, setOpenForm] = useState({ recipients: "", content: "", message_type: "text" });
  const [replyForm, setReplyForm] = useState({ recipient: "", content: "", message_type: "text", conversation_id: "" });
  const [scheduleForm, setScheduleForm] = useState({ recipients: "", content: "", message_type: "text", scheduled_at: "", drip_mode: false, drip_interval_minutes: 30 });

  const handleSendOpen = async () => {
    if (!selectedPkg) { toast.error("Select a package first"); return; }
    if (!openForm.recipients || !openForm.content) { toast.error("Fill all fields"); return; }
    try {
      const payload = { message_type: openForm.message_type, content: openForm.content, recipients: openForm.recipients.split(",").map(r => r.trim()).filter(Boolean) };
      const result = await messagesApi.sendOpen(selectedPkg, payload);
      toast.success(`Message queued: ${result.total_recipients || 1} recipient(s)`);
      setOpenForm({ recipients: "", content: "", message_type: "text" });
      setShowSend(false); fetchQueueItems();
    } catch (err: any) { toast.error(err.message); }
  };

  const handleSendReply = async () => {
    if (!selectedPkg) { toast.error("Select a package first"); return; }
    if (!replyForm.recipient || !replyForm.content) { toast.error("Fill all fields"); return; }
    try {
      const payload = { message_type: replyForm.message_type, content: replyForm.content, recipient: replyForm.recipient, conversation_id: replyForm.conversation_id || undefined };
      const result = await messagesApi.sendReply(selectedPkg, payload);
      toast.success(`Reply sent via ${result.profile_used || "auto-selected profile"}`);
      setReplyForm({ recipient: "", content: "", message_type: "text", conversation_id: "" });
      setShowSend(false); fetchQueueItems();
    } catch (err: any) { toast.error(err.message); }
  };

  const handleSchedule = async () => {
    if (!selectedPkg) { toast.error("Select a package first"); return; }
    if (!scheduleForm.recipients || !scheduleForm.content || !scheduleForm.scheduled_at) { toast.error("Fill all fields including scheduled time"); return; }
    try {
      const payload = { message_type: scheduleForm.message_type, content: scheduleForm.content, recipients: scheduleForm.recipients.split(",").map(r => r.trim()).filter(Boolean), scheduled_at: new Date(scheduleForm.scheduled_at).toISOString(), drip_mode: scheduleForm.drip_mode, drip_interval_minutes: scheduleForm.drip_interval_minutes };
      await messagesApi.schedule(selectedPkg, payload);
      toast.success(`Message scheduled for ${new Date(scheduleForm.scheduled_at).toLocaleString()}`);
      setScheduleForm({ recipients: "", content: "", message_type: "text", scheduled_at: "", drip_mode: false, drip_interval_minutes: 30 });
      setShowSend(false); fetchQueueItems();
    } catch (err: any) { toast.error(err.message); }
  };

  // ── Sequential Messages handlers ─────────────────────────
  const handleSendSequence = async () => {
    if (!seqForm.device_uuid || !seqForm.api_key || !seqForm.chat_id) {
      toast.error("Fill device UUID, API key, and chat ID"); return;
    }
    let parts: any[];
    try {
      parts = JSON.parse(seqForm.partsText);
      if (!Array.isArray(parts) || parts.length === 0) throw new Error("empty");
    } catch {
      toast.error("Parts must be a valid non-empty JSON array"); return;
    }

    setSeqSending(true);
    try {
      const response = await zentraDirectApi.sendSequence({
        device_uuid: seqForm.device_uuid,
        api_key: seqForm.api_key,
        chat_id: seqForm.chat_id,
        parts
      });
      const log: SequenceLog = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        chat_id: seqForm.chat_id,
        total_parts: response.total_parts,
        successful: response.successful,
        failed: response.failed,
        skipped: response.skipped || 0,
        status: response.status,
        results: response.results || []
      };
      const updated = [log, ...seqLogs];
      setSeqLogs(updated);
      saveLogs(SEQ_LOG_KEY, updated);
      toast.success(`Sequence completed: ${response.successful} ok, ${response.failed} failed`);
    } catch (err: any) {
      toast.error(`Sequence failed: ${err.message}`);
      const log: SequenceLog = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        chat_id: seqForm.chat_id,
        total_parts: parts.length,
        successful: 0, failed: parts.length, skipped: 0,
        status: "bridge_error",
        results: []
      };
      const updated = [log, ...seqLogs];
      setSeqLogs(updated);
      saveLogs(SEQ_LOG_KEY, updated);
    } finally {
      setSeqSending(false);
    }
  };

  const clearSeqLogs = () => { setSeqLogs([]); saveLogs(SEQ_LOG_KEY, []); toast.success("Sequential logs cleared"); };

  // ── Reply Image handlers ─────────────────────────────────
  const handleSendReplyImage = async () => {
    if (!replyImgForm.device_uuid || !replyImgForm.api_key || !replyImgForm.chat_id || !replyImgForm.image_url) {
      toast.error("Fill device UUID, API key, chat ID, and image URL"); return;
    }
    setReplyImgSending(true);
    try {
      const response = await zentraDirectApi.replyImage({
        device_uuid: replyImgForm.device_uuid,
        api_key: replyImgForm.api_key,
        chat_id: replyImgForm.chat_id,
        image_url: replyImgForm.image_url,
        caption: replyImgForm.caption || undefined
      });
      const log: ReplyImageLog = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        chat_id: replyImgForm.chat_id,
        image_url: replyImgForm.image_url,
        caption: replyImgForm.caption,
        status: response.status,
        message: response.message,
        zentra_response: response.zentra_response
      };
      const updated = [log, ...replyImgLogs];
      setReplyImgLogs(updated);
      saveLogs(REPLY_LOG_KEY, updated);
      if (response.status === "success") {
        toast.success("Image sent successfully");
      } else {
        toast.error(`Image send failed: ${response.message}`);
      }
    } catch (err: any) {
      toast.error(`Reply image failed: ${err.message}`);
      const log: ReplyImageLog = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        chat_id: replyImgForm.chat_id,
        image_url: replyImgForm.image_url,
        caption: replyImgForm.caption,
        status: "bridge_error",
        message: err.message
      };
      const updated = [log, ...replyImgLogs];
      setReplyImgLogs(updated);
      saveLogs(REPLY_LOG_KEY, updated);
    } finally {
      setReplyImgSending(false);
    }
  };

  const clearReplyImgLogs = () => { setReplyImgLogs([]); saveLogs(REPLY_LOG_KEY, []); toast.success("Reply image logs cleared"); };

  // ── Status helpers ───────────────────────────────────────
  const statusBadge = (s: string) => {
    if (s === "success" || s === "completed") return <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px]"><CheckCircle2 className="h-3 w-3 mr-1" />{s}</Badge>;
    if (s === "error" || s === "bridge_error") return <Badge className="bg-red-500/15 text-red-400 border-red-500/30 text-[10px]"><XCircle className="h-3 w-3 mr-1" />{s}</Badge>;
    if (s === "skipped") return <Badge className="bg-yellow-500/15 text-yellow-400 border-yellow-500/30 text-[10px]"><ArrowRight className="h-3 w-3 mr-1" />{s}</Badge>;
    return <Badge variant="outline" className="text-[10px]">{s}</Badge>;
  };

  const partTypeIcon = (type: string) => {
    if (type === "image") return <Image className="h-3 w-3 text-blue-400" />;
    if (type === "video") return <Film className="h-3 w-3 text-purple-400" />;
    return <MessageSquare className="h-3 w-3 text-teal-400" />;
  };

  // ─── RENDER ────────────────────────────────────────────────
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
              Send messages, sequences, and monitor delivery
            </p>
          </div>
          <Button
            onClick={() => setShowSend(true)}
            disabled={!selectedPkg && mainTab === "queue"}
            className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Send className="h-4 w-4" />
            Send Message
          </Button>
        </div>

        {/* ═══ Main Tabs ═══ */}
        <Tabs value={mainTab} onValueChange={(v) => setMainTab(v as any)}>
          <TabsList className="bg-secondary/30 border border-border/50 w-full grid grid-cols-3">
            <TabsTrigger value="queue" className="data-[state=active]:bg-primary/15 data-[state=active]:text-primary gap-1.5 text-xs">
              <Timer className="h-3.5 w-3.5" /> Queue
            </TabsTrigger>
            <TabsTrigger value="sequential" className="data-[state=active]:bg-primary/15 data-[state=active]:text-primary gap-1.5 text-xs">
              <ListOrdered className="h-3.5 w-3.5" /> Sequential Messages
            </TabsTrigger>
            <TabsTrigger value="reply-image" className="data-[state=active]:bg-primary/15 data-[state=active]:text-primary gap-1.5 text-xs">
              <Image className="h-3.5 w-3.5" /> Reply Image
            </TabsTrigger>
          </TabsList>

          {/* ═══════════════════════════════════════════════════
              TAB 1: QUEUE (existing)
              ═══════════════════════════════════════════════════ */}
          <TabsContent value="queue" className="space-y-4 mt-4">
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

            {/* Queue Items */}
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
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs text-muted-foreground font-mono">{queueItems.length} item(s) · Content: {contentDisplayMode}</span>
                  <Button variant="outline" size="sm" onClick={handleDeleteAllQueue} className="gap-1 text-xs border-coral/30 text-coral hover:bg-coral/10 hover:text-coral">
                    <Trash2 className="h-3.5 w-3.5" /> Delete All Queue
                  </Button>
                </div>
                {/* Header row */}
                <div className="grid gap-2 px-4 py-2 text-[10px] font-mono text-muted-foreground uppercase tracking-wider" style={{ gridTemplateColumns: 'repeat(14, minmax(0, 1fr))' }}>
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
                        className={`relative group grid gap-2 items-center rounded-lg border px-4 py-3 transition-all cursor-pointer ${isFailed ? "border-coral/50 bg-coral/5" : isSent ? "border-emerald/30 bg-emerald/5" : isProcessing ? "border-amber-400/50 bg-amber-400/5" : "border-border/50 bg-card/60 hover:border-primary/20"}`}
                        style={{ gridTemplateColumns: 'repeat(14, minmax(0, 1fr))' }}
                        onClick={() => handleContentInteraction(item)}
                      >
                        <div className="col-span-1 flex items-center gap-1">
                          {isFailed ? <XCircle className="h-3 w-3 text-coral" /> : isSent ? <CheckCircle2 className="h-3 w-3 text-emerald" /> : isProcessing ? <Zap className="h-3 w-3 text-amber-400 animate-pulse" /> : <Clock className="h-3 w-3 text-primary" />}
                          <span className={`text-[9px] font-mono capitalize ${isFailed ? "text-coral" : isSent ? "text-emerald" : isProcessing ? "text-amber-400" : "text-muted-foreground"}`}>{item.status}</span>
                        </div>
                        <div className="col-span-1">
                          <Badge variant="outline" className={`text-[8px] px-1 py-0 ${item.mode === "reply" ? "border-purple-500/30 text-purple-400" : "border-blue-500/30 text-blue-400"}`}>
                            {item.mode === "reply" ? "Reply" : "Open"}
                          </Badge>
                        </div>
                        <div className="col-span-1">
                          {isSent ? <span className="text-xs font-mono text-emerald">✓</span> : isFailed ? <span className="text-xs font-mono text-coral">✗</span> : isProcessing ? <span className="text-[10px] font-mono text-amber-400 animate-pulse">...</span> : secondsLeft === 0 ? <span className="text-[10px] font-mono text-amber-400 font-bold animate-pulse">Now!</span> : <span className={`text-xs font-mono font-bold ${secondsLeft < 60 ? "text-amber-400" : secondsLeft < 300 ? "text-yellow-500" : "text-primary"}`}>{formatCountdown(secondsLeft)}</span>}
                        </div>
                        <div className="col-span-2"><p className="text-xs font-mono text-foreground truncate">{item.recipient}</p></div>
                        <div className="col-span-2"><p className="text-xs text-muted-foreground truncate">{item.profile_name}</p></div>
                        <div className="col-span-1 text-center"><span className={`text-xs font-mono ${item.attempt_count >= item.max_attempts ? "text-coral" : "text-muted-foreground"}`}>{item.attempt_count}/{item.max_attempts}</span></div>
                        <div className="col-span-2">
                          {item.created_at ? <p className="text-[10px] text-muted-foreground font-mono">{new Date(item.created_at).toLocaleString([], { month: '2-digit', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}</p> : <span className="text-[10px] text-muted-foreground">—</span>}
                        </div>
                        <div className="col-span-4">
                          {item.last_error ? (
                            <button onClick={(e) => { e.stopPropagation(); setErrorDialog({ open: true, error: item.last_error, item }); }} className="text-left text-[10px] text-coral font-mono truncate hover:underline cursor-pointer flex items-center gap-1 w-full" title="Click to view full error">
                              <AlertTriangle className="h-3 w-3 flex-shrink-0" /><span className="truncate">{item.last_error}</span>
                            </button>
                          ) : item.sent_at ? (
                            <p className="text-[10px] text-emerald/80 font-mono">✓ {new Date(item.sent_at).toLocaleString()}</p>
                          ) : item.scheduled_send_at ? (
                            <p className="text-[10px] text-muted-foreground font-mono">@ {new Date(item.scheduled_send_at).toLocaleTimeString()}</p>
                          ) : <span className="text-[10px] text-muted-foreground">—</span>}
                        </div>
                        {contentDisplayMode === "hover" && item.content && (
                          <div className="col-span-14 hidden group-hover:block animate-in fade-in slide-in-from-top-1 duration-200 pt-2" style={{ gridColumn: '1 / -1' }}>
                            <div className="p-3 rounded-lg bg-secondary/20 border border-primary/10">
                              <div className="flex items-center gap-1.5 mb-1.5"><Eye className="h-3 w-3 text-primary" /><span className="text-[10px] font-mono text-primary uppercase">Message Content</span></div>
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
          </TabsContent>

          {/* ═══════════════════════════════════════════════════
              TAB 2: SEQUENTIAL MESSAGES
              ═══════════════════════════════════════════════════ */}
          <TabsContent value="sequential" className="space-y-4 mt-4">
            {/* Send Sequence Form */}
            <Card className="border-border/50 bg-card/80">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <ListOrdered className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-bold font-mono text-foreground">Send Sequential Messages</h3>
                  <Badge variant="outline" className="text-[9px] ml-auto border-primary/30 text-primary">via guard.whatsdeveloper.com</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Send an ordered array of text, image, and video parts sequentially to a WhatsApp chat. The backend ensures strict ordering with controlled delays.
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Device UUID</Label>
                    <Input value={seqForm.device_uuid} onChange={(e) => setSeqForm({ ...seqForm, device_uuid: e.target.value })} placeholder="device-uuid..." className="bg-secondary/30 font-mono text-xs" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">API Key</Label>
                    <Input type="password" value={seqForm.api_key} onChange={(e) => setSeqForm({ ...seqForm, api_key: e.target.value })} placeholder="zentra-api-key..." className="bg-secondary/30 font-mono text-xs" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Chat ID (Phone)</Label>
                    <Input value={seqForm.chat_id} onChange={(e) => setSeqForm({ ...seqForm, chat_id: e.target.value })} placeholder="201140668077" className="bg-secondary/30 font-mono text-xs" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Parts (JSON Array)</Label>
                  <Textarea value={seqForm.partsText} onChange={(e) => setSeqForm({ ...seqForm, partsText: e.target.value })} className="bg-secondary/30 font-mono text-xs min-h-[120px]" />
                </div>
                <Button onClick={handleSendSequence} disabled={seqSending} className="w-full bg-primary text-primary-foreground gap-2">
                  {seqSending ? <Activity className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                  {seqSending ? "Sending Sequence..." : "Send Sequence"}
                </Button>
              </CardContent>
            </Card>

            {/* Sequence Logs */}
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold font-mono text-foreground flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" /> Sequence Log
                <Badge variant="outline" className="text-[9px]">{seqLogs.length}</Badge>
              </h3>
              {seqLogs.length > 0 && (
                <Button variant="outline" size="sm" onClick={clearSeqLogs} className="gap-1 text-xs border-coral/30 text-coral hover:bg-coral/10">
                  <Trash2 className="h-3.5 w-3.5" /> Clear Logs
                </Button>
              )}
            </div>

            {seqLogs.length === 0 ? (
              <Card className="border-glow bg-card/80">
                <CardContent className="flex flex-col items-center py-12">
                  <ListOrdered className="h-10 w-10 text-muted-foreground/20 mb-3" />
                  <p className="text-sm text-muted-foreground">No sequential messages sent yet</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Use the form above or your n8n workflow to send sequences</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {seqLogs.map((log, i) => (
                  <motion.div key={log.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}>
                    <div
                      className={`rounded-lg border px-4 py-3 cursor-pointer transition-all hover:border-primary/30 ${log.failed > 0 ? "border-coral/30 bg-coral/5" : log.status === "completed" ? "border-emerald/20 bg-emerald/5" : "border-border/50 bg-card/60"}`}
                      onClick={() => setSeqDetailDialog({ open: true, log })}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {statusBadge(log.status)}
                          <span className="text-xs font-mono text-muted-foreground">{log.chat_id}</span>
                          <span className="text-[10px] text-muted-foreground">{new Date(log.timestamp).toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs font-mono">
                          <span className="text-emerald-400">{log.successful} ok</span>
                          {log.failed > 0 && <span className="text-red-400">{log.failed} fail</span>}
                          {log.skipped > 0 && <span className="text-yellow-400">{log.skipped} skip</span>}
                          <span className="text-muted-foreground">{log.total_parts} parts</span>
                        </div>
                      </div>
                      {/* Mini part indicators */}
                      <div className="flex items-center gap-1 mt-2">
                        {log.results.map((r) => (
                          <div key={r.part_index} className={`h-1.5 flex-1 rounded-full ${r.status === "success" ? "bg-emerald-500" : r.status === "error" ? "bg-red-500" : "bg-yellow-500"}`} title={`Part ${r.part_index}: ${r.type} - ${r.status}`} />
                        ))}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ═══════════════════════════════════════════════════
              TAB 3: REPLY IMAGE
              ═══════════════════════════════════════════════════ */}
          <TabsContent value="reply-image" className="space-y-4 mt-4">
            {/* Reply Image Form */}
            <Card className="border-border/50 bg-card/80">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <Image className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-bold font-mono text-foreground">Reply with Image</h3>
                  <Badge variant="outline" className="text-[9px] ml-auto border-primary/30 text-primary">via guard.whatsdeveloper.com</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Send a single image message with an optional caption to a WhatsApp chat via the Zentra API.
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Device UUID</Label>
                    <Input value={replyImgForm.device_uuid} onChange={(e) => setReplyImgForm({ ...replyImgForm, device_uuid: e.target.value })} placeholder="device-uuid..." className="bg-secondary/30 font-mono text-xs" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">API Key</Label>
                    <Input type="password" value={replyImgForm.api_key} onChange={(e) => setReplyImgForm({ ...replyImgForm, api_key: e.target.value })} placeholder="zentra-api-key..." className="bg-secondary/30 font-mono text-xs" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Chat ID (Phone)</Label>
                    <Input value={replyImgForm.chat_id} onChange={(e) => setReplyImgForm({ ...replyImgForm, chat_id: e.target.value })} placeholder="201140668077" className="bg-secondary/30 font-mono text-xs" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Image URL</Label>
                    <Input value={replyImgForm.image_url} onChange={(e) => setReplyImgForm({ ...replyImgForm, image_url: e.target.value })} placeholder="https://example.com/photo.jpg" className="bg-secondary/30 font-mono text-xs" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Caption (optional)</Label>
                    <Input value={replyImgForm.caption} onChange={(e) => setReplyImgForm({ ...replyImgForm, caption: e.target.value })} placeholder="Image caption..." className="bg-secondary/30 text-xs" />
                  </div>
                </div>
                <Button onClick={handleSendReplyImage} disabled={replyImgSending} className="w-full bg-primary text-primary-foreground gap-2">
                  {replyImgSending ? <Activity className="h-4 w-4 animate-spin" /> : <Image className="h-4 w-4" />}
                  {replyImgSending ? "Sending Image..." : "Send Image"}
                </Button>
              </CardContent>
            </Card>

            {/* Reply Image Logs */}
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold font-mono text-foreground flex items-center gap-2">
                <Image className="h-4 w-4 text-primary" /> Reply Image Log
                <Badge variant="outline" className="text-[9px]">{replyImgLogs.length}</Badge>
              </h3>
              {replyImgLogs.length > 0 && (
                <Button variant="outline" size="sm" onClick={clearReplyImgLogs} className="gap-1 text-xs border-coral/30 text-coral hover:bg-coral/10">
                  <Trash2 className="h-3.5 w-3.5" /> Clear Logs
                </Button>
              )}
            </div>

            {replyImgLogs.length === 0 ? (
              <Card className="border-glow bg-card/80">
                <CardContent className="flex flex-col items-center py-12">
                  <Image className="h-10 w-10 text-muted-foreground/20 mb-3" />
                  <p className="text-sm text-muted-foreground">No reply images sent yet</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Use the form above to send an image with caption</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {replyImgLogs.map((log, i) => (
                  <motion.div key={log.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}>
                    <div className={`rounded-lg border px-4 py-3 transition-all ${log.status === "success" ? "border-emerald/20 bg-emerald/5" : "border-coral/30 bg-coral/5"}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {statusBadge(log.status)}
                          <span className="text-xs font-mono text-muted-foreground">{log.chat_id}</span>
                          <span className="text-[10px] text-muted-foreground">{new Date(log.timestamp).toLocaleString()}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">{log.message}</span>
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-xs">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Image className="h-3 w-3 text-blue-400" />
                          <a href={log.image_url} target="_blank" rel="noopener noreferrer" className="hover:underline text-blue-400 truncate max-w-[300px]">{log.image_url}</a>
                        </div>
                        {log.caption && (
                          <span className="text-muted-foreground italic truncate max-w-[200px]">"{log.caption}"</span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* ═══ Send Message Dialog (existing) ═══ */}
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
              <TabsTrigger value="open" className="flex-1 data-[state=active]:bg-primary/15 data-[state=active]:text-primary text-xs">New Conversation</TabsTrigger>
              <TabsTrigger value="reply" className="flex-1 data-[state=active]:bg-primary/15 data-[state=active]:text-primary text-xs">Reply</TabsTrigger>
              <TabsTrigger value="schedule" className="flex-1 data-[state=active]:bg-primary/15 data-[state=active]:text-primary text-xs"><Calendar className="h-3 w-3 mr-1" /> Schedule</TabsTrigger>
            </TabsList>
            <TabsContent value="open" className="space-y-3 mt-4">
              <div className="space-y-1.5"><Label className="text-xs">Recipients (comma-separated)</Label><Input value={openForm.recipients} onChange={(e) => setOpenForm({ ...openForm, recipients: e.target.value })} placeholder="+201066..., +201077..." className="bg-secondary/30 font-mono" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Message Type</Label><Select value={openForm.message_type} onValueChange={(v) => setOpenForm({ ...openForm, message_type: v })}><SelectTrigger className="bg-secondary/30"><SelectValue /></SelectTrigger><SelectContent className="bg-popover border-border"><SelectItem value="text">Text</SelectItem><SelectItem value="template">Template</SelectItem><SelectItem value="media">Media</SelectItem></SelectContent></Select></div>
              <div className="space-y-1.5"><Label className="text-xs">Message Content</Label><Textarea value={openForm.content} onChange={(e) => setOpenForm({ ...openForm, content: e.target.value })} placeholder="Type your message..." className="bg-secondary/30 min-h-[100px]" /></div>
              <Button onClick={handleSendOpen} className="w-full bg-primary text-primary-foreground gap-2"><Send className="h-4 w-4" /> Send via BPB</Button>
            </TabsContent>
            <TabsContent value="reply" className="space-y-3 mt-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label className="text-xs">Recipient Number</Label><Input value={replyForm.recipient} onChange={(e) => setReplyForm({ ...replyForm, recipient: e.target.value })} placeholder="+201066..." className="bg-secondary/30 font-mono" /></div>
                <div className="space-y-1.5"><Label className="text-xs">Conversation ID (optional)</Label><Input value={replyForm.conversation_id} onChange={(e) => setReplyForm({ ...replyForm, conversation_id: e.target.value })} placeholder="conv-xxx" className="bg-secondary/30 font-mono text-xs" /></div>
              </div>
              <div className="space-y-1.5"><Label className="text-xs">Message Type</Label><Select value={replyForm.message_type} onValueChange={(v) => setReplyForm({ ...replyForm, message_type: v })}><SelectTrigger className="bg-secondary/30"><SelectValue /></SelectTrigger><SelectContent className="bg-popover border-border"><SelectItem value="text">Text</SelectItem><SelectItem value="template">Template</SelectItem><SelectItem value="media">Media</SelectItem></SelectContent></Select></div>
              <div className="space-y-1.5"><Label className="text-xs">Message Content</Label><Textarea value={replyForm.content} onChange={(e) => setReplyForm({ ...replyForm, content: e.target.value })} placeholder="Type your reply..." className="bg-secondary/30 min-h-[100px]" /></div>
              <Button onClick={handleSendReply} className="w-full bg-primary text-primary-foreground gap-2"><Send className="h-4 w-4" /> Send Reply (Instant)</Button>
            </TabsContent>
            <TabsContent value="schedule" className="space-y-3 mt-4">
              <div className="space-y-1.5"><Label className="text-xs">Recipients (comma-separated)</Label><Input value={scheduleForm.recipients} onChange={(e) => setScheduleForm({ ...scheduleForm, recipients: e.target.value })} placeholder="+201066..., +201077..." className="bg-secondary/30 font-mono" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Message Type</Label><Select value={scheduleForm.message_type} onValueChange={(v) => setScheduleForm({ ...scheduleForm, message_type: v })}><SelectTrigger className="bg-secondary/30"><SelectValue /></SelectTrigger><SelectContent className="bg-popover border-border"><SelectItem value="text">Text</SelectItem><SelectItem value="template">Template</SelectItem><SelectItem value="media">Media</SelectItem></SelectContent></Select></div>
              <div className="space-y-1.5"><Label className="text-xs">Message Content</Label><Textarea value={scheduleForm.content} onChange={(e) => setScheduleForm({ ...scheduleForm, content: e.target.value })} placeholder="Type your message..." className="bg-secondary/30 min-h-[100px]" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Scheduled Time</Label><Input type="datetime-local" value={scheduleForm.scheduled_at} onChange={(e) => setScheduleForm({ ...scheduleForm, scheduled_at: e.target.value })} className="bg-secondary/30 font-mono text-xs" /></div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2"><input type="checkbox" checked={scheduleForm.drip_mode} onChange={(e) => setScheduleForm({ ...scheduleForm, drip_mode: e.target.checked })} className="h-3.5 w-3.5" /><Label className="text-xs">Drip Mode</Label></div>
                {scheduleForm.drip_mode && (
                  <div className="flex items-center gap-1.5"><Label className="text-xs">Interval:</Label><Input type="number" value={scheduleForm.drip_interval_minutes} onChange={(e) => setScheduleForm({ ...scheduleForm, drip_interval_minutes: parseInt(e.target.value) || 30 })} className="w-20 h-7 bg-secondary/30 font-mono text-xs" min={1} /><span className="text-xs text-muted-foreground">min</span></div>
                )}
              </div>
              <Button onClick={handleSchedule} className="w-full bg-primary text-primary-foreground gap-2"><Calendar className="h-4 w-4" /> Schedule Message</Button>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* ═══ Error Details Dialog ═══ */}
      <Dialog open={errorDialog.open} onOpenChange={(open) => setErrorDialog({ ...errorDialog, open })}>
        <DialogContent className="bg-card border-coral/30 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-coral flex items-center gap-2"><AlertTriangle className="h-5 w-5" /> Error Details</DialogTitle>
            <DialogDescription>Full terminal error log for debugging</DialogDescription>
          </DialogHeader>
          {errorDialog.item && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">Recipient:</span><p className="font-mono text-foreground">{errorDialog.item.recipient}</p></div>
                <div><span className="text-muted-foreground">Profile:</span><p className="text-foreground">{errorDialog.item.profile_name}</p></div>
                <div><span className="text-muted-foreground">Mode:</span><Badge variant="outline" className={`text-xs ${errorDialog.item.mode === "reply" ? "border-purple-500/30 text-purple-400" : "border-blue-500/30 text-blue-400"}`}>{errorDialog.item.mode === "reply" ? "Reply" : "Open"}</Badge></div>
                <div><span className="text-muted-foreground">Attempts:</span><p className="font-mono text-coral">{errorDialog.item.attempt_count}/{errorDialog.item.max_attempts}</p></div>
              </div>
              <div><span className="text-muted-foreground text-sm">Full Error:</span><pre className="mt-2 p-4 bg-secondary/30 rounded-lg border border-coral/20 text-coral text-xs font-mono whitespace-pre-wrap overflow-auto max-h-64">{errorDialog.error}</pre></div>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setErrorDialog({ open: false, error: "", item: null })}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ Content Dialog (click mode) ═══ */}
      <Dialog open={contentDialog.open} onOpenChange={(open) => setContentDialog({ ...contentDialog, open })}>
        <DialogContent className="bg-card border-primary/30 max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-mono flex items-center gap-2"><Eye className="h-4 w-4 text-primary" /> Message Content</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">{contentDialog.item?.recipient && `To: ${contentDialog.item.recipient}`}{contentDialog.item?.profile_name && ` · Via: ${contentDialog.item.profile_name}`}</DialogDescription>
          </DialogHeader>
          {contentDialog.item && (
            <div className="space-y-3">
              <div className="p-4 bg-secondary/30 rounded-lg border border-border/50"><p className="text-sm text-foreground whitespace-pre-wrap break-words">{contentDialog.item.content || "No content"}</p></div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="rounded-md bg-secondary/20 px-3 py-2 text-center"><span className="text-muted-foreground">Status</span><p className="font-mono text-foreground capitalize">{contentDialog.item.status}</p></div>
                <div className="rounded-md bg-secondary/20 px-3 py-2 text-center"><span className="text-muted-foreground">Type</span><p className="font-mono text-foreground">{contentDialog.item.message_type}</p></div>
                <div className="rounded-md bg-secondary/20 px-3 py-2 text-center"><span className="text-muted-foreground">Attempts</span><p className="font-mono text-foreground">{contentDialog.item.attempt_count}/{contentDialog.item.max_attempts}</p></div>
              </div>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setContentDialog({ open: false, item: null })}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ Sequence Detail Dialog ═══ */}
      <Dialog open={seqDetailDialog.open} onOpenChange={(open) => setSeqDetailDialog({ ...seqDetailDialog, open })}>
        <DialogContent className="bg-card border-primary/30 max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-mono flex items-center gap-2"><ListOrdered className="h-4 w-4 text-primary" /> Sequence Details</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {seqDetailDialog.log && `Chat: ${seqDetailDialog.log.chat_id} · ${new Date(seqDetailDialog.log.timestamp).toLocaleString()}`}
            </DialogDescription>
          </DialogHeader>
          {seqDetailDialog.log && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-4 gap-2 text-xs">
                <div className="rounded-md bg-secondary/20 px-3 py-2 text-center">
                  <span className="text-muted-foreground">Total</span>
                  <p className="font-mono text-foreground font-bold">{seqDetailDialog.log.total_parts}</p>
                </div>
                <div className="rounded-md bg-emerald-500/10 px-3 py-2 text-center">
                  <span className="text-emerald-400">Success</span>
                  <p className="font-mono text-emerald-400 font-bold">{seqDetailDialog.log.successful}</p>
                </div>
                <div className="rounded-md bg-red-500/10 px-3 py-2 text-center">
                  <span className="text-red-400">Failed</span>
                  <p className="font-mono text-red-400 font-bold">{seqDetailDialog.log.failed}</p>
                </div>
                <div className="rounded-md bg-yellow-500/10 px-3 py-2 text-center">
                  <span className="text-yellow-400">Skipped</span>
                  <p className="font-mono text-yellow-400 font-bold">{seqDetailDialog.log.skipped}</p>
                </div>
              </div>

              {/* Per-part results */}
              <div className="space-y-2">
                <span className="text-xs font-mono text-muted-foreground uppercase">Part Results</span>
                {seqDetailDialog.log.results.map((r) => (
                  <div key={r.part_index} className={`rounded-lg border px-4 py-2.5 ${r.status === "success" ? "border-emerald/20 bg-emerald/5" : r.status === "error" ? "border-coral/30 bg-coral/5" : "border-yellow-500/20 bg-yellow-500/5"}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-muted-foreground">#{r.part_index}</span>
                        {partTypeIcon(r.type)}
                        <Badge variant="outline" className="text-[9px]">{r.type}</Badge>
                        {statusBadge(r.status)}
                      </div>
                      <span className="text-[10px] font-mono text-muted-foreground">
                        {r.delay_after_ms > 0 ? `+${(r.delay_after_ms / 1000).toFixed(1)}s delay` : "no delay"}
                      </span>
                    </div>
                    {r.error && (
                      <pre className="mt-2 p-2 bg-secondary/30 rounded border border-coral/20 text-coral text-[10px] font-mono whitespace-pre-wrap">{r.error}</pre>
                    )}
                    {r.zentra_response && (
                      <pre className="mt-2 p-2 bg-secondary/30 rounded border border-border/30 text-[10px] font-mono text-muted-foreground whitespace-pre-wrap max-h-24 overflow-y-auto">{JSON.stringify(r.zentra_response, null, 2)}</pre>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setSeqDetailDialog({ open: false, log: null })}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
