// backend-node/lib/featureExtractor.js

function calculateEntropy(str) {
    if (!str || str.length === 0) return 0;
    const charCounts = {};
    for (let i = 0; i < str.length; i++) {
        charCounts[str[i]] = (charCounts[str[i]] || 0) + 1;
    }
    let entropy = 0;
    for (const char in charCounts) {
        const p = charCounts[char] / str.length;
        entropy -= p * Math.log2(p);
    }
    return entropy;
}

function extractFeatures(scanData) {
    const { text = '', html = '', links = [], iframes = [], forms = [], url = '' } = scanData;

    const urgencyKeywords = ['urgent', 'act now', 'suspended', 'verify', 'limited time', 'immediate'];
    const loginKeywords = ['password', 'login', 'sign in', 'credential', 'auth'];
    const suspiciousTlds = ['.xyz', '.top', '.click', '.tk', '.ml'];

    // 1. Link Features
    const numLinks = links.length;
    let numExternalLinks = 0;
    let linkTextMismatch = 0;
    let avgLinkLength = 0;

    links.forEach(l => {
        if (l.href && !l.href.includes(new URL(url || 'http://localhost').hostname)) numExternalLinks++;
        if (l.text && l.href && !l.href.includes(l.text.replace(/[^a-zA-Z0-9]/g, ''))) linkTextMismatch++;
        avgLinkLength += (l.href || '').length;
    });
    if (numLinks > 0) avgLinkLength /= numLinks;

    // 2. HTML & Form Features
    const numIframes = iframes.length;
    const numForms = forms.length;
    const hasPasswordField = forms.some(f => f.hasPasswordField) ? 1 : 0;
    const numHiddenElements = [...links, ...iframes].filter(el => el.isHidden).length;
    
    // 3. Text/Keyword Features
    const textLower = text.toLowerCase();
    let keywordUrgencyScore = 0;
    urgencyKeywords.forEach(kw => { if (textLower.includes(kw)) keywordUrgencyScore += 0.2; });
    const containsLoginKeywords = loginKeywords.some(kw => textLower.includes(kw)) ? 1 : 0;

    // 4. URL/Domain Features
    let domainLength = 0;
    let subdomainDepth = 0;
    let hasIpUrl = 0;
    let suspiciousTldFlag = 0;

    try {
        if (url) {
            const parsedUrl = new URL(url);
            domainLength = parsedUrl.hostname.length;
            subdomainDepth = parsedUrl.hostname.split('.').length - 2;
            if (/^(\d{1,3}\.){3}\d{1,3}$/.test(parsedUrl.hostname)) hasIpUrl = 1;
            if (suspiciousTlds.some(tld => parsedUrl.hostname.endsWith(tld))) suspiciousTldFlag = 1;
        }
    } catch (e) { /* Ignore invalid URLs */ }

    // ... all your calculation logic stays exactly the same ...

    // 5. 🚨 THE CRITICAL MAPPING: Convert object to a flat array for Python
    // THE ORDER HERE MUST NEVER CHANGE!
    const featureVector = [
        numLinks,
        numExternalLinks,
        numForms,
        hasPasswordField,
        numIframes,
        numHiddenElements,
        avgLinkLength,
        domainLength,
        subdomainDepth,
        hasIpUrl,
        suspiciousTldFlag,
        Math.min(1.0, keywordUrgencyScore),
        calculateEntropy(html),
        numLinks ? linkTextMismatch / numLinks : 0,
        containsLoginKeywords
    ];

    return featureVector; // Return the array, not the object!
}

module.exports = { extractFeatures };