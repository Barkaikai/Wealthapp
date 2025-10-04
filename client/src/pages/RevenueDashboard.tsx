import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DollarSign, TrendingUp, CreditCard, Calendar } from "lucide-react";
import { Skeleton } from "@/components/Skeleton";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useState } from "react";

interface RevenueEntry {
  id: number;
  source: string;
  amount: number;
  currency: string;
  usdAmount: number;
  eventType: string;
  createdAt: string;
  metadata: any;
}

interface RevenueSummary {
  total: number;
  bySource: Record<string, number>;
  byCurrency: Record<string, number>;
  count: number;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', '#8884d8', '#82ca9d', '#ffc658'];

export default function RevenueDashboard() {
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    endDate: new Date().toISOString(),
  });

  const { data: entries = [], isLoading: entriesLoading } = useQuery<RevenueEntry[]>({
    queryKey: [`/api/revenue/entries?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`],
  });

  const { data: summary, isLoading: summaryLoading } = useQuery<RevenueSummary>({
    queryKey: [`/api/revenue/summary?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`],
  });

  const isLoading = entriesLoading || summaryLoading;

  const chartData = entries.reduce((acc: any[], entry) => {
    const date = new Date(entry.createdAt).toLocaleDateString();
    const existing = acc.find(item => item.date === date);
    
    if (existing) {
      existing.amount += entry.usdAmount;
    } else {
      acc.push({ date, amount: entry.usdAmount });
    }
    
    return acc;
  }, []);

  const sourceData = summary?.bySource 
    ? Object.entries(summary.bySource).map(([name, value]) => ({ name, value }))
    : [];

  const currencyData = summary?.byCurrency
    ? Object.entries(summary.byCurrency).map(([name, value]) => ({ name, value }))
    : [];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Revenue Dashboard</h1>
          <p className="text-muted-foreground">Enterprise analytics and insights</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card data-testid="card-total-revenue">
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <div className="text-2xl font-bold" data-testid="text-total-revenue">
                {formatCurrency(summary?.total || 0)}
              </div>
            )}
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>

        <Card data-testid="card-revenue-count">
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transactions</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold" data-testid="text-transaction-count">
                {summary?.count || 0}
              </div>
            )}
            <p className="text-xs text-muted-foreground">Revenue events</p>
          </CardContent>
        </Card>

        <Card data-testid="card-mrr">
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">MRR</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <div className="text-2xl font-bold" data-testid="text-mrr">
                {formatCurrency((summary?.bySource?.['stripe_subscription'] || 0))}
              </div>
            )}
            <p className="text-xs text-muted-foreground">Monthly recurring</p>
          </CardContent>
        </Card>

        <Card data-testid="card-avg-transaction">
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Transaction</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <div className="text-2xl font-bold" data-testid="text-avg-transaction">
                {formatCurrency(summary?.count ? (summary.total / summary.count) : 0)}
              </div>
            )}
            <p className="text-xs text-muted-foreground">Per transaction</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="timeline" className="space-y-4">
        <TabsList>
          <TabsTrigger value="timeline" data-testid="tab-timeline">Timeline</TabsTrigger>
          <TabsTrigger value="sources" data-testid="tab-sources">Sources</TabsTrigger>
          <TabsTrigger value="currencies" data-testid="tab-currencies">Currencies</TabsTrigger>
          <TabsTrigger value="transactions" data-testid="tab-transactions">Transactions</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Revenue Timeline</CardTitle>
              <CardDescription>Daily revenue breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-80 w-full" />
              ) : chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(value as number)} />
                    <Legend />
                    <Line type="monotone" dataKey="amount" stroke="hsl(var(--primary))" strokeWidth={2} name="Revenue (USD)" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-80 flex items-center justify-center text-muted-foreground">
                  No revenue data available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sources" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Revenue by Source</CardTitle>
              <CardDescription>Breakdown by revenue stream</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-80 w-full" />
              ) : sourceData.length > 0 ? (
                <div className="grid md:grid-cols-2 gap-4">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={sourceData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(entry) => entry.name}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {sourceData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(value as number)} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2">
                    {sourceData.map((item, index) => (
                      <div key={item.name} className="flex items-center justify-between p-2 rounded hover-elevate">
                        <div className="flex items-center gap-2">
                          <div className="h-3 w-3 rounded" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                          <span className="text-sm font-medium">{item.name}</span>
                        </div>
                        <span className="text-sm font-bold">{formatCurrency(item.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="h-80 flex items-center justify-center text-muted-foreground">
                  No source data available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="currencies" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Revenue by Currency</CardTitle>
              <CardDescription>Multi-currency breakdown (original amounts)</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-80 w-full" />
              ) : currencyData.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={currencyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="value" fill="hsl(var(--primary))" name="Amount (Original Currency)" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-80 flex items-center justify-center text-muted-foreground">
                  No currency data available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
              <CardDescription>Latest revenue entries</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5].map(i => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : entries.length > 0 ? (
                <div className="space-y-2">
                  {entries.slice(0, 10).map((entry) => (
                    <div key={entry.id} className="flex items-center justify-between p-3 rounded-md border hover-elevate" data-testid={`transaction-${entry.id}`}>
                      <div className="space-y-1">
                        <p className="text-sm font-medium">{entry.source}</p>
                        <p className="text-xs text-muted-foreground">{entry.eventType}</p>
                        <p className="text-xs text-muted-foreground">{new Date(entry.createdAt).toLocaleString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold">{formatCurrency(entry.usdAmount)}</p>
                        <p className="text-xs text-muted-foreground">
                          {entry.amount.toFixed(2)} {entry.currency}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-40 flex items-center justify-center text-muted-foreground">
                  No transactions available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
