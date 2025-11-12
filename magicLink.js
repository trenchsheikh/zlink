import { v4 as uuidv4 } from 'uuid';
import { config } from './config.js';
import db from './database.js';
import zcashService from './zcashService.js';
import priceService from './priceService.js';

class MagicLinkService {
  async generateLink(telegramUserId, telegramUsername, zecAmount, txHash) {
    const linkId = uuidv4();
    const expiresAt = Date.now() + (config.magicLink.expiryHours * 60 * 60 * 1000);
    
    // Save to database
    await db.createMagicLink(
      linkId,
      telegramUserId,
      telegramUsername,
      zecAmount.toString(),
      expiresAt,
      txHash
    );

    const link = `${config.magicLink.baseUrl}/claim/${linkId}`;
    
    console.log(`🔗 Generated magic link for @${telegramUsername}: ${link}`);
    
    return {
      linkId,
      url: link,
      expiresAt,
    };
  }

  async claimLink(linkId, claimingUserId, claimingUsername, zcashAddress, allowSharing = false) {
    const link = await db.getMagicLink(linkId);
    
    if (!link) {
      return {
        success: false,
        error: 'Invalid magic link code',
      };
    }

    // Check if already claimed
    if (link.claimed) {
      return {
        success: false,
        error: 'This magic link has already been claimed',
      };
    }

    // Check if expired
    if (Date.now() > link.expires_at) {
      return {
        success: false,
        error: 'This magic link has expired',
      };
    }

    // Verify the claiming user matches the intended recipient (unless sharing is allowed)
    if (!allowSharing && link.telegram_user_id !== claimingUserId) {
      return {
        success: false,
        error: 'This magic link can only be claimed by @' + link.telegram_username,
      };
    }

    // Validate Zcash address
    if (!zcashService.isValidAddress(zcashAddress)) {
      return {
        success: false,
        error: 'Invalid Zcash address',
      };
    }

    try {
      // Get transaction details to calculate USD value
      const transaction = await db.getTransaction(link.tx_hash);
      if (!transaction) {
        return {
          success: false,
          error: 'Transaction data not found',
        };
      }

      // Calculate USD value and Zcash amount with fee
      const coinSymbol = priceService.getCoinFromChain(transaction.chain);
      const amountUsd = priceService.toUSD(transaction.amount, coinSymbol);

      // Check minimum
      if (!priceService.meetsMinimum(amountUsd)) {
        return {
          success: false,
          error: `Minimum transfer amount is ${priceService.formatUSD(priceService.minimumUsd)}. Your transaction is ${priceService.formatUSD(amountUsd)}.`,
        };
      }

      // Calculate Zcash amount after 1% fee
      const zcashAmount = priceService.calculateZcashAmount(amountUsd);

      // Create pending claim for admin approval
      const claimId = uuidv4();
      await db.createPendingClaim(
        claimId,
        linkId,
        claimingUserId,
        claimingUsername,
        coinSymbol,
        transaction.amount,
        amountUsd.toFixed(2),
        zcashAmount.toFixed(6),
        zcashAddress,
        transaction.tx_hash
      );

      // Mark magic link as claimed
      await db.claimMagicLink(linkId);

      // Update user's Zcash address
      try {
        await db.createOrUpdateUser(claimingUserId, claimingUsername, zcashAddress);
        await db.updateUserZcashAddress(claimingUserId, zcashAddress);
      } catch (error) {
        console.log('Note: Could not update user info');
      }

      console.log(`📋 Created pending claim ${claimId} for @${claimingUsername}`);
      console.log(`   Amount: ${transaction.amount} ${coinSymbol} ($${amountUsd.toFixed(2)} USD)`);
      console.log(`   ZEC to send: ${zcashAmount.toFixed(6)} ZEC (after 1% fee)`);

      // Return success with "processing" status for user
      return {
        success: true,
        processing: true,
        amount: zcashAmount.toFixed(6),
        zcashAddress: zcashAddress,
        originalRecipient: link.telegram_username,
        estimatedTime: '5-7 minutes',
      };
    } catch (error) {
      console.error('Error claiming link:', error);
      return {
        success: false,
        error: 'An error occurred while processing your claim',
      };
    }
  }

  async getLinkInfo(linkId) {
    const link = await db.getMagicLink(linkId);
    
    if (!link) {
      return null;
    }

    return {
      linkId: link.link_id,
      amount: link.zec_amount,
      recipientUsername: link.telegram_username,
      claimed: link.claimed === 1,
      expired: Date.now() > link.expires_at,
      expiresAt: link.expires_at,
      claimedAt: link.claimed_at,
    };
  }

  // Extract link code from URL or return as-is if already a code
  extractLinkCode(input) {
    if (!input) return null;
    
    // If it's a URL, extract the code from the end
    if (input.includes('/claim/')) {
      const parts = input.split('/claim/');
      return parts[parts.length - 1];
    }
    
    // Otherwise assume it's already a code
    return input.trim();
  }
}

export default new MagicLinkService();

