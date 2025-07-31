// Safari-specific content script for blocking
if (typeof safari !== "undefined") {
    // Safari content script implementation
    const HARAM_KEYWORDS = [
        'porn', 'sex', 'xxx', 'adult', 'erotic', 'naked', 'lust', 'lewd',
        'betting', 'casino', 'gambling', 'poker', 'roulette', 'slots',
        'liquor', 'vodka', 'whiskey', 'beer', 'wine', 'alcohol',
        'interest', 'riba', 'idol', 'statue', 'astrology', 'horoscope', 'pagan'
    ];

    const SOCIAL_MEDIA_DOMAINS = [
        'facebook.com', 'twitter.com', 'instagram.com', 'tiktok.com', 'youtube.com',
        'reddit.com', 'pinterest.com', 'linkedin.com', 'snapchat.com', 'discord.com'
    ];

    // Get settings from local storage
    function getSettings() {
        const settings = localStorage.getItem('extension_settings');
        return settings ? JSON.parse(settings) : { blockHaram: true, blockSocial: false, customKeywords: [] };
    }

    // Check if current page should be blocked
    function shouldBlockCurrentPage() {
        const settings = getSettings();
        const url = window.location.href.toLowerCase();
        const domain = window.location.hostname.toLowerCase();

        // Check social media domains
        if (settings.blockSocial) {
            for (const socialDomain of SOCIAL_MEDIA_DOMAINS) {
                if (domain.includes(socialDomain)) {
                    return { block: true, reason: 'Social media blocked' };
                }
            }
        }

        // Check haram keywords
        if (settings.blockHaram) {
            for (const keyword of HARAM_KEYWORDS) {
                if (url.includes(keyword)) {
                    return { block: true, reason: 'Inappropriate content blocked' };
                }
            }
        }

        // Check custom keywords
        if (settings.customKeywords && settings.customKeywords.length > 0) {
            for (const keyword of settings.customKeywords) {
                if (url.includes(keyword.toLowerCase())) {
                    return { block: true, reason: 'Custom keyword blocked' };
                }
            }
        }

        return { block: false };
    }

    // Block the page if necessary
    function blockPage(reason) {
        document.documentElement.innerHTML = `
            <html>
            <head>
                <title>Deen Shield - Content Blocked</title>
                <style>
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        height: 100vh;
                        margin: 0;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                    }
                    .container {
                        text-align: center;
                        padding: 2rem;
                        background: rgba(255,255,255,0.1);
                        border-radius: 20px;
                        backdrop-filter: blur(10px);
                    }
                    .icon { font-size: 4rem; margin-bottom: 1rem; }
                    h1 { margin: 0 0 1rem 0; }
                    p { opacity: 0.9; margin: 0; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="icon">???</div>
                    <h1>Deen Shield</h1>
                    <p>${reason}</p>
                    <p>Content blocked to maintain Halal browsing habits.</p>
                </div>
            </body>
            </html>
        `;
    }

    // Check and block if necessary
    const blockCheck = shouldBlockCurrentPage();
    if (blockCheck.block) {
        blockPage(blockCheck.reason);
    }
}