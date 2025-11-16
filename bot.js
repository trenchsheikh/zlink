import TelegramBot from 'node-telegram-bot-api';
import { config } from './config.js';
import db from './database.js';
import magicLink from './magicLink.js';
import zcashService from './zcashService.js';
import priceService from './priceService.js';

class ZlinkBot {
  constructor() {
    this.bot = new TelegramBot(config.telegram.botToken, { 
      polling: {
        interval: 300,
        autoStart: true,
        params: {
          timeout: 10
        }
      }
    });
    this.connectionErrorCount = 0;
    this.lastConnectionErrorTime = 0;
    this.setupCommands();
    this.setupHandlers();
  }

  setupCommands() {
    // Set bot commands
    this.bot.setMyCommands([
      { command: 'start', description: 'Start the bot and see main menu' },
      { command: 'claim', description: 'Claim ZEC with a magic link code' },
      { command: 'howtoget', description: 'See where to send crypto to get ZEC' },
      { command: 'register', description: 'Register your sender wallet address' },
      { command: 'mywallets', description: 'View your registered sender wallets' },
      { command: 'setaddress', description: 'Set your ZEC receiving address' },
      { command: 'mystats', description: 'View your statistics' },
      { command: 'help', description: 'Show help information' },
    ]);
  }

  setupHandlers() {
    // Start command
    this.bot.onText(/\/start/, async (msg) => {
      const chatId = msg.chat.id;
      const userId = msg.from.id;
      const username = msg.from.username || 'Unknown';

      // Create or update user
      await db.createOrUpdateUser(userId, username);

      const welcomeMessage = `
🎉 *Welcome to Zlink!*

The easiest way to get Zcash! Send crypto and receive ZEC instantly via magic link.

*Supported Currencies:*
🔷 Base Network (ETH)
🟡 BNB Smart Chain (BNB)
🟣 Solana (SOL)
🟠 Bitcoin (BTC)

*How it works:*
1️⃣ Select your currency and get deposit address
2️⃣ Register your sender wallet address
3️⃣ Set your ZEC receiving address
4️⃣ Send crypto to our address
5️⃣ Receive your ZEC magic link instantly!

*Features:*
✨ Real-time conversion rates
💸 1% service fee (shown before claim)
⏱️ 4-5 minute processing time
🎁 Shareable magic links

Ready to get started? 👇
      `;

      const keyboard = {
        inline_keyboard: [
          [
            { text: '🚀 Get Started', callback_data: 'menu_getstarted' },
            { text: '💰 Get ZEC', callback_data: 'menu_howtoget' }
          ],
          [
            { text: '💼 My Wallets', callback_data: 'menu_mywallets' },
            { text: '📊 My Statistics', callback_data: 'menu_mystats' }
          ],
          [
            { text: '❓ Help', callback_data: 'menu_help' },
            { text: '⚙️ Settings', callback_data: 'menu_settings' }
          ]
        ]
      };

      await this.bot.sendMessage(chatId, welcomeMessage, { 
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });
    });

    // How to get ZEC command
    this.bot.onText(/\/howtoget/, async (msg) => {
      const chatId = msg.chat.id;
      await this.showHowToGet(chatId);
    });

    // Claim command
    this.bot.onText(/\/claim(.*)/, async (msg, match) => {
      const chatId = msg.chat.id;
      const userId = msg.from.id;
      const username = msg.from.username || 'Unknown';
      const args = match[1]?.trim().split(/\s+/);

      // If no arguments, show instructions
      if (!args || args.length === 0 || !args[0]) {
        const keyboard = {
          inline_keyboard: [
            [
              { text: '💰 Get ZEC', callback_data: 'menu_howtoget' },
              { text: '❓ Help', callback_data: 'menu_help' }
            ],
            [
              { text: '🏠 Main Menu', callback_data: 'menu_main' }
            ]
          ]
        };

        await this.bot.sendMessage(
          chatId,
          `🎁 *Claim Your ZEC*\n\n*Usage:*\n\`/claim <code> <zcash_address>\`\n\n*Example:*\n\`/claim abc123-def456 t1YourZcashAddress\`\n\nYou can also just paste the full magic link URL:\n\`/claim https://domain.com/claim/abc123 t1YourAddress\`\n\n*Note:* Magic links can be shared! Anyone can claim if they have the code.`,
          { parse_mode: 'Markdown', reply_markup: keyboard }
        );
        return;
      }

      // Parse arguments
      const linkCodeOrUrl = args[0];
      const zcashAddress = args[1];

      if (!zcashAddress) {
        await this.bot.sendMessage(
          chatId,
          `❌ Please provide your Zcash address.\n\n*Usage:*\n\`/claim ${linkCodeOrUrl} t1YourZcashAddress\``,
          { parse_mode: 'Markdown' }
        );
        return;
      }

      // Validate Zcash address
      if (!zcashService.isValidAddress(zcashAddress)) {
        await this.bot.sendMessage(
          chatId,
          '❌ Invalid Zcash address format.\n\nSupported formats:\n• t1... (transparent)\n• t3... (transparent testnet)\n• zs... (shielded sapling)\n• zc... (shielded sprout)\n• u1... or u2... (unified address)',
          { parse_mode: 'Markdown' }
        );
        return;
      }

      // Extract link code from URL if needed
      const linkCode = magicLink.extractLinkCode(linkCodeOrUrl);

      if (!linkCode) {
        await this.bot.sendMessage(chatId, '❌ Invalid magic link code format.');
        return;
      }

      // Show processing message
      const processingMsg = await this.bot.sendMessage(chatId, '⏳ Processing your claim...');

      try {
        // Attempt to claim (with sharing enabled)
        const result = await magicLink.claimLink(linkCode, userId, username, zcashAddress, true);

        // Delete processing message
        await this.bot.deleteMessage(chatId, processingMsg.message_id);

        if (result.success) {
          const keyboard = {
            inline_keyboard: [
              [
                { text: '📊 View My Stats', callback_data: 'menu_mystats' }
              ],
              [
                { text: '💰 Get More ZEC', callback_data: 'menu_howtoget' },
                { text: '🏠 Main Menu', callback_data: 'menu_main' }
              ]
            ]
          };

          let message;
          if (result.processing) {
            // Show processing message with fee breakdown
            const originalAmount = result.originalAmount || 'N/A';
            const originalCoin = result.originalCoin || '';
            const amountUsd = result.amountUsd || 'N/A';
            const feeAmount = result.feeAmount || 'N/A';
            
            message = `
✅ *Claim Submitted Successfully!*

💰 *You will receive:* ${result.amount} ZEC
💵 *Original amount:* ${originalAmount} ${originalCoin} ($${amountUsd} USD)
💸 *Service fee (1%):* $${feeAmount} USD
📍 *Sending to:* \`${result.zcashAddress}\`
${result.originalRecipient ? `🎁 *Originally for:* @${result.originalRecipient}\n` : ''}
⏳ *Processing Time:* 4-5 minutes

Your transaction is being processed. You will receive the Zcash in your wallet within 4-5 minutes.

We'll notify you once the transaction is complete! 🚀
            `;
          } else {
            // Legacy immediate send message (kept for backwards compatibility)
            message = `
✅ *Claim Successful!*

💰 Amount: ${result.amount} ZEC
📍 Sent to: \`${result.zcashAddress}\`
🔗 Transaction: \`${result.txid}\`
${result.originalRecipient ? `\n🎁 Originally for: @${result.originalRecipient}` : ''}

Your Zcash has been sent! Check your wallet in a few minutes.
            `;
          }

          await this.bot.sendMessage(chatId, message, {
            parse_mode: 'Markdown',
            reply_markup: keyboard
          });
        } else {
          const keyboard = {
            inline_keyboard: [
              [
                { text: '💰 Get ZEC', callback_data: 'menu_howtoget' },
                { text: '❓ Help', callback_data: 'menu_help' }
              ]
            ]
          };

          await this.bot.sendMessage(
            chatId,
            `❌ *Claim Failed*\n\n${result.error}`,
            { parse_mode: 'Markdown', reply_markup: keyboard }
          );
        }
      } catch (error) {
        console.error('Error processing claim:', error);
        await this.bot.deleteMessage(chatId, processingMsg.message_id);
        await this.bot.sendMessage(
          chatId,
          '❌ An error occurred while processing your claim. Please try again later.'
        );
      }
    });

    // Register wallet command
    this.bot.onText(/\/register(.*)/, async (msg, match) => {
      const chatId = msg.chat.id;
      const userId = msg.from.id;
      const username = msg.from.username || 'Unknown';
      const walletAddress = match[1]?.trim();

      if (!walletAddress) {
        await this.bot.sendMessage(
          chatId,
          '❌ Please provide your wallet address.\n\n*Usage:*\n`/register 0xYourAddress` (for Base/BNB)\n`/register YourSolanaAddress` (for Solana)\n`/register bc1...` (for Bitcoin)\n\nThis helps us identify you when you send crypto to receive ZEC.',
          { parse_mode: 'Markdown' }
        );
        return;
      }

      // Basic validation
      const isEVM = /^0x[a-fA-F0-9]{40}$/.test(walletAddress);
      const isSolana = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(walletAddress);
      const isBitcoin = /^(bc1|1|3)[a-zA-Z0-9]{25,62}$/.test(walletAddress);

      if (!isEVM && !isSolana && !isBitcoin) {
        await this.bot.sendMessage(
          chatId,
          '❌ Invalid wallet address format.\n\nSupported formats:\n• Base/BNB: 0x... (42 characters)\n• Solana: base58 address (32-44 characters)\n• Bitcoin: bc1..., 1..., or 3... (25-62 characters)',
          { parse_mode: 'Markdown' }
        );
        return;
      }

      try {
        // Save wallet mapping
        await db.saveUserWallet(userId, username, walletAddress);

        let chain = 'Unknown';
        if (isEVM) chain = 'Base/BNB';
        else if (isSolana) chain = 'Solana';
        else if (isBitcoin) chain = 'Bitcoin';
      const keyboard = {
        inline_keyboard: [
          [
            { text: '💰 How to Get ZEC', callback_data: 'menu_howtoget' },
            { text: '💼 My Wallets', callback_data: 'menu_mywallets' }
          ],
          [
            { text: '⚙️ Set ZEC Address', callback_data: 'menu_setaddress' },
            { text: '🏠 Main Menu', callback_data: 'menu_main' }
          ]
        ]
      };

      await this.bot.sendMessage(
        chatId,
        `✅ *Wallet Registered Successfully!*\n\n*Your Address:* \`${walletAddress}\`\n*Chain:* ${chain}\n\n✨ You're all set! When you send crypto from this wallet to our addresses, you'll instantly receive ZEC via magic link.\n\nReady to get ZEC? Check where to send! 👇`,
        { parse_mode: 'Markdown', reply_markup: keyboard }
      );
      } catch (error) {
        console.error('Error registering wallet:', error);
        await this.bot.sendMessage(
          chatId,
          '❌ Failed to register wallet. It may already be registered to another user.',
          { parse_mode: 'Markdown' }
        );
      }
    });

    // My wallets command
    this.bot.onText(/\/mywallets/, async (msg) => {
      const chatId = msg.chat.id;
      const userId = msg.from.id;

      try {
        const wallets = await db.getUserWallets(userId);

        if (!wallets || wallets.length === 0) {
          await this.bot.sendMessage(
            chatId,
            '❌ You haven\'t registered any wallets yet.\n\nUse `/register 0xYourAddress` to register a wallet.',
            { parse_mode: 'Markdown' }
          );
          return;
        }

        let message = '💼 *Your Registered Wallets:*\n\n';
        wallets.forEach((wallet, index) => {
          const date = new Date(wallet.created_at).toLocaleDateString();
          const shortAddr = wallet.wallet_address.length > 20 
            ? wallet.wallet_address.substring(0, 10) + '...' + wallet.wallet_address.substring(wallet.wallet_address.length - 8)
            : wallet.wallet_address;
          message += `${index + 1}. \`${shortAddr}\`\n   📅 ${date}\n\n`;
        });
        message += '✅ Send crypto from these wallets to get ZEC!';

        const keyboard = {
          inline_keyboard: [
            [
              { text: '➕ Register Another Wallet', callback_data: 'menu_register' }
            ],
            [
              { text: '💰 Set ZEC Address', callback_data: 'menu_setaddress' },
              { text: '🏠 Main Menu', callback_data: 'menu_main' }
            ]
          ]
        };

        await this.bot.sendMessage(chatId, message, { 
          parse_mode: 'Markdown',
          reply_markup: keyboard
        });
      } catch (error) {
        console.error('Error fetching wallets:', error);
        await this.bot.sendMessage(chatId, '❌ Failed to retrieve wallets. Please try again later.');
      }
    });

    // Help command
    this.bot.onText(/\/help/, async (msg) => {
      const chatId = msg.chat.id;
      await this.showHelp(chatId);
    });

    // Set address command
    this.bot.onText(/\/setaddress(.*)/, async (msg, match) => {
      const chatId = msg.chat.id;
      const userId = msg.from.id;
      const username = msg.from.username || 'Unknown';
      const address = match[1]?.trim();

      if (!address) {
        await this.bot.sendMessage(
          chatId,
          '❌ Please provide a Zcash address.\n\nUsage: `/setaddress t1YourZcashAddress`',
          { parse_mode: 'Markdown' }
        );
        return;
      }

      // Validate address
      if (!zcashService.isValidAddress(address)) {
        await this.bot.sendMessage(
          chatId,
          '❌ Invalid Zcash address format.\n\nSupported formats:\n• t1... (transparent)\n• t3... (transparent testnet)\n• zs... (shielded sapling)\n• zc... (shielded sprout)\n• u1... or u2... (unified address)',
          { parse_mode: 'Markdown' }
        );
        return;
      }

      // Save address
      await db.createOrUpdateUser(userId, username, address);
      await db.updateUserZcashAddress(userId, address);

      const keyboard = {
        inline_keyboard: [
          [
            { text: '📊 View My Stats', callback_data: 'menu_mystats' },
            { text: '💼 My Wallets', callback_data: 'menu_mywallets' }
          ],
          [
            { text: '🏠 Main Menu', callback_data: 'menu_main' }
          ]
        ]
      };

      await this.bot.sendMessage(
        chatId,
        `✅ *Zcash Address Saved!*\n\n\`${address}\`\n\nYou can now claim magic links sent to you.`,
        { parse_mode: 'Markdown', reply_markup: keyboard }
      );
    });

    // My address command
    this.bot.onText(/\/myaddress/, async (msg) => {
      const chatId = msg.chat.id;
      const userId = msg.from.id;

      const user = await db.getUser(userId);

      if (!user || !user.zcash_address) {
        await this.bot.sendMessage(
          chatId,
          '❌ You haven\'t set a Zcash address yet.\n\nUse `/setaddress t1YourZcashAddress` to set one.',
          { parse_mode: 'Markdown' }
        );
        return;
      }

      const keyboard = {
        inline_keyboard: [
          [
            { text: '✏️ Update Address', callback_data: 'menu_setaddress' }
          ],
          [
            { text: '📊 My Stats', callback_data: 'menu_mystats' },
            { text: '🏠 Main Menu', callback_data: 'menu_main' }
          ]
        ]
      };

      await this.bot.sendMessage(
        chatId,
        `💼 *Your Zcash Address:*\n\n\`${user.zcash_address}\``,
        { parse_mode: 'Markdown', reply_markup: keyboard }
      );
    });

    // My stats command
    this.bot.onText(/\/mystats/, async (msg) => {
      const chatId = msg.chat.id;
      const userId = msg.from.id;

      const user = await db.getUser(userId);

      if (!user) {
        await this.bot.sendMessage(chatId, '❌ No statistics available. Use /start to register.');
        return;
      }

      const wallets = await db.getUserWallets(userId);
      const walletCount = wallets?.length || 0;

      const statsMessage = `
📊 *Your Statistics*

👤 Username: @${user.telegram_username || 'Unknown'}
💰 Total Received: ${user.total_received} ZEC
📅 Member Since: ${new Date(user.created_at).toLocaleDateString()}
💼 ZEC Address: ${user.zcash_address ? '✅ Set' : '❌ Not set'}
🔗 Registered Wallets: ${walletCount}
      `;

      const keyboard = {
        inline_keyboard: [
          [
            { text: '💼 View My Wallets', callback_data: 'menu_mywallets' },
            { text: user.zcash_address ? '✏️ Update ZEC Address' : '💰 Set ZEC Address', callback_data: 'menu_setaddress' }
          ],
          [
            { text: '📝 Register Wallet', callback_data: 'menu_register' },
            { text: '🏠 Main Menu', callback_data: 'menu_main' }
          ]
        ]
      };

      await this.bot.sendMessage(chatId, statsMessage, { 
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });
    });

    // Balance command
    this.bot.onText(/\/balance/, async (msg) => {
      const chatId = msg.chat.id;

      try {
        const balance = await zcashService.getBalance();
        
        const keyboard = {
          inline_keyboard: [
            [
              { text: '📊 My Stats', callback_data: 'menu_mystats' },
              { text: '🏠 Main Menu', callback_data: 'menu_main' }
            ]
          ]
        };

        await this.bot.sendMessage(
          chatId,
          `💰 *Bot Zcash Balance:*\n\n${balance} ZEC\n\nThis is the amount available for distributing rewards.`,
          { parse_mode: 'Markdown', reply_markup: keyboard }
        );
      } catch (error) {
        await this.bot.sendMessage(chatId, '❌ Failed to retrieve balance. Please try again later.');
      }
    });

    // Handle text messages for admin code detection
    this.bot.on('text', async (msg) => {
      // Skip if it's a command (already handled by command handlers)
      if (msg.text && msg.text.startsWith('/')) {
        return;
      }

      const chatId = msg.chat.id;
      const userId = msg.from.id;
      const text = msg.text?.trim();

      // Check for admin activation code
      if (text === '1020304') {
        // Activate admin session
        await db.createAdminSession(userId, 24);
        
        // Delete the message containing the code for security
        try {
          await this.bot.deleteMessage(chatId, msg.message_id);
        } catch (error) {
          console.log('Could not delete admin code message');
        }

        await this.showAdminPanel(chatId, userId);
        return;
      }

      // Check if user is in admin session
      const isAdmin = await db.isAdminSession(userId);
      if (isAdmin) {
        // Check if admin is in input state (waiting for input)
        const inputState = await db.getAdminInputState(userId);
        if (inputState && inputState.state) {
          // Handle admin input based on state
          if (inputState.state.startsWith('approve_')) {
            const claimId = inputState.state.replace('approve_', '');
            const stateData = JSON.parse(inputState.data || '{}');
            const storedMessageId = stateData.messageId;
            await this.handleAdminApproveConfirm(chatId, userId, claimId, text, storedMessageId);
            return;
          } else if (inputState.state.startsWith('reject_reason_')) {
            const claimId = inputState.state.replace('reject_reason_', '');
            const stateData = JSON.parse(inputState.data || '{}');
            const storedMessageId = stateData.messageId;
            await this.handleAdminRejectReason(chatId, userId, claimId, text, storedMessageId);
            return;
          } else if (inputState.state.startsWith('reject_refund_')) {
            const claimId = inputState.state.replace('reject_refund_', '');
            const stateData = JSON.parse(inputState.data || '{}');
            const storedMessageId = stateData.messageId;
            const rejectionReason = stateData.rejectionReason;
            await this.handleAdminRejectConfirm(chatId, userId, claimId, rejectionReason, text, storedMessageId);
            return;
          }
        }
        // Any other message in admin mode keeps showing admin interface
        // (This allows admins to refresh the view)
        return;
      }
    });

    // Handle callback queries (for inline buttons)
    this.bot.on('callback_query', async (query) => {
      try {
        await this.handleCallbackQuery(query);
      } catch (error) {
        console.error('Error handling callback query:', error.message || error);
        
        // Try to answer callback, but ignore if it fails (query might be too old)
        try {
          await this.bot.answerCallbackQuery(query.id, {
            text: '❌ An error occurred. Please try again.',
            show_alert: true
          });
        } catch (answerError) {
          // Silently ignore "query too old" or connection errors
          if (answerError.message && 
              !answerError.message.includes('query is too old') && 
              !answerError.message.includes('ECONNRESET')) {
            console.error('Could not answer callback:', answerError.message);
          }
        }
      }
    });

    // Error handling
    this.bot.on('polling_error', async (error) => {
      // Check for 409 Conflict - multiple bot instances running
      if (error.code === 'ETELEGRAM' && error.response?.statusCode === 409) {
        console.log('\n❌ CRITICAL ERROR: Another bot instance is already running!');
        console.log('   Possible causes:');
        console.log('   1. Bot is running locally AND on Render');
        console.log('   2. Multiple Render deployments are active');
        console.log('   3. Previous instance didn\'t shut down properly');
        console.log('\n🛑 Shutting down this instance to prevent conflicts...\n');
        
        try {
          await this.bot.stopPolling();
        } catch (e) {
          console.error('Error stopping bot:', e);
        }
        process.exit(1);
      } else if (error.message && error.message.includes('409')) {
        // Fallback check for 409 in message
        console.log('\n❌ Bot conflict detected (409) - shutting down...\n');
        try {
          await this.bot.stopPolling();
        } catch (e) {
          console.error('Error stopping bot:', e);
        }
        process.exit(1);
      }
      // Silently ignore common network hiccups - they're normal and auto-recover
      else if (error.code === 'EFATAL' || error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
        // Only log if multiple errors occur within 30 seconds (indicates real issue)
        const now = Date.now();
        if (now - this.lastConnectionErrorTime < 30000) {
          this.connectionErrorCount++;
          if (this.connectionErrorCount === 3) {
            console.log('⚠️  Telegram connection unstable (multiple retries in progress...)');
          }
        } else {
          // Reset counter if errors are spaced out (normal)
          this.connectionErrorCount = 1;
        }
        this.lastConnectionErrorTime = now;
        return; // Don't log individual network hiccups
      } else if (error.message && error.message.includes('query is too old')) {
        // Silently ignore "query too old" errors
        return;
      } else {
        // Log unexpected errors
        console.error('Telegram polling error:', error.message || error);
      }
    });
  }

