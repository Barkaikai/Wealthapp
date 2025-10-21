import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Calculator } from "@/components/Calculator";
import { WebSearchBar } from "@/components/WebSearchBar";
import { ChatGPT } from "@/components/ChatGPT";
import { TimeDate } from "@/components/TimeDate";
import { OnlineStatus } from "@/components/OnlineStatus";
import { ConnectionStatus } from "@/components/ConnectionStatus";
import { BluetoothConnect } from "@/components/BluetoothConnect";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ViewModeProvider } from "@/components/ViewModeProvider";
import { ViewModeSwitcher } from "@/components/ViewModeSwitcher";
import { DigitalCalendar } from "@/components/DigitalCalendar";
import { useAuth } from "@/hooks/useAuth";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import { useState, useEffect, Suspense, lazy } from "react";
import { useLocation } from "wouter";
import { CalendarDays, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import luxuryBackground from "@assets/stock_images/luxury_villa_mansion_f81fdf36.jpg";
import type { User } from "@shared/schema";

// Lazy-loaded page components for better performance
const Landing = lazy(() => import("@/pages/Landing"));
const Login = lazy(() => import("@/pages/Login"));
const DailyBriefing = lazy(() => import("@/pages/DailyBriefing"));
const WealthDashboard = lazy(() => import("@/pages/WealthDashboard"));
const WealthMonitor = lazy(() => import("@/pages/WealthMonitor"));
const ProductivityHubConsolidated = lazy(() => import("@/pages/ProductivityHubConsolidated"));
const HealthMonitoring = lazy(() => import("@/pages/HealthMonitoring"));
const AIIntelligence = lazy(() => import("@/pages/AIIntelligence"));
const Guide = lazy(() => import("@/pages/Guide"));
const Settings = lazy(() => import("@/pages/Settings"));
const LearnPage = lazy(() => import("@/pages/LearnPage"));
const Wallet = lazy(() => import("@/pages/Wallet"));
const DigitalAccountant = lazy(() => import("@/pages/DigitalAccountant"));
const CRMPage = lazy(() => import("@/pages/crm"));
const NFTVault = lazy(() => import("@/pages/NFTVault"));
const DiscordManager = lazy(() => import("@/pages/DiscordManager"));
const WealthForge = lazy(() => import("@/pages/WealthForge"));
const RevenueDashboard = lazy(() => import("@/pages/RevenueDashboard"));
const Subscription = lazy(() => import("@/pages/Subscription"));
const ReceiptManager = lazy(() => import("@/pages/ReceiptManager"));
const AdminPasses = lazy(() => import("@/pages/AdminPasses"));
const StorageSettingsPage = lazy(() => import("@/pages/storage-settings"));
// NotFound is not lazy-loaded to avoid loading spinner on 404 pages
import NotFound from "@/pages/not-found";

// Loading fallback component
const LoadingFallback = () => (
  <div className="flex items-center justify-center h-screen">
    <div className="text-center">
      <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
      <p className="text-muted-foreground">Loading...</p>
    </div>
  </div>
);

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
    <Suspense fallback={<LoadingFallback />}>
      <Switch>
        {!isAuthenticated ? (
          <>
            <Route path="/" component={Landing} />
            <Route path="/login" component={Login} />
          </>
        ) : (
          <>
            <Route path="/" component={DailyBriefing} />
            <Route path="/daily-briefing" component={DailyBriefing} />
            <Route path="/login" component={Login} />
            <Route path="/wallet" component={Wallet} />
            <Route path="/nft-vault" component={NFTVault} />
            <Route path="/discord" component={DiscordManager} />
            <Route path="/wealth" component={WealthDashboard} />
            <Route path="/wealth-monitor" component={WealthMonitor} />
            <Route path="/wealth-forge" component={WealthForge} />
            <Route path="/notepad" component={ProductivityHubConsolidated} />
            <Route path="/receipts" component={ReceiptManager} />
            <Route path="/health" component={HealthMonitoring} />
            <Route path="/ai-intelligence" component={AIIntelligence} />
            <Route path="/accountant" component={DigitalAccountant} />
            <Route path="/crm" component={CRMPage} />
            <Route path="/revenue" component={RevenueDashboard} />
            <Route path="/subscription" component={Subscription} />
            <Route path="/admin/passes" component={AdminPasses} />
            <Route path="/guide" component={Guide} />
            <Route path="/settings" component={Settings} />
            <Route path="/storage-settings" component={StorageSettingsPage} />
            <Route path="/learn/:slug" component={LearnPage} />
          </>
        )}
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function MobileSidebarHandler() {
  const { setOpenMobile, isMobile } = useSidebar();
  const [location] = useLocation();

  useEffect(() => {
    if (isMobile) {
      setOpenMobile(false);
    }
  }, [location, isMobile, setOpenMobile]);

  return null;
}

function AuthenticatedApp() {
  const { user } = useAuth() as { user: User };
  const [calendarOpen, setCalendarOpen] = useState(false);
  
  // Initialize offline sync
  useOfflineSync();
  
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties} defaultOpen={true}>
      <MobileSidebarHandler />
      <div className="flex h-screen w-full relative overflow-hidden">
        <AppSidebar />
        <div className="flex flex-col flex-1 relative z-10 min-w-0">
          <header className="glass flex items-center justify-between gap-2 p-2 sm:p-3 border-b flex-shrink-0">
            <div className="flex items-center gap-2 flex-shrink-0 min-w-0">
              <SidebarTrigger data-testid="button-sidebar-toggle" className="flex-shrink-0" />
              <div className="hidden sm:block">
                <TimeDate onClick={() => setCalendarOpen(true)} />
              </div>
              {user?.isAdmin && (
                <Badge 
                  variant="default" 
                  className="gap-1 text-xs py-0.5 px-1.5 cursor-pointer hover-elevate" 
                  data-testid="badge-admin"
                  onClick={() => window.location.href = '/admin/passes'}
                >
                  <Shield className="h-3 w-3" />
                  <span className="hidden sm:inline">Admin</span>
                </Badge>
              )}
            </div>
            <div className="flex-1 max-w-2xl mx-auto px-2">
              <WebSearchBar compact />
            </div>
            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              <div className="hidden md:flex items-center gap-1">
                <ConnectionStatus />
                <OnlineStatus />
                <BluetoothConnect />
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setCalendarOpen(true)}
                data-testid="button-open-calendar"
                className="hidden sm:flex flex-shrink-0"
              >
                <CalendarDays className="h-4 w-4" />
              </Button>
              <ChatGPT />
              <Calculator />
              <ThemeToggle />
            </div>
          </header>
          <main className="flex-1 overflow-auto p-3 sm:p-4 md:p-6">
            <Router />
          </main>
          <footer className="glass border-t p-3 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-2 flex-shrink-0">
            <div className="text-xs sm:text-sm text-muted-foreground neon-text text-center sm:text-left truncate">
              © 2025 WealthForge
            </div>
            <ViewModeSwitcher />
          </footer>
        </div>
      </div>
      <DigitalCalendar open={calendarOpen} onOpenChange={setCalendarOpen} />
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
