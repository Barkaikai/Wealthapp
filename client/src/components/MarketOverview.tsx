import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, TrendingDown, Coins, LineChart, Gem } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface MarketDataPoint {
  symbol: string;
  name: string;
  price: number;
  change24h?: number;
  changePercent?: number;
  marketCap?: number;
  volume24h?: number;
  source: string;
}

interface MarketOverview {
  crypto: MarketDataPoint[];
  stocks: MarketDataPoint[];
  metals: MarketDataPoint[];
  lastUpdated: string;
}

function formatPrice(price: number, decimals: number = 2): string {
  if (price >= 1000) {
    return `$${price.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
  }
  return `$${price.toFixed(decimals)}`;
}

function formatLargeNumber(num: number): string {
  if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
  if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
  if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
  return `$${num.toFixed(2)}`;
}

function MarketDataCard({ item }: { item: MarketDataPoint }) {
  const isPositive = (item.changePercent || 0) >= 0;
  
  return (
    <div 
      className="flex items-center justify-between p-3 rounded-lg border bg-card hover-elevate active-elevate-2" 
      data-testid={`market-item-${item.symbol}`}
    >
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <p className="font-semibold" data-testid={`market-symbol-${item.symbol}`}>{item.symbol}</p>
          <p className="text-sm text-muted-foreground">{item.name}</p>
        </div>
        <p className="text-2xl font-mono font-bold mt-1" data-testid={`market-price-${item.symbol}`}>
          {formatPrice(item.price)}
        </p>
        {item.marketCap && (
          <p className="text-xs text-muted-foreground mt-1">
            Cap: {formatLargeNumber(item.marketCap)}
          </p>
        )}
      </div>
      <div className="text-right">
        <div className={`flex items-center gap-1 ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
          {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
          <span className="font-semibold" data-testid={`market-change-${item.symbol}`}>
            {isPositive ? '+' : ''}{item.changePercent?.toFixed(2)}%
          </span>
        </div>
        {item.change24h !== undefined && (
          <p className="text-xs text-muted-foreground mt-1">
            {isPositive ? '+' : ''}{formatPrice(item.change24h)}
          </p>
        )}
      </div>
    </div>
  );
}

function MarketSection({ 
  data, 
  loading, 
  title, 
  icon: Icon 
}: { 
  data: MarketDataPoint[]; 
  loading: boolean; 
  title: string; 
  icon: any;
}) {
  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Icon className="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p>No {title.toLowerCase()} data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {data.map((item) => (
        <MarketDataCard key={item.symbol} item={item} />
      ))}
    </div>
  );
}

export default function MarketOverview({ compact = false }: { compact?: boolean }) {
  const { data, isLoading } = useQuery<MarketOverview>({
    queryKey: ['/api/market/overview'],
  });

  if (compact) {
    // Compact view for Daily Briefing - show just top movers
    const topCrypto = data?.crypto?.slice(0, 3) || [];
    const topStocks = data?.stocks?.slice(0, 3) || [];
    
    return (
      <Card data-testid="market-overview-compact">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LineChart className="h-5 w-5" />
            Market Overview
          </CardTitle>
          <CardDescription>Real-time market data across multiple asset classes</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <Coins className="h-4 w-4" />
              Top Crypto
            </h3>
            <MarketSection data={topCrypto} loading={isLoading} title="Crypto" icon={Coins} />
          </div>
          <div>
            <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <LineChart className="h-4 w-4" />
              Market Indices
            </h3>
            <MarketSection data={topStocks} loading={isLoading} title="Stocks" icon={LineChart} />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Full view for Wealth Dashboard
  return (
    <Card data-testid="market-overview-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LineChart className="h-5 w-5" />
          Global Market Overview
        </CardTitle>
        <CardDescription>
          Real-time data from multiple sources • Last updated: {data?.lastUpdated ? new Date(data.lastUpdated).toLocaleTimeString() : 'Loading...'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="crypto" data-testid="market-tabs">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="crypto" data-testid="tab-crypto">
              <Coins className="h-4 w-4 mr-2" />
              Crypto
            </TabsTrigger>
            <TabsTrigger value="stocks" data-testid="tab-stocks">
              <LineChart className="h-4 w-4 mr-2" />
              Stocks
            </TabsTrigger>
            <TabsTrigger value="metals" data-testid="tab-metals">
              <Gem className="h-4 w-4 mr-2" />
              Metals
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="crypto" className="mt-4" data-testid="content-crypto">
            <MarketSection 
              data={data?.crypto || []} 
              loading={isLoading} 
              title="Crypto" 
              icon={Coins}
            />
          </TabsContent>
          
          <TabsContent value="stocks" className="mt-4" data-testid="content-stocks">
            <MarketSection 
              data={data?.stocks || []} 
              loading={isLoading} 
              title="Stocks" 
              icon={LineChart}
            />
          </TabsContent>
          
          <TabsContent value="metals" className="mt-4" data-testid="content-metals">
            <MarketSection 
              data={data?.metals || []} 
              loading={isLoading} 
              title="Metals" 
              icon={Gem}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
