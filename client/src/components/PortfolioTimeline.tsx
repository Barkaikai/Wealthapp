import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
  Line,
  Scatter,
} from "recharts";

interface TimelineData {
  date: string;
  value: number;
}

interface OHLCData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

interface HeikinAshiData {
  date: string;
  haOpen: number;
  haHigh: number;
  haLow: number;
  haClose: number;
  isGreen: boolean;
}

interface RenkoData {
  date: string;
  value: number;
  prevValue: number;
  isGreen: boolean;
}

interface PortfolioTimelineProps {
  data: TimelineData[];
  title: string;
}

// Generate deterministic OHLC data from timeline values
function generateOHLCData(data: TimelineData[]): OHLCData[] {
  return data.map((point, index) => {
    const value = point.value;
    const prevValue = index > 0 ? data[index - 1].value : value;
    
    // Deterministic volatility based on date string hash
    const dateHash = point.date.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const volatilityFactor = (dateHash % 100) / 1000; // 0-10% volatility
    const volatility = value * volatilityFactor * 0.02;
    
    const open = prevValue;
    const close = value;
    
    // Deterministic high/low based on date hash
    const highFactor = ((dateHash * 7) % 100) / 100;
    const lowFactor = ((dateHash * 13) % 100) / 100;
    
    const high = Math.max(open, close) + volatility * highFactor;
    const low = Math.min(open, close) - volatility * lowFactor;
    
    return {
      date: point.date,
      open,
      high,
      low,
      close,
    };
  });
}

// Calculate Heikin-Ashi values
function generateHeikinAshiData(ohlcData: OHLCData[]): HeikinAshiData[] {
  const haData: HeikinAshiData[] = [];
  
  ohlcData.forEach((candle, index) => {
    if (index === 0) {
      const haClose = (candle.open + candle.high + candle.low + candle.close) / 4;
      const haOpen = candle.open;
      haData.push({
        date: candle.date,
        haOpen,
        haHigh: candle.high,
        haLow: candle.low,
        haClose,
        isGreen: haClose >= haOpen,
      });
    } else {
      const prevHA = haData[index - 1];
      const haClose = (candle.open + candle.high + candle.low + candle.close) / 4;
      const haOpen = (prevHA.haOpen + prevHA.haClose) / 2;
      const haHigh = Math.max(candle.high, haOpen, haClose);
      const haLow = Math.min(candle.low, haOpen, haClose);
      
      haData.push({
        date: candle.date,
        haOpen,
        haHigh,
        haLow,
        haClose,
        isGreen: haClose >= haOpen,
      });
    }
  });
  
  return haData;
}

// Generate Renko data
function generateRenkoData(data: TimelineData[]): RenkoData[] {
  if (data.length === 0) return [];
  
  const renkoData: RenkoData[] = [];
  const avgChange = data.reduce((sum, point, i) => {
    if (i === 0) return 0;
    return sum + Math.abs(point.value - data[i - 1].value);
  }, 0) / Math.max(1, data.length - 1);
  
  const brickSize = avgChange * 0.5; // Half of average change
  
  let currentBrickValue = data[0].value;
  renkoData.push({
    date: data[0].date,
    value: currentBrickValue,
    prevValue: currentBrickValue,
    isGreen: true,
  });
  
  for (let i = 1; i < data.length; i++) {
    const price = data[i].value;
    const diff = price - currentBrickValue;
    const numBricks = Math.floor(Math.abs(diff) / brickSize);
    
    if (numBricks >= 1) {
      const isGreen = diff > 0;
      const direction = isGreen ? 1 : -1;
      
      for (let j = 0; j < Math.min(numBricks, 3); j++) {
        const prevValue = currentBrickValue;
        currentBrickValue += brickSize * direction;
        renkoData.push({
          date: data[i].date,
          value: currentBrickValue,
          prevValue,
          isGreen,
        });
      }
    }
  }
  
  return renkoData;
}

