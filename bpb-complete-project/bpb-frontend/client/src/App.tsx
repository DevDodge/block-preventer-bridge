import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Packages from "./pages/Packages";
import PackageDetail from "./pages/PackageDetail";
import Profiles from "./pages/Profiles";
import Messages from "./pages/Messages";
import Analytics from "./pages/Analytics";
import Alerts from "./pages/Alerts";
import Settings from "./pages/Settings";
import UserManual from "./pages/UserManual";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/packages"} component={Packages} />
      <Route path={"/packages/:id"} component={PackageDetail} />
      <Route path={"/profiles"} component={Profiles} />
      <Route path={"/messages"} component={Messages} />
      <Route path={"/analytics"} component={Analytics} />
      <Route path={"/alerts"} component={Alerts} />
      <Route path={"/settings"} component={Settings} />
      <Route path={"/manual"} component={UserManual} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster
            theme="dark"
            toastOptions={{
              style: {
                background: "oklch(0.15 0.015 250)",
                border: "1px solid oklch(0.25 0.015 250)",
                color: "oklch(0.88 0.01 250)",
              },
            }}
          />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
