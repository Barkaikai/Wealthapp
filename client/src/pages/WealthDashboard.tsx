import { useQuery, useMutation } from "@tanstack/react-query";
import { AssetChart } from "@/components/AssetChart";
import { PortfolioTimeline } from "@/components/PortfolioTimeline";
import { AssetTable } from "@/components/AssetTable";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Download } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertAssetSchema, type Asset } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

export default function WealthDashboard() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data: assets = [] } = useQuery<Asset[]>({
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

  const createAsset = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("/api/assets", "POST", data);
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
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-asset">
                <Plus className="h-4 w-4 mr-2" />
                Add Asset
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Asset</DialogTitle>
              </DialogHeader>
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
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AssetChart data={assetData} title="Asset Allocation" />
        <PortfolioTimeline data={timelineData} title="Portfolio Growth (YTD)" />
      </div>

      {tableAssets.length > 0 && <AssetTable assets={tableAssets} title="Portfolio Holdings" />}
    </div>
  );
}
