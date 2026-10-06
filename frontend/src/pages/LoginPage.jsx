import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Radio, Lock, Mail, ArrowRight, ShieldCheck } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoading, error } = useAuthStore();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    const res = await login(email, password);
    if (res.success) {
      navigate('/admin');
    }
  };

  const handleQuickFill = (userEmail, userPass) => {
    setEmail(userEmail);
    setPassword(userPass);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Decorative gradient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-telecom-600/20 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-telecom-600 to-telecom-400 flex items-center justify-center text-white shadow-xl shadow-telecom-500/30 mx-auto mb-4">
          <Radio className="w-8 h-8 animate-pulse" />
        </div>
        <h2 className="text-3xl font-extrabold text-white tracking-tight">IdeaCrop Telecom</h2>
        <p className="mt-2 text-xs text-slate-400">
          Real-Time SMS-to-Chat Platform • Staff Portal
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4">
        <div className="bg-slate-800/80 backdrop-blur-xl py-8 px-6 shadow-2xl rounded-3xl border border-slate-700/60 sm:px-10">
          <form className="space-y-4" onSubmit={handleLogin}>
            {error && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-400 font-medium">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="agent.sarah@ideacrop.com"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-900/60 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-telecom-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-900/60 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-telecom-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 px-4 bg-telecom-600 hover:bg-telecom-500 active:scale-[0.99] text-white rounded-xl text-sm font-semibold shadow-lg shadow-telecom-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              <span>{isLoading ? 'Signing In...' : 'Sign In to Dashboard'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick-Fill Demo Accounts */}
          <div className="mt-6 pt-6 border-t border-slate-700/60">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center mb-3">
              Quick Demo Accounts
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleQuickFill('agent.sarah@ideacrop.com', 'Agent123!')}
                className="p-2 bg-slate-700/50 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-600/50 text-left transition-colors"
              >
                <div className="font-semibold text-white">Agent Sarah</div>
                <div className="text-[10px] text-telecom-400">Sales Agent</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickFill('agent.mike@ideacrop.com', 'Agent123!')}
                className="p-2 bg-slate-700/50 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-600/50 text-left transition-colors"
              >
                <div className="font-semibold text-white">Agent Mike</div>
                <div className="text-[10px] text-telecom-400">Sales Agent</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickFill('admin@ideacrop.com', 'Admin123!')}
                className="p-2 bg-slate-700/50 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-600/50 text-left transition-colors"
              >
                <div className="font-semibold text-purple-300">Administrator</div>
                <div className="text-[10px] text-slate-400">Full Access</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickFill('supervisor@ideacrop.com', 'Super123!')}
                className="p-2 bg-slate-700/50 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-600/50 text-left transition-colors"
              >
                <div className="font-semibold text-indigo-300">Supervisor</div>
                <div className="text-[10px] text-slate-400">Team Monitor</div>
              </button>
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-slate-500">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>RBAC Protected • Session Authenticated via JWT</span>
        </div>
      </div>
    </div>
  );
}
