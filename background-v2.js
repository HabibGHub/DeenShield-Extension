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

// Lock to prevent overlapping updates
let updateLock = Promise.resolve();
let updateQueued = false;

function updateWebRequestRules() {
    // If an update is already running, queue another run after it
    if (updateLock && updateLock.isRunning) {
        updateQueued = true;
        return;
    }
    updateLock.isRunning = true;
    updateLock = (async () => {
        try {
            await new Promise(resolve => {
                getStorageSettings((settings) => {
                    const { blockHaram = true, blockSocial = false, customKeywords = [], socialDomains } = settings;
                    // Use user-saved socialDomains if present, else default
                    const socialList = Array.isArray(socialDomains) && socialDomains.length > 0 ? socialDomains : SOCIAL_MEDIA_DOMAINS;
                    currentFilters = { blockHaram, blockSocial, customKeywords, socialList };

                    // Remove existing listeners (cross-browser)
                    try {
                        if (browser.webRequest && browser.webRequest.onBeforeRequest && browser.webRequest.onBeforeRequest.hasListener && browser.webRequest.onBeforeRequest.removeListener) {
                            if (browser.webRequest.onBeforeRequest.hasListener(blockRequestHandler)) {
                                browser.webRequest.onBeforeRequest.removeListener(blockRequestHandler);
                            }
                        }
                    } catch (e) {
                        console.warn('Error removing webRequest listener:', e);
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
                            console.warn('Error adding webRequest listener:', e);
                        }
                    }
                    console.log("Deen Shield webRequest rules updated.", currentFilters);
                    resolve();
                });
            });
        } catch (e) {
            console.error('Error in updateWebRequestRules:', e);
        } finally {
            updateLock.isRunning = false;
            if (updateQueued) {
                updateQueued = false;
                // Add a small delay before processing queued update to prevent rapid loops
                setTimeout(updateWebRequestRules, 100);
            }
        }
    })();
}

function blockRequestHandler(details) {
    const url = details.url.toLowerCase();
    let shouldBlock = false;
    const haramList = HARAM_KEYWORDS;
    const socialList = currentFilters.socialList || SOCIAL_MEDIA_DOMAINS;

    // Check social media domains
    if (currentFilters.blockSocial) {
        for (const domain of socialList) {
            if (url.includes(domain)) {
                shouldBlock = true;
                break;
            }
        }
    }

    // Check haram keywords
    if (!shouldBlock && currentFilters.blockHaram) {
        for (const keyword of haramList) {
            if (url.includes(keyword)) {
                shouldBlock = true;
                break;
            }
        }
    }

    // Check custom keywords
    if (!shouldBlock && currentFilters.customKeywords && currentFilters.customKeywords.length > 0) {
        for (const keyword of currentFilters.customKeywords) {
            if (url.includes(keyword.toLowerCase())) {
                shouldBlock = true;
                break;
            }
        }
    }

    if (shouldBlock) {
        // Try to redirect to block.html (must be web_accessible_resource in manifest)
        const redirectUrl = browser.runtime.getURL ? browser.runtime.getURL('block.html') : (chrome && chrome.runtime && chrome.runtime.getURL ? chrome.runtime.getURL('block.html') : null);
        if (redirectUrl && details.type === 'main_frame') {
            console.log('Redirecting to block page:', redirectUrl);
            return { redirectUrl };
        } else {
            console.log('Blocked (cancelled):', url);
            return { cancel: true };
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