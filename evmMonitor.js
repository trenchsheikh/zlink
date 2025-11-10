import { ethers } from 'ethers';
import { config } from './config.js';
import db from './database.js';

class EVMMonitor {
  constructor(chainConfig, onTransaction) {
    this.chainName = chainConfig.name || 'EVM';
    this.onTransaction = onTransaction;
    this.lastBlock = null;
    this.enabled = false;
    this.provider = null;
    this.watchAddress = null;
    
    // Rate limiting backoff
    this.rateLimitBackoff = 1000; // Start with 1 second
    this.maxBackoff = 30000; // Max 30 seconds

    // Validate configuration before initializing
    if (!chainConfig.rpcUrl || !chainConfig.walletAddress) {
      console.log(`⚠️  ${this.chainName} monitoring disabled: Missing configuration`);
      return;
    }

    // Validate EVM address format
    if (!this.isValidEVMAddress(chainConfig.walletAddress)) {
      console.log(`⚠️  ${this.chainName} monitoring disabled: Invalid wallet address format`);
      console.log(`   Expected: 0x followed by 40 hex characters`);
      console.log(`   Got: ${chainConfig.walletAddress}`);
      return;
    }

    try {
      this.provider = new ethers.JsonRpcProvider(chainConfig.rpcUrl);
      this.watchAddress = chainConfig.walletAddress.toLowerCase();
      this.enabled = true;
    } catch (error) {
      console.log(`⚠️  ${this.chainName} monitoring disabled: Invalid configuration`);
      console.log(`   Error: ${error.message}`);
    }
  }

