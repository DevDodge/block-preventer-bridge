/**
 * DashboardLayout - Command Center layout with sidebar + top bar
 * Design: Dark theme, teal accents, circuit-board aesthetic
 */
import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Package,
  Users,
  MessageSquare,
  BarChart3,
  Bell,
  Settings,
  Shield,
  ChevronLeft,
  ChevronRight,
  Activity,
  Zap,
  BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { alertsApi } from "@/lib/api";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { path: "/", icon: LayoutDashboard, label: "Dashboard", shortLabel: "Dash" },
  { path: "/packages", icon: Package, label: "Packages", shortLabel: "Pkg" },
  { path: "/profiles", icon: Users, label: "Profiles", shortLabel: "Prof" },
  { path: "/messages", icon: MessageSquare, label: "Messages", shortLabel: "Msg" },
  { path: "/analytics", icon: BarChart3, label: "Analytics", shortLabel: "Stats" },
  { path: "/alerts", icon: Bell, label: "Alerts", shortLabel: "Alert" },
  { path: "/settings", icon: Settings, label: "Settings", shortLabel: "Set" },
  { path: "/manual", icon: BookOpen, label: "User Manual", shortLabel: "Help" },
];

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [location] = useLocation();
  const [alertCount, setAlertCount] = useState(0);

  useEffect(() => {
    const fetchAlertCount = async () => {
      try {
        const data = await alertsApi.count();
        setAlertCount(data.unread_count || 0);
      } catch (err) {
        console.error("Failed to fetch alert count", err);
        setAlertCount(0);
      }
    };

    fetchAlertCount();
    // Poll for new alerts every 30 seconds
    const interval = setInterval(fetchAlertCount, 30000);
    return () => clearInterval(interval);
  }, [location]);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          "relative flex flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300 ease-out",
          collapsed ? "w-16" : "w-60"
        )}
      >
        {/* Logo area */}
        <div className="flex h-16 items-center border-b border-sidebar-border px-4">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 border border-primary/30">
              <Shield className="h-4 w-4 text-primary" />
            </div>
            {!collapsed && (
              <div className="flex flex-col overflow-hidden">
                <span className="truncate text-sm font-bold font-mono text-foreground tracking-tight">
                  BPB
                </span>
                <span className="truncate text-[10px] text-muted-foreground tracking-wider uppercase">
                  Command Center
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
          {navItems.map((item) => {
            const isActive = location === item.path || (item.path !== "/" && location.startsWith(item.path));
            const Icon = item.icon;

            return collapsed ? (
              <Tooltip key={item.path} delayDuration={0}>
                <TooltipTrigger asChild>
                  <Link href={item.path}>
                    <div
                      className={cn(
                        "flex h-10 w-full items-center justify-center rounded-md transition-all duration-150",
                        isActive
                          ? "bg-primary/15 text-primary border border-primary/30 glow-teal-sm"
                          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label === "Alerts" && alertCount > 0 && (
                        <div className="absolute top-2 right-2 h-2 w-2 rounded-full bg-destructive" />
                      )}
                    </div>
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right" className="bg-popover text-popover-foreground border-border">
                  {item.label}
                </TooltipContent>
              </Tooltip>
            ) : (
              <Link key={item.path} href={item.path}>
                <div
                  className={cn(
                    "flex h-10 items-center gap-3 rounded-md px-3 text-sm transition-all duration-150",
                    isActive
                      ? "bg-primary/15 text-primary border border-primary/30 glow-teal-sm font-medium"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                  {item.label === "Alerts" && alertCount > 0 && (
                    <Badge variant="destructive" className="ml-auto h-5 px-1.5 text-[10px]">
                      {alertCount > 99 ? "99+" : alertCount}
                    </Badge>
                  )}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* System status */}
        <div className="border-t border-sidebar-border p-3">
          {!collapsed && (
            <div className="flex items-center gap-2 rounded-md bg-emerald/5 border border-emerald/20 px-3 py-2">
              <Activity className="h-3.5 w-3.5 text-emerald status-pulse" />
              <span className="text-xs text-emerald font-mono">System Online</span>
            </div>
          )}
          {collapsed && (
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <div className="flex justify-center">
                  <Activity className="h-4 w-4 text-emerald status-pulse" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="right">System Online</TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors z-10"
        >
          {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
        </button>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-14 items-center justify-between border-b border-border bg-card/50 backdrop-blur-sm px-6">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            <span className="text-sm font-mono text-muted-foreground">
              Block Preventer Bridge
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-emerald status-pulse" />
              <span>API Connected</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
