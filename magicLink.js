import { v4 as uuidv4 } from 'uuid';
import { config } from './config.js';
import db from './database.js';
import zcashService from './zcashService.js';

class MagicLinkService {
  generateLink(telegramUserId, telegramUsername, zecAmount, txHash) {
    const linkId = uuidv4();
    const expiresAt = Date.now() + (config.magicLink.expiryHours * 60 * 60 * 1000);
    
    // Save to database
    db.createMagicLink(
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
    const link = db.getMagicLink(linkId);
    
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
      // Send Zcash
      const result = await zcashService.sendZcash(
        zcashAddress,
        link.zec_amount,
        `Zlink claim by @${claimingUsername}`
      );

      if (result.success) {
        // Mark as claimed
        db.claimMagicLink(linkId);
        
        // Update user's Zcash address if they exist in system
        try {
          db.createOrUpdateUser(claimingUserId, claimingUsername, zcashAddress);
          db.updateUserZcashAddress(claimingUserId, zcashAddress);
          
          // Increment user's total received
          db.incrementUserReceived(claimingUserId, link.zec_amount);
        } catch (error) {
          console.log('Note: Could not update user stats (user may not be registered)');
        }

        return {
          success: true,
          amount: link.zec_amount,
          txid: result.txid,
          zcashAddress: zcashAddress,
          originalRecipient: link.telegram_username,
        };
      } else {
        return {
          success: false,
          error: 'Failed to send Zcash. Please try again later.',
        };
      }
    } catch (error) {
      console.error('Error claiming link:', error);
      return {
        success: false,
        error: 'An error occurred while processing your claim',
      };
    }
  }

  getLinkInfo(linkId) {
    const link = db.getMagicLink(linkId);
    
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

