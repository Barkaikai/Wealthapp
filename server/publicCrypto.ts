import fetch from 'node-fetch';

interface CryptoDataCache {
  data: any;
  timestamp: number;
}

const cache: Map<string, CryptoDataCache> = new Map();
const CACHE_TTL = 60000;

function getCached(key: string): any | null {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  return null;
}

function setCache(key: string, data: any): void {
  cache.set(key, { data, timestamp: Date.now() });
}

async function fetchJson(url: string, timeout: number = 10000): Promise<any | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    
    if (response.status === 200) {
      return await response.json();
    }
    return null;
  } catch (error) {
    return null;
  }
}

export async function fetchPublicCryptoData(): Promise<Record<string, any>> {
  const cacheKey = 'public_crypto_data';
  const cached = getCached(cacheKey);
  if (cached) {
    return cached;
  }

  const url = 'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&price_change_percentage=24h';
  const data = await fetchJson(url);
  
  if (Array.isArray(data) && data.length > 0) {
    const result: Record<string, any> = {};
    for (const item of data) {
      const symbol = (item.symbol || '').toUpperCase();
      result[symbol] = {
        id: item.id,
        symbol: symbol,
        name: item.name,
        price_usd: item.current_price,
        market_cap_usd: item.market_cap,
        volume_24h_usd: item.total_volume,
        change_24h_pct: item.price_change_percentage_24h,
        price_change_24h: item.price_change_24h,
        last_updated: item.last_updated,
      };
    }
    setCache(cacheKey, result);
    return result;
  }

  const fallback: Record<string, any> = {};
  for (const sym of ['BTC', 'ETH', 'SOL', 'USDT', 'BNB']) {
    const url = `https://min-api.cryptocompare.com/data/price?fsym=${sym}&tsyms=USD`;
    const resp = await fetchJson(url);
    if (resp && resp.USD) {
      fallback[sym] = { 
        symbol: sym,
        price_usd: resp.USD,
        name: sym,
      };
    }
  }

  if (Object.keys(fallback).length > 0) {
    setCache(cacheKey, fallback);
    return fallback;
  }

  setCache(cacheKey, {});
  return {};
}

export async function getPublicCryptoPrice(symbol: string): Promise<any | null> {
  const allData = await fetchPublicCryptoData();
  const upperSymbol = symbol.toUpperCase();
  
  if (allData[upperSymbol]) {
    const crypto = allData[upperSymbol];
    return {
      id: crypto.id || crypto.symbol.toLowerCase(),
      symbol: crypto.symbol,
      name: crypto.name,
      currentPrice: crypto.price_usd,
      priceChange24h: crypto.price_change_24h || 0,
      priceChangePercentage24h: crypto.change_24h_pct || 0,
      marketCap: crypto.market_cap_usd || 0,
      volume24h: crypto.volume_24h_usd || 0,
      lastUpdated: crypto.last_updated ? new Date(crypto.last_updated) : new Date(),
    };
  }
  
  return null;
}
