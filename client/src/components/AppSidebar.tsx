import { LayoutDashboard, Wallet, Mail, Calendar, BookOpen, Settings, TrendingUp, CheckSquare, Activity, Coins } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Link, useLocation } from "wouter";

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
    title: "Wealth Monitor",
    url: "/wealth-monitor",
    icon: TrendingUp,
  },
  {
    title: "Productivity Hub",
    url: "/productivity",
    icon: CheckSquare,
  },
  {
    title: "Health Monitoring",
    url: "/health",
    icon: Activity,
  },
  {
    title: "Web3 Wallets",
    url: "/wallets",
    icon: Coins,
  },
  {
    title: "Email Manager",
    url: "/email",
    icon: Mail,
  },
  {
    title: "Routine Builder",
    url: "/routine",
    icon: Calendar,
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
    </Sidebar>
  );
}
