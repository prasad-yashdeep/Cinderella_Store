# 👗 Cinderella — AI-Powered Virtual Clothing Store

> A browser-based virtual boutique where an AI stylist helps you shop, try on clothes, and build outfits — all rendered in real-time Canvas 2D with a game-like experience.

**Live Demo:** [gamecraft.clawbridge.org](https://gamecraft.clawbridge.org)

![Canvas 2D](https://img.shields.io/badge/Rendering-Canvas%202D-orange)
![Gemini](https://img.shields.io/badge/AI-Gemini%202.5%20Flash-blue)
![Imagen](https://img.shields.io/badge/TryOn-Imagen%204.0-green)
![Zero Dependencies](https://img.shields.io/badge/Frontend-Zero%20Dependencies-brightgreen)

---

## 🎮 What Is This?

Cinderella is a **virtual clothing store disguised as a game**. You walk through a beautifully rendered boutique, chat with an AI stylist named **Shiro**, browse real Zara products, create a personal avatar, and virtually try on clothes using AI-generated imagery.

It's not a static e-commerce page. It's an **interactive experience** — you physically walk your character between rooms, interact with products on shelves, and have real conversations with an AI that remembers your style preferences.

### Core Experience
1. **Enter the boutique** — Shiro greets you at reception
2. **Browse rooms** — Walk to Upperwear or Lowerwear collections
3. **Interact with products** — Click items on shelves, add to cart
4. **Chat with Shiro** — Get personalized style advice and outfit pairings
5. **Create your avatar** — Upload photos, set measurements
6. **Virtual try-on** — AI generates images of you wearing the clothes
7. **Checkout** — Complete your purchase with XP rewards

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     BROWSER (Client)                     │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │              index.html (3,600 lines)              │   │
│  │                                                    │   │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐  │   │
│  │  │ Game Engine │  │ Renderer   │  │ AI Chat UI │  │   │
│  │  │ • Game loop │  │ • Rooms    │  │ • Dialogue │  │   │
│  │  │ • Physics   │  │ • Sprites  │  │ • Options  │  │   │
│  │  │ • Input     │  │ • Particles│  │ • Overlays │  │   │
│  │  │ • State     │  │ • UI/HUD   │  │ • Try-On   │  │   │
│  │  └────────────┘  └────────────┘  └────────────┘  │   │
│  │                                                    │   │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐  │   │
│  │  │ Avatar Sys │  │ Progression│  │ Audio      │  │   │
│  │  │ • Photos   │  │ • XP/Level │  │ • Web Audio│  │   │
│  │  │ • Measures │  │ • History  │  │ • SFX      │  │   │
│  │  │ • Body type│  │ • Memory   │  │ • Ambient  │  │   │
│  │  └────────────┘  └────────────┘  └────────────┘  │   │
│  └──────────────────────────────────────────────────┘   │
│                          │                               │
│                     fetch /api/*                          │
└─────────────────────┬───────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────┐
│                   server.js (Node.js)                     │
│                                                           │
│  ┌─────────────────┐  ┌──────────────────────────────┐  │
│  │  Static Server   │  │  /api/shiro/chat              │  │
│  │  • index.html    │  │  • Gemini 2.5 Flash           │  │
│  │  • closet/*.jpg  │  │  • Session history context     │  │
│  │                  │  │  • Structured JSON responses   │  │
│  └─────────────────┘  └──────────────────────────────┘  │
│                                                           │
│  ┌─────────────────┐  ┌──────────────────────────────┐  │
│  │ /api/tryon       │  │  /api/tryon/avatar-tryon      │  │
│  │ • Fit analysis   │  │  • Imagen 4.0 Ultra (primary) │  │
│  │ • Gemini Flash   │  │  • Imagen 4.0 (fallback)      │  │
│  │ • Score + tips   │  │  • Gemini Image Gen (fallback) │  │
│  └─────────────────┘  └──────────────────────────────┘  │
│                                                           │
│  ┌─────────────────────────────────────────────────────┐ │
│  │  /api/tryon/generate                                 │ │
│  │  • Person + garment composite via Gemini Image Gen   │ │
│  │  • Multi-model fallback chain                        │ │
│  └─────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
                      │
          ┌───────────▼──────────────┐
          │   Google AI APIs          │
          │  • Gemini 2.5 Flash      │
          │  • Imagen 4.0 Ultra      │
          │  • Gemini Image Gen      │
          └──────────────────────────┘
```

### File Structure
```
cinderella/
├── index.html        # Entire frontend — game engine, renderer, UI, avatar, try-on (3,600 LOC)
├── server.js         # Node.js backend — API routes, Gemini/Imagen integration (520 LOC)
├── package.json      # Project metadata
├── .env              # GEMINI_API_KEY (not committed)
├── .gitignore        # Excludes .env and node_modules
└── closet/           # Product images (14 Zara items)
    ├── 01-beige-top-black-pants.jpg
    ├── 02-black-jacket-denim.jpg
    └── ... (14 items)
```

### Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Single HTML file** | Zero build step, instant deployment, no framework overhead. The entire game runs from one file. |
| **Canvas 2D (no framework)** | Full control over rendering pipeline. Custom sprites, particles, and transitions without Phaser/PixiJS bloat. |
| **Gemini for dialogue** | Structured JSON responses enable game-integrated AI — Shiro can trigger room navigation, highlight products, and suggest pairings programmatically. |
| **Multi-model try-on cascade** | Imagen 4.0 Ultra → Imagen 4.0 → Gemini Image Gen. Graceful degradation ensures try-on always works. |
| **LocalStorage persistence** | No database needed. Avatar, cart, XP, Shiro's memory of your style — all persisted client-side. |
| **No dependencies** | Frontend is vanilla JS. Server uses only Node.js built-ins (http, https, fs, path). Zero npm packages. |

---

## 🏰 The Moat

### 1. **Game-First Shopping Experience**
This isn't a chatbot bolted onto a product grid. The shopping experience is a **game** — you physically move through rooms, discover products on shelves, and interact with an AI character. This creates emotional engagement that static e-commerce can't match.

### 2. **Shiro — A Stylist With Memory**
Shiro isn't a generic chatbot. She has:
- **Persistent memory** across sessions — remembers your style, past purchases, and preferences
- **Structured actions** — her responses trigger in-game events (room navigation, product highlights, outfit suggestions)
- **Fashion domain expertise** — knows every product pairing, price point, and styling rule
- **Personality** — warm, opinionated, increasingly familiar over time

Most AI shopping assistants are stateless Q&A bots. Shiro builds a relationship.

### 3. **AI Virtual Try-On Pipeline**
The try-on system is a multi-model cascade:
- **Imagen 4.0 Ultra** — photorealistic subject-preserving generation with garment reference
- **Imagen 4.0** — faster fallback with same quality
- **Gemini Image Generation** — uses both avatar + garment images as input for composite generation
- **AI Fit Analysis** — even if image generation fails, you get a detailed fit score, color harmony analysis, sizing recommendations, and styling tips

This isn't "here's a stock photo." It generates **you** wearing **that specific garment**.

### 4. **Size-Aware Try-On**
The system understands sizing:
- Creates avatars with real measurements (height, chest, waist, hips)
- Maps measurements to garment size charts
- Generates different images for different sizes — size S looks fitted, size XL looks oversized
- Recommends your best size per garment

### 5. **Zero-Dependency, Zero-Build Architecture**
The entire frontend is one HTML file. The server is one JS file with zero npm packages. This means:
- **Deploy anywhere** — any static host + Node.js
- **No build pipeline** — change a line, refresh the page
- **No framework lock-in** — pure Canvas 2D, pure DOM, pure Node.js
- **Tiny footprint** — ~4,200 lines total for a complete AI shopping game

### 6. **Gamification Layer**
- **XP system** — earn XP on purchases, level up (1-5)
- **Purchase history** — Shiro references past buys
- **Room discovery** — track visited rooms
- **Outfit pairings** — 15+ curated combinations with pricing

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- A [Google AI API key](https://aistudio.google.com/apikey) (for Gemini + Imagen)

### Setup
```bash
git clone https://github.com/prasad-yashdeep/Cinderella_Store.git
cd Cinderella_Store

# Create .env with your API key
echo "GEMINI_API_KEY=your_key_here" > .env

# Run
node server.js
```

Open [http://localhost:3003](http://localhost:3003) and start shopping.

### Deploy with Cloudflare Tunnel (optional)
```bash
# If you have cloudflared configured
cloudflared tunnel route dns YOUR_TUNNEL_ID yourstore.yourdomain.com
# The server runs on port 3003 by default
```

---

## 🧠 AI Integration Details

### Shiro Chat (`/api/shiro/chat`)
- **Model:** Gemini 2.5 Flash
- **Input:** Game state (room, cart, customer memory) + player action + session history
- **Output:** Structured JSON with dialogue, navigation actions, product highlights, mood, and clickable options
- **System prompt:** 100+ lines of fashion knowledge, product pairings, pricing, and personality instructions

### Fit Analysis (`/api/tryon`)
- **Model:** Gemini 2.5 Flash (multimodal)
- **Input:** Customer photo + garment details
- **Output:** Fit score (1-10), color harmony, fit recommendations, styling tips, occasion suggestions

### Virtual Try-On (`/api/tryon/avatar-tryon`)
- **Primary:** Imagen 4.0 Ultra with subject reference (person) + style reference (garment)
- **Fallback 1:** Imagen 4.0
- **Fallback 2:** Gemini 2.0 Flash Image Generation with multimodal input
- **Input:** Avatar image + garment image + measurements + size selection
- **Output:** Photorealistic image of the person wearing the garment

### Avatar Generation (`/api/avatar/generate` — via Cinderella backend)
- Takes uploaded photos + body type + measurements
- Generates a canonical full-body avatar for consistent try-on results

---

## 🎨 Rendering System

The entire game is rendered on a single `<canvas>` element with no external assets (sprites are procedurally drawn):

- **Rooms:** Reception, Upperwear, Lowerwear, Fitting Room — each with unique floor patterns, wall colors, and ambient lighting
- **Characters:** Pixel-art style sprites drawn procedurally (hair, skin, clothing, accessories) — no sprite sheets
- **Products:** Real product images rendered on in-game shelves with hover effects and price tags
- **Particles:** Ambient dust motes, level-up celebrations, chandelier sparkles
- **UI:** In-game HUD with room title, cart counter, XP bar, level badge
- **Transitions:** Smooth room-to-room fades with walking animations
- **Lighting:** Vignette overlay, warm ambient tinting per room

---

## 💡 Recommendations for Extending

### Short-term Improvements
1. **Voice for Shiro** — Add TTS (ElevenLabs/OpenAI) so Shiro speaks her dialogue aloud
2. **Product image zoom** — Click product on shelf → full-screen garment view before adding to cart
3. **Save try-on results** — Let users download/share their virtual try-on images
4. **Mobile touch controls** — Add virtual joystick or tap-to-walk for mobile browsers
5. **Loading states** — Better skeleton UI while Gemini/Imagen APIs respond

### Medium-term Features
6. **Real product catalog** — Connect to Zara/ASOS/Shopify API for live inventory and pricing
7. **Multiplayer shopping** — WebSocket-based co-shopping where friends browse together
8. **AR try-on** — Use WebXR to project garments onto the user via phone camera
9. **Outfit history** — Gallery of past try-on results with ratings
10. **Style quiz** — Shiro asks preference questions on first visit to bootstrap her recommendations

### Architecture Scaling
11. **Split into modules** — Extract game engine, renderer, and AI client into separate ES modules
12. **Add a database** — Move from localStorage to SQLite/Postgres for cross-device persistence
13. **CDN for product images** — Serve garment images from Cloudflare R2 or S3
14. **Rate limiting** — Add token bucket on API routes to prevent Gemini API abuse
15. **Caching** — Cache Shiro responses and try-on results for repeated queries

### Ambitious Ideas
16. **Procedural store generation** — AI-designed store layouts based on brand identity
17. **NPC shoppers** — Other AI-driven characters browsing the store for social proof
18. **Seasonal collections** — Auto-update inventory and store decorations by season
19. **White-label platform** — Let any brand deploy their own Cinderella store with custom products
20. **Loyalty program** — NFT-based receipts, cross-store rewards, referral bonuses

---

## 🛠️ Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Rendering | Canvas 2D | Full control, no framework overhead, procedural sprites |
| Frontend | Vanilla JS | Zero dependencies, zero build step, instant iteration |
| Backend | Node.js (built-ins only) | No Express, no packages — just `http`, `https`, `fs`, `path` |
| AI Dialogue | Gemini 2.5 Flash | Fast, structured JSON output, multimodal capable |
| Image Generation | Imagen 4.0 Ultra | Best subject-preserving generation for try-on |
| Image Fallback | Gemini Image Gen | Reliable fallback with multimodal input |
| Persistence | localStorage | Zero-config, client-side, no database needed |
| Deployment | Cloudflare Tunnel | Instant HTTPS, no server provisioning |

---

## 📊 Stats

- **Frontend:** 3,644 lines (single file, zero dependencies)
- **Backend:** 521 lines (zero npm packages)
- **Product catalog:** 14 items across 2 categories
- **Outfit pairings:** 15 curated combinations
- **AI models used:** 5 (Gemini Flash, Imagen 4.0 Ultra, Imagen 4.0, Gemini Image Gen x2)
- **Rooms:** 4 (Reception, Upperwear, Lowerwear, Fitting Room)
- **Total footprint:** ~4,200 LOC + 1.5MB product images

---

## 📄 License

MIT

---

*Built with ☕ and Canvas pixels.*
