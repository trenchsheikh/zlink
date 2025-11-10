import dotenv from 'dotenv';
dotenv.config();

export const config = {
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN,
  },
  base: {
    rpcUrl: process.env.BASE_RPC_URL || 'https://mainnet.base.org',
    walletAddress: process.env.BASE_WALLET_ADDRESS,
    chainId: 8453,
    name: 'Base',
  },
  bnb: {
    rpcUrl: process.env.BNB_RPC_URL || 'https://bsc-dataseed.binance.org',
    walletAddress: process.env.BNB_WALLET_ADDRESS,
    chainId: 56,
    name: 'BNB Smart Chain',
  },
  solana: {
    rpcUrl: process.env.SOLANA_RPC_URL,
    walletAddress: process.env.SOL_WALLET_ADDRESS,
  },
  zcash: {
    rpcUrl: process.env.ZCASH_RPC_URL,
    rpcUser: process.env.ZCASH_RPC_USER,
    rpcPassword: process.env.ZCASH_RPC_PASSWORD,
    walletAddress: process.env.ZCASH_WALLET_ADDRESS,
  },
  magicLink: {
    baseUrl: process.env.BASE_URL || 'http://localhost:3000',
    expiryHours: parseInt(process.env.LINK_EXPIRY_HOURS) || 24,
  },
  distribution: {
    zecAmount: parseFloat(process.env.ZEC_AMOUNT_PER_TRANSACTION) || 0.01,
  },
};

export function validateConfig() {
  const required = [
    'TELEGRAM_BOT_TOKEN',
  ];
  
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  // Warn about optional configurations
  const warnings = [];
  
  if (!process.env.BASE_WALLET_ADDRESS) {
    warnings.push('⚠️  Base monitoring not configured (missing BASE_WALLET_ADDRESS)');
  }
  
  if (!process.env.BNB_WALLET_ADDRESS) {
    warnings.push('⚠️  BNB Smart Chain monitoring not configured (missing BNB_WALLET_ADDRESS)');
  }
  
  if (!process.env.SOLANA_RPC_URL || !process.env.SOL_WALLET_ADDRESS) {
    warnings.push('⚠️  Solana monitoring not configured (missing SOLANA_RPC_URL or SOL_WALLET_ADDRESS)');
  }
  
  if (!process.env.ZCASH_RPC_URL || !process.env.ZCASH_RPC_USER || !process.env.ZCASH_RPC_PASSWORD) {
    warnings.push('⚠️  Zcash node not configured - will use mock mode for testing');
  }
  
  if (warnings.length > 0) {
    console.log('\n' + warnings.join('\n') + '\n');
  }
}

