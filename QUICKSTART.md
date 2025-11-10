# Quick Start Guide

Get your Zlink bot up and running in minutes!

## Step 1: Install Dependencies

```bash
npm install
```

## Step 2: Configure Environment

1. Copy the example environment file:
```bash
cp env-example.txt .env
```

2. Edit `.env` with your favorite text editor and fill in these required fields:

### Required Configuration

**Telegram Bot Token** (Required)
```env
TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz
```
Get this from [@BotFather](https://t.me/botfather) on Telegram.

**EVM Configuration** (Required)
```env
EVM_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR-API-KEY
EVM_WALLET_ADDRESS=0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
```
- Get a free RPC URL from [Alchemy](https://www.alchemy.com/) or [Infura](https://infura.io/)
- Use the wallet address you want to monitor for incoming transactions

**Solana Configuration** (Required)
```env
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
SOL_WALLET_ADDRESS=7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU
```
- Public RPC works for testing
- Use your Solana wallet address to monitor

**Zcash Configuration** (Optional for testing)
```env
ZCASH_RPC_URL=http://localhost:8232
ZCASH_RPC_USER=your_username
ZCASH_RPC_PASSWORD=your_password
ZCASH_WALLET_ADDRESS=t1YourZcashAddress
```
- If you don't have a Zcash node, the bot will run in mock mode
- You can test the bot without Zcash initially

## Step 3: Run the Bot

```bash
npm start
```

You should see:
```
🚀 Starting Zlink Bot...
✅ Telegram bot started successfully
Starting EVM monitor for address: 0x...
Starting Solana monitor for address: ...
🌐 Web server running at http://localhost:3000
```

## Step 4: Test Your Bot

1. Open Telegram and search for your bot
2. Send `/start` to the bot
3. Send `/help` to see available commands
4. Set your Zcash address: `/setaddress t1YourZcashAddress`

## Step 5: Test Transaction Detection

### For EVM (Ethereum/BSC/Polygon):
Send a small amount of ETH/BNB/MATIC to the `EVM_WALLET_ADDRESS` you configured.

### For Solana:
Send a small amount of SOL to the `SOL_WALLET_ADDRESS` you configured.

The bot will detect the transaction and log it to the console!

## Important: Connecting Transactions to Users

The bot needs to know which Telegram user should receive rewards for each transaction. You need to implement one of these methods in `index.js`:

### Method 1: User Registration (Recommended)

Add a command for users to register their wallet addresses:

```javascript
// In bot.js, add a new command:
this.bot.onText(/\/register (.+)/, async (msg, match) => {
  const userId = msg.from.id;
  const username = msg.from.username;
  const walletAddress = match[1].trim().toLowerCase();
  
  // Save to database
  db.saveUserWallet(userId, username, walletAddress);
  
  await this.bot.sendMessage(msg.chat.id, 
    `✅ Wallet registered! You'll receive ZEC rewards for transactions from this address.`
  );
});

// Then in index.js:
async getUserFromTransaction(transaction) {
  const user = db.getUserByWallet(transaction.from.toLowerCase());
  return user?.telegram_user_id;
}

async getUsernameFromTransaction(transaction) {
  const user = db.getUserByWallet(transaction.from.toLowerCase());
  return user?.telegram_username;
}
```

### Method 2: Pre-configured Mapping

Create a mapping file:

```javascript
// userMapping.js
export const walletToUser = {
  // EVM addresses
  '0x742d35cc6634c0532925a3b844bc9e7595f0beb': {
    userId: 123456789,
    username: 'johndoe'
  },
  // Solana addresses
  '7xkxtg2cw87d97txjsdpbd5jbkheteqa83tzrujosgasu': {
    userId: 987654321,
    username: 'janedoe'
  }
};

// Then import and use in index.js:
import { walletToUser } from './userMapping.js';

async getUserFromTransaction(transaction) {
  const address = transaction.from.toLowerCase();
  return walletToUser[address]?.userId;
}
```

### Method 3: Transaction Memo/Data

Parse user information from transaction data (advanced).

## Testing Without Real Transactions

For development, you can manually trigger the notification:

```javascript
// Add this to index.js temporarily:
setTimeout(async () => {
  await this.bot.notifyUser(
    YOUR_TELEGRAM_USER_ID,
    'your_username',
    {
      txHash: '0xtest123...',
      chain: 'EVM',
      from: '0xtest...',
      to: '0xtest...',
      amount: '1.0'
    }
  );
}, 5000);
```

## Production Checklist

Before deploying to production:

- [ ] Set up a proper Zcash node or API
- [ ] Configure `BASE_URL` to your public domain
- [ ] Set up HTTPS with a reverse proxy (nginx + Let's Encrypt)
- [ ] Implement user-to-wallet mapping
- [ ] Set up monitoring and logging
- [ ] Configure backups for the database
- [ ] Test with small amounts first
- [ ] Use a process manager (PM2 or Docker)

## Troubleshooting

### Bot doesn't respond
- Check `TELEGRAM_BOT_TOKEN` is correct
- Make sure you've sent `/start` to the bot
- Check console for errors

### Transactions not detected
- Verify wallet addresses are correct (case-sensitive for Solana)
- Check RPC URLs are working
- Look for errors in console

### "getUserFromTransaction needs to be implemented"
- This is expected! Follow Method 1 or 2 above to implement user mapping

### Zcash not sending
- If you see "mock mode", that's normal without a Zcash node
- Set up a Zcash node or modify `zcashService.js` for other APIs

## Need Help?

- Read the full README.md for detailed documentation
- Check console logs for error messages
- Make sure all dependencies are installed
- Verify Node.js version is 18 or higher

## Next Steps

1. Implement user-to-wallet mapping (see above)
2. Test the complete flow with real transactions
3. Set up a Zcash node for production
4. Deploy to a server with PM2 or Docker
5. Configure a domain and HTTPS
6. Set up monitoring

Happy building! 🚀

