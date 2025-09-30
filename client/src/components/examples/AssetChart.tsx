import { AssetChart } from "../AssetChart";

export default function AssetChartExample() {
  const data = [
    { name: "Stocks", value: 1250000, color: "hsl(var(--chart-1))" },
    { name: "Crypto", value: 450000, color: "hsl(var(--chart-2))" },
    { name: "Bonds", value: 300000, color: "hsl(var(--chart-3))" },
    { name: "Cash", value: 200000, color: "hsl(var(--chart-4))" },
    { name: "Real Estate", value: 250000, color: "hsl(var(--chart-5))" },
  ];

  return (
    <div className="p-6">
      <AssetChart data={data} title="Asset Allocation" />
    </div>
  );
}
