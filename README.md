# 🔗 Zlink - Instant Zcash Exchange via Telegram

**The easiest way to get Zcash!** Send ETH, BNB, MATIC, or SOL and receive ZEC instantly via magic links on Telegram.

[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![GitHub Issues](https://img.shields.io/github/issues/trenchsheikh/zlink)](https://github.com/trenchsheikh/zlink/issues)
[![GitHub Stars](https://img.shields.io/github/stars/trenchsheikh/zlink)](https://github.com/trenchsheikh/zlink/stargazers)

---

## 🎯 What is Zlink?

Zlink is a Telegram-based crypto exchange service that makes getting Zcash simple:

1. **Send** crypto (ETH/BNB/MATIC/SOL) to our address
2. **Receive** a magic link with ZEC on Telegram
3. **Claim** your Zcash instantly - shareable links!

No KYC, no complicated exchanges, just instant ZEC delivery.

---

## ✨ Features

### 🎁 **Instant Magic Links**
- Receive ZEC via shareable magic links
- Claim directly in Telegram with `/claim` command
- Or use web interface for claiming

### 🔗 **Multi-Chain Support**
- Ethereum (ETH)
- Binance Smart Chain (BNB)  
- Polygon (MATIC)
- Solana (SOL)

### 💫 **Shareable & Transferable**
- Gift ZEC to friends
- Share magic link codes
- Anyone can claim (first come, first served)

### 🔒 **Secure & Private**
- Time-limited magic links (24h expiry)
- Single-use claims
- Direct ZEC transfers to user wallets

### 📊 **User Management**
- Wallet registration system
- Transaction tracking
- Statistics dashboard
- Saved Zcash addresses

### 🎨 **Beautiful Interface**
- Interactive button menus
- Clean Telegram bot UI
- Modern web claim page

---

## 🚀 Quick Start

### Prerequisites

- **Node.js 18+** (for ES modules)
- **Telegram Bot Token** from [@BotFather](https://t.me/botfather)
- **EVM RPC URL** (Alchemy/Infura)
- **Solana RPC URL** (optional)
- **Zcash Node** (optional - mock mode available)

### Installation

```bash
# Clone the repository
git clone https://github.com/trenchsheikh/zlink.git
cd zlink

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Edit .env with your credentials
nano .env

# Start the bot
npm start
```

### Minimum Configuration

Only the Telegram bot token is required to start:

```env
TELEGRAM_BOT_TOKEN=your_bot_token_here
```

For full functionality, configure:

```env
# Required
TELEGRAM_BOT_TOKEN=your_telegram_bot_token

# EVM (Ethereum/BSC/Polygon)
EVM_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR-API-KEY
EVM_WALLET_ADDRESS=0xYourWalletAddress

# Solana
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
SOL_WALLET_ADDRESS=YourSolanaWalletAddress

# Zcash (optional - uses mock mode if not configured)
ZCASH_RPC_URL=http://localhost:8232
ZCASH_RPC_USER=your_rpc_username
ZCASH_RPC_PASSWORD=your_rpc_password
ZCASH_WALLET_ADDRESS=your_zcash_sending_address

# Configuration
BASE_URL=http://localhost:3000
LINK_EXPIRY_HOURS=24
ZEC_AMOUNT_PER_TRANSACTION=0.01
```

---

## 📱 How to Use

### For Users

**Step 1: Start the Bot**
```
Open Telegram → Search for @YourBot → /start
```

**Step 2: Register Your Wallet**
```
/register 0xYourEthereumAddress
or
/register YourSolanaAddress
```

**Step 3: Set Your Zcash Address**
```
/setaddress t1YourZcashAddress
```

**Step 4: Get Our Address**
```
Click "💰 Get ZEC" button or use /howtoget
```

**Step 5: Send Crypto**
```
Send ETH/BNB/SOL to the address shown
```

**Step 6: Receive Magic Link**
```
Bot sends you a message with:
🔑 Code: abc123-def456-789xyz
```

**Step 7: Claim Your ZEC**
```
Option 1 (Telegram): /claim abc123-def456 t1YourAddress
Option 2 (Web): Click the claim button
```

**Done!** 🎉 Zcash arrives in your wallet!

---

## 🤖 Bot Commands

| Command | Description |
|---------|-------------|
| `/start` | Start the bot and see main menu |
| `/claim <code> <address>` | Claim ZEC with magic link code |
| `/howtoget` | See where to send crypto to get ZEC |
| `/register <wallet>` | Register your wallet address |
| `/mywallets` | View your registered wallets |
| `/setaddress <address>` | Set your Zcash receiving address |
| `/mystats` | View your statistics |
| `/help` | Show help information |

---

## 🎁 Magic Link Claiming

### Two Ways to Claim

**Via Telegram (Recommended):**
```bash
/claim abc123-def456-789xyz t1YourZcashAddress
```

**Via Web Browser:**
Click the "🌐 Claim via Web" button in the notification.

### Sharing Links

Magic links are **shareable and transferable**:

```
Alice receives code: abc123-def456
Alice shares with Bob
Bob claims: /claim abc123-def456 t1BobAddress
Bob gets the ZEC! ✨
```

Perfect for:
- 🎁 Gifting ZEC to friends
- 👥 Group rewards
- 💝 Sharing in communities
- 🎮 Gaming rewards
- 🏆 Contest prizes

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────┐
│           Telegram Bot Interface            │
│  (User registration, notifications, claims) │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────┴──────────────────────────┐
│         Main Application (index.js)          │
│  - Transaction detection                     │
│  - User identification                       │
│  - Magic link generation                     │
└──┬──────────┬──────────┬──────────┬─────────┘
   │          │          │          │
┌──▼───┐  ┌──▼───┐  ┌───▼────┐  ┌─▼──────┐
│ EVM  │  │ SOL  │  │ Zcash  │  │  Web   │
│Monitor│  │Monitor│  │Service │  │ Server │
└──────┘  └──────┘  └────────┘  └────────┘
   │          │          │          │
   │          │          │          │
   ▼          ▼          ▼          ▼
Ethereum   Solana    Zcash RPC   HTTP:3000
  RPC        RPC
```

---

## 🗄️ Database

Uses SQLite with automatic table creation:

- **users** - Telegram users and their data
- **wallet_mappings** - Links wallets to users
- **transactions** - All detected transactions
- **magic_links** - Generated links and claim status

Database file: `zlink.db` (auto-created)

---

## 🔧 Configuration

### Environment Variables

```env
# Telegram
TELEGRAM_BOT_TOKEN=           # Your bot token (required)

# EVM Networks (Ethereum, BSC, Polygon)
EVM_RPC_URL=                  # RPC endpoint
EVM_WALLET_ADDRESS=           # Your receiving address

# Solana
SOLANA_RPC_URL=               # RPC endpoint
SOL_WALLET_ADDRESS=           # Your receiving address

# Zcash
ZCASH_RPC_URL=                # Node RPC URL
ZCASH_RPC_USER=               # RPC username
ZCASH_RPC_PASSWORD=           # RPC password
ZCASH_WALLET_ADDRESS=         # Sending address

# Service Settings
BASE_URL=                     # Your domain (for magic links)
LINK_EXPIRY_HOURS=24         # Link expiration time
ZEC_AMOUNT_PER_TRANSACTION=0.01  # ZEC per transaction
```

### Getting RPC Endpoints

**Ethereum/EVM:**
- [Alchemy](https://www.alchemy.com/) - Free tier available
- [Infura](https://infura.io/) - Free tier available
- [QuickNode](https://www.quicknode.com/) - Paid

**Solana:**
- Public: `https://api.mainnet-beta.solana.com`
- [QuickNode](https://www.quicknode.com/)
- [Helius](https://www.helius.dev/)

**Zcash:**
- Run your own node: [Zcash Download](https://z.cash/download/)
- Or use mock mode for testing

---

## 📦 Supported Address Formats

### Input (User Sends From):
- **EVM**: `0x` + 40 hex characters
- **Solana**: Base58, 32-44 characters

### Output (ZEC Sent To):
- **Transparent**: `t1...` (mainnet), `t3...` (testnet)
- **Shielded Sapling**: `zs...`
- **Shielded Sprout**: `zc...`

---

## 🚢 Deployment

### Using PM2 (Recommended)

```bash
# Install PM2 globally
npm install -g pm2

# Start the bot
pm2 start index.js --name zlink-bot

# View logs
pm2 logs zlink-bot

# Auto-restart on system reboot
pm2 startup
pm2 save

# Monitor
pm2 monit
```

### Using Docker

```dockerfile
# Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3000
CMD ["node", "index.js"]
```

```bash
# Build and run
docker build -t zlink-bot .
docker run -d --name zlink-bot --env-file .env -p 3000:3000 zlink-bot
```

### Using systemd

```ini
# /etc/systemd/system/zlink.service
[Unit]
Description=Zlink Telegram Bot
After=network.target

[Service]
Type=simple
User=youruser
WorkingDirectory=/path/to/zlink
ExecStart=/usr/bin/node index.js
Restart=always
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable zlink
sudo systemctl start zlink
sudo systemctl status zlink
```

---

## 🛡️ Security Best Practices

1. ✅ **Never commit `.env`** - Contains sensitive credentials
2. ✅ **Use HTTPS** - Set up SSL with nginx/Caddy
3. ✅ **Strong passwords** - For RPC and Zcash node
4. ✅ **Firewall rules** - Limit access to RPC ports
5. ✅ **Regular backups** - Backup `zlink.db` daily
6. ✅ **Monitor logs** - Set up logging and alerts
7. ✅ **Test with small amounts** - Before going live
8. ✅ **Rate limiting** - Prevent spam and abuse

---

## 🐛 Troubleshooting

### Bot Not Starting

**Error: Missing TELEGRAM_BOT_TOKEN**
```bash
# Make sure .env exists and has your token
echo "TELEGRAM_BOT_TOKEN=your_token_here" > .env
```

**Error: Non-base58 character (Solana)**
```bash
# Your SOL_WALLET_ADDRESS is invalid
# Use a valid Solana address or leave it empty
```

### Transactions Not Detected

✅ Check wallet addresses are correct  
✅ Verify RPC endpoints are accessible  
✅ Ensure user registered their wallet with `/register`  
✅ Look for errors in console logs

### Zcash Not Sending

✅ Check Zcash node is running and synced  
✅ Verify RPC credentials are correct  
✅ Ensure wallet has sufficient balance  
✅ Check wallet is unlocked

**Mock Mode:**  
If Zcash node isn't configured, bot runs in mock mode (for testing).

---

## 📂 Project Structure

```
zlink/
├── index.js              # Main application entry
├── bot.js                # Telegram bot handlers
├── evmMonitor.js         # Ethereum/BSC/Polygon monitoring
├── solanaMonitor.js      # Solana monitoring
├── zcashService.js       # Zcash sending
├── magicLink.js          # Magic link logic
├── database.js           # SQLite database
├── webServer.js          # HTTP server for claims
├── config.js             # Configuration loader
├── package.json          # Dependencies
├── .env                  # Environment variables (create this)
├── .env.example          # Example configuration
├── .gitignore            # Git ignore rules
├── README.md             # This file
├── SETUP.md              # Detailed setup guide
├── QUICKSTART.md         # Quick start guide
├── CLAIM_FEATURE.md      # Claim feature docs
└── zlink.db              # SQLite database (auto-created)
```

---

## 🔌 API Reference

### Magic Link Web API

**GET /claim/:linkId**  
Returns HTML claim page

**POST /claim/:linkId**  
Claims the ZEC
```json
{
  "userId": 123456789,
  "username": "johndoe",
  "zcashAddress": "t1abc123..."
}
```

Response:
```json
{
  "success": true,
  "amount": "0.01",
  "txid": "abc123...",
  "zcashAddress": "t1abc123...",
  "originalRecipient": "alice"
}
```

---

## 🎨 Customization

### Change ZEC Amount

Edit `.env`:
```env
ZEC_AMOUNT_PER_TRANSACTION=0.01
```

Or implement dynamic amounts based on input crypto value.

### Add New Blockchain

1. Create new monitor (e.g., `avalancheMonitor.js`)
2. Follow pattern from `evmMonitor.js`
3. Add to `index.js` initialization
4. Update config with new RPC settings

### Custom Magic Link Expiry

```env
LINK_EXPIRY_HOURS=48  # 48 hours instead of 24
```

---

## 📊 Statistics & Monitoring

### User Stats

Users can view their stats with `/mystats`:
- Total ZEC received
- Number of registered wallets
- Member since date
- Saved addresses

### Admin Monitoring

Check bot balance:
```
/balance
```

View logs:
```bash
tail -f zlink.log
# or with PM2
pm2 logs zlink-bot
```

---

## 🤝 Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open a Pull Request

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [Zcash](https://z.cash/) for the privacy-focused cryptocurrency
- [Telegram](https://telegram.org/) for the excellent bot API
- [Ethers.js](https://ethers.org/) for Ethereum interactions
- [@solana/web3.js](https://solana-labs.github.io/solana-web3.js/) for Solana support

---

## 📞 Support

- 🐛 [Report Issues](https://github.com/trenchsheikh/zlink/issues)
- 💬 [Discussions](https://github.com/trenchsheikh/zlink/discussions)
- 📧 Email: support@zlink.io
- 💬 Telegram: @ZlinkSupport

---

## ⚠️ Disclaimer

This software is provided "as is" without warranty of any kind. Use at your own risk. Always:
- Test with small amounts first
- Keep your private keys secure
- Backup your database regularly
- Comply with local regulations

**Not financial advice. Cryptocurrency transactions are irreversible.**

---

## 🌟 Star History

If you find this project useful, please consider giving it a star! ⭐

[![GitHub stars](https://img.shields.io/github/stars/trenchsheikh/zlink?style=social)](https://github.com/trenchsheikh/zlink)

---

<div align="center">

**Made with ❤️ for the Zcash community**

[Report Bug](https://github.com/trenchsheikh/zlink/issues) · [Request Feature](https://github.com/trenchsheikh/zlink/issues) · [Documentation](https://github.com/trenchsheikh/zlink/wiki)

</div>
