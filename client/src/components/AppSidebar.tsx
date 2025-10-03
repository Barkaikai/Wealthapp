import { LayoutDashboard, Wallet, Mail, Calendar, BookOpen, Settings, TrendingUp, CheckSquare, Activity, Coins, FileText, Brain, Receipt, LogOut, Download, Video, CreditCard, Terminal } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useServiceWorker } from "@/hooks/useServiceWorker";

const menuItems = [
  {
    title: "Daily Briefing",
    url: "/",
    icon: LayoutDashboard,
  },
  {
    title: "Wealth Dashboard",
    url: "/wealth",
    icon: Wallet,
  },
  {
    title: "Personal Wallet",
    url: "/wallet",
    icon: CreditCard,
  },
  {
    title: "Productivity Hub",
    url: "/notepad",
    icon: FileText,
  },
  {
    title: "AI Intelligence",
    url: "/ai-intelligence",
    icon: Brain,
  },
  {
    title: "Health Monitoring",
    url: "/health",
    icon: Activity,
  },
  {
    title: "Guide",
    url: "/guide",
    icon: BookOpen,
  },
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
  },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { updateAvailable, updateApp } = useServiceWorker();

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold uppercase tracking-wide text-muted-foreground px-3 py-2">
            Automation Hub
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={location === item.url}>
                    <Link href={item.url} data-testid={`link-${item.title.toLowerCase().replace(/\s+/g, '-')}`}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4 border-t border-border space-y-2">
        {updateAvailable && (
          <Button
            variant="default"
            onClick={updateApp}
            data-testid="button-update-app"
            className="w-full justify-start"
          >
            <Download className="h-4 w-4 mr-2" />
            <span>Update Available</span>
          </Button>
        )}
        <Button
          variant="ghost"
          onClick={() => window.location.href = '/api/logout'}
          data-testid="button-logout"
          className="w-full justify-start"
        >
          <LogOut className="h-4 w-4 mr-2" />
          <span>Logout</span>
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
