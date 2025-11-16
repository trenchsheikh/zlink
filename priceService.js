// Price service for converting crypto amounts to USD using CoinGecko API

import axios from 'axios';

class PriceService {
  constructor() {
    // Fallback prices in case API fails
    this.prices = {
      'ETH': 3500,    // Base uses ETH
      'BNB': 600,     // BNB Chain
      'SOL': 150,     // Solana
      'BTC': 65000,   // Bitcoin
      'ZEC': 45,      // Zcash
    };
    
    this.feePercentage = 1; // 1% fee
    this.minimumUsd = 10;   // Minimum $10 USD
    
    // CoinGecko API mapping
    this.coinGeckoIds = {
      'ETH': 'ethereum',
      'BNB': 'binancecoin',
      'SOL': 'solana',
      'BTC': 'bitcoin',
      'ZEC': 'zcash',
    };
    
    // Cache prices for 5 minutes to avoid excessive API calls
    this.priceCache = {};
    this.cacheExpiry = 5 * 60 * 1000; // 5 minutes in milliseconds
    this.lastFetchTime = 0;
    
    // Initialize prices on startup
    this.fetchPrices();
    
    // Refresh prices every 5 minutes
    setInterval(() => {
      this.fetchPrices();
    }, this.cacheExpiry);
  }

  // Fetch prices from CoinGecko API
  async fetchPrices() {
    try {
      const coinIds = Object.values(this.coinGeckoIds).join(',');
      const response = await axios.get(
        `https://api.coingecko.com/api/v3/simple/price?ids=${coinIds}&vs_currencies=usd`,
        { timeout: 10000 }
      );
      
      const data = response.data;
      
      // Map CoinGecko response to our coin symbols
      this.prices = {
        'ETH': data.ethereum?.usd || this.prices.ETH,
        'BNB': data.binancecoin?.usd || this.prices.BNB,
        'SOL': data.solana?.usd || this.prices.SOL,
        'BTC': data.bitcoin?.usd || this.prices.BTC,
        'ZEC': data.zcash?.usd || this.prices.ZEC,
      };
      
      this.lastFetchTime = Date.now();
      
      console.log('✅ Prices updated from CoinGecko:');
      console.log(`   ETH: $${this.prices.ETH.toFixed(2)}`);
      console.log(`   BNB: $${this.prices.BNB.toFixed(2)}`);
      console.log(`   SOL: $${this.prices.SOL.toFixed(2)}`);
      console.log(`   BTC: $${this.prices.BTC.toFixed(2)}`);
      console.log(`   ZEC: $${this.prices.ZEC.toFixed(2)}`);
    } catch (error) {
      console.error('⚠️  Failed to fetch prices from CoinGecko:', error.message);
      console.log('   Using cached/fallback prices');
      
      // If we have no cached prices and this is the first fetch, try again in 30 seconds
      if (this.lastFetchTime === 0) {
        setTimeout(() => this.fetchPrices(), 30000);
      }
    }
  }

  // Get current price for a coin
  getPrice(coinSymbol) {
    const symbol = coinSymbol.toUpperCase();
    return this.prices[symbol] || 0;
  }
  
  // Get price with async support (for when you need fresh prices)
  async getPriceAsync(coinSymbol) {
    // If prices are stale, try to refresh
    if (Date.now() - this.lastFetchTime > this.cacheExpiry) {
      await this.fetchPrices();
    }
    return this.getPrice(coinSymbol);
  }

  // Convert crypto amount to USD
  toUSD(amount, coinSymbol) {
    const price = this.getPrice(coinSymbol);
    return parseFloat(amount) * price;
  }

  // Convert USD to crypto amount
  toCrypto(usdAmount, coinSymbol) {
    const price = this.getPrice(coinSymbol);
    if (price === 0) return 0;
    return usdAmount / price;
  }

  // Calculate Zcash amount after 1% fee
  calculateZcashAmount(usdAmount) {
    // Apply 1% fee
    const afterFee = usdAmount * (1 - this.feePercentage / 100);
    // Convert to ZEC
    return this.toCrypto(afterFee, 'ZEC');
  }

  // Check if amount meets minimum
  meetsMinimum(usdAmount) {
    return usdAmount >= this.minimumUsd;
  }

  // Get coin symbol from chain name
  getCoinFromChain(chain) {
    const chainMap = {
      'Base': 'ETH',
      'BNB': 'BNB',
      'BNB Smart Chain': 'BNB',
      'Solana': 'SOL',
      'Bitcoin': 'BTC',
      'BTC': 'BTC',
    };
    return chainMap[chain] || 'ETH';
  }

  // Format currency
  formatUSD(amount) {
    return `$${parseFloat(amount).toFixed(2)}`;
  }

  formatCrypto(amount, decimals = 6) {
    return parseFloat(amount).toFixed(decimals);
  }
}

export default new PriceService();



