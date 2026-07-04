import axios from 'axios';
import { GoogleGenAI, Type } from '@google/genai';
import { AISuggestions, AirQuality, DailyForecast, HourlyForecast, LocationInfo, WeatherCondition, WeatherDataPayload } from '../src/types';

// Initialize Gemini client safely
let ai: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  try {
    ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
  } catch (err) {
    console.error('Failed to initialize Gemini AI SDK:', err);
  }
}

// Convert WMO weather code to text condition
export function mapWeatherCode(code: number): { text: string; icon: string } {
  switch (code) {
    case 0: return { text: 'Clear Sky', icon: 'Sun' };
    case 1: return { text: 'Mainly Clear', icon: 'CloudSun' };
    case 2: return { text: 'Partly Cloudy', icon: 'Cloud' };
    case 3: return { text: 'Overcast', icon: 'Cloudy' };
    case 45: return { text: 'Foggy', icon: 'CloudFog' };
    case 48: return { text: 'Depositing Rime Fog', icon: 'CloudFog' };
    case 51: return { text: 'Light Drizzle', icon: 'CloudDrizzle' };
    case 53: return { text: 'Moderate Drizzle', icon: 'CloudDrizzle' };
    case 55: return { text: 'Dense Drizzle', icon: 'CloudDrizzle' };
    case 56: return { text: 'Light Freezing Drizzle', icon: 'CloudDrizzle' };
    case 57: return { text: 'Dense Freezing Drizzle', icon: 'CloudDrizzle' };
    case 61: return { text: 'Slight Rain', icon: 'CloudRain' };
    case 63: return { text: 'Moderate Rain', icon: 'CloudRain' };
    case 65: return { text: 'Heavy Rain', icon: 'CloudRain' };
    case 66: return { text: 'Light Freezing Rain', icon: 'CloudRain' };
    case 67: return { text: 'Heavy Freezing Rain', icon: 'CloudRain' };
    case 71: return { text: 'Slight Snowfall', icon: 'Snowflake' };
    case 73: return { text: 'Moderate Snowfall', icon: 'Snowflake' };
    case 75: return { text: 'Heavy Snowfall', icon: 'Snowflake' };
    case 77: return { text: 'Snow Grains', icon: 'Snowflake' };
    case 80: return { text: 'Slight Rain Showers', icon: 'CloudRain' };
    case 81: return { text: 'Moderate Rain Showers', icon: 'CloudRain' };
    case 82: return { text: 'Heavy Rain Showers', icon: 'CloudRain' };
    case 85: return { text: 'Slight Snow Showers', icon: 'Snowflake' };
    case 86: return { text: 'Heavy Snow Showers', icon: 'Snowflake' };
    case 95: return { text: 'Thunderstorm', icon: 'Zap' };
    case 96: return { text: 'Thunderstorm with Slight Hail', icon: 'Zap' };
    case 99: return { text: 'Thunderstorm with Heavy Hail', icon: 'Zap' };
    default: return { text: 'Partly Cloudy', icon: 'Cloud' };
  }
}

// Map AQI values to qualitative descriptions
export function mapAQIStatus(usAqi: number): 'Good' | 'Moderate' | 'Unhealthy for Sensitive Groups' | 'Unhealthy' | 'Very Unhealthy' | 'Hazardous' {
  if (usAqi <= 50) return 'Good';
  if (usAqi <= 100) return 'Moderate';
  if (usAqi <= 150) return 'Unhealthy for Sensitive Groups';
  if (usAqi <= 200) return 'Unhealthy';
  if (usAqi <= 300) return 'Very Unhealthy';
  return 'Hazardous';
}

