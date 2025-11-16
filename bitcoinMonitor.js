// Bitcoin transaction monitor
// Note: This requires a Bitcoin RPC node or API service
// For production, consider using: BlockCypher, Blockchain.info, or your own Bitcoin Core node

import axios from 'axios';
import { config } from './config.js';
import db from './database.js';

class BitcoinMonitor {
  constructor(onTransaction) {
    this.onTransaction = onTransaction;
    this.processedTxids = new Set();
    this.enabled = false;
    this.watchAddresses = [];
    this.pollInterval = null;

    // Validate configuration
    if (!config.bitcoin.taprootAddress && !config.bitcoin.nativeSegwitAddress) {
      console.log('⚠️  Bitcoin monitoring disabled: Missing addresses');
      return;
    }

    // Add both addresses to watch list
    if (config.bitcoin.taprootAddress) {
      this.watchAddresses.push(config.bitcoin.taprootAddress);
    }
    if (config.bitcoin.nativeSegwitAddress) {
      this.watchAddresses.push(config.bitcoin.nativeSegwitAddress);
    }

    // Check if we have an API endpoint configured
    // For now, we'll use a placeholder - you'll need to configure a Bitcoin API
    this.apiUrl = process.env.BITCOIN_API_URL || null;
    
    if (!this.apiUrl) {
      console.log('⚠️  Bitcoin monitoring disabled: Missing BITCOIN_API_URL');
      console.log('   Configure BITCOIN_API_URL in .env (e.g., BlockCypher, Blockchain.info)');
      return;
    }

    this.enabled = true;
  }

  async start() {
    if (!this.enabled) {
      console.log('Bitcoin monitor: Skipped (not configured)');
      return;
    }

    console.log(`Starting Bitcoin monitor for addresses:`);
    this.watchAddresses.forEach(addr => {
      console.log(`   ${addr}`);
    });

    // Scan recent transactions on startup
    await this.scanRecentTransactions();

    // Poll periodically for new transactions
    this.pollInterval = setInterval(async () => {
      await this.checkNewTransactions();
    }, 60000); // Check every 60 seconds (Bitcoin blocks are ~10 minutes)

    console.log('Bitcoin monitor started ✅');
  }

  async scanRecentTransactions() {
    try {
      console.log('Scanning recent Bitcoin transactions...');
      // Implementation depends on your API provider
      // This is a placeholder structure
      for (const address of this.watchAddresses) {
        await this.checkAddressTransactions(address);
        await this.sleep(2000); // Delay between requests
      }
    } catch (error) {
      console.error('Error scanning recent Bitcoin transactions:', error.message);
    }
  }

  async checkNewTransactions() {
    try {
      for (const address of this.watchAddresses) {
        await this.checkAddressTransactions(address);
        await this.sleep(2000); // Delay between requests
      }
    } catch (error) {
      console.error('Error checking new Bitcoin transactions:', error.message);
    }
  }

  async checkAddressTransactions(address) {
    try {
      // This is a placeholder - implement based on your API provider
      // Example with BlockCypher API:
      // const response = await axios.get(`https://api.blockcypher.com/v1/btc/main/addrs/${address}`);
      
      // For now, log that we're checking
      console.log(`Checking Bitcoin address: ${address.substring(0, 20)}...`);
      
      // TODO: Implement actual API call based on your provider
      // The response should contain transaction history
      // Process each transaction and call this.onTransaction() for new ones
      
    } catch (error) {
      if (error.message && error.message.includes('429')) {
        console.log('⚠️  Bitcoin API rate limit. Backing off...');
        await this.sleep(10000);
      } else {
        console.error(`Error checking Bitcoin address ${address}:`, error.message);
      }
    }
  }

  async processTransaction(txData) {
    // txData should contain: txid, from, to, amount, confirmations
    const txid = txData.txid;
    
    // Skip if already processed
    if (this.processedTxids.has(txid)) {
      return;
    }

    const existing = await db.getTransaction(txid);
    if (existing && existing.processed) {
      this.processedTxids.add(txid);
      return;
    }

    // Only process transactions to our addresses
    const isToOurAddress = this.watchAddresses.includes(txData.to);
    if (!isToOurAddress) {
      return;
    }

    console.log(`\n📥 New Bitcoin transaction detected:`);
    console.log(`   TXID: ${txid}`);
    console.log(`   From: ${txData.from || 'Unknown'}`);
    console.log(`   To: ${txData.to}`);
    console.log(`   Amount: ${txData.amount} BTC`);

    // Save to database
    await db.saveTransaction(
      txid,
      'Bitcoin',
      txData.from || 'unknown',
      txData.to,
      txData.amount.toString()
    );

    // Trigger callback
    if (this.onTransaction) {
      await this.onTransaction({
        txHash: txid,
        chain: 'Bitcoin',
        from: txData.from || 'unknown',
        to: txData.to,
        amount: txData.amount.toString(),
      });
    }

    await db.markTransactionProcessed(txid);
    this.processedTxids.add(txid);
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  stop() {
    if (!this.enabled) return;
    
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }
    console.log('Bitcoin monitor stopped');
  }
}

export default BitcoinMonitor;

