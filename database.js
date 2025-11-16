import { MongoClient } from 'mongodb';

class DB {
  constructor() {
    this.client = null;
    this.db = null;
    this.collections = {};
  }

  async connect() {
    if (this.db) return this.db;

    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error('MONGODB_URI environment variable is not set');
    }

    this.client = new MongoClient(uri);
    await this.client.connect();
    this.db = this.client.db();

    // Initialize collections
    this.collections = {
      transactions: this.db.collection('transactions'),
      magicLinks: this.db.collection('magic_links'),
      users: this.db.collection('users'),
      pendingClaims: this.db.collection('pending_claims'),
      adminSessions: this.db.collection('admin_sessions'),
      walletMappings: this.db.collection('wallet_mappings')
    };

    // Create indexes
    await this.createIndexes();
    
    console.log('✅ Connected to MongoDB');
    return this.db;
  }

  async createIndexes() {
    await this.collections.transactions.createIndex({ tx_hash: 1 }, { unique: true });
    await this.collections.magicLinks.createIndex({ link_id: 1 }, { unique: true });
    await this.collections.magicLinks.createIndex({ telegram_user_id: 1 });
    await this.collections.users.createIndex({ telegram_user_id: 1 }, { unique: true });
    await this.collections.pendingClaims.createIndex({ claim_id: 1 }, { unique: true });
    await this.collections.pendingClaims.createIndex({ status: 1 });
    await this.collections.adminSessions.createIndex({ telegram_user_id: 1 }, { unique: true });
    await this.collections.walletMappings.createIndex({ wallet_address: 1 }, { unique: true });
  }

  // Transaction methods
  async saveTransaction(txHash, chain, fromAddress, toAddress, amount) {
    try {
      await this.collections.transactions.insertOne({
        tx_hash: txHash,
        chain,
        from_address: fromAddress,
        to_address: toAddress,
        amount,
        timestamp: Date.now(),
        processed: 0
      });
      return { changes: 1 };
    } catch (error) {
      if (error.code === 11000) return { changes: 0 }; // Duplicate key
      throw error;
    }
  }

  async markTransactionProcessed(txHash) {
    const result = await this.collections.transactions.updateOne(
      { tx_hash: txHash },
      { $set: { processed: 1 } }
    );
    return { changes: result.modifiedCount };
  }

  async getTransaction(txHash) {
    return await this.collections.transactions.findOne({ tx_hash: txHash });
  }

  // Magic link methods
  async createMagicLink(linkId, telegramUserId, telegramUsername, zecAmount, expiresAt, txHash) {
    await this.collections.magicLinks.insertOne({
      link_id: linkId,
      telegram_user_id: telegramUserId,
      telegram_username: telegramUsername,
      zec_amount: zecAmount,
      created_at: Date.now(),
      expires_at: expiresAt,
      tx_hash: txHash,
      claimed: 0,
      claimed_at: null
    });
    return { changes: 1 };
  }

  async getMagicLink(linkId) {
    return await this.collections.magicLinks.findOne({ link_id: linkId });
  }

  async claimMagicLink(linkId) {
    const now = Date.now();
    const result = await this.collections.magicLinks.updateOne(
      { link_id: linkId, claimed: 0, expires_at: { $gt: now } },
      { $set: { claimed: 1, claimed_at: now } }
    );
    return { changes: result.modifiedCount };
  }

  // User methods
  async createOrUpdateUser(telegramUserId, telegramUsername, zcashAddress = null) {
    const update = {
      telegram_username: telegramUsername,
      created_at: Date.now()
    };
    if (zcashAddress) {
      update.zcash_address = zcashAddress;
    }

    await this.collections.users.updateOne(
      { telegram_user_id: telegramUserId },
      { 
        $set: update,
        $setOnInsert: { total_received: '0' }
      },
      { upsert: true }
    );
    return { changes: 1 };
  }

  async saveUserWallet(telegramUserId, telegramUsername, walletAddress) {
    await this.createOrUpdateUser(telegramUserId, telegramUsername);
    
    try {
      await this.collections.walletMappings.updateOne(
        { wallet_address: walletAddress.toLowerCase() },
        {
          $set: {
            telegram_user_id: telegramUserId,
            wallet_address: walletAddress.toLowerCase(),
            created_at: Date.now()
          }
        },
        { upsert: true }
      );
      return { changes: 1 };
    } catch (error) {
      if (error.code === 11000) throw new Error('Wallet already registered');
      throw error;
    }
  }

  async getUserByWallet(walletAddress) {
    const mapping = await this.collections.walletMappings.findOne({
      wallet_address: walletAddress.toLowerCase()
    });
    if (!mapping) return null;
    return await this.collections.users.findOne({ telegram_user_id: mapping.telegram_user_id });
  }

  async getUserWallets(telegramUserId) {
    return await this.collections.walletMappings
      .find({ telegram_user_id: telegramUserId })
      .project({ wallet_address: 1, created_at: 1, _id: 0 })
      .toArray();
  }

  async getUser(telegramUserId) {
    return await this.collections.users.findOne({ telegram_user_id: telegramUserId });
  }

  async updateUserZcashAddress(telegramUserId, zcashAddress) {
    const result = await this.collections.users.updateOne(
      { telegram_user_id: telegramUserId },
      { $set: { zcash_address: zcashAddress } }
    );
    return { changes: result.modifiedCount };
  }

  async incrementUserReceived(telegramUserId, amount) {
    const user = await this.getUser(telegramUserId);
    const currentTotal = parseFloat(user?.total_received || '0');
    const newTotal = (currentTotal + parseFloat(amount)).toString();
    
    const result = await this.collections.users.updateOne(
      { telegram_user_id: telegramUserId },
      { $set: { total_received: newTotal } }
    );
    return { changes: result.modifiedCount };
  }

  // Pending claims methods
  async createPendingClaim(claimId, linkId, telegramUserId, telegramUsername, coinType, amountSent, amountUsd, zcashAmount, zcashAddress, txHash) {
    await this.collections.pendingClaims.insertOne({
      claim_id: claimId,
      link_id: linkId,
      telegram_user_id: telegramUserId,
      telegram_username: telegramUsername,
      coin_type: coinType,
      amount_sent: amountSent,
      amount_usd: amountUsd,
      zcash_amount: zcashAmount,
      zcash_address: zcashAddress,
      tx_hash: txHash,
      status: 'pending',
      created_at: Date.now(),
      processed_at: null,
      admin_notes: null
    });
    return { changes: 1 };
  }

  async getPendingClaims() {
    return await this.collections.pendingClaims
      .find({ status: 'pending' })
      .sort({ created_at: 1 })
      .toArray();
  }

  async getPendingClaim(claimId) {
    return await this.collections.pendingClaims.findOne({ claim_id: claimId });
  }

  async approvePendingClaim(claimId, zcashTxid, adminNotes = '') {
    const result = await this.collections.pendingClaims.updateOne(
      { claim_id: claimId, status: 'pending' },
      { 
        $set: { 
          status: 'approved', 
          processed_at: Date.now(), 
          zcash_txid: zcashTxid,
          admin_notes: adminNotes 
        } 
      }
    );
    return { changes: result.modifiedCount };
  }

  async rejectPendingClaim(claimId, rejectionReason, refundTxHash = null, adminNotes = '') {
    const result = await this.collections.pendingClaims.updateOne(
      { claim_id: claimId, status: 'pending' },
      { 
        $set: { 
          status: 'rejected', 
          processed_at: Date.now(), 
          rejection_reason: rejectionReason,
          refund_tx_hash: refundTxHash,
          admin_notes: adminNotes 
        } 
      }
    );
    return { changes: result.modifiedCount };
  }

  // Admin session methods
  async createAdminSession(telegramUserId, expiryHours = 24) {
    const expiresAt = Date.now() + (expiryHours * 60 * 60 * 1000);
    await this.collections.adminSessions.updateOne(
      { telegram_user_id: telegramUserId },
      {
        $set: {
          telegram_user_id: telegramUserId,
          activated_at: Date.now(),
          expires_at: expiresAt
        }
      },
      { upsert: true }
    );
    return { changes: 1 };
  }

  async isAdminSession(telegramUserId) {
    return await this.collections.adminSessions.findOne({
      telegram_user_id: telegramUserId,
      expires_at: { $gt: Date.now() }
    });
  }

  async clearAdminSession(telegramUserId) {
    const result = await this.collections.adminSessions.deleteOne({
      telegram_user_id: telegramUserId
    });
    return { changes: result.deletedCount };
  }

  // Admin input state methods (for multi-step admin actions)
  async setAdminInputState(telegramUserId, state, data = null) {
    await this.collections.adminSessions.updateOne(
      { telegram_user_id: telegramUserId },
      {
        $set: {
          input_state: state,
          input_data: data,
          input_state_updated: Date.now()
        }
      },
      { upsert: false }
    );
  }

  async getAdminInputState(telegramUserId) {
    const session = await this.collections.adminSessions.findOne({
      telegram_user_id: telegramUserId
    });
    return session ? {
      state: session.input_state,
      data: session.input_data
    } : null;
  }

  async clearAdminInputState(telegramUserId) {
    await this.collections.adminSessions.updateOne(
      { telegram_user_id: telegramUserId },
      {
        $unset: {
          input_state: '',
          input_data: '',
          input_state_updated: ''
        }
      }
    );
  }

  async close() {
    if (this.client) {
      await this.client.close();
      console.log('✅ MongoDB connection closed');
    }
  }
}

// Create instance
const dbInstance = new DB();

// Export connected instance
export default dbInstance;
