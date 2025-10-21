import { Card } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface Asset {
  id?: number;
  name: string;
  symbol: string;
  value: number;
  allocation: number;
  change24h: number;
  changePercent: number;
}

interface AssetTableProps {
  assets: Asset[];
  title: string;
}

export function AssetTable({ assets, title }: AssetTableProps) {
  return (
    <Card className="p-6" data-testid="table-assets">
      <h3 className="font-semibold mb-6">{title}</h3>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Asset</th>
              <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">Value</th>
              <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">Allocation</th>
              <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">24h Change</th>
            </tr>
          </thead>
          <tbody>
            {assets.map((asset, index) => (
              <tr 
                key={asset.id || `${asset.symbol}-${index}`} 
                className="border-b border-border/50 hover-elevate"
                data-testid={`asset-row-${asset.symbol}`}
              >
                <td className="py-4 px-2">
                  <div>
                    <p className="font-medium">{asset.name}</p>
                    <p className="text-sm text-muted-foreground">{asset.symbol}</p>
                  </div>
                </td>
                <td className="py-4 px-2 text-right font-mono">
                  ${asset.value.toLocaleString()}
                </td>
                <td className="py-4 px-2 text-right">
                  <span className="text-sm text-muted-foreground">{asset.allocation}%</span>
                </td>
                <td className="py-4 px-2 text-right">
                  <div className="flex items-center justify-end gap-1">
                    {asset.changePercent >= 0 ? (
                      <TrendingUp className="h-4 w-4 text-chart-3" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-destructive" />
                    )}
                    <span className={cn(
                      "font-mono text-sm",
                      asset.changePercent >= 0 ? "text-chart-3" : "text-destructive"
                    )}>
                      {asset.changePercent >= 0 ? "+" : ""}{asset.changePercent.toFixed(2)}%
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
