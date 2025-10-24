/**
 * Metamask Detection and Connection Component
 * Detects if Metamask is installed and guides users through installation/connection
 */

import { useEffect, useState } from 'react';
import { Wallet, ExternalLink, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';

interface MetamaskPromptProps {
  onConnected?: (accounts: string[]) => void;
  onError?: (error: string) => void;
  autoConnect?: boolean;
}

// Extend Window interface for ethereum
declare global {
  interface Window {
    ethereum?: {
      isMetaMask?: boolean;
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      on: (event: string, callback: (...args: any[]) => void) => void;
      removeListener: (event: string, callback: (...args: any[]) => void) => void;
    };
  }
}

export default function MetamaskPrompt({ 
  onConnected, 
  onError,
  autoConnect = false 
}: MetamaskPromptProps) {
  const [available, setAvailable] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [accounts, setAccounts] = useState<string[]>([]);
  const [chainId, setChainId] = useState<string | null>(null);
  const { toast } = useToast();

  // Detect Metamask availability
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkMetamask = () => {
      const isAvailable = Boolean(window.ethereum?.isMetaMask);
      setAvailable(isAvailable);

      if (isAvailable && autoConnect) {
        // Check if already connected
        window.ethereum?.request({ method: 'eth_accounts' })
          .then((accounts: string[]) => {
            if (accounts.length > 0) {
              setConnected(true);
              setAccounts(accounts);
              if (onConnected) {
                onConnected(accounts);
              }
            }
          })
          .catch(console.error);
      }
    };

    checkMetamask();

    // Listen for Metamask installation
    const handleEthereum = () => {
      checkMetamask();
    };

    window.addEventListener('ethereum#initialized', handleEthereum);

    // Fallback check after a delay
    const timeout = setTimeout(checkMetamask, 1000);

    return () => {
      window.removeEventListener('ethereum#initialized', handleEthereum);
      clearTimeout(timeout);
    };
  }, [autoConnect, onConnected]);

  // Listen for account and chain changes
  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = (newAccounts: string[]) => {
      setAccounts(newAccounts);
      setConnected(newAccounts.length > 0);
      
      if (newAccounts.length === 0) {
        toast({
          title: 'Disconnected',
          description: 'Metamask has been disconnected',
        });
      } else {
        toast({
          title: 'Account Changed',
          description: `Connected to ${newAccounts[0].slice(0, 6)}...${newAccounts[0].slice(-4)}`,
        });
      }
    };

    const handleChainChanged = (newChainId: string) => {
      setChainId(newChainId);
      toast({
        title: 'Network Changed',
        description: 'Please refresh the page',
      });
    };

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      }
    };
  }, [toast]);

  async function connect() {
    if (!window.ethereum) {
      // Open Metamask download page
      window.open('https://metamask.io/download/', '_blank', 'noopener,noreferrer');
      return;
    }

    setConnecting(true);

    try {
      const requestedAccounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      });
      
      console.log('Metamask connected:', requestedAccounts);
      setAccounts(requestedAccounts);
      setConnected(true);

      // Get chain ID
      const currentChainId = await window.ethereum.request({ 
        method: 'eth_chainId' 
      });
      setChainId(currentChainId);

      toast({
        title: 'Connected to Metamask',
        description: `Address: ${requestedAccounts[0].slice(0, 6)}...${requestedAccounts[0].slice(-4)}`,
      });

      if (onConnected) {
        onConnected(requestedAccounts);
      }
    } catch (error: any) {
      console.error('Metamask connection error:', error);
      const errorMsg = error.message || 'Failed to connect to Metamask';
      
      toast({
        title: 'Connection Failed',
        description: errorMsg,
        variant: 'destructive',
      });

      if (onError) {
        onError(errorMsg);
      }
    } finally {
      setConnecting(false);
    }
  }

  // Not available - show installation prompt
  if (!available) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Metamask Required
          </CardTitle>
          <CardDescription>
            To use the NFT Vault, please install the Metamask browser extension
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Metamask Not Detected</AlertTitle>
            <AlertDescription>
              Metamask is a secure wallet for managing cryptocurrencies and NFTs.
              It's available as a free browser extension.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Button
              onClick={connect}
              className="w-full"
              data-testid="button-install-metamask"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Install Metamask
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              After installing, refresh this page to connect your wallet
            </p>
          </div>

          <div className="pt-4 border-t border-border">
            <p className="text-sm text-muted-foreground">
              <strong>Why Metamask?</strong>
              <br />
              Metamask provides secure access to blockchain features without sharing your private keys.
              Your NFTs and crypto remain under your complete control.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Available but not connected
  if (!connected) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Connect Metamask
          </CardTitle>
          <CardDescription>
            Connect your wallet to access NFT Vault features
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertTitle>Metamask Detected</AlertTitle>
            <AlertDescription>
              Click the button below to connect your wallet
            </AlertDescription>
          </Alert>

          <Button
            onClick={connect}
            disabled={connecting}
            className="w-full"
            data-testid="button-connect-metamask"
          >
            {connecting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Wallet className="h-4 w-4 mr-2" />
                Connect Wallet
              </>
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            A Metamask popup will appear asking you to authorize this connection
          </p>
        </CardContent>
      </Card>
    );
  }

  // Connected
  return (
    <Card className="glass-card border-green-500/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-green-600 dark:text-green-400">
          <CheckCircle className="h-5 w-5" />
          Wallet Connected
        </CardTitle>
        <CardDescription>
          Your Metamask wallet is connected and ready
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-3">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Address:</span>
            <code 
              className="font-mono text-xs bg-muted px-2 py-1 rounded"
              data-testid="text-wallet-address"
            >
              {accounts[0] ? `${accounts[0].slice(0, 6)}...${accounts[0].slice(-4)}` : 'Unknown'}
            </code>
          </div>
          
          {chainId && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Network:</span>
              <span className="text-xs" data-testid="text-chain-id">
                {chainId === '0x1' ? 'Ethereum Mainnet' : 
                 chainId === '0x5' ? 'Goerli Testnet' :
                 chainId === '0x89' ? 'Polygon Mainnet' :
                 `Chain ID: ${chainId}`}
              </span>
            </div>
          )}
        </div>

        <Alert className="bg-green-500/10 border-green-500/20">
          <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
          <AlertDescription className="text-green-600 dark:text-green-400">
            You can now view and manage your NFTs
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
