import { storage } from './storage';
import { getStockQuote, getMultipleStockQuotes } from './alphaVantage';
import { getCryptoPrice, getMultipleCryptoPrices, getCoinGeckoId } from './coinGecko';
import type { Asset } from '@shared/schema';

export interface SyncResult {
  success: boolean;
  synced: number;
  failed: number;
  errors: string[];
}

export async function syncStockPrices(userId: string): Promise<SyncResult> {
  const result: SyncResult = {
    success: true,
    synced: 0,
    failed: 0,
    errors: [],
  };

  try {
    // Get all stock assets for this user
    const assets = await storage.getAssets(userId);
    const stockAssets = assets.filter(a => a.assetType === 'stocks');

    if (stockAssets.length === 0) {
      return result;
    }

    // Fetch quotes for all stocks
    const symbols = stockAssets.map(a => a.symbol);
    const quotes = await getMultipleStockQuotes(symbols);

    // Update each asset with new price data
    for (const asset of stockAssets) {
      const quote = quotes.find(q => q.symbol === asset.symbol);
      
      if (quote) {
        try {
          const quantity = asset.quantity || 1;
          const newValue = quote.price * quantity;
          
          await storage.updateAsset(asset.id, userId, {
            value: newValue,
            change24h: quote.change * quantity,
            changePercent: quote.changePercent,
            source: 'alpha_vantage',
            lastSynced: new Date(),
          });
          
          result.synced++;
        } catch (error) {
          result.failed++;
          result.errors.push(`Failed to update ${asset.symbol}: ${error}`);
        }
      } else {
        result.failed++;
        result.errors.push(`No quote found for ${asset.symbol}`);
      }
    }
  } catch (error) {
    result.success = false;
    result.errors.push(`Sync failed: ${error}`);
  }

  return result;
}

export async function syncCryptoPrices(userId: string): Promise<SyncResult> {
  const result: SyncResult = {
    success: true,
    synced: 0,
    failed: 0,
    errors: [],
  };

  try {
    // Get all crypto assets for this user
    const assets = await storage.getAssets(userId);
    const cryptoAssets = assets.filter(a => a.assetType === 'crypto');

    if (cryptoAssets.length === 0) {
      return result;
    }

    // Map symbols to CoinGecko IDs
    const coinIds = cryptoAssets.map(a => getCoinGeckoId(a.symbol));
    const prices = await getMultipleCryptoPrices(coinIds);

    // Update each asset with new price data
    for (const asset of cryptoAssets) {
      const coinId = getCoinGeckoId(asset.symbol);
      const priceData = prices.find(p => p.id === coinId);
      
      if (priceData) {
        try {
          const quantity = asset.quantity || 1;
          const newValue = priceData.currentPrice * quantity;
          
          await storage.updateAsset(asset.id, userId, {
            value: newValue,
            change24h: priceData.priceChange24h * quantity,
            changePercent: priceData.priceChangePercentage24h,
            source: 'coingecko',
            lastSynced: new Date(),
          });
          
          result.synced++;
        } catch (error) {
          result.failed++;
          result.errors.push(`Failed to update ${asset.symbol}: ${error}`);
        }
      } else {
        result.failed++;
        result.errors.push(`No price found for ${asset.symbol}`);
      }
    }
  } catch (error) {
    result.success = false;
    result.errors.push(`Sync failed: ${error}`);
  }

  return result;
}

export async function syncAllFinancialData(userId: string): Promise<{
  stocks: SyncResult;
  crypto: SyncResult;
}> {
  const [stocks, crypto] = await Promise.all([
    syncStockPrices(userId),
    syncCryptoPrices(userId),
  ]);

  return { stocks, crypto };
}

export async function addStockPosition(
  userId: string,
  symbol: string,
  quantity: number,
  name?: string
): Promise<Asset> {
  // Fetch current price from Alpha Vantage
  const quote = await getStockQuote(symbol);
  
  if (!quote) {
    throw new Error(`Could not fetch price for ${symbol}`);
  }

  const value = quote.price * quantity;

  return await storage.createAsset({
    userId,
    name: name || quote.symbol,
    symbol: quote.symbol,
    assetType: 'stocks',
    value,
    quantity,
    change24h: quote.change * quantity,
    changePercent: quote.changePercent,
    source: 'alpha_vantage',
    lastSynced: new Date(),
  });
}

export async function addCryptoPosition(
  userId: string,
  symbol: string,
  quantity: number,
  name?: string
): Promise<Asset> {
  // Fetch current price from CoinGecko
  const coinId = getCoinGeckoId(symbol);
  const priceData = await getCryptoPrice(coinId);
  
  if (!priceData) {
    throw new Error(`Could not fetch price for ${symbol}`);
  }

  const value = priceData.currentPrice * quantity;

  return await storage.createAsset({
    userId,
    name: name || priceData.name,
    symbol: priceData.symbol,
    assetType: 'crypto',
    value,
    quantity,
    change24h: priceData.priceChange24h * quantity,
    changePercent: priceData.priceChangePercentage24h,
    source: 'coingecko',
    lastSynced: new Date(),
  });
}
