import { ethers } from 'ethers';

interface NFTMetadata {
  name: string;
  description?: string;
  image?: string;
  animation_url?: string;
  external_url?: string;
  attributes?: Array<{ trait_type: string; value: string | number }>;
}

interface AlchemyNFT {
  contract: { address: string };
  id: { tokenId: string; tokenMetadata?: { tokenType: string } };
  title?: string;
  description?: string;
  metadata?: NFTMetadata;
  media?: Array<{ gateway?: string; thumbnail?: string }>;
  tokenUri?: { gateway?: string };
}

export class EVMProvider {
  private alchemyKey: string;
  
  constructor() {
    this.alchemyKey = process.env.ALCHEMY_API_KEY || '';
  }

  isConfigured(): boolean {
    return !!this.alchemyKey;
  }

  async getNFTsByOwner(walletAddress: string, chain: 'ethereum' | 'polygon' = 'ethereum'): Promise<any[]> {
    if (!this.isConfigured()) {
      throw new Error('Alchemy API key not configured');
    }

    const baseUrl = chain === 'polygon' 
      ? `https://polygon-mainnet.g.alchemy.com/v2/${this.alchemyKey}`
      : `https://eth-mainnet.g.alchemy.com/v2/${this.alchemyKey}`;

    const url = `${baseUrl}/getNFTs/?owner=${walletAddress}&withMetadata=true`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Alchemy API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    return (data.ownedNfts || []).map((nft: AlchemyNFT) => ({
      chain,
      contractAddress: nft.contract.address,
      tokenId: nft.id.tokenId,
      tokenStandard: nft.id.tokenMetadata?.tokenType || 'ERC721',
      name: nft.title || nft.metadata?.name || `Token #${nft.id.tokenId}`,
      description: nft.description || nft.metadata?.description || '',
      imageUrl: nft.media?.[0]?.gateway || nft.metadata?.image || '',
      animationUrl: nft.metadata?.animation_url || '',
      externalUrl: nft.metadata?.external_url || '',
      attributes: nft.metadata?.attributes || [],
      metadata: nft.metadata || {},
    }));
  }

  async transferNFT(params: {
    contractAddress: string;
    tokenId: string;
    from: string;
    to: string;
    privateKey?: string; // Only if custodial (not recommended)
  }): Promise<{ txHash: string }> {
    throw new Error('Transfer must be initiated from client-side wallet for security');
  }

  getContractInterface(tokenStandard: 'ERC721' | 'ERC1155' = 'ERC721') {
    if (tokenStandard === 'ERC721') {
      return new ethers.Interface([
        'function safeTransferFrom(address from, address to, uint256 tokenId)',
        'function balanceOf(address owner) view returns (uint256)',
        'function ownerOf(uint256 tokenId) view returns (address)',
      ]);
    } else {
      return new ethers.Interface([
        'function safeTransferFrom(address from, address to, uint256 id, uint256 amount, bytes data)',
        'function balanceOf(address account, uint256 id) view returns (uint256)',
      ]);
    }
  }
}

export const evmProvider = new EVMProvider();
