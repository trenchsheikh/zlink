import http from 'http';
import url from 'url';
import magicLink from './magicLink.js';

class WebServer {
  constructor(port = 3000) {
    this.port = port;
    this.server = null;
  }

  start() {
    this.server = http.createServer(async (req, res) => {
      const parsedUrl = url.parse(req.url, true);
      const pathname = parsedUrl.pathname;

      // Set CORS headers
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

      if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
      }

      // Home page
      if (pathname === '/') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(this.getHomePage());
        return;
      }

      // Claim page (view only - claims must be via Telegram)
      if (pathname.startsWith('/claim/')) {
        const linkId = pathname.split('/claim/')[1];
        
        if (req.method === 'GET') {
          const linkInfo = magicLink.getLinkInfo(linkId);
          
          if (!linkInfo) {
            res.writeHead(404, { 'Content-Type': 'text/html' });
            res.end(this.getErrorPage('Invalid magic link'));
            return;
          }

          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(this.getClaimPage(linkInfo));
          return;
        }

        // POST requests are disabled - claims must be via Telegram
        if (req.method === 'POST') {
          res.writeHead(403, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            success: false, 
            error: 'Web claims are disabled. Please claim via Telegram using /claim command.' 
          }));
          return;
        }
      }

      // 404
      res.writeHead(404, { 'Content-Type': 'text/html' });
      res.end(this.getErrorPage('Page not found'));
    });

    this.server.listen(this.port, () => {
      console.log(`🌐 Web server running at http://localhost:${this.port}`);
    });

    // Handle server errors
    this.server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${this.port} is already in use!`);
        console.log(`💡 To fix this:`);
        console.log(`   1. Stop other Node processes: Get-Process node | Stop-Process -Force`);
        console.log(`   2. Or change the port in webServer.js`);
        console.log(`\n⚠️  Web server not started, but bot will continue running...`);
      } else {
        console.error('Web server error:', error);
      }
    });
  }

  getHomePage() {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Zlink - Zcash Magic Links</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .container {
            background: white;
            border-radius: 20px;
            padding: 60px 40px;
            max-width: 600px;
            width: 100%;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            text-align: center;
        }
        h1 { color: #333; margin-bottom: 20px; font-size: 48px; }
        .logo { font-size: 80px; margin-bottom: 20px; }
        p { color: #666; line-height: 1.8; margin-bottom: 30px; font-size: 18px; }
        .btn {
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-decoration: none;
            padding: 15px 40px;
            border-radius: 30px;
            font-weight: 600;
            font-size: 18px;
            transition: transform 0.2s, box-shadow 0.2s;
        }
        .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 30px rgba(102, 126, 234, 0.4);
        }
        .features {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 20px;
            margin-top: 40px;
        }
        .feature {
            padding: 20px;
            background: #f8f9fa;
            border-radius: 10px;
        }
        .feature-icon { font-size: 32px; margin-bottom: 10px; }
        .feature-text { color: #333; font-size: 14px; font-weight: 600; }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">🔗</div>
        <h1>Zlink</h1>
        <p>Receive Zcash rewards via secure magic links. When transactions are detected on monitored wallets, personalized ZEC rewards are sent directly to you via Telegram.</p>
        
        <a href="https://t.me/YOUR_BOT_USERNAME" class="btn">Open Telegram Bot</a>
        
        <div class="features">
            <div class="feature">
                <div class="feature-icon">⚡</div>
                <div class="feature-text">Instant Detection</div>
            </div>
            <div class="feature">
                <div class="feature-icon">🔒</div>
                <div class="feature-text">Secure Claims</div>
            </div>
            <div class="feature">
                <div class="feature-icon">🎁</div>
                <div class="feature-text">Easy Rewards</div>
            </div>
        </div>
    </div>
</body>
</html>
    `;
  }

  getClaimPage(linkInfo) {
    if (linkInfo.claimed) {
      return this.getErrorPage('This magic link has already been claimed! ✅');
    }

    if (linkInfo.expired) {
      return this.getErrorPage('This magic link has expired ⏰');
    }

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Claim Your Zcash - Zlink</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .container {
            background: white;
            border-radius: 20px;
            padding: 40px;
            max-width: 500px;
            width: 100%;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }
        h1 { color: #333; margin-bottom: 10px; font-size: 32px; text-align: center; }
        .amount {
            text-align: center;
            font-size: 48px;
            color: #667eea;
            font-weight: bold;
            margin: 20px 0;
        }
        .recipient {
            text-align: center;
            color: #666;
            margin-bottom: 30px;
            font-size: 16px;
        }
        .info {
            background: #fff3cd;
            padding: 20px;
            border-radius: 8px;
            margin-top: 20px;
            font-size: 14px;
            color: #856404;
            border: 1px solid #ffeaa7;
        }
        .info strong {
            display: block;
            margin-bottom: 10px;
            font-size: 16px;
        }
        .info code {
            background: #f8f9fa;
            padding: 2px 6px;
            border-radius: 4px;
            font-family: 'Courier New', monospace;
            color: #333;
        }
        .expires {
            text-align: center;
            color: #999;
            font-size: 14px;
            margin-top: 20px;
        }
        .telegram-link {
            display: inline-block;
            background: #0088cc;
            color: white;
            text-decoration: none;
            padding: 12px 24px;
            border-radius: 8px;
            font-weight: 600;
            margin-top: 15px;
            transition: transform 0.2s;
        }
        .telegram-link:hover {
            transform: translateY(-2px);
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎁 Claim Your Zcash</h1>
        <div class="amount">${linkInfo.amount} ZEC</div>
        <div class="recipient">For: @${linkInfo.recipientUsername}</div>
        
        <div class="info">
            <strong>📱 Claims Must Be Made Via Telegram</strong>
            <p>Web claims are disabled. To claim your Zcash, please use the Telegram bot:</p>
            <p style="margin-top: 10px;">
                <strong>Command:</strong><br>
                <code>/claim ${linkInfo.linkId} t1YourZcashAddress</code>
            </p>
            <p style="margin-top: 10px;">
                Replace <code>t1YourZcashAddress</code> with your actual Zcash receiving address.
            </p>
            <div style="text-align: center;">
                <a href="https://t.me/YOUR_BOT_USERNAME" class="telegram-link">Open Telegram Bot</a>
            </div>
        </div>
        
        <div class="expires">
            ⏰ Expires: ${new Date(linkInfo.expiresAt).toLocaleString()}
        </div>
    </div>
</body>
</html>
    `;
  }

  getErrorPage(errorMessage) {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Error - Zlink</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .container {
            background: white;
            border-radius: 20px;
            padding: 60px 40px;
            max-width: 500px;
            width: 100%;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            text-align: center;
        }
        .icon { font-size: 80px; margin-bottom: 20px; }
        h1 { color: #333; margin-bottom: 20px; font-size: 32px; }
        p { color: #666; line-height: 1.6; }
        .btn {
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-decoration: none;
            padding: 15px 40px;
            border-radius: 30px;
            font-weight: 600;
            margin-top: 30px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="icon">❌</div>
        <h1>Oops!</h1>
        <p>${errorMessage}</p>
        <a href="/" class="btn">Go Home</a>
    </div>
</body>
</html>
    `;
  }

  stop() {
    if (this.server) {
      this.server.close();
      console.log('Web server stopped');
    }
  }
}

export default WebServer;

