# 🎁 Magic Link Claim Feature

## Overview

Users can now claim Zcash directly through the Telegram bot using the `/claim` command! Magic links are **shareable and transferable** - anyone with the code can claim the ZEC.

## How It Works

### For Recipients

When a user sends crypto to your address, they receive a notification like this:

```
🎉 Your ZEC is Ready!

💰 Amount: 0.01 ZEC
🔗 Chain: EVM
📝 Transaction: 0x742d35...5f0bEb

Claim your Zcash:

🔑 Code: abc123-def456-789xyz

Option 1: Click button below
Option 2: Use command in chat:
/claim abc123-def456-789xyz t1YourZcashAddress

⏰ Expires: 11/11/2025, 10:00 AM

💡 Tip: You can share this code with anyone! Magic links are transferable.
```

### Two Ways to Claim

**Option 1: Via Telegram Bot** ⭐ (Recommended)
```
/claim abc123-def456-789xyz t1YourZcashAddress
```

**Option 2: Via Web Browser**
Click the "🌐 Claim via Web" button in the notification

## Command Usage

### Basic Claim
```bash
/claim <code> <zcash_address>
```

**Example:**
```bash
/claim abc123-def456 t1YourZcashAddress
```

### With Full URL
You can also paste the full magic link URL:
```bash
/claim https://yourdomain.com/claim/abc123-def456 t1YourAddress
```

The bot automatically extracts the code from the URL!

### Get Help
Just type `/claim` without arguments to see instructions:
```bash
/claim
```

## Sharing Features

### Magic Links Are Transferable! ✨

- **Share with friends**: Send the code to anyone on Telegram
- **Gift ZEC**: Give the code to someone else to claim
- **Save for later**: Claim when convenient (before expiry)

### Example Use Cases

**Gifting:**
```
Alice receives ZEC code: abc123-def456
Alice shares code with Bob via Telegram
Bob claims: /claim abc123-def456 t1BobZcashAddress
Bob receives the ZEC!
```

**Group Rewards:**
```
Share a magic link code in a Telegram group
First person to claim gets the ZEC
```

## Security & Validation

### What's Validated:
✅ **Link Code** - Must be valid UUID format
✅ **Zcash Address** - Must be valid format (t1, t3, zs, zc)
✅ **Expiry** - Links expire after 24 hours
✅ **Single Use** - Once claimed, cannot be reused

### What's NOT Restricted:
❌ **User Identity** - Anyone can claim (when sharing enabled)
❌ **Location** - Claim from anywhere
❌ **Device** - Claim from any device

## Claim Process

```
User enters: /claim abc123 t1ZcashAddress
          ↓
Bot validates code and address
          ↓
Bot sends ZEC via zcashService
          ↓
User receives success message with txid
          ↓
ZEC appears in user's wallet
```

## Success Response

```
✅ Claim Successful!

💰 Amount: 0.01 ZEC
📍 Sent to: t1YourZcashAddress
🔗 Transaction: mock_txid_1699...
🎁 Originally for: @alice

Your Zcash has been sent! Check your wallet in a few minutes.
```

## Error Handling

### Common Errors:

**Invalid Code:**
```
❌ Claim Failed
Invalid magic link code
```

**Already Claimed:**
```
❌ Claim Failed
This magic link has already been claimed
```

**Expired Link:**
```
❌ Claim Failed
This magic link has expired
```

**Invalid Address:**
```
❌ Invalid Zcash address format.

Supported formats:
• t1... (transparent)
• t3... (transparent testnet)
• zs... (shielded sapling)
• zc... (shielded sprout)
```

## Technical Details

### Files Modified:

1. **bot.js**
   - Added `/claim` command handler
   - Added `showHowToClaim()` helper function
   - Updated notification message to show code
   - Updated help command

2. **magicLink.js**
   - Added `allowSharing` parameter to `claimLink()`
   - Added `extractLinkCode()` helper function
   - Updated claim logic to support sharing
   - Added `originalRecipient` to success response

### Database:

No database changes needed! Uses existing `magic_links` table.

### API:

```javascript
// Claim with sharing enabled
magicLink.claimLink(
  linkId,           // UUID code
  claimingUserId,   // Telegram user ID
  claimingUsername, // Telegram username
  zcashAddress,     // User's ZEC address
  true              // allowSharing = true
);

// Extract code from URL
const code = magicLink.extractLinkCode(
  'https://domain.com/claim/abc123'
); // Returns: 'abc123'
```

## Benefits

### For Users:
- ✅ Claim directly in Telegram (faster)
- ✅ No need to open web browser
- ✅ Can share rewards with others
- ✅ Flexible claiming options

### For Service:
- ✅ More user-friendly
- ✅ Increased engagement
- ✅ Viral potential (sharing)
- ✅ Better UX

## Testing

### Test the Feature:

1. **Start bot:**
   ```bash
   npm start
   ```

2. **Register a wallet:**
   ```
   /register 0xYourTestWallet
   ```

3. **Set ZEC address:**
   ```
   /setaddress t1YourTestAddress
   ```

4. **Simulate a transaction** (for testing, manually create a magic link)

5. **Claim it:**
   ```
   /claim <code> t1YourZecAddress
   ```

### Test Sharing:

1. User A receives magic link code
2. User A shares code with User B
3. User B claims: `/claim <code> t1UserBAddress`
4. User B receives the ZEC ✅

## Configuration

No configuration changes needed! Everything works with existing settings in `.env`:

```env
LINK_EXPIRY_HOURS=24
ZEC_AMOUNT_PER_TRANSACTION=0.01
```

## Future Enhancements

Possible improvements:
- [ ] Add PIN protection for links
- [ ] Custom expiry times per link
- [ ] Claim history tracking
- [ ] Link analytics (views, shares)
- [ ] QR codes for links
- [ ] Multi-claim links (split among multiple users)

---

**Status:** ✅ Fully Implemented & Ready to Use

**Version:** 1.0.0

**Last Updated:** November 10, 2025

