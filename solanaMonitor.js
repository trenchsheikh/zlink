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

    // Scan recent transactions on startup
    await this.scanRecentTransactions(10);

    // Subscribe to account changes
    this.subscriptionId = this.connection.onAccountChange(
      this.watchAddress,
      async (accountInfo, context) => {
        console.log('Account changed, checking for new transactions...');
        await this.checkNewTransactions();
      },
      'confirmed'
    );

    // Also poll periodically as backup
    this.pollInterval = setInterval(async () => {
      await this.checkNewTransactions();
    }, 10000); // Check every 10 seconds
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
      }
    } catch (error) {
      console.error('Error scanning recent transactions:', error);
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
        }
      }
    } catch (error) {
      console.error('Error checking new transactions:', error);
    }
  }

  async processSignature(signature) {
    // Skip if already processed
    if (this.processedSignatures.has(signature)) {
      return;
    }

    const existing = db.getTransaction(signature);
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
      db.saveTransaction(
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

      db.markTransactionProcessed(signature);
      this.processedSignatures.add(signature);
    } catch (error) {
      console.error(`Error processing signature ${signature}:`, error);
    }
  }

  stop() {
    if (!this.enabled) return;
    
    if (this.subscriptionId !== null) {
      this.connection.removeAccountChangeListener(this.subscriptionId);
    }
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }
    console.log('Solana monitor stopped');
  }
}

export default SolanaMonitor;

