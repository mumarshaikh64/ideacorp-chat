import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import KPIStats from '../components/admin/KPIStats';
import Badge from '../components/common/Badge';
import { MessageSquare, ArrowRight, UserCheck, Radio, AlertTriangle, ArrowRightLeft } from 'lucide-react';
import { getSocket } from '../services/socket';
import TransferModal from '../components/admin/TransferModal';

export default function AdminDashboardPage() {
  const [kpis, setKpis] = useState({});
  const [activeConversations, setActiveConversations] = useState([]);
  const [agents, setAgents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [offlineAlerts, setOfflineAlerts] = useState([]);
  const [transferTargetConv, setTransferTargetConv] = useState(null);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const navigate = useNavigate();

  const loadDashboardData = async () => {
    try {
      const [kpiRes, convRes, agentsRes] = await Promise.all([
        api.get('/conversations/kpi/summary'),
        api.get('/conversations?status=open&limit=10'),
        api.get('/users?role=agent')
      ]);

      setKpis(kpiRes.data);
      setActiveConversations(convRes.data.conversations || []);
      setAgents(agentsRes.data.users || []);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();

    // Listen to real-time admin feed updates
    const socket = getSocket();
    if (socket) {
      socket.on('admin:dashboard_update', () => {
        loadDashboardData();
      });
      socket.on('agent:status_changed', () => {
        loadDashboardData();
      });
      socket.on('admin:offline_agent_handoff', (alert) => {
        setOfflineAlerts((prev) => [alert, ...prev]);
        loadDashboardData();
      });
    }

    return () => {
      if (socket) {
        socket.off('admin:dashboard_update');
        socket.off('agent:status_changed');
        socket.off('admin:offline_agent_handoff');
      }
    };
  }, []);

  return (
    <div className="space-y-6">
      {/* Super Admin Alert Banner for Offline Assigned Agents */}
      {offlineAlerts.length > 0 && (
        <div className="space-y-3">
          {offlineAlerts.map((alert, idx) => (
            <div
              key={idx}
              className="p-4 bg-gradient-to-r from-amber-500 via-rose-500 to-rose-600 text-white rounded-2xl shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fadeIn border border-white/20"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-5 h-5 text-white animate-bounce" />
                </div>
                <div>
                  <div className="font-bold text-sm flex items-center gap-2">
                    <span>Customer Requested Live Agent</span>
                    <span className="px-2 py-0.5 bg-black/25 text-white text-[10px] rounded-full uppercase tracking-wider font-semibold">
                      Assigned Agent Offline
                    </span>
                  </div>
                  <div className="text-xs text-white/90 mt-0.5">
                    Customer: <span className="font-semibold">{alert.customerName || 'Customer'}</span> ({alert.customerPhone}) • Assigned: <span className="font-semibold">{alert.agentName}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 self-end sm:self-center">
                <button
                  onClick={() => {
                    setTransferTargetConv({
                      id: alert.conversationId,
                      customer_name: alert.customerName,
                      customer_phone: alert.customerPhone
                    });
                    setIsTransferModalOpen(true);
                  }}
                  className="px-4 py-2 bg-white text-rose-700 hover:bg-rose-50 rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  <span>Transfer Chat to Online Agent</span>
                </button>
                <button
                  onClick={() => setOfflineAlerts(prev => prev.filter((_, i) => i !== idx))}
                  className="p-2 hover:bg-white/20 rounded-xl transition-all text-white/80 hover:text-white"
                  title="Dismiss alert"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* KPI Overview Cards */}
      <KPIStats kpis={kpis} />

      {/* Grid: Active Live Conversations + Agent Presence Roster */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Conversations Stream (2 Columns) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-telecom-50 text-telecom-600 flex items-center justify-center">
                <Radio className="w-4 h-4 animate-pulse" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">Active Live Chats</h3>
                <p className="text-xs text-slate-400">Real-time customer sessions in progress</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/admin/conversations')}
              className="text-xs font-semibold text-telecom-600 hover:text-telecom-700 flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {activeConversations.length === 0 ? (
            <div className="py-12 text-center">
              <MessageSquare className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-600">No active chats at the moment</p>
              <p className="text-xs text-slate-400 mt-1">Send an SMS invite to start a live support conversation</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {activeConversations.map((conv) => (
                <div
                  key={conv.id}
                  className="py-3.5 flex items-center justify-between hover:bg-slate-50/60 rounded-xl px-2 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-telecom-100 text-telecom-700 font-bold flex items-center justify-center text-sm">
                      {conv.customer_name ? conv.customer_name.charAt(0) : 'C'}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">
                        {conv.customer_name || 'Customer'}
                      </h4>
                      <p className="text-[11px] text-slate-500">{conv.customer_phone}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1 italic">
                        "{conv.last_message || 'Session open'}"
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-medium text-slate-600 block">
                      Agent: <span className="font-semibold text-slate-800">{conv.current_agent_name || 'Unassigned'}</span>
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {conv.last_message_at ? new Date(conv.last_message_at).toLocaleTimeString() : ''}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Agent Presence Roster (1 Column) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-emerald-600" />
              <h3 className="text-base font-bold text-slate-800">Agent Roster</h3>
            </div>
            <span className="text-xs font-semibold text-slate-500">
              {agents.filter(a => a.status === 'online').length} Online
            </span>
          </div>

          <div className="space-y-3">
            {agents.map((agent) => (
              <div
                key={agent.id}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-50/70 border border-slate-100"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-xs">
                    {agent.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">{agent.name}</p>
                    <p className="text-[10px] text-slate-400">{agent.email}</p>
                  </div>
                </div>
                <Badge variant={agent.status} size="sm">
                  {agent.status}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Transfer Chat Modal */}
      <TransferModal
        isOpen={isTransferModalOpen}
        onClose={() => {
          setIsTransferModalOpen(false);
          setTransferTargetConv(null);
          loadDashboardData();
        }}
        conversation={transferTargetConv}
      />
    </div>
  );
}
