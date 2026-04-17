function generateAttack(config) {
    let html = `<div>`;
    let text = ``;
    let links = [];

    const JITTER_WORDS = ["Update", "Alert", "Security", "Notification", "Notice", "Action Required"];
    
    // 1. Text Generation with JITTER (Actually calling it now!)
    let baseText = "";
    if (config.urgency_level > 0.5) {
        baseText = "URGENT: Your account has been suspended. Please verify immediately.";
        html += `<h1>URGENT ACTION REQUIRED</h1>`;
    } else if (config.urgency_level > 0) {
        baseText = "Notice: You have a pending notification.";
        html += `<p>Notice: Please review your recent activity.</p>`;
    } else {
        baseText = "Hello, thank you for using our service.";
        html += `<p>Regular service update.</p>`;
    }

    // Apply the Jitter to break ML keyword memory
    const words = baseText.split(" ");
    const prefix = JITTER_WORDS[Math.floor(Math.random() * JITTER_WORDS.length)];
    const randomID = Math.random().toString(36).substring(7);
    text = `${prefix}: ${words.slice(1).join(" ")} (ID: ${randomID})`;

    // 2. Domain Generation (Aligned with mutateAttack strings)
    let targetUrl = "https://secure-login.com/auth"; // Default 'clean'
    
    if (config.domain_type === "ip_address") {
        targetUrl = `http://${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}.1.54/verify`;
    } else if (config.domain_type === "homoglyph") {
        targetUrl = "https://paypa1-secure-check.net/login";
    } else if (config.domain_type === "suspicious_tld") {
        targetUrl = "https://account-verify.xyz/login";
    }

    // 3. Link Mismatch Logic
    let displayUrl = config.link_mismatch ? "https://paypal.com/security-center" : targetUrl;

    html += `<a href="${targetUrl}">${displayUrl}</a>`;
    links.push({ href: targetUrl, text: displayUrl, isHidden: false });

    // 4. Structural Elements
    if (config.hidden_elements) {
        html += `<img src="http://tracker.com/px.png" style="display:none;" />`;
        links.push({ href: "http://tracker.com/px.png", text: "", isHidden: true });
    }

    let forms = [];
    if (config.credential_trap) {
        html += `<form action="${targetUrl}" method="POST"><input type="password" /><button>Log In</button></form>`;
        forms.push({ action: targetUrl, method: "POST", hasPasswordField: true });
    }

    html += `</div>`;
    return { html, text, links, forms, url: targetUrl };
}

function mutateAttack(currentConfig, wasCaught) {
    if (!wasCaught) {
        return { ...currentConfig, urgency_level: Math.min(1.0, currentConfig.urgency_level + 0.05) };
    }

    // 🔴 AGGRESSIVE TACTICAL SHIFT
    const tactics = [
        { name: 'NLP Ghost', config: { urgency_level: 0.05, domain_type: 'clean', link_mismatch: false } },
        { name: 'Domain Cloaking', config: { urgency_level: 0.4, domain_type: 'ip_address', link_mismatch: true } },
        { name: 'Urgency Spike', config: { urgency_level: 0.9, domain_type: 'homoglyph', link_mismatch: false } },
        { name: 'Structural Trap', config: { urgency_level: 0.3, domain_type: 'suspicious_tld', link_mismatch: true } }
    ];

    const newTactic = tactics.filter(t => t.name !== currentConfig.tactic)[Math.floor(Math.random() * (tactics.length - 1))];

    return {
        ...newTactic.config,
        tactic: newTactic.name,
        obfuscation_level: 0,
        hidden_elements: false
    };
}

module.exports = { generateAttack, mutateAttack };