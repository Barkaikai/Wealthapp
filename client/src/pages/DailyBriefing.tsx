import { useQuery, useMutation } from "@tanstack/react-query";
import { StatCard } from "@/components/StatCard";
import { HighlightCard } from "@/components/HighlightCard";
import MarketOverview from "@/components/MarketOverview";
import { Sparkles, AlertTriangle, Target, RefreshCw, TrendingUp, CreditCard, Calculator, Users, FileText, Brain, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import type { Asset, Briefing } from "@shared/schema";

const quickAccessItems = [
  {
    title: "Wealth Dashboard",
    description: "View portfolio analytics",
    icon: TrendingUp,
    url: "/wealth",
    color: "text-green-500",
  },
  {
    title: "Personal Wallet",
    description: "Manage funds & payments",
    icon: CreditCard,
    url: "/wallet",
    color: "text-blue-500",
  },
  {
    title: "Digital Accountant",
    description: "Track finances & reports",
    icon: Calculator,
    url: "/accountant",
    color: "text-purple-500",
  },
  {
    title: "CRM",
    description: "Manage relationships",
    icon: Users,
    url: "/crm",
    color: "text-orange-500",
  },
  {
    title: "Productivity Hub",
    description: "Notes, tasks & calendar",
    icon: FileText,
    url: "/notepad",
    color: "text-cyan-500",
  },
  {
    title: "AI Intelligence",
    description: "AI insights & analysis",
    icon: Brain,
    url: "/ai-intelligence",
    color: "text-pink-500",
  },
];

export default function DailyBriefing() {
  const { toast } = useToast();

  const { data: assets = [] } = useQuery<Asset[]>({
    queryKey: ["/api/assets"],
  });

  const { data: briefing, isLoading: briefingLoading } = useQuery<Briefing>({
    queryKey: ["/api/briefing/latest"],
  });

  const generateBriefing = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/briefing/generate", {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/briefing/latest"] });
      toast({
        title: "Success",
        description: "Daily briefing generated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to generate briefing",
        variant: "destructive",
      });
    },
  });

  // Calculate stats from assets
  const assetsByType = assets.reduce((acc, asset) => {
    if (!acc[asset.assetType]) {
      acc[asset.assetType] = { total: 0, change: 0 };
    }
    acc[asset.assetType].total += asset.value;
    if (asset.change24h) {
      acc[asset.assetType].change += asset.change24h;
    }
    return acc;
  }, {} as Record<string, { total: number; change: number }>);

  const totalWealth = assets.reduce((sum, asset) => sum + asset.value, 0);
  const totalChange = assets.reduce((sum, asset) => sum + (asset.change24h || 0), 0);
  const totalChangePercent = totalWealth > 0 ? (totalChange / totalWealth) * 100 : 0;

  const stats = [
    { 
      title: "Total Wealth", 
      value: `$${totalWealth.toLocaleString()}`, 
      trend: { value: `${totalChangePercent >= 0 ? '+' : ''}${totalChangePercent.toFixed(2)}%`, isPositive: totalChangePercent >= 0 } 
    },
    { 
      title: "Stocks", 
      value: `$${(assetsByType['stocks']?.total || 0).toLocaleString()}`,
      trend: assetsByType['stocks'] ? { 
        value: `${assetsByType['stocks'].change >= 0 ? '+' : ''}$${assetsByType['stocks'].change.toLocaleString()}`, 
        isPositive: assetsByType['stocks'].change >= 0 
      } : undefined
    },
    { 
      title: "Crypto", 
      value: `$${(assetsByType['crypto']?.total || 0).toLocaleString()}`,
      trend: assetsByType['crypto'] ? { 
        value: `${assetsByType['crypto'].change >= 0 ? '+' : ''}$${assetsByType['crypto'].change.toLocaleString()}`, 
        isPositive: assetsByType['crypto'].change >= 0 
      } : undefined
    },
    { 
      title: "Cash & Bonds", 
      value: `$${((assetsByType['cash']?.total || 0) + (assetsByType['bonds']?.total || 0)).toLocaleString()}`,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2" data-testid="text-page-title">Daily Briefing</h1>
          <p className="text-muted-foreground">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <Button 
          onClick={() => generateBriefing.mutate()} 
          disabled={generateBriefing.isPending}
          data-testid="button-generate-briefing"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${generateBriefing.isPending ? 'animate-spin' : ''}`} />
          {generateBriefing.isPending ? 'Generating...' : 'Generate AI Briefing'}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4" data-testid="text-quick-access-title">Quick Access</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {quickAccessItems.map((item) => (
            <Link
              key={item.title}
              href={item.url}
              data-testid={`card-quick-access-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <Card className="hover-elevate active-elevate-2 cursor-pointer transition-all h-full">
                <CardHeader className="p-4 space-y-2">
                  <item.icon className={`h-8 w-8 ${item.color}`} />
                  <div>
                    <CardTitle className="text-sm font-medium">{item.title}</CardTitle>
                    <CardDescription className="text-xs">{item.description}</CardDescription>
                  </div>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {briefingLoading ? (
        <div className="text-center py-8">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      ) : briefing ? (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <HighlightCard
              icon={Sparkles}
              title="Highlights"
              items={briefing.highlights || []}
              variant="success"
            />
            <HighlightCard
              icon={AlertTriangle}
              title="Risks"
              items={briefing.risks || []}
              variant="warning"
            />
            <HighlightCard
              icon={Target}
              title="Recommended Actions"
              items={briefing.actions || []}
            />
          </div>
          
          <MarketOverview compact={true} />
        </>
      ) : (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">No briefing available yet</p>
          <Button onClick={() => generateBriefing.mutate()} disabled={generateBriefing.isPending}>
            <Sparkles className="h-4 w-4 mr-2" />
            Generate Your First Briefing
          </Button>
        </div>
      )}
    </div>
  );
}
