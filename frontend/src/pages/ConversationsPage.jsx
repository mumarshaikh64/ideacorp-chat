import React, { useState, useEffect } from 'react';
import api from '../services/api';
import Badge from '../components/common/Badge';
import Modal from '../components/common/Modal';
import TransferModal from '../components/admin/TransferModal';
import { getSocket } from '../services/socket';
import { 
  Search, 
  Eye, 
  Phone, 
  User, 
  Calendar, 
  MessageSquare, 
  Download,
  ArrowRightLeft,
  AlertTriangle,
  Sparkles,
  Bot,
  UserCheck
} from 'lucide-react';

export default function ConversationsPage() {
  const [conversations, setConversations] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Transfer Modal State for Super Admin / Supervisor
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [transferTargetConv, setTransferTargetConv] = useState(null);
  const [offlineAlerts, setOfflineAlerts] = useState([]);

  // Transcript Modal State
  const [selectedConv, setSelectedConv] = useState(null);
  const [transcriptMessages, setTranscriptMessages] = useState([]);
  const [isTranscriptOpen, setIsTranscriptOpen] = useState(false);
  const [isLoadingTranscript, setIsLoadingTranscript] = useState(false);

  const fetchConversations = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/conversations', {
        params: {
          status: statusFilter || undefined,
          search: searchTerm || undefined
        }
      });
      setConversations(res.data.conversations || []);
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, [statusFilter]);

  // Listen for admin events & offline handoff alerts
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    socket.on('admin:offline_agent_handoff', (alert) => {
      setOfflineAlerts((prev) => [alert, ...prev]);
      fetchConversations();
    });

    socket.on('admin:dashboard_update', () => {
      fetchConversations();
    });

    return () => {
      socket.off('admin:offline_agent_handoff');
      socket.off('admin:dashboard_update');
    };
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchConversations();
  };

  const handleOpenTranscript = async (conv) => {
    setSelectedConv(conv);
    setIsTranscriptOpen(true);
    setIsLoadingTranscript(true);
    try {
      const res = await api.get(`/conversations/${conv.id}/messages`);
      setTranscriptMessages(res.data.messages || []);
    } catch (err) {
      console.error('Failed to load transcript:', err);
    } finally {
      setIsLoadingTranscript(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Super Admin / Supervisor Alert Banner for Offline Assigned Agents */}
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
                    setTransferModalOpen(true);
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

      {/* Header and Filter Toolbar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search by customer phone or name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-telecom-500 focus:bg-white"
          />
        </form>

        {/* Filter by status */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-semibold text-slate-500">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none cursor-pointer"
          >
            <option value="">All Statuses</option>
            <option value="open">Active (Open)</option>
            <option value="closed">Closed / Archived</option>
          </select>
        </div>
      </div>

      {/* Conversations Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Assigned Agent</th>
                <th className="py-3 px-4">Handling Mode</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Messages</th>
                <th className="py-3 px-4">Created Date</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-400">
                    Loading conversation logs...
                  </td>
                </tr>
              ) : conversations.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400">
                    <MessageSquare className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    No conversations found matching filters.
                  </td>
                </tr>
              ) : (
                conversations.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{c.customer_name || 'Customer'}</div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3" />
                        <span>{c.customer_phone}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-medium">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>{c.current_agent_name || 'Unassigned'}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      {c.handoff_requested ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-500 text-white font-bold rounded-full text-[10px] animate-pulse">
                          <AlertTriangle className="w-3 h-3" /> Escalation
                        </span>
                      ) : c.handling_mode === 'ai' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-md font-semibold text-[10px]">
                          <Bot className="w-3 h-3" /> 🤖 AI Concierge
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-md font-semibold text-[10px]">
                          <UserCheck className="w-3 h-3" /> 👨‍💼 Live Agent
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge variant={c.status} size="sm">
                        {c.status}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-medium text-slate-600">
                      {c.message_count || 0} msgs
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span>{new Date(c.created_at).toLocaleString()}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-1.5">
                      {c.status === 'open' && (
                        <button
                          onClick={() => {
                            setTransferTargetConv(c);
                            setTransferModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg font-semibold transition-colors"
                          title="Super Admin Transfer Chat"
                        >
                          <ArrowRightLeft className="w-3.5 h-3.5" />
                          <span>Transfer</span>
                        </button>
                      )}
                      <button
                        onClick={() => handleOpenTranscript(c)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-telecom-50 hover:text-telecom-700 text-slate-700 rounded-lg font-semibold transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Transcript</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transcript Modal */}
      <Modal
        isOpen={isTranscriptOpen}
        onClose={() => setIsTranscriptOpen(false)}
        title={`Chat Transcript - ${selectedConv?.customer_name || 'Customer'}`}
        maxWidth="max-w-2xl"
      >
        <div className="space-y-4">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs flex items-center justify-between">
            <div>
              <span className="text-slate-400 font-medium">Customer: </span>
              <span className="font-bold text-slate-800">{selectedConv?.customer_name}</span> ({selectedConv?.customer_phone})
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-medium">Specialist: </span>
              <span className="font-bold text-slate-800">{selectedConv?.current_agent_name || 'Unassigned'}</span>
              {selectedConv?.status === 'open' && (
                <button
                  onClick={() => {
                    setIsTranscriptOpen(false);
                    setTransferTargetConv(selectedConv);
                    setTransferModalOpen(true);
                  }}
                  className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 font-semibold rounded-lg text-[11px] flex items-center gap-1"
                >
                  <ArrowRightLeft className="w-3 h-3" />
                  <span>Transfer</span>
                </button>
              )}
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto space-y-3 p-3 bg-slate-100 rounded-2xl border border-slate-200">
            {isLoadingTranscript ? (
              <div className="py-8 text-center text-xs text-slate-400">Loading messages...</div>
            ) : transcriptMessages.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">No messages in transcript.</div>
            ) : (
              transcriptMessages.map((m) => {
                const isCustomer = m.sender_type === 'customer';
                const isSystem = m.sender_type === 'system';
                const isBot = m.sender_type === 'bot';

                if (isSystem) {
                  return (
                    <div key={m.id} className="text-center my-1">
                      <span className="text-[10px] bg-slate-200 text-slate-600 px-3 py-0.5 rounded-full font-medium">
                        {m.content}
                      </span>
                    </div>
                  );
                }

                if (isBot) {
                  return (
                    <div key={m.id} className="flex flex-col items-start my-1.5">
                      <span className="text-[10px] text-indigo-600 mb-0.5 px-1 font-bold flex items-center gap-1">
                        <Bot className="w-3 h-3" /> ideacorp AI Assistant
                      </span>
                      <div className="max-w-[80%] rounded-2xl rounded-tl-none px-3.5 py-2 text-xs bg-indigo-50 border border-indigo-200 text-slate-800 shadow-2xs">
                        <p className="whitespace-pre-wrap">{m.content}</p>
                        <span className="block text-[9px] mt-1 text-right text-indigo-400">
                          {new Date(m.created_at).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={m.id}
                    className={`flex flex-col ${isCustomer ? 'items-end' : 'items-start'}`}
                  >
                    <span className="text-[10px] text-slate-400 mb-0.5 px-1 font-semibold">
                      {isCustomer ? 'Customer' : (m.agent_name || 'Agent')}
                    </span>
                    <div
                      className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-xs shadow-xs ${
                        isCustomer
                          ? 'bg-telecom-600 text-white rounded-tr-none'
                          : 'bg-white text-slate-800 rounded-tl-none border border-slate-200'
                      }`}
                    >
                      {m.message_type === 'image' && m.file_url && (
                        <img
                          src={m.file_url}
                          alt="Attachment"
                          className="max-h-48 w-full object-cover rounded-lg mb-1"
                        />
                      )}
                      <p className="whitespace-pre-wrap">{m.content}</p>
                      <span className={`block text-[9px] mt-1 text-right ${isCustomer ? 'text-telecom-200' : 'text-slate-400'}`}>
                        {new Date(m.created_at).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={() => setIsTranscriptOpen(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>

      {/* Super Admin Transfer Modal */}
      <TransferModal
        isOpen={transferModalOpen}
        onClose={() => {
          setTransferModalOpen(false);
          setTransferTargetConv(null);
          fetchConversations();
        }}
        conversation={transferTargetConv}
      />
    </div>
  );
}
