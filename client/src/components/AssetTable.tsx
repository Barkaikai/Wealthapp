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
    <Card className="p-3 sm:p-6" data-testid="table-assets">
      <h3 className="font-semibold mb-4 sm:mb-6 text-sm sm:text-base">{title}</h3>
      <div className="overflow-x-auto -mx-3 sm:mx-0">
        <div className="min-w-[500px] sm:min-w-0">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 sm:py-3 px-2 text-xs sm:text-sm font-medium text-muted-foreground">Asset</th>
                <th className="text-right py-2 sm:py-3 px-2 text-xs sm:text-sm font-medium text-muted-foreground">Value</th>
                <th className="text-right py-2 sm:py-3 px-2 text-xs sm:text-sm font-medium text-muted-foreground hidden sm:table-cell">Allocation</th>
                <th className="text-right py-2 sm:py-3 px-2 text-xs sm:text-sm font-medium text-muted-foreground">24h</th>
              </tr>
            </thead>
            <tbody>
              {assets.map((asset, index) => (
                <tr 
                  key={asset.id || `${asset.symbol}-${index}`} 
                  className="border-b border-border/50 hover-elevate"
                  data-testid={`asset-row-${asset.symbol}`}
                >
                  <td className="py-3 sm:py-4 px-2">
                    <div className="min-w-0">
                      <p className="font-medium text-sm sm:text-base truncate">{asset.name}</p>
                      <p className="text-xs sm:text-sm text-muted-foreground">{asset.symbol}</p>
                    </div>
                  </td>
                  <td className="py-3 sm:py-4 px-2 text-right font-mono text-xs sm:text-sm whitespace-nowrap">
                    ${asset.value.toLocaleString()}
                  </td>
                  <td className="py-3 sm:py-4 px-2 text-right hidden sm:table-cell">
                    <span className="text-sm text-muted-foreground">{asset.allocation}%</span>
                  </td>
                  <td className="py-3 sm:py-4 px-2 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {asset.changePercent >= 0 ? (
                        <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-chart-3 flex-shrink-0" />
                      ) : (
                        <TrendingDown className="h-3 w-3 sm:h-4 sm:w-4 text-destructive flex-shrink-0" />
                      )}
                      <span className={cn(
                        "font-mono text-xs sm:text-sm whitespace-nowrap",
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
      </div>
    </Card>
  );
}
