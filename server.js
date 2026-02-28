const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

// Load .env file
try {
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
      const match = line.match(/^([^#=]+)=(.*)$/);
      if (match) process.env[match[1].trim()] = match[2].trim();
    }
  }
} catch(e) {}

const PORT = 3003;
const CINDERELLA = 'https://cinderella.clawbridge.org';
const GEMINI_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = 'gemini-2.5-flash';

const MIME = {
  '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml',
  '.json': 'application/json', '.ico': 'image/x-icon',
};

// ─── SHIRO SYSTEM PROMPT ───
const SHIRO_SYSTEM = `You are Shiro, the personal fashion stylist and shopkeeper at Cinderella — an exclusive virtual clothing boutique. 

PERSONALITY:
- Warm, witty, and genuinely passionate about fashion
- You have strong opinions but deliver them with charm
- You remember EVERYTHING about the customer across sessions
- You speak concisely (2-3 sentences max unless asked for detail)
- You use occasional fashion terminology naturally
- You're honest — if something doesn't suit them, you say so tactfully
- You build rapport over time — formal at first, increasingly friendly

THE STORE:
- Cinderella has 3 rooms: Reception (where you greet), Upperwear (tops, jackets, coats), Lowerwear (pants, dresses, skirts)
- There's also a Try-On Room with AI-powered virtual fitting
- All products are Zara brand

PRODUCTS - UPPERWEAR:
1. Beige Draped Top ($45.90) - elegant drape, warm beige
2. Striped Polo Knit ($39.90) - nautical casual, versatile
3. Lace Corset Top ($49.90) - statement piece, evening wear
4. Black Zip Jacket ($89.90) - edgy, streetwear staple
5. Scarf Trench Coat ($149.00) - luxury layering, investment piece
6. Knit Cardigan ($59.90) - cozy chic, layering essential
7. Navy Drawstring Jacket ($99.90) - sporty-luxe, transitional

PRODUCTS - LOWERWEAR:
1. Brown Wide-Leg Pants ($49.90) - '70s silhouette, elongating
2. Barrel Jeans ($45.90) - trendy relaxed fit, denim essential
3. White Pants Set ($59.90) - clean, summer-ready
4. Cargo Pants ($69.90) - utility chic, street style
5. Halter Midi Dress ($69.90) - date night, elegant
6. Pink Cashmere Look ($55.90) - soft luxury, cozy
7. Gingham Peplum Top ($35.90) - playful pattern, budget-friendly

YOUR RESPONSES:
Always respond in this exact JSON format (no markdown, just raw JSON):
{
  "dialogue": "Your spoken text to the customer",
  "action": null or one of: "goto_upperwear", "goto_lowerwear", "goto_tryon", "goto_reception", "highlight_product", "suggest_outfit",
  "productHighlight": null or product name to highlight,
  "mood": "friendly" | "excited" | "thoughtful" | "concerned" | "playful",
  "options": [{"text": "button label", "value": "short_id"}, ...] or empty array for free response,
  "stylingNote": null or a brief internal note about what you learned about this customer's style (stored in memory)
}

OUTFIT PAIRING KNOWLEDGE (use this to make specific recommendations):
- Beige Draped Top + Brown Wide-Leg Pants = "Tonal earth goddess" look ($95.80)
- Beige Draped Top + Barrel Jeans = "Effortless weekend" ($91.80)
- Lace Corset Top + Halter Midi Dress layered = "Evening editorial" ($119.80)
- Black Zip Jacket + Barrel Jeans = "Downtown cool" ($135.80)
- Black Zip Jacket + Cargo Pants = "Street-luxe utility" ($159.80)
- Scarf Trench Coat + White Pants Set = "Parisian chic" ($208.90)
- Scarf Trench Coat + Brown Wide-Leg Pants = "Autumn editorial" ($198.90)
- Knit Cardigan + Pink Cashmere Look = "Cozy layering" ($115.80)
- Knit Cardigan + Barrel Jeans = "Coffee run chic" ($105.80)
- Navy Drawstring Jacket + Cargo Pants = "Weekend explorer" ($169.80)
- Navy Drawstring Jacket + White Pants Set = "Nautical clean" ($159.80)
- Striped Polo Knit + Brown Wide-Leg Pants = "Retro prep" ($89.80)
- Striped Polo Knit + Barrel Jeans = "Casual Friday" ($85.80)
- Gingham Peplum Top + Halter Midi Dress = "Garden party" ($105.80)
- Lace Corset Top + White Pants Set = "Date night" ($109.80)

When a customer adds something to cart or asks for advice, ALWAYS suggest a specific pairing from above.
Say things like: "That Trench Coat is stunning — pair it with our Brown Wide-Leg Pants for a full Parisian editorial look at $198.90."

RULES:
- When customer first arrives, greet them and ask what they're looking for. Offer to go to Upperwear or Lowerwear.
- Guide naturally — don't just list options, make personalized suggestions based on what you know
- If you know their purchase history, reference it: "Last time you loved that trench coat..."
- When they've been shopping, proactively ask if they want to try things on
- If they pick clashing items, gently suggest alternatives
- ALWAYS recommend outfit pairings — suggest which top goes with which bottom
- When they add an upperwear item, suggest a matching lowerwear item (and vice versa)
- Include a "See Shiro's Pick" or "View pairing" option when recommending
- Build a style profile over time in your stylingNotes
- Be brief! This is a game, not a novel. 2-3 sentences max per response.
- Always include options array with 2-4 clickable choices (players click, not type)
- The "value" in options should be descriptive: "go_upperwear", "go_lowerwear", "go_tryon", "browse_more", "checkout", "ask_advice", "see_pairing", etc.
- ALWAYS include a "Keep browsing" (value: "browse_more") option so the player can continue shopping
- When recommending a pairing, include an option with value "see_pairing_[product]" so the player can navigate directly to that product's room
- When a customer has 2+ items in cart, suggest trying on the complete outfit together
- If in the try-on room, offer "Try entire outfit" (value: "go_tryon") as an option`;

// ─── Gemini Chat Handler ───
async function handleShiroChat(body) {
  const { memory, currentRoom, cart, playerAction, sessionHistory } = JSON.parse(body);

  // Build the conversation from session history
  const contents = [];
  
  // Add session history as conversation turns
  if (sessionHistory && sessionHistory.length > 0) {
    for (const msg of sessionHistory) {
      contents.push({ role: msg.role, parts: [{ text: msg.text }] });
    }
  }

  // Add current context + player action as the latest user message
  const contextMsg = `[GAME STATE]
Room: ${currentRoom}
Cart: ${cart && cart.length > 0 ? cart.map(i => i.name + ' ($' + i.price + ')').join(', ') : 'empty'}
${memory ? '[CUSTOMER MEMORY]\n' + memory : '[NEW CUSTOMER - first visit]'}

[PLAYER ACTION]
${playerAction}`;

  contents.push({ role: 'user', parts: [{ text: contextMsg }] });

  const geminiBody = {
    system_instruction: { parts: [{ text: SHIRO_SYSTEM }] },
    contents,
    generationConfig: {
      temperature: 0.9,
      maxOutputTokens: 1024,
      responseMimeType: 'application/json',
    },
  };

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_KEY}`;

  return new Promise((resolve, reject) => {
    const data = JSON.stringify(geminiBody);
    const req = https.request(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
      timeout: 30000,
    }, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text || '';
          // Try to parse as JSON
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            resolve(JSON.parse(jsonMatch[0]));
          } else {
            resolve({ dialogue: text, action: null, options: [], mood: 'friendly' });
          }
        } catch (e) {
          reject(new Error('Failed to parse Gemini response: ' + e.message));
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Gemini timeout')); });
    req.write(data);
    req.end();
  });
}

// ─── HTTP POST Helper (for Gemini/Imagen APIs) ───
function httpPost(url, body, timeout = 30000) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const data = typeof body === 'string' ? body : JSON.stringify(body);
    const req = https.request(parsedUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
      timeout,
    }, (res) => {
      let chunks = '';
      res.on('data', c => chunks += c);
      res.on('end', () => {
        try { resolve(JSON.parse(chunks)); } catch (e) { reject(new Error('JSON parse failed: ' + chunks.slice(0, 200))); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    req.write(data);
    req.end();
  });
}

// ─── HTTP GET → Base64 Helper (for fetching avatar images) ───
function httpPost_GET(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    mod.get(url, { timeout: 15000 }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return httpPost_GET(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) { reject(new Error('HTTP ' + res.statusCode)); return; }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('base64')));
    }).on('error', reject);
  });
}

// ─── Gemini Text Helper ───
async function callGemini(geminiBody) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_KEY}`;
  const data = JSON.stringify(geminiBody);
  return new Promise((resolve, reject) => {
    const req = https.request(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
      timeout: 30000,
    }, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text || '';
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (jsonMatch) resolve(JSON.parse(jsonMatch[0]));
          else resolve({ fitScore: 7, overallVerdict: text || 'Looks great!', stylingTips: [] });
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Gemini timeout')); });
    req.write(data);
    req.end();
  });
}

