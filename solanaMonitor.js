import { Connection, PublicKey } from '@solana/web3.js';
import { config } from './config.js';
import db from './database.js';

class SolanaMonitor {
  constructor(onTransaction) {
    this.onTransaction = onTransaction;
    this.subscriptionId = null;
    this.processedSignatures = new Set();
    this.enabled = false;
    this.connection = null;
    this.watchAddress = null;

    // Validate configuration before initializing
    if (!config.solana.rpcUrl || !config.solana.walletAddress) {
      console.log('⚠️  Solana monitoring disabled: Missing configuration');
      return;
    }

    // Validate Solana address format (basic check)
    if (!this.isValidSolanaAddress(config.solana.walletAddress)) {
      console.log('⚠️  Solana monitoring disabled: Invalid wallet address format');
      console.log(`   Expected: Valid Solana address (base58, 32-44 characters)`);
      console.log(`   Got: ${config.solana.walletAddress}`);
      return;
    }

    try {
      this.connection = new Connection(config.solana.rpcUrl, 'confirmed');
      this.watchAddress = new PublicKey(config.solana.walletAddress);
      this.enabled = true;
    } catch (error) {
      console.log('⚠️  Solana monitoring disabled: Invalid configuration');
      console.log(`   Error: ${error.message}`);
    }
  }

  isValidSolanaAddress(address) {
    // Basic Solana address validation
    if (!address || typeof address !== 'string') return false;
    if (address.length < 32 || address.length > 44) return false;
    // Check for valid base58 characters
    const base58Regex = /^[1-9A-HJ-NP-Za-km-z]+$/;
    return base58Regex.test(address);
  }

