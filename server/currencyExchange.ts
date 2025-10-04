/**
 * Currency Exchange Service
 * Handles multi-currency conversion to USD for revenue tracking
 */

// Simple in-memory cache for exchange rates
let exchangeRatesCache: { [key: string]: number } | null = null;
let lastFetchTime: number = 0;
const CACHE_DURATION_MS = 12 * 60 * 60 * 1000; // 12 hours

/**
 * Fetch latest exchange rates (fallback to hardcoded rates if API unavailable)
 */
async function fetchExchangeRates(): Promise<{ [key: string]: number }> {
  try {
    // Try to fetch from Alpha Vantage if API key is available
    if (process.env.ALPHA_VANTAGE_API_KEY) {
      const response = await fetch(
        `https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=EUR&to_currency=USD&apikey=${process.env.ALPHA_VANTAGE_API_KEY}`
      );
      
      if (response.ok) {
        const data = await response.json();
        const eurToUsd = parseFloat(data['Realtime Currency Exchange Rate']?.['5. Exchange Rate'] || '1.09');
        
        // Get additional rates (simplified - in production use batch API)
        return {
          'USD': 1.00,
          'EUR': eurToUsd,
          'GBP': 1.27, // Approximate
          'CAD': 0.74, // Approximate
          'AUD': 0.66, // Approximate
          'JPY': 0.0068, // Approximate
        };
      }
    }
  } catch (error) {
    console.warn('[FX] Failed to fetch live rates, using fallback:', error);
  }

  // Fallback to approximate rates (updated October 2024)
  return {
    'USD': 1.00,
    'EUR': 1.09,
    'GBP': 1.27,
    'CAD': 0.74,
    'AUD': 0.66,
    'JPY': 0.0068,
    'CHF': 1.16,
    'CNY': 0.14,
    'INR': 0.012,
  };
}

/**
 * Get cached exchange rates or fetch new ones if cache expired
 */
async function getExchangeRates(): Promise<{ [key: string]: number }> {
  const now = Date.now();
  
  if (exchangeRatesCache && (now - lastFetchTime) < CACHE_DURATION_MS) {
    return exchangeRatesCache;
  }

  exchangeRatesCache = await fetchExchangeRates();
  lastFetchTime = now;
  
  return exchangeRatesCache;
}

/**
 * Convert amount from any currency to USD
 * @param amount - Amount in original currency
 * @param currency - ISO currency code (USD, EUR, GBP, etc.)
 * @returns Amount in USD
 */
export async function convertToUSD(amount: number, currency: string): Promise<number> {
  const upperCurrency = currency.toUpperCase();
  
  // Already USD
  if (upperCurrency === 'USD') {
    return amount;
  }

  const rates = await getExchangeRates();
  const rate = rates[upperCurrency];

  if (!rate) {
    console.warn(`[FX] No exchange rate found for ${upperCurrency}, using 1:1 fallback`);
    return amount;
  }

  return amount * rate;
}

/**
 * Get current exchange rate for a currency pair
 */
export async function getExchangeRate(from: string, to: string = 'USD'): Promise<number> {
  const rates = await getExchangeRates();
  const fromUpper = from.toUpperCase();
  const toUpper = to.toUpperCase();

  if (fromUpper === toUpper) {
    return 1.00;
  }

  if (toUpper === 'USD') {
    return rates[fromUpper] || 1.00;
  }

  // Convert via USD: from -> USD -> to
  const fromRate = rates[fromUpper] || 1.00;
  const toRate = rates[toUpper] || 1.00;
  
  return fromRate / toRate;
}

/**
 * Format currency amount with proper symbol
 */
export function formatCurrency(amount: number, currency: string): string {
  const symbols: { [key: string]: string } = {
    'USD': '$',
    'EUR': '€',
    'GBP': '£',
    'JPY': '¥',
    'CAD': 'C$',
    'AUD': 'A$',
    'CHF': 'CHF',
    'CNY': '¥',
    'INR': '₹',
  };

  const symbol = symbols[currency.toUpperCase()] || currency.toUpperCase();
  const formatted = amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return `${symbol}${formatted}`;
}