// Fallback rule-based suggestions (guarantees a pristine CSM project-ready fallback without paid API key)
export function getDeterministicSuggestions(current: WeatherCondition, aqi: AirQuality): AISuggestions {
  const temp = current.temp;
  const isRain = current.precipitation > 0 || current.conditionText.toLowerCase().includes('rain') || current.conditionText.toLowerCase().includes('drizzle');
  const isSnow = current.conditionText.toLowerCase().includes('snow');
  const isWindy = current.windSpeed > 25;
  const isStorm = current.conditionText.toLowerCase().includes('thunderstorm') || current.conditionText.toLowerCase().includes('zap');
  const uv = current.uvIndex;
  const humidity = current.humidity;

  // 1. Weather Summary
  let summary = `Currently, it's ${temp}°C and ${current.conditionText.toLowerCase()} with a humidity of ${humidity}% and wind speed of ${current.windSpeed} km/h. `;
  if (temp > 30) {
    summary += `It feels hot today. Stay hydrated and avoid long direct exposure to sunlight.`;
  } else if (temp < 10) {
    summary += `The weather is quite cold today. Make sure to bundle up in layers to keep warm.`;
  } else if (isRain) {
    summary += `Expect wet conditions. Keeping an umbrella or raincoat handy is highly recommended.`;
  } else {
    summary += `The conditions are mild and comfortable. Excellent weather for general outdoor routines.`;
  }

  // 2. Clothing recommendations
  const clothing = {
    upper: ['Light breathable cotton shirt'],
    lower: ['Comfortable jeans or chinos'],
    accessories: ['Sunglasses'],
    advice: 'Dress in comfortable, light clothing suitable for current room or outdoor ambient temperatures.'
  };

  if (temp > 28) {
    clothing.upper = ['Breathable cotton t-shirt', 'Singlet'];
    clothing.lower = ['Light shorts', 'Linen trousers'];
    clothing.accessories = ['UV sunglasses', 'Sun protection hat', 'SPF 30+ sunscreen'];
    clothing.advice = 'Opt for breathable, loose-fit fabrics. Light colors will reflect heat away from your body.';
  } else if (temp < 15) {
    clothing.upper = ['Thermal innerwear', 'Long sleeve wool shirt', 'Insulated jacket or fleece'];
    clothing.lower = ['Thick trousers', 'Thermal leggings'];
    clothing.accessories = ['Beanie hat', 'Woolen gloves', 'Scarf'];
    clothing.advice = 'Layer up to trap body heat. Ensure your outer shell jacket is windproof.';
  } else if (isRain) {
    clothing.upper = ['Dry-fit undershirt', 'Waterproof windbreaker jacket'];
    clothing.lower = ['Quick-dry track pants'];
    clothing.accessories = ['Compact umbrella', 'Waterproof boots', 'Rain cover for bags'];
    clothing.advice = 'Keep outer layers completely waterproof. Avoid heavy denim fabrics that absorb water.';
  } else if (isSnow) {
    clothing.upper = ['Thermal undershirt', 'Fleece pullover', 'Heavy down parka coat'];
    clothing.lower = ['Insulated snow pants'];
    clothing.accessories = ['Insulated snow gloves', 'Fleece beanie', 'Winter boots with grip'];
    clothing.advice = 'Ensure your gear is fully waterproof and heavily insulated to prevent frostbite and wetness.';
  }

  // 3. Activity suitability scores (0 to 100)
  const activities = {
    running: { suitable: true, score: 85, advice: 'Great conditions for an outdoor jog.' },
    trekking: { suitable: true, score: 80, advice: 'Hiking routes are generally clear and firm.' },
    football: { suitable: true, score: 90, advice: 'Perfect turf conditions for a match.' },
    swimming: { suitable: false, score: 30, advice: 'Too cold for comfortable outdoor swimming.' },
    gym: { suitable: true, score: 95, advice: 'Excellent day to crush an indoor workout session.' }
  };

  if (temp > 35 || temp < 5 || isRain || isStorm || aqi.aqiUS > 150) {
    activities.running = { suitable: false, score: 20, advice: 'Outdoor jogging not recommended. Consider an indoor treadmill.' };
    activities.trekking = { suitable: false, score: 15, advice: 'Trails might be hazardous, slippery, or suffer poor air quality.' };
    activities.football = { suitable: false, score: 25, advice: 'Hazardous turf conditions. Postpone outdoor sports matches.' };
  } else if (temp > 25 && temp <= 35 && !isRain) {
    activities.running = { suitable: true, score: 70, advice: 'Keep hydration levels high during your run.' };
  }

  if (temp > 25 && !isRain && !isStorm) {
    activities.swimming = { suitable: true, score: 90, advice: 'Highly inviting weather for a refreshing swim.' };
  } else if (temp >= 20 && temp <= 25 && !isRain) {
    activities.swimming = { suitable: true, score: 65, advice: 'Water temperatures may feel brisk. Best in heated pools.' };
  }

  // 4. Health Risks
  const risks: AISuggestions['risks'] = {
    heatStroke: { level: 'Low', advice: 'No immediate heat stroke hazards detected.' },
    flood: { level: 'Low', advice: 'No high-volume precipitation alerts.' },
    highWind: { level: 'Low', advice: 'Breeze is safe and within normal thresholds.' },
    storm: { level: 'Low', advice: 'No thunderstorm or lightning activity mapped nearby.' }
  };

  if (temp > 38) {
    risks.heatStroke = { level: 'High', advice: 'Critical danger of heatstroke with physical activity! Limit all outdoor expose.' };
  } else if (temp > 32) {
    risks.heatStroke = { level: 'Medium', advice: 'Take frequent shade breaks and drink ample mineral water.' };
  }

  if (current.precipitation > 15) {
    risks.flood = { level: 'High', advice: 'Intense downpour active. High risk of local flash floods. Avoid low terrain.' };
  } else if (current.precipitation > 5) {
    risks.flood = { level: 'Medium', advice: 'Moderate continuous rainfall. Watch for pooling water on roads.' };
  }

  if (isWindy) {
    risks.highWind = { level: current.windSpeed > 50 ? 'High' : 'Medium', advice: 'Secure loose items outdoors. Take caution driving light vehicles.' };
  }

  if (isStorm) {
    risks.storm = { level: 'High', advice: 'Severe lightning warnings in effect. Seek immediate hard-top shelter indoors.' };
  }

  // 5. Agriculture Suitability
  const cropSuggestions = ['Leafy greens', 'Carrots', 'Beets'];
  let farmingSuitability = 'Good';
  let irrigationNeeded = true;
  let agriAdvice = 'Regular maintenance and soil testing advised. Watering is recommended in the morning hours.';

  if (temp > 33) {
    farmingSuitability = 'Fair';
    irrigationNeeded = true;
    agriAdvice = 'High evapotranspiration active. Increase watering frequency and protect young crops with shade netting.';
    cropSuggestions.push('Tomatoes', 'Peppers', 'Eggplants');
  } else if (isRain) {
    farmingSuitability = 'Excellent';
    irrigationNeeded = false;
    agriAdvice = 'Natural irrigation is adequate today. Ensure proper drainage to avoid root rot or waterlogging.';
    cropSuggestions.push('Rice', 'Cabbage', 'Spinach');
  } else if (temp < 10) {
    farmingSuitability = 'Poor';
    irrigationNeeded = false;
    agriAdvice = 'Frost warning active. Cover sensitive crops with frost cloths. Do not water heavily.';
    cropSuggestions.length = 0;
    cropSuggestions.push('Garlic', 'Kale', 'Winter Wheat');
  } else {
    cropSuggestions.push('Potatoes', 'Lettuce', 'Broccoli');
  }

  // 6. Detailed health recommendations
  let uvRisk = 'Low';
  if (uv >= 8) uvRisk = 'Very High';
  else if (uv >= 6) uvRisk = 'High';
  else if (uv >= 3) uvRisk = 'Moderate';

  let coldRisk = temp < 10 ? (temp < 0 ? 'High' : 'Moderate') : 'Low';
  let heatRisk = temp > 32 ? (temp > 38 ? 'High' : 'Moderate') : 'Low';
  let humidityRisk = humidity > 80 ? 'Moderate (cloggy feeling)' : (humidity < 25 ? 'Moderate (dry airways)' : 'Low');

  const health = {
    uvRisk,
    coldRisk,
    heatRisk,
    humidityRisk,
    overallAdvice: `Current ambient conditions are generally stable. AQI rating is ${aqi.status}. ${temp > 30 ? 'Protect skin and drink plenty.' : ''}`
  };

  return {
    summary,
    clothing,
    activities,
    risks,
    agriculture: {
      irrigationNeeded,
      farmingSuitability,
      advice: agriAdvice,
      cropSuggestions
    },
    health
  };
}

