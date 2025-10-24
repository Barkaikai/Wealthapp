import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { useMemo } from "react";
import type { Asset } from "@shared/schema";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface AssetPriceChartProps {
  assets: Asset[];
  title: string;
}

export function AssetPriceChart({ assets, title }: AssetPriceChartProps) {
  // Sort assets by value (highest first)  
  const sortedAssets = useMemo(() => {
    return [...assets].sort((a, b) => b.value - a.value);
  }, [assets]);

  // Calculate total portfolio value
  const totalValue = useMemo(() => {
    return assets.reduce((sum, asset) => sum + asset.value, 0);
  }, [assets]);

  // Prepare chart data - top 10 assets by value
  const chartData = useMemo(() => {
    return sortedAssets.slice(0, 10).map(asset => ({
      name: asset.symbol || asset.name.substring(0, 8),
      value: asset.value,
      change: asset.changePercent || 0,
      fullName: asset.name,
    }));
  }, [sortedAssets]);

  // Color based on performance
  const getBarColor = (change: number) => {
    if (change > 0) return "hsl(142, 76%, 36%)"; // Green
    if (change < 0) return "hsl(0, 84%, 60%)"; // Red
    return "hsl(var(--muted-foreground))"; // Gray
  };

  return (
    <Card className="p-6" data-testid="card-asset-price-chart">
      <CardHeader className="p-0 pb-6">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base sm:text-lg">{title}</CardTitle>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Total Value</div>
            <div className="text-base sm:text-lg font-semibold">
              ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0 space-y-6">
        {sortedAssets.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">No assets to display</p>
            <p className="text-xs mt-1">Add assets to see live prices</p>
          </div>
        ) : (
          <>
            {/* Price Chart */}
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground mb-3">
                Top {Math.min(10, sortedAssets.length)} Holdings by Value
              </h4>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="name"
                    stroke="hsl(var(--muted-foreground))"
                    style={{ fontSize: "11px" }}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    style={{ fontSize: "11px" }}
                    tickFormatter={(value) => 
                      value >= 1000000 
                        ? `$${(value / 1000000).toFixed(1)}M`
                        : value >= 1000
                        ? `$${(value / 1000).toFixed(0)}K`
                        : `$${value}`
                    }
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "6px",
                      fontSize: "12px",
                    }}
                    formatter={(value: number, name: string, props: any) => [
                      `$${value.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
                      props.payload.fullName,
                    ]}
                    labelFormatter={() => ""}
                  />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getBarColor(entry.change)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Holdings List */}
            <div className="space-y-2 pt-4 border-t">
              <h4 className="text-xs font-semibold text-muted-foreground mb-3">
                All Holdings ({sortedAssets.length})
              </h4>
              <div className="max-h-64 overflow-y-auto space-y-2">
                {sortedAssets.map((asset, index) => {
                  const allocation = totalValue > 0 ? (asset.value / totalValue) * 100 : 0;
                  const hasChange = asset.changePercent !== undefined && asset.changePercent !== 0;
                  const isPositive = asset.changePercent && asset.changePercent > 0;
                  const isNegative = asset.changePercent && asset.changePercent < 0;
                  
                  // Calculate price per unit if quantity is available
                  const pricePerUnit = asset.quantity && asset.quantity > 0 
                    ? asset.value / asset.quantity 
                    : null;

                  return (
                    <div
                      key={asset.id}
                      className="flex items-center justify-between p-2 border rounded-lg hover-elevate text-sm"
                      data-testid={`asset-price-${index}`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold truncate">{asset.symbol || asset.name}</span>
                          <span className="text-xs px-1.5 py-0.5 rounded-full bg-muted">
                            {allocation.toFixed(1)}%
                          </span>
                        </div>
                        {asset.quantity && asset.quantity !== 1 && pricePerUnit && (
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {asset.quantity.toLocaleString(undefined, { maximumFractionDigits: 4 })} @ $
                            {pricePerUnit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                        )}
                      </div>
                      
                      <div className="text-right ml-4">
                        <div className="font-semibold">
                          ${asset.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        {hasChange && (
                          <div className={`flex items-center justify-end gap-1 text-xs ${
                            isPositive ? "text-green-500" : isNegative ? "text-red-500" : "text-muted-foreground"
                          }`}>
                            {isPositive && <TrendingUp className="h-3 w-3" />}
                            {isNegative && <TrendingDown className="h-3 w-3" />}
                            {!isPositive && !isNegative && <Minus className="h-3 w-3" />}
                            <span>
                              {isPositive ? "+" : ""}
                              {asset.changePercent!.toFixed(2)}%
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-2 border-t">
              <div className="text-xs text-muted-foreground text-center">
                Chart colors: <span className="text-green-500">Green</span> = positive 24h change • <span className="text-red-500">Red</span> = negative 24h change
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
