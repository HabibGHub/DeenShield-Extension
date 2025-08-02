// Browser compatibility layer
// Cross-browser API compatibility
if (typeof browser === "undefined") {
    var browser = (typeof chrome !== "undefined") ? chrome : {};
}

// Helper: get storage (sync)
function getStorageSettings(cb) {
    if (browser.storage && browser.storage.sync && browser.storage.sync.get) {
        browser.storage.sync.get('settings', (result) => {
            cb(result && result.settings ? result.settings : {});
        });
    } else if (chrome && chrome.storage && chrome.storage.sync && chrome.storage.sync.get) {
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
const DEFAULT_HARAM_KEYWORDS = [
    'porn', 'sex', 'xxx', 'adult', 'erotic', 'naked', 'lust', 'lewd',
    'betting', 'casino', 'gambling', 'poker', 'roulette', 'slots',
    'liquor', 'vodka', 'whiskey', 'beer', 'wine', 'alcohol',
    'interest', 'riba', 'idol', 'statue', 'astrology', 'horoscope', 'pagan'
];
const DEFAULT_SOCIAL_MEDIA_DOMAINS = [
    'facebook.com', 'twitter.com', 'instagram.com', 'tiktok.com', 'youtube.com',
    'reddit.com', 'pinterest.com', 'linkedin.com', 'snapchat.com', 'discord.com'
];

const RULE_ID_OFFSET = 1000;
const KEYWORD_CHUNK_SIZE = 10; // Number of keywords per rule to stay under memory limits

// Global variable to track current rule state
let currentRuleIds = new Set();

// --- Main Update Logic ---
let updateLock = Promise.resolve();
let updateQueued = false;

async function updateBlockingRules() {
    // If an update is already running, queue another run after it
    if (updateLock && updateLock.isRunning) {
        updateQueued = true;
        return;
    }
    updateLock.isRunning = true;
    updateLock = (async () => {
        try {
            await new Promise(resolve => {
                getStorageSettings(async (settings) => {
                    const { blockHaram = true, blockSocial = false, customKeywords = [], haramKeywords, socialDomains } = settings;
                    const haramList = Array.isArray(haramKeywords) && haramKeywords.length > 0 ? haramKeywords : DEFAULT_HARAM_KEYWORDS;
                    const socialList = Array.isArray(socialDomains) && socialDomains.length > 0 ? socialDomains : DEFAULT_SOCIAL_MEDIA_DOMAINS;

                    // Check if browser supports declarativeNetRequest (Chrome/Edge MV3)
                    if (browser.declarativeNetRequest && browser.declarativeNetRequest.updateDynamicRules) {
                        await updateDeclarativeNetRequestRules(blockHaram, blockSocial, customKeywords, haramList, socialList);
                    } else {
                        // Fallback to webRequest for Firefox and older browsers
                        updateWebRequestRules(blockHaram, blockSocial, customKeywords, haramList, socialList);
                    }
                    resolve();
                });
            });
        } catch (e) {
            console.error('Error in updateBlockingRules:', e);
        } finally {
            updateLock.isRunning = false;
            if (updateQueued) {
                updateQueued = false;
                // Add a small delay before processing queued update to prevent rapid loops
                setTimeout(updateBlockingRules, 100);
            }
        }
    })();
}

async function updateDeclarativeNetRequestRules(blockHaram, blockSocial, customKeywords, haramList, socialList) {
    let rulesToAdd = [];
    let rulesToRemove = [];

    // Clear all existing dynamic rules to prevent ID conflicts
    try {
        const existingRules = await browser.declarativeNetRequest.getDynamicRules();
        rulesToRemove = existingRules.map(rule => rule.id);
        console.log("Found existing rules to remove:", rulesToRemove);
    } catch (e) {
        console.error("Error getting existing rules:", e);
    }

    // Always clear currentRuleIds at the start of each update
    currentRuleIds.clear();

    // Use a local incrementing ruleId for this update
    let ruleId = RULE_ID_OFFSET;

    // --- KEYWORD RULES ---
    const finalKeywords = [];
    if (blockHaram) finalKeywords.push(...haramList);
    if (customKeywords && customKeywords.length > 0) finalKeywords.push(...customKeywords);

    if (finalKeywords.length > 0) {
        // Split keywords into smaller chunks to avoid memory limits
        for (let i = 0; i < finalKeywords.length; i += KEYWORD_CHUNK_SIZE) {
            const chunk = finalKeywords.slice(i, i + KEYWORD_CHUNK_SIZE);
            const escapedKeywords = chunk.map(kw => kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
            const regexString = escapedKeywords.join('|');

            if (regexString) {
                rulesToAdd.push({
                    id: ruleId++,
                    priority: 1,
                    action: { type: 'block' },
                    condition: {
                        regexFilter: `.*(${regexString}).*`, 
                        resourceTypes: ['main_frame', 'sub_frame']
                    }
                });
            }
        }
    }

    // --- DOMAIN RULES ---
    let finalDomains = [];
    if (blockSocial) {
        socialList.forEach(domain => {
            const base = domain.replace(/^www\./, '');
            finalDomains.push(base);
            finalDomains.push('www.' + base);
        });
    }
    finalDomains = Array.from(new Set(finalDomains));

    if (finalDomains.length > 0) {
        // Add rules for both http and https, www and non-www
        ['http', 'https'].forEach(protocol => {
            finalDomains.forEach(domain => {
                rulesToAdd.push({
                    id: ruleId++,
                    priority: 1,
                    action: { type: 'block' },
                    condition: {
                        urlFilter: `|${protocol}://${domain}`,
                        resourceTypes: ['main_frame', 'sub_frame']
                    }
                });
            });
        });
    }

    // --- Update the rules ---
    try {
        // First remove all existing rules
        if (rulesToRemove.length > 0) {
            await browser.declarativeNetRequest.updateDynamicRules({
                removeRuleIds: rulesToRemove
            });
            // Poll until all rules are removed
            let retries = 0;
            let removed = false;
            while (retries < 20 && !removed) {
                await new Promise(resolve => setTimeout(resolve, 100));
                const stillExisting = await browser.declarativeNetRequest.getDynamicRules();
                removed = !stillExisting.some(rule => rulesToRemove.includes(rule.id));
                retries++;
            }
        }

        // Fetch current rules to ensure no ID conflicts
        const currentRules = await browser.declarativeNetRequest.getDynamicRules();
        const currentIds = new Set(currentRules.map(r => r.id));
        const uniqueRulesToAdd = rulesToAdd.filter(r => !currentIds.has(r.id));

        // Now add only rules with unique IDs
        if (uniqueRulesToAdd.length > 0) {
            await browser.declarativeNetRequest.updateDynamicRules({
                addRules: uniqueRulesToAdd
            });
        }

        console.log("Deen Shield rules updated successfully.", { 
            added: uniqueRulesToAdd.length, 
            removed: rulesToRemove.length,
            newRuleIds: uniqueRulesToAdd.map(r => r.id)
        });
    } catch (e) {
        console.error("Error updating dynamic rules:", e);
        console.error("Details:", JSON.stringify({ rulesToAdd, rulesToRemove }, null, 2));
        // Clear our tracking on error
        currentRuleIds.clear();
    }
}

// Global variable to store current blocking filters
let currentFilters = {
    blockHaram: true,
    blockSocial: false,
    customKeywords: []
};

function updateWebRequestRules(blockHaram, blockSocial, customKeywords, haramList, socialList) {
    // Store current filters
    currentFilters = { blockHaram, blockSocial, customKeywords, haramList, socialList };
    
    // Remove existing listeners
    if (browser.webRequest && browser.webRequest.onBeforeRequest.hasListener(blockRequestHandler)) {
        browser.webRequest.onBeforeRequest.removeListener(blockRequestHandler);
    }
    
    // Add new listener if any blocking is enabled
    if (blockHaram || blockSocial || (customKeywords && customKeywords.length > 0)) {
        browser.webRequest.onBeforeRequest.addListener(
            blockRequestHandler,
            { urls: ["<all_urls>"] },
            ["blocking"]
        );
    }
    
    console.log("Deen Shield webRequest rules updated.", currentFilters);
}

function blockRequestHandler(details) {
    const url = details.url.toLowerCase();
    let shouldBlock = false;
    const haramList = currentFilters.haramList || DEFAULT_HARAM_KEYWORDS;
    const socialList = currentFilters.socialList || DEFAULT_SOCIAL_MEDIA_DOMAINS;

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

// --- Event Listeners ---
// Run when the extension is first installed or updated
if (browser.runtime && browser.runtime.onInstalled && browser.runtime.onInstalled.addListener) {
    browser.runtime.onInstalled.addListener(() => {
        // Clear any existing rules on install
        currentRuleIds.clear();
        getStorageSettings((settings) => {
            if (!settings || Object.keys(settings).length === 0) {
                setStorageSettings({
                    blockHaram: true,
                    blockSocial: false,
                    customKeywords: [],
                    haramKeywords: DEFAULT_HARAM_KEYWORDS,
                    socialDomains: DEFAULT_SOCIAL_MEDIA_DOMAINS
                }, updateBlockingRules);
            } else {
                updateBlockingRules();
            }
        });
    });
}

// Run whenever a setting is changed in the popup
if (browser.storage && browser.storage.onChanged && browser.storage.onChanged.addListener) {
    browser.storage.onChanged.addListener(updateBlockingRules);
} else if (chrome && chrome.storage && chrome.storage.onChanged && chrome.storage.onChanged.addListener) {
    chrome.storage.onChanged.addListener(updateBlockingRules);
}