// Generate AI recommendations using Gemini API with deterministic fallback
export async function generateAISuggestions(current: WeatherCondition, aqi: AirQuality): Promise<AISuggestions> {
  if (!ai) {
    return getDeterministicSuggestions(current, aqi);
  }

  try {
    const prompt = `You are an expert meteorological and lifestyle recommendation AI.
    We have the following weather data:
    - Temperature: ${current.temp}°C
    - Feels Like: ${current.feelsLike}°C
    - Humidity: ${current.humidity}%
    - Wind Speed: ${current.windSpeed} km/h
    - Precipitation: ${current.precipitation} mm
    - UV Index: ${current.uvIndex}
    - Weather Description: ${current.conditionText}
    - Air Quality Index (US EPA standard): ${aqi.aqiUS} (${aqi.status})

    Generate a comprehensive AI analysis of this weather in JSON format. Your response must strictly match the following JSON schema:
    {
      "summary": "Short 2-3 sentence overview explaining what the weather is like and what to watch out for.",
      "clothing": {
        "upper": ["upper body recommendation 1", "upper body recommendation 2"],
        "lower": ["lower body recommendation 1", "lower body recommendation 2"],
        "accessories": ["accessory 1", "accessory 2"],
        "advice": "General clothing coordination guidance."
      },
      "activities": {
        "running": { "suitable": true/false, "score": 0-100, "advice": "Brief reasoning" },
        "trekking": { "suitable": true/false, "score": 0-100, "advice": "Brief reasoning" },
        "football": { "suitable": true/false, "score": 0-100, "advice": "Brief reasoning" },
        "swimming": { "suitable": true/false, "score": 0-100, "advice": "Brief reasoning" },
        "gym": { "suitable": true/false, "score": 0-100, "advice": "Brief reasoning" }
      },
      "risks": {
        "heatStroke": { "level": "Low"|"Medium"|"High", "advice": "Precautions" },
        "flood": { "level": "Low"|"Medium"|"High", "advice": "Precautions" },
        "highWind": { "level": "Low"|"Medium"|"High", "advice": "Precautions" },
        "storm": { "level": "Low"|"Medium"|"High", "advice": "Precautions" }
      },
      "agriculture": {
        "irrigationNeeded": true/false,
        "farmingSuitability": "Excellent"|"Good"|"Fair"|"Poor",
        "advice": "Specific farm or soil watering guidance.",
        "cropSuggestions": ["crop 1", "crop 2", "crop 3"]
      },
      "health": {
        "uvRisk": "Low"|"Moderate"|"High"|"Very High",
        "coldRisk": "Low"|"Moderate"|"High",
        "heatRisk": "Low"|"Moderate"|"High",
        "humidityRisk": "Low"|"Moderate"|"High",
        "overallAdvice": "A short medical/health suggestion for respiratory or dermatological health."
      }
    }

    Return ONLY the raw JSON string. Do not wrap in markdown code blocks (\`\`\`json ... \`\`\`).`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.1
      }
    });

    const text = response.text?.trim() || '';
    if (text) {
      // Safely parse JSON
      const parsed = JSON.parse(text);
      return parsed as AISuggestions;
    }
    
    throw new Error('Empty response from Gemini');
  } catch (err) {
    console.error('Gemini AI Generation failed, falling back to rule-based engine:', err);
    return getDeterministicSuggestions(current, aqi);
  }
}

