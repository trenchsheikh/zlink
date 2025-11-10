import Database from 'better-sqlite3';

class DB {
  constructor() {
    this.db = new Database('zlink.db');
    this.init();
  }

  init() {
    // Create tables
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tx_hash TEXT UNIQUE NOT NULL,
        chain TEXT NOT NULL,
        from_address TEXT NOT NULL,
        to_address TEXT NOT NULL,
        amount TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        processed INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS magic_links (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        link_id TEXT UNIQUE NOT NULL,
        telegram_user_id INTEGER NOT NULL,
        telegram_username TEXT NOT NULL,
        zec_amount TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL,
        claimed INTEGER DEFAULT 0,
        claimed_at INTEGER,
        tx_hash TEXT,
        FOREIGN KEY (tx_hash) REFERENCES transactions(tx_hash)
      );

      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        telegram_user_id INTEGER UNIQUE NOT NULL,
        telegram_username TEXT,
        zcash_address TEXT,
        created_at INTEGER NOT NULL,
        total_received TEXT DEFAULT '0'
      );

      CREATE INDEX IF NOT EXISTS idx_tx_hash ON transactions(tx_hash);
      CREATE INDEX IF NOT EXISTS idx_link_id ON magic_links(link_id);
      CREATE INDEX IF NOT EXISTS idx_telegram_user ON magic_links(telegram_user_id);
    `);
  }

  // Transaction methods
  saveTransaction(txHash, chain, fromAddress, toAddress, amount) {
    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO transactions (tx_hash, chain, from_address, to_address, amount, timestamp)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    return stmt.run(txHash, chain, fromAddress, toAddress, amount, Date.now());
  }

  markTransactionProcessed(txHash) {
    const stmt = this.db.prepare('UPDATE transactions SET processed = 1 WHERE tx_hash = ?');
    return stmt.run(txHash);
  }

  getTransaction(txHash) {
    const stmt = this.db.prepare('SELECT * FROM transactions WHERE tx_hash = ?');
    return stmt.get(txHash);
  }

  // Magic link methods
  createMagicLink(linkId, telegramUserId, telegramUsername, zecAmount, expiresAt, txHash) {
    const stmt = this.db.prepare(`
      INSERT INTO magic_links (link_id, telegram_user_id, telegram_username, zec_amount, created_at, expires_at, tx_hash)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    return stmt.run(linkId, telegramUserId, telegramUsername, zecAmount, Date.now(), expiresAt, txHash);
  }

  getMagicLink(linkId) {
    const stmt = this.db.prepare('SELECT * FROM magic_links WHERE link_id = ?');
    return stmt.get(linkId);
  }

  claimMagicLink(linkId) {
    const stmt = this.db.prepare(`
      UPDATE magic_links 
      SET claimed = 1, claimed_at = ? 
      WHERE link_id = ? AND claimed = 0 AND expires_at > ?
    `);
    return stmt.run(Date.now(), linkId, Date.now());
  }

  // User methods
  createOrUpdateUser(telegramUserId, telegramUsername, zcashAddress = null) {
    const stmt = this.db.prepare(`
      INSERT INTO users (telegram_user_id, telegram_username, zcash_address, created_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(telegram_user_id) DO UPDATE SET
        telegram_username = excluded.telegram_username,
        zcash_address = COALESCE(excluded.zcash_address, zcash_address)
    `);
    return stmt.run(telegramUserId, telegramUsername, zcashAddress, Date.now());
  }

  // Wallet mapping methods (for connecting transactions to users)
  saveUserWallet(telegramUserId, telegramUsername, walletAddress) {
    // First ensure user exists
    this.createOrUpdateUser(telegramUserId, telegramUsername);
    
    // Create wallet_mappings table if it doesn't exist
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS wallet_mappings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        telegram_user_id INTEGER NOT NULL,
        wallet_address TEXT NOT NULL,
        chain TEXT,
        created_at INTEGER NOT NULL,
        UNIQUE(wallet_address),
        FOREIGN KEY (telegram_user_id) REFERENCES users(telegram_user_id)
      );
      CREATE INDEX IF NOT EXISTS idx_wallet_address ON wallet_mappings(wallet_address);
    `);
    
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO wallet_mappings (telegram_user_id, wallet_address, created_at)
      VALUES (?, ?, ?)
    `);
    return stmt.run(telegramUserId, walletAddress.toLowerCase(), Date.now());
  }

  getUserByWallet(walletAddress) {
    const stmt = this.db.prepare(`
      SELECT u.* FROM users u
      JOIN wallet_mappings w ON u.telegram_user_id = w.telegram_user_id
      WHERE LOWER(w.wallet_address) = LOWER(?)
    `);
    return stmt.get(walletAddress);
  }

  getUserWallets(telegramUserId) {
    const stmt = this.db.prepare(`
      SELECT wallet_address, created_at FROM wallet_mappings
      WHERE telegram_user_id = ?
    `);
    return stmt.all(telegramUserId);
  }

  getUser(telegramUserId) {
    const stmt = this.db.prepare('SELECT * FROM users WHERE telegram_user_id = ?');
    return stmt.get(telegramUserId);
  }

  updateUserZcashAddress(telegramUserId, zcashAddress) {
    const stmt = this.db.prepare('UPDATE users SET zcash_address = ? WHERE telegram_user_id = ?');
    return stmt.run(zcashAddress, telegramUserId);
  }

  incrementUserReceived(telegramUserId, amount) {
    const user = this.getUser(telegramUserId);
    const currentTotal = parseFloat(user?.total_received || '0');
    const newTotal = (currentTotal + parseFloat(amount)).toString();
    
    const stmt = this.db.prepare('UPDATE users SET total_received = ? WHERE telegram_user_id = ?');
    return stmt.run(newTotal, telegramUserId);
  }

  close() {
    this.db.close();
  }
}

export default new DB();

