export class HederaProvider {
  private mirrorNode: string;

  constructor() {
    this.mirrorNode = process.env.HEDERA_MIRROR_NODE || 
      'https://mainnet-public.mirrornode.hedera.com/api/v1';
  }

  isConfigured(): boolean {
    return !!this.mirrorNode;
  }

  async getNFTsByOwner(accountId: string): Promise<any[]> {
    try {
      // Get token relationships for account
      const response = await fetch(`${this.mirrorNode}/accounts/${accountId}/tokens`);
      
      if (!response.ok) {
        throw new Error(`Hedera Mirror API error: ${response.statusText}`);
      }

      const data = await response.json();
      const tokens = data.tokens || [];

      const nfts = [];

      for (const token of tokens) {
        // Get token info to check if it's an NFT
        const tokenInfo = await fetch(`${this.mirrorNode}/tokens/${token.token_id}`);
        if (!tokenInfo.ok) continue;

        const tokenData = await tokenInfo.json();
        
        // Check if it's an NFT (decimals = 0 and type = NON_FUNGIBLE_UNIQUE)
        if (tokenData.type === 'NON_FUNGIBLE_UNIQUE' || tokenData.decimals === '0') {
          nfts.push({
            chain: 'hedera',
            contractAddress: token.token_id,
            tokenId: token.token_id,
            tokenStandard: 'HTS',
            name: tokenData.name || `Token ${token.token_id}`,
            description: tokenData.memo || '',
            symbol: tokenData.symbol || '',
            metadata: {
              totalSupply: tokenData.total_supply,
              decimals: tokenData.decimals,
              type: tokenData.type,
            },
          });
        }
      }

      return nfts;
    } catch (error: any) {
      console.error('[Hedera] Error fetching NFTs:', error);
      return [];
    }
  }

  async transferNFT(params: {
    tokenId: string;
    from: string;
    to: string;
    serialNumber: string;
  }): Promise<{ transactionId: string }> {
    throw new Error('Hedera NFT transfer requires @hashgraph/sdk and account signature');
  }
}

export const hederaProvider = new HederaProvider();
