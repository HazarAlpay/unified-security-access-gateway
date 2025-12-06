
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, UserX, Ban, ArrowLeft, Unlock, Trash2, RefreshCw } from 'lucide-react';
import api from '../api/axios';

const SecurityManagement = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ locked_users: [], banned_ips: [] });

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: res } = await api.get('/admin/security-status');
      setData(res);
    } catch (error) {
      console.error("Failed to fetch security status:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUnlock = async (username) => {
      if (!window.confirm(`Unlock user ${username}?`)) return;
      try {
          await api.post(`/admin/users/${username}/unlock`);
          fetchData(); // Refresh
      } catch (e) {
          alert("Failed to unlock user.");
      }
  };

  const handleUnban = async (ip) => {
      if (!window.confirm(`Unban IP ${ip}?`)) return;
      try {
          await api.post('/admin/unban-ip', { ip_address: ip });
          fetchData(); // Refresh
      } catch (e) {
          alert("Failed to unban IP.");
      }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
                <button onClick={() => navigate('/admin')} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full">
                    <ArrowLeft className="h-5 w-5" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Shield className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                        Security Management
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Manage blocked entities and access restrictions</p>
                </div>
            </div>
            <button onClick={fetchData} className="p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin text-indigo-500' : 'text-gray-500'}`} />
            </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Locked Users Panel */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-red-50 dark:bg-red-900/10">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg text-red-600 dark:text-red-400">
                            <UserX className="h-5 w-5" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Locked Accounts</h3>
                    </div>
                    <span className="px-3 py-1 bg-white dark:bg-gray-800 rounded-full text-sm font-bold shadow-sm">
                        {data.locked_users.length}
                    </span>
                </div>
                <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-[500px] overflow-y-auto">
                    {data.locked_users.length === 0 ? (
                        <div className="p-8 text-center text-gray-500 dark:text-gray-400 italic">No locked accounts.</div>
                    ) : (
                        data.locked_users.map(user => (
                            <div key={user.id} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                <div>
                                    <p className="font-semibold text-gray-900 dark:text-gray-100">{user.username}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Role: {user.role}</p>
                                </div>
                                <button 
                                    onClick={() => handleUnlock(user.username)}
                                    className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/40 rounded-lg transition-colors"
                                >
                                    <Unlock className="h-4 w-4" /> Unlock
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Banned IPs Panel */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-200 dark:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300">
                            <Ban className="h-5 w-5" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Blacklisted IPs</h3>
                    </div>
                    <span className="px-3 py-1 bg-white dark:bg-gray-800 rounded-full text-sm font-bold shadow-sm">
                        {data.banned_ips.length}
                    </span>
                </div>
                <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-[500px] overflow-y-auto">
                    {data.banned_ips.length === 0 ? (
                        <div className="p-8 text-center text-gray-500 dark:text-gray-400 italic">No banned IPs.</div>
                    ) : (
                        data.banned_ips.map(ip => (
                            <div key={ip.ip_address} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                <div>
                                    <p className="font-mono font-semibold text-gray-900 dark:text-gray-100">{ip.ip_address}</p>
                                    <p className="text-xs text-red-500 dark:text-red-400 font-medium mt-1">{ip.reason}</p>
                                    <p className="text-xs text-gray-400 mt-0.5">By: {ip.banned_by || 'System'}</p>
                                </div>
                                <button 
                                    onClick={() => handleUnban(ip.ip_address)}
                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                    title="Remove Ban"
                                >
                                    <Trash2 className="h-5 w-5" />
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>

        </div>
      </div>
    </div>
  );
};

export default SecurityManagement;





