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
import { useAuth } from "@/hooks/useAuth";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import DailyBriefing from "@/pages/DailyBriefing";
import WealthDashboard from "@/pages/WealthDashboard";
import WealthMonitor from "@/pages/WealthMonitor";
import ProductivityHub from "@/pages/ProductivityHub";
import HealthMonitoring from "@/pages/HealthMonitoring";
import Web3Wallets from "@/pages/Web3Wallets";
import EmailManager from "@/pages/EmailManager";
import RoutineBuilder from "@/pages/RoutineBuilder";
import Notepad from "@/pages/Notepad";
import AIIntelligence from "@/pages/AIIntelligence";
import ReceiptManager from "@/pages/ReceiptManager";
import Guide from "@/pages/Guide";
import Settings from "@/pages/Settings";
import LearnPage from "@/pages/LearnPage";
import Videos from "@/pages/Videos";
import Wallet from "@/pages/Wallet";
import Terminal from "@/pages/Terminal";
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
          <Route path="/productivity" component={ProductivityHub} />
          <Route path="/health" component={HealthMonitoring} />
          <Route path="/wallets" component={Web3Wallets} />
          <Route path="/email" component={EmailManager} />
          <Route path="/routine" component={RoutineBuilder} />
          <Route path="/notepad" component={Notepad} />
          <Route path="/ai-intelligence" component={AIIntelligence} />
          <Route path="/receipts" component={ReceiptManager} />
          <Route path="/videos" component={Videos} />
          <Route path="/terminal" component={Terminal} />
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
          <TooltipProvider>
            <AppContent />
            <Toaster />
          </TooltipProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