// Global weather fetching service using Open-Meteo
export async function fetchWeatherData(lat: number, lon: number, cityName: string = 'Detecting Location', state?: string, country: string = ''): Promise<WeatherDataPayload> {
  try {
    // 1. Fetch main weather forecast
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,showers,snowfall,weather_code,cloud_cover,pressure_msl,wind_speed_10m,wind_direction_10m,uv_index&hourly=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation_probability,weather_code,pressure_msl,wind_speed_10m,uv_index&daily=weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,sunrise,sunset,uv_index_max,precipitation_sum,precipitation_probability_max,wind_speed_10m_max&timezone=auto`;
    const weatherRes = await axios.get(weatherUrl);
    const weatherData = weatherRes.data;

    // 2. Fetch air quality data
    const aqiUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=european_aqi,us_aqi,pm2_5,pm10,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone`;
    const aqiRes = await axios.get(aqiUrl);
    const aqiData = aqiRes.data;

    const currentWCode = weatherData.current.weather_code;
    const { text: conditionText, icon: conditionIcon } = mapWeatherCode(currentWCode);

    // Map Location
    const location: LocationInfo = {
      name: cityName,
      state: state || undefined,
      country: country || 'Unknown',
      lat,
      lon
    };

    // Map Current Weather
    const current: WeatherCondition = {
      temp: Math.round(weatherData.current.temperature_2m),
      feelsLike: Math.round(weatherData.current.apparent_temperature),
      humidity: weatherData.current.relative_humidity_2m,
      pressure: Math.round(weatherData.current.pressure_msl),
      windSpeed: Math.round(weatherData.current.wind_speed_10m),
      windDir: weatherData.current.wind_direction_10m,
      cloudCover: weatherData.current.cloud_cover,
      precipitation: weatherData.current.precipitation,
      uvIndex: weatherData.current.uv_index || 0,
      conditionCode: currentWCode,
      conditionText,
      conditionIcon,
      isDay: weatherData.current.is_day === 1
    };

    // Map Hourly Forecast (next 24 hours)
    const hourly: HourlyForecast[] = [];
    const hourlyTimes = weatherData.hourly.time;
    const nowEpoch = Date.now();
    
    // Find index of the current hour
    let startIdx = 0;
    for (let i = 0; i < hourlyTimes.length; i++) {
      if (new Date(hourlyTimes[i]).getTime() >= nowEpoch - 3600000) {
        startIdx = i;
        break;
      }
    }

    // Capture the next 24 hours
    for (let i = 0; i < 24; i++) {
      const idx = startIdx + i;
      if (idx < hourlyTimes.length) {
        const hTime = new Date(hourlyTimes[idx]);
        const formattedTime = hTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
        const code = weatherData.hourly.weather_code[idx];
        const mapped = mapWeatherCode(code);
        
        hourly.push({
          time: formattedTime,
          temp: Math.round(weatherData.hourly.temperature_2m[idx]),
          humidity: weatherData.hourly.relative_humidity_2m[idx],
          precipitationProb: weatherData.hourly.precipitation_probability[idx] || 0,
          conditionText: mapped.text,
          conditionCode: code,
          isDay: hTime.getHours() > 6 && hTime.getHours() < 19
        });
      }
    }

    // Map Daily Forecast (7 days)
    const daily: DailyForecast[] = [];
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dailyTimes = weatherData.daily.time;

    for (let i = 0; i < dailyTimes.length; i++) {
      const dDate = new Date(dailyTimes[i]);
      const dayLabel = daysOfWeek[dDate.getDay()];
      const code = weatherData.daily.weather_code[i];
      const mapped = mapWeatherCode(code);

      daily.push({
        date: dayLabel,
        tempMax: Math.round(weatherData.daily.temperature_2m_max[i]),
        tempMin: Math.round(weatherData.daily.temperature_2m_min[i]),
        apparentMax: Math.round(weatherData.daily.apparent_temperature_max[i]),
        apparentMin: Math.round(weatherData.daily.apparent_temperature_min[i]),
        precipitationSum: weatherData.daily.precipitation_sum[i] || 0,
        precipitationProb: weatherData.daily.precipitation_probability_max[i] || 0,
        uvIndex: weatherData.daily.uv_index_max[i] || 0,
        conditionText: mapped.text,
        conditionCode: code
      });
    }

    // Map Air Quality
    const rawAqiUS = aqiData.current.us_aqi || 25;
    const aqi: AirQuality = {
      aqiUS: rawAqiUS,
      aqiEU: aqiData.current.european_aqi || 22,
      pm2_5: Math.round(aqiData.current.pm2_5 || 8),
      pm10: Math.round(aqiData.current.pm10 || 12),
      co: Math.round(aqiData.current.carbon_monoxide || 150),
      no2: Math.round(aqiData.current.nitrogen_dioxide || 10),
      so2: Math.round(aqiData.current.sulphur_dioxide || 2),
      o3: Math.round(aqiData.current.ozone || 45),
      status: mapAQIStatus(rawAqiUS)
    };

    // 3. Generate AI recommendations (either via Gemini or Fallback)
    const ai = await generateAISuggestions(current, aqi);

    return {
      location,
      current,
      hourly,
      daily,
      aqi,
      ai
    };
  } catch (err) {
    console.error('Failed to fetch full weather data payload from Open-Meteo:', err);
    throw err;
  }
}
