import React, { useEffect, useState } from 'react';

interface WeatherAnimationsProps {
  conditionCode: number;
  isDay?: boolean;
}

export const WeatherAnimations: React.FC<WeatherAnimationsProps> = ({ conditionCode, isDay = true }) => {
  const [elements, setElements] = useState<{ id: number; left: string; delay: string; duration: string; size: string }[]>([]);

  // Categorize weather codes
  const isRain = [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(conditionCode);
  const isSnow = [71, 73, 75, 77, 85, 86].includes(conditionCode);
  const isLightning = [95, 96, 99].includes(conditionCode);
  const isCloudy = [1, 2, 3].includes(conditionCode);
  const isFoggy = [45, 48].includes(conditionCode);

  useEffect(() => {
    let count = 0;
    if (isRain) count = 40;
    else if (isSnow) count = 25;
    else if (isCloudy) count = 5;

    const items = Array.from({ length: count }).map((_, i) => {
      return {
        id: i,
        left: `${Math.random() * 100}%`,
        delay: `${Math.random() * 5}s`,
        duration: isRain ? `${0.8 + Math.random() * 0.8}s` : `${4 + Math.random() * 6}s`,
        size: isRain ? `${1 + Math.random() * 2}px` : `${5 + Math.random() * 10}px`
      };
    });

    setElements(items);
  }, [isRain, isSnow, isCloudy]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
      {/* Dynamic Background Gradients */}
      <div 
        className={`absolute inset-0 transition-all duration-1000 ${
          isLightning 
            ? 'bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white'
            : isRain
            ? isDay
              ? 'bg-gradient-to-br from-sky-950 via-indigo-900 to-slate-800'
              : 'bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900'
            : isSnow
            ? isDay
              ? 'bg-gradient-to-br from-indigo-900 via-blue-900 to-slate-200'
              : 'bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-800'
            : isFoggy
            ? isDay
              ? 'bg-gradient-to-br from-slate-300 via-zinc-400 to-slate-500'
              : 'bg-gradient-to-br from-slate-900 via-zinc-800 to-slate-950'
            : isCloudy
            ? isDay
              ? 'bg-gradient-to-br from-sky-400 via-blue-500 to-slate-400'
              : 'bg-gradient-to-br from-slate-950 via-sky-950 to-slate-900'
            : isDay // Clear sky
            ? 'bg-gradient-to-br from-cyan-400 via-sky-500 to-indigo-500'
            : 'bg-gradient-to-br from-slate-950 via-indigo-950 to-indigo-900'
        }`}
      />

      {/* Rain effect */}
      {isRain && elements.map((item) => (
        <div 
          key={item.id}
          className="absolute bg-blue-400/60 rounded-full"
          style={{
            left: item.left,
            width: item.size,
            height: `${parseInt(item.size) * 10}px`,
            top: '-20px',
            animation: `fall ${item.duration} linear infinite`,
            animationDelay: item.delay,
          }}
        />
      ))}

      {/* Snow effect */}
      {isSnow && elements.map((item) => (
        <div 
          key={item.id}
          className="absolute bg-white/70 rounded-full"
          style={{
            left: item.left,
            width: item.size,
            height: item.size,
            top: '-20px',
            filter: 'blur(1px)',
            animation: `snowfall ${item.duration} linear infinite`,
            animationDelay: item.delay,
          }}
        />
      ))}

      {/* Lightning Storm effect */}
      {isLightning && (
        <div className="absolute inset-0 animate-lightning-flash mix-blend-color-dodge opacity-0 pointer-events-none bg-indigo-200/40" />
      )}

      {/* Fog Overlay */}
      {isFoggy && (
        <div className="absolute inset-0 bg-slate-200/10 dark:bg-slate-950/20 mix-blend-overlay backdrop-filter backdrop-blur-[1px] animate-fog-drift" />
      )}

      {/* Cloud drifts */}
      {isCloudy && elements.slice(0, 3).map((item, idx) => (
        <div 
          key={idx}
          className="absolute bg-white/10 dark:bg-slate-700/10 rounded-full filter blur-[40px]"
          style={{
            left: `calc(${idx * 30}% - 100px)`,
            top: `${15 + idx * 10}%`,
            width: '350px',
            height: '180px',
            animation: `drift ${20 + idx * 10}s linear infinite alternate`,
          }}
        />
      ))}

      {/* Core Keyframe Animations injection */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fall {
          0% { transform: translateY(-50px) rotate(15deg); opacity: 0; }
          10% { opacity: 1; }
          100% { transform: translateY(110vh) rotate(15deg); opacity: 0.2; }
        }
        @keyframes snowfall {
          0% { transform: translateY(-50px) translateX(0) rotate(0deg); opacity: 0; }
          10% { opacity: 1; }
          50% { transform: translateY(50vh) translateX(30px) rotate(180deg); }
          100% { transform: translateY(110vh) translateX(-30px) rotate(360deg); opacity: 0.1; }
        }
        @keyframes lightning-flash {
          0%, 95%, 98%, 100% { opacity: 0; }
          96% { opacity: 1; }
          97% { opacity: 0.3; }
        }
        .animate-lightning-flash {
          animation: lightning-flash 7s ease-in-out infinite;
        }
        @keyframes fog-drift {
          0% { filter: blur(1px); }
          50% { filter: blur(3px); }
          100% { filter: blur(1px); }
        }
        .animate-fog-drift {
          animation: fog-drift 10s ease-in-out infinite;
        }
        @keyframes drift {
          0% { transform: translateX(-40px); }
          100% { transform: translateX(40px); }
        }
      `}} />
    </div>
  );
};

export default WeatherAnimations;
