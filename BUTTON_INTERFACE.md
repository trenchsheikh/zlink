# 🎨 Button Interface Guide

The Zlink bot now features a complete, user-friendly button interface! Users can navigate through all features using interactive buttons instead of typing commands.

## 📱 Main Menu

When users send `/start`, they see:

```
🎉 Welcome to Zlink Bot!

This bot monitors transactions to specific EVM and Solana wallets 
and distributes Zcash rewards via magic links.

How it works:
1. Register your wallet address 
2. Send crypto to monitored wallets
3. Receive a personalized magic link with ZEC
4. Claim your ZEC reward

Choose an option below to get started! 👇
```

**Buttons:**
```
┌────────────────────────┬────────────────────────┐
│  📝 Register Wallet    │   💼 My Wallets        │
├────────────────────────┼────────────────────────┤
│  💰 Set ZEC Address    │   📊 My Statistics     │
├────────────────────────┼────────────────────────┤
│  💎 Bot Balance        │   ❓ Help              │
└────────────────────────┴────────────────────────┘
```

## 📝 Register Wallet Flow

When clicking **"Register Wallet"**, users see:

```
📝 Register Your Wallet

To receive ZEC rewards, register your wallet address:

For EVM (Ethereum/BSC/Polygon):
/register 0xYourWalletAddress

For Solana:
/register YourSolanaAddress

Send the command with your actual wallet address.
```

**Buttons:**
```
┌──────────────────────────────────┐
│        💼 My Wallets             │
├──────────────────┬───────────────┤
│   ❓ Help        │  🏠 Main Menu │
└──────────────────┴───────────────┘
```

After successful registration:

```
✅ Wallet Registered Successfully!

Address: 0x742d35Cc...
Chain: EVM

You will now receive ZEC rewards when you send transactions 
from this wallet to our monitored addresses.
```

**Buttons:**
```
┌────────────────────────┬────────────────────────┐
│  💼 View My Wallets    │  📝 Register Another   │
├────────────────────────┼────────────────────────┤
│  💰 Set ZEC Address    │   🏠 Main Menu         │
└────────────────────────┴────────────────────────┘
```

## 💼 My Wallets View

Shows all registered wallets with:

```
💼 Your Registered Wallets:

1. 0x742d35...5f0bEb
   📅 11/10/2025

2. 7xKXtg2C...osgAsU
   📅 11/10/2025

✅ These wallets are eligible for ZEC rewards!
```

**Buttons:**
```
┌──────────────────────────────────────────┐
│     ➕ Register Another Wallet           │
├────────────────────────┬─────────────────┤
│  💰 Set ZEC Address    │  🏠 Main Menu   │
└────────────────────────┴─────────────────┘
```

## 💰 Set ZEC Address Flow

When clicking **"Set ZEC Address"**:

```
💰 Set Your Zcash Address

Set your Zcash receiving address to claim rewards:

/setaddress t1YourZcashAddress

Supported formats:
• Transparent: t1... or t3...
• Shielded Sapling: zs...
• Shielded Sprout: zc...

Send the command with your actual Zcash address.
```

**Buttons:**
```
┌────────────────────────┬────────────────────┐
│   💼 My Wallets        │   📊 My Stats      │
├────────────────────────┴────────────────────┤
│           🏠 Main Menu                      │
└─────────────────────────────────────────────┘
```

After setting address:

```
✅ Zcash Address Saved!

t1abc123...xyz789

You can now claim magic links sent to you.
```

**Buttons:**
```
┌────────────────────────┬────────────────────┐
│  📊 View My Stats      │   💼 My Wallets    │
├────────────────────────┴────────────────────┤
│           🏠 Main Menu                      │
└─────────────────────────────────────────────┘
```

## 📊 My Statistics

Comprehensive user statistics:

```
📊 Your Statistics

👤 Username: @johndoe
💰 Total Received: 0.05 ZEC
📅 Member Since: 11/10/2025
💼 ZEC Address: ✅ Set
🔗 Registered Wallets: 2
```

