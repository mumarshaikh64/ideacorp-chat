import React from 'react';
import { MessageSquare, Users, CheckCircle, Clock } from 'lucide-react';

export default function KPIStats({ kpis = {} }) {
  const cards = [
    {
      title: 'Active Live Chats',
      value: kpis.openConversations ?? 0,
      icon: MessageSquare,
      color: 'text-telecom-600',
      bg: 'bg-telecom-50'
    },
    {
      title: 'Online Agents',
      value: kpis.onlineAgentsCount ?? 0,
      icon: Users,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50'
    },
    {
      title: "Today's Volume",
      value: kpis.todayConversations ?? 0,
      icon: Clock,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50'
    },
    {
      title: 'Total Handled',
      value: kpis.totalConversations ?? 0,
      icon: CheckCircle,
      color: 'text-amber-600',
      bg: 'bg-amber-50'
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div key={idx} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{card.title}</p>
              <h3 className="text-2xl font-bold text-slate-800 mt-1">{card.value}</h3>
            </div>
            <div className={`w-12 h-12 rounded-2xl ${card.bg} flex items-center justify-center ${card.color}`}>
              <Icon className="w-6 h-6" />
            </div>
          </div>
        );
      })}
    </div>
  );
}
