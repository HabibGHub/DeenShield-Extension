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
async function updateBlockingRules() {
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
    });
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

    // Generate unique rule ID based on timestamp to avoid conflicts
    let currentRuleId = RULE_ID_OFFSET + Date.now() % 1000;

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
                // Ensure unique rule ID
                while (currentRuleIds.has(currentRuleId)) {
                    currentRuleId++;
                }
                
                rulesToAdd.push({
                    id: currentRuleId,
                    priority: 1,
                    action: { type: 'block' },
                    condition: {
                        regexFilter: `.*(${regexString}).*`, 
                        resourceTypes: ['main_frame', 'sub_frame']
                    }
                });
                
                currentRuleIds.add(currentRuleId);
                currentRuleId++;
            }
        }
    }

    // --- DOMAIN RULES ---
    const finalDomains = [];
    if (blockSocial) finalDomains.push(...socialList);

    if (finalDomains.length > 0) {
        // Ensure unique rule ID
        while (currentRuleIds.has(currentRuleId)) {
            currentRuleId++;
        }
        
        rulesToAdd.push({
            id: currentRuleId,
            priority: 1,
            action: { type: 'block' },
            condition: {
                requestDomains: finalDomains,
                resourceTypes: ['main_frame', 'sub_frame']
            }
        });
        
        currentRuleIds.add(currentRuleId);
    }

    // --- Update the rules ---
    try {
        // First remove all existing rules
        if (rulesToRemove.length > 0) {
            await browser.declarativeNetRequest.updateDynamicRules({
                removeRuleIds: rulesToRemove
            });
        }
        
        // Then add new rules
        if (rulesToAdd.length > 0) {
            await browser.declarativeNetRequest.updateDynamicRules({
                addRules: rulesToAdd
            });
        }
        
        console.log("Deen Shield rules updated successfully.", { 
            added: rulesToAdd.length, 
            removed: rulesToRemove.length,
            newRuleIds: rulesToAdd.map(r => r.id)
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