**Buttons:**
```
┌───────────────────────┬────────────────────────┐
│  💼 View My Wallets   │  ✏️ Update ZEC Address │
├───────────────────────┼────────────────────────┤
│  📝 Register Wallet   │   🏠 Main Menu         │
└───────────────────────┴────────────────────────┘
```

## 💎 Bot Balance

Shows available ZEC for distribution:

```
💰 Bot Zcash Balance:

100.0 ZEC

This is the amount available for distributing rewards.
```

**Buttons:**
```
┌────────────────────────┬────────────────────┐
│   📊 My Stats          │   🏠 Main Menu     │
└────────────────────────┴────────────────────┘
```

## ❓ Help Screen

Complete help with buttons for quick access:

```
❓ Zlink Bot Help

Quick Actions:
Use the buttons below for quick access!

Commands:
/start - Start the bot
/help - Show this help
/register <wallet> - Register your wallet for rewards
/mywallets - View your registered wallets
/setaddress <address> - Set your Zcash address
/myaddress - View your saved address
/mystats - View your statistics
/balance - Check bot ZEC balance

[... more help text ...]
```

**Buttons:**
```
┌────────────────────────┬────────────────────────┐
│  📝 Register Wallet    │   💼 My Wallets        │
├────────────────────────┼────────────────────────┤
│  💰 Set ZEC Address    │   📊 My Stats          │
├────────────────────────┴────────────────────────┤
│              🏠 Main Menu                       │
└─────────────────────────────────────────────────┘
```

## 🎁 Reward Notification

When a user receives a reward, they get:

```
🎁 You've received a Zlink reward!

💰 Amount: 0.01 ZEC
🔗 Chain: EVM
📝 Transaction: 0x742d35...5f0bEb

Click the link below to claim your reward:
https://yourdomain.com/claim/abc123...

⏰ Expires: 11/11/2025, 10:00 AM

⚠️ Important:
• Only you (@username) can claim this link
• Set your Zcash address using /setaddress before claiming
• Link expires in 24 hours
```

**Buttons:**
```
┌──────────────────────────────────────────┐
│           🎁 Claim Now                   │
├──────────────────────────────────────────┤
│         💼 Set Address                   │
└──────────────────────────────────────────┘
```

## ✨ Key Features

### 1. **Always Accessible**
- Every screen has a "🏠 Main Menu" button
- Users can always get back to the main navigation

### 2. **Context-Aware**
- Buttons change based on user state
- If no ZEC address is set, shows "Set ZEC Address"
- If already set, shows "Update ZEC Address"

### 3. **Smooth Navigation**
- Related actions are grouped together
- Common next steps are always visible
- Reduces need to type commands

### 4. **Visual Hierarchy**
- Primary actions in top rows
- Navigation in bottom rows
- Icons make buttons easy to scan

### 5. **Error Handling**
- Buttons handle errors gracefully
- Shows user-friendly error messages
- Allows retry without losing context

## 🎯 User Flow Example

**New User Flow:**
1. User sends `/start`
2. Clicks **"📝 Register Wallet"**
3. Sees instructions, types `/register 0x...`
4. Clicks **"💰 Set ZEC Address"**
5. Types `/setaddress t1...`
6. Clicks **"📊 My Statistics"** to verify setup
7. Done! ✅

**All done with just 3 commands and button clicks!**

## 🔄 Navigation Map

```
                    🏠 Main Menu
                         │
        ┌────────────────┼────────────────┐
        │                │                │
   📝 Register      💼 My Wallets    💰 Set Address
        │                │                │
        └────────────────┼────────────────┘
                         │
                    📊 My Stats
                         │
                    🏠 Main Menu
```

## 🎨 Design Principles

1. **Minimize Typing**: Users can do most tasks with buttons
2. **Clear Labels**: Button text clearly describes action
3. **Consistent Layout**: Similar screens have similar button layouts
4. **Always Exit**: Every screen offers way back to main menu
5. **Visual Feedback**: Icons make interface more intuitive

## 🚀 Try It Now!

Start your bot with `npm start` and open it in Telegram. You'll see the beautiful button interface in action!

The bot still supports all text commands for power users, but now casual users can navigate easily with buttons.

