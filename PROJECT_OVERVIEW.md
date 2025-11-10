# 📋 Zlink Project Overview

## What is Zlink?

**Zlink** is a Telegram bot that operates as an instant crypto-to-Zcash exchange service. Users send ETH, BNB, MATIC, or SOL to your addresses and receive Zcash (ZEC) back via shareable magic links.

---

## 🎯 Core Concept

```
User sends crypto → Bot detects → Generates magic link → User claims ZEC
```

**Key Innovation:** Magic links are shareable! Anyone with the code can claim the ZEC, making it perfect for gifting and rewards.

---

## 📁 File Structure & Descriptions

### Core Application Files

#### `index.js` - Main Application Entry Point
**Purpose:** Orchestrates all components and handles the main application flow.

**Key Functions:**
- Initializes all services (bot, monitors, web server)
- Links transactions to Telegram users via database lookup
- Coordinates between transaction detection and notification
- Handles graceful shutdown

**Important Methods:**
- `handleTransaction()` - Processes detected transactions
- `getUserFromTransaction()` - Identifies which user to notify
- `start()` - Initializes all services
- `stop()` - Clean shutdown

---

#### `bot.js` - Telegram Bot Interface
**Purpose:** Handles all Telegram bot interactions and user commands.

**Key Features:**
- Button-based navigation menus
- Command handlers for all user actions
- Magic link notification system
- In-bot claim processing with `/claim` command

**Commands Implemented:**
- `/start` - Welcome and main menu
- `/claim <code> <address>` - Claim ZEC in Telegram
- `/register <wallet>` - Register user's wallet
- `/howtoget` - Show where to send crypto
- `/mywallets` - View registered wallets
- `/setaddress <address>` - Set Zcash receiving address
- `/mystats` - View user statistics
- `/help` - Help information

**Helper Functions:**
- `showMainMenu()` - Display main menu
- `showGetStarted()` - Onboarding guide
- `showHowToGet()` - Display service addresses
- `showHowToClaim()` - Claim instructions
- `notifyUser()` - Send magic link to user

---

#### `evmMonitor.js` - Ethereum/BSC/Polygon Monitoring
**Purpose:** Monitors EVM-compatible blockchains for incoming transactions.

**How It Works:**
1. Connects to EVM RPC endpoint
2. Subscribes to new blocks
3. Scans each block for transactions to your address
4. Waits for 3 confirmations
5. Triggers callback with transaction data

**Key Features:**
- Real-time block monitoring via WebSocket
- Transaction confirmation waiting
- Recent block scanning on startup
- Graceful error handling

**Configuration:**
- `EVM_RPC_URL` - RPC endpoint (Alchemy/Infura)
- `EVM_WALLET_ADDRESS` - Your receiving address

---

#### `solanaMonitor.js` - Solana Monitoring
**Purpose:** Monitors Solana blockchain for incoming SOL transactions.

**How It Works:**
1. Connects to Solana RPC
2. Subscribes to account changes
3. Polls for new transactions
4. Parses transaction to find sender
5. Triggers callback with transaction data

**Key Features:**
- Account change subscriptions
- Backup polling mechanism (every 10s)
- Recent transaction scanning
- Balance change detection

**Configuration:**
- `SOLANA_RPC_URL` - RPC endpoint
- `SOL_WALLET_ADDRESS` - Your receiving address

---

#### `zcashService.js` - Zcash Integration
**Purpose:** Handles sending Zcash to users' addresses.

**How It Works:**
1. Connects to Zcash node via RPC
2. Validates recipient address
3. Creates and sends transaction
4. Waits for operation completion
5. Returns transaction ID

**Key Features:**
- Support for transparent and shielded addresses
- Address validation
- Transaction memo support
- Mock mode for testing (when node unavailable)

**Supported Address Types:**
- Transparent: `t1...`, `t3...`
- Shielded Sapling: `zs...`
- Shielded Sprout: `zc...`

