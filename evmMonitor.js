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
          // Add small delay to avoid rate limiting on free RPCs
          await new Promise(resolve => setTimeout(resolve, 500));
          await this.checkBlock(blockNumber);
        } catch (error) {
          // Only log non-BAD_DATA errors
          if (!error.message?.includes('BAD_DATA')) {
            console.error(`${this.chainName} - Error checking block:`, error.message);
          }
        }
      });

      // Also scan recent blocks on startup
      await this.scanRecentBlocks(10);
      
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
          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 200));
        } catch (error) {
          // Silently skip BAD_DATA errors during initial scan
          if (!error.message?.includes('BAD_DATA')) {
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
      const block = await this.provider.getBlock(blockNumber, true);
      
      if (!block || !block.transactions) {
        return;
      }

      for (const txHash of block.transactions) {
        try {
          const tx = typeof txHash === 'string' 
            ? await this.provider.getTransaction(txHash)
            : txHash;
          
          if (!tx || !tx.to) continue;

          const toAddress = tx.to.toLowerCase();
          
          // Check if transaction is to our monitored address
          if (toAddress === this.watchAddress) {
            await this.processTransaction(tx);
          }
        } catch (error) {
          // Silently skip transactions that fail to fetch (common with free RPCs)
          // Only log if it's not a BAD_DATA error
          if (!error.message?.includes('BAD_DATA') && !error.code?.includes('BAD_DATA')) {
            console.error(`${this.chainName} - Error processing transaction:`, error.message);
          }
        }
      }
    } catch (error) {
      console.error(`Error checking block ${blockNumber}:`, error.message);
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

