import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Headphones, 
  MessageSquare, 
  Users, 
  UserCheck, 
  BarChart3, 
  Settings, 
  LogOut,
  Radio,
  Megaphone,
  Hash
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import Badge from '../common/Badge';

export default function Sidebar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/admin', icon: LayoutDashboard, roles: ['admin', 'supervisor', 'agent', 'viewer'] },
    { name: 'Agent Desk', path: '/admin/agent-desk', icon: Headphones, roles: ['admin', 'supervisor', 'agent'] },
    { name: 'Numbers Inventory', path: '/admin/numbers', icon: Hash, roles: ['admin', 'supervisor', 'agent', 'viewer'] },
    { name: 'Bulk Campaigns', path: '/admin/campaigns', icon: Megaphone, roles: ['admin', 'supervisor', 'agent'] },
    { name: 'Conversations', path: '/admin/conversations', icon: MessageSquare, roles: ['admin', 'supervisor', 'agent', 'viewer'] },
    { name: 'Customers (CRM)', path: '/admin/customers', icon: Users, roles: ['admin', 'supervisor', 'agent', 'viewer'] },
    { name: 'Users & Agents', path: '/admin/users', icon: UserCheck, roles: ['admin', 'supervisor'] },
    { name: 'Reports', path: '/admin/reports', icon: BarChart3, roles: ['admin', 'supervisor', 'viewer'] },
    { name: 'Settings', path: '/admin/settings', icon: Settings, roles: ['admin'] }
  ];

  const filteredItems = navItems.filter(item => 
    !user || item.roles.includes(user.role)
  );

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col flex-shrink-0 h-screen border-r border-slate-800">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 gap-3 border-b border-slate-800">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-telecom-600 to-telecom-400 flex items-center justify-center text-white shadow-lg shadow-telecom-500/30">
          <Radio className="w-5 h-5 animate-pulse" />
        </div>
        <div>
          <h1 className="text-base font-bold text-white tracking-tight leading-none">IdeaCrop</h1>
          <span className="text-[10px] text-telecom-400 font-semibold tracking-wider uppercase">Telecom Live Chat</span>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {filteredItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/admin'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-telecom-600 text-white font-semibold shadow-md shadow-telecom-900/40'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              <span>{item.name}</span>
            </NavLink>
          );
        })}
      </div>

      {/* User & Role Footer */}
      {user && (
        <div className="p-4 border-t border-slate-800 bg-slate-950/50">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5 truncate">
              <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-sm font-bold text-telecom-400 flex-shrink-0">
                {user.name.charAt(0)}
              </div>
              <div className="truncate">
                <p className="text-xs font-semibold text-white truncate">{user.name}</p>
                <div className="mt-0.5">
                  <Badge variant={user.role} size="sm">{user.role.toUpperCase()}</Badge>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-950/20 border border-transparent hover:border-rose-900/30 transition-all"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      )}
    </aside>
  );
}
