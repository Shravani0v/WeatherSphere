import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface WeatherAnimationsProps {
  conditionCode: number;
  isDay?: boolean;
  windSpeed?: number; // Optional, can fall back to standard weather conditions
  temp?: number;       // Optional temperature in Celsius
}

// ----------------------------------------------------
// PHOTOGRAPHY-INSPIRED REAL-WORLD ASSETS MAP
// Curation of high-quality, professional photography
// ----------------------------------------------------
const PHOTOGRAPHY_BACKGROUNDS: Record<string, Record<string, string>> = {
  clear: {
    sunrise: 'https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?auto=format&fit=crop&w=1920&q=80', // Sunrise meadow
    morning: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1920&q=80', // Bright mountain forest
    afternoon: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1920&q=80', // Yosemite valley daylight
    sunset: 'https://images.unsplash.com/photo-1472214222541-d510753a4707?auto=format&fit=crop&w=1920&q=80', // Golden hour hills
    night: 'https://images.unsplash.com/photo-1506318137071-a8e063b4bec0?auto=format&fit=crop&w=1920&q=80'   // Starry dark clear sky
  },
  partly_cloudy: {
    sunrise: 'https://images.unsplash.com/photo-1495107334309-fcf20504a5ab?auto=format&fit=crop&w=1920&q=80', // Soft morning clouds
    morning: 'https://images.unsplash.com/photo-1513002749550-c59d786b8e6c?auto=format&fit=crop&w=1920&q=80', // Soft blue sky with white clouds
    afternoon: 'https://images.unsplash.com/photo-1517685352821-92cf88aee5a5?auto=format&fit=crop&w=1920&q=80', // Fluffy daytime clouds
    sunset: 'https://images.unsplash.com/photo-1477346611705-65d1883cee1e?auto=format&fit=crop&w=1920&q=80', // Colorful twilight clouds
    night: 'https://images.unsplash.com/photo-1532978191173-7859d0554884?auto=format&fit=crop&w=1920&q=80'   // Moonlit clouds at night
  },
  overcast: {
    sunrise: 'https://images.unsplash.com/photo-1510784722466-f2aa9c52ffa6?auto=format&fit=crop&w=1920&q=80', // Overcast sunrise
    morning: 'https://images.unsplash.com/photo-1500491460312-750eb06f0f43?auto=format&fit=crop&w=1920&q=80', // Misty overcast morning road
    afternoon: 'https://images.unsplash.com/photo-1534274988757-a28bf1a57c17?auto=format&fit=crop&w=1920&q=80', // Gloomy overcast daylight
    sunset: 'https://images.unsplash.com/photo-1442458370899-ae20e3ad7c70?auto=format&fit=crop&w=1920&q=80', // Heavy sunset clouds
    night: 'https://images.unsplash.com/photo-1509114397022-ed747cca3f65?auto=format&fit=crop&w=1920&q=80'   // Moody dark city night overcast
  },
  rainy: {
    sunrise: 'https://images.unsplash.com/photo-1486016006115-74a41448aea2?auto=format&fit=crop&w=1920&q=80', // Rainy wet dawn
    morning: 'https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?auto=format&fit=crop&w=1920&q=80', // Morning rain on glass
    afternoon: 'https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?auto=format&fit=crop&w=1920&q=80', // Continuous rainy window daylight
    sunset: 'https://images.unsplash.com/photo-1534274988757-a28bf1a57c17?auto=format&fit=crop&w=1920&q=80', // Wet glowing city sunset
    night: 'https://images.unsplash.com/photo-1508873696983-2df519f0397e?auto=format&fit=crop&w=1920&q=80'   // Puddles reflecting night streetlights
  },
  stormy: {
    sunrise: 'https://images.unsplash.com/photo-1492011221367-f47e3ccd77a0?auto=format&fit=crop&w=1920&q=80', // Dark morning storm clouds
    morning: 'https://images.unsplash.com/photo-1492011221367-f47e3ccd77a0?auto=format&fit=crop&w=1920&q=80', // Menacing storm daylight
    afternoon: 'https://images.unsplash.com/photo-1605721911519-3dfeb3be25e7?auto=format&fit=crop&w=1920&q=80', // Severe thunderstorm and lightning
    sunset: 'https://images.unsplash.com/photo-1534274988757-a28bf1a57c17?auto=format&fit=crop&w=1920&q=80', // Violent stormy sunset
    night: 'https://images.unsplash.com/photo-1472145246862-b24cf25c4a36?auto=format&fit=crop&w=1920&q=80'   // Spectacular dark night lightning
  },
  snowy: {
    sunrise: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=1920&q=80', // Winter dawn landscape
    morning: 'https://images.unsplash.com/photo-1485594050903-8e8ee7b071a8?auto=format&fit=crop&w=1920&q=80', // Fresh morning snow forest
    afternoon: 'https://images.unsplash.com/photo-1491002052546-bf38f186af56?auto=format&fit=crop&w=1920&q=80', // Peaceful snowy trees in daylight
    sunset: 'https://images.unsplash.com/photo-1517299321926-311d204753f1?auto=format&fit=crop&w=1920&q=80', // Golden winter sunset
    night: 'https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?auto=format&fit=crop&w=1920&q=80'   // Cozy snow village streetlights
  },
  foggy: {
    sunrise: 'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?auto=format&fit=crop&w=1920&q=80', // Foggy forest sunrise
    morning: 'https://images.unsplash.com/photo-1494548162494-384bba4ab999?auto=format&fit=crop&w=1920&q=80', // Rising morning fog
    afternoon: 'https://images.unsplash.com/photo-1507608869274-d3177c8bb4c7?auto=format&fit=crop&w=1920&q=80', // Ethereal deep landscape fog
    sunset: 'https://images.unsplash.com/photo-1470240731273-7821a6eeb6bd?auto=format&fit=crop&w=1920&q=80', // Foggy golden sunset
    night: 'https://images.unsplash.com/photo-1485081661879-033612b7e1fc?auto=format&fit=crop&w=1920&q=80'   // Atmospheric fog in city streetlights
  },
  windy: {
    sunrise: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?auto=format&fit=crop&w=1920&q=80', // Windy dawn meadows
    morning: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?auto=format&fit=crop&w=1920&q=80', // Windy grass field morning
    afternoon: 'https://images.unsplash.com/photo-1461088945293-0c17689e48ac?auto=format&fit=crop&w=1920&q=80', // Swaying tree branches and clouds
    sunset: 'https://images.unsplash.com/photo-1495107334309-fcf20504a5ab?auto=format&fit=crop&w=1920&q=80', // Windy dust sunset
    night: 'https://images.unsplash.com/photo-1506318137071-a8e063b4bec0?auto=format&fit=crop&w=1920&q=80'   // Dark night howling wind branches
  }
};

