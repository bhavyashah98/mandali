import express from 'express';
const router = express.Router();

/**
 * Landing page for group invitation links
 * If the app doesn't intercept the Universal/App Link, the user lands here.
 */
router.get(['/join/:id', '/housie/:id', '/memories/:id'], (req, res) => {
    const { id } = req.params;
    const type = req.path.split('/')[1]; // join, housie, or memories
    const userAgent = req.headers['user-agent'] || '';
    
    const isAndroid = /Android/i.test(userAgent);
    const isIOS = /iPhone|iPad|iPod/i.test(userAgent);

    const packageId = "com.mandaliapp.mandali";
    const playStoreUrl = `https://play.google.com/store/apps/details?id=${packageId}`;
    const playStoreMarketUrl = `market://details?id=${packageId}`;
    const appStoreUrl = `https://apps.apple.com/app/mandali`; 

    let title = "You're Invited!";
    let subtitle = "You've been invited to join a private circle on Mandali.";
    let btnText = "Open Mandali App";
    
    // Base deep link
    const appUrl = `mandali://${type}/${id}`;
    
    // Android Intent URL for better reliability
    // It tries to open the app, and if not found, redirects to the Play Store
    const androidIntent = `intent://${type}/${id}#Intent;scheme=mandali;package=${packageId};S.browser_fallback_url=${encodeURIComponent(playStoreUrl)};end`;

    const redirectUrl = isAndroid ? androidIntent : appUrl;
    
    // For the manual "Download" link, we use market:// on Android to force the Play Store app
    const storeUrl = isAndroid ? playStoreMarketUrl : (isIOS ? appStoreUrl : playStoreUrl);

    if (type === 'housie') {
        title = "Housie Game Started!";
        subtitle = "A new game of Housie is waiting for you. Join now to claim your tickets!";
        btnText = "Enter Housie Game";
    } else if (type === 'memories') {
        title = "New Memory Shared!";
        subtitle = "Someone shared a new memory in your group. Take a look!";
        btnText = "View Memories";
    }

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Mandali | ${title}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
            body { 
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; 
                text-align: center; 
                padding: 0;
                margin: 0;
                background-color: #fdf9f3; 
                color: #1c1c18; 
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
            }
            .card { 
                background: white; 
                padding: 40px 30px; 
                border-radius: 32px; 
                box-shadow: 0 20px 40px rgba(179, 0, 105, 0.08); 
                max-width: 380px; 
                width: 90%;
                margin: 20px; 
                border: 1px solid #fcecf2; 
            }
            .logo { width: 90px; height: 90px; margin-bottom: 24px; border-radius: 22px; box-shadow: 0 4px 12px rgba(179, 0, 105, 0.1); }
            h1 { color: #b30069; font-size: 26px; margin-bottom: 12px; font-weight: 800; letter-spacing: -0.5px; }
            p { color: #594048; line-height: 1.6; margin-bottom: 32px; font-size: 16px; }
            .btn { 
                background-color: #b30069; 
                color: white; 
                padding: 18px 36px; 
                border-radius: 30px; 
                text-decoration: none; 
                font-weight: bold; 
                display: block; 
                transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); 
                font-size: 17px;
                box-shadow: 0 10px 20px rgba(179, 0, 105, 0.2);
            }
            .btn:active { transform: scale(0.96); box-shadow: 0 5px 10px rgba(179, 0, 105, 0.2); }
            .footer { margin-top: 40px; border-top: 1px solid #fcecf2; pt: 30px; }
            .store-link { 
                color: #b30069; 
                text-decoration: none; 
                font-weight: 700; 
                font-size: 14px;
                display: inline-block;
                margin-top: 8px;
            }
            .store-text { font-size: 13px; opacity: 0.7; color: #594048; margin-top: 30px; }
        </style>
    </head>
    <body>
        <div class="card">
            <img src="https://api.mandaliapp.com/logo.png" alt="Mandali" class="logo" onerror="this.style.display='none'">
            <h1>${title}</h1>
            <p>${subtitle}</p>
            
            <a href="${redirectUrl}" class="btn">${btnText}</a>
            
            <div class="store-text">
                Don't have the Mandali app yet? <br>
                <a href="${storeUrl}" class="store-link">Download from the Store</a>
            </div>
        </div>

        <script>
            // Improved redirect logic
            (function() {
                var redirectUrl = "${redirectUrl}";
                
                // Try immediate redirect
                window.location.href = redirectUrl;
                
                // Fallback redirect after a short delay for browsers that block immediate ones
                setTimeout(function() {
                    window.location.href = redirectUrl;
                }, 1000);
            })();
        </script>
    </body>
    </html>
    `;
    
    res.send(html);
});

export default router;
