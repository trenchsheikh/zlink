// Simple price service for converting crypto amounts to USD
// In production, you would use a real API like CoinGecko, CoinMarketCap, etc.

class PriceService {
  constructor() {
    // Mock prices - in production, fetch from real API
    this.prices = {
      'ETH': 3500,    // Base uses ETH
      'BNB': 600,     // BNB Chain
      'SOL': 150,     // Solana
      'ZEC': 45,      // Zcash
    };
    
    this.feePercentage = 1; // 1% fee
    this.minimumUsd = 10;   // Minimum $10 USD
  }

  // Get current price for a coin
  getPrice(coinSymbol) {
    return this.prices[coinSymbol.toUpperCase()] || 0;
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