export const WeatherAnimations: React.FC<WeatherAnimationsProps> = ({
  conditionCode,
  isDay = true,
  windSpeed = 12,
  temp
}) => {
  // Determine current hour to establish time-based transitions
  const currentHour = useMemo(() => new Date().getHours(), []);

  // Determine season based on month of the year
  const season = useMemo(() => {
    const month = new Date().getMonth();
    if ([11, 0, 1].includes(month)) return 'winter';
    if ([2, 3, 4].includes(month)) return 'spring';
    if ([5, 6, 7].includes(month)) return 'summer';
    return 'autumn';
  }, []);

  // Categorize condition code to weather types
  const weatherType = useMemo((): 'clear' | 'partly_cloudy' | 'overcast' | 'rainy' | 'stormy' | 'snowy' | 'foggy' | 'windy' => {
    // If temperature is cold and there is rain/cloudiness/snow, render as snowy
    if (temp !== undefined && temp <= 2 && [3, 51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(conditionCode)) {
      return 'snowy';
    }
    if (windSpeed > 25) return 'windy';
    if ([0].includes(conditionCode)) return 'clear';
    if ([1, 2].includes(conditionCode)) return 'partly_cloudy';
    if ([3].includes(conditionCode)) return 'overcast';
    if ([45, 48].includes(conditionCode)) return 'foggy';
    if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(conditionCode)) return 'rainy';
    if ([71, 73, 75, 77, 85, 86].includes(conditionCode)) return 'snowy';
    if ([95, 96, 99].includes(conditionCode)) return 'stormy';
    return 'clear';
  }, [conditionCode, windSpeed, temp]);

  // Determine Sunrise, Morning, Afternoon, Sunset or Night
  const timeOfDay = useMemo((): 'sunrise' | 'morning' | 'afternoon' | 'sunset' | 'night' => {
    if (!isDay) return 'night';
    if (currentHour >= 5 && currentHour < 7) return 'sunrise';
    if (currentHour >= 7 && currentHour < 12) return 'morning';
    if (currentHour >= 12 && currentHour < 17) return 'afternoon';
    if (currentHour >= 17 && currentHour < 19) return 'sunset';
    return 'morning';
  }, [isDay, currentHour]);

  // Retrieve current photography URL
  const backgroundUrl = useMemo(() => {
    const weatherSet = PHOTOGRAPHY_BACKGROUNDS[weatherType] || PHOTOGRAPHY_BACKGROUNDS.clear;
    return weatherSet[timeOfDay] || weatherSet.morning;
  }, [weatherType, timeOfDay]);

  // Status flags for sub-components rendering
  const isRain = weatherType === 'rainy' || weatherType === 'stormy';
  const isSnow = weatherType === 'snowy';
  const isStorm = weatherType === 'stormy';
  const isFog = weatherType === 'foggy';
  const isCloudy = weatherType === 'partly_cloudy' || weatherType === 'overcast';
  const isWindy = weatherType === 'windy' || windSpeed > 20;
  const isClear = weatherType === 'clear';

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 select-none">
      {/* 1. Dynamic cross-fading Photographic Background Image */}
      <AnimatePresence mode="popLayout">
        <motion.div
          key={backgroundUrl}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2, ease: 'easeInOut' }}
          className="absolute inset-0 bg-cover bg-center filter brightness-90 dark:brightness-[0.45] saturate-[0.85] contrast-95 transition-all duration-1000"
          style={{ backgroundImage: `url(${backgroundUrl})` }}
        />
      </AnimatePresence>

      {/* 2. Soft sky ambient overlay to blend assets and optimize readability */}
      <div 
        className={`absolute inset-0 transition-all duration-1000 mix-blend-multiply opacity-50 ${
          timeOfDay === 'sunrise' 
            ? 'bg-gradient-to-tr from-orange-900/40 via-pink-900/20 to-sky-900/30'
            : timeOfDay === 'sunset'
            ? 'bg-gradient-to-tr from-purple-950/40 via-red-900/20 to-slate-900/30'
            : timeOfDay === 'night'
            ? 'bg-gradient-to-b from-slate-950 via-indigo-950/40 to-slate-950'
            : 'bg-gradient-to-b from-sky-900/10 via-transparent to-slate-950/20'
        }`}
      />

      {/* Extreme dark mask for night overlay to ensure high contrast */}
      {timeOfDay === 'night' && (
        <div className="absolute inset-0 bg-slate-950/20 mix-blend-color-burn" />
      )}

      {/* 3. ATMOSPHERIC ELEMENTAL ANIMATIONS */}

      {/* Clear Sky: rotating warm sun rays / lens flare */}
      {isClear && isDay && <SunRays />}

      {/* Clouds Drift overlay */}
      {isCloudy && <MovingClouds speedMultiplier={weatherType === 'overcast' ? 0.7 : 1.2} />}

      {/* Rain drop streaks */}
      {isRain && <RainEffect intensity={isStorm ? 10 : 6} windSpeed={windSpeed} />}

      {/* Concentric puddle water ripple reflections */}
      {isRain && <WaterRipples />}

      {/* Snowy gentle falling flakes */}
      {isSnow && <SnowEffect intensity={8} windSpeed={windSpeed} />}

      {/* Fog horizontal backdrop bands */}
      {isFog && <FogOverlay isDay={isDay} />}

      {/* Windy forest: Swaying Pine trees / foliage at the base */}
      <SwayingTrees windSpeed={windSpeed} />

      {/* Falling Seasonal Leaves/Petals */}
      <LeafEffect season={season} windSpeed={windSpeed} />

      {/* Thunderstorm sudden lightning flash trigger */}
      {isStorm && <LightningFlash />}

      {/* Style injection for hardware-accelerated animations */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes rain-fall {
          0% { transform: translateY(-100px); opacity: 0; }
          10% { opacity: 0.8; }
          90% { opacity: 0.8; }
          100% { transform: translateY(115vh); opacity: 0; }
        }
        @keyframes snow-fall {
          0% { transform: translateY(-50px) translateX(0) rotate(0deg); opacity: 0; }
          10% { opacity: 0.9; }
          90% { opacity: 0.9; }
          100% { transform: translateY(115vh) translateX(var(--drift-x)) rotate(360deg); opacity: 0; }
        }
        @keyframes leaf-fall {
          0% { transform: translateY(-30px) translateX(0) rotate(var(--start-rot)); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(115vh) translateX(var(--drift-x-leaf)) rotate(calc(var(--start-rot) + 540deg)); opacity: 0; }
        }
        @keyframes ripple {
          0% { transform: scale(0.2); opacity: 0; }
          15% { opacity: 0.45; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        .animate-ripple {
          animation: ripple 4s cubic-bezier(0.1, 0.8, 0.3, 1) infinite;
        }
        @keyframes cloud-drift {
          0% { transform: translateX(-120%); }
          100% { transform: translateX(110vw); }
        }
        .animate-cloud-drift {
          animation: cloud-drift linear infinite;
        }
        @keyframes sway-left {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(var(--sway-angle)); }
        }
        @keyframes sway-right {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(var(--sway-angle)); }
        }
        @keyframes fog-drift {
          0% { transform: translateX(-15%) translateY(0) scaleY(1); }
          50% { transform: translateX(15%) translateY(-5px) scaleY(1.05); }
          100% { transform: translateX(-15%) translateY(0) scaleY(1); }
        }
        .animate-fog-drift {
          animation: fog-drift 25s ease-in-out infinite alternate;
        }
        @keyframes lightning-trigger {
          0%, 94%, 96%, 98%, 100% { opacity: 0; }
          95% { opacity: 0.85; }
          97% { opacity: 0.4; }
        }
        .animate-lightning {
          animation: lightning-trigger 9s ease-in-out infinite;
        }
        @keyframes slow-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .animate-slow-spin {
          animation: slow-spin 90s linear infinite;
        }
      `}} />
    </div>
  );
};

// ====================================================
// SUB-COMPONENTS
// ====================================================

// 1. CLEAR SKY SUN RAYS
const SunRays: React.FC = () => {
  return (
    <div className="absolute top-0 right-0 w-[600px] h-[600px] pointer-events-none z-0 overflow-hidden opacity-25 mix-blend-screen">
      <div className="absolute top-[-50px] right-[-50px] w-[350px] h-[350px] bg-amber-100/40 rounded-full filter blur-[100px] animate-pulse" />
      <svg
        className="absolute top-[-100px] right-[-100px] w-[700px] h-[700px] animate-slow-spin"
        viewBox="0 0 200 200"
      >
        <g fill="rgba(254, 240, 138, 0.03)">
          <polygon points="100,100 120,0 130,100" />
          <polygon points="100,100 150,15 140,100" />
          <polygon points="100,100 180,50 150,100" />
          <polygon points="100,100 200,90 160,100" />
          <polygon points="100,100 190,130 150,100" />
          <polygon points="100,100 160,170 140,100" />
          <polygon points="100,100 110,200 100,160" />
          <polygon points="100,100 60,180 80,100" />
          <polygon points="100,100 10,140 70,100" />
          <polygon points="100,100 0,90 60,100" />
          <polygon points="100,100 20,40 70,100" />
          <polygon points="100,100 60,10 80,100" />
        </g>
      </svg>
    </div>
  );
};

// 2. DRIFTING CLOUDS OVERLAY
const MovingClouds: React.FC<{ speedMultiplier: number }> = ({ speedMultiplier }) => {
  return (
    <div className="absolute inset-x-0 top-12 h-80 pointer-events-none z-0 opacity-25">
      <svg
        className="absolute w-[450px] h-[160px] text-white/30 filter blur-md animate-cloud-drift"
        style={{
          top: '8%',
          animationDuration: `${50 / speedMultiplier}s`,
        }}
        viewBox="0 0 100 40"
      >
        <path d="M10 30 Q15 15 30 20 Q40 5 60 15 Q75 10 85 25 Q95 25 90 35 Z" fill="currentColor" />
      </svg>
      <svg
        className="absolute w-[380px] h-[140px] text-white/20 filter blur-sm animate-cloud-drift"
        style={{
          top: '32%',
          animationDuration: `${75 / speedMultiplier}s`,
          animationDelay: '12s',
        }}
        viewBox="0 0 100 40"
      >
        <path d="M10 30 Q20 10 40 18 Q55 5 70 20 Q85 15 90 30 Z" fill="currentColor" />
      </svg>
    </div>
  );
};

// 3. WATER RIPPLE EFFECTS (Puddles reflecting environment)
const WaterRipples: React.FC = () => {
  const [ripples, setRipples] = useState<{ id: number; left: string; bottom: string; delay: string; size: string }[]>([]);

  useEffect(() => {
    const items = Array.from({ length: 7 }).map((_, i) => ({
      id: i,
      left: `${8 + Math.random() * 84}%`,
      bottom: `${4 + Math.random() * 26}%`,
      delay: `${i * 0.7}s`,
      size: `${35 + Math.random() * 45}px`
    }));
    setRipples(items);
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none z-10">
      {ripples.map((ripple) => (
        <div
          key={ripple.id}
          className="absolute border border-white/20 rounded-full animate-ripple"
          style={{
            left: ripple.left,
            bottom: ripple.bottom,
            width: ripple.size,
            height: `calc(${ripple.size} * 0.38)`, // Elliptical distortion for 3D depth perception
            animationDelay: ripple.delay,
          }}
        />
      ))}
    </div>
  );
};

// 4. ANGLING RAIN STREAKS WITH WIND SLANT
const RainEffect: React.FC<{ intensity: number; windSpeed: number }> = ({ intensity, windSpeed }) => {
  const [drops, setDrops] = useState<{ id: number; left: string; top: string; scale: number; speed: string; delay: string }[]>([]);

  useEffect(() => {
    const count = Math.min(120, Math.round(intensity * 11));
    const items = Array.from({ length: count }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 115 - 8}%`, // Margin offset for lateral drift
      top: `${Math.random() * -25}%`,
      scale: 0.4 + Math.random() * 0.8,
      speed: `${0.5 + Math.random() * 0.6}s`,
      delay: `${Math.random() * 2.2}s`
    }));
    setDrops(items);
  }, [intensity]);

  // Wind speed defines slant skew angle
  const slantAngle = Math.min(24, Math.max(-24, windSpeed / 4));

  return (
    <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
      {drops.map((drop) => (
        <div
          key={drop.id}
          className="absolute bg-sky-200/40 rounded-full"
          style={{
            left: drop.left,
            top: drop.top,
            width: `${1.2 * drop.scale}px`,
            height: `${28 * drop.scale}px`,
            transform: `skewX(${slantAngle}deg)`,
            animation: `rain-fall ${drop.speed} linear infinite`,
            animationDelay: drop.delay,
          }}
        />
      ))}
    </div>
  );
};