  async handleCallbackQuery(query) {
    const chatId = query.message.chat.id;
    const messageId = query.message.message_id;
    const userId = query.from.id;
    const username = query.from.username || 'Unknown';
    const data = query.data;

    // Answer the callback query first
    await this.bot.answerCallbackQuery(query.id);

    // Check if admin is handling admin callbacks
    const isAdmin = await db.isAdminSession(userId);
    
    // Handle admin actions
    if (isAdmin && data.startsWith('admin_')) {
      if (data === 'admin_refresh') {
        await this.showAdminPanel(chatId, userId, messageId);
        return;
      }
      
      if (data === 'admin_exit') {
        await db.clearAdminSession(userId);
        await this.bot.editMessageText('👋 Exited admin mode', {
          chat_id: chatId,
          message_id: messageId,
        });
        // Show normal menu
        await this.showMainMenu(chatId);
        return;
      }

      if (data.startsWith('admin_approve_')) {
        const claimId = data.replace('admin_approve_', '');
        await this.handleAdminApprove(chatId, userId, claimId, messageId);
        return;
      }

      if (data.startsWith('admin_reject_')) {
        const claimId = data.replace('admin_reject_', '');
        await this.handleAdminReject(chatId, userId, claimId, messageId);
        return;
      }

      if (data.startsWith('admin_view_')) {
        const claimId = data.replace('admin_view_', '');
        // Clear any input state when viewing claim details (cancel action)
        await db.clearAdminInputState(userId);
        await this.showClaimDetails(chatId, claimId, messageId);
        return;
      }

      return;
    }

    // Handle different menu actions
    switch(data) {
      case 'menu_main':
        await this.showMainMenu(chatId, messageId);
        break;

      case 'menu_getstarted':
        await this.showGetStarted(chatId);
        break;

      case 'menu_howtoget':
        await this.showHowToGet(chatId);
        break;

      case 'menu_register':
        await this.showRegisterPrompt(chatId);
        break;

      case 'menu_mywallets':
        await this.showMyWallets(chatId, userId);
        break;

      case 'menu_setaddress':
      case 'menu_settings':
        await this.showSetAddressPrompt(chatId);
        break;

      case 'menu_myaddress':
        await this.showMyAddress(chatId, userId);
        break;

      case 'menu_mystats':
        await this.showMyStats(chatId, userId, username);
        break;

      case 'menu_balance':
        await this.showBalance(chatId);
        break;

      case 'menu_help':
        await this.showHelp(chatId);
        break;

      case 'menu_howto_claim':
        await this.showHowToClaim(chatId);
        break;

      case 'currency_base':
        await this.showCurrencyDeposit(chatId, 'base');
        break;

      case 'currency_bnb':
        await this.showCurrencyDeposit(chatId, 'bnb');
        break;

      case 'currency_solana':
        await this.showCurrencyDeposit(chatId, 'solana');
        break;

      case 'currency_bitcoin':
        await this.showCurrencyDeposit(chatId, 'bitcoin');
        break;

      default:
        console.log('Unknown callback data:', data);
    }
  }

