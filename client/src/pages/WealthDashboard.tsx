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
import { Plus, Download, RefreshCw, Upload, TrendingUp } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertAssetSchema, type Asset } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState, useRef } from "react";
import { z } from "zod";
import { SkeletonAssetCard, Skeleton } from "@/components/Skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

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
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [addMode, setAddMode] = useState<"manual" | "stock" | "crypto">("manual");
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [csvUploading, setCsvUploading] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
      const response = await apiRequest("POST", "/api/financial/sync", {});
      return await response.json();
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

  const updateAsset = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Asset> }) => {
      await apiRequest("PATCH", `/api/assets/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
      toast({
        title: "Success",
        description: "Asset updated successfully",
      });
      setEditDialogOpen(false);
      setEditingAsset(null);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update asset",
        variant: "destructive",
      });
    },
  });

  const deleteAsset = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/assets/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
      toast({
        title: "Success",
        description: "Asset deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete asset",
        variant: "destructive",
      });
    },
  });

  const handleCsvUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setCsvUploading(true);
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        throw new Error("CSV file must have at least a header and one data row");
      }

      // Parse CSV (expecting: symbol,quantity,assetType)
      const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
      const symbolIndex = headers.indexOf('symbol');
      const quantityIndex = headers.indexOf('quantity');
      const typeIndex = headers.indexOf('type') !== -1 ? headers.indexOf('type') : headers.indexOf('assettype');
      
      if (symbolIndex === -1 || quantityIndex === -1) {
        throw new Error("CSV must have 'symbol' and 'quantity' columns");
      }

      let imported = 0;
      let failed = 0;

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const symbol = values[symbolIndex];
        const quantity = parseFloat(values[quantityIndex]);
        let assetType = typeIndex !== -1 ? values[typeIndex].toLowerCase() : null;
        
        if (!symbol || isNaN(quantity)) continue;

        try {
          // Normalize asset type
          if (assetType === 'stock' || assetType === 'stocks') {
            assetType = 'stocks';
          } else if (assetType === 'cryptocurrency' || assetType === 'cryptocurrencies') {
            assetType = 'crypto';
          }

          // Route based on explicit type
          if (assetType === 'stocks') {
            await apiRequest("POST", "/api/financial/stocks/add", { symbol, quantity });
            imported++;
          } else if (assetType === 'crypto') {
            await apiRequest("POST", "/api/financial/crypto/add", { symbol, quantity });
            imported++;
          } else if (assetType === 'cash' || assetType === 'bonds' || assetType === 'real_estate') {
            // Create manual asset for non-stock/crypto types
            const pricePerUnit = assetType === 'cash' ? 1 : 100; // Default $1 for cash, $100 for others
            await apiRequest("POST", "/api/assets", {
              name: symbol,
              symbol: symbol,
              assetType: assetType,
              value: quantity * pricePerUnit,
              quantity: quantity,
            });
            imported++;
          } else if (!assetType) {
            // Auto-detect: try crypto symbols first, fallback to stock
            const cryptoSymbols = ['BTC', 'ETH', 'SOL', 'XRP', 'ADA', 'DOGE', 'DOT', 'MATIC', 'LINK', 'UNI', 'AVAX', 'ATOM', 'LTC', 'BCH', 'XLM'];
            if (cryptoSymbols.includes(symbol.toUpperCase())) {
              await apiRequest("POST", "/api/financial/crypto/add", { symbol, quantity });
            } else {
              await apiRequest("POST", "/api/financial/stocks/add", { symbol, quantity });
            }
            imported++;
          } else {
            // Unsupported type
            console.warn(`Unsupported asset type "${assetType}" for symbol ${symbol}`);
            failed++;
          }
        } catch (err) {
          console.error(`Failed to import ${symbol}:`, err);
          failed++;
        }
      }

      queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
      toast({
        title: "CSV Import Complete",
        description: `Imported ${imported} assets successfully${failed > 0 ? `, ${failed} failed` : ''}`,
      });
    } catch (error: any) {
      toast({
        title: "CSV Import Failed",
        description: error.message || "Failed to import CSV",
        variant: "destructive",
      });
    } finally {
      setCsvUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const calculateAllocation = () => {
    // Calculate current allocations by type
    const cryptoAssets = assets.filter(a => a.assetType === 'crypto');
    const stockAssets = assets.filter(a => a.assetType === 'stocks');
    const cashAssets = assets.filter(a => a.assetType === 'cash');
    
    const cryptoValue = cryptoAssets.reduce((sum, a) => sum + a.value, 0);
    const stockValue = stockAssets.reduce((sum, a) => sum + a.value, 0);
    const cashValue = cashAssets.reduce((sum, a) => sum + a.value, 0);
    
    const cryptoAllocation = totalValue > 0 ? (cryptoValue / totalValue) * 100 : 0;
    const stockAllocation = totalValue > 0 ? (stockValue / totalValue) * 100 : 0;
    const cashAllocation = totalValue > 0 ? (cashValue / totalValue) * 100 : 0;

    // Major crypto breakdown
    const btcValue = cryptoAssets.find(a => a.symbol.toUpperCase() === 'BTC')?.value || 0;
    const ethValue = cryptoAssets.find(a => a.symbol.toUpperCase() === 'ETH')?.value || 0;
    const solValue = cryptoAssets.find(a => a.symbol.toUpperCase() === 'SOL')?.value || 0;
    const majorCryptoValue = btcValue + ethValue + solValue;
    const majorCryptoAllocation = totalValue > 0 ? (majorCryptoValue / totalValue) * 100 : 0;
    const otherCryptoAllocation = cryptoAllocation - majorCryptoAllocation;

    return {
      crypto: cryptoAllocation,
      stocks: stockAllocation,
      cash: cashAllocation,
      majorCrypto: majorCryptoAllocation,
      otherCrypto: otherCryptoAllocation,
      cryptoValue,
      stockValue,
      cashValue,
    };
  };

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

  const handleEdit = (asset: Asset) => {
    setEditingAsset(asset);
    form.reset({
      name: asset.name,
      symbol: asset.symbol,
      assetType: asset.assetType,
      value: asset.value,
      allocation: asset.allocation || 0,
      change24h: asset.change24h || 0,
      changePercent: asset.changePercent || 0,
    });
    setEditDialogOpen(true);
  };

  const handleDelete = (assetId: number) => {
    if (window.confirm("Are you sure you want to delete this asset?")) {
      deleteAsset.mutate(assetId);
    }
  };

  const tableAssets = assets.map(asset => ({
    id: asset.id,
    name: asset.name,
    symbol: asset.symbol,
    assetType: asset.assetType,
    value: asset.value,
    allocation: asset.allocation || 0,
    change24h: asset.change24h || 0,
    changePercent: asset.changePercent || 0,
  }));

  return (
    <div className="space-y-4 sm:space-y-6 max-w-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight mb-2 truncate" data-testid="text-page-title">Wealth Dashboard</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Track and manage your portfolio</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleCsvUpload}
            className="hidden"
            data-testid="input-csv-file"
          />
          <Button 
            variant="outline" 
            onClick={() => fileInputRef.current?.click()}
            disabled={csvUploading}
            data-testid="button-upload-csv"
            className="flex-1 sm:flex-none"
            size="sm"
          >
            <Upload className={`h-4 w-4 mr-2 ${csvUploading ? 'animate-pulse' : ''}`} />
            <span className="hidden sm:inline">{csvUploading ? 'Uploading...' : 'Import CSV'}</span>
            <span className="sm:hidden">{csvUploading ? 'Upload' : 'CSV'}</span>
          </Button>
          <Button 
            variant="outline" 
            onClick={() => syncPrices.mutate()} 
            disabled={syncPrices.isPending || isLoading}
            data-testid="button-sync-prices"
            className="flex-1 sm:flex-none"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${syncPrices.isPending ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{syncPrices.isPending ? 'Syncing...' : 'Sync Prices'}</span>
            <span className="sm:hidden">{syncPrices.isPending ? 'Sync' : 'Sync'}</span>
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setShowAnalysis(!showAnalysis)}
            data-testid="button-toggle-analysis" 
            className="flex-1 sm:flex-none" 
            size="sm"
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">AI Analysis</span>
            <span className="sm:hidden">AI</span>
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-asset" className="flex-1 sm:flex-none" size="sm">
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
                  <p className="text-xs sm:text-sm text-muted-foreground">Add stocks with automatic price fetching from Alpha Vantage</p>
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
                  <p className="text-xs sm:text-sm text-muted-foreground">Add crypto with automatic price fetching from CoinGecko</p>
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
                  <p className="text-xs sm:text-sm text-muted-foreground">Manually enter asset details</p>
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

      {isLoading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="border rounded-lg p-6">
              <Skeleton className="h-5 w-32 mb-6" />
              <Skeleton className="h-64 w-full" />
            </div>
            <div className="border rounded-lg p-6">
              <Skeleton className="h-5 w-40 mb-6" />
              <Skeleton className="h-64 w-full" />
            </div>
          </div>
          <div className="border rounded-lg p-6">
            <Skeleton className="h-5 w-40 mb-6" />
            <Skeleton className="h-48 w-full" />
          </div>
        </div>
      ) : (
        <>
          {showAnalysis && totalValue > 0 && (() => {
            const allocation = calculateAllocation();
            const targets = {
              majorCrypto: 35,
              otherCrypto: 20,
              stocks: 40,
              cash: 5,
            };
            
            return (
              <Card className="glass-card" data-testid="card-portfolio-analysis">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base sm:text-lg">AI Portfolio Analysis</CardTitle>
                      <CardDescription className="text-xs sm:text-sm">Allocation vs. Target Recommendations</CardDescription>
                    </div>
                    <Badge variant="outline" className="text-xs">Live</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-xs sm:text-sm mb-2">
                          <span className="text-muted-foreground">Major Crypto (BTC+ETH+SOL)</span>
                          <span className="font-medium">{allocation.majorCrypto.toFixed(1)}% / {targets.majorCrypto}%</span>
                        </div>
                        <Progress value={(allocation.majorCrypto / targets.majorCrypto) * 100} className="h-2" />
                        {Math.abs(allocation.majorCrypto - targets.majorCrypto) > 5 && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {allocation.majorCrypto < targets.majorCrypto ? 'Consider increasing' : 'Consider decreasing'} by {Math.abs(allocation.majorCrypto - targets.majorCrypto).toFixed(1)}%
                          </p>
                        )}
                      </div>

                      <div>
                        <div className="flex justify-between text-xs sm:text-sm mb-2">
                          <span className="text-muted-foreground">Other Crypto</span>
                          <span className="font-medium">{allocation.otherCrypto.toFixed(1)}% / {targets.otherCrypto}%</span>
                        </div>
                        <Progress value={(allocation.otherCrypto / targets.otherCrypto) * 100} className="h-2" />
                        {Math.abs(allocation.otherCrypto - targets.otherCrypto) > 5 && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {allocation.otherCrypto < targets.otherCrypto ? 'Consider increasing' : 'Consider decreasing'} by {Math.abs(allocation.otherCrypto - targets.otherCrypto).toFixed(1)}%
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-xs sm:text-sm mb-2">
                          <span className="text-muted-foreground">Stocks/ETFs</span>
                          <span className="font-medium">{allocation.stocks.toFixed(1)}% / {targets.stocks}%</span>
                        </div>
                        <Progress value={(allocation.stocks / targets.stocks) * 100} className="h-2" />
                        {Math.abs(allocation.stocks - targets.stocks) > 5 && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {allocation.stocks < targets.stocks ? 'Consider increasing' : 'Consider decreasing'} by {Math.abs(allocation.stocks - targets.stocks).toFixed(1)}%
                          </p>
                        )}
                      </div>

                      <div>
                        <div className="flex justify-between text-xs sm:text-sm mb-2">
                          <span className="text-muted-foreground">Cash</span>
                          <span className="font-medium">{allocation.cash.toFixed(1)}% / {targets.cash}%</span>
                        </div>
                        <Progress value={(allocation.cash / targets.cash) * 100} className="h-2" />
                        {Math.abs(allocation.cash - targets.cash) > 2 && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {allocation.cash < targets.cash ? 'Consider increasing' : 'Consider decreasing'} by {Math.abs(allocation.cash - targets.cash).toFixed(1)}%
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <h4 className="text-xs sm:text-sm font-semibold mb-2">Current Values</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                      <div>
                        <p className="text-muted-foreground">Crypto</p>
                        <p className="font-medium">${allocation.cryptoValue.toLocaleString(undefined, {maximumFractionDigits: 2})}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Stocks</p>
                        <p className="font-medium">${allocation.stockValue.toLocaleString(undefined, {maximumFractionDigits: 2})}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Cash</p>
                        <p className="font-medium">${allocation.cashValue.toLocaleString(undefined, {maximumFractionDigits: 2})}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Total</p>
                        <p className="font-medium">${totalValue.toLocaleString(undefined, {maximumFractionDigits: 2})}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })()}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AssetChart data={assetData} title="Asset Allocation" />
            <PortfolioTimeline data={timelineData} title="Portfolio Growth (YTD)" />
          </div>

          <MarketOverview />

          {tableAssets.length > 0 && (
            <AssetTable 
              assets={tableAssets} 
              title="Portfolio Holdings" 
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          )}
        </>
      )}

      {/* Edit Asset Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Asset</DialogTitle>
          </DialogHeader>
          
          <Form {...form}>
            <form 
              onSubmit={form.handleSubmit((data) => {
                if (editingAsset?.id) {
                  updateAsset.mutate({ id: editingAsset.id, data });
                }
              })} 
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">Asset Name</FormLabel>
                    <FormControl>
                      <Input placeholder="S&P 500 ETF" {...field} data-testid="input-edit-asset-name" />
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
                    <FormLabel className="text-sm">Symbol</FormLabel>
                    <FormControl>
                      <Input placeholder="SPY" {...field} data-testid="input-edit-asset-symbol" />
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
                    <FormLabel className="text-sm">Asset Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-edit-asset-type">
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
                    <FormLabel className="text-sm">Value ($)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="50000" 
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value))}
                        data-testid="input-edit-asset-value"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="allocation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">Allocation (%)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="0" 
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value))}
                        data-testid="input-edit-asset-allocation"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setEditDialogOpen(false);
                    setEditingAsset(null);
                  }}
                  className="flex-1"
                  data-testid="button-cancel-edit"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={updateAsset.isPending} 
                  className="flex-1" 
                  data-testid="button-submit-edit"
                >
                  {updateAsset.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
