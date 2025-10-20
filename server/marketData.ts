/**
 * Market data service with multiple fallback sources
 * Supports: Crypto, Stocks, Precious Metals (Gold, Silver, Platinum)
 * Includes circuit breaker pattern for resilience
 */

import { circuitBreakers } from './circuitBreaker';

export interface MarketDataPoint {
  symbol: string;
  name: string;
  price: number;
  change24h?: number;
  changePercent?: number;
  marketCap?: number;
  volume24h?: number;
  source: string;
}

interface MarketOverview {
  crypto: MarketDataPoint[];
  stocks: MarketDataPoint[];
  metals: MarketDataPoint[];
  lastUpdated: Date;
}

// Simple in-memory cache
const cache = new Map<string, { data: any; expiry: number }>();

function getCached<T>(key: string): T | null {
  const cached = cache.get(key);
  if (cached && cached.expiry > Date.now()) {
    return cached.data;
  }
  cache.delete(key);
  return null;
}

function setCache(key: string, data: any, ttlSeconds: number = 60) {
  cache.set(key, {
    data,
    expiry: Date.now() + ttlSeconds * 1000,
  });
}

async function fetchJson(url: string, timeout: number = 10000, headers?: Record<string, string>): Promise<any> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, { 
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        ...headers,
      }
    });
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

// ==================== CRYPTO DATA ====================

export async function getCryptoMarketData(): Promise<MarketDataPoint[]> {
  const cacheKey = 'crypto_market';
  const cached = getCached<MarketDataPoint[]>(cacheKey);
  if (cached) return cached;

  // Try crypto aggregator (uses CoinPaprika, CoinCap, CryptoCompare, CoinMarketCap)
  try {
    const { cryptoAggregator } = await import('./cryptoAggregator');
    const symbols = ['btc-bitcoin', 'eth-ethereum', 'bnb-binance-coin', 'sol-solana', 
                     'ada-cardano', 'xrp-ripple', 'dot-polkadot', 'doge-dogecoin', 
                     'avax-avalanche', 'matic-polygon'];
    
    const prices = await cryptoAggregator.getMultipleCryptoPrices(symbols);
    
    if (prices && prices.length > 0) {
      const mappedData = prices.map(item => ({
        symbol: item.symbol?.toUpperCase() || '',
        name: item.name || '',
        price: item.currentPrice || 0,
        change24h: item.priceChange24h || 0,
        changePercent: item.priceChangePercentage24h || 0,
        marketCap: item.marketCap || 0,
        volume24h: item.volume24h || 0,
        source: 'crypto-aggregator',
      }));
      
      setCache(cacheKey, mappedData, 300); // Cache for 5 minutes
      return mappedData;
    }
  } catch (error) {
    console.warn('[MarketData] Crypto aggregator failed, trying CryptoCompare fallback:', error);
  }

  // Fallback: CryptoCompare
  try {
    const symbols = ['BTC', 'ETH', 'BNB', 'SOL', 'ADA', 'XRP', 'DOT', 'DOGE', 'AVAX', 'MATIC'];
    const fsyms = symbols.join(',');
    const url = `https://min-api.cryptocompare.com/data/pricemultifull?fsyms=${fsyms}&tsyms=USD`;
    const data = await fetchJson(url);
    
    if (data?.RAW) {
      const result: MarketDataPoint[] = [];
      for (const sym of symbols) {
        if (data.RAW[sym]?.USD) {
          const usd = data.RAW[sym].USD;
          result.push({
            symbol: sym,
            name: data.DISPLAY?.[sym]?.USD?.FROMSYMBOL || sym,
            price: usd.PRICE || 0,
            change24h: usd.CHANGE24HOUR || 0,
            changePercent: usd.CHANGEPCT24HOUR || 0,
            marketCap: usd.MKTCAP || 0,
            volume24h: usd.VOLUME24HOUR || 0,
            source: 'cryptocompare',
          });
        }
      }
      if (result.length > 0) {
        setCache(cacheKey, result, 60);
        return result;
      }
    }
  } catch (error) {
    console.warn('CryptoCompare failed, trying Yahoo Finance:', error);
  }

  // Last fallback: Yahoo Finance
  try {
    const symbols = ['BTC-USD', 'ETH-USD', 'BNB-USD'];
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbols.join(',')}`;
    const data = await fetchJson(url);
    
    if (data?.quoteResponse?.result) {
      const result = data.quoteResponse.result.map((item: any) => ({
        symbol: item.symbol?.replace('-USD', '') || '',
        name: item.longName || item.symbol || '',
        price: item.regularMarketPrice || 0,
        change24h: item.regularMarketChange || 0,
        changePercent: item.regularMarketChangePercent || 0,
        marketCap: item.marketCap || 0,
        volume24h: item.regularMarketVolume || 0,
        source: 'yahoo',
      }));
      setCache(cacheKey, result, 60);
      return result;
    }
  } catch (error) {
    console.error('All crypto sources failed:', error);
  }

  return [];
}

// ==================== STOCK MARKET DATA ====================

export async function getStockMarketData(): Promise<MarketDataPoint[]> {
  const cacheKey = 'stock_market';
  const cached = getCached<MarketDataPoint[]>(cacheKey);
  if (cached) return cached;

  // Try Yahoo Finance (most reliable for indices)
  try {
    const symbols = ['^GSPC', '^DJI', '^IXIC', '^RUT', 'SPY', 'QQQ', 'DIA', 'IWM'];
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbols.join(',')}`;
    const data = await fetchJson(url);
    
    if (data?.quoteResponse?.result) {
      const result = data.quoteResponse.result.map((item: any) => ({
        symbol: item.symbol || '',
        name: item.longName || item.shortName || item.symbol || '',
        price: item.regularMarketPrice || 0,
        change24h: item.regularMarketChange || 0,
        changePercent: item.regularMarketChangePercent || 0,
        marketCap: item.marketCap || 0,
        volume24h: item.regularMarketVolume || 0,
        source: 'yahoo',
      }));
      setCache(cacheKey, result, 300); // Cache for 5 minutes
      return result;
    }
  } catch (error) {
    // Yahoo Finance may rate-limit or block requests, this is expected behavior
    // Silently fail and return empty array - not a critical error
  }

  return [];
}