  async showMainMenu(chatId, messageId = null) {
    const message = `
🏠 *Main Menu*

Choose an option below:
    `;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '🚀 Get Started', callback_data: 'menu_getstarted' },
          { text: '💰 Get ZEC', callback_data: 'menu_howtoget' }
        ],
        [
          { text: '💼 My Wallets', callback_data: 'menu_mywallets' },
          { text: '📊 My Statistics', callback_data: 'menu_mystats' }
        ],
        [
          { text: '❓ Help', callback_data: 'menu_help' },
          { text: '⚙️ Settings', callback_data: 'menu_settings' }
        ]
      ]
    };

    if (messageId) {
      await this.bot.editMessageText(message, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });
    } else {
      await this.bot.sendMessage(chatId, message, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });
    }
  }

  async showGetStarted(chatId) {
    const message = `
🚀 *Get Started with Zlink*

Follow these simple steps:

*Step 1: Select Your Currency*
Click "💰 Get ZEC" to choose from:
🔷 Base Network (ETH)
🟡 BNB Smart Chain (BNB)
🟣 Solana (SOL)
🟠 Bitcoin (BTC)

*Step 2: Register Your Wallet*
Use \`/register <your_wallet_address>\` to register your sender wallet.

*Step 3: Set Your ZEC Address*
Use \`/setaddress <your_zcash_address>\` to set where you want to receive ZEC.

*Step 4: Send Crypto*
Send crypto to the address shown for your selected currency.

*Step 5: Claim Your ZEC*
Receive a magic link and claim your ZEC via Telegram!

*Features:*
✨ Real-time conversion rates
💸 1% service fee (shown before claim)
⏱️ 4-5 minute processing time

That's it! Super simple. 🎉
    `;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '💰 Get ZEC Now', callback_data: 'menu_howtoget' }
        ],
        [
          { text: '💼 My Wallets', callback_data: 'menu_mywallets' },
          { text: '⚙️ Settings', callback_data: 'menu_settings' }
        ],
        [
          { text: '🏠 Main Menu', callback_data: 'menu_main' }
        ]
      ]
    };

    await this.bot.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });
  }

  async showHowToGet(chatId) {
    const message = `
💰 *How to Get ZEC*

Select a cryptocurrency to see deposit instructions:

*Supported Currencies:*
🔷 Base Network (ETH)
🟡 BNB Smart Chain (BNB)
🟣 Solana (SOL)
🟠 Bitcoin (BTC)

*How it works:*
1️⃣ Select your currency below
2️⃣ Send crypto to the provided address
3️⃣ Receive your ZEC magic link instantly!
4️⃣ Claim your Zcash via Telegram

*Service Fee:* 1% (shown before you claim)
*Processing Time:* 4-5 minutes after claiming
    `;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '🔷 Base (ETH)', callback_data: 'currency_base' },
          { text: '🟡 BNB Chain', callback_data: 'currency_bnb' }
        ],
        [
          { text: '🟣 Solana (SOL)', callback_data: 'currency_solana' },
          { text: '🟠 Bitcoin (BTC)', callback_data: 'currency_bitcoin' }
        ],
        [
          { text: '📝 Register Wallet', callback_data: 'menu_getstarted' },
          { text: '⚙️ Set ZEC Address', callback_data: 'menu_setaddress' }
        ],
        [
          { text: '❓ Help', callback_data: 'menu_help' },
          { text: '🏠 Main Menu', callback_data: 'menu_main' }
        ]
      ]
    };

    await this.bot.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });
  }

  async showCurrencyDeposit(chatId, currency) {
    let message = '';
    let address = '';
    let currencyName = '';
    let currencySymbol = '';
    let chainName = '';

    switch(currency) {
      case 'base':
        currencyName = 'Base Network';
        currencySymbol = 'ETH';
        chainName = 'Base';
        address = config.base.walletAddress || 'Not configured';
        message = `
🔷 *${currencyName} (${currencySymbol})*

*Deposit Address:*
\`${address}\`

*Instructions:*
1️⃣ Copy the address above
2️⃣ Send ${currencySymbol} from your Base wallet
3️⃣ Wait for transaction confirmation
4️⃣ Receive your ZEC magic link instantly!

*Important:*
• Only send ${currencySymbol} (not tokens)
• Send from a registered wallet (use /register)
• Minimum: Any amount accepted
• Fee: 1% service fee (shown before claim)

*Network Details:*
• Network: Base Mainnet
• Chain ID: 8453
• RPC: ${config.base.rpcUrl || 'Default'}
        `;
        break;

      case 'bnb':
        currencyName = 'BNB Smart Chain';
        currencySymbol = 'BNB';
        chainName = 'BNB Smart Chain';
        address = config.bnb.walletAddress || 'Not configured';
        message = `
🟡 *${currencyName} (${currencySymbol})*

*Deposit Address:*
\`${address}\`

*Instructions:*
1️⃣ Copy the address above
2️⃣ Send ${currencySymbol} from your BNB wallet
3️⃣ Wait for transaction confirmation
4️⃣ Receive your ZEC magic link instantly!

*Important:*
• Only send ${currencySymbol} (not tokens)
• Send from a registered wallet (use /register)
• Minimum: Any amount accepted
• Fee: 1% service fee (shown before claim)

*Network Details:*
• Network: BNB Smart Chain Mainnet
• Chain ID: 56
• RPC: ${config.bnb.rpcUrl || 'Default'}
        `;
        break;

      case 'solana':
        currencyName = 'Solana';
        currencySymbol = 'SOL';
        chainName = 'Solana';
        address = config.solana.walletAddress || 'Not configured';
        message = `
🟣 *${currencyName} (${currencySymbol})*

*Deposit Address:*
\`${address}\`

*Instructions:*
1️⃣ Copy the address above
2️⃣ Send ${currencySymbol} from your Solana wallet
3️⃣ Wait for transaction confirmation
4️⃣ Receive your ZEC magic link instantly!

*Important:*
• Only send ${currencySymbol} (not tokens)
• Send from a registered wallet (use /register)
• Minimum: Any amount accepted
• Fee: 1% service fee (shown before claim)

*Network Details:*
• Network: Solana Mainnet
• RPC: ${config.solana.rpcUrl || 'Default'}
        `;
        break;

      case 'bitcoin':
        currencyName = 'Bitcoin';
        currencySymbol = 'BTC';
        chainName = 'Bitcoin';
        const taprootAddress = config.bitcoin.taprootAddress || 'Not configured';
        const nativeSegwitAddress = config.bitcoin.nativeSegwitAddress || 'Not configured';
        message = `
🟠 *${currencyName} (${currencySymbol})*

*Deposit Addresses:*

*Taproot (Recommended):*
\`${taprootAddress}\`

*Native Segwit:*
\`${nativeSegwitAddress}\`

*Instructions:*
1️⃣ Copy either address above (Taproot recommended)
2️⃣ Send ${currencySymbol} from your Bitcoin wallet
3️⃣ Wait for transaction confirmation (1-3 blocks)
4️⃣ Receive your ZEC magic link instantly!

*Important:*
• You can use either address type
• Send from a registered wallet (use /register)
• Minimum: Any amount accepted
• Fee: 1% service fee (shown before claim)
• Network fees apply (paid by you)

*Network Details:*
• Network: Bitcoin Mainnet
• Confirmations: 1-3 blocks recommended
        `;
        break;

      default:
        await this.showHowToGet(chatId);
        return;
    }

    const keyboard = {
      inline_keyboard: [
        [
          { text: '🔷 Base', callback_data: 'currency_base' },
          { text: '🟡 BNB', callback_data: 'currency_bnb' }
        ],
        [
          { text: '🟣 Solana', callback_data: 'currency_solana' },
          { text: '🟠 Bitcoin', callback_data: 'currency_bitcoin' }
        ],
        [
          { text: '📝 Register Wallet', callback_data: 'menu_getstarted' },
          { text: '⚙️ Set ZEC Address', callback_data: 'menu_setaddress' }
        ],
        [
          { text: '🔙 Back to Currencies', callback_data: 'menu_howtoget' },
          { text: '🏠 Main Menu', callback_data: 'menu_main' }
        ]
      ]
    };

    await this.bot.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });
  }

  async showRegisterPrompt(chatId) {
    const message = `
📝 *Register Your Sender Wallet*

Register your sender wallet so we can identify you when you send crypto.

*For Base Network or BNB Smart Chain:*
\`/register 0xYourWalletAddress\`

*For Solana:*
\`/register YourSolanaAddress\`

Send the command with your actual wallet address.

*Note:* You can use the same 0x address for both Base and BNB!
    `;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '💼 My Wallets', callback_data: 'menu_mywallets' }
        ],
        [
          { text: '❓ Help', callback_data: 'menu_help' },
          { text: '🏠 Main Menu', callback_data: 'menu_main' }
        ]
      ]
    };

    await this.bot.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });
  }

  async showMyWallets(chatId, userId) {
    const wallets = await db.getUserWallets(userId);

    if (!wallets || wallets.length === 0) {
      const message = `
💼 *Your Registered Wallets*

You haven't registered any wallets yet.

Register a wallet to start getting ZEC!
      `;

      const keyboard = {
        inline_keyboard: [
          [
            { text: '📝 Register Wallet', callback_data: 'menu_register' }
          ],
          [
            { text: '❓ Help', callback_data: 'menu_help' },
            { text: '🏠 Main Menu', callback_data: 'menu_main' }
          ]
        ]
      };

      await this.bot.sendMessage(chatId, message, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });
      return;
    }

    let message = '💼 *Your Registered Wallets:*\n\n';
    wallets.forEach((wallet, index) => {
      const date = new Date(wallet.created_at).toLocaleDateString();
      const shortAddr = wallet.wallet_address.length > 20 
        ? wallet.wallet_address.substring(0, 10) + '...' + wallet.wallet_address.substring(wallet.wallet_address.length - 8)
        : wallet.wallet_address;
      message += `${index + 1}. \`${shortAddr}\`\n   📅 ${date}\n\n`;
    });
    message += '✅ Send crypto from these wallets to get ZEC!';

    const keyboard = {
      inline_keyboard: [
        [
          { text: '➕ Register Another Wallet', callback_data: 'menu_register' }
        ],
        [
          { text: '💰 Set ZEC Address', callback_data: 'menu_setaddress' },
          { text: '🏠 Main Menu', callback_data: 'menu_main' }
        ]
      ]
    };

    await this.bot.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });
  }

  async showSetAddressPrompt(chatId) {
    const message = `
⚙️ *Settings - Set Your Zcash Address*

Set your Zcash receiving address where you want to receive ZEC:

\`/setaddress t1YourZcashAddress\`

*Supported formats:*
• Transparent: t1... or t3...
• Shielded Sapling: zs...
• Shielded Sprout: zc...

Send the command with your actual Zcash address.
    `;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '💼 My Wallets', callback_data: 'menu_mywallets' },
          { text: '📊 My Stats', callback_data: 'menu_mystats' }
        ],
        [
          { text: '🏠 Main Menu', callback_data: 'menu_main' }
        ]
      ]
    };

    await this.bot.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });
  }

  async showMyAddress(chatId, userId) {
    const user = await db.getUser(userId);

    if (!user || !user.zcash_address) {
      const message = `
💼 *Your Zcash Address*

You haven't set a Zcash address yet.

Set one to be able to receive ZEC!
      `;

      const keyboard = {
        inline_keyboard: [
          [
            { text: '💰 Set ZEC Address', callback_data: 'menu_setaddress' }
          ],
          [
            { text: '🏠 Main Menu', callback_data: 'menu_main' }
          ]
        ]
      };

      await this.bot.sendMessage(chatId, message, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });
      return;
    }

    const keyboard = {
      inline_keyboard: [
        [
          { text: '✏️ Update Address', callback_data: 'menu_setaddress' }
        ],
        [
          { text: '📊 My Stats', callback_data: 'menu_mystats' },
          { text: '🏠 Main Menu', callback_data: 'menu_main' }
        ]
      ]
    };

    await this.bot.sendMessage(
      chatId,
      `💼 *Your Zcash Address:*\n\n\`${user.zcash_address}\``,
      { parse_mode: 'Markdown', reply_markup: keyboard }
    );
  }

  async showMyStats(chatId, userId, username) {
    const user = await db.getUser(userId);

    if (!user) {
      await this.bot.sendMessage(chatId, '❌ No statistics available. Use /start to register.');
      return;
    }

    const wallets = await db.getUserWallets(userId);
    const walletCount = wallets?.length || 0;

    const statsMessage = `
📊 *Your Statistics*

👤 Username: @${user.telegram_username || username || 'Unknown'}
💰 Total Received: ${user.total_received} ZEC
📅 Member Since: ${new Date(user.created_at).toLocaleDateString()}
💼 ZEC Address: ${user.zcash_address ? '✅ Set' : '❌ Not set'}
🔗 Registered Wallets: ${walletCount}
    `;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '💼 View My Wallets', callback_data: 'menu_mywallets' },
          { text: user.zcash_address ? '✏️ Update ZEC Address' : '💰 Set ZEC Address', callback_data: 'menu_setaddress' }
        ],
        [
          { text: '📝 Register Wallet', callback_data: 'menu_register' },
          { text: '🏠 Main Menu', callback_data: 'menu_main' }
        ]
      ]
    };

    await this.bot.sendMessage(chatId, statsMessage, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });
  }

  async showBalance(chatId) {
    try {
      const balance = await zcashService.getBalance();
      
      const keyboard = {
        inline_keyboard: [
          [
            { text: '📊 My Stats', callback_data: 'menu_mystats' },
            { text: '🏠 Main Menu', callback_data: 'menu_main' }
          ]
        ]
      };

      await this.bot.sendMessage(
        chatId,
        `💰 *Bot Zcash Balance:*\n\n${balance} ZEC\n\nThis is the amount available for distributing rewards.`,
        { parse_mode: 'Markdown', reply_markup: keyboard }
      );
    } catch (error) {
      await this.bot.sendMessage(chatId, '❌ Failed to retrieve balance. Please try again later.');
    }
  }

  async showHelp(chatId) {
    const helpMessage = `
❓ *Zlink Help*

*How It Works:*
1️⃣ Register your sender wallet address (Base/BNB/Solana)
2️⃣ Set your ZEC receiver address
3️⃣ Send crypto to our address
4️⃣ Receive ZEC magic link instantly!

*Commands:*
/start - Start the bot
/claim <code> <address> - Claim ZEC with magic link code
/howtoget - See where to send crypto
/register <wallet> - Register your sender wallet
/mywallets - View your registered sender wallets
/setaddress <address> - Set your ZEC receiving address
/mystats - View your statistics

*Supported Networks:*
🔷 Base Network
🟡 BNB Smart Chain
🟣 Solana

*Example:*
1. Register sender wallet: \`/register 0xYourAddress\`
2. Set ZEC receiving address: \`/setaddress t1YourZecAddress\`
3. Send crypto to our address (click "Get ZEC")
4. Receive your magic link!
5. Claim: \`/claim abc123-def456 t1YourZecAddress\`

*Zcash Address Formats:*
• Transparent: t1... or t3...
• Shielded: zs... or zc...

Need support? Contact the bot administrator.
    `;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '🚀 Get Started', callback_data: 'menu_getstarted' },
          { text: '💰 Get ZEC', callback_data: 'menu_howtoget' }
        ],
        [
          { text: '💼 My Wallets', callback_data: 'menu_mywallets' },
          { text: '📊 My Stats', callback_data: 'menu_mystats' }
        ],
        [
          { text: '🏠 Main Menu', callback_data: 'menu_main' }
        ]
      ]
    };

    await this.bot.sendMessage(chatId, helpMessage, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });
  }

  async showHowToClaim(chatId) {
    const message = `
🎁 *How to Claim ZEC*

*Claim via Telegram Bot:*
Use the \`/claim\` command:

\`/claim <code> <your_zcash_address>\`

*Example:*
\`/claim abc123-def456-789 t1YourZcashAddress\`

*Sharing Magic Links:*
✨ Magic links are transferable! You can:
• Share the code with friends
• Gift ZEC to anyone
• Save for later

*Important:*
⏰ Links expire in 24 hours
🔒 Once claimed, cannot be reused
💰 Make sure your ZEC address is correct!
    `;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '💰 Get ZEC', callback_data: 'menu_howtoget' },
          { text: '📊 My Stats', callback_data: 'menu_mystats' }
        ],
        [
          { text: '🏠 Main Menu', callback_data: 'menu_main' }
        ]
      ]
    };

    await this.bot.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });
  }

  // Admin Panel Functions
  async showAdminPanel(chatId, userId, messageId = null) {
    const pendingClaims = await db.getPendingClaims();
    
    let message = `
🔐 *ADMIN PANEL*
━━━━━━━━━━━━━━━━━

📋 *Pending Claims:* ${pendingClaims.length}

`;

    if (pendingClaims.length === 0) {
      message += '✅ No pending claims at the moment.\n\n';
      message += '_e.g., when claims arrive, they will appear as:_\n';
      message += '`1. SOL $50.00 → 1.1 ZEC`\n';
      message += '`2. ETH $125.00 → 2.75 ZEC`\n\n';
    } else {
      message += '👇 Select a claim to review:\n\n';
    }

    message += `🔄 Last updated: ${new Date().toLocaleTimeString()}`;

    const keyboard = {
      inline_keyboard: []
    };

    // Add buttons for each pending claim
    pendingClaims.forEach((claim, index) => {
      const shortId = claim.claim_id.substring(0, 8);
      keyboard.inline_keyboard.push([
        { 
          text: `${index + 1}. ${claim.coin_type} $${claim.amount_usd} → ${claim.zcash_amount} ZEC`, 
          callback_data: `admin_view_${claim.claim_id}` 
        }
      ]);
    });

    // Add control buttons
    keyboard.inline_keyboard.push([
      { text: '🔄 Refresh', callback_data: 'admin_refresh' },
      { text: '🚪 Exit Admin', callback_data: 'admin_exit' }
    ]);

    if (messageId) {
      try {
        await this.bot.editMessageText(message, {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: 'Markdown',
          reply_markup: keyboard
        });
      } catch (error) {
        // If edit fails, send new message
        await this.bot.sendMessage(chatId, message, {
          parse_mode: 'Markdown',
          reply_markup: keyboard
        });
      }
    } else {
      await this.bot.sendMessage(chatId, message, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });
    }

    console.log(`🔐 Admin panel opened by user ${userId}`);
  }

  async showClaimDetails(chatId, claimId, messageId) {
    const claim = await db.getPendingClaim(claimId);
    
    if (!claim) {
      await this.bot.editMessageText('❌ Claim not found or already processed', {
        chat_id: chatId,
        message_id: messageId,
      });
      return;
    }

    const created = new Date(claim.created_at).toLocaleString();
    const txShort = claim.tx_hash ? claim.tx_hash.substring(0, 10) + '...' : 'N/A';

    const message = `
🔐 *CLAIM DETAILS*
━━━━━━━━━━━━━━━━━

👤 *User:* @${claim.telegram_username}
🆔 *User ID:* \`${claim.telegram_user_id}\`

💰 *Transaction:*
   Coin: ${claim.coin_type}
   Amount Sent: ${claim.amount_sent}
   USD Value: $${claim.amount_usd}
   TX: \`${txShort}\`

💎 *Zcash Transfer:*
   Amount: ${claim.zcash_amount} ZEC
   After Fee: 1% ($${(parseFloat(claim.amount_usd) * 0.01).toFixed(2)})
   To Address: \`${claim.zcash_address}\`

📅 *Created:* ${created}
📊 *Status:* ${claim.status.toUpperCase()}

━━━━━━━━━━━━━━━━━
💡 *Action Required:*
Approve to send ZEC or reject this claim.
    `;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '✅ Approve & Send', callback_data: `admin_approve_${claimId}` },
          { text: '❌ Reject', callback_data: `admin_reject_${claimId}` }
        ],
        [
          { text: '← Back to Panel', callback_data: 'admin_refresh' }
        ]
      ]
    };

    await this.bot.editMessageText(message, {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });
  }

  async handleAdminApprove(chatId, userId, claimId, messageId) {
    const claim = await db.getPendingClaim(claimId);
    
    if (!claim) {
      await this.bot.answerCallbackQuery(userId, {
        text: '❌ Claim not found',
        show_alert: true
      });
      return;
    }

    // Store admin state to track that we're waiting for Zcash TXID
    await db.setAdminInputState(userId, `approve_${claimId}`, JSON.stringify({ messageId }));

    // Prompt for Zcash transaction ID
    await this.bot.editMessageText(
      `✅ *Approve Claim*\n\n*Claim ID:* ${claimId}\n*User:* @${claim.telegram_username}\n*Amount:* ${claim.zcash_amount} ZEC\n*Address:* \`${claim.zcash_address}\`\n\n*Please enter the Zcash transaction ID (TXID):*\n\nSend the transaction hash from the Zcash blockchain.`,
      {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[
            { text: '❌ Cancel', callback_data: `admin_view_${claimId}` }
          ]]
        }
      }
    );
  }

  async handleAdminApproveConfirm(chatId, userId, claimId, zcashTxid, messageId) {
    const claim = await db.getPendingClaim(claimId);
    
    if (!claim) {
      await this.bot.sendMessage(chatId, '❌ Claim not found');
      return;
    }

    // Validate Zcash TXID format (basic check)
    if (!zcashTxid || zcashTxid.length < 10) {
      await this.bot.sendMessage(chatId, '❌ Invalid Zcash transaction ID. Please try again.');
      // Re-prompt for TXID
      const inputState = await db.getAdminInputState(userId);
      if (inputState && inputState.state.startsWith('approve_')) {
        // Keep the state, just show error
        return;
      }
      await this.handleAdminApprove(chatId, userId, claimId, messageId);
      return;
    }

    // Update status with Zcash TXID
    await db.approvePendingClaim(claimId, zcashTxid, `Approved by admin ${userId}`);

    // Clear admin input state
    await db.clearAdminInputState(userId);

    // Notify the user
    try {
      const userMessage = `
✅ *Transaction Approved!*

Your Zcash has been sent! 🎉

💰 Amount: ${claim.zcash_amount} ZEC
📍 Address: \`${claim.zcash_address}\`
🔗 Transaction ID: \`${zcashTxid}\`

Please allow a few minutes for the transaction to appear in your wallet.

Thank you for using Zlink! 🚀
      `;

      await this.bot.sendMessage(claim.telegram_user_id, userMessage, {
        parse_mode: 'Markdown'
      });
      
      console.log(`✅ Claim ${claimId} approved by admin ${userId}`);
      console.log(`   Zcash TXID: ${zcashTxid}`);
      console.log(`   User @${claim.telegram_username} notified`);
    } catch (error) {
      console.error('Could not notify user:', error);
    }

    // Update admin panel
    if (messageId) {
      try {
        await this.bot.editMessageText(
          `✅ *Claim Approved*\n\n*User:* @${claim.telegram_username}\n*ZEC Amount:* ${claim.zcash_amount}\n*Zcash TXID:* \`${zcashTxid}\`\n\nUser has been notified.`,
          {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [[
                { text: '← Back to Panel', callback_data: 'admin_refresh' }
              ]]
            }
          }
        );
      } catch (error) {
        // If edit fails, send new message
        await this.bot.sendMessage(chatId, `✅ *Claim Approved*\n\n*User:* @${claim.telegram_username}\n*ZEC Amount:* ${claim.zcash_amount}\n*Zcash TXID:* \`${zcashTxid}\`\n\nUser has been notified.`, {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [[
              { text: '← Back to Panel', callback_data: 'admin_refresh' }
            ]]
          }
        });
      }
    } else {
      await this.bot.sendMessage(chatId, `✅ *Claim Approved*\n\n*User:* @${claim.telegram_username}\n*ZEC Amount:* ${claim.zcash_amount}\n*Zcash TXID:* \`${zcashTxid}\`\n\nUser has been notified.`, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[
            { text: '← Back to Panel', callback_data: 'admin_refresh' }
          ]]
        }
      });
    }
  }

  async handleAdminReject(chatId, userId, claimId, messageId) {
    const claim = await db.getPendingClaim(claimId);
    
    if (!claim) {
      await this.bot.answerCallbackQuery(userId, {
        text: '❌ Claim not found',
        show_alert: true
      });
      return;
    }

    // Store admin state to track that we're waiting for rejection reason
    await db.setAdminInputState(userId, `reject_reason_${claimId}`, JSON.stringify({ messageId }));

    // Prompt for rejection reason
    await this.bot.editMessageText(
      `❌ *Reject Claim*\n\n*Claim ID:* ${claimId}\n*User:* @${claim.telegram_username}\n*Amount:* ${claim.zcash_amount} ZEC\n\n*Please enter the rejection reason:*\n\nExplain why this claim is being rejected.`,
      {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[
            { text: '❌ Cancel', callback_data: `admin_view_${claimId}` }
          ]]
        }
      }
    );
  }

  async handleAdminRejectReason(chatId, userId, claimId, rejectionReason, messageId) {
    const claim = await db.getPendingClaim(claimId);
    
    if (!claim) {
      await this.bot.sendMessage(chatId, '❌ Claim not found');
      return;
    }

    if (!rejectionReason || rejectionReason.trim().length < 3) {
      await this.bot.sendMessage(chatId, '❌ Please provide a valid rejection reason (at least 3 characters).');
      await this.handleAdminReject(chatId, userId, claimId, messageId);
      return;
    }

    // Store rejection reason and prompt for refund TX hash
    await db.setAdminInputState(userId, `reject_refund_${claimId}`, JSON.stringify({ messageId: messageId, rejectionReason }));

    await this.bot.editMessageText(
      `❌ *Reject Claim - Refund Transaction*\n\n*Claim ID:* ${claimId}\n*Rejection Reason:* ${rejectionReason}\n\n*Please enter the refund transaction hash:*\n\nEnter the transaction hash from the refund you sent. If no refund was sent, type "none" or "N/A".`,
      {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[
            { text: '❌ Cancel', callback_data: `admin_view_${claimId}` }
          ]]
        }
      }
    );
  }

  async handleAdminRejectConfirm(chatId, userId, claimId, rejectionReason, refundTxHash, messageId) {
    const claim = await db.getPendingClaim(claimId);
    
    if (!claim) {
      await this.bot.sendMessage(chatId, '❌ Claim not found');
      return;
    }

    // Normalize refund TX hash (allow "none", "N/A", or empty)
    const normalizedRefundHash = (refundTxHash && 
      refundTxHash.toLowerCase() !== 'none' && 
      refundTxHash.toLowerCase() !== 'n/a' && 
      refundTxHash.trim().length > 0) ? refundTxHash.trim() : null;

    // Update status with rejection reason and refund TX hash
    await db.rejectPendingClaim(claimId, rejectionReason, normalizedRefundHash, `Rejected by admin ${userId}`);

    // Clear admin input state
    await db.clearAdminInputState(userId);

    // Notify the user
    try {
      const userMessage = `
❌ *Transaction Update*

We're sorry, but your claim has been rejected.

*Reason:* ${rejectionReason}
${normalizedRefundHash ? `*Refund TX:* \`${normalizedRefundHash}\`` : '*Refund:* No refund transaction provided'}

Transaction Details:
• Amount: ${claim.amount_sent} ${claim.coin_type}
• USD Value: $${claim.amount_usd}

If you believe this is an error, please contact support.
      `;

      await this.bot.sendMessage(claim.telegram_user_id, userMessage, {
        parse_mode: 'Markdown'
      });
      
      console.log(`❌ Claim ${claimId} rejected by admin ${userId}`);
      console.log(`   Reason: ${rejectionReason}`);
      console.log(`   Refund TX: ${normalizedRefundHash || 'None'}`);
      console.log(`   User @${claim.telegram_username} notified`);
    } catch (error) {
      console.error('Could not notify user:', error);
    }

    // Update admin panel
    if (messageId) {
      try {
        await this.bot.editMessageText(
          `❌ *Claim Rejected*\n\n*User:* @${claim.telegram_username}\n*Reason:* ${rejectionReason}\n${normalizedRefundHash ? `*Refund TX:* \`${normalizedRefundHash}\`` : '*Refund:* None'}\n\nUser has been notified.`,
          {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [[
                { text: '← Back to Panel', callback_data: 'admin_refresh' }
              ]]
            }
          }
        );
      } catch (error) {
        // If edit fails, send new message
        await this.bot.sendMessage(chatId, `❌ *Claim Rejected*\n\n*User:* @${claim.telegram_username}\n*Reason:* ${rejectionReason}\n${normalizedRefundHash ? `*Refund TX:* \`${normalizedRefundHash}\`` : '*Refund:* None'}\n\nUser has been notified.`, {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [[
              { text: '← Back to Panel', callback_data: 'admin_refresh' }
            ]]
          }
        });
      }
    } else {
      await this.bot.sendMessage(chatId, `❌ *Claim Rejected*\n\n*User:* @${claim.telegram_username}\n*Reason:* ${rejectionReason}\n${normalizedRefundHash ? `*Refund TX:* \`${normalizedRefundHash}\`` : '*Refund:* None'}\n\nUser has been notified.`, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[
            { text: '← Back to Panel', callback_data: 'admin_refresh' }
          ]]
        }
      });
    }
  }


  // Helper function to safely send messages and handle blocked users
  async safeSendMessage(chatId, text, options = {}) {
    try {
      const result = await this.bot.sendMessage(chatId, text, options);
      return result;
    } catch (error) {
      // Check if it's a Telegram API error
      if (error.response && error.response.body) {
        const errorCode = error.response.body.error_code;
        const description = error.response.body.description || '';
        
        if (errorCode === 403) {
          // User blocked the bot or deleted the chat
          if (description.includes('blocked')) {
            console.warn(`⚠️  User ${chatId} has blocked the bot`);
          } else if (description.includes('deleted')) {
            console.warn(`⚠️  Chat ${chatId} was deleted`);
          } else {
            console.warn(`⚠️  Cannot send to ${chatId}: ${description}`);
          }
          return null;
        }
        
        if (errorCode === 400) {
          if (description.includes('chat not found')) {
            console.warn(`⚠️  Chat ${chatId} not found`);
            return null;
          }
          if (description.includes('user is deactivated')) {
            console.warn(`⚠️  User ${chatId} account is deactivated`);
            return null;
          }
        }
        
        if (errorCode === 429) {
          // Rate limit - wait and retry once
          const retryAfter = error.response.body.parameters?.retry_after || 1;
          console.warn(`⚠️  Rate limited, waiting ${retryAfter} seconds...`);
          await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
          try {
            return await this.bot.sendMessage(chatId, text, options);
          } catch (retryError) {
            console.error(`❌ Retry failed for ${chatId}:`, retryError.message);
            return null;
          }
        }
      }
      
      // For unknown errors, re-throw
      throw error;
    }
  }

  async notifyUser(userId, username, transaction) {
    try {
      // Calculate ZEC amount based on transaction value
      const coinSymbol = priceService.getCoinFromChain(transaction.chain);
      const amountUsd = priceService.toUSD(transaction.amount, coinSymbol);
      
      // Calculate fee and Zcash amount
      const feeAmount = amountUsd * 0.01; // 1% fee
      const amountAfterFee = amountUsd - feeAmount;
      const zecAmount = priceService.calculateZcashAmount(amountUsd);
      
      console.log(`💰 Calculating ZEC for transaction:`);
      console.log(`   ${transaction.amount} ${coinSymbol} = $${amountUsd.toFixed(2)} USD`);
      console.log(`   1% Fee: $${feeAmount.toFixed(2)} USD`);
      console.log(`   After fee: $${amountAfterFee.toFixed(2)} USD`);
      console.log(`   = ${zecAmount.toFixed(6)} ZEC`);
      
      // Generate magic link with calculated amount
      const link = await magicLink.generateLink(userId, username, zecAmount, transaction.txHash);

      const expiresDate = new Date(link.expiresAt).toLocaleString();

      const message = `
🎉 *Your ZEC is Ready!*

💰 *You will receive:* ${zecAmount.toFixed(6)} ZEC
💵 *Original amount:* ${transaction.amount} ${coinSymbol} ($${amountUsd.toFixed(2)} USD)
💸 *Service fee (1%):* $${feeAmount.toFixed(2)} USD
🔗 Chain: ${transaction.chain}
📝 Transaction: \`${transaction.txHash.substring(0, 10)}...${transaction.txHash.substring(transaction.txHash.length - 10)}\`

*Claim your Zcash:*

🔑 *Code:* \`${link.linkId}\`

*To claim, use this command:*
\`/claim ${link.linkId} t1YourZcashAddress\`

Replace \`t1YourZcashAddress\` with your actual Zcash receiving address.

⏰ Expires: ${expiresDate}

💡 *Tip:* You can share this code with anyone! Magic links are transferable.
      `;

      const keyboard = {
        inline_keyboard: [
          [{ text: '⚙️ Set ZEC Address', callback_data: 'menu_setaddress' }],
          [{ text: '❓ How to Claim', callback_data: 'menu_howto_claim' }],
        ],
      };

      const sent = await this.safeSendMessage(userId, message, {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      });

      if (sent) {
        console.log(`✉️  Notification sent to @${username} (${userId})`);
      } else {
        console.log(`⚠️  Could not notify @${username} (${userId}) - user may have blocked bot`);
      }
    } catch (error) {
      console.error(`❌ Error notifying user ${username}:`, error.message);
    }
  }

  async sendMessage(chatId, text, options = {}) {
    // Use safeSendMessage to handle blocked users gracefully
    return await this.safeSendMessage(chatId, text, options);
  }

  start() {
    console.log('✅ Telegram bot started successfully');
  }

  stop() {
    this.bot.stopPolling();
    console.log('Telegram bot stopped');
  }
}

export default ZlinkBot;
