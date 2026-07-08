import express from 'express';
import path from 'path';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import axios from 'axios';
import nodemailer from 'nodemailer';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { dbStore } from './server/db';
import { fetchWeatherData } from './server/weatherService';
import authRouter from './server/auth/routes/authRoutes';

const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'weathersphere_super_secret_9988_key';

// Initialize Gemini client safely
let aiClient: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  try {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
  } catch (err) {
    console.error('Failed to initialize Gemini AI SDK for chatbot:', err);
  }
}

async function startServer() {
  const app = express();

  // Trust reverse proxy for rate limiter to identify client IP
  app.set('trust proxy', 1);

  // Production security headers
  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  }));

  // CORS integration supporting cookies
  app.use(cors({
    origin: true,
    credentials: true,
  }));

  // Parse authorization cookies
  app.use(cookieParser());

  app.use(express.json());

  // Enhanced Request and Response Logger (filtered to API requests)
  app.use((req, res, next) => {
    if (req.url.startsWith('/api')) {
      const startTime = Date.now();
      res.on('finish', () => {
        const duration = Date.now() - startTime;
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - Status: ${res.statusCode} (${duration}ms)`);
        if (res.statusCode === 403) {
          console.warn(`[403 FORBIDDEN WARNING] URL: ${req.url}, Headers: ${JSON.stringify(req.headers)}, Cookies: ${JSON.stringify(req.cookies)}`);
        }
      });
    }
    next();
  });

  // Authentication Middleware
  const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Authentication token is required' });
    }

    jwt.verify(token, JWT_SECRET, (err: any, decoded: any) => {
      if (err) {
        return res.status(403).json({ error: 'Invalid or expired token' });
      }
      req.user = decoded;
      next();
    });
  };

  // ==========================================
  // AUTHENTICATION ENDPOINTS
  // ==========================================

  // Setup dynamic transporter for real-world SMTP email or dynamic test Ethereal fallback
  const getTransporter = async () => {
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      console.log(`[SMTP] Using real-world SMTP transport: ${process.env.SMTP_HOST}:${process.env.SMTP_PORT || 587}`);
      return nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
    } else {
      console.log(`[SMTP] SMTP credentials not provided. Falling back to dynamic Ethereal email account.`);
      const testAccount = await nodemailer.createTestAccount();
      return nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
    }
  };

  // Send OTP Email
  const sendOTPEmail = async (email: string, otp: string, name: string) => {
    try {
      console.log(`[OTP GENERATED] For ${email}: ${otp}`);
      const transporter = await getTransporter();
      const fromAddress = process.env.SMTP_FROM || '"WeatherSphere Security" <security@weathersphere.com>';

      const info = await transporter.sendMail({
        from: fromAddress,
        to: email,
        subject: "Verify Your Email - WeatherSphere OTP",
        text: `Hello ${name},\n\nYour 6-digit verification code is: ${otp}\n\nThis code expires in 10 minutes.\n\nBest regards,\nWeatherSphere Team`,
        html: `<div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; color: #1e293b;">
          <h2 style="color: #0284c7; text-align: center; margin-bottom: 24px; font-weight: 700;">WeatherSphere Authentication</h2>
          <p>Hello <strong>${name}</strong>,</p>
          <p>Thank you for registering at WeatherSphere! To verify your email address and authorize your portal access, please enter the following One-Time Password (OTP) verification code:</p>
          <div style="background-color: #f0f9ff; border: 1px dashed #bae6fd; padding: 18px; border-radius: 12px; text-align: center; font-size: 28px; font-weight: bold; letter-spacing: 5px; color: #0369a1; margin: 28px 0; font-family: monospace;">
            ${otp}
          </div>
          <p style="font-size: 13px; color: #64748b; line-height: 1.5;">This verification code is valid for <strong>10 minutes</strong>. If you did not request this account, please ignore this message.</p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
          <p style="font-size: 11px; color: #94a3b8; text-align: center;">WeatherSphere Portal &copy; 2026. All rights reserved.</p>
        </div>`
      });

      let previewUrl = null;
      if (!process.env.SMTP_HOST) {
        previewUrl = nodemailer.getTestMessageUrl(info);
        console.log(`[EMAIL SENT] Ethereal Preview: ${previewUrl}`);
      } else {
        console.log(`[EMAIL SENT] Email successfully dispatched to ${email}`);
      }
      return previewUrl;
    } catch (err) {
      console.error('Failed to dispatch SMTP email:', err);
      return null;
    }
  };

  // ==========================================
  // PRODUCTION AUTHENTICATION ROUTER
  // ==========================================
  app.use('/api/auth', authRouter);


  // ==========================================
  // CITY SEARCH & GEOCODING
  // ==========================================

  // Global search for cities worldwide
  app.get('/api/weather/search', async (req, res) => {
    try {
      const query = req.query.q as string;
      if (!query || query.trim().length < 2) {
        return res.json([]);
      }

      const response = await axios.get(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=10&language=en&format=json`);
      const results = response.data.results || [];
      
      const cities = results.map((item: any) => ({
        name: item.name,
        state: item.admin1 || '',
        country: item.country || '',
        lat: item.latitude,
        lon: item.longitude
      }));

      return res.json(cities);
    } catch (err) {
      console.error('Geocoding query failed:', err);
      return res.status(500).json({ error: 'Failed to search cities' });
    }
  });


  // ==========================================
  // WEATHER DASHBOARD DATA AGGREGATION
  // ==========================================

  // Fetch full dashboard weather details (Current, Hourly, Daily, AQI, AI recommendations)
  app.get('/api/weather', async (req: any, res) => {
    try {
      let lat = parseFloat(req.query.lat);
      let lon = parseFloat(req.query.lon);
      let cityName = req.query.cityName as string;
      let stateName = req.query.state as string;
      let countryName = req.query.country as string;

      // Scenario A: City search query parameter provided instead of direct coordinates
      if (req.query.q) {
        const searchQ = req.query.q as string;
        const searchRes = await axios.get(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(searchQ)}&count=1&language=en&format=json`);
        const searchResults = searchRes.data.results || [];
        
        if (searchResults.length === 0) {
          return res.status(404).json({ error: `City '${searchQ}' not found` });
        }

        const match = searchResults[0];
        lat = match.latitude;
        lon = match.longitude;
        cityName = match.name;
        stateName = match.admin1 || '';
        countryName = match.country || '';
      }

      // Safeguard coordinates
      if (isNaN(lat) || isNaN(lon)) {
        // Default fallback to San Francisco
        lat = 37.7749;
        lon = -122.4194;
        cityName = 'San Francisco';
        stateName = 'California';
        countryName = 'United States';
      }

      // Scenario B: Coordinates provided but cityName is missing -> Use Nominatim Reverse Geocoding
      if (!cityName) {
        try {
          const reverseRes = await axios.get(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`, {
            headers: { 'User-Agent': 'WeatherSphere_AI_Application' }
          });
          const address = reverseRes.data.address;
          if (address) {
            cityName = address.city || address.town || address.village || address.suburb || 'Unknown Location';
            stateName = address.state || '';
            countryName = address.country || '';
          } else {
            cityName = 'Detected Coordinates';
          }
        } catch (revErr) {
          console.warn('Reverse geocoding failed, falling back to coordinate names:', revErr);
          cityName = 'Detected Location';
        }
      }

      const weatherData = await fetchWeatherData(lat, lon, cityName, stateName, countryName);
      return res.json(weatherData);
    } catch (err: any) {
      console.error('Weather retrieval failed:', err);
      return res.status(500).json({ error: 'Failed to aggregate weather forecast data' });
    }
  });


  // ==========================================
  // ADVANCED CHATBOT AI API
  // ==========================================

  // Fallback intelligent conversation helper when Gemini API key is missing
  const getFallbackChatReply = (messages: any[], context: any): string => {
    const lastMessage = messages[messages.length - 1]?.content || '';
    const query = lastMessage.toLowerCase().trim();

    const locationName = context?.location?.name || 'your location';
    const temp = context?.current?.temp !== undefined ? `${context.current.temp}°C` : '';
    const textDesc = context?.current?.conditionText || '';
    const fullDesc = temp ? `${temp} and ${textDesc}` : '';

    if (query.includes('hello') || query.includes('hi') || query.includes('hey') || query.includes('greetings')) {
      return `### Hello! I am **WeatherSphere AI** 🌦️🤖

I am your advanced, open-source-integrated meteorological and lifestyle assistant. 

How can I assist you today? You can ask me questions about:
1. **Weather Analytics** & interpretations.
2. **Clothing Choices** matching current conditions.
3. **Agricultural Guidance** (soil hydration, crops to plant).
4. **Outdoor Suitability** (jogging, trekking, etc.).
${temp ? `\nCurrently, you are looking at **${locationName}** where it is **${fullDesc}**.` : ''}`;
    }

    if (query.includes('crop') || query.includes('agri') || query.includes('farm') || query.includes('plant') || query.includes('soil')) {
      const crops = context?.ai?.agriculture?.cropSuggestions?.join(', ') || 'leafy greens, carrots, beets, or cold-resistant legumes';
      const advice = context?.ai?.agriculture?.advice || 'Ensure consistent morning watering cycles, keep soil rich in organics, and protect delicate leaves from harsh elements.';
      return `### Agricultural Insight 🌾

Based on the atmospheric conditions${temp ? ` in **${locationName}** (${fullDesc})` : ''}:

* **Crop Recommendation**: The environment is highly suitable for cultivating **${crops}**.
* **Hydration Protocol**: ${context?.ai?.agriculture?.irrigationNeeded ? 'Regular active irrigation is recommended to offset soil transpiration.' : 'Precipitation is adequate; monitor soil drainage to prevent oversaturation.'}
* **Expert Farmer Advice**: ${advice}`;
    }

    if (query.includes('cloth') || query.includes('wear') || query.includes('dress') || query.includes('outfit')) {
      const upper = context?.ai?.clothing?.upper?.join(', ') || 'light breathable cotton shirt';
      const lower = context?.ai?.clothing?.lower?.join(', ') || 'comfortable denim or stretch fabric pants';
      const accessories = context?.ai?.clothing?.accessories?.join(', ') || 'polarizing sunglasses, durable footwear';
      const advice = context?.ai?.clothing?.advice || 'Opt for lightweight, breathable natural materials to promote excellent thermoregulation.';

      return `### Clothing & Style Planner 🧥🕶️

Optimizing your wardrobe${temp ? ` for **${locationName}** (${temp})` : ''}:

* **Upper Body**: ${upper}
* **Lower Body**: ${lower}
* **Accessories**: ${accessories}
* **Daily Wear Advice**: ${advice}`;
    }

    if (query.includes('risk') || query.includes('flood') || query.includes('storm') || query.includes('warn') || query.includes('safe') || query.includes('danger')) {
      const summary = context?.ai?.summary || 'No direct critical hazards are active.';
      return `### Safety & Risk Assessment ⚠️

Our meteorological safety matrix indicates:

* **Current Status**: ${summary}
* **Precipitation Metrics**: ${context?.current?.precipitation || 0} mm
* **Wind Velocity**: ${context?.current?.windSpeed || 0} km/h
* **Expert Safety Protocol**: Always check local alert frequencies, carry protective gear when transitioning outdoors, and secure loose lightweight structures in high winds.`;
    }

    if (query.includes('activity') || query.includes('jog') || query.includes('run') || query.includes('swim') || query.includes('outdoor')) {
      const runningAdvice = context?.ai?.activities?.running?.advice || 'Conditions are comfortable for low to medium-impact outdoor cardio.';
      const trekkingAdvice = context?.ai?.activities?.trekking?.advice || 'Main trails should be stable and solid.';
      return `### Outdoor Activity Report 🏃‍♂️🚴

Here is your physical fitness suitability breakdown:

* **Running / Cardio**: Score: **${context?.ai?.activities?.running?.score || 80}/100**. ${runningAdvice}
* **Trekking / Hiking**: Score: **${context?.ai?.activities?.trekking?.score || 75}/100**. ${trekkingAdvice}
* **General Recommendation**: ${context?.ai?.health?.overallAdvice || 'Current ambient parameters are balanced and safe for healthy individuals.'}`;
    }

    if (query.includes('aqi') || query.includes('air') || query.includes('breathe') || query.includes('pollut')) {
      const aqiVal = context?.aqi?.aqiUS || 35;
      const aqiStatus = context?.aqi?.status || 'Good';
      return `### Air Quality Analysis 🍃

Here is the current respiratory impact rating${temp ? ` for **${locationName}**` : ''}:

* **US AQI Rating**: **${aqiVal}** (${aqiStatus})
* **Particulate Concentration**: PM2.5: **${context?.aqi?.pm2_5 || 8} µg/m³**, PM10: **${context?.aqi?.pm10 || 12} µg/m³**
* **Respiratory Advice**: ${context?.aqi?.aqiUS > 100 ? 'Sensitive demographics should reduce prolonged outdoor cardiovascular exertion.' : 'Excellent air purification. Ideal for breathing exercises and open-window ventilation.'}`;
    }

    // Default conversational reply matching the context if available
    return `### Response from WeatherSphere AI 🤖✨

Thank you for your message! Here is an expert insight based on your query:

${temp ? `Currently in **${locationName}**, the temperature is **${temp}** with **${textDesc.toLowerCase()}** weather. 

* **Summary**: ${context?.ai?.summary || 'The conditions are mild and comfortable. Excellent weather for general outdoor routines.'}
* **Health Tip**: ${context?.ai?.health?.overallAdvice || 'Stay hydrated, protect your eyes with polarized shades, and ensure you have comfortable clothing.'}` : `I am here to help you analyze meteorological trends, plan your outfits, schedule your farming/gardening schedules, or evaluate high-risk storm warning forecasts. Use the sidebar/tabs to select your city, and ask me specific context-aware questions!`}

Is there anything else specific about agricultural planting, clothing, fitness, or air quality indexes that I can clarify for you?`;
  };

  // Chat endpoint
  app.post('/api/chat', async (req, res) => {
    try {
      const { messages, weatherContext } = req.body;
      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: 'Messages array is required' });
      }

      if (!aiClient) {
        const reply = getFallbackChatReply(messages, weatherContext);
        return res.json({ reply });
      }

      const locationName = weatherContext?.location?.name || 'Unknown Location';
      const systemPrompt = `You are "WeatherSphere AI", an advanced, friendly, and expert conversational meteorological, agricultural, and lifestyle assistant.
You help users with free-form queries, weather questions, travel advice, farming tips, health precautions, or any other query.

${weatherContext ? `The user is currently viewing weather details for:
- City: ${locationName} (${weatherContext.location?.country || ''})
- Temperature: ${weatherContext.current?.temp}°C (feels like: ${weatherContext.current?.feelsLike}°C)
- Conditions: ${weatherContext.current?.conditionText || ''}
- Humidity: ${weatherContext.current?.humidity}%
- AQI: ${weatherContext.aqi?.aqiUS || ''} (${weatherContext.aqi?.status || ''})
- Agricultural Farming Advice: ${weatherContext.ai?.agriculture?.advice || ''}
- Recommended Crops: ${weatherContext.ai?.agriculture?.cropSuggestions?.join(', ') || ''}
Please use this weather context actively to provide highly personalized, custom-tailored, and practical suggestions if relevant to their query.` : ''}

Be engaging, precise, objective, and supportive. Present your ideas beautifully, using clean markdown formatting (headers, bolding, lists). Keep answers concise and human-friendly.`;

      // Map messages to Gemini API contents format: [{ role: 'user' | 'model', parts: [{ text: ... }] }]
      const geminiMessages = messages.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      }));

      const executeChatWithRetry = async (retries = 2, delay = 1000): Promise<any> => {
        for (let attempt = 0; attempt <= retries; attempt++) {
          try {
            return await aiClient!.models.generateContent({
              model: 'gemini-3.5-flash',
              contents: geminiMessages,
              config: {
                systemInstruction: systemPrompt,
                temperature: 0.7
              }
            });
          } catch (err: any) {
            const errMsg = err?.message || String(err);
            const isQuota = errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.includes('quota') || errMsg.includes('Quota');
            const isTransient = (errMsg.includes('503') || errMsg.includes('UNAVAILABLE') || errMsg.includes('limit')) && !isQuota;
            if (isTransient && attempt < retries) {
              const backoff = delay * Math.pow(2, attempt);
              console.warn(`[Gemini Chat API] Transient error (attempt ${attempt + 1}/${retries + 1}). Retrying in ${backoff}ms...`);
              await new Promise(resolve => setTimeout(resolve, backoff));
            } else {
              throw err;
            }
          }
        }
      };

      const response = await executeChatWithRetry();

      const reply = response.text || "I am unable to generate a response at this moment. Please try again.";
      return res.json({ reply });
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      const isQuotaExceeded = errMsg.includes('429') || errMsg.includes('quota') || errMsg.includes('Quota') || errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.includes('limit');
      
      if (isQuotaExceeded) {
        console.warn('Chat AI generation skipped due to quota limit, falling back to rule-based conversation engine.');
      } else {
        console.warn('Chat AI generation failed, falling back to rule-based engine:', errMsg);
      }
      // Fallback on error
      const { messages, weatherContext } = req.body;
      try {
        const reply = getFallbackChatReply(messages || [], weatherContext);
        return res.json({ reply });
      } catch {
        return res.status(500).json({ error: 'Failed to process conversation query' });
      }
    }
  });


  // ==========================================
  // SAVED FAVORITE CITIES (PER USER)
  // ==========================================

  // List all favorite cities
  app.get('/api/favorites', authenticateToken, (req: any, res) => {
    const favorites = dbStore.getFavorites(req.user.id);
    return res.json(favorites);
  });

  // Add a city to favorites
  app.post('/api/favorites', authenticateToken, (req: any, res) => {
    const { cityName, lat, lon, country } = req.body;
    if (!cityName || isNaN(lat) || isNaN(lon)) {
      return res.status(400).json({ error: 'City details are incomplete' });
    }

    // Prevent duplicate entries
    const isAlreadyFav = dbStore.checkIsFavorite(req.user.id, cityName);
    if (isAlreadyFav) {
      return res.status(400).json({ error: 'City is already in your favorites list' });
    }

    const newFavorite = {
      id: Math.random().toString(36).substring(2, 11),
      userId: req.user.id,
      cityName,
      lat,
      lon,
      country: country || '',
      addedAt: new Date().toISOString()
    };

    dbStore.addFavorite(newFavorite);
    return res.status(201).json(newFavorite);
  });

  // Remove a favorite
  app.delete('/api/favorites/:id', authenticateToken, (req: any, res) => {
    const favoriteId = req.params.id;
    const deleted = dbStore.removeFavorite(req.user.id, favoriteId);
    
    if (!deleted) {
      return res.status(404).json({ error: 'Favorite entry not found' });
    }
    
    return res.json({ success: true, message: 'City removed from favorites' });
  });


  // ==========================================
  // SEARCH HISTORY TRACKING
  // ==========================================

  // Retrieve user weather search logs
  app.get('/api/history', authenticateToken, (req: any, res) => {
    const history = dbStore.getHistory(req.user.id);
    return res.json(history);
  });

  // Log a new search in historical logs
  app.post('/api/history', authenticateToken, (req: any, res) => {
    const { cityName, lat, lon, temp, conditionText } = req.body;
    if (!cityName || isNaN(lat) || isNaN(lon)) {
      return res.status(400).json({ error: 'Search details are incomplete' });
    }

    const newLog = {
      id: Math.random().toString(36).substring(2, 11),
      userId: req.user.id,
      cityName,
      lat,
      lon,
      temp: temp || 0,
      conditionText: conditionText || 'Clear',
      fetchedAt: new Date().toISOString()
    };

    dbStore.addHistory(newLog);
    return res.status(201).json(newLog);
  });

  // Clear all history
  app.delete('/api/history', authenticateToken, (req: any, res) => {
    dbStore.clearHistory(req.user.id);
    return res.json({ success: true, message: 'Search history logs cleared' });
  });


  // ==========================================
  // VITE STATIC BUNDLE OR MIDDLEWARE
  // ==========================================
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[WeatherSphere AI Server] Running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal Server crash on startup:', err);
});
