/**
 * cryptoAggregator.ts
 * Multi-provider crypto price aggregator (replacement for CoinGecko)
 * Uses CoinPaprika (primary), CoinCap, CryptoCompare, CoinMarketCap as fallbacks
 * No API key required for basic usage
 */
import fetch from 'node-fetch';
import NodeCache from 'node-cache';
import { RateLimiterMemory } from 'rate-limiter-flexible';

export interface CryptoPrice {
  id: string;
  symbol: string;
  name: string;
  currentPrice: number;
  priceChange24h?: number;
  priceChangePercentage24h?: number;
  marketCap?: number;
  volume24h?: number;
  lastUpdated: Date;
}

interface Provider {
  name: string;
  base: string;
  requiresKey?: boolean;
}

/**
 * Crypto identifier mapping for different providers
 * Maps symbol -> { coinpaprika, coincap, cryptocompare, coinmarketcap, coingecko }
 */
const CRYPTO_ID_MAP: Record<string, {
  coinpaprika: string;
  coincap: string;
  cryptocompare: string;
  coinmarketcap: string;
  coingecko: string;
}> = {
  'btc': {
    coinpaprika: 'btc-bitcoin',
    coincap: 'bitcoin',
    cryptocompare: 'BTC',
    coinmarketcap: 'BTC',
    coingecko: 'bitcoin'
  },
  'eth': {
    coinpaprika: 'eth-ethereum',
    coincap: 'ethereum',
    cryptocompare: 'ETH',
    coinmarketcap: 'ETH',
    coingecko: 'ethereum'
  },
  'usdt': {
    coinpaprika: 'usdt-tether',
    coincap: 'tether',
    cryptocompare: 'USDT',
    coinmarketcap: 'USDT',
    coingecko: 'tether'
  },
  'usdc': {
    coinpaprika: 'usdc-usd-coin',
    coincap: 'usd-coin',
    cryptocompare: 'USDC',
    coinmarketcap: 'USDC',
    coingecko: 'usd-coin'
  },
  'bnb': {
    coinpaprika: 'bnb-binance-coin',
    coincap: 'binance-coin',
    cryptocompare: 'BNB',
    coinmarketcap: 'BNB',
    coingecko: 'binancecoin'
  },
  'xrp': {
    coinpaprika: 'xrp-xrp',
    coincap: 'ripple',
    cryptocompare: 'XRP',
    coinmarketcap: 'XRP',
    coingecko: 'ripple'
  },
  'ada': {
    coinpaprika: 'ada-cardano',
    coincap: 'cardano',
    cryptocompare: 'ADA',
    coinmarketcap: 'ADA',
    coingecko: 'cardano'
  },
  'sol': {
    coinpaprika: 'sol-solana',
    coincap: 'solana',
    cryptocompare: 'SOL',
    coinmarketcap: 'SOL',
    coingecko: 'solana'
  },
  'doge': {
    coinpaprika: 'doge-dogecoin',
    coincap: 'dogecoin',
    cryptocompare: 'DOGE',
    coinmarketcap: 'DOGE',
    coingecko: 'dogecoin'
  },
  'dot': {
    coinpaprika: 'dot-polkadot',
    coincap: 'polkadot',
    cryptocompare: 'DOT',
    coinmarketcap: 'DOT',
    coingecko: 'polkadot'
  },
  'matic': {
    coinpaprika: 'matic-polygon',
    coincap: 'polygon',
    cryptocompare: 'MATIC',
    coinmarketcap: 'MATIC',
    coingecko: 'matic-network'
  },
  'avax': {
    coinpaprika: 'avax-avalanche',
    coincap: 'avalanche',
    cryptocompare: 'AVAX',
    coinmarketcap: 'AVAX',
    coingecko: 'avalanche-2'
  },
  'link': {
    coinpaprika: 'link-chainlink',
    coincap: 'chainlink',
    cryptocompare: 'LINK',
    coinmarketcap: 'LINK',
    coingecko: 'chainlink'
  },
  'atom': {
    coinpaprika: 'atom-cosmos',
    coincap: 'cosmos',
    cryptocompare: 'ATOM',
    coinmarketcap: 'ATOM',
    coingecko: 'cosmos'
  },
  'ltc': {
    coinpaprika: 'ltc-litecoin',
    coincap: 'litecoin',
    cryptocompare: 'LTC',
    coinmarketcap: 'LTC',
    coingecko: 'litecoin'
  }
};

