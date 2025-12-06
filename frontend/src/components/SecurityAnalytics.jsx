import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Shield, AlertTriangle } from 'lucide-react';

const SecurityAnalytics = ({ logs }) => {
  // 1. Process Data for "Risk Events by Type" (Bar Chart)
  const riskEventsData = useMemo(() => {
    const events = {};
    logs.forEach(log => {
      // Filter for high-risk events or specific actions of interest
      if (log.risk_score > 5) { 
        const type = log.action;
        events[type] = (events[type] || 0) + 1;
      }
    });

    return Object.entries(events)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5); // Top 5 event types
  }, [logs]);

  // 2. Process Data for "Top Threat Origins" (Bar Chart)
  const threatOriginsData = useMemo(() => {
    const countries = {};
    logs.forEach(log => {
      // Filter for high-risk events (risk_score >= 15)
      if (log.risk_score >= 15) {
        let country = log.country || 'Unknown';
        
        // Attempt to find it in metadata if top-level is missing
        if (country === 'Unknown' && log.log_metadata) {
          try {
            const meta = typeof log.log_metadata === 'string' ? JSON.parse(log.log_metadata) : log.log_metadata;
            if (meta.curr_loc && meta.curr_loc.country) {
              country = meta.curr_loc.country;
            }
          } catch(e) {
            // Ignore parse errors
          }
        }
        
        countries[country] = (countries[country] || 0) + 1;
      }
    });

    return Object.entries(countries)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5); // Top 5 threat origins
  }, [logs]);

  if (!logs || logs.length === 0) {
      return null;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      {/* Chart 1: Risk Events by Type */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm ring-1 ring-gray-900/5 dark:ring-white/10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Risk Events by Type</h3>
          </div>
          <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <Shield className="h-5 w-5 text-red-600 dark:text-red-400" />
          </div>
        </div>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={riskEventsData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#374151" opacity={0.1} />
              <XAxis type="number" hide />
              <YAxis 
                dataKey="name" 
                type="category" 
                width={100} 
                tick={{ fontSize: 12, fill: '#6B7280' }} 
                interval={0}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px', color: '#F3F4F6' }}
                itemStyle={{ color: '#F3F4F6' }}
                cursor={{ fill: 'transparent' }}
              />
              <Bar dataKey="value" fill="#6366F1" radius={[0, 4, 4, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart 2: Top Threat Origins */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm ring-1 ring-gray-900/5 dark:ring-white/10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Top Threat Origins</h3>
            
          </div>
          
        </div>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={threatOriginsData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#374151" opacity={0.1} />
              <XAxis type="number" hide />
              <YAxis 
                dataKey="name" 
                type="category" 
                width={100} 
                tick={{ fontSize: 12, fill: '#6B7280' }} 
                interval={0}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px', color: '#F3F4F6' }}
                itemStyle={{ color: '#F3F4F6' }}
                cursor={{ fill: 'transparent' }}
              />
              <Bar 
                dataKey="value" 
                fill="#ef4444" 
                radius={[0, 4, 4, 0]} 
                barSize={20}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default SecurityAnalytics;
