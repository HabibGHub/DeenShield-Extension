// Background script for Manifest V2 (Firefox and older browsers)
// Cross-browser API compatibility
if (typeof browser === "undefined") {
    var browser = (typeof chrome !== "undefined") ? chrome : {};
}

// Helper: get storage (sync)
function getStorageSettings(cb) {
    if (browser.storage && browser.storage.sync && browser.storage.sync.get) {
        // Firefox/Chrome/Edge new API
        browser.storage.sync.get('settings', (result) => {
            cb(result && result.settings ? result.settings : {});
        });
    } else if (chrome && chrome.storage && chrome.storage.sync && chrome.storage.sync.get) {
        // Chrome/Edge legacy
        chrome.storage.sync.get('settings', (result) => {
            cb(result && result.settings ? result.settings : {});
        });
    } else {
        cb({});
    }
}

// Helper: set storage (sync)
function setStorageSettings(settings, cb) {
    if (browser.storage && browser.storage.sync && browser.storage.sync.set) {
        browser.storage.sync.set({ settings }, cb);
    } else if (chrome && chrome.storage && chrome.storage.sync && chrome.storage.sync.set) {
        chrome.storage.sync.set({ settings }, cb);
    } else if (cb) {
        cb();
    }
}

// --- Default Blocklists ---
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

// Global variable to store current blocking filters
let currentFilters = {
    blockHaram: true,
    blockSocial: false,
    customKeywords: []
};

function updateWebRequestRules() {
    getStorageSettings((settings) => {
        const { blockHaram = true, blockSocial = false, customKeywords = [] } = settings;
        currentFilters = { blockHaram, blockSocial, customKeywords };

        // Remove existing listeners (cross-browser)
        if (browser.webRequest && browser.webRequest.onBeforeRequest && browser.webRequest.onBeforeRequest.hasListener && browser.webRequest.onBeforeRequest.removeListener) {
            if (browser.webRequest.onBeforeRequest.hasListener(blockRequestHandler)) {
                browser.webRequest.onBeforeRequest.removeListener(blockRequestHandler);
            }
        }

        // Add new listener if any blocking is enabled
        if ((blockHaram || blockSocial || (customKeywords && customKeywords.length > 0)) && browser.webRequest && browser.webRequest.onBeforeRequest && browser.webRequest.onBeforeRequest.addListener) {
            try {
                browser.webRequest.onBeforeRequest.addListener(
                    blockRequestHandler,
                    { urls: ["<all_urls>"] },
                    ["blocking"]
                );
            } catch (e) {
                // Some browsers may throw if already added
            }
        }
        console.log("Deen Shield webRequest rules updated.", currentFilters);
    });
}

function blockRequestHandler(details) {
    const url = details.url.toLowerCase();
    
    // Check social media domains
    if (currentFilters.blockSocial) {
        for (const domain of SOCIAL_MEDIA_DOMAINS) {
            if (url.includes(domain)) {
                console.log("Blocked social media:", url);
                return { cancel: true };
            }
        }
    }
    
    // Check haram keywords
    if (currentFilters.blockHaram) {
        for (const keyword of HARAM_KEYWORDS) {
            if (url.includes(keyword)) {
                console.log("Blocked haram content:", url);
                return { cancel: true };
            }
        }
    }
    
    // Check custom keywords
    if (currentFilters.customKeywords && currentFilters.customKeywords.length > 0) {
        for (const keyword of currentFilters.customKeywords) {
            if (url.includes(keyword.toLowerCase())) {
                console.log("Blocked custom keyword:", url);
                return { cancel: true };
            }
        }
    }
    
    return {};
}

// Initialize on startup (cross-browser)
if (browser.runtime && browser.runtime.onStartup && browser.runtime.onStartup.addListener) {
    browser.runtime.onStartup.addListener(updateWebRequestRules);
}

// Run when the extension is first installed or updated
if (browser.runtime && browser.runtime.onInstalled && browser.runtime.onInstalled.addListener) {
    browser.runtime.onInstalled.addListener(() => {
        getStorageSettings((settings) => {
            if (!settings || Object.keys(settings).length === 0) {
                setStorageSettings({
                    blockHaram: true,
                    blockSocial: false,
                    customKeywords: []
                }, updateWebRequestRules);
            } else {
                updateWebRequestRules();
            }
        });
    });
}

// Run whenever a setting is changed
if (browser.storage && browser.storage.onChanged && browser.storage.onChanged.addListener) {
    browser.storage.onChanged.addListener(updateWebRequestRules);
} else if (chrome && chrome.storage && chrome.storage.onChanged && chrome.storage.onChanged.addListener) {
    chrome.storage.onChanged.addListener(updateWebRequestRules);
}