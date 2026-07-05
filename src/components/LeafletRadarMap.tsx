import React, { useEffect, useRef, useState } from 'react';
import { Layers, MapPin, Navigation, Activity } from 'lucide-react';

interface LeafletRadarMapProps {
  lat: number;
  lon: number;
  cityName: string;
  onMapClick?: (lat: number, lon: number) => void;
}

export const LeafletRadarMap: React.FC<LeafletRadarMapProps> = ({ lat, lon, cityName, onMapClick }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [activeLayer, setActiveLayer] = useState<'standard' | 'satellite' | 'precipitation'>('standard');
  const [mapLoaded, setMapLoaded] = useState(false);

  // Dynamically load Leaflet stylesheet and library if not already present
  useEffect(() => {
    let isMounted = true;

    const loadLeaflet = async () => {
      // 1. Inject Leaflet CSS
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }

      // 2. Load Leaflet script
      if (!(window as any).L) {
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.async = true;
        script.onload = () => {
          if (isMounted) setMapLoaded(true);
        };
        document.body.appendChild(script);
      } else {
        setMapLoaded(true);
      }
    };

    loadLeaflet();

    return () => {
      isMounted = false;
    };
  }, []);

  // Handle map initialization and dynamic coordinate updates
  useEffect(() => {
    if (!mapLoaded || !mapContainerRef.current) return;

    const L = (window as any).L;
    if (!L) return;

    // Destroy existing map instance to prevent double-initialization crashes
    if (mapInstanceRef.current) {
      try {
        mapInstanceRef.current.remove();
      } catch (err) {
        console.warn('Error removing map instance:', err);
      }
      mapInstanceRef.current = null;
      markerRef.current = null;
    }

    if (mapContainerRef.current) {
      mapContainerRef.current.innerHTML = '';
      if ((mapContainerRef.current as any)._leaflet_id) {
        delete (mapContainerRef.current as any)._leaflet_id;
      }
    }

    try {
      // Initialize map centered at current coordinates
      const map = L.map(mapContainerRef.current, {
        center: [lat, lon],
        zoom: 9,
        zoomControl: true,
        attributionControl: false
      });

      mapInstanceRef.current = map;

      // Select and apply the tile layers
      const tileLayers: Record<string, string> = {
        standard: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{x}/{y}',
        precipitation: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png' // high-contrast topomap serving as mock radar backdrop
      };

      const baseLayer = L.tileLayer(tileLayers[activeLayer], {
        maxZoom: 18,
      });
      baseLayer.addTo(map);

      // Add a dynamic precipitation overlay to simulate real weather radar!
      if (activeLayer === 'precipitation') {
        // Overlay standard open weather map rain grids or a semi-transparent blue hue to simulate precipitation
        const precipOverlayUrl = 'https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png';
        const precipLayer = L.tileLayer(precipOverlayUrl, {
          maxZoom: 18,
          opacity: 0.55
        });
        precipLayer.addTo(map);
      } else if (activeLayer === 'satellite') {
        // Overlay semi-transparent clouds
        const cloudsOverlayUrl = 'https://tile.openweathermap.org/map/clouds_new/{z}/{x}/{y}.png';
        const cloudsLayer = L.tileLayer(cloudsOverlayUrl, {
          maxZoom: 18,
          opacity: 0.45
        });
        cloudsLayer.addTo(map);
      }

      // Custom icon fixes for Leaflet markers
      const customIcon = L.icon({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34]
      });

      // Add active city pin
      const marker = L.marker([lat, lon], { icon: customIcon }).addTo(map);
      marker.bindPopup(`<b>${cityName}</b><br/>Forecast active coordinates.`).openPopup();
      markerRef.current = marker;

      // Listen for click interactions on the map to trigger geocoding changes!
      map.on('click', (e: any) => {
        const { lat: clickedLat, lng: clickedLon } = e.latlng;
        
        // Update marker immediately
        if (markerRef.current) {
          markerRef.current.setLatLng([clickedLat, clickedLon]);
          markerRef.current.bindPopup(`<b>Custom Coordinates</b><br/>Loading weather...`).openPopup();
        }

        // Forward coordinates back to Parent Dashboard for full API trigger!
        if (onMapClick) {
          onMapClick(clickedLat, clickedLon);
        }
      });

    } catch (err) {
      console.error('Failed to instantiate Leaflet Map canvas:', err);
    }

    return () => {
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch (err) {
          console.warn('Error during map cleanup remove:', err);
        }
        mapInstanceRef.current = null;
        markerRef.current = null;
      }
    };
  }, [mapLoaded, lat, lon, activeLayer, cityName]);

  return (
    <div className="relative w-full h-[320px] md:h-[400px] rounded-2xl overflow-hidden shadow-xl border border-slate-200/20 glass-card">
      {/* Absolute Header Overlay controls */}
      <div className="absolute top-3 left-3 z-10 flex flex-wrap gap-2 pointer-events-auto">
        <button
          onClick={() => setActiveLayer('standard')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
            activeLayer === 'standard'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
              : 'bg-white/80 dark:bg-slate-900/80 text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 backdrop-blur-md'
          }`}
        >
          <Navigation className="w-3.5 h-3.5" />
          Standard
        </button>
        <button
          onClick={() => setActiveLayer('satellite')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
            activeLayer === 'satellite'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
              : 'bg-white/80 dark:bg-slate-900/80 text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 backdrop-blur-md'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          Clouds Overlay
        </button>
        <button
          onClick={() => setActiveLayer('precipitation')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
            activeLayer === 'precipitation'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
              : 'bg-white/80 dark:bg-slate-900/80 text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 backdrop-blur-md'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          Precip Radar
        </button>
      </div>

      {/* Floating Instructions Banner */}
      <div className="absolute bottom-3 right-3 z-10 bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded text-[10px] font-mono text-slate-200 pointer-events-none select-none flex items-center gap-1">
        <MapPin className="w-3 h-3 text-rose-400" />
        Click anywhere on map to select city
      </div>

      {/* Actual Map element ref */}
      {!mapLoaded ? (
        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-900 text-slate-500">
          <div className="w-8 h-8 rounded-full border-4 border-slate-300 border-t-blue-500 animate-spin mb-2" />
          <span className="text-xs font-mono">Initializing Interactive Radar...</span>
        </div>
      ) : (
        <div ref={mapContainerRef} className="w-full h-full" />
      )}
    </div>
  );
};

export default LeafletRadarMap;
