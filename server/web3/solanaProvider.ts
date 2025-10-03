export class SolanaProvider {
  private rpcUrl: string;

  constructor() {
    this.rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
  }

  isConfigured(): boolean {
    return !!this.rpcUrl;
  }

  async getNFTsByOwner(walletAddress: string): Promise<any[]> {
    // Note: Full Solana NFT support requires @solana/web3.js and @metaplex-foundation/js
    // This is a placeholder that returns empty array until those packages are installed
    console.warn('[Solana] Full NFT support requires @solana/web3.js and @metaplex-foundation/js packages');
    return [];
  }

  async transferNFT(params: {
    mintAddress: string;
    from: string;
    to: string;
  }): Promise<{ signature: string }> {
    throw new Error('Solana NFT transfer requires @solana/web3.js and @solana/spl-token packages');
  }
}

export const solanaProvider = new SolanaProvider();
