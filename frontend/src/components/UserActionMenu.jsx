
import React, { useState } from 'react';
import { MoreVertical, Search, Ban, UserX, AlertTriangle, Unlock, Lock } from 'lucide-react';
import api from '../api/axios';

const UserActionMenu = ({ username, ip, isLocked = false, onStatusChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!username) return null;

  const handleToggleLock = async () => {
    if (!username) return;
    const action = isLocked ? 'unlock' : 'lock';
    const confirmMsg = isLocked 
        ? `Unlock account ${username}?` 
        : `LOCK account ${username}? They will be logged out immediately.`;
    
    if (!window.confirm(confirmMsg)) return;
    
    setLoading(true);
    try {
        await api.post(`/admin/users/${username}/${action}`);
        alert(`User ${username} ${action}ed successfully.`);
        if (onStatusChange) onStatusChange(); // Refresh parent data
    } catch (error) {
        console.error(`Failed to ${action} user:`, error);
        alert(`Failed to ${action} user.`);
    } finally {
        setLoading(false);
        setIsOpen(false);
    }
  };

  const handleBanIp = async () => {
    if (!ip) return;
    const reason = window.prompt(`Ban IP ${ip}? Enter reason:`, "Malicious Activity");
    if (!reason) return;

    setLoading(true);
    try {
        await api.post('/admin/ban-ip', { ip_address: ip, reason });
        alert(`IP ${ip} banned successfully.`);
    } catch (error) {
        console.error("Failed to ban IP:", error);
        alert("Failed to ban IP.");
    } finally {
        setLoading(false);
        setIsOpen(false);
    }
  };

  const handleInvestigate = () => {
      // Navigate to investigation page (not yet implemented fully in router, but link is ready)
      // For now, maybe just log or alert
      window.location.href = `/admin/investigate/${username}`;
  };

  return (
    <div className="relative inline-block text-left">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors"
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-[50]" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 z-[60] mt-2 w-48 origin-top-right rounded-md bg-white dark:bg-gray-800 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none border border-gray-100 dark:border-gray-700">
            <div className="py-1">
              <button
                onClick={handleInvestigate}
                className="flex w-full items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <Search className="mr-2 h-4 w-4 text-blue-500" />
                Investigate User
              </button>
              <button
                onClick={handleToggleLock}
                disabled={loading}
                className={`flex w-full items-center px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${
                    isLocked 
                    ? 'text-green-600 dark:text-green-400' 
                    : 'text-amber-600 dark:text-amber-500'
                }`}
              >
                {isLocked ? <Unlock className="mr-2 h-4 w-4" /> : <Lock className="mr-2 h-4 w-4" />}
                {isLocked ? 'Unlock Account' : 'Block Account'}
              </button>
              <button
                onClick={handleBanIp}
                disabled={loading}
                className="flex w-full items-center px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <Ban className="mr-2 h-4 w-4" />
                Ban IP Address
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default UserActionMenu;