**Configuration:**
- `ZCASH_RPC_URL` - Node RPC URL
- `ZCASH_RPC_USER` - RPC username
- `ZCASH_RPC_PASSWORD` - RPC password
- `ZCASH_WALLET_ADDRESS` - Sending address

---

#### `magicLink.js` - Magic Link System
**Purpose:** Generates and manages shareable ZEC claim links.

**Key Functions:**

**`generateLink(userId, username, amount, txHash)`**
- Creates unique UUID code
- Sets expiration time (24h default)
- Saves to database
- Returns claim URL

**`claimLink(linkId, userId, username, address, allowSharing)`**
- Validates link code and expiration
- Checks if already claimed
- Validates Zcash address
- Sends ZEC via zcashService
- Marks link as claimed
- Updates user statistics

**`extractLinkCode(input)`**
- Extracts code from full URL
- Handles both codes and URLs

**Key Features:**
- Shareable links (when `allowSharing = true`)
- Time-limited (configurable expiry)
- Single-use (prevents double claims)
- Tracks original recipient

---

#### `database.js` - SQLite Database Operations
**Purpose:** Manages all data persistence using SQLite.

**Tables:**

**`users`**
- Telegram user information
- Saved Zcash addresses
- Total ZEC received
- Registration date

**`wallet_mappings`**
- Links crypto wallets to Telegram users
- Enables user identification from transactions

**`transactions`**
- All detected blockchain transactions
- Processing status
- Chain information

**`magic_links`**
- Generated claim links
- Claim status and timestamps
- Link to transactions

**Key Methods:**
- `saveUserWallet()` - Register user's crypto wallet
- `getUserByWallet()` - Find user from wallet address
- `createMagicLink()` - Create new claim link
- `claimMagicLink()` - Mark link as claimed
- `getUserWallets()` - Get user's registered wallets

---

#### `webServer.js` - HTTP Server
**Purpose:** Hosts web interface for magic link claims.

**Endpoints:**

