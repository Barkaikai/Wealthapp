import fetch from 'node-fetch';
import { getPublicCryptoPrice } from './publicCrypto';

const API_KEY = process.env.COINGECKO_API_KEY;
const BASE_URL = 'https://api.coingecko.com/api/v3';
const USE_PUBLIC_API = process.env.CRYPTO_DATA_SOURCE === 'public' || !API_KEY;

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

export async function getCryptoPrice(coinId: string): Promise<CryptoPrice | null> {
  if (USE_PUBLIC_API) {
    const symbol = Object.keys(CRYPTO_ID_MAP).find(key => CRYPTO_ID_MAP[key] === coinId) || coinId;
    return await getPublicCryptoPrice(symbol);
  }

  try {
    const headers: any = {
      'Accept': 'application/json',
    };
    
    if (API_KEY) {
      headers['x-cg-demo-api-key'] = API_KEY;
    }

    const url = `${BASE_URL}/coins/markets?vs_currency=usd&ids=${coinId}&order=market_cap_desc&per_page=1&page=1&sparkline=false&price_change_percentage=24h`;
    const response = await fetch(url, { headers });
    const data = await response.json() as any[];

    if (data && data.length > 0) {
      const coin = data[0];
      return {
        id: coin.id,
        symbol: coin.symbol.toUpperCase(),
        name: coin.name,
        currentPrice: coin.current_price,
        priceChange24h: coin.price_change_24h || 0,
        priceChangePercentage24h: coin.price_change_percentage_24h || 0,
        marketCap: coin.market_cap || 0,
        volume24h: coin.total_volume || 0,
        lastUpdated: new Date(coin.last_updated),
      };
    }

    return null;
  } catch (error) {
    console.error(`Error fetching crypto price for ${coinId}:`, error);
    return null;
  }
}

export async function getMultipleCryptoPrices(coinIds: string[]): Promise<CryptoPrice[]> {
  if (USE_PUBLIC_API) {
    const results: CryptoPrice[] = [];
    for (const coinId of coinIds) {
      const symbol = Object.keys(CRYPTO_ID_MAP).find(key => CRYPTO_ID_MAP[key] === coinId) || coinId;
      const price = await getPublicCryptoPrice(symbol);
      if (price) {
        results.push(price);
      }
    }
    return results;
  }

  try {
    const headers: any = {
      'Accept': 'application/json',
    };
    
    if (API_KEY) {
      headers['x-cg-demo-api-key'] = API_KEY;
    }

    const url = `${BASE_URL}/coins/markets?vs_currency=usd&ids=${coinIds.join(',')}&order=market_cap_desc&per_page=250&page=1&sparkline=false&price_change_percentage=24h`;
    const response = await fetch(url, { headers });
    const data = await response.json() as any[];

    if (data && Array.isArray(data)) {
      return data.map(coin => ({
        id: coin.id,
        symbol: coin.symbol.toUpperCase(),
        name: coin.name,
        currentPrice: coin.current_price,
        priceChange24h: coin.price_change_24h || 0,
        priceChangePercentage24h: coin.price_change_percentage_24h || 0,
        marketCap: coin.market_cap || 0,
        volume24h: coin.total_volume || 0,
        lastUpdated: new Date(coin.last_updated),
      }));
    }

    return [];
  } catch (error) {
    console.error('Error fetching multiple crypto prices:', error);
    return [];
  }
}

// Map common symbols to CoinGecko IDs
export const CRYPTO_ID_MAP: Record<string, string> = {
  'BTC': 'bitcoin',
  'ETH': 'ethereum',
  'SOL': 'solana',
  'USDT': 'tether',
  'USDC': 'usd-coin',
  'BNB': 'binancecoin',
  'ADA': 'cardano',
  'DOGE': 'dogecoin',
  'MATIC': 'matic-network',
  'DOT': 'polkadot',
};

export function getCoinGeckoId(symbol: string): string {
  return CRYPTO_ID_MAP[symbol.toUpperCase()] || symbol.toLowerCase();
}