interface AggregatorOptions {
  cacheTTL?: number; // seconds
  cryptocompareKey?: string;
  coinmarketcapKey?: string;
}

export class CryptoAggregator {
  private cache: NodeCache;
  private rateLimiter: RateLimiterMemory;
  private options: AggregatorOptions;
  private PROVIDERS: Provider[];

  constructor(options?: AggregatorOptions) {
    this.options = options || {};
    this.cache = new NodeCache({ stdTTL: this.options.cacheTTL ?? 60 });
    this.rateLimiter = new RateLimiterMemory({ points: 20, duration: 1 }); // 20 req/s
    this.PROVIDERS = [
      { name: 'coinpaprika', base: 'https://api.coinpaprika.com/v1' },
      { name: 'coincap', base: 'https://api.coincap.io/v2' },
      { name: 'cryptocompare', base: 'https://min-api.cryptocompare.com/data', requiresKey: false },
      { name: 'coinmarketcap', base: 'https://pro-api.coinmarketcap.com/v1', requiresKey: true },
    ];
  }

  /**
   * Normalize symbol to provider-specific identifier
   */
  private normalizeId(symbol: string, provider: string): string {
    const lower = symbol.toLowerCase();
    const mapping = CRYPTO_ID_MAP[lower];
    
    if (mapping) {
      return mapping[provider as keyof typeof mapping] || symbol;
    }
    
    // Fallback: try to guess the format
    if (provider === 'coinpaprika') {
      // If already a slug (contains dash), use as is
      if (symbol.includes('-')) return symbol.toLowerCase();
      // Otherwise, try to construct a slug (may not work for all coins)
      return symbol.toLowerCase();
    } else if (provider === 'coincap') {
      // Remove any dashes and use lowercase full name if available
      return symbol.toLowerCase().replace('-', '');
    } else if (provider === 'cryptocompare' || provider === 'coinmarketcap') {
      // Use uppercase symbol
      return symbol.toUpperCase();
    }
    
    return symbol;
  }