**GET /** - Home page with service info

**GET /claim/:linkId** - Claim page for specific link
- Shows claim form
- Validates link status
- Beautiful UI

**POST /claim/:linkId** - Process claim
- Accepts: userId, username, zcashAddress
- Validates inputs
- Calls magicLink.claimLink()
- Returns success/error

**Features:**
- CORS enabled
- Mobile-responsive design
- Real-time validation
- Error handling

---

#### `config.js` - Configuration Management
**Purpose:** Loads and validates environment variables.

**Configuration Sections:**
- `telegram` - Bot token
- `evm` - Ethereum/BSC/Polygon settings
- `solana` - Solana settings
- `zcash` - Zcash node settings
- `magicLink` - Link configuration
- `distribution` - ZEC amounts

**`validateConfig()`**
- Checks required variables
- Warns about missing optional configs
- Prevents startup with invalid config

---

## 🔄 System Flow

### 1. User Registration Flow
```
User sends: /register 0xWalletAddress
     ↓
bot.js validates address format
     ↓
database.js saves wallet mapping
     ↓
User receives confirmation
```

### 2. Transaction Detection Flow
```
User sends ETH to your address
     ↓
evmMonitor.js detects transaction
     ↓
index.js receives transaction data
     ↓
index.js looks up user via getUserFromTransaction()
     ↓
database.js returns user from wallet_mappings
     ↓
index.js calls bot.notifyUser()
```

### 3. Magic Link Generation Flow
```
bot.notifyUser() called with userId
     ↓
magicLink.generateLink() creates unique code
     ↓
database.js saves magic link record
     ↓
bot.js sends message with code to user
```

### 4. Claim Flow (Telegram)
```
User types: /claim abc123 t1ZcashAddress
     ↓
bot.js validates inputs
     ↓
magicLink.claimLink() processes claim
     ↓
zcashService.js sends ZEC
     ↓
database.js marks link as claimed
     ↓
User receives success message with txid
```

### 5. Claim Flow (Web)
```
User clicks web link
     ↓
webServer.js serves claim page
     ↓
User fills form with address
     ↓
POST to /claim/:linkId
     ↓
magicLink.claimLink() processes
     ↓
zcashService.js sends ZEC
     ↓
Success page displayed
```

---

## 🗄️ Database Schema

### users
```sql
telegram_user_id (INTEGER, PRIMARY KEY)
telegram_username (TEXT)
zcash_address (TEXT)
created_at (INTEGER)
total_received (TEXT)
```

### wallet_mappings
```sql
id (INTEGER, PRIMARY KEY)
telegram_user_id (INTEGER)
wallet_address (TEXT, UNIQUE)
chain (TEXT)
created_at (INTEGER)
```

### transactions
```sql
id (INTEGER, PRIMARY KEY)
tx_hash (TEXT, UNIQUE)
chain (TEXT)
from_address (TEXT)
to_address (TEXT)
amount (TEXT)
timestamp (INTEGER)
processed (INTEGER)
```

### magic_links
```sql
id (INTEGER, PRIMARY KEY)
link_id (TEXT, UNIQUE)
telegram_user_id (INTEGER)
telegram_username (TEXT)
zec_amount (TEXT)
created_at (INTEGER)
expires_at (INTEGER)
claimed (INTEGER)
claimed_at (INTEGER)
tx_hash (TEXT)
```

---

## 🔐 Security Features

### Magic Links
- ✅ UUID-based codes (unguessable)
- ✅ Time-limited (24h expiry)
- ✅ Single-use (prevents replay)
- ✅ Address validation

### Wallet Registration
- ✅ Format validation
- ✅ Unique constraint (one wallet = one user)
- ✅ Case-insensitive matching

### Transaction Processing
- ✅ Confirmation waiting (3 blocks for EVM)
- ✅ Duplicate detection
- ✅ Amount validation

### Zcash Sending
- ✅ Address format validation
- ✅ Balance checking
- ✅ RPC authentication
- ✅ Mock mode for testing

---

## 📊 Data Flow Diagram

```
┌─────────────┐
│   User      │
│  (Telegram) │
└──────┬──────┘
       │
       │ /register 0xWallet
       ↓
┌──────────────┐
│   bot.js     │
└──────┬───────┘
       │
       │ saveUserWallet()
       ↓
┌──────────────┐
│ database.js  │
└──────┬───────┘
       │
       │ wallet_mappings table
       └─────────────────┐
                         │
┌────────────────────────┴──┐
│ User sends ETH to address │
└────────────┬──────────────┘
             │
             ↓
┌──────────────────┐
│ evmMonitor.js    │
│ (detects tx)     │
└─────────┬────────┘
          │
          │ onTransaction()
          ↓
┌──────────────────┐
│   index.js       │
│ handleTransaction│
└─────────┬────────┘
          │
          │ getUserByWallet()
          ↓
┌──────────────────┐
│  database.js     │
│ (lookup user)    │
└─────────┬────────┘
          │
          │ returns userId
          ↓
┌──────────────────┐
│   index.js       │
│ bot.notifyUser() │
└─────────┬────────┘
          │
          │ generateLink()
          ↓
┌──────────────────┐
│  magicLink.js    │
│ (creates link)   │
└─────────┬────────┘
          │
          │ saves to database
          ↓
┌──────────────────┐
│  bot.js          │
│ (sends message)  │
└─────────┬────────┘
          │
          │ Message with code
          ↓
┌──────────────────┐
│    User          │
│ /claim code addr │
└─────────┬────────┘
          │
          ↓
┌──────────────────┐
│  bot.js          │
│ (validates)      │
└─────────┬────────┘
          │
          │ claimLink()
          ↓
┌──────────────────┐
│  magicLink.js    │
│ (processes)      │
└─────────┬────────┘
          │
          │ sendZcash()
          ↓
┌──────────────────┐
│ zcashService.js  │
│ (sends ZEC)      │
└─────────┬────────┘
          │
          │ txid returned
          ↓
┌──────────────────┐
│  User            │
│ (receives ZEC)   │
└──────────────────┘
```

---

## 🚀 Startup Sequence

1. `index.js` initializes
2. `config.js` loads environment variables
3. `database.js` creates/opens SQLite database
4. `bot.js` connects to Telegram
5. `evmMonitor.js` connects to EVM RPC
6. `solanaMonitor.js` connects to Solana RPC
7. `webServer.js` starts HTTP server on port 3000
8. All monitors start scanning for transactions
9. Bot sets commands in Telegram
10. System ready! ✅

---

## 🎨 User Interface Elements

### Main Menu Buttons
- 🚀 Get Started
- 💰 Get ZEC
- 💼 My Wallets
- 📊 My Statistics
- ❓ Help
- ⚙️ Settings

### Notification Buttons
- 🌐 Claim via Web
- ⚙️ Set ZEC Address
- ❓ How to Claim

### All buttons are context-aware and guide users through the flow!

---

## 💡 Key Design Decisions

### Why Shareable Links?
- More flexible than user-locked links
- Enables gifting and rewards
- Viral potential
- Better UX

### Why SQLite?
- Zero configuration
- File-based (easy backup)
- Fast for this use case
- No separate server needed

### Why Telegram?
- Built-in identity (user ID)
- Easy notifications
- Beautiful UI with buttons
- Widespread adoption

### Why Magic Links?
- User can set address before claiming
- Secure (UUID-based)
- Time-limited (prevents abuse)
- Trackable

---

## 🔮 Future Enhancement Ideas

- [ ] Multi-language support
- [ ] Custom ZEC amounts based on input crypto value
- [ ] Support for more blockchains (Avalanche, Arbitrum, etc.)
- [ ] QR codes for magic links
- [ ] Referral system
- [ ] Advanced statistics dashboard
- [ ] Email notifications as backup
- [ ] API for third-party integrations
- [ ] Link preview in Telegram
- [ ] Batch processing for multiple claims

---

## 📝 Environment Variables Quick Reference

| Variable | Required | Purpose |
|----------|----------|---------|
| `TELEGRAM_BOT_TOKEN` | ✅ Yes | Bot authentication |
| `EVM_RPC_URL` | ⚠️ Optional | Ethereum/BSC/Polygon endpoint |
| `EVM_WALLET_ADDRESS` | ⚠️ Optional | Your receiving address (EVM) |
| `SOLANA_RPC_URL` | ⚠️ Optional | Solana endpoint |
| `SOL_WALLET_ADDRESS` | ⚠️ Optional | Your receiving address (SOL) |
| `ZCASH_RPC_URL` | ⚠️ Optional | Zcash node (mock if missing) |
| `ZCASH_RPC_USER` | ⚠️ Optional | Zcash RPC username |
| `ZCASH_RPC_PASSWORD` | ⚠️ Optional | Zcash RPC password |
| `ZCASH_WALLET_ADDRESS` | ⚠️ Optional | ZEC sending address |
| `BASE_URL` | ⚠️ Optional | Your domain (default: localhost) |
| `LINK_EXPIRY_HOURS` | ⚠️ Optional | Link duration (default: 24) |
| `ZEC_AMOUNT_PER_TRANSACTION` | ⚠️ Optional | ZEC per claim (default: 0.01) |

---

## 🎓 Learning Resources

**To understand the code better, read in this order:**

1. `README.md` - Overall project understanding
2. `config.js` - See what's configurable
3. `database.js` - Understand data structure
4. `index.js` - See how everything connects
5. `bot.js` - Learn user interactions
6. `evmMonitor.js` - Understand transaction detection
7. `magicLink.js` - Learn claim system
8. `zcashService.js` - See ZEC sending

---

**This document should give you a complete understanding of how Zlink works! 🚀**

