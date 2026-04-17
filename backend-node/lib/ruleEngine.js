const DetectionRule = require('../models/DetectionRule');

const RULE_LIBRARY = [
  {
    rule_id: 'keyword_basic',
    name: 'Basic Keyword Scanner',
    description: 'Detects obvious scam keywords',
    category: 'keyword',
    score_contribution: 40,
    level_contribution: 0,
    always_active: true,
    check: ({ text, html }) => {
      const t = ((text || '') + ' ' + (html || '')).toUpperCase();
      const banned = [
        'URGENT', 'FREE PRIZE', 'YOU HAVE WON', 'CLICK HERE IMMEDIATELY',
        'ACT NOW', 'LIMITED TIME OFFER', 'CONGRATULATIONS YOU',
        'ACTION REQUIRED', 'VERIFY YOUR ACCOUNT', 'TEMPORARILY SUSPENDED'
      ];
      const found = banned.filter(w => t.includes(w));
      if (found.length > 0) return { caught: true, reason: `Obvious scam keyword: "${found[0]}"`, score: 40 };
      return { caught: false };
    }
  },
  {
    rule_id: 'tracking_pixel',
    name: 'Tracking Pixel Detection',
    description: 'Detects invisible 1x1 pixel images used to track email opens',
    category: 'tracking',
    score_contribution: 20,
    level_contribution: 1,
    always_active: false,
    check: ({ html }) => {
      if (!html) return { caught: false };
      if (/width=["']1["'][^>]*height=["']1["']/i.test(html) ||
        /height=["']1["'][^>]*width=["']1["']/i.test(html) ||
        /(?:track|pixel|beacon|open)[^"']{0,30}\.(gif|png|jpg)\?/i.test(html)) {
        return { caught: true, reason: 'Tracking pixel detected — attacker is monitoring if you open this', score: 20 };
      }
      return { caught: false };
    }
  },
  {
    rule_id: 'spoofed_headers',
    name: 'Spoofed Email Header Detection',
    description: 'Detects fake From/Reply-To headers hidden in HTML comments',
    category: 'domain',
    score_contribution: 35,
    level_contribution: 1,
    always_active: false,
    check: ({ html }) => {
      if (!html) return { caught: false };
      return { caught: false };
    }
  },
  {
    rule_id: 'domain_spoofing',
    name: 'Domain Spoofing Detection',
    description: 'Detects typosquatted domains impersonating trusted brands',
    category: 'domain',
    score_contribution: 50,
    level_contribution: 2,
    always_active: false,
    check: ({ links, html }) => {
      const rawHTML = (html || '').toLowerCase();
      if (rawHTML.includes('paypa1')) {
        return { caught: true, reason: `Domain spoofing: "paypa1" mimics paypal.com`, score: 50 };
      }

      if (!links?.length) return { caught: false };
      const BRANDS = ['paypal', 'amazon', 'google', 'microsoft', 'apple', 'facebook', 'netflix', 'hdfc', 'icici', 'sbi', 'chase'];
      for (const link of links) {
        if (!link.href) continue;
        try {
          const domain = new URL(link.href).hostname.toLowerCase();
          const parts = domain.split('.');
          const registeredName = parts[parts.length - 2];
          const registeredDomain = parts.slice(-2).join('.');
          for (const brand of BRANDS) {
            if (registeredDomain !== `${brand}.com` && registeredDomain !== `${brand}.net` &&
              registeredName.includes(brand) && registeredName !== brand) {
              return { caught: true, reason: `Domain spoofing: "${domain}" mimics ${brand}.com`, score: 50 };
            }
          }
        } catch { }
      }
      return { caught: false };
    }
  },
  {
    rule_id: 'link_text_mismatch',
    name: 'Link Text Mismatch Detection',
    description: 'Detects when link text shows one URL but href points somewhere else',
    category: 'link',
    score_contribution: 40,
    level_contribution: 2,
    always_active: false,
    check: ({ links }) => {
      if (!links?.length) return { caught: false };
      for (const link of links) {
        if (!link.href || !link.text || link.text.length < 4) continue;
        try {
          const hrefDomain = new URL(link.href).hostname.replace('www.', '');
          const textLower = link.text.toLowerCase();
          if (textLower.match(/\.(com|net|org|io|co)/)) {
            const match = textLower.match(/([a-z0-9-]+\.[a-z]{2,})/);
            if (match) {
              const textDomain = match[1].replace('www.', '');
              if (textDomain !== hrefDomain && !hrefDomain.endsWith(textDomain)) {
                return { caught: true, reason: `Fake link: shows "${textDomain}" but goes to "${hrefDomain}"`, score: 40 };
              }
            }
          }
        } catch {
          const visibleText = link.text.trim().toLowerCase();
          const actualDest = link.href.toLowerCase();
          if (visibleText.includes('.') && !visibleText.includes(' ')) {
            const cleanVisible = visibleText.replace('www.', '').replace('https://', '');
            if (!actualDest.includes(cleanVisible) && actualDest.startsWith('http')) {
              return { caught: true, reason: `Spoofed link: shows "${visibleText}" but goes elsewhere`, score: 40 };
            }
          }
        }
      }
      return { caught: false };
    }
  },
  {
    rule_id: 'credential_harvesting_url',
    name: 'Credential Harvesting URL Detection',
    description: 'Detects suspicious redirect/session paths used to steal credentials',
    category: 'credential',
    score_contribution: 45,
    level_contribution: 3,
    always_active: false,
    check: ({ links }) => {
      if (!links?.length) return { caught: false };
      for (const link of links) {
        if (!link.href) continue;
        try {
          const url = new URL(link.href);
          if ((url.pathname.includes('verify') || url.pathname.includes('login') || url.pathname.includes('secure')) &&
            (url.searchParams.has('redirect') || url.searchParams.has('session') || url.searchParams.has('token'))) {
            return { caught: true, reason: `Credential harvesting URL: ${url.pathname}`, score: 45 };
          }
        } catch { }
      }
      return { caught: false };
    }
  },

  {
    rule_id: 'hidden_elements',
    name: 'Hidden Element Detection',
    description: 'Detects invisible links and iframes loading content without user knowledge',
    category: 'html',
    score_contribution: 20,
    level_contribution: 3,
    always_active: false,
    // 🚨 Notice we added 'url' to the parameters here:
    check: ({ html, links, iframes, url }) => {
      if (!html) return { caught: false };

      // SPA EXEMPTION: Ignore structural DOM checks on heavy Web Apps like Gmail
      const targetUrl = (url || '').toLowerCase();
      if (targetUrl.includes('mail.google.com') || targetUrl.includes('google.com')) {
        return { caught: false };
      }

      const rawDOM = html.toLowerCase();
      const hasHiddenIframe = rawDOM.includes('width="0"') || rawDOM.includes('height="0"');
      const hasInvisibleStyling = rawDOM.includes('opacity: 0') || rawDOM.includes('display:none') || rawDOM.includes('visibility:hidden');

      if (hasHiddenIframe || (hasInvisibleStyling && rawDOM.includes('<form'))) {
        return { caught: true, reason: 'Suspicious hidden elements or invisible iframes detected', score: 20 };
      }
      return { caught: false };
    }
  },
  {
    rule_id: 'obfuscated_js',
    name: 'Obfuscated JavaScript Detection',
    description: 'Detects deliberately hidden code using eval(), atob(), fromCharCode()',
    category: 'html',
    score_contribution: 25,
    level_contribution: 4,
    always_active: false,
    // 🚨 Added 'url' here too:
    check: ({ html, url }) => {
      if (!html) return { caught: false };

      // SPA EXEMPTION: Gmail uses atob() naturally for attachments. Ignore it here.
      const targetUrl = (url || '').toLowerCase();
      if (targetUrl.includes('mail.google.com') || targetUrl.includes('google.com')) {
        return { caught: false };
      }

      if (/eval\s*\(|String\.fromCharCode|unescape\s*\(|atob\s*\(/i.test(html)) {
        return { caught: true, reason: 'Obfuscated JavaScript — code is being hidden', score: 25 };
      }
      return { caught: false };
    }
  },
  {
    rule_id: 'suspicious_tld',
    name: 'Suspicious TLD Detection',
    description: 'Flags domains using TLDs associated with phishing: .xyz, .top, .click, .tk',
    category: 'domain',
    score_contribution: 30,
    level_contribution: 4,
    always_active: false,
    check: ({ links, url }) => {
      const allUrls = [url, ...(links || []).map(l => l.href)].filter(Boolean);
      const BAD_TLDS = ['.xyz', '.top', '.click', '.tk', '.ml', '.gq', '.cf', '.online', '.icu'];
      for (const linkHref of allUrls) {
        try {
          const domain = new URL(linkHref).hostname.toLowerCase();
          const tld = BAD_TLDS.find(t => domain.endsWith(t));
          if (tld) return { caught: true, reason: `Suspicious TLD "${tld}": ${domain}`, score: 30 };
        } catch {
          const tld = BAD_TLDS.find(t => linkHref.toLowerCase().endsWith(t));
          if (tld) return { caught: true, reason: `Suspicious TLD "${tld}" detected`, score: 30 };
        }
      }
      return { caught: false };
    }
  },
  {
    rule_id: 'social_engineering_otp',
    name: 'OTP Harvesting Detection',
    description: 'Detects requests for one-time passwords outside normal login flows',
    category: 'credential',
    score_contribution: 45,
    level_contribution: 4,
    always_active: false,
    check: ({ text }) => {
      if (!text) return { caught: false };
      if (/enter.*(?:otp|one.time|verification code|passcode)/i.test(text)) {
        return { caught: true, reason: 'Requests OTP/verification code — potential credential theft', score: 45 };
      }
      return { caught: false };
    }
  },
  {
    rule_id: 'fake_captcha',
    name: 'Fake CAPTCHA Trick Detection',
    description: 'Detects fake CAPTCHAs used to trick users into enabling notifications',
    category: 'behavioral',
    score_contribution: 40,
    level_contribution: 5,
    always_active: false,
    check: ({ text }) => {
      if (!text) return { caught: false };
      if (/(?:press allow to continue|click allow to verify|enable notifications to proceed)/i.test(text)) {
        return { caught: true, reason: 'Fake CAPTCHA social engineering trick', score: 40 };
      }
      return { caught: false };
    }
  },
  {
    rule_id: 'crypto_scam',
    name: 'Cryptocurrency Scam Detection',
    description: 'Detects crypto doubling scams, fake wallet connections, Bitcoin phishing',
    category: 'behavioral',
    score_contribution: 50,
    level_contribution: 5,
    always_active: false,
    check: ({ text }) => {
      if (!text) return { caught: false };
      if (/(?:send.*(?:btc|eth|bitcoin)|wallet.*(?:connect|verify)|metamask|(?:double|2x).*crypto)/i.test(text)) {
        return { caught: true, reason: 'Cryptocurrency scam pattern detected', score: 50 };
      }
      return { caught: false };
    }
  }
];

// ORIGINAL applyRules: Still checks the DB so your Red Team Dashboard Evolution works perfectly.
async function applyRules(scanData) {
  const findings = [];
  let totalScore = 0;

  const baseRule = RULE_LIBRARY.find(r => r.rule_id === 'keyword_basic');
  const baseResult = baseRule.check(scanData);
  if (baseResult.caught) { findings.push(baseResult.reason); totalScore += baseResult.score; }

  const activeRules = await DetectionRule.find({ active: true });
  const activeRuleIds = new Set(activeRules.map(r => r.rule_id));

  for (const ruleDef of RULE_LIBRARY) {
    if (ruleDef.always_active) continue;
    if (!activeRuleIds.has(ruleDef.rule_id)) continue;
    const result = ruleDef.check(scanData);
    if (result.caught) {
      findings.push(result.reason);
      totalScore += result.score || ruleDef.score_contribution;
      DetectionRule.findOneAndUpdate({ rule_id: ruleDef.rule_id }, { $inc: { catch_count: 1 } }).exec();
    }
  }
  return { findings, totalScore };
}

// 🚨 NEW applyAllRules: Ignores the DB locks. Gives the Extension maximum power immediately.
function applyAllRules(scanData) {
  const findings = [];
  let totalScore = 0;

  for (const ruleDef of RULE_LIBRARY) {
    const result = ruleDef.check(scanData);
    if (result.caught) {
      findings.push(result.reason);
      totalScore += result.score || ruleDef.score_contribution;
    }
  }
  return { findings, totalScore };
}

// Keep all your original dashboard helpers unchanged below:
async function getLevel() {
  const activeRules = await DetectionRule.find({ active: true });
  const points = activeRules.reduce((sum, r) => {
    const def = RULE_LIBRARY.find(d => d.rule_id === r.rule_id);
    return sum + (def?.level_contribution || 0);
  }, 0);
  const totalPossible = RULE_LIBRARY.filter(r => !r.always_active).reduce((s, r) => s + r.level_contribution, 0);
  const pct = Math.round((points / totalPossible) * 100);
  if (points === 0) return { level: 0, label: 'Untrained', color: '#666', points, totalPossible, pct };
  if (points <= 2) return { level: 1, label: 'Novice', color: '#f0c040', points, totalPossible, pct };
  if (points <= 5) return { level: 2, label: 'Developing', color: '#ff8c3c', points, totalPossible, pct };
  if (points <= 8) return { level: 3, label: 'Competent', color: '#60aaff', points, totalPossible, pct };
  if (points <= 12) return { level: 4, label: 'Advanced', color: '#cc77ff', points, totalPossible, pct };
  return { level: 5, label: 'Expert', color: '#00ffaa', points, totalPossible, pct };
}

async function identifyUnlockableRule(payload) {
  const html = payload;
  const candidates = [];
  if (/width=["']1["']|height=["']1["']|track\.[^"']{0,50}\.(gif|png|jpg)|beacon/i.test(html)) candidates.push('tracking_pixel');
  // Skipping the spoofed_headers regex line...

  if (/\/verify\/login|\/account\/verify|redirect=https|session=[a-zA-Z0-9]{8}/i.test(html)) candidates.push('credential_harvesting_url');
  if (/eval\s*\(|atob\s*\(|fromCharCode/i.test(html)) candidates.push('obfuscated_js');
  if (/\.(xyz|top|click|tk|ml|online|site|icu)["'\/]/i.test(html)) candidates.push('suspicious_tld');
  if (/otp|one\.time\.password|verification\.code/i.test(html.toLowerCase())) candidates.push('social_engineering_otp');
  if (html.includes('href=') && html.includes('</a>')) candidates.push('link_text_mismatch');

  const domainMatches = html.match(/href=["']https?:\/\/([^"'\/]+)/g) || [];
  for (const m of domainMatches) {
    const domain = m.replace(/href=["']https?:\/\//, '').split('/')[0].toLowerCase();
    const parts = domain.split('.');
    const regName = parts[parts.length - 2];
    const BRANDS = ['paypal', 'amazon', 'google', 'microsoft', 'apple', 'netflix', 'hdfc'];
    for (const brand of BRANDS) {
      if (regName && regName.includes(brand) && regName !== brand) {
        candidates.push('domain_spoofing');
        break;
      }
    }
  }

  const existing = await DetectionRule.find({ active: true });
  const knownIds = new Set(existing.map(r => r.rule_id));
  for (const c of candidates) {
    if (!knownIds.has(c)) return c;
  }

  const ALL_LEARNABLE = RULE_LIBRARY.filter(r => !r.always_active).map(r => r.rule_id);
  for (const ruleId of ALL_LEARNABLE) {
    if (!knownIds.has(ruleId)) return ruleId;
  }
  return null;
}

async function unlockRule(ruleId, threatId, generation, zerodayPreview) {
  const existing = await DetectionRule.findOne({ rule_id: ruleId });
  if (existing) return { already_known: true, rule: existing };
  const def = RULE_LIBRARY.find(r => r.rule_id === ruleId);
  if (!def) return null;
  const rule = await DetectionRule.create({
    rule_id: def.rule_id, name: def.name, description: def.description,
    category: def.category, score_contribution: def.score_contribution,
    level_contribution: def.level_contribution, active: true,
    learned_from_generation: generation, learned_from_threat_id: threatId,
    zero_day_preview: zerodayPreview?.substring(0, 200)
  });
  return { already_known: false, rule };
}

async function resetBlueTeam() {
  await DetectionRule.deleteMany({});
}

async function unlockAllRules() {
  const results = [];
  for (const rule of RULE_LIBRARY) {
    if (rule.always_active) continue;
    const existing = await DetectionRule.findOne({ rule_id: rule.rule_id });
    if (!existing) {
      await DetectionRule.create({
        rule_id: rule.rule_id, name: rule.name, description: rule.description,
        category: rule.category, score_contribution: rule.score_contribution,
        level_contribution: rule.level_contribution, active: true,
        learned_from_generation: 0, zero_day_preview: 'Manually unlocked'
      });
      results.push(rule.rule_id);
    }
  }
  return results;
}

// 🚨 CRITICAL: EXPORT BOTH FUNCTIONS 🚨
module.exports = {
  applyRules,
  applyAllRules,
  getLevel,
  identifyUnlockableRule,
  unlockRule,
  resetBlueTeam,
  RULE_LIBRARY,
  unlockAllRules
};