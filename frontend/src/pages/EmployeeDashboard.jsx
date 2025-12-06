import { useNavigate } from 'react-router-dom';
import { LogOut, Briefcase, FileText, Calendar, MessageSquare, UserCircle, Bell } from 'lucide-react';

import { useAuth } from '../context/AuthContext';

const EmployeeDashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-2">
                <div className="bg-blue-600 p-1.5 rounded-lg">
                  <Briefcase className="h-5 w-5 text-white" />
                </div>
                <span className="font-bold text-gray-900 text-lg">CorpNet</span>
              </div>
              
              <div className="hidden md:flex items-center space-x-1">
                {['Dashboard', 'Documents', 'Teams', 'HR Portal'].map((item, i) => (
                  <a 
                    key={item}
                    href="#" 
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      i === 0 ? 'text-blue-600 bg-blue-50' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    {item}
                  </a>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button className="p-2 text-gray-400 hover:text-gray-500 relative">
                <Bell className="h-5 w-5" />
                <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-red-500 rounded-full border border-white"></span>
              </button>
              <div className="h-6 w-px bg-gray-200 hidden sm:block"></div>
              
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-medium text-sm">
                    {user?.username?.charAt(0).toUpperCase() || 'E'}
                  </div>
                  <span className="text-sm font-medium text-gray-700 hidden sm:block">
                    {user?.username || 'Employee'}
                  </span>
                </div>
                <button 
                  onClick={handleLogout}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  title="Sign out"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
           <h1 className="text-2xl font-bold text-gray-900">Welcome back, {user?.username}!</h1>
           <p className="text-gray-500 mt-1">Here's what's happening in your workspace today.</p>
        </div>

        {/* Mock ERP Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main Widget */}
          <div className="md:col-span-2 space-y-6">
            <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-semibold text-gray-900">Recent Activity</h2>
                <button className="text-sm text-blue-600 font-medium hover:text-blue-700">View All</button>
              </div>
              <div className="space-y-6">
                {[
                  { title: 'Q4 Financial Report updated', time: '2 hours ago', icon: FileText, color: 'bg-blue-100 text-blue-600' },
                  { title: 'Team meeting scheduled', time: '4 hours ago', icon: Calendar, color: 'bg-purple-100 text-purple-600' },
                  { title: 'New policy document available', time: 'Yesterday', icon: Briefcase, color: 'bg-green-100 text-green-600' },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-4">
                    <div className={`p-2 rounded-lg ${item.color} flex-shrink-0`}>
                      <item.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{item.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{item.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
               <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 p-6 hover:shadow-md transition-shadow cursor-pointer border-l-4 border-blue-500">
                 <h3 className="font-semibold text-gray-900 mb-1">Payroll Portal</h3>
                 <p className="text-sm text-gray-500">View payslips and tax documents</p>
               </div>
               <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 p-6 hover:shadow-md transition-shadow cursor-pointer border-l-4 border-indigo-500">
                 <h3 className="font-semibold text-gray-900 mb-1">IT Support</h3>
                 <p className="text-sm text-gray-500">Submit tickets and view status</p>
               </div>
            </div>
          </div>

          {/* Sidebar Widgets */}
          <div className="space-y-6">
             <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 p-6">
               <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
               <div className="space-y-2">
                 {['Request Time Off', 'Book Meeting Room', 'Update Profile', 'View Directory'].map(action => (
                   <button key={action} className="w-full text-left px-4 py-2.5 rounded-lg text-sm text-gray-700 hover:bg-gray-50 hover:text-blue-600 transition-colors font-medium border border-transparent hover:border-gray-200">
                     {action}
                   </button>
                 ))}
               </div>
             </div>

             <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl shadow-lg p-6 text-white">
                <div className="flex items-center gap-3 mb-3">
                  <UserCircle className="h-6 w-6 text-blue-400" />
                  <h3 className="font-semibold">Security Status</h3>
                </div>
                <p className="text-sm text-slate-300 mb-4">Your account is currently secure. Last login was from {user?.last_known_country || 'Unknown Location'}.</p>
                <div className="flex items-center gap-2 text-xs text-green-400 bg-white/10 px-3 py-1.5 rounded-full w-fit">
                   <span className="h-1.5 w-1.5 bg-green-400 rounded-full"></span>
                   MFA Enabled
                </div>
             </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default EmployeeDashboard;

