import React from 'react';
import { X, Shield, Activity, CheckCircle, AlertTriangle, User } from 'lucide-react';

const LocationDetailsModal = ({ data, onClose }) => {
  if (!data) return null;

  const getRiskColor = (score) => {
    if (score > 70) return 'text-red-600 bg-red-50 border-red-200';
    if (score > 30) return 'text-amber-600 bg-amber-50 border-amber-200';
    return 'text-green-600 bg-green-50 border-green-200';
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto pointer-events-auto">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-gray-900/60 dark:bg-gray-900/80 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      {/* Modal Panel */}
      <div className="relative w-full max-w-3xl transform rounded-2xl bg-white dark:bg-gray-800 shadow-2xl transition-all ring-1 ring-gray-900/5 dark:ring-white/10 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 p-6">
          <div>
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm font-medium uppercase tracking-wider mb-1">
              <span className="w-2 h-2 rounded-full bg-indigo-500"></span> Location Intel
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              {data.city} <span className="text-gray-400 dark:text-gray-500 font-normal text-lg">({data.count} Events)</span>
            </h2>
          </div>
          
          <button 
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-0 overflow-y-auto flex-1 custom-scrollbar">
          {data.events && data.events.length > 0 ? (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {data.events.map((event, idx) => (
                <div key={idx} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors flex items-start gap-4">
                  <div className={`mt-1 rounded-lg p-2 border ${
                     event.risk > 80 ? 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-900/30 text-red-600 dark:text-red-400' : 
                     event.type === 'session' ? 'bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-900/30 text-green-600 dark:text-green-400' :
                     'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-900/30 text-blue-600 dark:text-blue-400'
                  }`}>
                    {event.risk > 80 ? <AlertTriangle className="h-5 w-5" /> : 
                     event.type === 'session' ? <Activity className="h-5 w-5" /> :
                     <Shield className="h-5 w-5" />}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                       <h4 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                         {event.username}
                         {event.type === 'session' && (
                           <span className="px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-bold">Active</span>
                         )}
                       </h4>
                       <span className="text-xs text-gray-400 font-mono">{new Date(event.time).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">
                      <span className="font-medium text-gray-700 dark:text-gray-200">{event.action}</span>
                    </p>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded border border-gray-200 dark:border-gray-600 font-mono">
                        {event.ip}
                      </span>
                      <span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded border border-gray-200 dark:border-gray-600 truncate max-w-[200px]" title={event.device}>
                        {event.device}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${getRiskColor(event.risk)}`}>
                      Risk: {event.risk}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center text-gray-500 dark:text-gray-400">
              No detailed events found for this location.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 dark:bg-gray-700/30 px-6 py-4 border-t border-gray-100 dark:border-gray-700 rounded-b-2xl flex justify-end">
           <button 
             onClick={onClose}
             className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
           >
             Close
           </button>
        </div>

      </div>
    </div>
  );
};

export default LocationDetailsModal;
