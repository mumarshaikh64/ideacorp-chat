import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Download, BarChart3, TrendingUp, Users, CheckCircle, Clock } from 'lucide-react';

export default function ReportsPage() {
  const [analytics, setAnalytics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        const res = await api.get('/reports/analytics');
        setAnalytics(res.data);
      } catch (err) {
        console.error('Failed to load reports:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadAnalytics();
  }, []);

  const handleDownloadCSV = () => {
    const token = localStorage.getItem('ideacrop_token');
    const url = `/api/reports/export`;
    // Trigger download via anchor
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `conversations_report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Export Action */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-800">Support & Sales Analytics</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time chat metrics, agent performance, and SMS invite conversion rates
          </p>
        </div>

        <button
          onClick={handleDownloadCSV}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-sm transition-all"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Conversations (CSV)</span>
        </button>
      </div>

      {/* Metrics Row */}
      {analytics && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">SMS Invites Sent</p>
                <h3 className="text-2xl font-bold text-slate-800 mt-1">{analytics.conversion?.totalInvites || 0}</h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-telecom-50 text-telecom-600 flex items-center justify-center">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Chats Initiated</p>
                <h3 className="text-2xl font-bold text-slate-800 mt-1">{analytics.conversion?.usedInvites || 0}</h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle className="w-5 h-5" />
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">SMS Conversion Rate</p>
                <h3 className="text-2xl font-bold text-indigo-600 mt-1">{analytics.conversion?.conversionRate || '0%'}</h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <BarChart3 className="w-5 h-5" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Agent Performance Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center gap-2">
          <Users className="w-4 h-4 text-slate-600" />
          <h4 className="text-sm font-bold text-slate-800">Sales Agent Performance Roster</h4>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Agent Name</th>
                <th className="py-3 px-4">Total Chats</th>
                <th className="py-3 px-4">Active Now</th>
                <th className="py-3 px-4">Resolved / Closed</th>
                <th className="py-3 px-4">Avg Handling Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan="5" className="py-8 text-center text-slate-400">Loading performance data...</td>
                </tr>
              ) : !analytics?.agentPerformance?.length ? (
                <tr>
                  <td colSpan="5" className="py-8 text-center text-slate-400">No agent data recorded yet.</td>
                </tr>
              ) : (
                analytics.agentPerformance.map((agent) => (
                  <tr key={agent.agent_id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      {agent.agent_name}
                      <span className="block text-[10px] text-slate-400 font-normal">{agent.agent_email}</span>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-semibold">{agent.total_chats}</td>
                    <td className="py-3.5 px-4 font-mono text-emerald-600 font-semibold">{agent.active_chats}</td>
                    <td className="py-3.5 px-4 font-mono text-slate-600">{agent.closed_chats}</td>
                    <td className="py-3.5 px-4 text-slate-600 font-medium">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{agent.avg_handling_minutes} mins</span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
