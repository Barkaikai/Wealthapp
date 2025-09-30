import { AssetTable } from "../AssetTable";

export default function AssetTableExample() {
  const assets = [
    { name: "S&P 500 ETF", symbol: "SPY", value: 450000, allocation: 35, change24h: 3600, changePercent: 0.8 },
    { name: "Bitcoin", symbol: "BTC", value: 280000, allocation: 22, change24h: -4200, changePercent: -1.5 },
    { name: "Technology ETF", symbol: "QQQ", value: 320000, allocation: 25, change24h: 5100, changePercent: 1.6 },
    { name: "Treasury Bonds", symbol: "TLT", value: 230000, allocation: 18, change24h: 690, changePercent: 0.3 },
  ];

  return (
    <div className="p-6">
      <AssetTable assets={assets} title="Portfolio Holdings" />
    </div>
  );
}
