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

    return {
      id: price.id,
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
    
    return prices.map(price => ({
      id: price.id,
      symbol: price.symbol,
      name: price.name,
      currentPrice: price.currentPrice,
      priceChange24h: price.priceChange24h ?? 0,
      priceChangePercentage24h: price.priceChangePercentage24h ?? 0,
      marketCap: price.marketCap ?? 0,
      volume24h: price.volume24h ?? 0,
      lastUpdated: price.lastUpdated,
    }));
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
};

/**
 * Get symbol from CoinGecko ID or return the input if already a symbol
 */
function getCoinSymbol(coinId: string): string {
  // Check if it's a CoinGecko ID that needs mapping
  const coinIdLower = coinId.toLowerCase();
  if (COINGECKO_TO_SYMBOL[coinIdLower]) {
    return COINGECKO_TO_SYMBOL[coinIdLower];
  }
  
  // If it's uppercase (likely a symbol), convert to lowercase
  if (coinId === coinId.toUpperCase() && coinId.length <= 5) {
    return coinId.toLowerCase();
  }
  
  // If it contains a dash (CoinPaprika slug), extract the symbol part
  if (coinId.includes('-')) {
    const parts = coinId.split('-');
    return parts[0].toLowerCase();
  }
  
  // Otherwise return as-is in lowercase
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
