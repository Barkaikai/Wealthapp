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
import { BluetoothConnect } from "@/components/BluetoothConnect";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ViewModeProvider } from "@/components/ViewModeProvider";
import { ViewModeSwitcher } from "@/components/ViewModeSwitcher";
import { DigitalCalendar } from "@/components/DigitalCalendar";
import { useAuth } from "@/hooks/useAuth";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import luxuryBackground from "@assets/stock_images/luxury_villa_mansion_f81fdf36.jpg";
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
import DigitalAccountant from "@/pages/DigitalAccountant";
import CRMPage from "@/pages/crm";
import NFTVault from "@/pages/NFTVault";
import DiscordManager from "@/pages/DiscordManager";
import WealthForge from "@/pages/WealthForge";
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
          <Route path="/nft-vault" component={NFTVault} />
          <Route path="/discord" component={DiscordManager} />
          <Route path="/wealth" component={WealthDashboard} />
          <Route path="/wealth-monitor" component={WealthMonitor} />
          <Route path="/wealth-forge" component={WealthForge} />
          <Route path="/notepad" component={ProductivityHubConsolidated} />
          <Route path="/health" component={HealthMonitoring} />
          <Route path="/ai-intelligence" component={AIIntelligence} />
          <Route path="/accountant" component={DigitalAccountant} />
          <Route path="/crm" component={CRMPage} />
          <Route path="/guide" component={Guide} />
          <Route path="/settings" component={Settings} />
          <Route path="/learn/:slug" component={LearnPage} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
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
      <div className="flex h-screen w-full relative">
        {/* Luxury Background Image */}
        <div 
          className="fixed inset-0 bg-cover bg-center z-0"
          style={{ backgroundImage: `url(${luxuryBackground})` }}
        />
        
        {/* Dark Gradient Overlay */}
        <div className="fixed inset-0 bg-gradient-to-br from-background/98 via-background/96 to-background/98 z-0" />
        
        <AppSidebar />
        <div className="flex flex-col flex-1 relative z-10">
          <header className="flex items-center justify-between gap-2 sm:gap-4 p-2 sm:p-4 border-b border-border bg-background/80 backdrop-blur-sm">
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              <SidebarTrigger data-testid="button-sidebar-toggle" className="!h-11 !w-11" />
              <TimeDate onClick={() => setCalendarOpen(true)} />
            </div>
            <div className="hidden md:flex flex-1 max-w-2xl mx-auto">
              <WebSearchBar compact />
            </div>
            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              <OnlineStatus />
              <BluetoothConnect />
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setCalendarOpen(true)}
                data-testid="button-open-calendar"
                className="hidden sm:flex"
              >
                <CalendarDays className="h-5 w-5" />
              </Button>
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
