/**
 * Market data service with multiple fallback sources
 * Supports: Crypto, Stocks, Precious Metals (Gold, Silver, Platinum)
 */

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

async function fetchJson(url: string, timeout: number = 10000): Promise<any> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, { signal: controller.signal });
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

  // Try CoinGecko first (public API)
  try {
    const url = 'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=10&page=1&price_change_percentage=24h';
    const data = await fetchJson(url);
    
    if (Array.isArray(data) && data.length > 0) {
      const result = data.map(item => ({
        symbol: item.symbol?.toUpperCase() || '',
        name: item.name || '',
        price: item.current_price || 0,
        change24h: item.price_change_24h || 0,
        changePercent: item.price_change_percentage_24h || 0,
        marketCap: item.market_cap || 0,
        volume24h: item.total_volume || 0,
        source: 'coingecko',
      }));
      setCache(cacheKey, result, 60);
      return result;
    }
  } catch (error) {
    console.warn('CoinGecko failed, trying fallback:', error);
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
      setCache(cacheKey, result, 60);
      return result;
    }
  } catch (error) {
    console.error('Stock market data fetch failed:', error);
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
      setCache(cacheKey, result, 60);
      return result;
    }
  } catch (error) {
    console.error('Metals market data fetch failed:', error);
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
  // Try CoinGecko first
  try {
    const coinId = symbol.toLowerCase();
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd&include_24hr_change=true&include_market_cap=true`;
    const data = await fetchJson(url);
    
    if (data?.[coinId]?.usd) {
      return {
        symbol: symbol.toUpperCase(),
        name: symbol,
        price: data[coinId].usd,
        changePercent: data[coinId].usd_24h_change || 0,
        marketCap: data[coinId].usd_market_cap || 0,
        source: 'coingecko',
      };
    }
  } catch (error) {
    console.warn(`CoinGecko failed for ${symbol}, trying CryptoCompare`);
  }

  // Fallback: CryptoCompare
  try {
    const url = `https://min-api.cryptocompare.com/data/pricemultifull?fsyms=${symbol}&tsyms=USD`;
    const data = await fetchJson(url);
    
    if (data?.RAW?.[symbol]?.USD) {
      const usd = data.RAW[symbol].USD;
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
    console.warn(`CryptoCompare failed for ${symbol}, trying Yahoo`);
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