  async start() {
    if (!this.enabled) {
      console.log('Solana monitor: Skipped (not configured)');
      return;
    }

    console.log(`Starting Solana monitor for address: ${this.watchAddress.toBase58()}`);
    console.log(`   RPC: ${config.solana.rpcUrl}`);
    console.log(`   Note: Free RPCs may have rate limits. 429 errors are handled gracefully.`);

    // Add delay before first request to avoid rate limits on startup
    await this.sleep(2000);

    // Scan recent transactions on startup
    await this.scanRecentTransactions(10);

    // Subscribe to account changes (WebSocket - doesn't count toward rate limit)
    // Note: Some RPC endpoints don't support WebSocket subscriptions
    try {
      this.subscriptionId = this.connection.onAccountChange(
        this.watchAddress,
        async (accountInfo, context) => {
          console.log('Account changed, checking for new transactions...');
          await this.checkNewTransactions();
        },
        'confirmed'
      );
      console.log('✅ WebSocket subscription active for Solana monitoring');
    } catch (error) {
      const errorMsg = error.message || String(error);
      const errorCode = error.code || (error.error?.code);
      
      // Check if RPC doesn't support WebSocket subscriptions
      if (errorCode === -32601 || 
          errorMsg.includes('accountSubscribe') || 
          errorMsg.includes('Method not found') ||
          errorMsg.includes('not found')) {
        console.log('⚠️  RPC endpoint does not support WebSocket subscriptions');
        console.log('   This is normal for HTTP-only RPC endpoints');
        console.log('   Will use polling only (checks every 30 seconds)');
        this.subscriptionId = null; // Ensure it's null so we don't try to remove it
      } else if (errorMsg.includes('429') || errorMsg.includes('rate limit')) {
        console.log('⚠️  WebSocket subscription failed due to rate limit');
        console.log('   Will retry in 60 seconds, polling will continue in the meantime');
        setTimeout(() => {
          this.retryWebSocketSubscription();
        }, 60000);
      } else {
        console.log('⚠️  WebSocket subscription failed, will rely on polling only');
        console.log(`   Error: ${errorMsg}`);
      }
    }
    
    // Note: WebSocket errors (like 429) may occur at a lower level
    // The polling fallback will ensure transactions are still detected
    // If you see frequent 429 errors, consider using a paid RPC endpoint

    // Poll periodically as backup (increased interval to avoid rate limits)
    this.pollInterval = setInterval(async () => {
      await this.checkNewTransactions();
    }, 30000); // Check every 30 seconds (reduced from 10s to avoid rate limits)
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async retryWebSocketSubscription() {
    if (!this.enabled || this.subscriptionId !== null) {
      return; // Already subscribed or disabled
    }

    try {
      console.log('🔄 Retrying Solana WebSocket subscription...');
      this.subscriptionId = this.connection.onAccountChange(
        this.watchAddress,
        async (accountInfo, context) => {
          console.log('Account changed, checking for new transactions...');
          await this.checkNewTransactions();
        },
        'confirmed'
      );
      console.log('✅ WebSocket subscription re-established');
    } catch (error) {
      const errorMsg = error.message || String(error);
      const errorCode = error.code || (error.error?.code);
      
      // If RPC doesn't support subscriptions, don't retry
      if (errorCode === -32601 || 
          errorMsg.includes('accountSubscribe') || 
          errorMsg.includes('Method not found')) {
        console.log('   RPC does not support WebSocket subscriptions. Using polling only.');
        return; // Don't retry if method is not supported
      }
      
      console.log(`⚠️  WebSocket retry failed: ${errorMsg}`);
      // Retry again in 2 minutes if it's a different error
      setTimeout(() => {
        this.retryWebSocketSubscription();
      }, 120000);
    }
  }

  async scanRecentTransactions(limit = 10) {
    try {
      console.log(`Scanning last ${limit} Solana transactions...`);
      
      const signatures = await this.connection.getSignaturesForAddress(
        this.watchAddress,
        { limit }
      );

      for (const signatureInfo of signatures.reverse()) {
        await this.processSignature(signatureInfo.signature);
        // Add delay between requests to avoid rate limits
        await this.sleep(1000);
      }
    } catch (error) {
      if (error.message && error.message.includes('429')) {
        console.log('⚠️  Solana RPC rate limit during startup scan. Will retry later...');
      } else {
        console.error('Error scanning recent transactions:', error.message || error);
      }
    }
  }

  async checkNewTransactions() {
    try {
      const signatures = await this.connection.getSignaturesForAddress(
        this.watchAddress,
        { limit: 5 }
      );

      for (const signatureInfo of signatures) {
        if (!this.processedSignatures.has(signatureInfo.signature)) {
          await this.processSignature(signatureInfo.signature);
          // Add small delay between processing signatures to avoid rate limits
          await this.sleep(500);
        }
      }
    } catch (error) {
      // Check if it's a rate limit error
      if (error.message && error.message.includes('429')) {
        console.log('⚠️  Solana RPC rate limit hit. Backing off...');
        // Wait longer before next request
        await this.sleep(5000);
      } else {
        console.error('Error checking new transactions:', error.message || error);
      }
    }
  }

  async processSignature(signature) {
    // Skip if already processed
    if (this.processedSignatures.has(signature)) {
      return;
    }

    const existing = await db.getTransaction(signature);
    if (existing && existing.processed) {
      this.processedSignatures.add(signature);
      return;
    }

    try {
      const tx = await this.connection.getParsedTransaction(signature, {
        maxSupportedTransactionVersion: 0,
      });

      if (!tx || !tx.meta || tx.meta.err) {
        return;
      }

      // Look for SOL transfers to our address
      const preBalances = tx.meta.preBalances;
      const postBalances = tx.meta.postBalances;
      const accountKeys = tx.transaction.message.accountKeys;

      // Find our account index
      let ourIndex = -1;
      for (let i = 0; i < accountKeys.length; i++) {
        const key = accountKeys[i].pubkey.toBase58();
        if (key === this.watchAddress.toBase58()) {
          ourIndex = i;
          break;
        }
      }

      if (ourIndex === -1) {
        return;
      }

      const balanceChange = postBalances[ourIndex] - preBalances[ourIndex];
      
      // Only process incoming transactions
      if (balanceChange <= 0) {
        return;
      }

      const amount = (balanceChange / 1e9).toString(); // Convert lamports to SOL
      
      // Find the sender (first account that lost balance)
      let fromAddress = 'unknown';
      for (let i = 0; i < preBalances.length; i++) {
        if (postBalances[i] < preBalances[i]) {
          fromAddress = accountKeys[i].pubkey.toBase58();
          break;
        }
      }

      console.log(`\n📥 New Solana transaction detected:`);
      console.log(`   Signature: ${signature}`);
      console.log(`   From: ${fromAddress}`);
      console.log(`   To: ${this.watchAddress.toBase58()}`);
      console.log(`   Amount: ${amount} SOL`);

      // Save to database
      await db.saveTransaction(
        signature,
        'Solana',
        fromAddress,
        this.watchAddress.toBase58(),
        amount
      );

      // Trigger callback
      if (this.onTransaction) {
        await this.onTransaction({
          txHash: signature,
          chain: 'Solana',
          from: fromAddress,
          to: this.watchAddress.toBase58(),
          amount,
        });
      }

      await db.markTransactionProcessed(signature);
      this.processedSignatures.add(signature);
    } catch (error) {
      if (error.message && error.message.includes('429')) {
        console.log(`⚠️  Rate limit while processing ${signature.substring(0, 8)}... Will retry later`);
        // Don't add to processed set so it can be retried
      } else {
        console.error(`Error processing signature ${signature}:`, error.message || error);
      }
    }
  }

  stop() {
    if (!this.enabled) return;
    
    if (this.subscriptionId !== null && this.connection) {
      try {
        this.connection.removeAccountChangeListener(this.subscriptionId);
      } catch (error) {
        // Ignore errors when removing listener (e.g., if subscription was never established)
        console.log('   Note: WebSocket subscription was not active');
      }
    }
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }
    console.log('Solana monitor stopped');
  }
}

export default SolanaMonitor;

