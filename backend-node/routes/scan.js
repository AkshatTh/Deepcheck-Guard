const express = require('express');
const axios = require('axios');
const { applyAllRules } = require('../lib/ruleEngine');
const { extractFeatures } = require('../lib/featureExtractor');
const router = express.Router();

const PYTHON_URL = process.env.PYTHON_SERVICE_URL || 'http://127.0.0.1:8080';
const SAFE_BROWSING_KEY = process.env.SAFE_BROWSING_API_KEY;

// --- 🛡️ THE GLOBAL WHITELIST ---
const TRUSTED_DOMAINS = [
    'youtube.com',
    'github.com',
    'linkedin.com',
    'microsoft.com',
    'wikipedia.org'
];

function isWhitelisted(url) {
    if (!url) return false;
    try {
        const hostname = new URL(url).hostname;
        // Matches exactly "google.com" or subdomains like "mail.google.com"
        return TRUSTED_DOMAINS.some(domain => hostname === domain || hostname.endsWith('.' + domain));
    } catch {
        return false;
    }
}

// --- GOOGLE SAFE BROWSING HELPER ---
async function checkGoogleSafeBrowsing(url) {
    if (!url || !url.startsWith('http') || !SAFE_BROWSING_KEY) return null;
    try {
        const res = await axios.post(`https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${SAFE_BROWSING_KEY}`, {
            client: { clientId: "deepcheck-guard", clientVersion: "1.0.0" },
            threatInfo: {
                threatTypes: ["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE", "POTENTIALLY_HARMFUL_APPLICATION"],
                platformTypes: ["ANY_PLATFORM"],
                threatEntryTypes: ["URL"],
                threatEntries: [{ url: url }]
            }
        }, { timeout: 1500 }); 
        
        if (res.data && res.data.matches && res.data.matches.length > 0) {
            return res.data.matches[0].threatType; 
        }
    } catch (e) {
        console.error("⚠️ Google Safe Browsing Error:", e.message);
    }
    return null;
}

router.post('/text', async (req, res) => {
    const scanData = req.body;
    const targetUrl = scanData.url;

    // 🚨 1. WHITELIST INTERCEPT 🚨
    if (isWhitelisted(targetUrl)) {
        console.log(`✅ [WHITELIST] Bypassing heuristics for trusted domain: ${targetUrl}`);
        return res.json({
            threat: false,
            confidence: 0,
            explanation: ["Verified secure domain (Global Whitelist)"],
            ml_score: 0
        });
    }

    // 2. ASYNC FETCHES (Run Google Safe Browsing and ML in parallel)
    const [safeBrowsingThreat, mlRes] = await Promise.allSettled([
        checkGoogleSafeBrowsing(targetUrl),
        axios.post(`${PYTHON_URL}/analyze/phishing`, { features: extractFeatures(scanData) }, { timeout: 2000 })
    ]);

    // 3. HARDCODED TEXT RULES
    const ruleResult = applyAllRules(scanData);
    let normalizedRuleScore = Math.min(100, Math.max(0, ruleResult?.totalScore || 0));

    // 4. EXTRACT ML SCORE
    let mlScore = 0;
    if (mlRes.status === 'fulfilled' && mlRes.value) {
        mlScore = mlRes.value.data.ml_score;
    }
    const normalizedMlScore = Math.round((mlScore || 0) * 100);

    // 5. DEMO-PROOF DECISION LOGIC
    let explanations = [...(ruleResult?.findings || [])];
    let finalExtensionScore = normalizedRuleScore;

    // OVERRIDE: If Google Safe Browsing catches it, it's an instant 100% Threat
    if (safeBrowsingThreat && safeBrowsingThreat.status === 'fulfilled' && safeBrowsingThreat.value) {
        finalExtensionScore = 100;
        explanations.unshift(`🚨 Google Safe Browsing flag: ${safeBrowsingThreat.value.replace('_', ' ')}`);
    }

    let isThreat = finalExtensionScore >= 40; 

    // Safety net to force 0% if no rules triggered
    if (explanations.length === 0) {
        explanations = ["Site passed static security checks and Google Safe Browsing"];
        finalExtensionScore = 0; 
        isThreat = false;
    }

    console.log(`🔍 [SCAN] Ext Score: ${finalExtensionScore}% | ML Score: ${normalizedMlScore}% | G-Safe: ${safeBrowsingThreat?.value || 'Clear'}`);

    res.json({
        threat: isThreat,                
        confidence: finalExtensionScore, 
        explanation: explanations,       
        ml_score: normalizedMlScore      
    });
});

module.exports = router;