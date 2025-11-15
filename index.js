import { config, validateConfig } from './config.js';
import db from './database.js';
import ZlinkBot from './bot.js';
import EVMMonitor from './evmMonitor.js';
import SolanaMonitor from './solanaMonitor.js';
import WebServer from './webServer.js';

class ZlinkApp {
  constructor() {
    this.bot = null;
    this.baseMonitor = null;
    this.bnbMonitor = null;
    this.solanaMonitor = null;
    this.webServer = null;
  }

  async start() {
    console.log('🚀 Starting Zlink Bot...\n');

    try {
      // Validate configuration
      validateConfig();

      // Connect to MongoDB first
      console.log('📊 Connecting to MongoDB...');
      await db.connect();

      // Initialize Telegram bot
      this.bot = new ZlinkBot();
      this.bot.start();

      // Initialize transaction monitors
      this.baseMonitor = new EVMMonitor(config.base, this.handleTransaction.bind(this));
      this.bnbMonitor = new EVMMonitor(config.bnb, this.handleTransaction.bind(this));
      this.solanaMonitor = new SolanaMonitor(this.handleTransaction.bind(this));

      // Start monitors
      await this.baseMonitor.start();
      await this.bnbMonitor.start();
      await this.solanaMonitor.start();

      // Start web server
      this.webServer = new WebServer(3000);
      let webServerStatus = '✅ Running';
      try {
        this.webServer.start();
        // Give it a moment to detect port conflicts
        await new Promise(resolve => setTimeout(resolve, 100));
        if (this.webServer.server && this.webServer.server.listening) {
          webServerStatus = '✅ Running';
        } else {
          webServerStatus = '⚠️  Port in use';
        }
      } catch (error) {
        webServerStatus = '❌ Failed';
        console.log('⚠️  Web server could not start, but bot will continue...');
      }

      console.log('\n✅ All services started successfully!');
      console.log('\n📊 Status:');
      console.log(`   - Telegram Bot: ✅ Running`);
      console.log(`   - Base Monitor: ${this.baseMonitor.enabled ? '✅ Running' : '⚠️  Disabled'}`);
      console.log(`   - BNB Monitor: ${this.bnbMonitor.enabled ? '✅ Running' : '⚠️  Disabled'}`);
      console.log(`   - Solana Monitor: ${this.solanaMonitor.enabled ? '✅ Running' : '⚠️  Disabled'}`);
      console.log(`   - Web Server: ${webServerStatus}`);
      
      const anyEnabled = this.baseMonitor.enabled || this.bnbMonitor.enabled || this.solanaMonitor.enabled;
      if (anyEnabled) {
        console.log('\n💡 Bot is now monitoring transactions...\n');
      } else {
        console.log('\n⚠️  No blockchain monitors are active. Configure wallet addresses in .env\n');
      }
    } catch (error) {
      console.error('❌ Failed to start application:', error);
      process.exit(1);
    }
  }

  async handleTransaction(transaction) {
    console.log('\n🔔 Processing transaction:', transaction.txHash);

    // Here you would implement your logic to determine which user should receive the reward
    // For this example, we'll need to either:
    // 1. Have a mapping of wallet addresses to Telegram users
    // 2. Extract user information from the transaction memo/data
    // 3. Have users register their wallet addresses with the bot

    // Example: Let's say you have a way to get the user from the transaction
    // For now, this is a placeholder - you'll need to implement your own logic
    const userId = await this.getUserFromTransaction(transaction);
    const username = await this.getUsernameFromTransaction(transaction);

    if (userId && username) {
      // Notify the user about their reward
      await this.bot.notifyUser(userId, username, transaction);
    } else {
      console.log('⚠️  Could not determine recipient for transaction');
      // You might want to store this for later processing
    }
  }

  async getUserFromTransaction(transaction) {
    // Look up the sender's address in the database
    const user = await db.getUserByWallet(transaction.from);
    
    if (!user) {
      console.log(`⚠️  No user found for wallet address: ${transaction.from}`);
      console.log('   User needs to register with /register command');
      return null;
    }
    
    console.log(`✅ Found user @${user.telegram_username} for wallet ${transaction.from}`);
    return user.telegram_user_id;
  }

  async getUsernameFromTransaction(transaction) {
    // Look up the sender's address in the database
    const user = await db.getUserByWallet(transaction.from);
    return user?.telegram_username || null;
  }

  async stop() {
    console.log('\n🛑 Stopping Zlink Bot...');

    if (this.baseMonitor) {
      this.baseMonitor.stop();
    }

    if (this.bnbMonitor) {
      this.bnbMonitor.stop();
    }

    if (this.solanaMonitor) {
      this.solanaMonitor.stop();
    }

    if (this.bot) {
      this.bot.stop();
    }

    if (this.webServer) {
      this.webServer.stop();
    }

    await db.close();

    console.log('✅ All services stopped');
    process.exit(0);
  }
}

// Create and start the application
const app = new ZlinkApp();

// Handle graceful shutdown
process.on('SIGINT', () => app.stop());
process.on('SIGTERM', () => app.stop());

// Handle unhandled WebSocket errors (like 429 rate limits or unsupported methods)
process.on('unhandledRejection', (reason, promise) => {
  if (reason && typeof reason === 'object') {
    const errorMsg = reason.message || String(reason);
    const errorCode = reason.code || (reason.error?.code);
    
    // Handle rate limit errors
    if (errorMsg.includes('429') || errorMsg.includes('ws error') || errorMsg.includes('Unexpected server response: 429')) {
      console.log('⚠️  Solana WebSocket rate limit (429) detected. Polling will continue as fallback.');
      return; // Don't crash, just log
    }
    
    // Handle unsupported method errors (RPC doesn't support WebSocket subscriptions)
    if (errorCode === -32601 || 
        errorMsg.includes('accountSubscribe') || 
        errorMsg.includes('Method not found') ||
        errorMsg.includes('not found')) {
      // This is already handled in solanaMonitor.js, but catch it here too to prevent crashes
      return; // Don't crash, just ignore
    }
  }
  // For other unhandled rejections, log but don't crash
  console.error('Unhandled rejection:', reason);
});

// Start the application
app.start().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

