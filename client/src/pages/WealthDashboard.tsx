import { useQuery, useMutation } from "@tanstack/react-query";
import { AssetChart } from "@/components/AssetChart";
import { PortfolioTimeline } from "@/components/PortfolioTimeline";
import { AssetTable } from "@/components/AssetTable";
import MarketOverview from "@/components/MarketOverview";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Download, RefreshCw } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertAssetSchema, type Asset } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { z } from "zod";

const stockFormSchema = z.object({
  symbol: z.string().min(1, "Symbol is required"),
  quantity: z.number().min(0.000001, "Quantity must be greater than 0"),
  name: z.string().optional(),
});

const cryptoFormSchema = z.object({
  symbol: z.string().min(1, "Symbol is required"),
  quantity: z.number().min(0.000001, "Quantity must be greater than 0"),
  name: z.string().optional(),
});

export default function WealthDashboard() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [addMode, setAddMode] = useState<"manual" | "stock" | "crypto">("manual");
  const { toast } = useToast();

  const { data: assets = [], isLoading } = useQuery<Asset[]>({
    queryKey: ["/api/assets"],
  });

  const form = useForm({
    resolver: zodResolver(insertAssetSchema.omit({ userId: true })),
    defaultValues: {
      name: "",
      symbol: "",
      assetType: "stocks" as const,
      value: 0,
      allocation: 0,
      change24h: 0,
      changePercent: 0,
    },
  });

  const stockForm = useForm({
    resolver: zodResolver(stockFormSchema),
    defaultValues: {
      symbol: "",
      quantity: 1,
      name: "",
    },
  });

  const cryptoForm = useForm({
    resolver: zodResolver(cryptoFormSchema),
    defaultValues: {
      symbol: "",
      quantity: 1,
      name: "",
    },
  });

  const syncPrices = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/financial/sync", {});
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
      const totalSynced = (data.stocks?.synced || 0) + (data.crypto?.synced || 0);
      toast({
        title: "Sync Complete",
        description: `Successfully synced ${totalSynced} assets`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Sync Failed",
        description: error.message || "Failed to sync prices",
        variant: "destructive",
      });
    },
  });

  const createAsset = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("POST", "/api/assets", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
      toast({
        title: "Success",
        description: "Asset added successfully",
      });
      form.reset();
      setDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add asset",
        variant: "destructive",
      });
    },
  });

  const addStockPosition = useMutation({
    mutationFn: async (data: z.infer<typeof stockFormSchema>) => {
      return await apiRequest("POST", "/api/financial/stocks/add", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
      toast({
        title: "Success",
        description: "Stock position added with live pricing",
      });
      stockForm.reset();
      setDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add stock position",
        variant: "destructive",
      });
    },
  });

  const addCryptoPosition = useMutation({
    mutationFn: async (data: z.infer<typeof cryptoFormSchema>) => {
      return await apiRequest("POST", "/api/financial/crypto/add", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
      toast({
        title: "Success",
        description: "Crypto position added with live pricing",
      });
      cryptoForm.reset();
      setDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add crypto position",
        variant: "destructive",
      });
    },
  });

  const assetData = assets.reduce((acc, asset) => {
    const existing = acc.find(a => a.name === asset.assetType);
    if (existing) {
      existing.value += asset.value;
    } else {
      const colorMap: Record<string, string> = {
        stocks: "hsl(var(--chart-1))",
        crypto: "hsl(var(--chart-2))",
        bonds: "hsl(var(--chart-3))",
        cash: "hsl(var(--chart-4))",
        real_estate: "hsl(var(--chart-5))",
      };
      acc.push({
        name: asset.assetType.charAt(0).toUpperCase() + asset.assetType.slice(1),
        value: asset.value,
        color: colorMap[asset.assetType] || "hsl(var(--chart-1))",
      });
    }
    return acc;
  }, [] as any[]);

  const totalValue = assets.reduce((sum, asset) => sum + asset.value, 0);

  const timelineData = [
    { date: "Jan", value: totalValue * 0.73 },
    { date: "Feb", value: totalValue * 0.79 },
    { date: "Mar", value: totalValue * 0.76 },
    { date: "Apr", value: totalValue * 0.85 },
    { date: "May", value: totalValue * 0.91 },
    { date: "Jun", value: totalValue * 0.89 },
    { date: "Jul", value: totalValue * 0.95 },
    { date: "Aug", value: totalValue * 0.97 },
    { date: "Sep", value: totalValue },
  ];

  const tableAssets = assets.map(asset => ({
    name: asset.name,
    symbol: asset.symbol,
    value: asset.value,
    allocation: asset.allocation || 0,
    change24h: asset.change24h || 0,
    changePercent: asset.changePercent || 0,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2" data-testid="text-page-title">Wealth Dashboard</h1>
          <p className="text-muted-foreground">Track and manage your portfolio</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button 
            variant="outline" 
            onClick={() => syncPrices.mutate()} 
            disabled={syncPrices.isPending || isLoading}
            data-testid="button-sync-prices"
            className="flex-1 sm:flex-none"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${syncPrices.isPending ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{syncPrices.isPending ? 'Syncing...' : 'Sync Prices'}</span>
            <span className="sm:hidden">{syncPrices.isPending ? 'Sync' : 'Sync'}</span>
          </Button>
          <Button variant="outline" data-testid="button-export-report" className="flex-1 sm:flex-none">
            <Download className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Export Report</span>
            <span className="sm:hidden">Export</span>
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-asset" className="flex-1 sm:flex-none">
                <Plus className="h-4 w-4 mr-2" />
                Add Asset
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add New Asset</DialogTitle>
              </DialogHeader>
              
              <Tabs value={addMode} onValueChange={(v) => setAddMode(v as any)} className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="stock" data-testid="tab-add-stock">Stock</TabsTrigger>
                  <TabsTrigger value="crypto" data-testid="tab-add-crypto">Crypto</TabsTrigger>
                  <TabsTrigger value="manual" data-testid="tab-add-manual">Manual</TabsTrigger>
                </TabsList>
                
                <TabsContent value="stock" className="space-y-4">
                  <p className="text-sm text-muted-foreground">Add stocks with automatic price fetching from Alpha Vantage</p>
                  <Form {...stockForm}>
                    <form onSubmit={stockForm.handleSubmit((data) => addStockPosition.mutate(data))} className="space-y-4">
                      <FormField
                        control={stockForm.control}
                        name="symbol"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Symbol</FormLabel>
                            <FormControl>
                              <Input placeholder="AAPL" {...field} data-testid="input-stock-symbol" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={stockForm.control}
                        name="quantity"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Quantity (shares)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                step="0.001"
                                placeholder="50" 
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value))}
                                data-testid="input-stock-quantity"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button type="submit" disabled={addStockPosition.isPending} className="w-full" data-testid="button-submit-stock">
                        {addStockPosition.isPending ? "Adding..." : "Add Stock Position"}
                      </Button>
                    </form>
                  </Form>
                </TabsContent>

                <TabsContent value="crypto" className="space-y-4">
                  <p className="text-sm text-muted-foreground">Add crypto with automatic price fetching from CoinGecko</p>
                  <Form {...cryptoForm}>
                    <form onSubmit={cryptoForm.handleSubmit((data) => addCryptoPosition.mutate(data))} className="space-y-4">
                      <FormField
                        control={cryptoForm.control}
                        name="symbol"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Symbol</FormLabel>
                            <FormControl>
                              <Input placeholder="BTC" {...field} data-testid="input-crypto-symbol" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={cryptoForm.control}
                        name="quantity"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Quantity (coins)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                step="0.00000001"
                                placeholder="0.75" 
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value))}
                                data-testid="input-crypto-quantity"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button type="submit" disabled={addCryptoPosition.isPending} className="w-full" data-testid="button-submit-crypto">
                        {addCryptoPosition.isPending ? "Adding..." : "Add Crypto Position"}
                      </Button>
                    </form>
                  </Form>
                </TabsContent>

                <TabsContent value="manual" className="space-y-4">
                  <p className="text-sm text-muted-foreground">Manually enter asset details</p>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit((data) => createAsset.mutate(data))} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Asset Name</FormLabel>
                            <FormControl>
                              <Input placeholder="S&P 500 ETF" {...field} data-testid="input-asset-name" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="symbol"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Symbol</FormLabel>
                            <FormControl>
                              <Input placeholder="SPY" {...field} data-testid="input-asset-symbol" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="assetType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Asset Type</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-asset-type">
                                  <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="stocks">Stocks</SelectItem>
                                <SelectItem value="crypto">Crypto</SelectItem>
                                <SelectItem value="bonds">Bonds</SelectItem>
                                <SelectItem value="cash">Cash</SelectItem>
                                <SelectItem value="real_estate">Real Estate</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="value"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Value ($)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                placeholder="50000" 
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value))}
                                data-testid="input-asset-value"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button type="submit" disabled={createAsset.isPending} className="w-full" data-testid="button-submit-asset">
                        {createAsset.isPending ? "Adding..." : "Add Asset"}
                      </Button>
                    </form>
                  </Form>
                </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AssetChart data={assetData} title="Asset Allocation" />
        <PortfolioTimeline data={timelineData} title="Portfolio Growth (YTD)" />
      </div>

      <MarketOverview />

      {tableAssets.length > 0 && <AssetTable assets={tableAssets} title="Portfolio Holdings" />}
    </div>
  );
}
