// DeepCheck Guard — Background Service Worker (MV3)
// Handles message routing between content scripts and the gateway

const GATEWAY_URL = 'http://127.0.0.1:3001/api'; // <-- CHANGED THIS LINE

chrome.runtime.onInstalled.addListener(() => {
  console.log('[DeepCheck Guard] Extension installed. Shield active.');
  chrome.storage.local.set({
    enabled: true,
    scanMode: 'dual', // 'text' | 'video' | 'dual'
    totalThreatsBlocked: 0,
    totalFramesScanned: 0
  });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SCAN_TEXT') {
    scanText(message.payload).then(sendResponse).catch(err => {
      sendResponse({ error: err.message });
    });
    return true; // Keep message channel open for async
  }

  if (message.type === 'SCAN_FRAME') {
    scanFrame(message.payload).then(sendResponse).catch(err => {
      sendResponse({ error: err.message });
    });
    return true;
  }

  if (message.type === 'SCAN_QR_URL') {
    scanQRFromUrl(message.payload).then(sendResponse).catch(() => sendResponse({ found: false }));
    return true;
  }

  if (message.type === 'SCAN_QR') {
    scanQR(message.payload).then(sendResponse).catch(() => sendResponse({ found: false }));
    return true;
  }

  if (message.type === 'SCAN_REDIRECTS') {
    scanRedirects(message.payload).then(sendResponse).catch(() => sendResponse({ suspicious: false }));
    return true;
  }

  if (message.type === 'GET_STATUS') {
    chrome.storage.local.get(['enabled', 'totalThreatsBlocked', 'totalFramesScanned'], sendResponse);
    return true;
  }

  if (message.type === 'TOGGLE_SHIELD') {
    chrome.storage.local.get(['enabled'], (data) => {
      const newState = !data.enabled;
      chrome.storage.local.set({ enabled: newState });
      sendResponse({ enabled: newState });
    });
    return true;
  }
});

async function scanText(payload) {
  try {
    // REMOVED the extra /api from the template literal
    const res = await fetch(`${GATEWAY_URL}/scan/text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        text: payload.text, 
        html: payload.html || '', 
        links: payload.links || [], 
        iframes: payload.iframes || [], 
        forms: payload.forms || [], 
        url: payload.url || '', 
        isEmailPage: payload.isEmailPage || false 
      })
    });
    return await res.json();
  } catch (err) {
    console.error('[DeepCheck] Text scan failed:', err);
    // Return a valid object so content.js can finish the scan cycle
    return { threat: false, confidence: 0, error: 'Gateway unreachable' };
  }
} 

async function scanFrame(payload) {
  try {
    const res = await fetch(`${GATEWAY_URL}/scan/video`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ frame: payload.frame, timestamp: payload.timestamp })
    });
    const data = await res.json();

    chrome.storage.local.get(['totalFramesScanned'], (storage) => {
      chrome.storage.local.set({ totalFramesScanned: (storage.totalFramesScanned || 0) + 1 });
    });

    return data;
  } catch (err) {
    console.error('[DeepCheck] Frame scan failed:', err);
    return { deepfake_detected: false, error: 'AI service unreachable' };
  }
}

async function scanQR(payload) {
  try {
    const res = await fetch(`${GATEWAY_URL}/forensics/qr`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64: payload.imageBase64 })
    });
    return await res.json();
  } catch { return { found: false }; }
}

async function scanRedirects(payload) {
  try {
    const res = await fetch(`${GATEWAY_URL}/forensics/redirects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: payload.url })
    });
    return await res.json();
  } catch { return { suspicious: false }; }
}

async function scanQRFromUrl(payload) {
  try {
    // Corrected path
    const res = await fetch(`${GATEWAY_URL}/forensics/qr-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageUrl: payload.imageUrl })
    });
    return await res.json();
  } catch { 
    return { found: false }; 
  }
}