import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Wallet, Plus } from 'lucide-react';

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

export default function Web3Wallets() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: wallets = [] } = useQuery<WalletConnection[]>({
    queryKey: ['/api/wallets'],
  });

  const createWalletMutation = useMutation({
    mutationFn: async (data: any) => await apiRequest('POST', '/api/wallets', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/wallets'] });
      toast({ title: "Wallet connected successfully" });
      setDialogOpen(false);
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Web3 Wallets</h1>
          <p className="text-muted-foreground">Connect and manage your cryptocurrency wallets</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
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
        {wallets.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-10">
              <Wallet className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No wallets connected. Connect your first wallet!</p>
            </CardContent>
          </Card>
        ) : (
          wallets.map((wallet) => (
            <Card key={wallet.id} data-testid={`wallet-${wallet.id}`}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wallet className="h-5 w-5" />
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
    </div>
  );
}
