/**
 * User Manual Page - Comprehensive guide for Bodyguard platform
 * Design: Command Center dark theme with teal accents
 * Covers all settings, cooldown system, rate limits, and practical examples
 */
import { useState } from "react";
import {
  BookOpen, Shield, Zap, Clock, BarChart3, Settings, Users,
  Package, AlertTriangle, ChevronDown, ChevronRight, Activity,
  Timer, Gauge, TrendingUp, TrendingDown, Target, Brain,
  ArrowRight, Info, CheckCircle2, XCircle, Minus
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DashboardLayout from "@/components/DashboardLayout";
import { motion, AnimatePresence } from "framer-motion";

/* ─── Collapsible Section ─── */
function Section({
  title,
  icon: Icon,
  children,
  defaultOpen = false,
  badge,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  defaultOpen?: boolean;
  badge?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card className="border-glow bg-card/80 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-secondary/20 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 border border-primary/30">
            <Icon className="h-4 w-4 text-primary" />
          </div>
          <span className="text-sm font-bold font-mono text-foreground">{title}</span>
          {badge && (
            <Badge variant="outline" className="text-[10px] border-primary/40 text-primary">
              {badge}
            </Badge>
          )}
        </div>
        {open ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <CardContent className="pt-0 pb-5 px-5 space-y-4">{children}</CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

/* ─── Info Box ─── */
function InfoBox({
  type = "info",
  children,
}: {
  type?: "info" | "warning" | "success" | "danger";
  children: React.ReactNode;
}) {
  const styles = {
    info: "bg-blue-500/5 border-blue-500/20 text-blue-400",
    warning: "bg-amber-500/5 border-amber-500/20 text-amber-400",
    success: "bg-emerald-500/5 border-emerald-500/20 text-emerald-400",
    danger: "bg-red-500/5 border-red-500/20 text-red-400",
  };
  const icons = {
    info: Info,
    warning: AlertTriangle,
    success: CheckCircle2,
    danger: XCircle,
  };
  const IconComp = icons[type];
  return (
    <div className={`flex gap-3 rounded-lg border p-3 text-xs leading-relaxed ${styles[type]}`}>
      <IconComp className="h-4 w-4 shrink-0 mt-0.5" />
      <div>{children}</div>
    </div>
  );
}

/* ─── Settings Table ─── */
function SettingsTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: (string | React.ReactNode)[][];
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border/50">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-secondary/30 border-b border-border/50">
            {headers.map((h, i) => (
              <th key={i} className="px-3 py-2.5 text-left font-mono text-primary uppercase tracking-wider text-[10px]">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-border/30 last:border-0 hover:bg-secondary/10 transition-colors">
              {row.map((cell, j) => (
                <td key={j} className="px-3 py-2.5 text-muted-foreground">
                  {typeof cell === "string" ? cell : cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ─── Cooldown Step ─── */
function CooldownStep({
  step,
  title,
  formula,
  example,
  controllable,
}: {
  step: number;
  title: string;
  formula: string;
  example: string;
  controllable: boolean;
}) {
  return (
    <div className="flex gap-3 items-start">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 border border-primary/30 text-primary text-xs font-bold font-mono">
        {step}
      </div>
      <div className="flex-1 space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-foreground">{title}</span>
          <Badge
            variant="outline"
            className={`text-[9px] ${controllable ? "border-emerald-500/40 text-emerald-400" : "border-amber-500/40 text-amber-400"}`}
          >
            {controllable ? "Configurable" : "Automatic"}
          </Badge>
        </div>
        <div className="font-mono text-[11px] bg-secondary/30 rounded-md px-3 py-1.5 text-primary/80 border border-border/30">
          {formula}
        </div>
        <p className="text-[11px] text-muted-foreground leading-relaxed">{example}</p>
      </div>
    </div>
  );
}

/* ─── Scenario Card ─── */
function ScenarioCard({
  title,
  target,
  risk,
  settings,
  result,
  icon: Icon,
}: {
  title: string;
  target: string;
  risk: "low" | "medium" | "high";
  settings: { name: string; value: string; reason: string }[];
  result: string;
  icon: React.ElementType;
}) {
  const riskColors = {
    low: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
    medium: "text-amber-400 bg-amber-500/10 border-amber-500/30",
    high: "text-red-400 bg-red-500/10 border-red-500/30",
  };
  return (
    <Card className="border-glow bg-card/80">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-mono flex items-center gap-2">
            <Icon className="h-4 w-4 text-primary" />
            {title}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] border-primary/40 text-primary">
              {target}
            </Badge>
            <Badge variant="outline" className={`text-[10px] ${riskColors[risk]}`}>
              {risk === "low" ? "Low Risk" : risk === "medium" ? "Medium Risk" : "High Risk"}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <SettingsTable
          headers={["Setting", "Value", "Reason"]}
          rows={settings.map((s) => [
            <span className="font-mono text-foreground font-medium">{s.name}</span>,
            <span className="font-mono text-primary">{s.value}</span>,
            s.reason,
          ])}
        />
        <div className="flex items-start gap-2 bg-primary/5 border border-primary/20 rounded-lg p-3">
          <Target className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <p className="text-xs text-foreground leading-relaxed">{result}</p>
        </div>
      </CardContent>
    </Card>
  );
}

/* ═══════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════ */
export default function UserManual() {
  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl">
        {/* Header */}
        <div>
          <h1 className="text-xl font-bold font-mono text-foreground flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            User Manual
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Complete guide to understanding and configuring Bodyguard — your intelligent message protection system
          </p>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="bg-secondary/30 border border-border/50 flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="overview" className="data-[state=active]:bg-primary/15 data-[state=active]:text-primary gap-1.5 text-xs">
              <Shield className="h-3.5 w-3.5" /> Overview
            </TabsTrigger>
            <TabsTrigger value="cooldown" className="data-[state=active]:bg-primary/15 data-[state=active]:text-primary gap-1.5 text-xs">
              <Clock className="h-3.5 w-3.5" /> Cooldown System
            </TabsTrigger>
            <TabsTrigger value="settings" className="data-[state=active]:bg-primary/15 data-[state=active]:text-primary gap-1.5 text-xs">
              <Settings className="h-3.5 w-3.5" /> All Settings
            </TabsTrigger>
            <TabsTrigger value="scenarios" className="data-[state=active]:bg-primary/15 data-[state=active]:text-primary gap-1.5 text-xs">
              <Target className="h-3.5 w-3.5" /> Scenarios
            </TabsTrigger>
            <TabsTrigger value="automation" className="data-[state=active]:bg-primary/15 data-[state=active]:text-primary gap-1.5 text-xs">
              <Brain className="h-3.5 w-3.5" /> Automation
            </TabsTrigger>
          </TabsList>

          {/* ═══ OVERVIEW TAB ═══ */}
          <TabsContent value="overview">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <Section title="What is Bodyguard?" icon={Shield} defaultOpen={true}>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Bodyguard is an intelligent command center for managing and protecting your WhatsApp messaging operations.
                  It ensures your messages are delivered safely and efficiently while protecting your accounts from being blocked.
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  The system works by controlling the speed and timing of message delivery through three interconnected systems:
                  <strong className="text-foreground"> Rate Limits</strong>, <strong className="text-foreground">Cooldown System</strong>,
                  and <strong className="text-foreground">Risk Analysis</strong>.
                </p>
              </Section>

              <Section title="How Messages Are Sent" icon={Zap} defaultOpen={true}>
                <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                  Every message goes through 3 stages before it's delivered:
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  {[
                    { label: "Distribution", desc: "Which profile sends this message?", icon: Users },
                    { label: "Cooldown", desc: "When should it be sent? (delay calculation)", icon: Timer },
                    { label: "Delivery", desc: "Actual sending via the messaging API", icon: Zap },
                  ].map((stage, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="flex-1 bg-secondary/30 rounded-lg border border-border/50 p-3 min-w-[180px]">
                        <div className="flex items-center gap-2 mb-1">
                          <stage.icon className="h-3.5 w-3.5 text-primary" />
                          <span className="text-xs font-mono font-bold text-foreground">{i + 1}. {stage.label}</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground">{stage.desc}</p>
                      </div>
                      {i < 2 && <ArrowRight className="h-4 w-4 text-primary/50 shrink-0" />}
                    </div>
                  ))}
                </div>
              </Section>

              <Section title="Core Concepts" icon={BookOpen} defaultOpen={true}>
                <div className="grid gap-3">
                  {[
                    {
                      title: "Rate Limits",
                      desc: "The maximum number of messages a profile can send in a specific time frame (per hour, per 3 hours, per day). These are hard caps that cannot be exceeded.",
                      icon: Gauge,
                    },
                    {
                      title: "Cooldown",
                      desc: "The actual time delay between each message for a specific profile. Calculated dynamically based on rate limits, queue pressure, risk score, and recent performance.",
                      icon: Timer,
                    },
                    {
                      title: "Risk Score",
                      desc: "A score from 0-100 calculated automatically for each profile. It analyzes failure rates, sending patterns, and block history. Higher scores mean higher risk of being blocked.",
                      icon: AlertTriangle,
                    },
                    {
                      title: "Queue Pressure",
                      desc: "The number of messages waiting to be sent. When the queue is large, the system adjusts its behavior based on Rush/Quiet mode settings.",
                      icon: Activity,
                    },
                  ].map((concept) => (
                    <div key={concept.title} className="flex gap-3 bg-secondary/20 rounded-lg border border-border/30 p-3">
                      <concept.icon className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <div>
                        <span className="text-xs font-bold text-foreground">{concept.title}</span>
                        <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">{concept.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            </motion.div>
          </TabsContent>

          {/* ═══ COOLDOWN SYSTEM TAB ═══ */}
          <TabsContent value="cooldown">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <Section title="How Cooldown is Calculated" icon={Clock} defaultOpen={true} badge="6 Steps">
                <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                  The cooldown (time between messages) is calculated in 6 sequential steps. Each step modifies the result
                  of the previous one. Understanding these steps is key to controlling your sending speed.
                </p>

                <div className="space-y-4">
                  <CooldownStep
                    step={1}
                    title="Base Cooldown"
                    formula="base = (24 - freeze_hours) × 60 ÷ max_per_day × 60 seconds"
                    example="Example: freeze=4, per_day=600 → (24-4)×60÷600×60 = 120 seconds (2 minutes). Increase Per Day to make this faster."
                    controllable={true}
                  />
                  <CooldownStep
                    step={2}
                    title="Randomization (±50%)"
                    formula="cooldown = random(base × 0.5, base × 1.5)"
                    example="Example: base=120s → result between 60s and 180s. This mimics human behavior and cannot be configured."
                    controllable={false}
                  />
                  <CooldownStep
                    step={3}
                    title="Queue Pressure"
                    formula="cooldown = cooldown × queue_multiplier"
                    example="Quiet mode (≤5 msgs): ×0.5 (faster) | Normal: ×1.0 | Rush (>10 msgs): ×2.0 (slower) | Critical (≥21): ×3.0"
                    controllable={true}
                  />
                  <CooldownStep
                    step={4}
                    title="2-Hour Trend Analysis"
                    formula="cooldown = cooldown × trend_multiplier"
                    example="Sent too many: ×1.3 (slow down) | Sent too few: ×0.8 (speed up) | On target: ×1.0. Automatic protection."
                    controllable={false}
                  />
                  <CooldownStep
                    step={5}
                    title="Risk Score Adjustment"
                    formula="cooldown = cooldown × risk_multiplier"
                    example="Risk >80: ×2.0 | Risk >50: ×1.5 | Risk >20: ×1.2 | Risk ≤20: ×1.0. Based on profile health."
                    controllable={false}
                  />
                  <CooldownStep
                    step={6}
                    title="Final Clamp"
                    formula="cooldown = max(60, min(cooldown, 2400))"
                    example="Minimum: 60 seconds (1 minute). Maximum: 2400 seconds (40 minutes). Hard limits that cannot be exceeded."
                    controllable={false}
                  />
                </div>
              </Section>

              <Section title="Full Calculation Example" icon={BarChart3} defaultOpen={true}>
                <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                  Here's a complete example showing how the cooldown is calculated step by step for a profile with
                  <span className="font-mono text-primary"> Per Day = 600</span>,
                  <span className="font-mono text-primary"> Freeze = 4 hours</span>,
                  <span className="font-mono text-primary"> Rush Multiplier = 2.0</span>, and
                  <span className="font-mono text-primary"> Risk Score = 0</span>:
                </p>
                <SettingsTable
                  headers={["Step", "Calculation", "Result"]}
                  rows={[
                    [
                      <span className="font-mono text-foreground">1. Base</span>,
                      <span className="font-mono">(24-4)×60÷600×60</span>,
                      <span className="font-mono text-primary">120 seconds</span>,
                    ],
                    [
                      <span className="font-mono text-foreground">2. Random</span>,
                      <span className="font-mono">random(60, 180)</span>,
                      <span className="font-mono text-primary">~120 seconds</span>,
                    ],
                    [
                      <span className="font-mono text-foreground">3. Queue (Normal)</span>,
                      <span className="font-mono">120 × 1.0</span>,
                      <span className="font-mono text-primary">120 seconds</span>,
                    ],
                    [
                      <span className="font-mono text-foreground">4. Trend (On target)</span>,
                      <span className="font-mono">120 × 1.0</span>,
                      <span className="font-mono text-primary">120 seconds</span>,
                    ],
                    [
                      <span className="font-mono text-foreground">5. Risk (Score=0)</span>,
                      <span className="font-mono">120 × 1.0</span>,
                      <span className="font-mono text-primary">120 seconds</span>,
                    ],
                    [
                      <span className="font-mono text-foreground">6. Clamp</span>,
                      <span className="font-mono">max(60, min(120, 2400))</span>,
                      <span className="font-mono text-emerald-400 font-bold">120 seconds = 2 min</span>,
                    ],
                  ]}
                />

                <InfoBox type="info">
                  <strong>Time Estimation Formula:</strong> Total Time = (Number of Messages ÷ Number of Profiles) × Average Cooldown.
                  <br />
                  Example: 100 messages with 2 profiles and ~120s cooldown = (100÷2)×120 = 6,000 seconds ≈ <strong>1 hour 40 minutes</strong>.
                </InfoBox>
              </Section>

              <Section title="Queue Modes Explained" icon={Activity}>
                <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                  The queue mode is determined by the number of messages waiting to be sent. Each mode applies a different
                  multiplier to the cooldown, directly affecting sending speed.
                </p>
                <SettingsTable
                  headers={["Mode", "Condition", "Multiplier", "Effect"]}
                  rows={[
                    [
                      <Badge variant="outline" className="text-[9px] border-emerald-500/40 text-emerald-400">Quiet</Badge>,
                      <span className="font-mono">queue ≤ Quiet Threshold</span>,
                      <span className="font-mono text-emerald-400">× Quiet Multiplier (0.5)</span>,
                      "Cooldown is halved — sends faster",
                    ],
                    [
                      <Badge variant="outline" className="text-[9px] border-blue-500/40 text-blue-400">Normal</Badge>,
                      <span className="font-mono">between thresholds</span>,
                      <span className="font-mono text-blue-400">× 1.0</span>,
                      "No change — standard speed",
                    ],
                    [
                      <Badge variant="outline" className="text-[9px] border-amber-500/40 text-amber-400">Rush Hour</Badge>,
                      <span className="font-mono">queue &gt; Rush Threshold</span>,
                      <span className="font-mono text-amber-400">× Rush Multiplier (2.0)</span>,
                      "Cooldown is doubled — sends slower",
                    ],
                    [
                      <Badge variant="outline" className="text-[9px] border-red-500/40 text-red-400">Critical</Badge>,
                      <span className="font-mono">queue ≥ 21</span>,
                      <span className="font-mono text-red-400">× 3.0 (fixed)</span>,
                      "Cooldown is tripled — emergency slowdown",
                    ],
                  ]}
                />
                <InfoBox type="warning">
                  <strong>Important:</strong> A multiplier <strong>greater than 1</strong> makes sending <strong>slower</strong> (longer cooldown).
                  A multiplier <strong>less than 1</strong> makes sending <strong>faster</strong> (shorter cooldown).
                  Set Rush Multiplier below 1.0 if you want to speed up during high queue pressure (risky!).
                </InfoBox>
              </Section>
            </motion.div>
          </TabsContent>

          {/* ═══ ALL SETTINGS TAB ═══ */}
          <TabsContent value="settings">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <Section title="Global System Settings" icon={Settings} defaultOpen={true} badge="Settings Page">
                <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                  These settings are found in the <strong className="text-foreground">Settings</strong> page from the main menu.
                  They apply to the entire system.
                </p>
                <SettingsTable
                  headers={["Setting", "Default", "Description", "↑ Increase", "↓ Decrease"]}
                  rows={[
                    [
                      <span className="font-mono text-foreground font-medium">Min Cooldown</span>,
                      <span className="font-mono text-primary">300s</span>,
                      "Absolute minimum delay between messages",
                      <span className="text-emerald-400">Safer (slower)</span>,
                      <span className="text-amber-400">Faster (riskier)</span>,
                    ],
                    [
                      <span className="font-mono text-foreground font-medium">Max Cooldown</span>,
                      <span className="font-mono text-primary">900s</span>,
                      "Absolute maximum delay between messages",
                      <span className="text-emerald-400">Safer (slower)</span>,
                      <span className="text-amber-400">Faster (riskier)</span>,
                    ],
                    [
                      <span className="font-mono text-foreground font-medium">Max Daily Messages</span>,
                      <span className="font-mono text-primary">500</span>,
                      "Global cap on total daily messages from all profiles",
                      <span className="text-amber-400">More messages</span>,
                      <span className="text-emerald-400">Fewer messages</span>,
                    ],
                    [
                      <span className="font-mono text-foreground font-medium">Risk Alert Threshold</span>,
                      <span className="font-mono text-primary">60</span>,
                      "Risk score that triggers an alert (0-100)",
                      <span className="text-amber-400">Less alerts</span>,
                      <span className="text-emerald-400">More alerts</span>,
                    ],
                    [
                      <span className="font-mono text-foreground font-medium">Active Hours</span>,
                      <span className="font-mono text-primary">04:00–00:00</span>,
                      "Time window for sending messages",
                      "N/A",
                      "N/A",
                    ],
                  ]}
                />
              </Section>

              <Section title="Package Rate Limits" icon={Package} defaultOpen={true} badge="Package Settings">
                <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                  These settings are found in <strong className="text-foreground">Packages → [Package] → Limits & Settings → Edit Settings</strong>.
                  They control the behavior of all profiles within a specific package.
                </p>
                <SettingsTable
                  headers={["Setting", "Default", "Description", "↑ Increase", "↓ Decrease"]}
                  rows={[
                    [
                      <span className="font-mono text-foreground font-medium">Per Hour</span>,
                      <span className="font-mono text-primary">30</span>,
                      "Max messages per profile per hour",
                      <span className="text-amber-400">Higher hourly throughput</span>,
                      <span className="text-emerald-400">Lower hourly throughput</span>,
                    ],
                    [
                      <span className="font-mono text-foreground font-medium">Per 3 Hours</span>,
                      <span className="font-mono text-primary">90</span>,
                      "Max messages per profile per 3 hours",
                      <span className="text-amber-400">Higher throughput</span>,
                      <span className="text-emerald-400">Lower throughput</span>,
                    ],
                    [
                      <span className="font-mono text-foreground font-medium">Per Day ★</span>,
                      <span className="font-mono text-primary">600</span>,
                      "THE most important setting — defines base cooldown speed",
                      <span className="text-amber-400">Base cooldown DECREASES (faster)</span>,
                      <span className="text-emerald-400">Base cooldown INCREASES (slower)</span>,
                    ],
                    [
                      <span className="font-mono text-foreground font-medium">Concurrent Sends</span>,
                      <span className="font-mono text-primary">4</span>,
                      "Messages sent simultaneously across profiles",
                      <span className="text-amber-400">More parallelism</span>,
                      <span className="text-emerald-400">Less parallelism</span>,
                    ],
                    [
                      <span className="font-mono text-foreground font-medium">Freeze Duration</span>,
                      <span className="font-mono text-primary">4 hrs</span>,
                      "Hours a profile is paused after auto-pause",
                      "Longer penalty",
                      "Shorter penalty",
                    ],
                  ]}
                />
                <InfoBox type="info">
                  <strong>Per Day is the key setting.</strong> It directly controls the base cooldown formula:
                  <span className="font-mono"> base = (24 - freeze_hours) × 60 ÷ per_day × 60 seconds</span>.
                  Doubling Per Day will halve the base cooldown.
                </InfoBox>
              </Section>

              <Section title="Queue & Speed Settings" icon={Gauge} badge="Package Settings">
                <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                  These settings control how the system reacts to queue pressure. Found in the same Package settings area.
                </p>
                <SettingsTable
                  headers={["Setting", "Default", "Description", "↑ Increase", "↓ Decrease"]}
                  rows={[
                    [
                      <span className="font-mono text-foreground font-medium">Rush Threshold</span>,
                      <span className="font-mono text-primary">10</span>,
                      "Queue size to activate Rush Hour mode",
                      "Needs more messages to activate",
                      "Activates with fewer messages",
                    ],
                    [
                      <span className="font-mono text-foreground font-medium">Rush Multiplier</span>,
                      <span className="font-mono text-primary">2.0</span>,
                      "Cooldown multiplier during Rush Hour",
                      <span className="text-emerald-400">Slower during rush (safer)</span>,
                      <span className="text-amber-400">Faster during rush (riskier)</span>,
                    ],
                    [
                      <span className="font-mono text-foreground font-medium">Quiet Threshold</span>,
                      <span className="font-mono text-primary">5</span>,
                      "Queue size to activate Quiet mode",
                      "Activates more easily",
                      "Requires nearly empty queue",
                    ],
                    [
                      <span className="font-mono text-foreground font-medium">Quiet Multiplier</span>,
                      <span className="font-mono text-primary">0.5</span>,
                      "Cooldown multiplier during Quiet mode",
                      <span className="text-emerald-400">Less speed-up in quiet</span>,
                      <span className="text-amber-400">More speed-up in quiet</span>,
                    ],
                  ]}
                />
              </Section>

              <Section title="Per-Profile Overrides" icon={Users} badge="Profile Settings">
                <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                  You can override package-level settings for individual profiles. This is useful when you have a mix of new and old accounts.
                  Found in <strong className="text-foreground">Packages → [Package] → Profiles tab → ⚙️ icon</strong>.
                </p>
                <SettingsTable
                  headers={["Setting", "Package Value", "Profile Override", "Used Value"]}
                  rows={[
                    [
                      <span className="font-mono text-foreground">Per Hour</span>,
                      <span className="font-mono">30</span>,
                      <span className="font-mono text-primary">50</span>,
                      <span className="font-mono text-emerald-400 font-bold">50 (Profile)</span>,
                    ],
                    [
                      <span className="font-mono text-foreground">Per 3 Hours</span>,
                      <span className="font-mono">90</span>,
                      <span className="font-mono text-muted-foreground italic">(empty)</span>,
                      <span className="font-mono text-blue-400 font-bold">90 (Package)</span>,
                    ],
                    [
                      <span className="font-mono text-foreground">Per Day</span>,
                      <span className="font-mono">600</span>,
                      <span className="font-mono text-primary">200</span>,
                      <span className="font-mono text-emerald-400 font-bold">200 (Profile)</span>,
                    ],
                  ]}
                />
                <InfoBox type="success">
                  <strong>Tip:</strong> Use per-profile overrides to give older, trusted accounts higher limits while keeping
                  new accounts at safer, lower limits. This maximizes throughput while protecting your newer accounts.
                </InfoBox>
              </Section>
            </motion.div>
          </TabsContent>

          {/* ═══ SCENARIOS TAB ═══ */}
          <TabsContent value="scenarios">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <ScenarioCard
                title="Safe & Steady"
                target="~100 msgs/day"
                risk="low"
                icon={Shield}
                settings={[
                  { name: "Per Day", value: "100", reason: "Slow base cooldown of ~12 minutes" },
                  { name: "Per Hour", value: "10", reason: "Prevents short bursts of activity" },
                  { name: "Per 3 Hours", value: "25", reason: "Reinforces the slow and steady pace" },
                  { name: "Rush Multiplier", value: "3.0", reason: "Heavily slows down if queue builds up" },
                  { name: "Quiet Multiplier", value: "1.0", reason: "No speed-up in quiet mode — always careful" },
                  { name: "Auto-Adjust", value: "Enabled", reason: "Let the system find optimal safe speed" },
                  { name: "Auto-Pause", value: "Enabled", reason: "Immediately stops troubled profiles" },
                ]}
                result="Average cooldown: ~10-15 minutes between messages. The system will feel slow, but this is intentional to build trust and avoid blocks. Ideal for new accounts or when safety is the top priority."
              />

              <ScenarioCard
                title="Balanced Performance"
                target="~500 msgs/day"
                risk="medium"
                icon={Activity}
                settings={[
                  { name: "Per Day", value: "500", reason: "Moderate base cooldown of ~2.4 minutes" },
                  { name: "Per Hour", value: "40", reason: "Allows reasonable hourly throughput" },
                  { name: "Per 3 Hours", value: "100", reason: "Balanced 3-hour window" },
                  { name: "Rush Multiplier", value: "1.5", reason: "Moderate slowdown during high queue" },
                  { name: "Quiet Multiplier", value: "0.7", reason: "Slight speed-up when queue is low" },
                  { name: "Auto-Adjust", value: "Enabled", reason: "System self-optimizes over time" },
                  { name: "Auto-Pause", value: "Enabled", reason: "Safety net for problematic profiles" },
                ]}
                result="Average cooldown: ~2-4 minutes between messages. Good balance between speed and safety. Suitable for accounts that are at least 3 months old with a clean history."
              />

              <ScenarioCard
                title="High Throughput"
                target="~1000 msgs/day"
                risk="high"
                icon={Zap}
                settings={[
                  { name: "Per Day", value: "1000", reason: "Aggressive base cooldown of ~1.2 minutes" },
                  { name: "Per Hour", value: "80", reason: "Very high hourly sending rate" },
                  { name: "Per 3 Hours", value: "200", reason: "Accommodates the high daily limit" },
                  { name: "Rush Multiplier", value: "0.8", reason: "Speeds up during high queue pressure" },
                  { name: "Quiet Multiplier", value: "0.5", reason: "Further speeds up when queue is small" },
                  { name: "Auto-Adjust", value: "Enabled", reason: "Critical — auto-throttles if performance degrades" },
                  { name: "Auto-Pause", value: "Enabled", reason: "Your only safety net — must be enabled" },
                ]}
                result="Average cooldown: ~1-3 minutes between messages. Very fast but high risk of blocks. Only use for mature, trusted accounts (6+ months old). Monitor the Alerts page closely."
              />

              <Section title="Time Estimation Calculator" icon={Timer} defaultOpen={true}>
                <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                  Use this formula to estimate how long it will take to send all your messages:
                </p>
                <div className="bg-secondary/30 rounded-lg border border-border/50 p-4 font-mono text-center">
                  <p className="text-xs text-muted-foreground mb-2">Total Time =</p>
                  <p className="text-sm text-primary">(Number of Messages ÷ Number of Profiles) × Average Cooldown</p>
                </div>
                <SettingsTable
                  headers={["Messages", "Profiles", "Avg Cooldown", "Estimated Time"]}
                  rows={[
                    [
                      <span className="font-mono text-foreground">100</span>,
                      <span className="font-mono">2</span>,
                      <span className="font-mono">120s (2 min)</span>,
                      <span className="font-mono text-primary font-bold">~1 hour 40 min</span>,
                    ],
                    [
                      <span className="font-mono text-foreground">100</span>,
                      <span className="font-mono">5</span>,
                      <span className="font-mono">120s (2 min)</span>,
                      <span className="font-mono text-primary font-bold">~40 min</span>,
                    ],
                    [
                      <span className="font-mono text-foreground">500</span>,
                      <span className="font-mono">3</span>,
                      <span className="font-mono">120s (2 min)</span>,
                      <span className="font-mono text-primary font-bold">~5 hours 33 min</span>,
                    ],
                    [
                      <span className="font-mono text-foreground">1000</span>,
                      <span className="font-mono">5</span>,
                      <span className="font-mono">72s (1.2 min)</span>,
                      <span className="font-mono text-primary font-bold">~4 hours</span>,
                    ],
                    [
                      <span className="font-mono text-foreground">1000</span>,
                      <span className="font-mono">10</span>,
                      <span className="font-mono">72s (1.2 min)</span>,
                      <span className="font-mono text-primary font-bold">~2 hours</span>,
                    ],
                  ]}
                />
                <InfoBox type="info">
                  Adding more profiles is the most effective way to increase throughput without increasing risk.
                  Each profile acts as an independent sending channel.
                </InfoBox>
              </Section>
            </motion.div>
          </TabsContent>

          {/* ═══ AUTOMATION TAB ═══ */}
          <TabsContent value="automation">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <Section title="Auto-Adjust Limits" icon={Brain} defaultOpen={true} badge="Every 6 Hours">
                <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                  When enabled, Bodyguard's AI analyzes the performance of each package every <strong className="text-foreground">6 hours</strong> and
                  automatically adjusts the rate limits based on the success rate.
                </p>

                <SettingsTable
                  headers={["Condition", "Action", "Details"]}
                  rows={[
                    [
                      <span className="text-emerald-400 font-medium">Success Rate &gt; 98%</span>,
                      <span className="font-mono text-emerald-400">+10% increase</span>,
                      "Performance is excellent — safely increase limits to send faster",
                    ],
                    [
                      <span className="text-amber-400 font-medium">Success Rate &lt; 85%</span>,
                      <span className="font-mono text-amber-400">-15% decrease</span>,
                      "Performance is degrading — slow down to protect accounts",
                    ],
                    [
                      <span className="text-red-400 font-medium">&gt;30% profiles paused</span>,
                      <span className="font-mono text-red-400">Additional -20%</span>,
                      "Critical situation — aggressive slowdown to prevent more blocks",
                    ],
                  ]}
                />

                <InfoBox type="info">
                  The 6-hour interval prevents the system from over-reacting. Before this safeguard, the system could
                  reduce limits from 80/hr to 5/hr in just 7 minutes due to rapid cascading reductions every 30 seconds.
                </InfoBox>

                <div className="space-y-2 mt-3">
                  <h4 className="text-xs font-mono text-primary uppercase tracking-wider">Safety Bounds</h4>
                  <SettingsTable
                    headers={["Limit", "Maximum (Auto-Adjust)", "Minimum (Auto-Adjust)"]}
                    rows={[
                      [
                        <span className="font-mono text-foreground">Per Hour</span>,
                        <span className="font-mono text-primary">40</span>,
                        <span className="font-mono text-amber-400">5</span>,
                      ],
                      [
                        <span className="font-mono text-foreground">Per 3 Hours</span>,
                        <span className="font-mono text-primary">90</span>,
                        <span className="font-mono text-amber-400">10</span>,
                      ],
                      [
                        <span className="font-mono text-foreground">Per Day</span>,
                        <span className="font-mono text-primary">240</span>,
                        <span className="font-mono text-amber-400">30</span>,
                      ],
                    ]}
                  />
                </div>

                <InfoBox type="warning">
                  <strong>When to disable Auto-Adjust:</strong> Disable it during initial testing or when you want full manual
                  control over your limits. When disabled, your manually set limits will never be changed automatically.
                </InfoBox>
              </Section>

              <Section title="Auto-Pause on Failures" icon={AlertTriangle} defaultOpen={true}>
                <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                  When enabled, a profile will be automatically paused if it hits too many failures. This is a critical safety
                  feature that isolates problematic accounts before they get permanently blocked.
                </p>
                <SettingsTable
                  headers={["Setting", "Default", "Description"]}
                  rows={[
                    [
                      <span className="font-mono text-foreground font-medium">Failure Threshold</span>,
                      <span className="font-mono text-primary">5</span>,
                      "Number of consecutive failures before auto-pause activates",
                    ],
                    [
                      <span className="font-mono text-foreground font-medium">Success Rate Threshold</span>,
                      <span className="font-mono text-primary">70%</span>,
                      "If the success rate drops below this, auto-pause activates",
                    ],
                    [
                      <span className="font-mono text-foreground font-medium">Freeze Duration</span>,
                      <span className="font-mono text-primary">4 hours</span>,
                      "How long the profile stays paused before resuming",
                    ],
                  ]}
                />
                <InfoBox type="danger">
                  <strong>Never disable Auto-Pause when using high throughput settings.</strong> It is your last line of defense
                  against permanent account blocks. Without it, a failing profile will continue sending and accumulate blocks.
                </InfoBox>
              </Section>

              <Section title="Distribution Modes" icon={Users}>
                <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                  When you send a message to multiple recipients, Bodyguard needs to decide which profile sends each message.
                  The distribution mode controls this decision.
                </p>
                <SettingsTable
                  headers={["Mode", "Description", "Best For"]}
                  rows={[
                    [
                      <span className="font-mono text-foreground font-medium">Round Robin</span>,
                      "Simple, equal rotation between all active profiles",
                      "Equal distribution, simple setup",
                    ],
                    [
                      <span className="font-mono text-foreground font-medium">Random</span>,
                      "Randomly selects a profile for each message",
                      "Variety in sending patterns",
                    ],
                    [
                      <span className="font-mono text-foreground font-medium">Weighted</span>,
                      "Distributes based on weight assigned to each profile",
                      "Favoring specific profiles",
                    ],
                    [
                      <span className="font-mono text-foreground font-medium">Smart ★</span>,
                      "Analyzes health, risk, capacity, age, and success rate to pick the best profile",
                      <span className="text-emerald-400 font-medium">Best protection — Recommended</span>,
                    ],
                  ]}
                />
                <InfoBox type="success">
                  <strong>Smart Mode</strong> is the recommended distribution mode. It considers 5 factors: Health Score,
                  Risk Score, Available Capacity, Success Rate, and Account Age to make the optimal choice for every message.
                </InfoBox>
              </Section>

              <Section title="Retry Failed Messages" icon={Activity}>
                <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                  When enabled, messages that fail to send will be automatically retried with exponential backoff
                  (each retry waits longer than the previous one).
                </p>
                <SettingsTable
                  headers={["Setting", "Default", "Description"]}
                  rows={[
                    [
                      <span className="font-mono text-foreground font-medium">Retry Enabled</span>,
                      <span className="font-mono text-primary">Yes</span>,
                      "Whether to retry failed messages automatically",
                    ],
                    [
                      <span className="font-mono text-foreground font-medium">Max Retry Attempts</span>,
                      <span className="font-mono text-primary">3</span>,
                      "Maximum number of retry attempts before marking as permanently failed",
                    ],
                  ]}
                />
              </Section>
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
