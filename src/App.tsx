import React, { createContext, useContext, useEffect, useState } from 'react';
import axios from 'axios';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  LineChart, 
  Line, 
  BarChart, 
  Bar 
} from 'recharts';
import { 
  Sun, 
  Cloud, 
  Thermometer, 
  Droplets, 
  Wind, 
  Gauge, 
  Compass, 
  Search, 
  MapPin, 
  Activity, 
  ShieldAlert, 
  Heart, 
  Calendar, 
  MessageSquare,
  Bot,
  LogIn, 
  LogOut, 
  Plus, 
  Trash2, 
  Sprout, 
  AlertTriangle, 
  Eye, 
  History, 
  Sparkles, 
  Navigation,
  CheckCircle2,
  Info,
  Layers,
  Shirt,
  Moon,
  Bike,
  ArrowLeftRight,
  Download,
  BellRing,
  Sliders,
  FileText,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { WeatherIcon, InjectWeatherAnimations } from './components/WeatherIcons';
import { WeatherAnimations } from './components/WeatherAnimations';
import { LeafletRadarMap } from './components/LeafletRadarMap';
import { DashboardSkeleton } from './components/SkeletonLoaders';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AIChatbot } from './components/AIChatbot';
import { WeatherAIChatbot } from './components/WeatherAIChatbot';
import { WeatherDataPayload, FavoriteCity, WeatherHistoryLog } from './types';

// ==========================================
// AXIOS INSTANCE SETUP
// ==========================================
const api = axios.create({
  baseURL: '/'
});

// Auto intercept request to attach auth tokens
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('weathersphere_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (err) => Promise.reject(err));


// ==========================================
// THEME CONTEXT
// ==========================================
interface ThemeContextType {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}
const ThemeContext = createContext<ThemeContextType | null>(null);

const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('weathersphere_theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return 'dark'; // default premium dark theme
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('weathersphere_theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};


// ==========================================
// AUTH CONTEXT
// ==========================================
interface AuthContextType {
  token: string | null;
  user: { id: string; email: string } | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
  authError: string | null;
  clearAuthError: () => void;
}
const AuthContext = createContext<AuthContextType | null>(null);

const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('weathersphere_token'));
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      api.get('/api/auth/user')
        .then(res => setUser(res.data))
        .catch(() => {
          logout();
        });
    }
  }, [token]);

  const login = async (email: string, password: string) => {
    try {
      setAuthError(null);
      const res = await api.post('/api/auth/login', { email, password });
      localStorage.setItem('weathersphere_token', res.data.token);
      setToken(res.data.token);
      setUser(res.data.user);
    } catch (err: any) {
      setAuthError(err.response?.data?.error || 'Authentication failed');
      throw err;
    }
  };

  const register = async (email: string, password: string) => {
    try {
      setAuthError(null);
      const res = await api.post('/api/auth/register', { email, password });
      localStorage.setItem('weathersphere_token', res.data.token);
      setToken(res.data.token);
      setUser(res.data.user);
    } catch (err: any) {
      setAuthError(err.response?.data?.error || 'Registration failed');
      throw err;
    }
  };

  const logout = () => {
    localStorage.removeItem('weathersphere_token');
    setToken(null);
    setUser(null);
  };

  const clearAuthError = () => setAuthError(null);

  return (
    <AuthContext.Provider value={{ token, user, login, register, logout, authError, clearAuthError }}>
      {children}
    </AuthContext.Provider>
  );
};


// ==========================================
// WEATHER CONTROLS & DASHBOARD IMPLEMENTATION
// ==========================================
export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <InjectWeatherAnimations />
        <MainAppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}