// Custom candlestick rendering using SVG overlay
const CandlestickChart = ({ data, formatCurrency }: { data: OHLCData[], formatCurrency: (v: number) => string }) => {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={data} margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
        <defs>
          <linearGradient id="greenCandle" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22c55e" stopOpacity={0.8} />
            <stop offset="100%" stopColor="#22c55e" stopOpacity={0.6} />
          </linearGradient>
          <linearGradient id="redCandle" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ef4444" stopOpacity={0.8} />
            <stop offset="100%" stopColor="#ef4444" stopOpacity={0.6} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis 
          dataKey="date" 
          stroke="hsl(var(--muted-foreground))"
          style={{ fontSize: "12px" }}
        />
        <YAxis 
          stroke="hsl(var(--muted-foreground))"
          style={{ fontSize: "12px" }}
          tickFormatter={formatCurrency}
          domain={['dataMin * 0.98', 'dataMax * 1.02']}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--popover))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "6px",
          }}
          content={({ active, payload }) => {
            if (active && payload && payload.length > 0) {
              const data = payload[0].payload as OHLCData;
              return (
                <div className="bg-popover border border-border rounded-md p-2 text-xs">
                  <div className="font-semibold mb-1">{data.date}</div>
                  <div className="space-y-0.5">
                    <div>Open: ${data.open.toLocaleString()}</div>
                    <div className="text-green-500">High: ${data.high.toLocaleString()}</div>
                    <div className="text-red-500">Low: ${data.low.toLocaleString()}</div>
                    <div>Close: ${data.close.toLocaleString()}</div>
                  </div>
                </div>
              );
            }
            return null;
          }}
        />
        {/* High line */}
        <Line type="monotone" dataKey="high" stroke="transparent" dot={false} />
        {/* Low line */}
        <Line type="monotone" dataKey="low" stroke="transparent" dot={false} />
        {/* Open-Close area */}
        <Area
          type="monotone"
          dataKey="close"
          stroke="#22c55e"
          fill="url(#greenCandle)"
          strokeWidth={2}
        />
        <Area
          type="monotone"
          dataKey="open"
          stroke="#ef4444"
          fill="url(#redCandle)"
          strokeWidth={2}
          fillOpacity={0.3}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
};

// Heikin-Ashi visualization
const HeikinAshiChart = ({ data, formatCurrency }: { data: HeikinAshiData[], formatCurrency: (v: number) => string }) => {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={data} margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
        <defs>
          <linearGradient id="haGreen" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22c55e" stopOpacity={0.9} />
            <stop offset="100%" stopColor="#22c55e" stopOpacity={0.7} />
          </linearGradient>
          <linearGradient id="haRed" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ef4444" stopOpacity={0.9} />
            <stop offset="100%" stopColor="#ef4444" stopOpacity={0.7} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis 
          dataKey="date" 
          stroke="hsl(var(--muted-foreground))"
          style={{ fontSize: "12px" }}
        />
        <YAxis 
          stroke="hsl(var(--muted-foreground))"
          style={{ fontSize: "12px" }}
          tickFormatter={formatCurrency}
          domain={['dataMin * 0.98', 'dataMax * 1.02']}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--popover))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "6px",
          }}
          content={({ active, payload }) => {
            if (active && payload && payload.length > 0) {
              const data = payload[0].payload as HeikinAshiData;
              const color = data.isGreen ? "text-green-500" : "text-red-500";
              return (
                <div className="bg-popover border border-border rounded-md p-2 text-xs">
                  <div className="font-semibold mb-1">{data.date}</div>
                  <div className="space-y-0.5">
                    <div>HA Open: ${data.haOpen.toLocaleString()}</div>
                    <div className={color}>HA High: ${data.haHigh.toLocaleString()}</div>
                    <div className={color}>HA Low: ${data.haLow.toLocaleString()}</div>
                    <div>HA Close: ${data.haClose.toLocaleString()}</div>
                    <div className={`${color} font-semibold`}>
                      {data.isGreen ? "Bullish" : "Bearish"}
                    </div>
                  </div>
                </div>
              );
            }
            return null;
          }}
        />
        <Area
          type="monotone"
          dataKey="haClose"
          stroke="#22c55e"
          fill="url(#haGreen)"
          strokeWidth={2}
        />
        <Area
          type="monotone"
          dataKey="haOpen"
          stroke="#ef4444"
          fill="url(#haRed)"
          strokeWidth={2}
          fillOpacity={0.3}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
};

