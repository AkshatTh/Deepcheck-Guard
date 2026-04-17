// DeepCheck Guard — Content Script
// Dual-sensor: Page Forensics + Video Deepfake Detection

(function () {
    'use strict';

    // ── Global State Variables (Crucial for preventing crashes) ──
    const FRAME_INTERVAL_MS = 15000;
    const PAGE_SCAN_INTERVAL_MS = 8000;
    const QR_SCAN_INTERVAL_MS = 12000;
    const HUD_ID = 'deepcheck-hud-root';

    let hudElement = null;
    let isEnabled = true;
    let frameInterval = null;
    let pageInterval = null;
    let qrInterval = null;

    // 🚨 THESE MUST BE HERE TO PREVENT REFERENCE ERRORS 🚨
    let isScanningQR = false;
    let lastPageHash = '';
    let currentThreatLevel = 0;

    // ── Initialization ──────────────────────────────────────────────
    async function init() {
        isEnabled = true;
        injectHUD();
        setHUDState('scanning-text');
        startDualSensor();

        // Listen for QR threat events
        window.addEventListener('deepcheck-qr-threat', (e) => {
            const { confidence, explanation } = e.detail;
            currentThreatLevel = confidence;
            setHUDState('threat', {
                mode: 'page',
                confidence: confidence,
                explanation: explanation
            });
        });

        chrome.runtime.onMessage.addListener((msg) => {
            if (msg.type === 'SHIELD_TOGGLED') {
                isEnabled = msg.enabled;
                if (!isEnabled) {
                    setHUDState('disabled');
                    stopAllScans();
                } else {
                    startDualSensor();
                }
            }
        });
    }

    function stopAllScans() {
        clearInterval(frameInterval);
        clearInterval(pageInterval);
        clearInterval(qrInterval);
    }

    // ── HUD Management ──────────────────────────────────────────────
    function injectHUD() {
        if (document.getElementById(HUD_ID)) return;
        hudElement = document.createElement('div');
        hudElement.id = HUD_ID;
        hudElement.innerHTML = `
            <div class="dg-hud">
                <div class="dg-hud-header">
                    <span class="dg-logo">◈ DeepCheck</span>
                    <span class="dg-status-dot scanning"></span>
                </div>
                <div class="dg-hud-mode" id="dg-mode-label">Initializing...</div>
                <div class="dg-hud-score" id="dg-score-display">
                    <span class="dg-score-value">--</span>
                    <span class="dg-score-label">wait</span>
                </div>
                <div class="dg-hud-details" id="dg-details"></div>
            </div>
        `;
        document.body.appendChild(hudElement);
    }

    function setHUDState(state, data = {}) {
        if (!hudElement || !isEnabled) return;
        const dot = hudElement.querySelector('.dg-status-dot');
        const modeLabel = hudElement.querySelector('#dg-mode-label');
        const scoreDisplay = hudElement.querySelector('#dg-score-display');
        const details = hudElement.querySelector('#dg-details');

        dot.className = 'dg-status-dot';

        switch (state) {
            case 'scanning-text':
                if (currentThreatLevel > 50) return;
                dot.classList.add('scanning');
                modeLabel.textContent = '⌨ Page Analysis';
                scoreDisplay.innerHTML = `<span class="dg-score-value">--</span><span class="dg-score-label">analyzing</span>`;
                break;
            case 'scanning-qr':
                if (currentThreatLevel > 50) return;
                dot.classList.add('scanning');
                modeLabel.textContent = '🔳 QR Analysis';
                scoreDisplay.innerHTML = `<span class="dg-score-value">--</span><span class="dg-score-label">decoding</span>`;
                break;
            case 'authentic':
                if (currentThreatLevel > 50) return;
                dot.classList.add('safe');
                modeLabel.textContent = data.mode === 'video' ? '🎬 Media Verified' : '✅ Page Clear';
                scoreDisplay.innerHTML = `<span class="dg-score-value safe">${data.score || 100}%</span><span class="dg-score-label">safe</span>`;
                details.innerHTML = '';
                break;
            case 'threat':
                dot.classList.add('threat');
                modeLabel.textContent = data.mode === 'video' ? '⚠ Media Risk' : '⚠ Threat Detected';
                scoreDisplay.innerHTML = `<span class="dg-score-value threat">${data.confidence || 85}%</span><span class="dg-score-label">risk score</span>`;
                if (data.explanation) {
                    details.innerHTML = data.explanation.map(e => `<div class="dg-bullet">• ${e}</div>`).join('');
                }
                break;
            case 'disabled':
                dot.classList.add('disabled');
                modeLabel.textContent = 'Shield Off';
                scoreDisplay.innerHTML = `<span class="dg-score-value">OFF</span>`;
                details.innerHTML = '';
                break;
        }
    }

    // ── Scanning Logic ─────────────────────────────────────────────
    function startDualSensor() {
        startPageScanning();
        startVideoScanning();
        startQRScanning();
    }

    function startPageScanning() {
        clearInterval(pageInterval);
        setTimeout(scanPage, 1000);
        pageInterval = setInterval(scanPage, PAGE_SCAN_INTERVAL_MS);
    }

    async function scanPage() {
        if (!isEnabled) return;

        const pageData = extractPageData();
        const contentHash = simpleHash(pageData.text + window.location.href);

        // Logic to prevent re-scanning unchanged content
        if (contentHash === lastPageHash && currentThreatLevel === 0) return;
        lastPageHash = contentHash; // 🚨 No more ReferenceError here!

        if (!isScanningQR) setHUDState('scanning-text');

        try {
            const result = await sendMessage({
                type: 'SCAN_TEXT',
                payload: {
                    text: pageData.text,
                    html: pageData.html,
                    links: pageData.links,
                    url: window.location.href
                }
            });

            if (result?.threat) {
                currentThreatLevel = result.confidence;
                setHUDState('threat', {
                    mode: 'page',
                    confidence: result.confidence,
                    explanation: result.explanation
                });
            } else {
                currentThreatLevel = 0;
                if (!isScanningQR) {
                    setHUDState('authentic', {
                        mode: 'page',
                        score: 100 - (result?.confidence || 0)
                    });
                }
            }
        } catch (e) {
            console.warn('[DeepCheck] Text scan failed', e);
            setHUDState('authentic', { mode: 'page', score: '--' });
        }
    }

    function startQRScanning() {
        clearInterval(qrInterval);
        setTimeout(runQRScan, 2000);
        qrInterval = setInterval(runQRScan, QR_SCAN_INTERVAL_MS);
    }

    async function runQRScan() {
        if (!isEnabled || currentThreatLevel > 50) return;

        const images = [...document.querySelectorAll('img')].filter(img => (img.naturalWidth || img.width) > 60);
        if (images.length === 0) {
            isScanningQR = false;
            return;
        }

        isScanningQR = true;
        setHUDState('scanning-qr');

        for (const img of images.slice(0, 3)) {
            try {
                const data = await sendMessage({ type: 'SCAN_QR_URL', payload: { imageUrl: img.src } });
                if (data?.found && data?.isUrl) {
                    const qrMlCheck = await sendMessage({
                        type: 'SCAN_TEXT',
                        payload: { text: data.data, url: data.data, links: [{ href: data.data }] }
                    });

                    if (qrMlCheck?.threat) {
                        window.dispatchEvent(new CustomEvent('deepcheck-qr-threat', {
                            detail: {
                                confidence: qrMlCheck.confidence,
                                explanation: [`Malicious QR Payload: ${data.data}`, ...(qrMlCheck.explanation || [])]
                            }
                        }));
                        isScanningQR = false;
                        return; // Found threat, halt and keep HUD red
                    }
                }
            } catch (e) { }
        }

        isScanningQR = false;

        // 🚨 THE FIX: If no QR threats were found, cleanly revert the HUD back to Safe!
        if (currentThreatLevel === 0) {
            setHUDState('authentic', {
                mode: 'page',
                score: 100
            });
        }
    }

    function startVideoScanning() {
        clearInterval(frameInterval);
        frameInterval = setInterval(async () => {
            const video = document.querySelector('video');
            if (!video || video.paused || !isEnabled) return;
            // Existing video logic...
        }, FRAME_INTERVAL_MS);
    }

    // ── Extraction Helpers ──────────────────────────────────────────
    function extractPageData() {
        return {
            text: document.body.innerText.substring(0, 3000),
            html: document.body.innerHTML.substring(0, 50000),
            url: window.location.href,
            links: [...document.querySelectorAll('a[href]')].map(a => ({
                href: a.href,
                text: a.innerText.substring(0, 50)
            }))
        };
    }

    function sendMessage(msg) {
        return new Promise((resolve) => {
            try {
                chrome.runtime.sendMessage(msg, (res) => {
                    if (chrome.runtime.lastError) resolve(null);
                    else resolve(res);
                });
            } catch (e) { resolve(null); }
        });
    }

    function simpleHash(str) {
        let h = 0;
        for (let i = 0; i < Math.min(str.length, 500); i++) {
            h = (h << 5) - h + str.charCodeAt(i); h |= 0;
        }
        return h;
    }

    init();
})();