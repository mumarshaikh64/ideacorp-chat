import React from 'react';
import { Send, Circle } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

export default function Topbar({ title, onOpenInviteModal }) {
  const { user, updateStatus } = useAuthStore();

  const handleStatusChange = (e) => {
    updateStatus(e.target.value);
  };

  const getStatusColor = (status) => {
    if (status === 'online') return 'text-emerald-500';
    if (status === 'busy') return 'text-amber-500';
    return 'text-slate-400';
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between flex-shrink-0 z-10">
      <div className="flex items-center gap-3">
        <h2 className="text-xl font-bold text-slate-800 tracking-tight">{title}</h2>
      </div>

      <div className="flex items-center gap-4">
        {/* Agent Presence Status Selector */}
        {user && ['agent', 'admin', 'supervisor'].includes(user.role) && (
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs">
            <span className="text-slate-500 font-medium">Status:</span>
            <div className="flex items-center gap-1.5 font-semibold">
              <Circle className={`w-2.5 h-2.5 fill-current ${getStatusColor(user.status)}`} />
              <select
                value={user.status || 'offline'}
                onChange={handleStatusChange}
                className="bg-transparent text-slate-700 font-semibold focus:outline-none cursor-pointer capitalize"
              >
                <option value="online">Online</option>
                <option value="busy">Busy</option>
                <option value="offline">Offline</option>
              </select>
            </div>
          </div>
        )}

        {/* Send SMS Invite Trigger */}
        {user && user.role !== 'viewer' && onOpenInviteModal && (
          <button
            onClick={onOpenInviteModal}
            className="flex items-center gap-2 px-4 py-2 bg-telecom-600 hover:bg-telecom-700 text-white rounded-xl text-xs font-semibold shadow-sm hover:shadow transition-all"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send SMS Invite</span>
          </button>
        )}
      </div>
    </header>
  );
}
