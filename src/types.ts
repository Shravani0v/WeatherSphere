export interface WeatherCondition {
  temp: number;
  feelsLike: number;
  humidity: number;
  pressure: number;
  windSpeed: number;
  windDir: number;
  cloudCover: number;
  precipitation: number;
  uvIndex: number;
  conditionCode: number;
  conditionText: string;
  conditionIcon: string;
  isDay: boolean;
}

export interface HourlyForecast {
  time: string; // e.g., "14:00"
  temp: number;
  humidity: number;
  precipitationProb: number;
  conditionText: string;
  conditionCode: number;
  isDay: boolean;
}

export interface DailyForecast {
  date: string; // e.g., "Mon" or "2026-07-04"
  tempMax: number;
  tempMin: number;
  apparentMax: number;
  apparentMin: number;
  precipitationSum: number;
  precipitationProb: number;
  uvIndex: number;
  conditionText: string;
  conditionCode: number;
}

export interface AirQuality {
  aqiUS: number; // US EPA AQI standard
  aqiEU: number; // EU standard
  pm2_5: number; // ug/m3
  pm10: number; // ug/m3
  co: number; // ug/m3
  no2: number; // ug/m3
  so2: number; // ug/m3
  o3: number; // ug/m3
  status: 'Good' | 'Moderate' | 'Unhealthy for Sensitive Groups' | 'Unhealthy' | 'Very Unhealthy' | 'Hazardous';
}

export interface LocationInfo {
  name: string;
  state?: string;
  country: string;
  lat: number;
  lon: number;
}

export interface AISuggestions {
  summary: string;
  clothing: {
    upper: string[];
    lower: string[];
    accessories: string[];
    advice: string;
  };
  activities: {
    running: { suitable: boolean; score: number; advice: string };
    trekking: { suitable: boolean; score: number; advice: string };
    football: { suitable: boolean; score: number; advice: string };
    swimming: { suitable: boolean; score: number; advice: string };
    gym: { suitable: boolean; score: number; advice: string };
  };
  risks: {
    heatStroke: { level: 'Low' | 'Medium' | 'High'; advice: string };
    flood: { level: 'Low' | 'Medium' | 'High'; advice: string };
    highWind: { level: 'Low' | 'Medium' | 'High'; advice: string };
    storm: { level: 'Low' | 'Medium' | 'High'; advice: string };
  };
  agriculture: {
    irrigationNeeded: boolean;
    farmingSuitability: string; // e.g., "Excellent", "Poor"
    advice: string;
    cropSuggestions: string[];
  };
  health: {
    uvRisk: string;
    coldRisk: string;
    heatRisk: string;
    humidityRisk: string;
    overallAdvice: string;
  };
}

export interface WeatherDataPayload {
  location: LocationInfo;
  current: WeatherCondition;
  hourly: HourlyForecast[];
  daily: DailyForecast[];
  aqi: AirQuality;
  ai: AISuggestions;
}

export interface User {
  id: string;
  email: string;
  favorites: string[]; // List of serialized cities, e.g., "Paris, France" or json strings
}

export interface FavoriteCity {
  id: string;
  userId: string;
  cityName: string;
  lat: number;
  lon: number;
  country: string;
  addedAt: string;
}

export interface WeatherHistoryLog {
  id: string;
  userId: string;
  cityName: string;
  lat: number;
  lon: number;
  temp: number;
  conditionText: string;
  fetchedAt: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
  };
  token: string;
}
