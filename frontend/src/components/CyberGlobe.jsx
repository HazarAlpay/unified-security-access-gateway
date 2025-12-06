import React, { useMemo, useState, useEffect, useRef } from 'react';
import Globe from 'react-globe.gl';
import * as THREE from 'three';

const CyberGlobe = ({ logs = [], sessions = [], onPointClick }) => {
  const globeEl = useRef();
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [hoverInfo, setHoverInfo] = useState(null);
  const containerRef = useRef();

  const mousePosition = useRef({ x: 0, y: 0 });

  // Track mouse position globally to prevent "jump" on initial hover
  useEffect(() => {
      const handleWindowMouseMove = (e) => {
          mousePosition.current = { x: e.clientX, y: e.clientY };
      };
      window.addEventListener('mousemove', handleWindowMouseMove);
      return () => window.removeEventListener('mousemove', handleWindowMouseMove);
  }, []);

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight
        });
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Initial size

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Auto-rotate
  useEffect(() => {
    if (globeEl.current) {
      globeEl.current.controls().autoRotate = true;
      globeEl.current.controls().autoRotateSpeed = 0.5;
    }
  }, []);

  const groupedData = useMemo(() => {
    if (!Array.isArray(logs) || !Array.isArray(sessions)) return [];

    const groupsMap = new Map();

    // Helper to process items
    const processItem = (item, type) => {
      if (!item) return;
      
      let lat = item.lat || item.latitude;
      let lon = item.lon || item.longitude;
      let city = item.city || item.location || 'Unknown';
      
      // Metadata extraction fallback
      if (!lat && item.log_metadata) {
         try {
             const meta = typeof item.log_metadata === 'string' ? JSON.parse(item.log_metadata) : item.log_metadata;
             if (meta?.curr_loc) {
                 lat = meta.curr_loc.lat;
                 lon = meta.curr_loc.lon;
                 city = meta.curr_loc.city || city;
             } else if (meta?.lat && meta?.lon) {
                 lat = meta.lat;
                 lon = meta.lon;
             }
         } catch (e) { /* ignore */ }
      }

      if (!lat || !lon || isNaN(parseFloat(lat)) || isNaN(parseFloat(lon))) return;

      const key = `${parseFloat(lat).toFixed(2)},${parseFloat(lon).toFixed(2)}`; // Group by approximate location
      
      if (!groupsMap.has(key)) {
          groupsMap.set(key, {
              lat: parseFloat(lat),
              lng: parseFloat(lon),
              city: city,
              count: 0,
              events: [], // Store raw events for modal
              maxRisk: 0,
              hasActiveSession: false,
              color: '#00aaff' // Default Blue
          });
      }

      const group = groupsMap.get(key);
      group.count += 1;
      
      const username = item.username || 'Unknown';
      const risk = item.risk_score || 0;

      // Add raw event object for modal
      group.events.push({
          type: type,
          username: username,
          action: item.action,
          risk: risk,
          ip: item.ip_address || 'Unknown',
          device: type === 'session' ? item.device : (item.log_metadata ? (typeof item.log_metadata === 'string' ? JSON.parse(item.log_metadata).user_agent : item.log_metadata.user_agent) : 'Unknown'),
          time: item.timestamp || item.created_at
      });
      
      if (type === 'log') {
          if (risk > group.maxRisk) group.maxRisk = risk;
          const isThreat = risk > 80;
      } else if (type === 'session') {
          group.hasActiveSession = true;
      }

      // Update Color Priority: RED (Threat) > GREEN (Session) > BLUE (Log)
      if (group.maxRisk > 80) {
          group.color = 'red';
      } else if (group.hasActiveSession) {
          group.color = '#00ff00';
      } else {
          group.color = '#00aaff';
      }
    };

    // Process Logs
    logs.forEach(log => processItem(log, 'log'));
    
    // Process Sessions
    sessions.forEach(session => processItem(session, 'session'));

    return Array.from(groupsMap.values());
  }, [logs, sessions]);

  return (
    <div 
        ref={containerRef} 
        className="w-full h-full min-h-[400px] bg-slate-900 rounded-xl overflow-hidden shadow-xl border border-slate-800 relative group"
        onMouseMove={(e) => {
            if (hoverInfo) {
                // Sync state with mouse move for smooth following
                setHoverInfo(prev => ({
                    ...prev,
                    x: e.clientX,
                    y: e.clientY
                }));
            }
        }}
    >
        <div className="absolute top-4 left-4 z-10 pointer-events-none">
            <div className="mt-2 flex flex-col gap-1 text-xs text-gray-300 bg-black/50 p-2 rounded backdrop-blur-md border border-white/10">
                <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-red-500"></span> High Risk</div>
                <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-green-500"></span> Active Session</div>
                <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-[#00aaff]"></span> Login Event</div>
            </div>
        </div>

      <Globe
        ref={globeEl}
        width={dimensions.width}
        height={dimensions.height}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
        backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
        
        customLayerData={groupedData}
        customThreeObject={d => new THREE.Mesh(
            new THREE.SphereGeometry(d.count > 5 ? 2 : 1.5, 32, 32), // Significantly larger spheres
            new THREE.MeshLambertMaterial({ color: d.color })
        )}
        customThreeObjectUpdate={(obj, d) => {
            Object.assign(obj.position, globeEl.current.getCoords(d.lat, d.lng, 0.06));
        }}
        
        onCustomLayerClick={(obj, event) => {
             console.log("Sphere Clicked:", obj);
             if (onPointClick) onPointClick(obj);
        }}
        onCustomLayerHover={(obj, event) => {
            if (globeEl.current) {
                 globeEl.current.controls().autoRotate = !obj;
                 document.body.style.cursor = obj ? 'pointer' : 'default';
            }
            
            if (obj) {
                 setHoverInfo({
                     data: obj,
                     x: mousePosition.current.x,
                     y: mousePosition.current.y
                 });
            } else {
                setHoverInfo(null);
            }
        }}

        // Rings for visual flair
        ringsData={groupedData}
        ringColor={d => d.color}
        ringMaxRadius={d => 5 + (d.count * 0.5)} // Larger ripple for more activity
        ringPropagationSpeed={2}
        ringRepeatPeriod={1000}

        atmosphereColor="#3a228a"
        atmosphereAltitude={0.15}
      />
      
      {/* Custom Tooltip Overlay - Follows Mouse */}
      {hoverInfo && hoverInfo.x > 0 && (
        <div 
            className="fixed z-50 bg-gray-900/95 text-white p-3 rounded-lg border border-gray-700 shadow-2xl backdrop-blur-md text-sm pointer-events-none"
            style={{ 
                top: hoverInfo.y + 15, 
                left: hoverInfo.x + 15,
            }}
        >
           <div className="font-bold text-green-400 flex items-center gap-2">
               <span>📍</span> {hoverInfo.data.city}
           </div>
           <div className="font-mono text-gray-300 mt-1">📊 Events: {hoverInfo.data.count}</div>
           <div className="text-xs text-gray-500 mt-2 border-t border-gray-700 pt-1 italic">Click to inspect</div>
        </div>
      )}
    </div>
  );
};

export default CyberGlobe;
