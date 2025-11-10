# Setup Guide for Zlink Bot

## Quick Fix for Your Error

The error you encountered was due to an invalid Solana address in your `.env` file. I've fixed the bot to handle this gracefully!

## Step 1: Create Your .env File

Create a `.env` file in the root directory with at minimum:

```env
# REQUIRED - Get from @BotFather on Telegram
TELEGRAM_BOT_TOKEN=your_actual_bot_token_here
```

That's it! The bot will now start and work with just the Telegram token.

## Step 2: Add Optional Blockchain Monitoring

### For Ethereum/EVM Monitoring (Optional)

Add these lines to your `.env`:

```env
# Get free RPC from alchemy.com or infura.io
EVM_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR-API-KEY
# Your actual Ethereum address (must start with 0x)
EVM_WALLET_ADDRESS=0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
```

### For Solana Monitoring (Optional)

Add these lines to your `.env`:

```env
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
# Your actual Solana address (32-44 base58 characters)
SOL_WALLET_ADDRESS=7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU
```

**Important**: Don't use example addresses! Replace with your actual wallet addresses.

## Step 3: Test the Bot

```bash
npm start
```

You should see:

```
🚀 Starting Zlink Bot...

⚠️  EVM monitoring not configured (missing EVM_RPC_URL or EVM_WALLET_ADDRESS)
⚠️  Solana monitoring not configured (missing SOLANA_RPC_URL or SOL_WALLET_ADDRESS)
⚠️  Zcash node not configured - will use mock mode for testing

✅ Telegram bot started successfully
EVM monitor: Skipped (not configured)
Solana monitor: Skipped (not configured)
🌐 Web server running at http://localhost:3000

✅ All services started successfully!

📊 Status:
   - Telegram Bot: ✅ Running
   - EVM Monitor: ⚠️  Disabled
   - Solana Monitor: ⚠️  Disabled
   - Web Server: ✅ Running

⚠️  No blockchain monitors are active. Configure EVM_RPC_URL/EVM_WALLET_ADDRESS or SOLANA_RPC_URL/SOL_WALLET_ADDRESS in .env
```

This is normal! The bot is running, just without blockchain monitoring yet.

## Step 4: Get Your Bot Token

1. Open Telegram
2. Search for `@BotFather`
3. Send `/newbot`
4. Follow the instructions
5. Copy the token (looks like `1234567890:ABCdefGHIjklMNOpqrsTUVwxyz`)
6. Paste it in your `.env` file

## Step 5: Get EVM RPC URL (Optional)

### Using Alchemy (Recommended - Free):

1. Go to [alchemy.com](https://www.alchemy.com/)
2. Sign up for free
3. Click "Create App"
4. Select "Ethereum" (or BSC, Polygon, etc.)
5. Copy the HTTPS URL
6. Add to your `.env` file

### Using Infura:

1. Go to [infura.io](https://infura.io/)
2. Sign up for free
3. Create a new project
4. Copy the endpoint URL
5. Add to your `.env` file

## Step 6: Test Your Bot on Telegram

1. Find your bot on Telegram (search for the username you created)
2. Send `/start`
3. Send `/help`
4. Register a wallet: `/register 0xYourWalletAddress`

## Full .env Example

Here's a complete example with all options:

```env
# REQUIRED
TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz

# OPTIONAL - EVM Monitoring
EVM_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/abc123
EVM_WALLET_ADDRESS=0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb

# OPTIONAL - Solana Monitoring
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
SOL_WALLET_ADDRESS=7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU

# OPTIONAL - Zcash (will use mock mode if not configured)
ZCASH_RPC_URL=http://localhost:8232
ZCASH_RPC_USER=myuser
ZCASH_RPC_PASSWORD=mypassword
ZCASH_WALLET_ADDRESS=t1abc123...

# Web Configuration
BASE_URL=http://localhost:3000
LINK_EXPIRY_HOURS=24

# Distribution
ZEC_AMOUNT_PER_TRANSACTION=0.01
```

## Troubleshooting

### "Missing required environment variables: TELEGRAM_BOT_TOKEN"
- Make sure you created a `.env` file in the root directory
- Make sure `TELEGRAM_BOT_TOKEN` is set to your actual token

### "Invalid wallet address format"
- EVM addresses must start with `0x` and be 42 characters long
- Solana addresses must be 32-44 base58 characters (no 0x)
- Don't use example addresses - use your real wallet addresses

### "EVM monitoring disabled" or "Solana monitoring disabled"
- This is fine! It just means those features aren't configured yet
- The bot will work without blockchain monitoring
- Add the RPC URLs and wallet addresses when you're ready

### Getting Your Telegram User ID
To test the bot fully, you'll need your Telegram User ID. To get it:
1. Send a message to your bot
2. Check the console logs - they show user IDs
3. Or use [@userinfobot](https://t.me/userinfobot) on Telegram

## What Works Without Full Configuration?

Even with just `TELEGRAM_BOT_TOKEN`, you can:
- ✅ Talk to the bot on Telegram
- ✅ Use all bot commands
- ✅ Register wallets with `/register`
- ✅ Set Zcash addresses with `/setaddress`
- ✅ View stats with `/mystats`
- ✅ Access the web interface at http://localhost:3000

What requires blockchain configuration:
- ❌ Automatic transaction detection
- ❌ Automatic reward notifications

## Next Steps

1. Start with just the Telegram token
2. Test the bot commands
3. Add EVM or Solana monitoring when ready
4. Configure Zcash for production use

Need help? Check the full README.md for more details!