// ==================== PRECIOUS METALS DATA ====================

export async function getMetalsMarketData(): Promise<MarketDataPoint[]> {
  const cacheKey = 'metals_market';
  const cached = getCached<MarketDataPoint[]>(cacheKey);
  if (cached) return cached;

  // Try metals-api.com (free tier available) or Yahoo Finance
  try {
    const symbols = ['GC=F', 'SI=F', 'PL=F', 'HG=F']; // Gold, Silver, Platinum, Copper futures
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbols.join(',')}`;
    const data = await fetchJson(url);
    
    if (data?.quoteResponse?.result) {
      const nameMap: Record<string, string> = {
        'GC=F': 'Gold',
        'SI=F': 'Silver',
        'PL=F': 'Platinum',
        'HG=F': 'Copper',
      };
      
      const result = data.quoteResponse.result.map((item: any) => ({
        symbol: item.symbol || '',
        name: nameMap[item.symbol] || item.longName || item.symbol || '',
        price: item.regularMarketPrice || 0,
        change24h: item.regularMarketChange || 0,
        changePercent: item.regularMarketChangePercent || 0,
        marketCap: 0,
        volume24h: item.regularMarketVolume || 0,
        source: 'yahoo',
      }));
      setCache(cacheKey, result, 300); // Cache for 5 minutes
      return result;
    }
  } catch (error) {
    // Yahoo Finance may rate-limit or block requests, this is expected behavior
    // Silently fail and return empty array - not a critical error
  }

  return [];
}

// ==================== COMBINED MARKET OVERVIEW ====================

export async function getMarketOverview(): Promise<MarketOverview> {
  const [crypto, stocks, metals] = await Promise.all([
    getCryptoMarketData(),
    getStockMarketData(),
    getMetalsMarketData(),
  ]);

  return {
    crypto,
    stocks,
    metals,
    lastUpdated: new Date(),
  };
}

// ==================== ENHANCED CRYPTO PRICE FETCH WITH FALLBACKS ====================

export async function getCryptoPriceWithFallback(symbol: string): Promise<MarketDataPoint | null> {
  // Try crypto aggregator first (multi-provider with automatic fallback)
  try {
    const { cryptoAggregator } = await import('./cryptoAggregator');
    const price = await cryptoAggregator.getCryptoPrice(symbol);
    
    if (price) {
      return {
        symbol: price.symbol?.toUpperCase() || symbol.toUpperCase(),
        name: price.name || symbol,
        price: price.currentPrice || 0,
        change24h: price.priceChange24h || 0,
        changePercent: price.priceChangePercentage24h || 0,
        marketCap: price.marketCap || 0,
        volume24h: price.volume24h || 0,
        source: 'crypto-aggregator',
      };
    }
  } catch (error) {
    console.warn(`[MarketData] Crypto aggregator failed for ${symbol}, trying direct CryptoCompare`);
  }

  // Fallback: Direct CryptoCompare
  try {
    const url = `https://min-api.cryptocompare.com/data/pricemultifull?fsyms=${symbol.toUpperCase()}&tsyms=USD`;
    const data = await fetchJson(url);
    
    if (data?.RAW?.[symbol.toUpperCase()]?.USD) {
      const usd = data.RAW[symbol.toUpperCase()].USD;
      return {
        symbol: symbol.toUpperCase(),
        name: symbol,
        price: usd.PRICE || 0,
        change24h: usd.CHANGE24HOUR || 0,
        changePercent: usd.CHANGEPCT24HOUR || 0,
        marketCap: usd.MKTCAP || 0,
        source: 'cryptocompare',
      };
    }
  } catch (error) {
    console.warn(`[MarketData] CryptoCompare failed for ${symbol}, trying Yahoo`);
  }

  // Last fallback: Yahoo Finance
  try {
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbol}-USD`;
    const data = await fetchJson(url);
    
    if (data?.quoteResponse?.result?.[0]) {
      const item = data.quoteResponse.result[0];
      return {
        symbol: symbol.toUpperCase(),
        name: item.longName || symbol,
        price: item.regularMarketPrice || 0,
        changePercent: item.regularMarketChangePercent || 0,
        source: 'yahoo',
      };
    }
  } catch (error) {
    console.error(`All sources failed for ${symbol}`);
  }

  return null;
}

// ==================== ENHANCED STOCK PRICE FETCH WITH FALLBACKS ====================

export async function getStockPriceWithFallback(symbol: string): Promise<MarketDataPoint | null> {
  // Try Yahoo Finance (most reliable)
  try {
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbol}`;
    const data = await fetchJson(url);
    
    if (data?.quoteResponse?.result?.[0]) {
      const item = data.quoteResponse.result[0];
      return {
        symbol: item.symbol || symbol,
        name: item.longName || item.shortName || symbol,
        price: item.regularMarketPrice || 0,
        change24h: item.regularMarketChange || 0,
        changePercent: item.regularMarketChangePercent || 0,
        marketCap: item.marketCap || 0,
        source: 'yahoo',
      };
    }
  } catch (error) {
    console.error(`Yahoo Finance failed for ${symbol}:`, error);
  }

  return null;
}
