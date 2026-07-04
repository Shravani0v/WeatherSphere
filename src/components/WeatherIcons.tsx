import React from 'react';
import { 
  Sun, 
  Cloud, 
  CloudSun, 
  Cloudy, 
  CloudFog, 
  CloudDrizzle, 
  CloudRain, 
  Snowflake, 
  Zap, 
  Moon, 
  Wind, 
  Compass, 
  Droplets, 
  Thermometer, 
  Gauge, 
  Navigation,
  Activity,
  Heart,
  Sprout
} from 'lucide-react';

interface WeatherIconProps {
  name: string;
  className?: string;
  size?: number;
  isDay?: boolean;
}

export const WeatherIcon: React.FC<WeatherIconProps> = ({ name, className = '', size = 24, isDay = true }) => {
  const iconProps = { className, size };

  switch (name) {
    case 'Sun':
      return isDay ? (
        <Sun {...iconProps} className={`${className} animate-spin-slow text-amber-500`} />
      ) : (
        <Moon {...iconProps} className={`${className} animate-pulse text-indigo-300`} />
      );
    case 'CloudSun':
      return isDay ? (
        <CloudSun {...iconProps} className={`${className} text-sky-400`} />
      ) : (
        <Cloud {...iconProps} className={`${className} text-slate-400`} />
      );
    case 'Cloud':
      return <Cloud {...iconProps} className={`${className} text-sky-300 animate-bounce-slow`} />;
    case 'Cloudy':
      return <Cloudy {...iconProps} className={`${className} text-slate-400 animate-pulse`} />;
    case 'CloudFog':
      return <CloudFog {...iconProps} className={`${className} text-slate-400 animate-pulse`} />;
    case 'CloudDrizzle':
      return <CloudDrizzle {...iconProps} className={`${className} text-blue-300`} />;
    case 'CloudRain':
      return <CloudRain {...iconProps} className={`${className} text-blue-400 animate-pulse`} />;
    case 'Snowflake':
      return <Snowflake {...iconProps} className={`${className} text-teal-200 animate-spin-slow`} />;
    case 'Zap':
      return <Zap {...iconProps} className={`${className} text-yellow-400 animate-pulse`} />;
    case 'Wind':
      return <Wind {...iconProps} className={`${className} text-teal-400`} />;
    case 'Compass':
      return <Compass {...iconProps} className={`${className} text-slate-400`} />;
    case 'Droplets':
      return <Droplets {...iconProps} className={`${className} text-blue-400`} />;
    case 'Thermometer':
      return <Thermometer {...iconProps} className={`${className} text-rose-400`} />;
    case 'Gauge':
      return <Gauge {...iconProps} className={`${className} text-violet-400`} />;
    case 'Navigation':
      return <Navigation {...iconProps} className={`${className} text-emerald-400`} />;
    case 'Activity':
      return <Activity {...iconProps} className={`${className} text-pink-400`} />;
    case 'Heart':
      return <Heart {...iconProps} className={`${className} text-red-400`} />;
    case 'Sprout':
      return <Sprout {...iconProps} className={`${className} text-green-400`} />;
    default:
      return <Cloud {...iconProps} className={`${className} text-sky-300`} />;
  }
};

// CSS Animation injection inside Tailwind or component level
export function InjectWeatherAnimations() {
  return (
    <style dangerouslySetInnerHTML={{__html: `
      @keyframes spin-slow {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      .animate-spin-slow {
        animation: spin-slow 20s linear infinite;
      }
      @keyframes bounce-slow {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-4px); }
      }
      .animate-bounce-slow {
        animation: bounce-slow 4s ease-in-out infinite;
      }
    `}} />
  );
}
export default WeatherIcon;