  isValidEVMAddress(address) {
    // Check if it's a valid Ethereum address format
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  async start() {
    if (!this.enabled) {
      console.log(`${this.chainName} monitor: Skipped (not configured)`);
      return;
    }

    console.log(`Starting ${this.chainName} monitor for address: ${this.watchAddress}`);
    
    try {
      // Get current block number
      this.lastBlock = await this.provider.getBlockNumber();
      console.log(`${this.chainName} - Current block: ${this.lastBlock}`);

      // Listen for new blocks
      this.provider.on('block', async (blockNumber) => {
        try {
          // Longer delay to avoid rate limiting (increased from 500ms to 2000ms)
          await new Promise(resolve => setTimeout(resolve, 2000));
          await this.checkBlock(blockNumber);
        } catch (error) {
          // Handle rate limiting gracefully
          if (error.message?.includes('429') || error.message?.includes('rate limit') || error.message?.includes('compute units')) {
            console.warn(`${this.chainName} - Rate limited, backing off for ${this.rateLimitBackoff}ms`);
            await new Promise(resolve => setTimeout(resolve, this.rateLimitBackoff));
            this.rateLimitBackoff = Math.min(this.rateLimitBackoff * 2, this.maxBackoff);
          } else if (!error.message?.includes('BAD_DATA')) {
            console.error(`${this.chainName} - Error checking block:`, error.message);
          }
        }
      });

      // Scan fewer blocks on startup to avoid rate limits (reduced from 10 to 3)
      await this.scanRecentBlocks(3);
      
      console.log(`${this.chainName} monitor started successfully ✅`);
    } catch (error) {
      console.error(`❌ ${this.chainName} monitor error:`, error.message);
      console.log(`💡 Tip: Free RPCs can be unreliable. Consider using Alchemy or QuickNode for production.`);
    }
  }

  async scanRecentBlocks(count) {
    console.log(`${this.chainName} - Scanning last ${count} blocks...`);
    try {
      const currentBlock = await this.provider.getBlockNumber();
      
      for (let i = count - 1; i >= 0; i--) {
        const blockNumber = currentBlock - i;
        try {
          await this.checkBlock(blockNumber);
          // Longer delay to avoid rate limiting (increased from 200ms to 1000ms)
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          // Handle rate limiting during initial scan
          if (error.message?.includes('429') || error.message?.includes('rate limit') || error.message?.includes('compute units')) {
            console.warn(`${this.chainName} - Rate limited during scan, waiting ${this.rateLimitBackoff}ms...`);
            await new Promise(resolve => setTimeout(resolve, this.rateLimitBackoff));
            this.rateLimitBackoff = Math.min(this.rateLimitBackoff * 2, this.maxBackoff);
          } else if (!error.message?.includes('BAD_DATA')) {
            console.error(`${this.chainName} - Error scanning block ${blockNumber}:`, error.message);
          }
        }
      }
      console.log(`${this.chainName} - Initial scan complete`);
    } catch (error) {
      console.error(`${this.chainName} - Error during initial scan:`, error.message);
    }
  }

  async checkBlock(blockNumber) {
    try {
      // Get block with full transaction objects (true parameter)
      const block = await this.provider.getBlock(blockNumber, true);
      
      if (!block || !block.transactions) {
        return;
      }

      // Reset backoff on successful block fetch
      this.rateLimitBackoff = 1000;

      // Transaction objects are already included when getBlock(n, true) is used
      // No need to call getTransaction() for each one - this was causing 95% of API calls!
      for (const tx of block.transactions) {
        try {
          // tx is already a full transaction object, not just a hash
          if (!tx || !tx.to) continue;

          const toAddress = tx.to.toLowerCase();
          
          // Only process transactions to our monitored address
          if (toAddress === this.watchAddress) {
            await this.processTransaction(tx);
          }
        } catch (error) {
          // Handle rate limiting gracefully
          if (error.message?.includes('429') || error.message?.includes('rate limit') || error.message?.includes('compute units')) {
            console.warn(`${this.chainName} - Rate limited in tx processing, backing off...`);
            await new Promise(resolve => setTimeout(resolve, this.rateLimitBackoff));
            this.rateLimitBackoff = Math.min(this.rateLimitBackoff * 2, this.maxBackoff);
          } else if (!error.message?.includes('BAD_DATA') && !error.code?.includes('BAD_DATA')) {
            console.error(`${this.chainName} - Error processing transaction:`, error.message);
          }
        }
      }
    } catch (error) {
      // Handle rate limiting at block level
      if (error.message?.includes('429') || error.message?.includes('rate limit') || error.message?.includes('compute units')) {
        console.warn(`${this.chainName} - Rate limited fetching block, backing off for ${this.rateLimitBackoff}ms`);
        await new Promise(resolve => setTimeout(resolve, this.rateLimitBackoff));
        this.rateLimitBackoff = Math.min(this.rateLimitBackoff * 2, this.maxBackoff);
      } else {
        console.error(`${this.chainName} - Error checking block ${blockNumber}:`, error.message);
      }
    }
  }

  async processTransaction(tx) {
    const txHash = tx.hash;
    
    // Check if already processed
    const existing = db.getTransaction(txHash);
    if (existing && existing.processed) {
      return;
    }

    const fromAddress = tx.from;
    const toAddress = tx.to;
    const amount = ethers.formatEther(tx.value);

    console.log(`\n📥 New ${this.chainName} transaction detected:`);
    console.log(`   Hash: ${txHash}`);
    console.log(`   From: ${fromAddress}`);
    console.log(`   To: ${toAddress}`);
    console.log(`   Amount: ${amount}`);

    // Wait for confirmation (3 blocks)
    try {
      const receipt = await tx.wait(3);
      
      if (receipt.status === 1) {
        // Save to database
        db.saveTransaction(txHash, this.chainName, fromAddress, toAddress, amount);
        
        // Trigger callback
        if (this.onTransaction) {
          await this.onTransaction({
            txHash,
            chain: this.chainName,
            from: fromAddress,
            to: toAddress,
            amount,
          });
        }
        
        db.markTransactionProcessed(txHash);
      }
    } catch (error) {
      console.error('Error waiting for transaction confirmation:', error);
    }
  }

  stop() {
    if (!this.enabled) return;
    
    if (this.provider) {
      this.provider.removeAllListeners('block');
    }
    console.log(`${this.chainName} monitor stopped`);
  }
}

export default EVMMonitor;

