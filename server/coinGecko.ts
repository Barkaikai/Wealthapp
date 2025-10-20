/**
 * coinGecko.ts
 * UPDATED: Now uses multi-provider crypto aggregator instead of CoinGecko
 * Maintains same interface for backward compatibility
 */
import { cryptoAggregator } from './cryptoAggregator';

export interface CryptoPrice {
  id: string;
  symbol: string;
  name: string;
  currentPrice: number;
  priceChange24h: number;
  priceChangePercentage24h: number;
  marketCap: number;
  volume24h: number;
  lastUpdated: Date;
}

/**
 * Get price for a single cryptocurrency
 * @param coinId - Coin symbol or ID (e.g., 'bitcoin', 'btc')
 */
export async function getCryptoPrice(coinId: string): Promise<CryptoPrice | null> {
  try {
    // Map common coin IDs to symbols
    const symbol = getCoinSymbol(coinId);
    const price = await cryptoAggregator.getCryptoPrice(symbol);
    
    if (!price) {
      return null;
    }

    // Convert aggregator ID back to CoinGecko ID for backward compatibility
    const geckoId = getCoinGeckoId(price.symbol);

    return {
      id: geckoId,
      symbol: price.symbol,
      name: price.name,
      currentPrice: price.currentPrice,
      priceChange24h: price.priceChange24h ?? 0,
      priceChangePercentage24h: price.priceChangePercentage24h ?? 0,
      marketCap: price.marketCap ?? 0,
      volume24h: price.volume24h ?? 0,
      lastUpdated: price.lastUpdated,
    };
  } catch (error) {
    console.error(`[CoinGecko] Error fetching crypto price for ${coinId}:`, error);
    return null;
  }
}

/**
 * Get prices for multiple cryptocurrencies
 * @param coinIds - Array of coin symbols or IDs
 */
export async function getMultipleCryptoPrices(coinIds: string[]): Promise<CryptoPrice[]> {
  try {
    const symbols = coinIds.map(id => getCoinSymbol(id));
    const prices = await cryptoAggregator.getMultipleCryptoPrices(symbols);
    
    return prices.map(price => {
      // Convert aggregator ID back to CoinGecko ID for backward compatibility
      const geckoId = getCoinGeckoId(price.symbol);
      
      return {
        id: geckoId,
        symbol: price.symbol,
        name: price.name,
        currentPrice: price.currentPrice,
        priceChange24h: price.priceChange24h ?? 0,
        priceChangePercentage24h: price.priceChangePercentage24h ?? 0,
        marketCap: price.marketCap ?? 0,
        volume24h: price.volume24h ?? 0,
        lastUpdated: price.lastUpdated,
      };
    });
  } catch (error) {
    console.error('[CoinGecko] Error fetching multiple crypto prices:', error);
    return [];
  }
}

// Map common CoinGecko IDs to crypto symbols for the aggregator
export const COINGECKO_TO_SYMBOL: Record<string, string> = {
  'bitcoin': 'btc',
  'ethereum': 'eth',
  'solana': 'sol',
  'tether': 'usdt',
  'usd-coin': 'usdc',
  'binancecoin': 'bnb',
  'cardano': 'ada',
  'dogecoin': 'doge',
  'matic-network': 'matic',
  'polkadot': 'dot',
  'ripple': 'xrp',
  'chainlink': 'link',
  'litecoin': 'ltc',
  'cosmos': 'atom',
  'avalanche-2': 'avax',
  'bitcoin-cash': 'bch',
  'stellar': 'xlm',
  'monero': 'xmr',
  'ethereum-classic': 'etc',
  'tron': 'trx',
  'shiba-inu': 'shib',
  'uniswap': 'uni',
  'wrapped-bitcoin': 'wbtc',
  'dai': 'dai',
  'okb': 'okb',
  'leo-token': 'leo',
  'terra-luna-2': 'luna',
  'cronos': 'cro',
  'near': 'near',
  'vechain': 'vet',
  'aptos': 'apt',
  'arbitrum': 'arb',
  'optimism': 'op',
};