function MainAppContent() {
  const themeCtx = useContext(ThemeContext);
  const authCtx = useContext(AuthContext);

  if (!themeCtx || !authCtx) return null;
  const { theme, toggleTheme } = themeCtx;
  const { user, login, register, logout, authError, clearAuthError } = authCtx;

  // Active Dashboard Modules
  const [activeTab, setActiveTab] = useState<'dashboard' | 'map' | 'agri' | 'health' | 'compare' | 'alerts' | 'logs' | 'ai-chat'>('dashboard');

  // Search and weather states
  const [weatherData, setWeatherData] = useState<WeatherDataPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);

  // Compare Cities states
  const [compareQuery, setCompareQuery] = useState('');
  const [compareResults, setCompareResults] = useState<any[]>([]);
  const [compareDataB, setCompareDataB] = useState<WeatherDataPayload | null>(null);
  const [loadingCompare, setLoadingCompare] = useState(false);
  const [showCompareDropdown, setShowCompareDropdown] = useState(false);

  // Severe Alert Rules Engine states
  const [alertRules, setAlertRules] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('weathersphere_alert_rules');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      { id: '1', metric: 'temp', operator: 'gt', value: 30, label: 'Excessive Heat Threshold (>30°C)', active: true },
      { id: '2', metric: 'aqi', operator: 'gt', value: 100, label: 'Unhealthful Air Quality (>100 US AQI)', active: true },
      { id: '3', metric: 'precip', operator: 'gt', value: 5, label: 'Heavy Rain Threshold (>5 mm)', active: false },
      { id: '4', metric: 'wind', operator: 'gt', value: 25, label: 'High Wind Velocity Alert (>25 km/h)', active: true }
    ];
  });

  const [newRuleMetric, setNewRuleMetric] = useState('temp');
  const [newRuleOperator, setNewRuleOperator] = useState('gt');
  const [newRuleValue, setNewRuleValue] = useState(30);

  // Persist rules
  useEffect(() => {
    localStorage.setItem('weathersphere_alert_rules', JSON.stringify(alertRules));
  }, [alertRules]);

  // Evaluates loaded weather against rules
  const checkTriggeredAlerts = (data: WeatherDataPayload | null) => {
    if (!data) return [];
    const triggered = [];
    for (const rule of alertRules) {
      if (!rule.active) continue;
      let val = 0;
      let match = false;
      if (rule.metric === 'temp') {
        val = data.current.temp;
      } else if (rule.metric === 'aqi') {
        val = data.aqi.aqiUS;
      } else if (rule.metric === 'wind') {
        val = data.current.windSpeed;
      } else if (rule.metric === 'precip') {
        val = data.current.precipitation;
      }

      if (rule.operator === 'gt' && val > rule.value) {
        match = true;
      } else if (rule.operator === 'lt' && val < rule.value) {
        match = true;
      }

      if (match) {
        triggered.push({
          ...rule,
          currentValue: val
        });
      }
    }
    return triggered;
  };

  // Authenticated state tracking (Favorites and search history)
  const [favorites, setFavorites] = useState<FavoriteCity[]>([]);
  const [historyLogs, setHistoryLogs] = useState<WeatherHistoryLog[]>([]);
  const [isCityFavorite, setIsCityFavorite] = useState(false);

  // Client-side Recent Searches backup (in addition to DB logs)
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('weathersphere_recent_searches');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Auth Dialog state
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');

  // Primary entrypoint: Fetch weather based on GPS coordinates or fallback
  const fetchWeatherByCoords = async (lat: number, lon: number, cityName?: string, state?: string, country?: string) => {
    setLoading(true);
    setError(null);
    try {
      let url = `/api/weather?lat=${lat}&lon=${lon}`;
      if (cityName) url += `&cityName=${encodeURIComponent(cityName)}`;
      if (state) url += `&state=${encodeURIComponent(state)}`;
      if (country) url += `&country=${encodeURIComponent(country)}`;

      const res = await api.get(url);
      setWeatherData(res.data);
      saveToRecentSearches(res.data.location.name);

      // Save to database search history if logged in
      if (user) {
        api.post('/api/history', {
          cityName: res.data.location.name,
          lat: res.data.location.lat,
          lon: res.data.location.lon,
          temp: res.data.current.temp,
          conditionText: res.data.current.conditionText
        }).then(() => refreshHistory());
      }
    } catch (err: any) {
      console.error(err);
      setError('Could not retrieve weather details. Please double-check the city name or network connection.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch weather directly by raw city text query
  const fetchWeatherByQuery = async (query: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/api/weather?q=${encodeURIComponent(query)}`);
      setWeatherData(res.data);
      saveToRecentSearches(res.data.location.name);

      if (user) {
        api.post('/api/history', {
          cityName: res.data.location.name,
          lat: res.data.location.lat,
          lon: res.data.location.lon,
          temp: res.data.current.temp,
          conditionText: res.data.current.conditionText
        }).then(() => refreshHistory());
      }
    } catch (err) {
      setError(`No matches found for '${query}'. Try searching coordinates or a different city name.`);
    } finally {
      setLoading(false);
    }
  };

  // Trigger Automatic GPS Location Fetch
  const triggerGPSFetch = () => {
    if (!navigator.geolocation) {
      setError('GPS Geolocation is not supported by your current browser.');
      fetchWeatherByCoords(37.7749, -122.4194, 'San Francisco', 'California', 'United States'); // fallback
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        fetchWeatherByCoords(pos.coords.latitude, pos.coords.longitude);
      },
      (err) => {
        console.warn('Geolocation access declined or unavailable:', err.message);
        // Load default SF weather
        fetchWeatherByCoords(37.7749, -122.4194, 'San Francisco', 'California', 'United States');
      },
      { timeout: 7000 }
    );
  };

  // Boot strap load on mount
  useEffect(() => {
    triggerGPSFetch();
  }, []);

  // Sync favorites when user logs in or out
  useEffect(() => {
    if (user) {
      refreshFavorites();
      refreshHistory();
    } else {
      setFavorites([]);
      setHistoryLogs([]);
    }
  }, [user]);

  // Check if current city is already favorited
  useEffect(() => {
    if (weatherData && favorites.length > 0) {
      const isFav = favorites.some(
        f => f.cityName.toLowerCase() === weatherData.location.name.toLowerCase()
      );
      setIsCityFavorite(isFav);
    } else {
      setIsCityFavorite(false);
    }
  }, [weatherData, favorites]);

  // Handle city search dropdown text entry
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchQuery.trim().length > 1) {
        api.get(`/api/weather/search?q=${encodeURIComponent(searchQuery)}`)
          .then(res => {
            setSearchResults(res.data);
            setShowSearchDropdown(true);
          })
          .catch(err => console.error(err));
      } else {
        setSearchResults([]);
        setShowSearchDropdown(false);
      }
    }, 350);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  // Handle compare city search dropdown text entry
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (compareQuery.trim().length > 1) {
        api.get(`/api/weather/search?q=${encodeURIComponent(compareQuery)}`)
          .then(res => {
            setCompareResults(res.data);
            setShowCompareDropdown(true);
          })
          .catch(err => console.error(err));
      } else {
        setCompareResults([]);
        setShowCompareDropdown(false);
      }
    }, 350);

    return () => clearTimeout(delayDebounceFn);
  }, [compareQuery]);

  const fetchCompareCity = async (lat: number, lon: number, cityName: string, state?: string, country?: string) => {
    setLoadingCompare(true);
    try {
      let url = `/api/weather?lat=${lat}&lon=${lon}`;
      if (cityName) url += `&cityName=${encodeURIComponent(cityName)}`;
      if (state) url += `&state=${encodeURIComponent(state)}`;
      if (country) url += `&country=${encodeURIComponent(country)}`;
      const res = await api.get(url);
      setCompareDataB(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingCompare(false);
    }
  };

  const downloadJSON = (data: WeatherDataPayload) => {
    const filename = `${data.location.name.replace(/\s+/g, '_')}_weather_report.json`;
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadCSV = (data: WeatherDataPayload) => {
    const filename = `${data.location.name.replace(/\s+/g, '_')}_weather_report.csv`;
    let csvContent = `Weather Report for ${data.location.name}, ${data.location.country}\n`;
    csvContent += `Generated at: ${new Date().toISOString()}\n\n`;
    
    csvContent += `CURRENT CONDITIONS\n`;
    csvContent += `Parameter,Value,Unit\n`;
    csvContent += `Temperature,${data.current.temp},°C\n`;
    csvContent += `Feels Like,${data.current.feelsLike},°C\n`;
    csvContent += `Humidity,${data.current.humidity},%\n`;
    csvContent += `Wind Speed,${data.current.windSpeed},km/h\n`;
    csvContent += `UV Index,${data.current.uvIndex},\n`;
    csvContent += `Precipitation,${data.current.precipitation},mm\n`;
    csvContent += `Air Quality Index (US),${data.aqi.aqiUS},\n`;
    csvContent += `AQI Status,${data.aqi.status},\n\n`;
    
    csvContent += `7-DAY FORECAST OUTLOOK\n`;
    csvContent += `Day,Max Temp (°C),Min Temp (°C),Precip Prob (%),UV Index\n`;
    data.daily.forEach(d => {
      csvContent += `${d.date},${d.tempMax},${d.tempMin},${d.precipitationProb},${d.uvIndex}\n`;
    });
    
    csvContent += `\n24-HOUR HOURLY FORECAST\n`;
    csvContent += `Hour,Temp (°C),Humidity (%),Precip Prob (%)\n`;
    data.hourly.forEach(h => {
      csvContent += `${h.time},${h.temp},${h.humidity},${h.precipitationProb}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Local storage recent search backup handler
  const saveToRecentSearches = (cityName: string) => {
    setRecentSearches(prev => {
      const filtered = prev.filter(c => c.toLowerCase() !== cityName.toLowerCase());
      const updated = [cityName, ...filtered].slice(0, 8); // limit 8 items
      localStorage.setItem('weathersphere_recent_searches', JSON.stringify(updated));
      return updated;
    });
  };

  const clearRecentSearches = () => {
    localStorage.removeItem('weathersphere_recent_searches');
    setRecentSearches([]);
  };

  // Favorites logic hooks
  const refreshFavorites = () => {
    api.get('/api/favorites')
      .then(res => setFavorites(res.data))
      .catch(err => console.error(err));
  };

  const refreshHistory = () => {
    api.get('/api/history')
      .then(res => setHistoryLogs(res.data))
      .catch(err => console.error(err));
  };

  const toggleFavoriteState = async () => {
    if (!user) {
      setAuthMode('login');
      setShowAuthModal(true);
      return;
    }

    if (!weatherData) return;

    if (isCityFavorite) {
      // Find favorite element to remove
      const favObj = favorites.find(f => f.cityName.toLowerCase() === weatherData.location.name.toLowerCase());
      if (favObj) {
        try {
          await api.delete(`/api/favorites/${favObj.id}`);
          refreshFavorites();
        } catch (err) {
          console.error(err);
        }
      }
    } else {
      try {
        await api.post('/api/favorites', {
          cityName: weatherData.location.name,
          lat: weatherData.location.lat,
          lon: weatherData.location.lon,
          country: weatherData.location.country
        });
        refreshFavorites();
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Auth Submit Action
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (authMode === 'login') {
        await login(authEmail, authPassword);
      } else {
        await register(authEmail, authPassword);
      }
      setShowAuthModal(false);
      setAuthEmail('');
      setAuthPassword('');
    } catch (err) {
      // error handled in Context
    }
  };

  return (
    <div className="relative min-h-screen font-sans text-slate-800 dark:text-slate-100 transition-colors duration-300 overflow-x-hidden bg-slate-50 dark:bg-[#030712] flex flex-col md:flex-row">
      {/* Background Weather Animated Canvas overlay */}
      {weatherData && (
        <WeatherAnimations 
          conditionCode={weatherData.current.conditionCode} 
          isDay={weatherData.current.isDay} 
        />
      )}

      {/* Sidebar - Visible on Desktop */}
      <aside className="w-full md:w-64 bg-white/40 dark:bg-slate-950/40 backdrop-blur-xl border-b md:border-b-0 md:border-r border-slate-200/10 dark:border-slate-800/40 flex flex-col p-6 shrink-0 z-20">
        <div className="flex items-center justify-between md:justify-start gap-3 mb-6 md:mb-10">
          <div className="flex items-center gap-3 select-none">
            <div className="p-2.5 bg-blue-600 rounded-xl shadow-lg shadow-blue-500/20 text-white animate-pulse">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-display font-bold tracking-tight text-slate-900 dark:text-slate-100">
                WeatherSphere <span className="text-blue-500 font-medium">AI</span>
              </h1>
              <p className="text-[9px] font-mono text-slate-500 dark:text-slate-400 uppercase tracking-widest leading-none mt-0.5">
                Meteorological Port
              </p>
            </div>
          </div>
          {/* Mobile Theme toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 md:hidden bg-slate-200/50 dark:bg-slate-800/40 text-slate-700 dark:text-sky-400 hover:bg-slate-300 dark:hover:bg-slate-800 rounded-xl transition-all"
          >
            {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
          </button>
        </div>

        {/* Sidebar Nav links */}
        <nav className="flex flex-row md:flex-col overflow-x-auto md:overflow-x-visible gap-1 pb-4 md:pb-0 scrollbar-none md:space-y-1.5">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: Activity },
            { id: 'map', label: 'Radar Map', icon: Layers },
            { id: 'compare', label: 'City Compare', icon: ArrowLeftRight },
            { id: 'agri', label: 'Agriculture', icon: Sprout },
            { id: 'health', label: 'Health Index', icon: Heart },
            { id: 'alerts', label: 'Alert Center', icon: ShieldAlert },
            { id: 'ai-chat', label: 'AI Weather Co-Pilot', icon: Bot },
            { id: 'logs', label: 'Saved Locations', icon: History }
          ].map(tab => {
            const TabIcon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'bg-blue-600/10 text-blue-600 dark:text-blue-400 border-blue-500/20 dark:border-blue-500/10 font-bold'
                    : 'border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800/30 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <TabIcon size={16} />
                <span className="text-xs font-semibold">{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Dynamic AI Summary Badge in Sidebar */}
        {weatherData && (
          <div className="mt-auto hidden md:block p-4 bg-gradient-to-br from-blue-500/5 to-indigo-500/5 dark:from-indigo-950/40 dark:to-slate-800/40 rounded-2xl border border-slate-200/10 dark:border-slate-800/40 space-y-2">
            <div className="text-[9px] text-blue-600 dark:text-indigo-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles size={10} className="animate-pulse" />
              Sleek AI Agent
            </div>
            <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-300 line-clamp-4">
              {weatherData.ai.summary}
            </p>
          </div>
        )}
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col p-4 md:p-8 gap-6 overflow-y-auto relative z-10">
        
        {/* Top Search & Actions Bar */}
        <header className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <div className="relative flex items-center w-full">
              <span className="absolute left-4 text-slate-400">
                <Search size={18} />
              </span>
              <input
                type="text"
                placeholder="Search worldwide city names (e.g., Tokyo, London, Paris)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => { if (searchQuery.length > 1) setShowSearchDropdown(true); }}
                className="w-full pl-12 pr-4 py-3 bg-white/70 dark:bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-200/20 dark:border-slate-800/40 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-sans text-sm shadow-sm"
              />
              <AnimatePresence>
                {searchQuery && (
                  <button
                    onClick={() => { setSearchQuery(''); setSearchResults([]); }}
                    className="absolute right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-100 text-xs"
                  >
                    Clear
                  </button>
                )}
              </AnimatePresence>
            </div>

            {/* Search Dropdown */}
            {showSearchDropdown && searchResults.length > 0 && (
              <div className="absolute z-50 w-full mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-lg">
                <ul>
                  {searchResults.map((city, idx) => (
                    <li key={idx}>
                      <button
                        onClick={() => {
                          fetchWeatherByCoords(city.lat, city.lon, city.name, city.state, city.country);
                          setSearchQuery('');
                          setShowSearchDropdown(false);
                        }}
                        className="w-full text-left px-5 py-3 hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-900 dark:text-slate-200 text-sm flex items-center justify-between border-b border-slate-100 dark:border-slate-800/40 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <MapPin className="text-blue-500 w-4 h-4 shrink-0" />
                          <span className="font-semibold">{city.name}</span>
                          {city.state && <span className="text-xs text-slate-400">({city.state})</span>}
                        </div>
                        <span className="text-xs font-mono text-slate-400 shrink-0 bg-slate-900/10 dark:bg-slate-800 px-2 py-0.5 rounded">
                          {city.country}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Desktop Right items */}
          <div className="flex flex-wrap items-center gap-3 self-end md:self-auto">
            <button
              onClick={triggerGPSFetch}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600/10 hover:bg-blue-600/20 text-blue-600 dark:text-blue-400 font-bold rounded-2xl text-xs transition-all border border-blue-500/20 active:scale-95"
            >
              <Navigation className="w-3.5 h-3.5" />
              Detect Location
            </button>

            <button
              onClick={toggleTheme}
              className="hidden md:block p-2.5 bg-white/70 dark:bg-slate-900/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-sky-400 border border-slate-200/10 dark:border-slate-800/40 rounded-2xl transition-all active:scale-95 shadow-sm"
              title="Toggle Light/Dark Theme"
            >
              {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
            </button>

            {user ? (
              <div className="flex items-center gap-3 bg-white/40 dark:bg-slate-900/40 border border-slate-200/10 dark:border-slate-800/40 px-3 py-1.5 rounded-2xl">
                <div className="hidden sm:block text-right">
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{user.email.split('@')[0]}</p>
                  <p className="text-[9px] font-mono text-emerald-500 dark:text-emerald-400">Auth Port Member</p>
                </div>
                <button
                  onClick={logout}
                  className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 rounded-xl transition-all border border-rose-500/20"
                  title="Logout"
                >
                  <LogOut size={14} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setAuthMode('login');
                  clearAuthError();
                  setShowAuthModal(true);
                }}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-xs font-bold transition-all shadow-lg shadow-blue-500/10 active:scale-95"
              >
                <LogIn size={14} />
                Access Portal
              </button>
            )}
          </div>
        </header>

        {/* Global Error Banner */}
        {error && (
          <div className="flex items-center gap-3 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl shadow-lg animate-pulse">
            <AlertTriangle className="shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {/* Inner Main Area */}
        {loading ? (
          <DashboardSkeleton />
        ) : !weatherData ? (
          <div className="p-12 text-center rounded-[32px] bg-white/40 dark:bg-slate-900/40 border border-slate-200/10 dark:border-slate-800/40 max-w-xl mx-auto space-y-4 shadow-2xl backdrop-blur-md">
            <AlertTriangle className="mx-auto text-amber-500 w-12 h-12 animate-bounce" />
            <h3 className="text-xl font-display font-bold text-slate-900 dark:text-slate-100">Ready to Cast</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Click detect location or search a city above to load meteorological data.</p>
          </div>
        ) : (
          <main className="space-y-6">
            
            {/* Active modules conditional rendering */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.4 }}
              >
                
                {/* 1. PRIMARY WEATHER DASHBOARD */}
                {activeTab === 'dashboard' && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    
                    {/* Left Panel: Primary Conditions card */}
                    <div className="lg:col-span-1 p-6 rounded-3xl bg-white/20 dark:bg-slate-950/40 border border-slate-200/10 shadow-2xl space-y-6 glass-card">
                      
                      {/* Name header & Save Favorite Button */}
                      <div className="flex items-center justify-between">
                        <div>
                          <h2 className="text-2xl font-display font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                            {weatherData.location.name}
                          </h2>
                          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                            {weatherData.location.state && `${weatherData.location.state}, `}{weatherData.location.country}
                          </p>
                        </div>
                        <button
                          onClick={toggleFavoriteState}
                          className={`p-2 rounded-xl transition-all active:scale-95 shadow-md ${
                            isCityFavorite
                              ? 'bg-rose-500 text-white shadow-rose-500/20'
                              : 'bg-white/80 dark:bg-slate-900/60 hover:bg-slate-800 text-slate-700 dark:text-rose-400 border border-slate-200/10'
                          }`}
                          title={isCityFavorite ? 'Remove from saved locations' : 'Pin to saved locations'}
                        >
                          <Heart size={18} className={isCityFavorite ? 'fill-current' : ''} />
                        </button>
                      </div>

                      {/* Main Temp & Condition */}
                      <div className="flex items-center justify-center gap-6 py-6 border-y border-slate-200/10">
                        <div className="p-4 bg-slate-950/10 dark:bg-slate-900/40 rounded-3xl">
                          <WeatherIcon 
                            name={weatherData.current.conditionIcon} 
                            size={72} 
                            isDay={weatherData.current.isDay} 
                          />
                        </div>
                        <div>
                          <span className="text-6xl font-display font-bold tracking-tighter text-slate-900 dark:text-slate-100 font-mono">
                            {weatherData.current.temp}°C
                          </span>
                          <p className="text-lg font-medium text-blue-500 leading-none">
                            {weatherData.current.conditionText}
                          </p>
                          <p className="text-xs text-slate-400 font-mono mt-1">
                            Feels like {weatherData.current.feelsLike}°C
                          </p>
                        </div>
                      </div>

                      {/* 2x2 Grid Metrics */}
                      <div className="grid grid-cols-2 gap-4">
                        {[
                          { label: 'Humidity', val: `${weatherData.current.humidity}%`, icon: Droplets, color: 'text-sky-400' },
                          { label: 'Wind Speed', val: `${weatherData.current.windSpeed} km/h`, icon: Wind, color: 'text-teal-400' },
                          { label: 'UV Index', val: `${weatherData.current.uvIndex} UVI`, icon: Sun, color: 'text-amber-500' },
                          { label: 'Barometer', val: `${weatherData.current.pressure} hPa`, icon: Gauge, color: 'text-violet-400' }
                        ].map((metric, i) => {
                          const Icon = metric.icon;
                          return (
                            <div key={i} className="p-4 rounded-2xl bg-slate-950/10 dark:bg-slate-900/20 border border-slate-200/5 flex items-center gap-3">
                              <span className={`p-2 bg-slate-950/20 dark:bg-slate-900/50 rounded-xl ${metric.color}`}>
                                <Icon size={18} />
                              </span>
                              <div>
                                <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">{metric.label}</p>
                                <p className="text-sm font-mono font-bold text-slate-900 dark:text-slate-100">{metric.val}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Middle Panel: AI Meteorological Summary & Recharts Hourly Forecast Chart */}
                    <div className="lg:col-span-2 space-y-6">
                      
                      {/* AI recommendations Box */}
                      <div className="p-6 rounded-3xl bg-gradient-to-br from-indigo-950/40 via-blue-950/20 to-slate-900/40 border border-indigo-500/10 shadow-2xl glass-card space-y-3 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-5 text-indigo-500 pointer-events-none">
                          <Sparkles size={120} />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="p-1.5 bg-indigo-500/10 rounded-lg text-indigo-400">
                            <Sparkles size={18} className="animate-bounce" />
                          </span>
                          <h3 className="text-sm font-display font-bold tracking-tight text-indigo-400 uppercase">
                            AI Meteorological Insights
                          </h3>
                        </div>
                        <p className="text-sm leading-relaxed text-slate-300 dark:text-slate-300">
                          {weatherData.ai.summary}
                        </p>
                      </div>

                      {/* Hourly forecast Recharts Temp Chart */}
                      <div className="p-6 rounded-3xl bg-white/20 dark:bg-slate-950/40 border border-slate-200/10 shadow-2xl glass-card space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Activity className="text-blue-500" size={18} />
                            <h3 className="text-sm font-display font-bold text-slate-900 dark:text-slate-100">
                              24-Hour Temperature & Precip Curve
                            </h3>
                          </div>
                          <span className="text-[10px] font-mono text-slate-400">Live Forecast Data</span>
                        </div>

                        <div className="h-48 w-full font-mono text-[11px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={weatherData.hourly.slice(0, 12)} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                              <defs>
                                <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.08)" />
                              <XAxis dataKey="time" stroke="rgba(148, 163, 184, 0.4)" />
                              <YAxis stroke="rgba(148, 163, 184, 0.4)" domain={['dataMin - 1', 'dataMax + 1']} />
                              <Tooltip 
                                contentStyle={{ 
                                  backgroundColor: 'rgba(15, 23, 42, 0.85)', 
                                  border: '1px solid rgba(255,255,255,0.08)',
                                  borderRadius: '0.75rem',
                                  color: '#fff'
                                }} 
                              />
                              <Area type="monotone" dataKey="temp" name="Temp (°C)" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#tempGradient)" />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>

                    {/* Footer Row: 7-Day Forecast Horizon (Full-width grid) */}
                    <div className="lg:col-span-3 p-6 rounded-3xl bg-white/20 dark:bg-slate-950/40 border border-slate-200/10 shadow-2xl glass-card space-y-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="text-sky-500" size={18} />
                        <h3 className="text-sm font-display font-bold">7-Day Meteorological Outlook</h3>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
                        {weatherData.daily.map((day, idx) => (
                          <div 
                            key={idx} 
                            className="p-4 rounded-2xl bg-slate-950/10 dark:bg-slate-900/30 border border-slate-200/5 text-center flex flex-col items-center justify-between gap-3 hover:scale-[1.03] transition-all"
                          >
                            <span className="text-xs font-semibold text-slate-400">{day.date}</span>
                            <WeatherIcon name={day.conditionText.includes('Rain') ? 'CloudRain' : (day.conditionText.includes('Clear') ? 'Sun' : 'Cloud')} size={32} />
                            <div>
                              <p className="text-sm font-mono font-bold">{day.tempMax}°C</p>
                              <p className="text-[10px] font-mono text-slate-400">{day.tempMin}°C</p>
                            </div>
                            <span className="text-[9px] font-mono bg-blue-500/10 text-sky-400 px-1.5 py-0.5 rounded-full">
                              {day.conditionText}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Developer & Analyst Data Export Hub */}
                    <div className="lg:col-span-3 p-6 rounded-3xl bg-white/20 dark:bg-slate-950/40 border border-slate-200/10 shadow-2xl space-y-4 glass-card">
                      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-200/5 pb-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="p-1.5 bg-blue-500/10 rounded-lg text-blue-500">
                              <FileText size={18} />
                            </span>
                            <h3 className="text-sm font-display font-bold text-slate-900 dark:text-slate-100">
                              Meteorological Analyst Data Export Hub
                            </h3>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            Download comprehensive, fully structured meteorological payloads for secondary analytical tools, data science pipelines, or spreadsheet models.
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => downloadCSV(weatherData)}
                            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600/15 hover:bg-emerald-600/25 text-emerald-500 dark:text-emerald-400 rounded-xl text-xs font-bold border border-emerald-500/20 transition-all active:scale-95"
                          >
                            <Download size={14} />
                            Export CSV Sheet
                          </button>
                          <button
                            onClick={() => downloadJSON(weatherData)}
                            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600/15 hover:bg-blue-600/25 text-blue-500 dark:text-blue-400 rounded-xl text-xs font-bold border border-blue-500/20 transition-all active:scale-95"
                          >
                            <Download size={14} />
                            Export JSON Dataset
                          </button>
                        </div>
                      </div>

                      {/* Code Sandbox terminal preview */}
                      <div className="rounded-2xl bg-slate-950 p-4 border border-slate-800 text-xs text-slate-300 font-mono space-y-2">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-2 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                          <span>Metadata Explorer Sandbox</span>
                          <span className="text-emerald-500">HTTP 200 OK</span>
                        </div>
                        <pre className="max-h-36 overflow-y-auto text-[11px] leading-relaxed select-all scrollbar-thin scrollbar-thumb-slate-800 text-left">
{`{
  "location": {
    "name": "${weatherData.location.name}",
    "coordinates": [${weatherData.location.lat.toFixed(4)}, ${weatherData.location.lon.toFixed(4)}],
    "country": "${weatherData.location.country}"
  },
  "current_metrics": {
    "temp_c": ${weatherData.current.temp},
    "humidity_pct": ${weatherData.current.humidity},
    "wind_speed_kmh": ${weatherData.current.windSpeed},
    "uv_index": ${weatherData.current.uvIndex}
  },
  "air_quality_index": {
    "us_epa_aqi": ${weatherData.aqi.aqiUS},
    "status": "${weatherData.aqi.status}"
  },
  "hourly_records_count": ${weatherData.hourly.length},
  "daily_projections_count": ${weatherData.daily.length}
}`}
                        </pre>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. LEAFLET RADAR MAP MODULE */}
                {activeTab === 'map' && (
                  <div className="space-y-6">
                    <div className="p-6 rounded-3xl bg-white/20 dark:bg-slate-950/40 border border-slate-200/10 shadow-2xl glass-card space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <h2 className="text-lg font-display font-bold">Interactive Meteorological Radar Canvas</h2>
                          <p className="text-xs text-slate-400">Click anywhere on the world map to reverse-geolocate coordinates and update your dashboard.</p>
                        </div>
                        <div className="flex items-center gap-2 bg-slate-900/40 px-3 py-1.5 rounded-xl border border-slate-200/5">
                          <MapPin size={14} className="text-rose-500" />
                          <span className="text-xs font-mono text-slate-200">
                            {weatherData.location.lat.toFixed(4)}, {weatherData.location.lon.toFixed(4)}
                          </span>
                        </div>
                      </div>

                      {/* Map Embed Boundary wrapper */}
                      <ErrorBoundary>
                        <LeafletRadarMap 
                          lat={weatherData.location.lat} 
                          lon={weatherData.location.lon} 
                          cityName={weatherData.location.name}
                          onMapClick={(lat, lon) => {
                            fetchWeatherByCoords(lat, lon);
                          }}
                        />
                      </ErrorBoundary>
                    </div>
                  </div>
                )}

                {/* 3. AGRICULTURE & IRRIGATION MODE */}
                {activeTab === 'agri' && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    
                    {/* Suitability score gauges */}
                    <div className="md:col-span-1 p-6 rounded-3xl bg-white/20 dark:bg-slate-950/40 border border-slate-200/10 shadow-2xl glass-card space-y-6 flex flex-col justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Sprout className="text-green-500 animate-pulse" size={20} />
                          <h3 className="text-sm font-display font-bold uppercase tracking-wider text-green-400">Agriculture Suitability</h3>
                        </div>
                        <p className="text-xs text-slate-400">Determines seasonal suitability for planting based on UV, soil humidity risk, and temperature.</p>
                      </div>

                      <div className="py-6 text-center">
                        <span className={`text-5xl font-display font-bold ${
                          weatherData.ai.agriculture.farmingSuitability === 'Excellent' || weatherData.ai.agriculture.farmingSuitability === 'Good'
                            ? 'text-emerald-400'
                            : weatherData.ai.agriculture.farmingSuitability === 'Fair'
                            ? 'text-amber-400'
                            : 'text-rose-400'
                        }`}>
                          {weatherData.ai.agriculture.farmingSuitability}
                        </span>
                        <p className="text-[11px] font-mono text-slate-400 mt-2">Overall Quality Index</p>
                      </div>

                      {/* Irrigation Status Flag */}
                      <div className="p-4 rounded-2xl bg-slate-950/20 border border-slate-200/5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Droplets className="text-sky-400" size={16} />
                          <span className="text-xs font-semibold">Irrigation Needed</span>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-[10px] font-mono font-bold ${
                          weatherData.ai.agriculture.irrigationNeeded
                            ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                            : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        }`}>
                          {weatherData.ai.agriculture.irrigationNeeded ? 'ACTIVE WATERING ADVISED' : 'SOIL HYDRATED'}
                        </span>
                      </div>
                    </div>

                    {/* Agriculture Suggestions */}
                    <div className="md:col-span-2 p-6 rounded-3xl bg-white/20 dark:bg-slate-950/40 border border-slate-200/10 shadow-2xl glass-card space-y-6">
                      <div className="space-y-2">
                        <h3 className="text-lg font-display font-bold">Agronomist Recommendation</h3>
                        <p className="text-sm leading-relaxed text-slate-300">
                          {weatherData.ai.agriculture.advice}
                        </p>
                      </div>

                      {/* Recommended seasonal Crops */}
                      <div className="space-y-3">
                        <h4 className="text-xs uppercase tracking-wider text-green-400 font-bold">Best Performing Seasonal Crops</h4>
                        <div className="flex flex-wrap gap-2">
                          {weatherData.ai.agriculture.cropSuggestions.map((crop, i) => (
                            <span 
                              key={i} 
                              className="px-3.5 py-1.5 bg-green-500/10 hover:bg-green-500/15 text-green-400 rounded-full text-xs font-medium border border-green-500/20 flex items-center gap-1.5"
                            >
                              <CheckCircle2 size={12} className="text-green-500" />
                              {crop}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. HEALTH SUGGESTIONS & LIFESTYLE */}
                {activeTab === 'health' && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    
                    {/* Air Quality Dashboard */}
                    <div className="lg:col-span-1 p-6 rounded-3xl bg-white/20 dark:bg-slate-950/40 border border-slate-200/10 shadow-2xl glass-card space-y-6">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Activity className="text-teal-400 animate-pulse" size={18} />
                          <h3 className="text-sm font-display font-bold text-teal-400 uppercase tracking-wider">Air Quality Dashboard</h3>
                        </div>
                        <p className="text-[10px] text-slate-400">US EPA Standard particulate measurement</p>
                      </div>

                      <div className="text-center py-4 border-y border-slate-200/10">
                        <span className="text-5xl font-display font-bold text-slate-900 dark:text-slate-100 font-mono">
                          {weatherData.aqi.aqiUS}
                        </span>
                        <p className={`text-xs font-semibold mt-2 ${
                          weatherData.aqi.status === 'Good'
                            ? 'text-emerald-400'
                            : weatherData.aqi.status === 'Moderate'
                            ? 'text-amber-400'
                            : 'text-rose-400'
                        }`}>
                          {weatherData.aqi.status}
                        </p>
                      </div>

                      {/* Particulate measurements */}
                      <div className="space-y-2 font-mono text-xs">
                        <div className="flex items-center justify-between text-slate-400">
                          <span>PM 2.5 (Fine dust)</span>
                          <span className="text-slate-100 font-bold">{weatherData.aqi.pm2_5} ug/m3</span>
                        </div>
                        <div className="flex items-center justify-between text-slate-400">
                          <span>PM 10 (Coarse dust)</span>
                          <span className="text-slate-100 font-bold">{weatherData.aqi.pm10} ug/m3</span>
                        </div>
                        <div className="flex items-center justify-between text-slate-400">
                          <span>Nitrogen Dioxide (NO2)</span>
                          <span className="text-slate-100 font-bold">{weatherData.aqi.no2} ug/m3</span>
                        </div>
                        <div className="flex items-center justify-between text-slate-400">
                          <span>Carbon Monoxide (CO)</span>
                          <span className="text-slate-100 font-bold">{weatherData.aqi.co} ug/m3</span>
                        </div>
                      </div>
                    </div>

                    {/* Clothing and Activity guidelines */}
                    <div className="lg:col-span-2 p-6 rounded-3xl bg-white/20 dark:bg-slate-950/40 border border-slate-200/10 shadow-2xl glass-card space-y-6">
                      
                      {/* Interactive Health Alerts */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-display font-bold">Activity suitability insights</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {[
                            { name: 'Running / Jogging', suitability: weatherData.ai.activities.running, icon: Bike },
                            { name: 'Trekking / Hiking', suitability: weatherData.ai.activities.trekking, icon: Compass },
                            { name: 'Football / Field Sports', suitability: weatherData.ai.activities.football, icon: Activity },
                            { name: 'Swimming & Water Sports', suitability: weatherData.ai.activities.swimming, icon: Droplets }
                          ].map((item, i) => (
                            <div key={i} className="p-4 rounded-2xl bg-slate-950/20 border border-slate-200/5 space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                  <item.icon size={14} className="text-blue-400" />
                                  <span className="text-xs font-bold">{item.name}</span>
                                </div>
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold ${
                                  item.suitability.suitable
                                    ? 'bg-emerald-500/10 text-emerald-400'
                                    : 'bg-rose-500/10 text-rose-400'
                                }`}>
                                  Score: {item.suitability.score}/100
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-400">{item.suitability.advice}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Smart Clothing Section */}
                      <div className="p-4 rounded-2xl bg-slate-950/10 border border-slate-200/5 space-y-3">
                        <div className="flex items-center gap-2">
                          <Shirt className="text-sky-400" size={16} />
                          <h4 className="text-xs uppercase tracking-wider text-sky-400 font-bold">Smart Clothing Recommendations</h4>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                          <div className="bg-slate-950/20 p-2.5 rounded-lg">
                            <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Upper Wear</span>
                            <p className="font-semibold text-slate-100">{weatherData.ai.clothing.upper.join(', ')}</p>
                          </div>
                          <div className="bg-slate-950/20 p-2.5 rounded-lg">
                            <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Lower Wear</span>
                            <p className="font-semibold text-slate-100">{weatherData.ai.clothing.lower.join(', ')}</p>
                          </div>
                          <div className="bg-slate-950/20 p-2.5 rounded-lg">
                            <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Accessories</span>
                            <p className="font-semibold text-slate-100">{weatherData.ai.clothing.accessories.join(', ')}</p>
                          </div>
                        </div>
                        <p className="text-[11px] text-slate-400 italic">Advice: {weatherData.ai.clothing.advice}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* 5. HISTORY & FAVORITE PERSISTENCE SECTION */}
                {activeTab === 'logs' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    {/* Saved favorite locations */}
                    <div className="p-6 rounded-3xl bg-white/20 dark:bg-slate-950/40 border border-slate-200/10 shadow-2xl glass-card space-y-4">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <Heart className="text-rose-500 fill-rose-500" size={18} />
                          <h3 className="text-sm font-display font-bold">Saved Favorite Cities</h3>
                        </div>
                        <span className="text-[10px] font-mono text-slate-400">{favorites.length} Locations</span>
                      </div>

                      {favorites.length === 0 ? (
                        <div className="py-12 text-center text-slate-500">
                          <Heart size={28} className="mx-auto mb-2 text-slate-600" />
                          <p className="text-xs">No favorite cities saved. Log in and pin your favorite cities!</p>
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                          {favorites.map((fav) => (
                            <div 
                              key={fav.id} 
                              className="p-4 bg-slate-950/10 dark:bg-slate-900/30 rounded-2xl border border-slate-200/5 flex items-center justify-between hover:bg-slate-900/40 transition-colors"
                            >
                              <button 
                                onClick={() => fetchWeatherByCoords(fav.lat, fav.lon, fav.cityName)}
                                className="text-left font-sans flex items-center gap-2"
                              >
                                <MapPin size={14} className="text-blue-500 shrink-0" />
                                <div>
                                  <p className="text-sm font-bold">{fav.cityName}</p>
                                  <p className="text-[10px] text-slate-400 font-mono">Coords: {fav.lat.toFixed(2)}, {fav.lon.toFixed(2)}</p>
                                </div>
                              </button>
                              <button
                                onClick={async () => {
                                  try {
                                    await api.delete(`/api/favorites/${fav.id}`);
                                    refreshFavorites();
                                  } catch (err) {
                                    console.error(err);
                                  }
                                }}
                                className="p-2 text-rose-500 hover:bg-rose-500/15 rounded-xl transition-colors shrink-0"
                                title="Remove location"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* DB history Logs or recent local searches */}
                    <div className="p-6 rounded-3xl bg-white/20 dark:bg-slate-950/40 border border-slate-200/10 shadow-2xl glass-card space-y-4">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <History className="text-teal-400" size={18} />
                          <h3 className="text-sm font-display font-bold">Search History Logs</h3>
                        </div>
                        <button 
                          onClick={async () => {
                            if (user) {
                              try {
                                await api.delete('/api/history');
                                refreshHistory();
                              } catch (err) {
                                console.error(err);
                              }
                            } else {
                              clearRecentSearches();
                            }
                          }}
                          className="text-[10px] font-mono text-slate-400 hover:text-rose-400 flex items-center gap-1 transition-all"
                        >
                          <Trash2 size={12} />
                          Clear Logs
                        </button>
                      </div>

                      {user ? (
                        historyLogs.length === 0 ? (
                          <div className="py-12 text-center text-slate-500">
                            <History size={28} className="mx-auto mb-2 text-slate-600" />
                            <p className="text-xs">Your search history is empty.</p>
                          </div>
                        ) : (
                          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                            {historyLogs.map((log) => (
                              <button 
                                key={log.id}
                                onClick={() => fetchWeatherByCoords(log.lat, log.lon, log.cityName)}
                                className="w-full p-3 bg-slate-950/10 dark:bg-slate-900/30 rounded-2xl border border-slate-200/5 text-left flex items-center justify-between hover:bg-slate-900/40 transition-colors"
                              >
                                <div className="flex items-center gap-2">
                                  <MapPin size={14} className="text-teal-400 shrink-0" />
                                  <div>
                                    <p className="text-sm font-semibold">{log.cityName}</p>
                                    <p className="text-[9px] text-slate-500 font-mono">
                                      {new Date(log.fetchedAt).toLocaleString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <span className="text-sm font-mono font-bold text-teal-400">{log.temp}°C</span>
                                  <p className="text-[9px] text-slate-400">{log.conditionText}</p>
                                </div>
                              </button>
                            ))}
                          </div>
                        )
                      ) : (
                        recentSearches.length === 0 ? (
                          <div className="py-12 text-center text-slate-500">
                            <History size={28} className="mx-auto mb-2 text-slate-600" />
                            <p className="text-xs">No local search history recorded.</p>
                          </div>
                        ) : (
                          <div className="space-y-1.5 max-h-96 overflow-y-auto">
                            {recentSearches.map((city, i) => (
                              <button
                                key={i}
                                onClick={() => fetchWeatherByQuery(city)}
                                className="w-full p-3 bg-slate-950/10 dark:bg-slate-900/30 rounded-2xl border border-slate-200/5 text-left hover:bg-slate-900/40 transition-all flex items-center gap-2 text-xs font-semibold"
                              >
                                <MapPin size={12} className="text-teal-400 shrink-0" />
                                {city}
                              </button>
                            ))}
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'compare' && (
                  <div className="space-y-6">
                    {/* Compare Cities search block */}
                    <div className="p-6 rounded-3xl bg-white/20 dark:bg-slate-950/40 border border-slate-200/10 shadow-2xl glass-card space-y-4">
                      <div className="text-left">
                        <h2 className="text-xl font-display font-bold">Dynamic Weather Comparison Center</h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Compare metrics and hourly forecasts of two locations side-by-side.</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* City A: Static or default */}
                        <div className="p-4 rounded-2xl bg-slate-900/10 dark:bg-slate-900/30 border border-slate-200/5 space-y-1 text-left">
                          <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Primary Location (City A)</span>
                          <p className="text-base font-bold text-blue-500">{weatherData.location.name}</p>
                          <p className="text-xs text-slate-400">Current Temperature: <span className="font-mono font-bold text-slate-200">{weatherData.current.temp}°C</span> ({weatherData.current.conditionText})</p>
                        </div>

                        {/* City B: Lookup */}
                        <div className="p-4 rounded-2xl bg-slate-900/10 dark:bg-slate-900/30 border border-slate-200/5 space-y-2 relative text-left">
                          <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Compare With (City B)</span>
                          
                          <div className="relative">
                            <input
                              type="text"
                              value={compareQuery}
                              onChange={(e) => setCompareQuery(e.target.value)}
                              placeholder="Type City B Name..."
                              className="w-full px-4 py-2 bg-slate-950/40 border border-slate-200/10 rounded-xl text-slate-100 text-xs placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                            {loadingCompare && (
                              <div className="absolute right-3 top-2.5 w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                            )}
                          </div>

                          {showCompareDropdown && compareResults.length > 0 && (
                            <ul className="absolute left-0 right-0 top-full mt-2 bg-slate-900 border border-slate-200/10 rounded-2xl shadow-2xl max-h-48 overflow-y-auto overflow-x-hidden z-30">
                              {compareResults.map((city, idx) => (
                                <li key={idx}>
                                  <button
                                    onClick={() => {
                                      fetchCompareCity(city.lat, city.lon, city.name, city.state, city.country);
                                      setCompareQuery('');
                                      setShowCompareDropdown(false);
                                    }}
                                    className="w-full text-left px-4 py-2.5 hover:bg-slate-800 text-slate-200 text-xs flex items-center justify-between border-b border-slate-800 transition-colors"
                                  >
                                    <span className="font-semibold">{city.name} ({city.country})</span>
                                    {city.state && <span className="text-[10px] text-slate-500">{city.state}</span>}
                                  </button>
                                </li>
                              ))}
                            </ul>
                          )}

                          {compareDataB ? (
                            <p className="text-xs text-slate-400">Selected: <span className="font-bold text-emerald-400">{compareDataB.location.name}</span>, temp: <span className="font-mono font-bold text-slate-200">{compareDataB.current.temp}°C</span></p>
                          ) : (
                            <p className="text-[10px] text-slate-500">Lookup a city above to generate side-by-side comparative graphs</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {compareDataB ? (
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Overlaid Recharts Forecast line chart */}
                        <div className="lg:col-span-3 p-6 rounded-3xl bg-white/20 dark:bg-slate-950/40 border border-slate-200/10 shadow-2xl glass-card space-y-4">
                          <h3 className="text-sm font-display font-bold text-left">24-Hour Temperature Curve Comparison</h3>
                          <div className="h-56 w-full font-mono text-[11px]">
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart
                                data={weatherData.hourly.slice(0, 12).map((h, i) => ({
                                  time: h.time,
                                  [weatherData.location.name]: h.temp,
                                  [compareDataB.location.name]: compareDataB.hourly[i]?.temp || 0
                                }))}
                                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                              >
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.08)" />
                                <XAxis dataKey="time" stroke="rgba(148, 163, 184, 0.4)" />
                                <YAxis stroke="rgba(148, 163, 184, 0.4)" />
                                <Tooltip
                                  contentStyle={{
                                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    borderRadius: '0.75rem',
                                    color: '#fff'
                                  }}
                                />
                                <Line type="monotone" dataKey={weatherData.location.name} stroke="#3b82f6" strokeWidth={3} dot={{ r: 3 }} />
                                <Line type="monotone" dataKey={compareDataB.location.name} stroke="#f97316" strokeWidth={3} dot={{ r: 3 }} />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        </div>

                        {/* Comparative Matrix table */}
                        <div className="lg:col-span-2 p-6 rounded-3xl bg-white/20 dark:bg-slate-950/40 border border-slate-200/10 shadow-2xl glass-card space-y-4">
                          <h3 className="text-sm font-display font-bold text-left">Comparative Meteorological Matrix</h3>
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                              <thead>
                                <tr className="border-b border-slate-200/10 text-slate-400">
                                  <th className="pb-3 font-semibold">Parameter</th>
                                  <th className="pb-3 font-semibold text-blue-400">{weatherData.location.name}</th>
                                  <th className="pb-3 font-semibold text-orange-400">{compareDataB.location.name}</th>
                                  <th className="pb-3 font-semibold">Variance Delta</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-200/5 font-medium text-left">
                                <tr className="hover:bg-slate-900/10">
                                  <td className="py-3 text-slate-400">Current Temperature</td>
                                  <td className="py-3 font-mono font-bold">{weatherData.current.temp}°C</td>
                                  <td className="py-3 font-mono font-bold text-orange-400">{compareDataB.current.temp}°C</td>
                                  <td className="py-3 font-mono">
                                    {weatherData.current.temp - compareDataB.current.temp > 0 
                                      ? `+${(weatherData.current.temp - compareDataB.current.temp).toFixed(1)}°C` 
                                      : `${(weatherData.current.temp - compareDataB.current.temp).toFixed(1)}°C`}
                                  </td>
                                </tr>
                                <tr className="hover:bg-slate-900/10">
                                  <td className="py-3 text-slate-400">Air Quality (US AQI)</td>
                                  <td className="py-3 font-mono">
                                    <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 text-[10px] font-bold">
                                      {weatherData.aqi.aqiUS} ({weatherData.aqi.status})
                                    </span>
                                  </td>
                                  <td className="py-3 font-mono">
                                    <span className="px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 text-[10px] font-bold">
                                      {compareDataB.aqi.aqiUS} ({compareDataB.aqi.status})
                                    </span>
                                  </td>
                                  <td className="py-3 font-mono">{(weatherData.aqi.aqiUS - compareDataB.aqi.aqiUS).toFixed(0)} AQI</td>
                                </tr>
                                <tr className="hover:bg-slate-900/10">
                                  <td className="py-3 text-slate-400">Relative Humidity</td>
                                  <td className="py-3 font-mono">{weatherData.current.humidity}%</td>
                                  <td className="py-3 font-mono text-orange-400">{compareDataB.current.humidity}%</td>
                                  <td className="py-3 font-mono">{(weatherData.current.humidity - compareDataB.current.humidity).toFixed(0)}%</td>
                                </tr>
                                <tr className="hover:bg-slate-900/10">
                                  <td className="py-3 text-slate-400">Wind Velocity</td>
                                  <td className="py-3 font-mono">{weatherData.current.windSpeed} km/h</td>
                                  <td className="py-3 font-mono text-orange-400">{compareDataB.current.windSpeed} km/h</td>
                                  <td className="py-3 font-mono">{(weatherData.current.windSpeed - compareDataB.current.windSpeed).toFixed(1)} km/h</td>
                                </tr>
                                <tr className="hover:bg-slate-900/10">
                                  <td className="py-3 text-slate-400">Precipitation Today</td>
                                  <td className="py-3 font-mono">{weatherData.current.precipitation} mm</td>
                                  <td className="py-3 font-mono text-orange-400">{compareDataB.current.precipitation} mm</td>
                                  <td className="py-3 font-mono">{(weatherData.current.precipitation - compareDataB.current.precipitation).toFixed(1)} mm</td>
                                </tr>
                                <tr className="hover:bg-slate-900/10">
                                  <td className="py-3 text-slate-400">Farming Suitability</td>
                                  <td className="py-3 text-teal-400 font-bold">{weatherData.ai.agriculture.farmingSuitability}</td>
                                  <td className="py-3 text-orange-400 font-bold">{compareDataB.ai.agriculture.farmingSuitability}</td>
                                  <td className="py-3 text-slate-500">-</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* Travel or travel planning comparisons */}
                        <div className="lg:col-span-1 p-6 rounded-3xl bg-white/20 dark:bg-slate-950/40 border border-slate-200/10 shadow-2xl glass-card space-y-4">
                          <h3 className="text-sm font-display font-bold text-left">Aesthetic Comparative Summary</h3>
                          <div className="space-y-3 text-xs leading-relaxed text-slate-300 text-left">
                            <div className="p-4 rounded-2xl bg-blue-600/5 border border-blue-500/10 space-y-1">
                              <span className="font-bold text-blue-400">Microclimate Delta</span>
                              <p>
                                {weatherData.current.temp > compareDataB.current.temp 
                                  ? `${weatherData.location.name} is currently experiencing warmer conditions. Clothing should be considerably lighter here than in ${compareDataB.location.name}.`
                                  : `${compareDataB.location.name} has the warmer temperature advantage. Carry an extra warm layer if you are travelling back to ${weatherData.location.name}.`}
                              </p>
                            </div>

                            <div className="p-4 rounded-2xl bg-orange-600/5 border border-orange-500/10 space-y-1">
                              <span className="font-bold text-orange-400">Air Quality Insights</span>
                              <p>
                                {weatherData.aqi.aqiUS < compareDataB.aqi.aqiUS 
                                  ? `Respiratory environment is healthier in ${weatherData.location.name} (AQI: ${weatherData.aqi.aqiUS}) than in ${compareDataB.location.name} (AQI: ${compareDataB.aqi.aqiUS}).`
                                  : `Outdoor physical conditions are cleaner in ${compareDataB.location.name} (AQI: ${compareDataB.aqi.aqiUS}) than in ${weatherData.location.name} (AQI: ${weatherData.aqi.aqiUS}).`}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-12 text-center rounded-3xl bg-slate-950/20 border border-slate-200/5 space-y-2">
                        <ArrowLeftRight className="mx-auto text-slate-500 w-10 h-10 animate-pulse" />
                        <h4 className="text-sm font-bold text-slate-300">No Secondary City Selected</h4>
                        <p className="text-xs text-slate-500">Lookup and select a city in the compare card above to overlay their metrological forecasts.</p>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'alerts' && (
                  <div className="space-y-6">
                    {/* Rules Panel Header */}
                    <div className="p-6 rounded-3xl bg-white/20 dark:bg-slate-950/40 border border-slate-200/10 shadow-2xl glass-card flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="text-left">
                        <h2 className="text-xl font-display font-bold">Severe Weather Trigger & Rules Engine</h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Configure conditional logic triggers to alert on severe environmental microclimates.</p>
                      </div>

                      {/* Web Audio API Sound Generator */}
                      <button
                        onClick={() => {
                          try {
                            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
                            const osc = ctx.createOscillator();
                            const gain = ctx.createGain();
                            osc.type = 'sine';
                            osc.frequency.setValueAtTime(880, ctx.currentTime); // high warning pitch
                            osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.3);
                            gain.gain.setValueAtTime(0.08, ctx.currentTime);
                            gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4);
                            osc.connect(gain);
                            gain.connect(ctx.destination);
                            osc.start();
                            osc.stop(ctx.currentTime + 0.4);
                          } catch (err) {
                            console.error('Audio synthesizer blocked or unsupported:', err);
                          }
                        }}
                        className="flex items-center gap-1.5 px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-2xl text-xs font-bold transition-all active:scale-95 shadow-md shadow-rose-500/10 shrink-0 self-start md:self-auto"
                      >
                        <BellRing size={14} className="animate-swing" />
                        Test Siren Synthesizer
                      </button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* Left: Current Active Alerts */}
                      <div className="lg:col-span-1 p-6 rounded-3xl bg-white/20 dark:bg-slate-950/40 border border-slate-200/10 shadow-2xl glass-card space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-200/5 pb-2">
                          <h3 className="text-sm font-display font-bold text-slate-200">Rules Diagnostics</h3>
                          <span className="text-[10px] font-mono bg-blue-500/10 text-sky-400 px-2 py-0.5 rounded-full uppercase font-bold">
                            Live Check
                          </span>
                        </div>

                        <div className="p-4 rounded-2xl bg-slate-950/20 border border-slate-800 space-y-2 text-left">
                          <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider leading-none">Diagnostic target</p>
                          <p className="text-xs font-bold text-slate-200">{weatherData.location.name} (temp: {weatherData.current.temp}°C, AQI: {weatherData.aqi.aqiUS})</p>
                        </div>

                        <div className="space-y-2">
                          {checkTriggeredAlerts(weatherData).length === 0 ? (
                            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2.5 text-left">
                              <Check size={16} className="shrink-0 text-emerald-500" />
                              <div>
                                <p className="font-bold text-emerald-500">Ambient Conditions Secure</p>
                                <p className="text-[10px] text-slate-400 mt-0.5">No thresholds exceeded under active configured rules.</p>
                              </div>
                            </div>
                          ) : (
                            checkTriggeredAlerts(weatherData).map((trigger: any, i: number) => (
                              <div key={i} className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs space-y-1.5 animate-pulse text-left">
                                <div className="flex items-center gap-2">
                                  <AlertTriangle size={14} className="shrink-0 text-rose-500" />
                                  <p className="font-bold text-rose-500">TRIGGERED: {trigger.label}</p>
                                </div>
                                <p className="text-[10px] text-slate-400">
                                  Current metric value is <span className="text-rose-400 font-mono font-bold">{trigger.currentValue}</span>. Immediate safety precautions or monitoring is suggested.
                                </p>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      {/* Right: Trigger Builder and Active Rules list */}
                      <div className="lg:col-span-2 space-y-6">
                        {/* Define Trigger */}
                        <div className="p-6 rounded-3xl bg-white/20 dark:bg-slate-950/40 border border-slate-200/10 shadow-2xl glass-card space-y-4">
                          <h3 className="text-sm font-display font-bold text-left">Deploy Custom Meteorological Trigger</h3>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="space-y-1 text-left">
                              <label className="text-[10px] uppercase font-bold text-slate-400">Target Metric</label>
                              <select
                                value={newRuleMetric}
                                onChange={(e) => setNewRuleMetric(e.target.value)}
                                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none"
                              >
                                <option value="temp">Temperature (°C)</option>
                                <option value="aqi">Air Quality (US AQI)</option>
                                <option value="wind">Wind Velocity (km/h)</option>
                                <option value="precip">Rainfall (mm)</option>
                              </select>
                            </div>

                            <div className="space-y-1 text-left">
                              <label className="text-[10px] uppercase font-bold text-slate-400">Evaluation operator</label>
                              <select
                                value={newRuleOperator}
                                onChange={(e) => setNewRuleOperator(e.target.value)}
                                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none"
                              >
                                <option value="gt">Is Greater Than (&gt;)</option>
                                <option value="lt">Is Less Than (&lt;)</option>
                              </select>
                            </div>

                            <div className="space-y-1 text-left">
                              <label className="text-[10px] uppercase font-bold text-slate-400">Condition Threshold</label>
                              <input
                                type="number"
                                value={newRuleValue}
                                onChange={(e) => setNewRuleValue(parseFloat(e.target.value) || 0)}
                                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono text-slate-200 focus:outline-none"
                              />
                            </div>
                          </div>

                          <button
                            onClick={() => {
                              const metricNames: any = { temp: 'Temp', aqi: 'AQI', wind: 'Wind Speed', precip: 'Rainfall' };
                              const operatorNames: any = { gt: '>', lt: '<' };
                              const units: any = { temp: '°C', aqi: '', wind: ' km/h', precip: ' mm' };
                              const label = `${metricNames[newRuleMetric]} Alert (${operatorNames[newRuleOperator]}${newRuleValue}${units[newRuleMetric]})`;
                              const newRule = {
                                id: Math.random().toString(36).substring(2, 9),
                                metric: newRuleMetric,
                                operator: newRuleOperator,
                                value: newRuleValue,
                                label,
                                active: true
                              };
                              setAlertRules(prev => [...prev, newRule]);
                            }}
                            className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all active:scale-95 shadow-md shadow-blue-500/10"
                          >
                            Save and Activate Rule Trigger
                          </button>
                        </div>

                        {/* Trigger list */}
                        <div className="p-6 rounded-3xl bg-white/20 dark:bg-slate-950/40 border border-slate-200/10 shadow-2xl glass-card space-y-4">
                          <h3 className="text-sm font-display font-bold text-left">Active Configuration Matrix</h3>
                          <div className="space-y-2">
                            {alertRules.map((rule) => (
                              <div key={rule.id} className="p-3 bg-slate-950/10 dark:bg-slate-900/30 rounded-2xl border border-slate-200/5 flex items-center justify-between text-xs">
                                <div className="flex items-center gap-3">
                                  <Sliders size={14} className="text-blue-500 shrink-0" />
                                  <span className="font-bold text-slate-200">{rule.label}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                  {/* Toggle button */}
                                  <button
                                    onClick={() => {
                                      setAlertRules(prev => prev.map(r => r.id === rule.id ? { ...r, active: !r.active } : r));
                                    }}
                                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-all ${
                                      rule.active 
                                        ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                                        : 'bg-slate-500/10 text-slate-500 border border-slate-500/10'
                                    }`}
                                  >
                                    {rule.active ? 'Armed' : 'Disabled'}
                                  </button>
                                  {/* Delete */}
                                  <button
                                    onClick={() => {
                                      setAlertRules(prev => prev.filter(r => r.id !== rule.id));
                                    }}
                                    className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'ai-chat' && (
                  <WeatherAIChatbot weatherData={weatherData} />
                )}

              </motion.div>
            </AnimatePresence>
          </main>
        )}
      </div>

      {/* ==========================================
          AUTHENTICATION DIALOG MODAL
          ========================================== */}
      <AnimatePresence>
        {showAuthModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAuthModal(false)}
              className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-md p-6 bg-slate-900 border border-slate-200/10 rounded-3xl shadow-2xl space-y-4 overflow-hidden z-10 glass-card"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-display font-bold text-slate-100">
                  {authMode === 'login' ? 'Access WeatherSphere Portal' : 'Create New Account'}
                </h3>
                <button
                  onClick={() => setShowAuthModal(false)}
                  className="p-1 text-slate-400 hover:text-slate-100 text-sm"
                >
                  ✕
                </button>
              </div>

              {authError && (
                <div className="flex items-center gap-2 p-3 bg-rose-500/15 border border-rose-500/30 text-rose-400 rounded-xl text-xs">
                  <AlertTriangle size={14} className="shrink-0" />
                  <span>{authError}</span>
                </div>
              )}

              <form onSubmit={handleAuthSubmit} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Email Address</label>
                  <input
                    type="email"
                    required
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    placeholder="user@example.com"
                    className="w-full px-4 py-2.5 bg-slate-950/40 border border-slate-200/10 rounded-xl text-slate-100 text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Password</label>
                  <input
                    type="password"
                    required
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full px-4 py-2.5 bg-slate-950/40 border border-slate-200/10 rounded-xl text-slate-100 text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-blue-500/10 mt-2"
                >
                  {authMode === 'login' ? 'Verify and Enter' : 'Submit Registration'}
                </button>
              </form>

              <div className="text-center pt-3 border-t border-slate-200/5 text-xs text-slate-400">
                {authMode === 'login' ? (
                  <p>
                    Don't have an account?{' '}
                    <button
                      onClick={() => { setAuthMode('register'); clearAuthError(); }}
                      className="text-blue-400 hover:underline font-bold"
                    >
                      Register here
                    </button>
                  </p>
                ) : (
                  <p>
                    Already registered?{' '}
                    <button
                      onClick={() => { setAuthMode('login'); clearAuthError(); }}
                      className="text-blue-400 hover:underline font-bold"
                    >
                      Login here
                    </button>
                  </p>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AIChatbot currentWeather={weatherData} />
    </div>
  );
}