// 5. SNOWFALL EFFECTS WITH DRIFT VARIATIONS
const SnowEffect: React.FC<{ intensity: number; windSpeed: number }> = ({ intensity, windSpeed }) => {
  const [flakes, setFlakes] = useState<{ id: number; left: string; top: string; scale: number; speed: string; delay: string; drift: string }[]>([]);

  useEffect(() => {
    const count = Math.min(75, Math.round(intensity * 9));
    const items = Array.from({ length: count }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * -12}%`,
      scale: 0.4 + Math.random() * 1.1,
      speed: `${4.5 + Math.random() * 5.5}s`,
      delay: `${Math.random() * 6}s`,
      drift: `${(Math.random() - 0.5) * 45}px`
    }));
    setFlakes(items);
  }, [intensity]);

  const windOffset = windSpeed / 3.5;

  return (
    <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
      {flakes.map((flake) => (
        <div
          key={flake.id}
          className="absolute bg-white/80 rounded-full filter blur-[0.4px]"
          style={{
            left: flake.left,
            top: flake.top,
            width: `${5 * flake.scale}px`,
            height: `${5 * flake.scale}px`,
            '--drift-x': `calc(${flake.drift} + ${windOffset}px)`,
            animation: `snow-fall ${flake.speed} linear infinite`,
            animationDelay: flake.delay,
          } as any}
        />
      ))}
    </div>
  );
};

// 6. SWAYING FOREST SILHOUETTES (Based on wind speed)
const SwayingTrees: React.FC<{ windSpeed: number }> = ({ windSpeed }) => {
  const isWindy = windSpeed > 20;
  const duration = isWindy ? '2.4s' : '5.2s';
  const angle = isWindy ? '6.5deg' : '1.8deg';

  return (
    <div className="absolute bottom-0 left-0 right-0 h-36 pointer-events-none z-10 flex items-end justify-between px-12 opacity-30 mix-blend-multiply dark:mix-blend-overlay">
      <svg
        className="w-16 h-28 origin-bottom transition-transform duration-500 text-slate-800 dark:text-slate-400"
        style={{
          animation: `sway-left ${duration} ease-in-out infinite alternate`,
          '--sway-angle': angle,
        } as any}
        viewBox="0 0 100 200"
      >
        <path
          d="M50 10 L80 80 L65 80 L85 140 L55 140 L55 200 L45 200 L45 140 L15 140 L35 80 L20 80 Z"
          fill="currentColor"
        />
      </svg>
      <svg
        className="w-20 h-36 origin-bottom transition-transform duration-500 hidden md:block text-slate-800 dark:text-slate-400"
        style={{
          animation: `sway-right ${duration} ease-in-out infinite alternate`,
          animationDelay: '0.8s',
          '--sway-angle': `calc(${angle} * -0.85)`,
        } as any}
        viewBox="0 0 100 200"
      >
        <path
          d="M50 20 L75 80 L60 80 L80 140 L55 140 L55 200 L45 200 L45 140 L20 140 L40 80 L25 80 Z"
          fill="currentColor"
        />
      </svg>
      <svg
        className="w-14 h-24 origin-bottom transition-transform duration-500 text-slate-800 dark:text-slate-400"
        style={{
          animation: `sway-left ${duration} ease-in-out infinite alternate`,
          animationDelay: '1.6s',
          '--sway-angle': `calc(${angle} * 1.15)`,
        } as any}
        viewBox="0 0 100 200"
      >
        <path
          d="M50 15 L78 75 L63 75 L82 135 L55 135 L55 200 L45 200 L45 135 L18 135 L37 75 L22 75 Z"
          fill="currentColor"
        />
      </svg>
    </div>
  );
};

// 7. REALISTIC DEEP FOG BACKDROP
const FogOverlay: React.FC<{ isDay: boolean }> = ({ isDay }) => {
  return (
    <div className="absolute inset-0 z-0 overflow-hidden opacity-30">
      <div 
        className={`absolute inset-x-[-20%] bottom-0 h-[70%] animate-fog-drift filter blur-[35px] ${
          isDay 
            ? 'bg-gradient-to-t from-slate-200/80 via-slate-100/40 to-transparent'
            : 'bg-gradient-to-t from-slate-900/90 via-slate-850/50 to-transparent'
        }`}
      />
      <div 
        className={`absolute inset-x-[-30%] top-[20%] h-[50%] animate-fog-drift filter blur-[40px] opacity-70`}
        style={{
          animationDelay: '5s',
          animationDuration: '32s',
          background: isDay ? 'rgba(241, 245, 249, 0.4)' : 'rgba(30, 41, 59, 0.5)'
        }}
      />
    </div>
  );
};

// 8. SEASONAL LEAF & BLOSSOM DRIFT
const LeafEffect: React.FC<{ season: string; windSpeed: number }> = ({ season, windSpeed }) => {
  const [leaves, setLeaves] = useState<{ id: number; left: string; top: string; scale: number; speed: string; delay: string; rotation: string; color: string }[]>([]);

  const isAutumn = season === 'autumn';
  const isSpring = season === 'spring' || season === 'summer';
  const hasLeaves = isAutumn || isSpring;

  useEffect(() => {
    if (!hasLeaves) {
      setLeaves([]);
      return;
    }
    const count = isAutumn ? 14 : 7;
    const colors = isAutumn 
      ? ['rgba(217, 119, 6, 0.45)', 'rgba(234, 88, 12, 0.45)', 'rgba(180, 83, 9, 0.45)', 'rgba(153, 27, 27, 0.4)'] // Autumn leaf tones
      : ['rgba(52, 211, 153, 0.3)', 'rgba(16, 185, 129, 0.3)', 'rgba(244, 143, 177, 0.35)']; // Spring cherry blossoms / greens

    const items = Array.from({ length: count }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      top: `-30px`,
      scale: 0.45 + Math.random() * 0.75,
      speed: `${7 + Math.random() * 9}s`,
      delay: `${Math.random() * 12}s`,
      rotation: `${Math.random() * 360}deg`,
      color: colors[Math.floor(Math.random() * colors.length)]
    }));
    setLeaves(items);
  }, [season, hasLeaves, isAutumn]);

  if (!hasLeaves) return null;

  const windOffset = Math.max(60, windSpeed * 4.5);

  return (
    <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
      {leaves.map((leaf) => (
        <svg
          key={leaf.id}
          className="absolute origin-center"
          style={{
            left: leaf.left,
            top: leaf.top,
            width: `${15 * leaf.scale}px`,
            height: `${15 * leaf.scale}px`,
            color: leaf.color,
            '--drift-x-leaf': `${windOffset}px`,
            '--start-rot': leaf.rotation,
            animation: `leaf-fall ${leaf.speed} linear infinite`,
            animationDelay: leaf.delay,
          } as any}
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M17,8C8,10 5.9,16.17 3.82,21.34C5.71,20 10,18 17,14C22,11.5 22,6 22,6C22,6 19,5 17,8Z" />
        </svg>
      ))}
    </div>
  );
};

// 9. THUNDERSTORM LIGHTNING TRIGGER
const LightningFlash: React.FC = () => {
  return (
    <div className="absolute inset-0 pointer-events-none z-10 animate-lightning mix-blend-screen bg-indigo-100" />
  );
};

export default WeatherAnimations;
