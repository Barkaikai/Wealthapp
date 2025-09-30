import { AssetChart } from "@/components/AssetChart";
import { PortfolioTimeline } from "@/components/PortfolioTimeline";
import { AssetTable } from "@/components/AssetTable";
import { Button } from "@/components/ui/button";
import { Plus, Download } from "lucide-react";

export default function WealthDashboard() {
  //todo: remove mock functionality
  const assetData = [
    { name: "Stocks", value: 1250000, color: "hsl(var(--chart-1))" },
    { name: "Crypto", value: 450000, color: "hsl(var(--chart-2))" },
    { name: "Bonds", value: 300000, color: "hsl(var(--chart-3))" },
    { name: "Cash", value: 200000, color: "hsl(var(--chart-4))" },
    { name: "Real Estate", value: 250000, color: "hsl(var(--chart-5))" },
  ];

  const timelineData = [
    { date: "Jan", value: 1800000 },
    { date: "Feb", value: 1950000 },
    { date: "Mar", value: 1875000 },
    { date: "Apr", value: 2100000 },
    { date: "May", value: 2250000 },
    { date: "Jun", value: 2200000 },
    { date: "Jul", value: 2350000 },
    { date: "Aug", value: 2400000 },
    { date: "Sep", value: 2450000 },
  ];

  const assets = [
    { name: "S&P 500 ETF", symbol: "SPY", value: 450000, allocation: 35, change24h: 3600, changePercent: 0.8 },
    { name: "Bitcoin", symbol: "BTC", value: 280000, allocation: 22, change24h: -4200, changePercent: -1.5 },
    { name: "Technology ETF", symbol: "QQQ", value: 320000, allocation: 25, change24h: 5100, changePercent: 1.6 },
    { name: "Treasury Bonds", symbol: "TLT", value: 230000, allocation: 18, change24h: 690, changePercent: 0.3 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2" data-testid="text-page-title">Wealth Dashboard</h1>
          <p className="text-muted-foreground">Track and manage your portfolio</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" data-testid="button-export-report">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
          <Button data-testid="button-add-asset">
            <Plus className="h-4 w-4 mr-2" />
            Add Asset
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AssetChart data={assetData} title="Asset Allocation" />
        <PortfolioTimeline data={timelineData} title="Portfolio Growth (YTD)" />
      </div>

      <AssetTable assets={assets} title="Portfolio Holdings" />
    </div>
  );
}
