import { useState } from 'react';
import { X, Shield, AlertTriangle, CheckCircle, Monitor, Globe, Clock, User, Activity, FileText } from 'lucide-react';
import api from '../api/axios';

const LogDetailModal = ({ log, onClose, onStatusUpdate }) => {
  const [updating, setUpdating] = useState(false);

  if (!log) return null;

  // Parse metadata if it's a string, otherwise use as is
  let metadata = {};
  try {
    metadata = typeof log.log_metadata === 'string' 
      ? JSON.parse(log.log_metadata) 
      : log.log_metadata || {};
  } catch (e) {
    metadata = { raw: log.log_metadata };
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'SUCCESS': return 'text-green-600 bg-green-50 border-green-200';
      case 'FAILURE': return 'text-red-600 bg-red-50 border-red-200';
      case 'MFA_REQ': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getRiskColor = (score) => {
    if (score >= 20) return 'text-red-600 bg-red-50 border-red-200';
    if (score >= 15) return 'text-orange-600 bg-orange-50 border-orange-200';
    if (score >= 10) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    if (score >= 5) return 'text-blue-600 bg-blue-50 border-blue-200';
    return 'text-green-600 bg-green-50 border-green-200';
  };

  const getTriageColor = (status) => {
    switch (status) {
        case 'NEW': return 'text-red-600 bg-red-50 border-red-200';
        case 'IN_PROGRESS': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
        case 'RESOLVED': return 'text-green-600 bg-green-50 border-green-200';
        case 'FALSE_POSITIVE': return 'text-gray-600 bg-gray-50 border-gray-200';
        default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const formatTimestamp = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  const parseUserAgent = (ua) => {
    if (!ua) return { browser: 'Unknown', os: 'Unknown' };
    
    let browser = 'Unknown';
    let os = 'Unknown';

    // Simple Browser Detection
    if (ua.indexOf("Firefox") > -1) browser = "Mozilla Firefox";
    else if (ua.indexOf("SamsungBrowser") > -1) browser = "Samsung Internet";
    else if (ua.indexOf("Opera") > -1 || ua.indexOf("OPR") > -1) browser = "Opera";
    else if (ua.indexOf("Trident") > -1) browser = "Microsoft Internet Explorer";
    else if (ua.indexOf("Edge") > -1 || ua.indexOf("Edg") > -1) browser = "Microsoft Edge";
    else if (ua.indexOf("Chrome") > -1) browser = "Google Chrome";
    else if (ua.indexOf("Safari") > -1) browser = "Apple Safari";

    // Simple OS Detection
    if (ua.indexOf("Win") > -1) os = "Windows";
    else if (ua.indexOf("Mac") > -1) os = "MacOS";
    else if (ua.indexOf("Linux") > -1) os = "Linux";
    else if (ua.indexOf("Android") > -1) os = "Android";
    else if (ua.indexOf("like Mac") > -1) os = "iOS";

    return { browser, os };
  };

  const { browser, os } = metadata.user_agent ? parseUserAgent(metadata.user_agent) : {};

  const handleStatusChange = async (newStatus) => {
      if (updating) return;
      setUpdating(true);
      try {
          const { data } = await api.patch(`/admin/logs/${log.id}/status`, { status: newStatus });
          if (onStatusUpdate) onStatusUpdate(data);
      } catch (error) {
          console.error("Failed to update status:", error);
          alert("Failed to update status.");
      } finally {
          setUpdating(false);
      }
  };

  const statusOptions = [
      { value: 'NEW', label: 'New', color: 'bg-red-100 text-red-800 border-red-200 ring-red-500' },
      { value: 'IN_PROGRESS', label: 'In Progress', color: 'bg-yellow-100 text-yellow-800 border-yellow-200 ring-yellow-500' },
      { value: 'RESOLVED', label: 'Resolved', color: 'bg-green-100 text-green-800 border-green-200 ring-green-500' },
      { value: 'FALSE_POSITIVE', label: 'False Positive', color: 'bg-gray-100 text-gray-600 border-gray-200 ring-gray-500' },
  ];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6">
      <div 
        className="absolute inset-0 bg-gray-900/30 dark:bg-gray-900/50 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 shadow-2xl transition-all ring-1 ring-gray-900/5 dark:ring-white/10">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 p-6">
          <div className="flex items-center gap-4">
            <div className={`rounded-xl p-2.5 border ${getStatusColor(log.status)}`}>
              {log.status === 'SUCCESS' ? <CheckCircle className="h-6 w-6" /> : 
               log.status === 'MFA_REQ' ? <Shield className="h-6 w-6" /> : 
               <AlertTriangle className="h-6 w-6" />}
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">{log.action}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                ID: #{log.id} • <span className="font-mono">{log.status}</span>
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {log.risk_score >= 15 ? (
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-bold ${getTriageColor(log.investigation_status || 'NEW')}`}>
                <Shield className="h-4 w-4" />
                {log.investigation_status || 'NEW'}
                </div>
            ) : (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 text-sm font-bold">
                <CheckCircle className="h-4 w-4" />
                SAFE
                </div>
            )}

            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-bold ${getRiskColor(log.risk_score)}`}>
              <Activity className="h-4 w-4" />
              Risk Score: {log.risk_score}
            </div>
            <button 
              onClick={onClose}
              className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-8">
          {/* Key Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400">
                <Clock className="h-4 w-4" /> Timestamp
              </div>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 pl-6">
                {formatTimestamp(log.timestamp)}
              </p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400">
                <User className="h-4 w-4" /> Actor
              </div>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 pl-6">
                {log.username || 'Unknown User'}
              </p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400">
                <Globe className="h-4 w-4" /> Network Source
              </div>
              <p className="text-sm font-mono font-semibold text-gray-900 dark:text-gray-100 pl-6">
                {log.ip_address}
              </p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400">
                <Shield className="h-4 w-4" /> Destination
              </div>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 pl-6">
                Gateway Core Authentication
              </p>
            </div>
          </div>

          <div className="border-t border-gray-100 dark:border-gray-700" />

          {/* Triage Section - Only for High Risk */}
          {log.risk_score >= 15 && (
              <>
                <div className="space-y-4">
                    <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-gray-400" />
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white">Incident Triage</h4>
                    </div>
                    
                    <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                        <label className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400 mb-3 block">Current Status</label>
                        <div className="flex flex-wrap gap-3">
                            {statusOptions.map((option) => (
                                <button
                                    key={option.value}
                                    onClick={() => handleStatusChange(option.value)}
                                    disabled={updating}
                                    className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-all ${
                                        log.investigation_status === option.value || (!log.investigation_status && option.value === 'NEW')
                                            ? `${option.color} ring-2 ring-offset-1 dark:ring-offset-gray-800`
                                            : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-500'
                                    } ${updating ? 'opacity-50 cursor-wait' : ''}`}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="border-t border-gray-100 dark:border-gray-700" />
              </>
          )}

          {/* Metadata Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Monitor className="h-5 w-5 text-gray-400" />
              <h4 className="text-sm font-bold text-gray-900 dark:text-white">Event Metadata</h4>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-4 border border-gray-200 dark:border-gray-700 space-y-3">
              {/* Standard Fields if they exist */}
              {metadata.reason && (
                <div className="flex items-start gap-3">
                  <span className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400 w-24 mt-0.5">Reason</span>
                  <span className="text-sm text-gray-900 dark:text-gray-100 font-medium">{metadata.reason}</span>
                </div>
              )}
              
              {/* User Agent Parser (Enhanced) */}
              {metadata.user_agent && (
                <>
                  <div className="flex items-start gap-3">
                    <span className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400 w-24 mt-0.5">Browser</span>
                    <span className="text-sm text-gray-900 dark:text-gray-100 font-semibold">{browser} on {os}</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400 w-24 mt-0.5">Raw UA</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 font-mono break-all bg-gray-100 dark:bg-gray-800 p-1 rounded">{metadata.user_agent}</span>
                  </div>
                </>
              )}

              {/* Fallback for other keys */}
              {Object.entries(metadata).map(([key, value]) => {
                if (key === 'reason' || key === 'user_agent') return null;
                return (
                  <div key={key} className="flex items-start gap-3">
                    <span className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400 w-24 mt-0.5">
                      {key.replace(/_/g, ' ')}
                    </span>
                    <span className="text-sm text-gray-700 dark:text-gray-300 font-mono break-all">
                      {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                    </span>
                  </div>
                );
              })}

              {Object.keys(metadata).length === 0 && (
                <p className="text-sm text-gray-400 italic">No additional metadata captured.</p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 dark:bg-gray-700/30 px-6 py-4 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default LogDetailModal;

