const express = require('express');
const axios = require('axios');
const sharp = require('sharp'); // High-performance engine for WebP/PNG/JPG
const jsQR = require('jsqr');
const router = express.Router(); // This must be defined before any router.post calls

// Helper for image processing and QR decoding
async function processQRCode(buffer) {
    try {
        // Normalize image to raw RGBA pixels (Handles WebP natively)
        const { data, info } = await sharp(buffer)
            .ensureAlpha()
            .raw()
            .toBuffer({ resolveWithObject: true });

        const code = jsQR(new Uint8ClampedArray(data), info.width, info.height);
        
        if (code) {
            return { found: true, data: code.data, isUrl: /^https?:\/\//.test(code.data) };
        }
        return { found: false, data: null, isUrl: false };
    } catch (err) {
        console.error("Image processing failed:", err.message);
        return { found: false, error: "Invalid image format" };
    }
}

// ── QR Decoder (From URL) ──
router.post('/qr-url', async (req, res) => {
    try {
        const { imageUrl } = req.body;
        if (!imageUrl) return res.json({ found: false, message: "No URL provided" });

        const response = await axios.get(imageUrl, { 
            responseType: 'arraybuffer',
            timeout: 5000 
        });
        
        const result = await processQRCode(Buffer.from(response.data));
        res.json(result);
    } catch (error) {
        console.error("QR URL Decode Error:", error.message);
        // Return 200 with 'found: false' so the extension doesn't hang
        res.json({ found: false, data: null, isUrl: false });
    }
});

// ── QR Decoder (From Base64) ──
router.post('/qr', async (req, res) => {
    try {
        const { imageBase64 } = req.body;
        if (!imageBase64) return res.json({ found: false });

        const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, 'base64');
        
        const result = await processQRCode(buffer);
        res.json(result);
    } catch (error) {
        res.json({ found: false, error: "Failed to decode base64 QR" });
    }
});

module.exports = router;