import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, LogOut, Activity, Users, AlertTriangle, Server, Search, CheckCircle, XCircle, Trash2, ChevronLeft, ChevronRight, Wand2 } from 'lucide-react';

import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

import LogDetailModal from '../components/LogDetailModal';
import LocationDetailsModal from '../components/LocationDetailsModal';
import CyberGlobe from '../components/CyberGlobe';
import SecurityAnalytics from '../components/SecurityAnalytics';

import ThemeToggle from '../components/ThemeToggle';

import UserActionMenu from '../components/UserActionMenu';

const AdminDashboard = () => {
  console.log("Rendering AdminDashboard...");
  const navigate = useNavigate();
  const { user, logout, token } = useAuth();
  const [logs, setLogs] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  
  // Logs Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const logsPerPage = 10;

  // Sessions Pagination State
  const [currentSessionPage, setCurrentSessionPage] = useState(1);
  const sessionsPerPage = 5;

  // Calculate Logs Pagination
  const indexOfLastLog = currentPage * logsPerPage;
  const indexOfFirstLog = indexOfLastLog - logsPerPage;
  const currentLogs = logs.slice(indexOfFirstLog, indexOfLastLog);
  const totalPages = Math.ceil(logs.length / logsPerPage);

  // Calculate Sessions Pagination
  const indexOfLastSession = currentSessionPage * sessionsPerPage;
  const indexOfFirstSession = indexOfLastSession - sessionsPerPage;
  const currentSessions = sessions.slice(indexOfFirstSession, indexOfLastSession);
  const totalSessionPages = Math.ceil(sessions.length / sessionsPerPage);

  const handlePointClick = (pointData) => {
      console.log("Dashboard received click:", pointData);
      if (pointData && pointData.events) {
          setSelectedLocation(pointData);
      }
  };

  const fetchSessions = async () => {
    try {
        const { data } = await api.get('/admin/sessions');
        setSessions(data);
    } catch (error) {
        console.error("Failed to refresh sessions:", error);
    }
  };

  // WebSocket connection for Real-time Logs and Session Updates
  useEffect(() => {
    if (!token) return;

    const wsUrl = `ws://localhost:8000/ws/notifications?token=${token}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
        // console.log('Dashboard WS Connected');
    };

    ws.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            if (data.type === 'NEW_LOG') {
                setLogs((prevLogs) => {
                    const exists = prevLogs.some(log => log.id === data.log.id);
                    if (exists) return prevLogs;
                    
                    const newLogs = [data.log, ...prevLogs];
                    return newLogs.slice(0, 50); // Keep last 50
                });
            } else if (data.type === 'SESSION_UPDATE') {
                fetchSessions();
            }
        } catch (e) {
            console.error("WS Parse Error", e);
        }
    };

    return () => {
        ws.close();
    };
  }, [token]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [logsRes, sessionsRes] = await Promise.all([
          api.get('/admin/logs'),
          api.get('/admin/sessions')
        ]);
        setLogs(logsRes.data);
        setSessions(sessionsRes.data);
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoading(false);
      }
    };

    // Initial fetch
    fetchData();

    // Set up interval for periodic refresh (every 30 seconds)
    const intervalId = setInterval(fetchData, 30000);

    return () => clearInterval(intervalId);
  }, []);

  const handleStatusChange = () => {
      // Refresh data when a user status changes via UserActionMenu
      // We can just re-fetch or use a more targeted update if needed
      api.get('/admin/logs').then(res => setLogs(res.data));
      api.get('/admin/sessions').then(res => setSessions(res.data));
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const handleKillSession = async (sessionId) => {
    if (!window.confirm('Are you sure you want to terminate this session?')) return;
    
    try {
      await api.delete(`/admin/sessions/${sessionId}`);
      // Optimistic UI update removed in favor of WS event
      // setSessions(prev => prev.filter(s => s.id !== sessionId));
      alert("Session terminated successfully.");
    } catch (error) {
      console.error("Failed to terminate session:", error);
      alert('Failed to terminate session.');
    }
  };

  const handleLogUpdate = (updatedLog) => {
      setLogs(prev => prev.map(log => log.id === updatedLog.id ? updatedLog : log));
      setSelectedLog(updatedLog);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  };

  const parseUA = (ua) => {
    if (!ua) return 'Unknown Device';
    let browser = 'Unknown';
    let os = 'Unknown';
    
    // Advanced Browser Detection
    if (ua.includes("Edg")) browser = "Microsoft Edge";
    else if (ua.includes("OPR")) browser = "Opera";
    else if (ua.includes("Chrome")) browser = "Google Chrome";
    else if (ua.includes("Safari")) browser = "Safari";
    else if (ua.includes("Firefox")) browser = "Firefox";

    if (ua.includes("Win")) os = "Windows";
    else if (ua.includes("Mac")) os = "MacOS";
    else if (ua.includes("Linux")) os = "Linux";
    else if (ua.includes("Android")) os = "Android";
    else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";

    return `${browser} on ${os}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 font-sans text-gray-900 dark:text-gray-100 transition-colors duration-200">
      {/* Navbar */}
      <nav className="sticky top-0 z-30 w-full bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-600 p-1.5 rounded-lg shadow-sm">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <span className="text-lg font-bold tracking-tight text-gray-900 dark:text-white hidden sm:block">
                USAG <span className="text-gray-500 dark:text-gray-400 font-medium">Admin Portal</span>
              </span>
            </div>
            
            <div className="flex items-center gap-4">
              <button 
                onClick={() => navigate('/admin/rules')}
                className="hidden md:flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors"
              >
                <Wand2 className="h-4 w-4" />
                Rules AI
              </button>
              <button 
                onClick={() => navigate('/admin/security')}
                className="hidden md:flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors"
              >
                <Shield className="h-4 w-4" />
                Security Mgmt
              </button>
              
              <div className="flex items-center gap-3">
                <ThemeToggle />
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{user?.username || 'Administrator'}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Security Ops</p>
                </div>
                <button 
                  onClick={handleLogout}
                  className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:text-gray-400 dark:hover:bg-red-900/20 dark:hover:text-red-400 rounded-lg transition-colors"
                  title="Sign out"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
        {selectedLog && (
          <LogDetailModal 
              log={selectedLog} 
              onClose={() => setSelectedLog(null)} 
              onStatusUpdate={handleLogUpdate}
          />
        )}
        {selectedLocation && (
          <LocationDetailsModal data={selectedLocation} onClose={() => setSelectedLocation(null)} />
        )}
        {/* Header Section */}
        <div className="sm:flex sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Security Overview</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Real-time monitoring of threat vectors and access logs.</p>
          </div>
          <div className="mt-4 sm:mt-0 flex gap-3">
             <div className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-gray-800 rounded-full border border-gray-200 dark:border-gray-700 shadow-sm">
                <span className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></span>
                <span className="text-xs font-medium text-gray-600 dark:text-gray-300">Live Monitoring</span>
             </div>
          </div>
        </div>

        {/* Cyber Globe Visualization */}
        <div className="h-[500px] w-full mb-8 relative">
           {loading || !logs || !sessions ? (
               <div className="absolute inset-0 flex items-center justify-center bg-slate-900 rounded-xl text-white">
                   <div className="flex flex-col items-center gap-2">
                       <div className="w-8 h-8 border-4 border-t-indigo-500 border-b-transparent border-l-transparent border-r-transparent rounded-full animate-spin"></div>
                       <p className="text-sm font-medium text-gray-400">Initializing Threat Map...</p>
                   </div>
               </div>
           ) : (
               <CyberGlobe logs={logs} sessions={sessions} onPointClick={handlePointClick} />
           )}
        </div>

        {/* Stats Grid (Mock Data for now) */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { label: 'Total Logins', value: logs.length, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
            { label: 'High Risk Events', value: logs.filter(l => l.risk_score > 50).length, icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20' },
            { label: 'Recent Failures', value: logs.filter(l => l.status === 'FAILURE').length, icon: Shield, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20' },
          ].map((stat) => (
            <div key={stat.label} className="overflow-hidden rounded-xl bg-white dark:bg-gray-800 p-6 shadow-sm ring-1 ring-gray-900/5 dark:ring-white/10 transition-all hover:shadow-md">
              <div className="flex items-center gap-4">
                <div className={`rounded-lg p-3 ${stat.bg}`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{stat.label}</p>
                  <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stat.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Security Analytics Charts */}
        <SecurityAnalytics logs={logs} />

        {/* Logs Table Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm ring-1 ring-gray-900/5 dark:ring-white/10 overflow-hidden mb-8">
          <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Active User Sessions</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Location</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">IP Address</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Device</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Login Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {sessions.length === 0 ? (
                  <tr><td colSpan="6" className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">No active sessions</td></tr>
                ) : (
                  currentSessions.map((session) => (
                    <tr key={session.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-700 dark:text-green-400 font-bold text-xs mr-3">
                            {session.username.charAt(0).toUpperCase()}
                          </div>
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              <UserActionMenu 
                                  username={session.username} 
                                  ip={session.ip_address} 
                                  isLocked={session.user_is_locked}
                                  onStatusChange={handleStatusChange}
                              />
                              <span className="ml-2">{session.username}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{session.location}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 font-mono">{session.ip_address}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{parseUA(session.device)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{formatDate(session.login_time)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                         <button
                           onClick={() => handleKillSession(session.id)}
                           disabled={session.username === user?.username}
                           className={`p-2 rounded-lg transition-colors ${
                             session.username === user?.username
                               ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                               : 'text-gray-500 dark:text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 dark:hover:text-red-400'
                           }`}
                           title={session.username === user?.username ? "Cannot terminate current session" : "Terminate Session"}
                         >
                           <Trash2 className="h-5 w-5" />
                         </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* Session Pagination Controls */}
          <div className="bg-gray-50 dark:bg-gray-700/30 px-6 py-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                  Showing <span className="font-medium text-gray-900 dark:text-gray-200">{indexOfFirstSession + 1}</span> to <span className="font-medium text-gray-900 dark:text-gray-200">{Math.min(indexOfLastSession, sessions.length)}</span> of <span className="font-medium text-gray-900 dark:text-gray-200">{sessions.length}</span> results
              </div>
              <div className="flex gap-2">
                  <button
                      onClick={() => setCurrentSessionPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentSessionPage === 1}
                      className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                      <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                      onClick={() => setCurrentSessionPage(prev => Math.min(prev + 1, totalSessionPages))}
                      disabled={currentSessionPage === totalSessionPages || totalSessionPages === 0}
                      className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                      <ChevronRight className="h-4 w-4" />
                  </button>
              </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm ring-1 ring-gray-900/5 dark:ring-white/10 overflow-hidden">
          <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Access Logs</h3>
            <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">Auto-refreshing</span>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Timestamp</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">User</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Event</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">IP Address</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Risk Score</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-10 text-center text-gray-500 dark:text-gray-400">Loading logs...</td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-10 text-center text-gray-500 dark:text-gray-400">No logs found.</td>
                  </tr>
                ) : (
                  currentLogs.map((log) => (
                    <tr 
                      key={log.id} 
                      onClick={() => setSelectedLog(log)}
                      className={`cursor-pointer transition-colors ${
                        log.risk_score > 50 || log.status === 'FAILURE' 
                          ? 'bg-red-50/30 hover:bg-red-50 dark:bg-red-900/10 dark:hover:bg-red-900/20' 
                          : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                      }`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 font-mono">
                        {formatDate(log.timestamp)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-700 dark:text-indigo-400 font-bold text-xs mr-3">
                            {log.username.charAt(0).toUpperCase()}
                          </div>
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100" onClick={(e) => e.stopPropagation()}>
                              <UserActionMenu 
                                  username={log.username} 
                                  ip={log.ip_address} 
                                  isLocked={log.user_is_locked}
                                  onStatusChange={handleStatusChange}
                              />
                              <span className="ml-2">{log.username}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                        {log.action}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 font-mono">
                        {log.ip_address}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          log.status === 'SUCCESS' 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                            : log.status === 'MFA_REQ' 
                              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                              : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                        }`}>
                          {log.status === 'SUCCESS' ? (
                            <CheckCircle className="w-3 h-3 mr-1" />
                          ) : log.status === 'MFA_REQ' ? (
                            <Shield className="w-3 h-3 mr-1" />
                          ) : (
                            <XCircle className="w-3 h-3 mr-1" />
                          )}
                          {log.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 w-16 mr-2">
                            <div 
                              className={`h-1.5 rounded-full ${
                                log.risk_score >= 20 ? 'bg-red-600' : 
                                log.risk_score >= 15 ? 'bg-orange-500' : 
                                log.risk_score >= 10 ? 'bg-yellow-500' : 'bg-green-500'
                              }`} 
                              style={{ width: `${Math.min((log.risk_score / 25) * 100, 100)}%` }}
                            ></div>
                          </div>
                          <span className={`text-xs font-bold ${
                             log.risk_score >= 20 ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'
                          }`}>
                            {log.risk_score}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
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
      </main>
    </div>
  );
};

export default AdminDashboard;
