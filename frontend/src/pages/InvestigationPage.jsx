
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { User, Shield, AlertTriangle, CheckCircle, ArrowLeft, Lock, Unlock, ChevronLeft, ChevronRight } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../api/axios';

const InvestigationPage = () => {
  const { username } = useParams();
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userStatus, setUserStatus] = useState('active'); 
  const [currentPage, setCurrentPage] = useState(1);
  const logsPerPage = 10;

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch logs
        const { data: logsData } = await api.get(`/admin/users/${username}/history`);
        setLogs(logsData);
        
        // Fetch user status
        try {
            const { data: userData } = await api.get(`/admin/users/${username}`);
            setUserStatus(userData.is_locked ? 'locked' : 'active');
        } catch (e) {
            console.warn("Could not fetch latest user status, defaulting to log data if available.");
            // Fallback: check if latest log implies lock? No reliable way.
        }
      } catch (err) {
        console.error("Failed to fetch user data:", err);
        setError("Could not load user history.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [username]);

  const toggleLock = async () => {
      const action = userStatus === 'locked' ? 'unlock' : 'lock';
      if (!window.confirm(`Are you sure you want to ${action.toUpperCase()} user ${username}?`)) return;
      
      try {
          await api.post(`/admin/users/${username}/${action}`);
          alert(`User ${action}ed successfully.`);
          setUserStatus(userStatus === 'locked' ? 'active' : 'locked');
      } catch (e) {
          alert(`Failed to ${action} user.`);
      }
  };

  // Pagination Logic
  const indexOfLastLog = currentPage * logsPerPage;
  const indexOfFirstLog = indexOfLastLog - logsPerPage;
  const currentLogs = logs.slice(indexOfFirstLog, indexOfLastLog);
  const totalPages = Math.ceil(logs.length / logsPerPage);

  if (loading) return <div className="p-8 text-center dark:text-white">Loading investigation data...</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

  // Stats
  const totalLogins = logs.length;
  const failedAttempts = logs.filter(l => l.status === 'FAILURE').length;
  const avgRisk = logs.length ? Math.round(logs.reduce((acc, l) => acc + l.risk_score, 0) / logs.length) : 0;

  // Chart Data
  const chartData = logs.slice().reverse().map(l => ({
      time: new Date(l.timestamp).toLocaleTimeString(),
      risk: l.risk_score
  }));

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
                <button onClick={() => navigate('/admin')} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full">
                    <ArrowLeft className="h-5 w-5" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        Investigating: {username}
                        {userStatus === 'locked' && <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-800 text-xs">LOCKED</span>}
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">User Profile & Activity Timeline</p>
                </div>
            </div>
            <div>
                <button 
                    onClick={toggleLock}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors font-medium ${
                        userStatus === 'locked' 
                        ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                        : 'bg-red-100 text-red-700 hover:bg-red-200'
                    }`}
                >
                    {userStatus === 'locked' ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                    {userStatus === 'locked' ? 'Unlock Account' : 'Lock Account'}
                </button>
            </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Events</p>
                <p className="text-2xl font-bold">{totalLogins}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                <p className="text-sm text-gray-500 dark:text-gray-400">Failed Attempts</p>
                <p className="text-2xl font-bold text-red-500">{failedAttempts}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                <p className="text-sm text-gray-500 dark:text-gray-400">Avg Risk Score</p>
                <p className={`text-2xl font-bold ${avgRisk > 50 ? 'text-amber-500' : 'text-green-500'}`}>{avgRisk}</p>
            </div>
        </div>

        {/* Risk Timeline Chart */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
            <h3 className="text-lg font-semibold mb-4">Risk Timeline</h3>
            <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                        <XAxis dataKey="time" stroke="#9CA3AF" fontSize={10} />
                        <YAxis stroke="#9CA3AF" fontSize={10} />
                        <Tooltip 
                            contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px', color: '#F3F4F6' }}
                        />
                        <Line type="monotone" dataKey="risk" stroke="#8B5CF6" strokeWidth={2} dot={false} />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>

        {/* Detailed Logs */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden border border-gray-100 dark:border-gray-700 mb-8">
            <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                <h3 className="font-semibold">Activity History</h3>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700/50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Time</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Action</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">IP</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Result</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Risk</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {currentLogs.map(log => (
                            <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 font-mono">
                                    {new Date(log.timestamp).toLocaleString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{log.action}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 font-mono">{log.ip_address}</td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                                        log.status === 'SUCCESS' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                        'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                    }`}>
                                        {log.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold">{log.risk_score}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            
            {/* Pagination Controls */}
            <div className="bg-gray-50 dark:bg-gray-700/30 px-6 py-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                  Showing <span className="font-medium text-gray-900 dark:text-gray-200">{indexOfFirstLog + 1}</span> to <span className="font-medium text-gray-900 dark:text-gray-200">{Math.min(indexOfLastLog, logs.length)}</span> of <span className="font-medium text-gray-900 dark:text-gray-200">{logs.length}</span> results
              </div>
              <div className="flex gap-2">
                  <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                      <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages || totalPages === 0}
                      className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                      <ChevronRight className="h-4 w-4" />
                  </button>
              </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default InvestigationPage;