// ─── HTTP Server ───
const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  // ─── Shiro AI Chat endpoint ───
  if (req.url === '/api/shiro/chat' && req.method === 'POST') {
    let body = [];
    req.on('data', c => body.push(c));
    req.on('end', async () => {
      try {
        const result = await handleShiroChat(Buffer.concat(body).toString());
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // ─── Try-On Fit Analysis ───
  if (req.url === '/api/tryon' && req.method === 'POST') {
    let body = [];
    req.on('data', c => body.push(c));
    req.on('end', async () => {
      try {
        const { imageBase64, garmentName, garmentBrand, garmentPrice } = JSON.parse(Buffer.concat(body).toString());

        const prompt = `You are a fashion AI stylist. Analyze how well this garment would suit the person in the photo.

Garment: ${garmentName} by ${garmentBrand} (${garmentPrice})

Respond in this exact JSON format (no markdown):
{
  "fitScore": 8,
  "overallVerdict": "Great match for your frame",
  "colorHarmony": "The tones complement your complexion beautifully",
  "fitRecommendations": "Go true to size — the relaxed cut suits your proportions",
  "stylingTips": ["Pair with minimal accessories", "Try tucking the front for a polished look", "White sneakers complete this outfit"],
  "occasions": ["Casual Friday", "Weekend brunch", "Date night"]
}

Be specific, honest, and encouraging. If no person image provided, give general styling advice.`;

        const parts = [{ text: prompt }];
        if (imageBase64 && imageBase64.length > 100) {
          const b64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
          parts.unshift({ inline_data: { mime_type: 'image/jpeg', data: b64 } });
        }

        const geminiBody = {
          contents: [{ role: 'user', parts }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 512, responseMimeType: 'application/json' },
        };

        const result = await callGemini(geminiBody);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // ─── Try-On Avatar Generation (Imagen 4.0 → Gemini Image fallback) ───
  if (req.url === '/api/tryon/avatar-tryon' && req.method === 'POST') {
    let body = [];
    req.on('data', c => body.push(c));
    req.on('end', async () => {
      try {
        const { avatarUrl, garmentImage, garmentName, garmentBrand, measurements, selectedSize, usualSize } = JSON.parse(Buffer.concat(body).toString());

        if (!garmentImage) { res.writeHead(400, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'No garment image' })); return; }

        // Load avatar image from various sources
        let avatarB64;
        if (avatarUrl && avatarUrl.startsWith('data:')) {
          avatarB64 = avatarUrl.split(',')[1];
        } else if (avatarUrl && avatarUrl.startsWith('/')) {
          // Try local file first
          const filePath = path.join(__dirname, avatarUrl);
          try { avatarB64 = fs.readFileSync(filePath).toString('base64'); } catch(e) {}
          // Fallback: fetch from Cinderella backend
          if (!avatarB64) {
            try {
              const fetched = await httpPost_GET(`${CINDERELLA}${avatarUrl}`);
              if (fetched) avatarB64 = fetched;
            } catch(e) { console.log('[TryOn] Failed to fetch avatar from Cinderella:', e.message); }
          }
        } else if (avatarUrl && avatarUrl.startsWith('http')) {
          try {
            const fetched = await httpPost_GET(avatarUrl);
            if (fetched) avatarB64 = fetched;
          } catch(e) {}
        }

        const garmentB64 = garmentImage.includes(',') ? garmentImage.split(',')[1] : garmentImage;
        const garmentLabel = `${garmentName || 'garment'}${garmentBrand ? ' by ' + garmentBrand : ''}`;
        const measStr = measurements ? `Height ${measurements.heightCm}cm, chest ${measurements.chestCm}cm, waist ${measurements.waistCm}cm, hips ${measurements.hipsCm}cm.` : '';

        // Build fit instructions from size comparison
        const SIZE_ORDER = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
        let fitPrompt = 'The garment must fit naturally with realistic fabric physics — wrinkles at joints, natural drape.';
        if (selectedSize && usualSize) {
          const selIdx = SIZE_ORDER.indexOf(selectedSize);
          const usrIdx = SIZE_ORDER.indexOf(usualSize);
          if (selIdx >= 0 && usrIdx >= 0) {
            const diff = selIdx - usrIdx;
            if (diff === 0) fitPrompt = `Size ${selectedSize} — perfect fit. Flattering silhouette, correct proportions, natural drape.`;
            else if (diff < 0) fitPrompt = `Size ${selectedSize} is ${Math.abs(diff)} size(s) too small (usual: ${usualSize}). Show it slightly tight and compressed.`;
            else fitPrompt = `Size ${selectedSize} is ${diff} size(s) too big (usual: ${usualSize}). Show excess fabric, slightly oversized.`;
          }
        }

        const imagenPrompt = `A person wearing ${garmentLabel}. Full body studio photograph, plain light gray background, professional lighting. ${fitPrompt} ${measStr} Hyperrealistic photograph, 85mm lens, studio quality.`;

        let resultImage = null;

        // ─── Try Imagen 4.0 Ultra / 4.0 (if avatar available) ───
        if (avatarB64) {
          for (const model of ['imagen-4.0-ultra-generate-001', 'imagen-4.0-generate-001']) {
            try {
              console.log('[TryOn] Trying ' + model + '...');
              const imagenBody = JSON.stringify({
                instances: [{
                  prompt: imagenPrompt,
                  referenceImages: [
                    { referenceType: 2, referenceImage: { bytesBase64Encoded: avatarB64 } },
                    { referenceType: 1, referenceImage: { bytesBase64Encoded: garmentB64 } },
                  ],
                }],
                parameters: { sampleCount: 1, aspectRatio: '3:4', personGeneration: 'allow_all' },
              });

              const imgResult = await httpPost(`https://generativelanguage.googleapis.com/v1beta/models/${model}:predict?key=${GEMINI_KEY}`, imagenBody, 90000);
              const pred = imgResult.predictions?.[0];
              if (pred?.bytesBase64Encoded) {
                resultImage = `data:${pred.mimeType || 'image/png'};base64,${pred.bytesBase64Encoded}`;
                console.log('[TryOn] ✓ Success with ' + model);
                break;
              }
            } catch (e) { console.log('[TryOn] ' + model + ' error:', e.message); }
          }
        }

        // ─── Fallback: Gemini image models ───
        if (!resultImage) {
          const prompt = `You are given two images:\nImage 1: A person (their avatar).\nImage 2: A clothing garment (${garmentLabel}).\n\nGenerate a hyperrealistic photograph of the SAME person from Image 1, now wearing the garment from Image 2.\n- Face, skin tone, hair, body shape: IDENTICAL to Image 1\n- ${fitPrompt}\n- Same studio background and lighting\n- Full body: head to feet\n${measStr ? 'Body measurements: ' + measStr : ''}\nPhotorealistic quality only.`;

          const parts = [];
          if (avatarB64) parts.push({ inline_data: { mime_type: 'image/png', data: avatarB64 } });
          parts.push({ inline_data: { mime_type: 'image/jpeg', data: garmentB64 } });
          parts.push({ text: prompt });

          for (const model of ['gemini-2.0-flash-exp-image-generation', 'gemini-2.0-flash-preview-image-generation']) {
            try {
              console.log('[TryOn] Trying ' + model + '...');
              const gemResult = await httpPost(
                `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_KEY}`,
                JSON.stringify({ contents: [{ parts }], generationConfig: { responseModalities: ['TEXT', 'IMAGE'] } }),
                90000
              );
              const respParts = gemResult.candidates?.[0]?.content?.parts || [];
              const imgPart = respParts.find(p => p.inlineData || p.inline_data);
              if (imgPart) {
                const inl = imgPart.inlineData || imgPart.inline_data;
                resultImage = `data:${inl.mimeType || inl.mime_type || 'image/png'};base64,${inl.data}`;
                console.log('[TryOn] ✓ Success with ' + model);
                break;
              }
            } catch (e) { console.log('[TryOn] ' + model + ' error:', e.message); }
          }
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(resultImage ? { success: true, image: resultImage } : { success: false }));
      } catch (e) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: e.message }));
      }
    });
    return;
  }

  // ─── Try-On Generate (person + garment via Gemini image gen) ───
  if (req.url === '/api/tryon/generate' && req.method === 'POST') {
    let body = [];
    req.on('data', c => body.push(c));
    req.on('end', async () => {
      try {
        const { personImage, garmentImage, outfitDescription } = JSON.parse(Buffer.concat(body).toString());

        const parts = [];
        if (personImage) {
          const b64 = personImage.replace(/^data:image\/\w+;base64,/, '');
          parts.push({ inline_data: { mime_type: 'image/jpeg', data: b64 } });
        }
        if (garmentImage) {
          const b64g = garmentImage.replace(/^data:image\/\w+;base64,/, '');
          parts.push({ inline_data: { mime_type: 'image/jpeg', data: b64g } });
        }
        const desc = outfitDescription
          ? `Generate a virtual try-on: Show a person wearing this complete outfit: ${outfitDescription}. The image shows the garment references. Render a full body studio photograph of a model wearing ALL these pieces together — top on upper body, bottom/pants on lower body. Hyperrealistic, clean studio background, 85mm lens.`
          : 'Generate a virtual try-on image: Show the person from the first image wearing the garment from the second image. Hyperrealistic, full body, clean studio background. The person must look identical — same face, body, skin tone. Natural garment fit with realistic drape.';
        parts.push({ text: desc });

        let resultImage = null;
        for (const model of ['gemini-2.0-flash-exp-image-generation', 'gemini-2.0-flash-preview-image-generation']) {
          try {
            console.log('[TryOn/Generate] Trying ' + model + '...');
            const gemResult = await httpPost(
              `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_KEY}`,
              JSON.stringify({ contents: [{ parts }], generationConfig: { responseModalities: ['TEXT', 'IMAGE'] } }),
              90000
            );
            const respParts = gemResult.candidates?.[0]?.content?.parts || [];
            const imgPart = respParts.find(p => p.inlineData || p.inline_data);
            if (imgPart) {
              const inl = imgPart.inlineData || imgPart.inline_data;
              resultImage = `data:${inl.mimeType || inl.mime_type || 'image/png'};base64,${inl.data}`;
              console.log('[TryOn/Generate] ✓ Success with ' + model);
              break;
            }
          } catch (e) { console.log('[TryOn/Generate] ' + model + ' error:', e.message); }
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(resultImage ? { success: true, image: resultImage } : { success: false }));
      } catch (e) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: e.message }));
      }
    });
    return;
  }

  // ─── Proxy /api/* to Cinderella ───
  if (req.url.startsWith('/api/')) {
    let body = [];
    req.on('data', chunk => body.push(chunk));
    req.on('end', () => {
      const postData = Buffer.concat(body);
      const url = new URL(req.url, CINDERELLA);

      const proxyReq = https.request(url, {
        method: req.method,
        timeout: 120000,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': postData.length,
        },
      }, (proxyRes) => {
        res.writeHead(proxyRes.statusCode, {
          'Content-Type': proxyRes.headers['content-type'] || 'application/json',
          'Access-Control-Allow-Origin': '*',
        });
        proxyRes.pipe(res);
      });

      proxyReq.on('error', (e) => {
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Proxy error: ' + e.message }));
      });

      proxyReq.write(postData);
      proxyReq.end();
    });
    return;
  }

  // ─── Proxy /avatars/* to Cinderella ───
  if (req.url.startsWith('/avatars/')) {
    const url = new URL(req.url, CINDERELLA);
    https.get(url, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, {
        'Content-Type': proxyRes.headers['content-type'] || 'image/png',
        'Access-Control-Allow-Origin': '*',
      });
      proxyRes.pipe(res);
    }).on('error', () => {
      res.writeHead(502); res.end('Proxy error');
    });
    return;
  }

  // ─── Static files ───
  let filePath = path.join(__dirname, req.url === '/' ? 'index.html' : req.url);
  const ext = path.extname(filePath).toLowerCase();

  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
});

server.listen(PORT, () => console.log(`Cinderella Game running on http://localhost:${PORT}`));
