# WeatherSphere AI 🌦️🤖

WeatherSphere AI is a premium, full-stack, AI-powered weather forecasting and lifestyle recommendation web application. Engineered with a scalable Express.js backend and a modern React.js frontend with Tailwind CSS, this application provides an immersive, cinematic, and data-dense meteorological dashboard.

This codebase is structured with production-level standards suitable for university major projects, professional portfolios, and resume benchmarks.

---

## 🚀 Key Features

*   **Secure Authentication (JWT):** Robust register, login, and profile verification powered by `jsonwebtoken` and `bcryptjs`.
*   **Automatic GPS Detection:** Instant regional geolocation resolving through browser `navigator.geolocation` APIs.
*   **Worldwide Forward & Reverse Geocoding:** Search over 150,000+ cities globally, or reverse-geocode clicked coordinates on the map.
*   **Dual-Mode Persistence (Hybrid Storage):** Boots seamlessly without external database configurations via an integrated, persistent JSON storage file, but transitions immediately to standard **MongoDB Atlas** once a connection string is supplied.
*   **Meteorological Failover Strategy:** Integrates a multi-channel lookup checking premium endpoints, failing over to a free **Open-Meteo API** integration requiring zero subscription keys.
*   **Interactive Leaflet Weather Map:** Click-to-update weather tracking with layer toggles for cloud density and precipitation radar lines.
*   **Recharts Data Visualizations:** Clean, responsive area and line graph structures displaying real-time diurnal temperature trends.
*   **AI Smart Suggestions Engine:** Connected to **Gemini 3.5 Flash** (via the modern `@google/genai` SDK) to generate high-quality text weather summaries, smart clothing guides, outdoor activity suitability indices (running, football, swimming, trekking), agricultural soil irrigation advice, and medical health risks (UV, heat stroke). Falls back to a complex rule-based algorithmic model if no Gemini key is provided.

---

## 🛠️ Architecture & Tech Stack

```
                                 +-----------------------+
                                 |   React / Vite App    |
                                 +-----------+-----------+
                                             |  Axios requests (with JWT auth headers)
                                             v
                                 +-----------+-----------+
                                 |  Express.js Server    |
                                 +-----+-----+-----+-----+
                                       |     |     |
            +--------------------------+     |     +-------------------------+
            | Database                       | AI Engine                     | Meteorological APIs
            v                                v                               v
+-----------+-----------+        +-----------+-----------+       +-----------+-----------+
| Hybrid DB Store       |        | Gemini 3.5 Flash AI   |       | Open-Meteo &          |
| (Mongoose or JSON)    |        | (@google/genai)       |       | Nominatim OS Map API  |
+-----------------------+        +-----------------------+       +-----------------------+
```

### File & Directory Structure

```
├── /data/
│   └── db.json                # Local JSON persistent database backup
├── /server/
│   ├── db.ts                  # Hybrid database controller interface
│   └── weatherService.ts      # Multi-API weather aggregation & AI recommendations engine
├── /src/
│   ├── components/
│   │   ├── ErrorBoundary.tsx  # Dynamic UI error containment boundary
│   │   ├── LeafletRadarMap.tsx# Fully-interactive Leaflet map wrapper
│   │   ├── SkeletonLoaders.tsx# Pulse CSS loading skeletons
│   │   ├── WeatherAnimations.tsx# Fullscreen rain, snow, mist overlay effects
│   │   └── WeatherIcons.tsx   # Animating weather icon mapper
│   ├── App.tsx                # Main App, routing panels, auth and theme contexts
│   ├── index.css              # Typography, theme globals, and tailwind configuration
│   ├── main.tsx               # Frontend bootstrap
│   └── types.ts               # Global shared types
├── server.ts                  # Backend server entry point (Express + Vite setup)
├── package.json               # Full-stack dependency manifest
└── tsconfig.json              # TypeScript compilation rules
```

---

## ⚙️ Environment Variables

Copy `.env.example` to `.env` and fill in the required fields:

```env
# Gemini AI Key for premium summaries (Optional - falls back gracefully to rule-based engine)
GEMINI_API_KEY="YOUR_GEMINI_API_KEY"

# Authentication secret
JWT_SECRET="YOUR_SECURE_JWT_SECRET_HERE"

# Deployed URL
APP_URL="http://localhost:3000"
```

---

## 🛠️ Installation & Running Locally

### Prerequisites
*   Node.js (v18+)
*   npm (v9+)

### Installation
1.  Install all packages (both client and server requirements):
    ```bash
    npm install
    ```
2.  Launch the full-stack development server:
    ```bash
    npm run dev
    ```
3.  Open [http://localhost:3000](http://localhost:3000) in your web browser.

---

## 🧪 Testing Guidelines

For rigorous CSE project testing, both client rendering and backend controller endpoints must be validated.

### 1. Backend Controller Tests
Create tests targetting `/api/auth/register`, `/api/auth/login`, and `/api/weather` endpoints to confirm:
*   Standard passwords receive bcrypt hashing before file write or DB write.
*   Failed credentials block resource access with `401 Unauthorized`.
*   Coordinates safely query Open-Meteo and resolve clean JSON structures.

### 2. Frontend Component Tests
Test the rendering states:
*   Validate that `SkeletonLoaders` pulse when loading state is active.
*   Assert that clicking "Detect GPS Location" invokes `navigator.geolocation` API.
*   Verify that `ErrorBoundary` traps leaflet mounting failures during rendering.

---

## ☁️ Deployment Instructions

### Deployed Frontend (Vercel)
Vercel handles React SPAs out-of-the-box:
1.  Connect your GitHub repository.
2.  Set Build Command: `vite build`
3.  Set Output Directory: `dist`
4.  Configure Environment Variables (`APP_URL` matching your backend address).

### Deployed Backend (Render / Railway)
1.  Connect your repository.
2.  Select Node.js platform.
3.  Set Build Command:
    ```bash
    npm run build
    ```
4.  Set Start Command:
    ```bash
    npm start
    ```
5.  Supply required variables (`JWT_SECRET`, `GEMINI_API_KEY`). Ensure CORS configuration on `server.ts` is allowed for your frontend URL.
