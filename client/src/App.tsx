import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Calculator } from "@/components/Calculator";
import { WebSearchBar } from "@/components/WebSearchBar";
import { ChatGPT } from "@/components/ChatGPT";
import { TimeDate } from "@/components/TimeDate";
import { OnlineStatus } from "@/components/OnlineStatus";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ViewModeProvider } from "@/components/ViewModeProvider";
import { ViewModeSwitcher } from "@/components/ViewModeSwitcher";
import { useAuth } from "@/hooks/useAuth";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import DailyBriefing from "@/pages/DailyBriefing";
import WealthDashboard from "@/pages/WealthDashboard";
import WealthMonitor from "@/pages/WealthMonitor";
import ProductivityHubConsolidated from "@/pages/ProductivityHubConsolidated";
import HealthMonitoring from "@/pages/HealthMonitoring";
import AIIntelligence from "@/pages/AIIntelligence";
import Guide from "@/pages/Guide";
import Settings from "@/pages/Settings";
import LearnPage from "@/pages/LearnPage";
import Wallet from "@/pages/Wallet";
import NotFound from "@/pages/not-found";
import type { User } from "@shared/schema";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Switch>
      {!isAuthenticated ? (
        <>
          <Route path="/" component={Landing} />
          <Route path="/login" component={Login} />
        </>
      ) : (
        <>
          <Route path="/" component={DailyBriefing} />
          <Route path="/login" component={Login} />
          <Route path="/wallet" component={Wallet} />
          <Route path="/wealth" component={WealthDashboard} />
          <Route path="/wealth-monitor" component={WealthMonitor} />
          <Route path="/notepad" component={ProductivityHubConsolidated} />
          <Route path="/health" component={HealthMonitoring} />
          <Route path="/ai-intelligence" component={AIIntelligence} />
          <Route path="/guide" component={Guide} />
          <Route path="/settings" component={Settings} />
          <Route path="/learn/:slug" component={LearnPage} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function AuthenticatedApp() {
  const { user } = useAuth() as { user: User };
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1">
          <header className="flex items-center justify-between gap-4 p-4 border-b border-border">
            <div className="flex items-center gap-3 flex-shrink-0">
              <SidebarTrigger data-testid="button-sidebar-toggle" className="!h-9 !w-9" />
              <TimeDate />
            </div>
            <div className="flex-1 max-w-2xl mx-auto">
              <WebSearchBar compact />
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <OnlineStatus />
              <ChatGPT />
              <Calculator />
              <ThemeToggle />
            </div>
          </header>
          <main className="flex-1 overflow-auto p-6">
            <Router />
          </main>
          <footer className="border-t border-border p-4 flex items-center justify-between bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="text-sm text-muted-foreground">
              © 2025 Wealth Automation Platform
            </div>
            <ViewModeSwitcher />
          </footer>
        </div>
      </div>
    </SidebarProvider>
  );
}

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return isAuthenticated ? <AuthenticatedApp /> : <Router />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider defaultTheme="dark">
          <ViewModeProvider>
            <TooltipProvider>
              <AppContent />
              <Toaster />
            </TooltipProvider>
          </ViewModeProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
