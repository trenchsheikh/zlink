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

      // Claim page
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

        if (req.method === 'POST') {
          let body = '';
          req.on('data', chunk => {
            body += chunk.toString();
          });

          req.on('end', async () => {
            try {
              const data = JSON.parse(body);
              const result = await magicLink.claimLink(
                linkId,
                data.userId,
                data.username,
                data.zcashAddress
              );

              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify(result));
            } catch (error) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: false, error: 'Invalid request' }));
            }
          });
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
        .form-group {
            margin-bottom: 20px;
        }
        label {
            display: block;
            color: #333;
            font-weight: 600;
            margin-bottom: 8px;
        }
        input {
            width: 100%;
            padding: 12px;
            border: 2px solid #e0e0e0;
            border-radius: 8px;
            font-size: 14px;
            transition: border-color 0.2s;
        }
        input:focus {
            outline: none;
            border-color: #667eea;
        }
        .btn {
            width: 100%;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            padding: 15px;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: transform 0.2s;
        }
        .btn:hover:not(:disabled) {
            transform: translateY(-2px);
        }
        .btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
        }
        .message {
            margin-top: 20px;
            padding: 15px;
            border-radius: 8px;
            text-align: center;
            display: none;
        }
        .success {
            background: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }
        .error {
            background: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
        }
        .info {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            margin-top: 20px;
            font-size: 14px;
            color: #666;
        }
        .expires {
            text-align: center;
            color: #999;
            font-size: 14px;
            margin-top: 20px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎁 Claim Your Zcash</h1>
        <div class="amount">${linkInfo.amount} ZEC</div>
        <div class="recipient">For: @${linkInfo.recipientUsername}</div>
        
        <form id="claimForm">
            <div class="form-group">
                <label for="userId">Telegram User ID</label>
                <input type="number" id="userId" name="userId" required 
                       placeholder="Your Telegram user ID">
            </div>
            
            <div class="form-group">
                <label for="username">Telegram Username</label>
                <input type="text" id="username" name="username" required 
                       placeholder="@${linkInfo.recipientUsername}" value="${linkInfo.recipientUsername}">
            </div>
            
            <div class="form-group">
                <label for="zcashAddress">Zcash Address</label>
                <input type="text" id="zcashAddress" name="zcashAddress" required 
                       placeholder="t1... or zs..." pattern="^(t1|t3|zs|zc)[a-zA-Z0-9]{33,95}$">
            </div>
            
            <button type="submit" class="btn" id="submitBtn">Claim Zcash</button>
        </form>
        
        <div id="message" class="message"></div>
        
        <div class="info">
            ℹ️ Only @${linkInfo.recipientUsername} can claim this link. 
            Enter your Telegram user ID and Zcash receiving address above.
        </div>
        
        <div class="expires">
            ⏰ Expires: ${new Date(linkInfo.expiresAt).toLocaleString()}
        </div>
    </div>
    
    <script>
        document.getElementById('claimForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const btn = document.getElementById('submitBtn');
            const message = document.getElementById('message');
            
            btn.disabled = true;
            btn.textContent = 'Processing...';
            message.style.display = 'none';
            
            const formData = {
                userId: parseInt(document.getElementById('userId').value),
                username: document.getElementById('username').value,
                zcashAddress: document.getElementById('zcashAddress').value
            };
            
            try {
                const response = await fetch(window.location.href, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData)
                });
                
                const result = await response.json();
                
                message.style.display = 'block';
                
                if (result.success) {
                    message.className = 'message success';
                    message.innerHTML = '✅ Success! ' + result.amount + ' ZEC sent to your address.<br>Transaction ID: ' + result.txid;
                } else {
                    message.className = 'message error';
                    message.textContent = '❌ ' + result.error;
                    btn.disabled = false;
                    btn.textContent = 'Claim Zcash';
                }
            } catch (error) {
                message.style.display = 'block';
                message.className = 'message error';
                message.textContent = '❌ An error occurred. Please try again.';
                btn.disabled = false;
                btn.textContent = 'Claim Zcash';
            }
        });
    </script>
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

