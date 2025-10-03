import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Wallet, RefreshCw, Grid, List, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

interface WalletConnection {
  id: number;
  walletType: string;
  walletAddress: string;
  network: string;
  isActive: string;
}

interface NFT {
  chain: string;
  contractAddress: string;
  tokenId: string;
  tokenStandard: string;
  name: string;
  description: string;
  imageUrl: string;
  attributes?: Array<{ trait_type: string; value: string | number }>;
}

export default function NFTVault() {
  const { toast } = useToast();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedChain, setSelectedChain] = useState<'all' | 'ethereum' | 'polygon' | 'solana' | 'hedera'>('all');

  const { data: walletsData, isLoading: walletsLoading } = useQuery<{ wallets: WalletConnection[] }>({
    queryKey: ['/api/nft/wallets'],
  });
  
  const wallets = walletsData?.wallets || [];

  const { data: nftsData = { nfts: [] }, isLoading: nftsLoading } = useQuery<{ nfts: NFT[] }>({
    queryKey: ['/api/nft/assets'],
  });

  const connectWalletMutation = useMutation({
    mutationFn: async (params: { walletType: string; chain: string; address: string }) => {
      return await apiRequest('POST', '/api/nft/wallet/connect', params);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/nft/wallets'] });
      toast({
        title: "Wallet Connected",
        description: "Your wallet has been connected successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Connection Failed",
        description: "Failed to connect wallet. Please try again.",
        variant: "destructive",
      });
    },
  });

  const [syncedNFTs, setSyncedNFTs] = useState<NFT[]>([]);

  const syncNFTsMutation = useMutation({
    mutationFn: async (params: { walletId: number; chain: string; address: string }) => {
      return await apiRequest('POST', '/api/nft/sync', params);
    },
    onSuccess: (data: any) => {
      if (data.nfts && Array.isArray(data.nfts)) {
        setSyncedNFTs(prev => [...prev, ...data.nfts]);
      }
      toast({
        title: "NFTs Synced",
        description: `Successfully synced ${data.count || 0} NFTs from ${data.nfts?.[0]?.chain || 'blockchain'}.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Sync Failed",
        description: error.message || "Failed to sync NFTs. Please check your Alchemy API key.",
        variant: "destructive",
      });
    },
  });

  const handleConnectMetaMask = async () => {
    if (typeof window.ethereum === 'undefined') {
      toast({
        title: "MetaMask Not Found",
        description: "Please install MetaMask browser extension to connect.",
        variant: "destructive",
      });
      return;
    }

    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      
      connectWalletMutation.mutate({
        walletType: 'metamask',
        chain: chainId === '0x89' ? 'polygon' : 'ethereum',
        address: accounts[0],
      });
    } catch (error: any) {
      toast({
        title: "Connection Error",
        description: error.message || "Failed to connect to MetaMask",
        variant: "destructive",
      });
    }
  };

  const handleSyncNFTs = (wallet: WalletConnection) => {
    syncNFTsMutation.mutate({
      walletId: wallet.id,
      chain: wallet.network,
      address: wallet.walletAddress,
    });
  };

  // Combine synced NFTs with NFTs from database
  const allNFTs = [...(nftsData.nfts || []), ...syncedNFTs];
  
  const filteredNFTs = selectedChain === 'all' 
    ? allNFTs 
    : allNFTs.filter(nft => nft.chain === selectedChain);

  return (
    <div className="container mx-auto p-6 space-y-6" data-testid="page-nft-vault">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">NFT Vault</h1>
          <p className="text-muted-foreground mt-1">Manage your multi-chain NFT collection</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="icon"
            onClick={() => setViewMode('grid')}
            data-testid="button-view-grid"
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="icon"
            onClick={() => setViewMode('list')}
            data-testid="button-view-list"
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Wallet Connection Section */}
      <Card data-testid="card-wallet-connections">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Connected Wallets
          </CardTitle>
          <CardDescription>Connect your Web3 wallets to view and manage NFTs</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={handleConnectMetaMask}
              disabled={connectWalletMutation.isPending}
              data-testid="button-connect-metamask"
            >
              <Wallet className="mr-2 h-4 w-4" />
              Connect MetaMask
            </Button>
            <Button variant="outline" disabled data-testid="button-connect-walletconnect">
              Connect WalletConnect
            </Button>
            <Button variant="outline" disabled data-testid="button-connect-coinbase">
              Connect Coinbase
            </Button>
          </div>

          {walletsLoading ? (
            <div className="text-sm text-muted-foreground">Loading wallets...</div>
          ) : wallets.length > 0 ? (
            <div className="space-y-2">
              {wallets.map((wallet) => (
                <div
                  key={wallet.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                  data-testid={`wallet-${wallet.id}`}
                >
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" data-testid={`badge-wallet-type-${wallet.id}`}>
                      {wallet.walletType}
                    </Badge>
                    <div>
                      <div className="font-medium" data-testid={`text-wallet-address-${wallet.id}`}>
                        {wallet.walletAddress.slice(0, 6)}...{wallet.walletAddress.slice(-4)}
                      </div>
                      <div className="text-sm text-muted-foreground" data-testid={`text-wallet-network-${wallet.id}`}>
                        {wallet.network}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSyncNFTs(wallet)}
                    disabled={syncNFTsMutation.isPending}
                    data-testid={`button-sync-${wallet.id}`}
                  >
                    <RefreshCw className={`h-4 w-4 ${syncNFTsMutation.isPending ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No wallets connected</div>
          )}
        </CardContent>
      </Card>

      {/* Chain Filter */}
      <div className="flex gap-2" data-testid="filter-chain">
        {['all', 'ethereum', 'polygon', 'solana', 'hedera'].map((chain) => (
          <Button
            key={chain}
            variant={selectedChain === chain ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedChain(chain as any)}
            data-testid={`button-filter-${chain}`}
          >
            {chain.charAt(0).toUpperCase() + chain.slice(1)}
          </Button>
        ))}
      </div>

      {/* NFT Grid */}
      <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4' : 'space-y-4'}>
        {nftsLoading ? (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            Loading NFTs...
          </div>
        ) : filteredNFTs.length > 0 ? (
          filteredNFTs.map((nft, index) => (
            <Card key={`${nft.contractAddress}-${nft.tokenId}`} className="hover-elevate" data-testid={`nft-card-${index}`}>
              <CardContent className="p-4 space-y-3">
                <div className="aspect-square relative rounded-lg overflow-hidden bg-muted">
                  {nft.imageUrl ? (
                    <img
                      src={nft.imageUrl}
                      alt={nft.name}
                      className="w-full h-full object-cover"
                      data-testid={`img-nft-${index}`}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      No Image
                    </div>
                  )}
                </div>
                <div>
                  <div className="font-semibold truncate" data-testid={`text-nft-name-${index}`}>
                    {nft.name}
                  </div>
                  <div className="text-sm text-muted-foreground" data-testid={`text-nft-id-${index}`}>
                    #{nft.tokenId}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" data-testid={`badge-nft-chain-${index}`}>
                    {nft.chain}
                  </Badge>
                  <Button variant="ghost" size="sm" data-testid={`button-nft-view-${index}`}>
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="col-span-full text-center py-12" data-testid="text-no-nfts">
            <p className="text-muted-foreground">No NFTs found</p>
            <p className="text-sm text-muted-foreground mt-2">
              Connect a wallet and sync to view your NFT collection
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
