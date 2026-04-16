import express from 'express';
const router = express.Router();

/**
 * Landing page for group invitation links
 * If the app doesn't intercept the Universal/App Link, the user lands here.
 */
/**
 * Generic landing page for Mandali invitations
 */
router.get(['/join/:id', '/housie/:id', '/memories/:id'], (req, res) => {
    const { id } = req.params;
    const type = req.path.split('/')[1]; // join, housie, or memories
    
    let title = "You're Invited!";
    let subtitle = "You've been invited to join a private circle on Mandali.";
    let btnText = "Open Mandali App";
    let appUrl = `mandali://${type}/${id}`;

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
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; text-align: center; padding: 50px 20px; background-color: #fdf9f3; color: #1c1c18; }
            .card { background: white; padding: 40px; border-radius: 32px; box-shadow: 0 10px 30px rgba(179, 0, 105, 0.05); max-width: 400px; margin: 0 auto; border: 1px solid #fcecf2; }
            .logo { width: 80px; height: 80px; margin-bottom: 20px; border-radius: 20px; }
            h1 { color: #b30069; font-size: 24px; margin-bottom: 10px; }
            p { color: #594048; line-height: 1.5; margin-bottom: 30px; }
            .btn { background-color: #b30069; color: white; padding: 16px 32px; border-radius: 30px; text-decoration: none; font-weight: bold; display: inline-block; transition: transform 0.2s; }
            .btn:active { transform: scale(0.95); }
            .code-box { background: #fcecf2; padding: 10px; border-radius: 12px; font-weight: bold; letter-spacing: 2px; display: block; margin-bottom: 20px; color: #b30069; }
        </style>
    </head>
    <body>
        <div class="card">
            <img src="/logo.png" alt="Mandali" class="logo">
            <h1>${title}</h1>
            <p>${subtitle}</p>
            
            <a href="${appUrl}" class="btn">${btnText}</a>
            
            <p style="margin-top: 30px; font-size: 13px; opacity: 0.6;">
                Don't have the app? <br>
                <a href="#" style="color: #b30069; text-decoration: none; font-weight: bold;">Download Mandali from the Store</a>
            </p>
        </div>

        <script>
            setTimeout(function() {
                window.location.href = "${appUrl}";
            }, 500);
        </script>
    </body>
    </html>
    `;
    
    res.send(html);
});

export default router;
