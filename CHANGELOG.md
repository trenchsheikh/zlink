# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-11-10

### Added
- 🎉 Initial release of Zlink
- 🤖 Telegram bot interface with interactive button menus
- 🔗 Multi-chain support (Ethereum, BSC, Polygon, Solana)
- 💰 Automatic Zcash distribution via magic links
- 🎁 Shareable and transferable magic links
- 📱 In-Telegram claim functionality with `/claim` command
- 🌐 Web-based claim interface
- 📊 User statistics and wallet management
- 🗄️ SQLite database for transaction and user tracking
- 🔒 Secure magic link generation with UUID codes
- ⏰ Time-limited links (24h expiry default)
- 🎨 Beautiful button-based navigation
- 📝 Wallet registration system
- 🔐 Address validation for all supported chains
- 📈 Real-time transaction monitoring
- 🌟 Mock mode for testing without Zcash node

### Commands Implemented
- `/start` - Welcome and main menu
- `/claim <code> <address>` - Claim ZEC with magic link code
- `/howtoget` - Show where to send crypto
- `/register <wallet>` - Register wallet address
- `/mywallets` - View registered wallets
- `/setaddress <address>` - Set Zcash receiving address
- `/mystats` - View user statistics
- `/help` - Show help information

### Features
- EVM transaction monitoring (Ethereum, BSC, Polygon)
- Solana transaction monitoring
- Zcash integration via RPC
- Magic link generation and management
- User-to-wallet mapping
- Transaction confirmation waiting
- Automatic user notifications
- Web server for magic link claims
- Database auto-creation and migration
- Graceful error handling
- Configurable via environment variables

### Documentation
- Comprehensive README with setup instructions
- Quick start guide
- Detailed setup documentation
- Claim feature documentation
- Button interface documentation
- Technical project overview
- Contributing guidelines
- Code of conduct
- Issue and PR templates
- MIT License

### Security
- UUID-based magic link codes
- Address format validation
- Time-limited links
- Single-use claim protection
- RPC authentication
- Input sanitization

## [Unreleased]

### Planned Features
- [ ] Multi-language support
- [ ] Custom ZEC amounts based on input value
- [ ] Support for additional blockchains
- [ ] QR codes for magic links
- [ ] Referral system
- [ ] Advanced analytics dashboard
- [ ] Email notifications
- [ ] API for third-party integrations
- [ ] Batch claim processing

---

## Version History

- **1.0.0** (2025-11-10) - Initial release

---

## How to Update

To update to the latest version:

```bash
cd zlink
git pull origin main
npm install
npm start
```

---

## Breaking Changes

None yet! This is the initial release.

---

## Migration Guide

None required for initial release.

---

**Repository**: [https://github.com/trenchsheikh/zlink](https://github.com/trenchsheikh/zlink)

