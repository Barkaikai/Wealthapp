import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  Target, 
  Bell, 
  Plus, 
  Trash2,
  DollarSign,
  PieChart,
  FileText,
  CreditCard,
  AlertCircle
} from "lucide-react";
import { format } from "date-fns";
import type { Transaction, WealthAlert, FinancialGoal, Liability } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";

export default function WealthMonitor() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");

  // Fetch all data
  const { data: analytics, isLoading: analyticsLoading } = useQuery<{
    totalAssets: number;
    totalLiabilities: number;
    netWorth: number;
    totalInvested: number;
    totalRealized: number;
    unrealizedPL: number;
    realizedPL: number;
    totalPL: number;
    assetCount: number;
    liabilityCount: number;
    transactionCount: number;
  }>({
    queryKey: ['/api/portfolio/analytics'],
  });

  const { data: transactions = [], isLoading: transactionsLoading } = useQuery<Transaction[]>({
    queryKey: ['/api/transactions'],
  });

  const { data: alerts = [], isLoading: alertsLoading } = useQuery<WealthAlert[]>({
    queryKey: ['/api/wealth-alerts'],
  });

  const { data: goals = [], isLoading: goalsLoading } = useQuery<FinancialGoal[]>({
    queryKey: ['/api/financial-goals'],
  });

  const { data: liabilities = [], isLoading: liabilitiesLoading } = useQuery<Liability[]>({
    queryKey: ['/api/liabilities'],
  });

  // Mutations
  const createTransactionMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log('[WealthMonitor] Creating transaction with data:', data);
      const result = await apiRequest('POST', '/api/transactions', data);
      console.log('[WealthMonitor] Transaction created:', result);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/portfolio/analytics'] });
      toast({ title: "Transaction added successfully" });
    },
    onError: (error: any) => {
      console.error('[WealthMonitor] Transaction creation failed:', error);
      toast({ 
        title: "Failed to create transaction", 
        description: error.message || "Please try again",
        variant: "destructive" 
      });
    },
  });

  const createAlertMutation = useMutation({
    mutationFn: async (data: any) => await apiRequest('POST', '/api/wealth-alerts', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/wealth-alerts'] });
      toast({ title: "Alert created successfully" });
    },
  });

  const createGoalMutation = useMutation({
    mutationFn: async (data: any) => await apiRequest('POST', '/api/financial-goals', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/financial-goals'] });
      toast({ title: "Goal created successfully" });
    },
  });

  const createLiabilityMutation = useMutation({
    mutationFn: async (data: any) => await apiRequest('POST', '/api/liabilities', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/liabilities'] });
      queryClient.invalidateQueries({ queryKey: ['/api/portfolio/analytics'] });
      toast({ title: "Liability added successfully" });
    },
  });

  const deleteAlertMutation = useMutation({
    mutationFn: async (id: number) => await apiRequest('DELETE', `/api/wealth-alerts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/wealth-alerts'] });
      toast({ title: "Alert deleted successfully" });
    },
  });

  const deleteGoalMutation = useMutation({
    mutationFn: async (id: number) => await apiRequest('DELETE', `/api/financial-goals/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/financial-goals'] });
      toast({ title: "Goal deleted successfully" });
    },
  });

  const deleteLiabilityMutation = useMutation({
    mutationFn: async (id: number) => await apiRequest('DELETE', `/api/liabilities/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/liabilities'] });
      queryClient.invalidateQueries({ queryKey: ['/api/portfolio/analytics'] });
      toast({ title: "Liability deleted successfully" });
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Wealth Monitor</h1>
        <p className="text-muted-foreground">
          Track transactions, manage alerts, monitor goals, and optimize your financial health
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5 mb-6">
          <TabsTrigger value="overview" data-testid="tab-overview">
            <PieChart className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="transactions" data-testid="tab-transactions">
            <FileText className="h-4 w-4 mr-2" />
            Transactions
          </TabsTrigger>
          <TabsTrigger value="alerts" data-testid="tab-alerts">
            <Bell className="h-4 w-4 mr-2" />
            Alerts
          </TabsTrigger>
          <TabsTrigger value="goals" data-testid="tab-goals">
            <Target className="h-4 w-4 mr-2" />
            Goals
          </TabsTrigger>
          <TabsTrigger value="liabilities" data-testid="tab-liabilities">
            <CreditCard className="h-4 w-4 mr-2" />
            Liabilities
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          {analyticsLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-4 w-24" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-8 w-32" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card data-testid="card-net-worth">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Net Worth</CardTitle>
                  <Wallet className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-net-worth">
                    ${analytics?.netWorth?.toLocaleString() || '0'}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Assets - Liabilities
                  </p>
                </CardContent>
              </Card>

              <Card data-testid="card-total-assets">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400" data-testid="text-total-assets">
                    ${analytics?.totalAssets?.toLocaleString() || '0'}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {analytics?.assetCount || 0} holdings
                  </p>
                </CardContent>
              </Card>

              <Card data-testid="card-total-liabilities">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Liabilities</CardTitle>
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400" data-testid="text-total-liabilities">
                    ${analytics?.totalLiabilities?.toLocaleString() || '0'}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {analytics?.liabilityCount || 0} items
                  </p>
                </CardContent>
              </Card>

              <Card data-testid="card-total-pl">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total P&L</CardTitle>
                  {(analytics?.totalPL || 0) >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-600" />
                  )}
                </CardHeader>
                <CardContent>
                  <div 
                    className={`text-2xl font-bold ${(analytics?.totalPL || 0) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}
                    data-testid="text-total-pl"
                  >
                    ${analytics?.totalPL?.toLocaleString() || '0'}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Realized + Unrealized
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Performance Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Unrealized P&L</span>
                  <span className={`font-semibold ${(analytics?.unrealizedPL || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ${analytics?.unrealizedPL?.toLocaleString() || '0'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Realized P&L</span>
                  <span className={`font-semibold ${(analytics?.realizedPL || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ${analytics?.realizedPL?.toLocaleString() || '0'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total Invested</span>
                  <span className="font-semibold">${analytics?.totalInvested?.toLocaleString() || '0'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Transactions</span>
                  <span className="font-semibold">{analytics?.transactionCount || 0}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Active Monitoring</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Active Alerts</span>
                  <Badge variant="secondary">{alerts.filter(a => a.isActive === 'true').length}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Active Goals</span>
                  <Badge variant="secondary">{goals.filter(g => g.status === 'active').length}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Outstanding Liabilities</span>
                  <Badge variant="secondary">{liabilities.length}</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Transactions Tab */}
        <TabsContent value="transactions">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Transaction History</CardTitle>
                <CardDescription>Track all your buy, sell, and dividend transactions</CardDescription>
              </div>
              <TransactionDialog onSave={(data) => createTransactionMutation.mutate(data)} />
            </CardHeader>
            <CardContent>
              {transactionsLoading ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : transactions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No transactions yet. Add your first transaction to start tracking.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {transactions.map((tx) => (
                    <div 
                      key={tx.id} 
                      className="flex items-center justify-between p-4 rounded-lg border hover-elevate"
                      data-testid={`transaction-${tx.id}`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={tx.type === 'buy' ? 'default' : tx.type === 'sell' ? 'destructive' : 'secondary'}>
                            {tx.type}
                          </Badge>
                          <span className="font-semibold">{tx.symbol}</span>
                          <span className="text-sm text-muted-foreground">• {tx.assetType}</span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {tx.quantity} @ ${tx.pricePerUnit?.toLocaleString()} 
                          {tx.notes && ` • ${tx.notes}`}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">${tx.totalAmount?.toLocaleString()}</div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(tx.transactionDate), 'MMM d, yyyy')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Wealth Alerts</CardTitle>
                <CardDescription>Set price and portfolio threshold alerts</CardDescription>
              </div>
              <AlertDialog onSave={(data) => createAlertMutation.mutate(data)} />
            </CardHeader>
            <CardContent>
              {alertsLoading ? (
                <div className="space-y-2">
                  {[...Array(2)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : alerts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Bell className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No alerts configured. Create alerts to monitor price changes.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {alerts.map((alert) => (
                    <div 
                      key={alert.id} 
                      className="flex items-center justify-between p-4 rounded-lg border"
                      data-testid={`alert-${alert.id}`}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <AlertCircle className={`h-5 w-5 ${alert.isActive === 'true' ? 'text-yellow-600' : 'text-muted-foreground'}`} />
                        <div>
                          <div className="font-semibold">
                            {alert.symbol || 'Portfolio'} • {alert.alertType}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Threshold: ${alert.threshold?.toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => deleteAlertMutation.mutate(alert.id)}
                        data-testid={`button-delete-alert-${alert.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Goals Tab */}
        <TabsContent value="goals">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Financial Goals</CardTitle>
                <CardDescription>Track your wealth objectives and progress</CardDescription>
              </div>
              <GoalDialog onSave={(data) => createGoalMutation.mutate(data)} />
            </CardHeader>
            <CardContent>
              {goalsLoading ? (
                <div className="space-y-4">
                  {[...Array(2)].map((_, i) => (
                    <Skeleton key={i} className="h-24 w-full" />
                  ))}
                </div>
              ) : goals.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Target className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No goals set. Define your financial objectives to track progress.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {goals.map((goal) => {
                    const progress = ((goal.currentAmount || 0) / goal.targetAmount) * 100;
                    return (
                      <div 
                        key={goal.id} 
                        className="p-4 rounded-lg border space-y-3"
                        data-testid={`goal-${goal.id}`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold">{goal.title}</h3>
                              <Badge variant={goal.status === 'achieved' ? 'default' : 'secondary'}>
                                {goal.status}
                              </Badge>
                            </div>
                            {goal.description && (
                              <p className="text-sm text-muted-foreground">{goal.description}</p>
                            )}
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => deleteGoalMutation.mutate(goal.id)}
                            data-testid={`button-delete-goal-${goal.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Progress</span>
                            <span className="font-semibold">
                              ${goal.currentAmount?.toLocaleString()} / ${goal.targetAmount?.toLocaleString()}
                            </span>
                          </div>
                          <Progress value={progress} className="h-2" />
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>{progress.toFixed(1)}% complete</span>
                            {goal.targetDate && (
                              <span>Target: {format(new Date(goal.targetDate), 'MMM d, yyyy')}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Liabilities Tab */}
        <TabsContent value="liabilities">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Liabilities</CardTitle>
                <CardDescription>Manage debts and financial obligations</CardDescription>
              </div>
              <LiabilityDialog onSave={(data) => createLiabilityMutation.mutate(data)} />
            </CardHeader>
            <CardContent>
              {liabilitiesLoading ? (
                <div className="space-y-2">
                  {[...Array(2)].map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : liabilities.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CreditCard className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No liabilities tracked. Add debts to calculate accurate net worth.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {liabilities.map((liability) => (
                    <div 
                      key={liability.id} 
                      className="flex items-center justify-between p-4 rounded-lg border"
                      data-testid={`liability-${liability.id}`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold">{liability.name}</span>
                          <Badge variant="outline">{liability.type}</Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {liability.interestRate && `${liability.interestRate}% APR`}
                          {liability.minimumPayment && ` • Min payment: $${liability.minimumPayment}`}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="font-semibold text-red-600 dark:text-red-400">
                            ${liability.amount?.toLocaleString()}
                          </div>
                          {liability.dueDate && (
                            <div className="text-xs text-muted-foreground">
                              Due: {format(new Date(liability.dueDate), 'MMM d, yyyy')}
                            </div>
                          )}
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => deleteLiabilityMutation.mutate(liability.id)}
                          data-testid={`button-delete-liability-${liability.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Transaction Dialog Component
function TransactionDialog({ onSave }: { onSave: (data: any) => void }) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    type: 'buy',
    symbol: '',
    assetType: 'stocks',
    quantity: '',
    pricePerUnit: '',
    fees: '',
    notes: '',
    transactionDate: new Date().toISOString().split('T')[0],
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[TransactionDialog] Form submitted with data:', formData);
    
    const quantity = parseFloat(formData.quantity);
    const pricePerUnit = parseFloat(formData.pricePerUnit);
    const fees = parseFloat(formData.fees) || 0;
    const totalAmount = (quantity * pricePerUnit) + fees;
    
    const transactionData = {
      assetId: null,
      type: formData.type,
      symbol: formData.symbol,
      assetType: formData.assetType,
      quantity,
      pricePerUnit,
      totalAmount,
      fees,
      notes: formData.notes || null,
      transactionDate: new Date(formData.transactionDate).toISOString(),
    };
    
    console.log('[TransactionDialog] Submitting transaction:', transactionData);
    onSave(transactionData);
    setOpen(false);
    setFormData({
      type: 'buy',
      symbol: '',
      assetType: 'stocks',
      quantity: '',
      pricePerUnit: '',
      fees: '',
      notes: '',
      transactionDate: new Date().toISOString().split('T')[0],
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="button-add-transaction">
          <Plus className="h-4 w-4 mr-2" />
          Add Transaction
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Transaction</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Type</Label>
              <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                <SelectTrigger data-testid="select-transaction-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="buy">Buy</SelectItem>
                  <SelectItem value="sell">Sell</SelectItem>
                  <SelectItem value="dividend">Dividend</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Asset Type</Label>
              <Select value={formData.assetType} onValueChange={(value) => setFormData({ ...formData, assetType: value })}>
                <SelectTrigger data-testid="select-asset-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="stocks">Stocks</SelectItem>
                  <SelectItem value="crypto">Crypto</SelectItem>
                  <SelectItem value="bonds">Bonds</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Symbol</Label>
            <Input 
              value={formData.symbol} 
              onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
              placeholder="AAPL, BTC, etc."
              required
              data-testid="input-symbol"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Quantity</Label>
              <Input 
                type="number"
                step="any"
                value={formData.quantity} 
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                required
                data-testid="input-quantity"
              />
            </div>
            <div>
              <Label>Price per Unit</Label>
              <Input 
                type="number"
                step="any"
                value={formData.pricePerUnit} 
                onChange={(e) => setFormData({ ...formData, pricePerUnit: e.target.value })}
                required
                data-testid="input-price-per-unit"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Fees (optional)</Label>
              <Input 
                type="number"
                step="any"
                value={formData.fees} 
                onChange={(e) => setFormData({ ...formData, fees: e.target.value })}
                data-testid="input-fees"
              />
            </div>
            <div>
              <Label>Date</Label>
              <Input 
                type="date"
                value={formData.transactionDate} 
                onChange={(e) => setFormData({ ...formData, transactionDate: e.target.value })}
                required
                data-testid="input-transaction-date"
              />
            </div>
          </div>
          <div>
            <Label>Notes (optional)</Label>
            <Textarea 
              value={formData.notes} 
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional details..."
              data-testid="textarea-notes"
            />
          </div>
          <DialogFooter>
            <Button type="submit" data-testid="button-save-transaction">Save Transaction</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Alert Dialog Component
function AlertDialog({ onSave }: { onSave: (data: any) => void }) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    alertType: 'price_above',
    symbol: '',
    assetType: 'stocks',
    threshold: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      threshold: parseFloat(formData.threshold),
      isActive: 'true',
    });
    setOpen(false);
    setFormData({
      alertType: 'price_above',
      symbol: '',
      assetType: 'stocks',
      threshold: '',
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="button-add-alert">
          <Plus className="h-4 w-4 mr-2" />
          Add Alert
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Alert</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Alert Type</Label>
            <Select value={formData.alertType} onValueChange={(value) => setFormData({ ...formData, alertType: value })}>
              <SelectTrigger data-testid="select-alert-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="price_above">Price Above</SelectItem>
                <SelectItem value="price_below">Price Below</SelectItem>
                <SelectItem value="portfolio_value">Portfolio Value</SelectItem>
                <SelectItem value="percent_change">Percent Change</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Symbol</Label>
              <Input 
                value={formData.symbol} 
                onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
                placeholder="AAPL, BTC, etc."
                data-testid="input-alert-symbol"
              />
            </div>
            <div>
              <Label>Asset Type</Label>
              <Select value={formData.assetType} onValueChange={(value) => setFormData({ ...formData, assetType: value })}>
                <SelectTrigger data-testid="select-alert-asset-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="stocks">Stocks</SelectItem>
                  <SelectItem value="crypto">Crypto</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Threshold Value</Label>
            <Input 
              type="number"
              step="any"
              value={formData.threshold} 
              onChange={(e) => setFormData({ ...formData, threshold: e.target.value })}
              required
              data-testid="input-threshold"
            />
          </div>
          <DialogFooter>
            <Button type="submit" data-testid="button-save-alert">Create Alert</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Goal Dialog Component
function GoalDialog({ onSave }: { onSave: (data: any) => void }) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    targetAmount: '',
    currentAmount: '',
    targetDate: '',
    category: 'investment',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      targetAmount: parseFloat(formData.targetAmount),
      currentAmount: parseFloat(formData.currentAmount) || 0,
      targetDate: formData.targetDate ? new Date(formData.targetDate) : null,
      status: 'active',
    });
    setOpen(false);
    setFormData({
      title: '',
      description: '',
      targetAmount: '',
      currentAmount: '',
      targetDate: '',
      category: 'investment',
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="button-add-goal">
          <Plus className="h-4 w-4 mr-2" />
          Add Goal
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Financial Goal</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Title</Label>
            <Input 
              value={formData.title} 
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Retirement Fund"
              required
              data-testid="input-goal-title"
            />
          </div>
          <div>
            <Label>Description (optional)</Label>
            <Textarea 
              value={formData.description} 
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Additional details..."
              data-testid="textarea-goal-description"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Target Amount</Label>
              <Input 
                type="number"
                step="any"
                value={formData.targetAmount} 
                onChange={(e) => setFormData({ ...formData, targetAmount: e.target.value })}
                required
                data-testid="input-target-amount"
              />
            </div>
            <div>
              <Label>Current Amount</Label>
              <Input 
                type="number"
                step="any"
                value={formData.currentAmount} 
                onChange={(e) => setFormData({ ...formData, currentAmount: e.target.value })}
                data-testid="input-current-amount"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Category</Label>
              <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                <SelectTrigger data-testid="select-goal-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="retirement">Retirement</SelectItem>
                  <SelectItem value="property">Property</SelectItem>
                  <SelectItem value="investment">Investment</SelectItem>
                  <SelectItem value="emergency_fund">Emergency Fund</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Target Date (optional)</Label>
              <Input 
                type="date"
                value={formData.targetDate} 
                onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })}
                data-testid="input-target-date"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" data-testid="button-save-goal">Create Goal</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Liability Dialog Component
function LiabilityDialog({ onSave }: { onSave: (data: any) => void }) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: 'loan',
    amount: '',
    interestRate: '',
    minimumPayment: '',
    dueDate: '',
    notes: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      amount: parseFloat(formData.amount),
      interestRate: formData.interestRate ? parseFloat(formData.interestRate) : null,
      minimumPayment: formData.minimumPayment ? parseFloat(formData.minimumPayment) : null,
      dueDate: formData.dueDate ? new Date(formData.dueDate) : null,
    });
    setOpen(false);
    setFormData({
      name: '',
      type: 'loan',
      amount: '',
      interestRate: '',
      minimumPayment: '',
      dueDate: '',
      notes: '',
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="button-add-liability">
          <Plus className="h-4 w-4 mr-2" />
          Add Liability
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Liability</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Name</Label>
            <Input 
              value={formData.name} 
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Home Mortgage"
              required
              data-testid="input-liability-name"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Type</Label>
              <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                <SelectTrigger data-testid="select-liability-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mortgage">Mortgage</SelectItem>
                  <SelectItem value="loan">Loan</SelectItem>
                  <SelectItem value="credit_card">Credit Card</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Amount</Label>
              <Input 
                type="number"
                step="any"
                value={formData.amount} 
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                required
                data-testid="input-liability-amount"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Interest Rate % (optional)</Label>
              <Input 
                type="number"
                step="any"
                value={formData.interestRate} 
                onChange={(e) => setFormData({ ...formData, interestRate: e.target.value })}
                data-testid="input-interest-rate"
              />
            </div>
            <div>
              <Label>Min Payment (optional)</Label>
              <Input 
                type="number"
                step="any"
                value={formData.minimumPayment} 
                onChange={(e) => setFormData({ ...formData, minimumPayment: e.target.value })}
                data-testid="input-minimum-payment"
              />
            </div>
          </div>
          <div>
            <Label>Due Date (optional)</Label>
            <Input 
              type="date"
              value={formData.dueDate} 
              onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              data-testid="input-due-date"
            />
          </div>
          <div>
            <Label>Notes (optional)</Label>
            <Textarea 
              value={formData.notes} 
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional details..."
              data-testid="textarea-liability-notes"
            />
          </div>
          <DialogFooter>
            <Button type="submit" data-testid="button-save-liability">Add Liability</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