// Reverse mapping: symbol to CoinGecko ID
export const SYMBOL_TO_COINGECKO: Record<string, string> = {
  'btc': 'bitcoin',
  'eth': 'ethereum',
  'sol': 'solana',
  'usdt': 'tether',
  'usdc': 'usd-coin',
  'bnb': 'binancecoin',
  'ada': 'cardano',
  'doge': 'dogecoin',
  'matic': 'matic-network',
  'dot': 'polkadot',
  'xrp': 'ripple',
  'link': 'chainlink',
  'ltc': 'litecoin',
  'atom': 'cosmos',
  'avax': 'avalanche-2',
  'bch': 'bitcoin-cash',
  'xlm': 'stellar',
  'xmr': 'monero',
  'etc': 'ethereum-classic',
  'trx': 'tron',
  'shib': 'shiba-inu',
  'uni': 'uniswap',
  'wbtc': 'wrapped-bitcoin',
  'dai': 'dai',
  'okb': 'okb',
  'leo': 'leo-token',
  'luna': 'terra-luna-2',
  'cro': 'cronos',
  'near': 'near',
  'vet': 'vechain',
  'apt': 'aptos',
  'arb': 'arbitrum',
  'op': 'optimism',
};

/**
 * Get symbol from CoinGecko ID or return the input if already a symbol
 */
function getCoinSymbol(coinId: string): string {
  const coinIdLower = coinId.toLowerCase();
  
  // First, check if it's a known CoinGecko ID
  if (COINGECKO_TO_SYMBOL[coinIdLower]) {
    return COINGECKO_TO_SYMBOL[coinIdLower];
  }
  
  // If it's uppercase and short (likely a symbol), convert to lowercase
  if (coinId === coinId.toUpperCase() && coinId.length <= 5) {
    return coinId.toLowerCase();
  }
  
  // If it's already a short lowercase symbol (3-5 chars, no dashes), return as-is
  if (coinIdLower.length >= 2 && coinIdLower.length <= 5 && !coinIdLower.includes('-')) {
    return coinIdLower;
  }
  
  // If it contains a dash, it could be:
  // 1. A CoinGecko ID not in our map (bitcoin-cash, terra-luna-2) - return as-is
  // 2. A CoinPaprika slug (btc-bitcoin) - extract the symbol part
  // We can distinguish by checking if the first part is a known symbol
  if (coinId.includes('-')) {
    const parts = coinId.split('-');
    const firstPart = parts[0].toLowerCase();
    
    // If the first part is a valid symbol (2-5 chars), assume it's a CoinPaprika slug
    if (firstPart.length >= 2 && firstPart.length <= 5) {
      // Check if this symbol maps to a CoinGecko ID
      const geckoId = SYMBOL_TO_COINGECKO[firstPart];
      if (geckoId && geckoId === coinIdLower) {
        // This is a CoinGecko ID that happens to start with a symbol (e.g., 'etc' in 'ethereum-classic')
        // Don't split it - return as-is for the aggregator to handle
        return coinIdLower;
      }
      // This looks like a CoinPaprika slug (btc-bitcoin), extract the symbol
      return firstPart;
    }
    
    // Otherwise, it's likely a multi-word CoinGecko ID - return as-is
    return coinIdLower;
  }
  
  // Default: return as-is in lowercase
  return coinIdLower;
}

/**
 * Get CoinGecko ID from symbol (for backward compatibility)
 * Returns the original CoinGecko ID format
 */
export function getCoinGeckoId(symbol: string): string {
  const lower = symbol.toLowerCase();
  
  // Check direct mapping from symbol to CoinGecko ID
  if (SYMBOL_TO_COINGECKO[lower]) {
    return SYMBOL_TO_COINGECKO[lower];
  }
  
  // Check if input is already a CoinGecko ID
  if (COINGECKO_TO_SYMBOL[lower]) {
    return lower;
  }
  
  // If it's a CoinPaprika slug (contains dash), try to extract symbol and map
  if (symbol.includes('-')) {
    const symbolPart = symbol.split('-')[0].toLowerCase();
    if (SYMBOL_TO_COINGECKO[symbolPart]) {
      return SYMBOL_TO_COINGECKO[symbolPart];
    }
  }
  
  // Default: return the lowercase version (best guess)
  return lower;
}
