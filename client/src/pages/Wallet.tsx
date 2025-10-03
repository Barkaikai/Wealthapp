import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { 
  Wallet as WalletIcon, 
  TrendingUp, 
  TrendingDown, 
  CreditCard, 
  Building2, 
  Smartphone,
  DollarSign,
  ArrowDownToLine,
  ArrowUpFromLine,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Plus,
  Coins
} from "lucide-react";
import type { Wallet, WalletTransaction, PaymentMethod } from "@shared/schema";

type WalletConnection = {
  id: number;
  walletType: string;
  walletAddress: string;
  walletName?: string;
  network?: string;
  balance: number;
  currency: string;
  isActive: string;
};

export default function WalletPage() {
  const { toast } = useToast();
  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>();
  const [showDepositDialog, setShowDepositDialog] = useState(false);
  const [showWithdrawDialog, setShowWithdrawDialog] = useState(false);
  const [web3DialogOpen, setWeb3DialogOpen] = useState(false);

  // Fiat wallet queries
  const { data: wallet, isLoading: walletLoading } = useQuery<Wallet>({
    queryKey: ['/api/wallet'],
    refetchInterval: 3000,
  });

  const { data: transactions = [], isLoading: transactionsLoading } = useQuery<WalletTransaction[]>({
    queryKey: ['/api/wallet/transactions'],
    refetchInterval: 3000,
  });

  const { data: paymentMethods = [], isLoading: paymentMethodsLoading } = useQuery<PaymentMethod[]>({
    queryKey: ['/api/payment-methods'],
  });

  // Web3 wallet queries
  const { data: web3Wallets = [] } = useQuery<WalletConnection[]>({
    queryKey: ['/api/wallets'],
  });

  // Fiat wallet mutations
  const depositMutation = useMutation({
    mutationFn: async (data: { amount: number; paymentMethodId?: string }) => {
      return apiRequest('POST', '/api/wallet/deposit', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/wallet'] });
      queryClient.invalidateQueries({ queryKey: ['/api/wallet/transactions'] });
      toast({
        title: "Deposit Initiated",
        description: "Your deposit is being processed.",
      });
      setShowDepositDialog(false);
      setDepositAmount("");
    },
    onError: (error: any) => {
      toast({
        title: "Deposit Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const withdrawMutation = useMutation({
    mutationFn: async (data: { amount: number; paymentMethodId?: string }) => {
      return apiRequest('POST', '/api/wallet/withdraw', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/wallet'] });
      queryClient.invalidateQueries({ queryKey: ['/api/wallet/transactions'] });
      toast({
        title: "Withdrawal Initiated",
        description: "Your withdrawal is being processed.",
      });
      setShowWithdrawDialog(false);
      setWithdrawAmount("");
    },
    onError: (error: any) => {
      toast({
        title: "Withdrawal Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Web3 wallet mutations
  const createWalletMutation = useMutation({
    mutationFn: async (data: any) => await apiRequest('POST', '/api/wallets', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/wallets'] });
      toast({ title: "Wallet connected successfully" });
      setWeb3DialogOpen(false);
    },
  });

  const handleDeposit = () => {
    const amount = parseFloat(depositAmount);
    if (!amount || amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount.",
        variant: "destructive",
      });
      return;
    }
    depositMutation.mutate({ amount, paymentMethodId: selectedPaymentMethod });
  };

  const handleWithdraw = () => {
    const amount = parseFloat(withdrawAmount);
    if (!amount || amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount.",
        variant: "destructive",
      });
      return;
    }
    if (wallet && amount > wallet.availableBalance) {
      toast({
        title: "Insufficient Balance",
        description: "You don't have enough available balance.",
        variant: "destructive",
      });
      return;
    }
    withdrawMutation.mutate({ amount, paymentMethodId: selectedPaymentMethod });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'pending':
      case 'processing':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'failed':
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getPaymentMethodIcon = (type: string) => {
    switch (type) {
      case 'card':
        return <CreditCard className="h-4 w-4" />;
      case 'bank_account':
        return <Building2 className="h-4 w-4" />;
      case 'google_pay':
      case 'apple_pay':
        return <Smartphone className="h-4 w-4" />;
      default:
        return <DollarSign className="h-4 w-4" />;
    }
  };

  if (walletLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const balance = wallet?.balance ?? 0;
  const availableBalance = wallet?.availableBalance ?? 0;
  const pendingBalance = wallet?.pendingBalance ?? 0;

  return (
    <div className="h-full overflow-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <WalletIcon className="h-8 w-8 text-primary" />
            Personal Wallet
          </h1>
          <p className="text-muted-foreground">Manage your fiat and crypto wallets</p>
        </div>
      </div>

      <Tabs defaultValue="fiat" className="space-y-6">
        <TabsList>
          <TabsTrigger value="fiat" data-testid="tab-fiat-wallet">
            <CreditCard className="h-4 w-4 mr-2" />
            Fiat Wallet
          </TabsTrigger>
          <TabsTrigger value="web3" data-testid="tab-web3-wallets">
            <Coins className="h-4 w-4 mr-2" />
            Web3 Wallets
          </TabsTrigger>
        </TabsList>

        {/* Fiat Wallet Tab */}
        <TabsContent value="fiat" className="space-y-6">
          {/* Balance Overview */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
                <WalletIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-total-balance">
                  ${balance.toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground">USD</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Available</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600" data-testid="text-available-balance">
                  ${availableBalance.toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground">Ready to use</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending</CardTitle>
                <Clock className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600" data-testid="text-pending-balance">
                  ${pendingBalance.toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground">Processing</p>
              </CardContent>
            </Card>
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            <Dialog open={showDepositDialog} onOpenChange={setShowDepositDialog}>
              <DialogTrigger asChild>
                <Button size="lg" className="flex-1" data-testid="button-deposit">
                  <ArrowDownToLine className="mr-2 h-5 w-5" />
                  Deposit Funds
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Deposit Funds</DialogTitle>
                  <DialogDescription>Add money to your wallet using a payment method</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="deposit-amount">Amount (USD)</Label>
                    <Input
                      id="deposit-amount"
                      type="number"
                      placeholder="0.00"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      data-testid="input-deposit-amount"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="deposit-method">Payment Method</Label>
                    <Select value={selectedPaymentMethod} onValueChange={setSelectedPaymentMethod}>
                      <SelectTrigger id="deposit-method" data-testid="select-payment-method">
                        <SelectValue placeholder="Select payment method" />
                      </SelectTrigger>
                      <SelectContent>
                        {paymentMethods.map((method) => (
                          <SelectItem key={method.id} value={method.id.toString()}>
                            <div className="flex items-center gap-2">
                              {getPaymentMethodIcon(method.type)}
                              <span>
                                {method.nickname || `${method.brand || method.type} •••• ${method.last4}`}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    onClick={handleDeposit}
                    disabled={depositMutation.isPending}
                    className="w-full"
                    data-testid="button-confirm-deposit"
                  >
                    {depositMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>Confirm Deposit</>
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={showWithdrawDialog} onOpenChange={setShowWithdrawDialog}>
              <DialogTrigger asChild>
                <Button size="lg" variant="outline" className="flex-1" data-testid="button-withdraw">
                  <ArrowUpFromLine className="mr-2 h-5 w-5" />
                  Withdraw Funds
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Withdraw Funds</DialogTitle>
                  <DialogDescription>Transfer money from your wallet to a bank account</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="withdraw-amount">Amount (USD)</Label>
                    <Input
                      id="withdraw-amount"
                      type="number"
                      placeholder="0.00"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      data-testid="input-withdraw-amount"
                    />
                    <p className="text-xs text-muted-foreground">
                      Available: ${availableBalance.toFixed(2)}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="withdraw-method">Bank Account</Label>
                    <Select value={selectedPaymentMethod} onValueChange={setSelectedPaymentMethod}>
                      <SelectTrigger id="withdraw-method" data-testid="select-withdraw-method">
                        <SelectValue placeholder="Select bank account" />
                      </SelectTrigger>
                      <SelectContent>
                        {paymentMethods.filter(m => m.type === 'bank_account').map((method) => (
                          <SelectItem key={method.id} value={method.id.toString()}>
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4" />
                              <span>
                                {method.bankName} {method.accountType} •••• {method.last4}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    onClick={handleWithdraw}
                    disabled={withdrawMutation.isPending}
                    className="w-full"
                    data-testid="button-confirm-withdraw"
                  >
                    {withdrawMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>Confirm Withdrawal</>
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Nested Tabs for Transactions and Payment Methods */}
          <Tabs defaultValue="transactions" className="space-y-4">
            <TabsList>
              <TabsTrigger value="transactions" data-testid="tab-transactions">Transactions</TabsTrigger>
              <TabsTrigger value="payment-methods" data-testid="tab-payment-methods">Payment Methods</TabsTrigger>
            </TabsList>

            <TabsContent value="transactions" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Transaction History</CardTitle>
                  <CardDescription>All deposits, withdrawals, and transfers</CardDescription>
                </CardHeader>
                <CardContent>
                  {transactionsLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : transactions.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No transactions yet
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {transactions.map((tx) => (
                        <div
                          key={tx.id}
                          className="flex items-center justify-between p-4 rounded-lg border hover-elevate"
                          data-testid={`transaction-${tx.id}`}
                        >
                          <div className="flex items-center gap-3">
                            {tx.type === 'deposit' ? (
                              <div className="p-2 rounded-full bg-green-500/10">
                                <TrendingUp className="h-5 w-5 text-green-500" />
                              </div>
                            ) : (
                              <div className="p-2 rounded-full bg-red-500/10">
                                <TrendingDown className="h-5 w-5 text-red-500" />
                              </div>
                            )}
                            <div>
                              <div className="font-medium capitalize">{tx.type}</div>
                              <div className="text-sm text-muted-foreground">
                                {tx.description || `${tx.paymentMethod || 'Card'} ${tx.paymentMethodDetails || ''}`}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {format(new Date(tx.createdAt), 'MMM d, yyyy h:mm a')}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <div className={`font-bold ${tx.type === 'deposit' ? 'text-green-600' : 'text-red-600'}`}>
                                {tx.type === 'deposit' ? '+' : '-'}${tx.amount.toFixed(2)}
                              </div>
                              <div className="flex items-center gap-1 text-xs">
                                {getStatusIcon(tx.status)}
                                <span className="capitalize">{tx.status}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="payment-methods" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <CardTitle>Payment Methods</CardTitle>
                      <CardDescription>Manage your cards and bank accounts</CardDescription>
                    </div>
                    <Button size="sm" data-testid="button-add-payment-method">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Method
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {paymentMethodsLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : paymentMethods.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No payment methods added yet
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {paymentMethods.map((method) => (
                        <div
                          key={method.id}
                          className="flex items-center justify-between p-4 rounded-lg border hover-elevate"
                          data-testid={`payment-method-${method.id}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-full bg-primary/10">
                              {getPaymentMethodIcon(method.type)}
                            </div>
                            <div>
                              <div className="font-medium">
                                {method.nickname || `${method.brand || method.type}`}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {method.type === 'bank_account' 
                                  ? `${method.bankName} ${method.accountType}` 
                                  : method.brand} •••• {method.last4}
                              </div>
                              {method.isDefault === 'true' && (
                                <div className="text-xs text-primary font-medium">Default</div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {method.isVerified === 'true' ? (
                              <CheckCircle className="h-5 w-5 text-green-500" />
                            ) : (
                              <AlertCircle className="h-5 w-5 text-yellow-500" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* Web3 Wallets Tab */}
        <TabsContent value="web3" className="space-y-6">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div>
              <h2 className="text-2xl font-bold">Connected Wallets</h2>
              <p className="text-muted-foreground">Connect and manage your cryptocurrency wallets</p>
            </div>
            <Dialog open={web3DialogOpen} onOpenChange={setWeb3DialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-connect-wallet">
                  <Plus className="mr-2 h-4 w-4" />
                  Connect Wallet
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Connect Wallet</DialogTitle>
                </DialogHeader>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  createWalletMutation.mutate({
                    walletType: formData.get('walletType'),
                    walletAddress: formData.get('walletAddress'),
                    walletName: formData.get('walletName'),
                    network: formData.get('network'),
                    balance: 0,
                    currency: formData.get('currency'),
                    isActive: 'true',
                  });
                }} className="space-y-4">
                  <div>
                    <Label htmlFor="walletType">Wallet Type</Label>
                    <Select name="walletType" defaultValue="coinbase">
                      <SelectTrigger data-testid="select-wallet-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="coinbase">Coinbase Wallet</SelectItem>
                        <SelectItem value="hedera">Hedera HBAR</SelectItem>
                        <SelectItem value="metamask">MetaMask</SelectItem>
                        <SelectItem value="walletconnect">WalletConnect</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="walletAddress">Wallet Address</Label>
                    <Input id="walletAddress" name="walletAddress" placeholder="0x..." required data-testid="input-wallet-address" />
                  </div>
                  <div>
                    <Label htmlFor="walletName">Wallet Name (optional)</Label>
                    <Input id="walletName" name="walletName" placeholder="My Main Wallet" data-testid="input-wallet-name" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="network">Network</Label>
                      <Select name="network" defaultValue="mainnet">
                        <SelectTrigger data-testid="select-network">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="mainnet">Mainnet</SelectItem>
                          <SelectItem value="testnet">Testnet</SelectItem>
                          <SelectItem value="goerli">Goerli</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="currency">Currency</Label>
                      <Input id="currency" name="currency" defaultValue="ETH" data-testid="input-currency" />
                    </div>
                  </div>
                  <Button type="submit" className="w-full" data-testid="button-save-wallet">Connect Wallet</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4">
            {web3Wallets.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-10">
                  <Coins className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No wallets connected. Connect your first wallet!</p>
                </CardContent>
              </Card>
            ) : (
              web3Wallets.map((wallet) => (
                <Card key={wallet.id} data-testid={`wallet-${wallet.id}`}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <Coins className="h-5 w-5" />
                        <span className="capitalize">{wallet.walletType}</span>
                        {wallet.walletName && <span className="text-sm text-muted-foreground">({wallet.walletName})</span>}
                      </div>
                      <span className={`text-xs px-2 py-1 rounded ${wallet.isActive === 'true' ? 'bg-green-500 text-white' : 'bg-gray-500 text-white'}`}>
                        {wallet.isActive === 'true' ? 'Active' : 'Inactive'}
                      </span>
                    </CardTitle>
                    <CardDescription className="font-mono text-xs">{wallet.walletAddress}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">{wallet.network || 'mainnet'}</span>
                      <span className="text-lg font-bold">{wallet.balance} {wallet.currency}</span>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
