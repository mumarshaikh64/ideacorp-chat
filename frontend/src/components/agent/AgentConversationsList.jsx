import React, { useState } from 'react';
import { Search, MessageSquare, Clock, Phone } from 'lucide-react';
import Badge from '../common/Badge';

export default function AgentConversationsList({
  conversations = [],
  activeConversation,
  onSelectConversation,
  isLoading
}) {
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = conversations.filter((c) => {
    const term = searchTerm.toLowerCase();
    return (
      (c.customer_name && c.customer_name.toLowerCase().includes(term)) ||
      (c.customer_phone && c.customer_phone.includes(term)) ||
      (c.last_message && c.last_message.toLowerCase().includes(term))
    );
  });

  return (
    <div className="w-80 bg-white border-r border-slate-200 flex flex-col h-full flex-shrink-0">
      {/* Search Header */}
      <div className="p-3.5 border-b border-slate-100">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search active chats..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-telecom-500 focus:bg-white"
          />
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
        {isLoading ? (
          <div className="p-6 text-center text-xs text-slate-400">Loading chats...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center">
            <MessageSquare className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-600">No active chats</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Send an SMS invite or wait for incoming chats
            </p>
          </div>
        ) : (
          filtered.map((conv) => {
            const isSelected = activeConversation?.id === conv.id;
            return (
              <button
                key={conv.id}
                onClick={() => onSelectConversation(conv)}
                className={`w-full text-left p-3.5 transition-all flex items-start gap-3 hover:bg-slate-50 ${
                  isSelected ? 'bg-telecom-50/80 border-r-4 border-telecom-600' : ''
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-telecom-100 text-telecom-700 flex items-center justify-center font-bold text-sm flex-shrink-0">
                  {conv.customer_name ? conv.customer_name.charAt(0) : 'C'}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <h4 className="text-xs font-bold text-slate-800 truncate">
                        {conv.customer_name || 'Customer'}
                      </h4>
                      {conv.handling_mode === 'ai' ? (
                        <span className="px-1.5 py-0.2 bg-indigo-50 text-indigo-700 border border-indigo-200 font-semibold rounded text-[9px] flex-shrink-0">
                          🤖 AI
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.2 bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold rounded text-[9px] flex-shrink-0">
                          👨‍💼 Live
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 flex items-center gap-0.5 flex-shrink-0">
                      <Clock className="w-2.5 h-2.5" />
                      {conv.last_message_at
                        ? new Date(conv.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : ''}
                    </span>
                  </div>

                  {conv.handoff_requested && (
                    <div className="mb-1.5">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-500 text-white font-bold rounded-full text-[10px] animate-pulse shadow-xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                        Human Requested
                      </span>
                    </div>
                  )}

                  <p className="text-[11px] text-slate-500 truncate mb-1">
                    {conv.last_message || 'Started chat session'}
                  </p>

                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                    <Phone className="w-2.5 h-2.5" />
                    <span>{conv.customer_phone}</span>
                    <Badge variant={conv.status} size="sm">
                      {conv.status}
                    </Badge>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
