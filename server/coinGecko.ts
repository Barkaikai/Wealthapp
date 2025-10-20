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

// Map common CoinGecko IDs to symbols for backward compatibility
export const CRYPTO_ID_MAP: Record<string, string> = {
  'bitcoin': 'btc-bitcoin',
  'ethereum': 'eth-ethereum',
  'solana': 'sol-solana',
  'tether': 'usdt-tether',
  'usd-coin': 'usdc-usd-coin',
  'binancecoin': 'bnb-binance-coin',
  'cardano': 'ada-cardano',
  'dogecoin': 'doge-dogecoin',
  'matic-network': 'matic-polygon',
  'polkadot': 'dot-polkadot',
  'BTC': 'btc-bitcoin',
  'ETH': 'eth-ethereum',
  'SOL': 'sol-solana',
  'USDT': 'usdt-tether',
  'USDC': 'usdc-usd-coin',
  'BNB': 'bnb-binance-coin',
  'ADA': 'ada-cardano',
  'DOGE': 'doge-dogecoin',
  'MATIC': 'matic-polygon',
  'DOT': 'dot-polkadot',
};

/**
 * Get symbol from CoinGecko ID or return the input if already a symbol
 */
function getCoinSymbol(coinId: string): string {
  // Check if it's a CoinGecko ID that needs mapping
  if (CRYPTO_ID_MAP[coinId]) {
    return CRYPTO_ID_MAP[coinId];
  }
  
  // If it's uppercase (likely a symbol), convert to CoinPaprika format
  if (coinId === coinId.toUpperCase() && coinId.length <= 5) {
    return coinId.toLowerCase();
  }
  
  // Otherwise return as-is (might be already in correct format)
  return coinId;
}

/**
 * Get CoinGecko ID from symbol (for backward compatibility)
 */
export function getCoinGeckoId(symbol: string): string {
  const upper = symbol.toUpperCase();
  
  // Check reverse mapping
  for (const [id, mappedSymbol] of Object.entries(CRYPTO_ID_MAP)) {
    if (mappedSymbol.startsWith(upper.toLowerCase() + '-')) {
      return mappedSymbol;
    }
  }
  
  // Default: return symbol in lowercase
  return symbol.toLowerCase();
}