  private async throttle() {
    try {
      await this.rateLimiter.consume(1);
    } catch {
      // Rate limit exceeded, wait a bit
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  private async tryProviders<T>(
    pathMapper: (p: Provider) => { url: string; headers?: Record<string, string> } | null,
    cacheKey?: string,
    ttlSec?: number
  ): Promise<T> {
    if (cacheKey) {
      const cached = this.cache.get<T>(cacheKey);
      if (cached) return cached;
    }

    await this.throttle();

    for (const p of this.PROVIDERS) {
      try {
        const req = pathMapper(p);
        if (!req) continue;

        const res = await fetch(req.url, { headers: req.headers });
        if (!res.ok) {
          continue;
        }

        const data = await res.json() as any;
        if (cacheKey) {
          this.cache.set(cacheKey, data, ttlSec ?? this.options.cacheTTL ?? 60);
        }
        return data as T;
      } catch (err) {
        console.warn(`[CryptoAggregator:${p.name}] error:`, (err as Error).message);
        continue;
      }
    }

    throw new Error('All crypto providers failed');
  }

  /**
   * Get list of all coins (normalized)
   */
  public async getCoinsList(): Promise<{ id: string; symbol: string; name: string }[]> {
    const raw = await this.tryProviders<any>((p) => {
      if (p.name === 'coinpaprika') return { url: `${p.base}/coins` };
      if (p.name === 'coincap') return { url: `${p.base}/assets` };
      return null;
    }, 'coins_list', 300);

    // Normalize different provider formats
    if (Array.isArray(raw)) {
      return raw
        .map((c: any) => {
          if (c.id && c.symbol && c.name) {
            return { id: c.id, symbol: c.symbol.toLowerCase(), name: c.name };
          }
          return null;
        })
        .filter(Boolean) as { id: string; symbol: string; name: string }[];
    } else if (raw.data && Array.isArray(raw.data)) {
      return raw.data.map((d: any) => ({
        id: d.id,
        symbol: d.symbol.toLowerCase(),
        name: d.name
      }));
    }

    return [];
  }

  /**
   * Get simple price for multiple coins
   * ids: ['btc', 'eth'], vs: ['usd', 'eur']
   * Returns: { btc: { usd: 50000, eur: 45000 }, eth: { usd: 3000, eur: 2700 } }
   */
  public async getSimplePrice(
    ids: string[],
    vs: string[] = ['usd']
  ): Promise<Record<string, Record<string, number | null>>> {
    const cacheKey = `simple_price:${ids.join(',')}:${vs.join(',')}`;

    const data = await this.tryProviders<any>((p) => {
      if (p.name === 'cryptocompare') {
        const fsyms = ids.map(i => this.normalizeId(i, 'cryptocompare')).join(',');
        const tsyms = vs.map(v => v.toUpperCase()).join(',');
        const key = this.options.cryptocompareKey ? `&api_key=${this.options.cryptocompareKey}` : '';
        return { url: `${p.base}/pricemulti?fsyms=${fsyms}&tsyms=${tsyms}${key}` };
      }
      if (p.name === 'coincap') {
        return { url: `${p.base}/assets` };
      }
      if (p.name === 'coinmarketcap' && this.options.coinmarketcapKey) {
        const symbolStr = ids.map(i => this.normalizeId(i, 'coinmarketcap')).join(',');
        return {
          url: `${p.base}/cryptocurrency/quotes/latest?symbol=${symbolStr}`,
          headers: { 'X-CMC_PRO_API_KEY': this.options.coinmarketcapKey }
        };
      }
      if (p.name === 'coinpaprika') {
        // CoinPaprika doesn't have a multi-price endpoint, skip for now
        return null;
      }
      return null;
    }, cacheKey, 30).catch(() => null);

    const result: Record<string, Record<string, number | null>> = {};
    ids.forEach(id => {
      result[id] = {};
      vs.forEach(v => (result[id][v] = null));
    });

    if (!data) return result;

    // CryptoCompare format: { BTC: { USD: 123 } }
    if (Object.keys(data).length && Object.keys(data)[0].toUpperCase() === Object.keys(data)[0]) {
      for (const id of ids) {
        const normalized = this.normalizeId(id, 'cryptocompare');
        for (const v of vs) {
          result[id][v] = data[normalized]?.[v.toUpperCase()] ?? null;
        }
      }
      return result;
    }

    // CoinCap format: { data: [ { symbol, priceUsd } ] }
    if (data.data && Array.isArray(data.data)) {
      for (const id of ids) {
        const normalized = this.normalizeId(id, 'coincap');
        const found = data.data.find((d: any) =>
          d.symbol?.toLowerCase() === id.toLowerCase() || 
          d.id === normalized ||
          d.symbol?.toUpperCase() === this.normalizeId(id, 'cryptocompare')
        );
        if (found) {
          for (const v of vs) {
            if (v.toLowerCase() === 'usd') {
              result[id][v] = Number(found.priceUsd ?? null);
            }
          }
        }
      }
      return result;
    }

    // CoinMarketCap format: data: { BTC: { quote: { USD: { price } } } }
    if (data.data && typeof data.data === 'object') {
      for (const id of ids) {
        const normalized = this.normalizeId(id, 'coinmarketcap');
        const obj = data.data[normalized];
        for (const v of vs) {
          const upv = v.toUpperCase();
          result[id][v] = obj?.quote?.[upv]?.price ?? null;
        }
      }
      return result;
    }

    return result;
  }

  /**
   * Get single crypto price (enhanced format)
   */
  public async getCryptoPrice(symbol: string): Promise<CryptoPrice | null> {
    const cacheKey = `crypto_price:${symbol.toLowerCase()}`;

    try {
      const data = await this.tryProviders<any>((p) => {
        const normalized = this.normalizeId(symbol, p.name);
        
        if (p.name === 'coinpaprika') {
          return { url: `${p.base}/tickers/${normalized}` };
        }
        if (p.name === 'coincap') {
          return { url: `${p.base}/assets/${normalized}` };
        }
        if (p.name === 'cryptocompare') {
          const key = this.options.cryptocompareKey ? `&api_key=${this.options.cryptocompareKey}` : '';
          return { url: `${p.base}/price?fsym=${normalized}&tsyms=USD${key}` };
        }
        if (p.name === 'coinmarketcap' && this.options.coinmarketcapKey) {
          return {
            url: `${p.base}/cryptocurrency/quotes/latest?symbol=${normalized}`,
            headers: { 'X-CMC_PRO_API_KEY': this.options.coinmarketcapKey }
          };
        }
        return null;
      }, cacheKey, 60);

      if (data) {
        // CoinPaprika format
        if (data.id && data.quotes?.USD) {
          const usd = data.quotes.USD;
          return {
            id: data.id,
            symbol: data.symbol?.toUpperCase() || symbol.toUpperCase(),
            name: data.name || symbol,
            currentPrice: usd.price || 0,
            priceChange24h: usd.price_change_24h || 0,
            priceChangePercentage24h: usd.percent_change_24h || 0,
            marketCap: usd.market_cap || 0,
            volume24h: usd.volume_24h || 0,
            lastUpdated: new Date(),
          };
        }

        // CoinCap format
        if (data.data) {
          const d = data.data;
          return {
            id: d.id,
            symbol: d.symbol?.toUpperCase() || symbol.toUpperCase(),
            name: d.name || symbol,
            currentPrice: Number(d.priceUsd) || 0,
            priceChangePercentage24h: Number(d.changePercent24Hr) || 0,
            marketCap: Number(d.marketCapUsd) || 0,
            volume24h: Number(d.volumeUsd24Hr) || 0,
            lastUpdated: new Date(),
          };
        }

        // CryptoCompare format
        if (data.USD && typeof data.USD === 'number') {
          return {
            id: symbol.toLowerCase(),
            symbol: symbol.toUpperCase(),
            name: symbol,
            currentPrice: data.USD,
            lastUpdated: new Date(),
          };
        }

        // CoinMarketCap format
        if (data.data && typeof data.data === 'object') {
          const normalized = this.normalizeId(symbol, 'coinmarketcap');
          const coinData = data.data[normalized];
          if (coinData?.quote?.USD) {
            const usd = coinData.quote.USD;
            return {
              id: coinData.id?.toString() || symbol.toLowerCase(),
              symbol: coinData.symbol || symbol.toUpperCase(),
              name: coinData.name || symbol,
              currentPrice: usd.price || 0,
              priceChange24h: usd.price_change_24h || 0,
              priceChangePercentage24h: usd.percent_change_24h || 0,
              marketCap: usd.market_cap || 0,
              volume24h: usd.volume_24h || 0,
              lastUpdated: new Date(usd.last_updated),
            };
          }
        }
      }
    } catch (err) {
      console.warn('[CryptoAggregator] getCryptoPrice failed:', (err as Error).message);
    }

    return null;
  }

  /**
   * Get multiple crypto prices
   */
  public async getMultipleCryptoPrices(symbols: string[]): Promise<CryptoPrice[]> {
    const results: CryptoPrice[] = [];

    for (const symbol of symbols) {
      const price = await this.getCryptoPrice(symbol);
      if (price) {
        results.push(price);
      }
    }

    return results;
  }

  /**
   * Search for coins
   */
  public async search(query: string): Promise<any[]> {
    const cacheKey = `search:${query}`;

    const data = await this.tryProviders<any>((p) => {
      if (p.name === 'coinpaprika') {
        return { url: `${p.base}/search?q=${encodeURIComponent(query)}` };
      }
      if (p.name === 'coincap') {
        return { url: `${p.base}/assets?search=${encodeURIComponent(query)}` };
      }
      return null;
    }, cacheKey, 60).catch(() => ({ coins: [] }));

    if (data.coins) {
      return data.coins.map((c: any) => ({ id: c.id, symbol: c.symbol, name: c.name }));
    }
    if (data.data && Array.isArray(data.data)) {
      return data.data.map((d: any) => ({ id: d.id, symbol: d.symbol, name: d.name || d.symbol }));
    }

    return [];
  }

  /**
   * Shutdown and cleanup
   */
  public async shutdown(): Promise<void> {
    this.cache.flushAll();
    this.cache.close();
  }
}

// Export singleton instance
export const cryptoAggregator = new CryptoAggregator({
  cacheTTL: 60,
  cryptocompareKey: process.env.CRYPTOCOMPARE_KEY,
  coinmarketcapKey: process.env.COINMARKETCAP_KEY,
});
