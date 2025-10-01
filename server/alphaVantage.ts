import fetch from 'node-fetch';

const API_KEY = process.env.ALPHA_VANTAGE_API_KEY || 'demo';
const BASE_URL = 'https://www.alphavantage.co/query';

export interface StockQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  lastUpdated: Date;
}

export async function getStockQuote(symbol: string): Promise<StockQuote | null> {
  try {
    const url = `${BASE_URL}?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${API_KEY}`;
    const response = await fetch(url);
    const data = await response.json() as any;

    if (data['Global Quote'] && Object.keys(data['Global Quote']).length > 0) {
      const quote = data['Global Quote'];
      return {
        symbol: quote['01. symbol'],
        price: parseFloat(quote['05. price']),
        change: parseFloat(quote['09. change']),
        changePercent: parseFloat(quote['10. change percent'].replace('%', '')),
        volume: parseInt(quote['06. volume']),
        lastUpdated: new Date(quote['07. latest trading day']),
      };
    }

    return null;
  } catch (error) {
    console.error(`Error fetching stock quote for ${symbol}:`, error);
    return null;
  }
}

export async function getMultipleStockQuotes(symbols: string[]): Promise<StockQuote[]> {
  const quotes = await Promise.all(
    symbols.map(symbol => getStockQuote(symbol))
  );
  return quotes.filter((quote): quote is StockQuote => quote !== null);
}

export async function getStockPrice(symbol: string): Promise<number | null> {
  const quote = await getStockQuote(symbol);
  return quote?.price || null;
}