// Renko visualization
const RenkoChart = ({ data, formatCurrency }: { data: RenkoData[], formatCurrency: (v: number) => string }) => {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={data} margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis 
          dataKey="date" 
          stroke="hsl(var(--muted-foreground))"
          style={{ fontSize: "12px" }}
        />
        <YAxis 
          stroke="hsl(var(--muted-foreground))"
          style={{ fontSize: "12px" }}
          tickFormatter={formatCurrency}
          domain={['dataMin * 0.98', 'dataMax * 1.02']}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--popover))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "6px",
          }}
          content={({ active, payload }) => {
            if (active && payload && payload.length > 0) {
              const data = payload[0].payload as RenkoData;
              const color = data.isGreen ? "text-green-500" : "text-red-500";
              return (
                <div className="bg-popover border border-border rounded-md p-2 text-xs">
                  <div className="font-semibold mb-1">{data.date}</div>
                  <div className="space-y-0.5">
                    <div>Value: ${data.value.toLocaleString()}</div>
                    <div className={`${color} font-semibold`}>
                      {data.isGreen ? "↑ Up Brick" : "↓ Down Brick"}
                    </div>
                  </div>
                </div>
              );
            }
            return null;
          }}
        />
        <Area
          type="step"
          dataKey="value"
          stroke="#3b82f6"
          fill="hsl(var(--chart-1))"
          fillOpacity={0.2}
          strokeWidth={2}
        />
        <Line
          type="step"
          dataKey="value"
          stroke="#3b82f6"
          strokeWidth={3}
          dot={{ fill: "#3b82f6", r: 3 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
};

export function PortfolioTimeline({ data, title }: PortfolioTimelineProps) {
  const [activeTab, setActiveTab] = useState("area");
  
  // Memoize expensive calculations to prevent re-generation on every render
  const ohlcData = useMemo(() => generateOHLCData(data), [data]);
  const heikinAshiData = useMemo(() => generateHeikinAshiData(ohlcData), [ohlcData]);
  const renkoData = useMemo(() => generateRenkoData(data), [data]);
  
  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    return `$${(value / 1000).toFixed(0)}K`;
  };
  
  return (
    <Card className="p-6" data-testid="card-portfolio-timeline">
      <CardHeader className="p-0 mb-4">
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4" data-testid="tabs-chart-type">
            <TabsTrigger value="area" data-testid="tab-area">Area</TabsTrigger>
            <TabsTrigger value="candlestick" data-testid="tab-candlestick">Candlestick</TabsTrigger>
            <TabsTrigger value="heikinashi" data-testid="tab-heikinashi">Heikin-Ashi</TabsTrigger>
            <TabsTrigger value="renko" data-testid="tab-renko">Renko</TabsTrigger>
          </TabsList>
          
          {/* Area Chart */}
          <TabsContent value="area">
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="date" 
                  stroke="hsl(var(--muted-foreground))"
                  style={{ fontSize: "12px" }}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  style={{ fontSize: "12px" }}
                  tickFormatter={formatCurrency}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "6px",
                  }}
                  formatter={(value: number) => [`$${value.toLocaleString()}`, "Portfolio Value"]}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="hsl(var(--chart-1))"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorValue)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </TabsContent>
          
          {/* Candlestick Chart */}
          <TabsContent value="candlestick">
            <CandlestickChart data={ohlcData} formatCurrency={formatCurrency} />
          </TabsContent>
          
          {/* Heikin-Ashi Chart */}
          <TabsContent value="heikinashi">
            <HeikinAshiChart data={heikinAshiData} formatCurrency={formatCurrency} />
          </TabsContent>
          
          {/* Renko Chart */}
          <TabsContent value="renko">
            <RenkoChart data={renkoData} formatCurrency={formatCurrency} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
