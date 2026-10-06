import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Paperclip, 
  ArrowRightLeft, 
  CheckCircle2, 
  Check, 
  CheckCheck, 
  Phone, 
  User, 
  FileText, 
  Image as ImageIcon,
  X,
  Sparkles,
  Bot,
  Hash,
  Lock,
  Clock,
  Share2,
  RefreshCw,
  Search,
  AlertCircle
} from 'lucide-react';
import api from '../../services/api';
import Badge from '../common/Badge';

export default function AgentChatWindow({
  conversation,
  messages = [],
  onSendMessage,
  onSendTyping,
  isTyping,
  onOpenTransferModal,
  onCloseChat,
  onToggleAi
}) {
  const [inputText, setInputText] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const cannedResponses = [
    "Hello! Thanks for reaching out to IdeaCrop Telecom. How can I assist you today?",
    "Our Unlimited 5G Max plan includes 15GB hotspot data and international coverage in 50+ countries.",
    "I would be glad to help you activate your new eSIM. It only takes about 2 minutes.",
    "I'm checking our current device trade-in promotions for your number right now.",
    "Let me connect you with our specialized technical support team."
  ];

  // Numbers Pool & 3-Day Reservation State
  const [activeSideTab, setActiveSideTab] = useState('numbers'); // 'numbers' | 'crm'
  const [numbersSearch, setNumbersSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [availableNumbers, setAvailableNumbers] = useState([]);
  const [isLoadingNumbers, setIsLoadingNumbers] = useState(false);
  const [reservedNumberInfo, setReservedNumberInfo] = useState(null);
  const [actionMessage, setActionMessage] = useState(null);

  // Fetch Available Series Numbers
  const fetchSeriesNumbers = async (search = '', category = '') => {
    setIsLoadingNumbers(true);
    try {
      const res = await api.get('/numbers/series', {
        params: {
          search: search || undefined,
          category: category !== 'all' ? category : undefined,
          limit: 8
        }
      });
      if (res.data.success) {
        setAvailableNumbers(res.data.series || []);
      }
    } catch (err) {
      console.error('Failed to load series numbers:', err);
    } finally {
      setIsLoadingNumbers(false);
    }
  };

  // Check active reservation for this customer / conversation
  const checkActiveReservation = async () => {
    if (!conversation?.customer_phone && !conversation?.id) return;
    try {
      const res = await api.get('/numbers', {
        params: {
          status: 'reserved',
          search: conversation.customer_phone,
          limit: 1
        }
      });
      if (res.data.success && res.data.numbers && res.data.numbers.length > 0) {
        setReservedNumberInfo(res.data.numbers[0]);
      } else {
        setReservedNumberInfo(null);
      }
    } catch (e) {
      console.error('Error checking active reservation:', e);
    }
  };

  useEffect(() => {
    fetchSeriesNumbers(numbersSearch, selectedCategory);
  }, [numbersSearch, selectedCategory]);

  useEffect(() => {
    checkActiveReservation();
  }, [conversation?.customer_phone, conversation?.id]);

  const showActionFeedback = (msg) => {
    setActionMessage(msg);
    setTimeout(() => setActionMessage(null), 3500);
  };

  // Share Number Card to Live Chat
  const handleShareToChat = async (num) => {
    try {
      await api.post('/numbers/share-to-chat', {
        conversationId: conversation.id,
        numbers: [num],
        note: `✨ Exclusive VIP & series number recommendation:`
      });
      showActionFeedback(`Shared ${num.mssid} to live chat!`);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to share number in chat');
    }
  };

  // Reserve Number for 3 Days (72 Hours)
  const handleReserve = async (mssid) => {
    try {
      const res = await api.post('/numbers/reserve', {
        mssid,
        conversationId: conversation.id,
        customerPhone: conversation.customer_phone,
        customerName: conversation.customer_name,
        durationDays: 3
      });
      if (res.data.success) {
        setReservedNumberInfo(res.data.number);
        fetchSeriesNumbers(numbersSearch, selectedCategory);
        showActionFeedback(`Locked ${mssid} for 3 days!`);
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to reserve number');
    }
  };

  // Mark Number as Sold (Permanently unavailable)
  const handleSell = async (mssid) => {
    if (!window.confirm(`Mark ${mssid} as SOLD? This number will become permanently unavailable and cannot be reassigned.`)) return;
    try {
      const res = await api.post('/numbers/sell', {
        mssid,
        conversationId: conversation.id
      });
      if (res.data.success) {
        setReservedNumberInfo(null);
        fetchSeriesNumbers(numbersSearch, selectedCategory);
        showActionFeedback(`Marked ${mssid} as SOLD! 🎉`);
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to sell number');
    }
  };

  // Release Reserved Number back to available pool
  const handleRelease = async (mssid) => {
    if (!window.confirm(`Release ${mssid} reservation back to the available pool?`)) return;
    try {
      const res = await api.post('/numbers/release', {
        mssid,
        conversationId: conversation.id
      });
      if (res.data.success) {
        setReservedNumberInfo(null);
        fetchSeriesNumbers(numbersSearch, selectedCategory);
        showActionFeedback(`Released ${mssid} back to available pool.`);
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to release number');
    }
  };

  const getExpiryCountdown = (expiryDate) => {
    if (!expiryDate) return '';
    const diff = new Date(expiryDate).getTime() - Date.now();
    if (diff <= 0) return 'Expired';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    const remHours = hours % 24;
    return `${days}d ${remHours}h left`;
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleInputChange = (e) => {
    setInputText(e.target.value);
    onSendTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      onSendTyping(false);
    }, 1500);
  };

  const handleSend = async (e) => {
    e?.preventDefault();
    if (!inputText.trim() && !selectedFile) return;

    if (selectedFile) {
      setIsUploading(true);
      try {
        const formData = new FormData();
        formData.append('file', selectedFile);

        const res = await api.post('/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        const fileData = res.data.file;
        onSendMessage(
          inputText.trim() || fileData.originalName,
          fileData.isImage ? 'image' : 'file',
          fileData.url
        );
        setSelectedFile(null);
      } catch (err) {
        console.error('File upload error:', err);
      } finally {
        setIsUploading(false);
      }
    } else {
      onSendMessage(inputText.trim(), 'text');
    }

    setInputText('');
    onSendTyping(false);
  };

  const handleCannedResponse = (text) => {
    setInputText(text);
  };

  return (
    <div className="flex-1 flex h-full overflow-hidden bg-slate-50">
      {/* Main Chat Center Column */}
      <div className="flex-1 flex flex-col h-full bg-white border-r border-slate-200">
        {/* Chat Top Header */}
        <div className="h-16 px-6 border-b border-slate-200 flex items-center justify-between bg-white flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-telecom-100 text-telecom-700 font-bold flex items-center justify-center">
              {conversation.customer_name ? conversation.customer_name.charAt(0) : 'C'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-800">
                  {conversation.customer_name || 'Customer'}
                </h3>
                <Badge variant={conversation.status} size="sm">
                  {conversation.status}
                </Badge>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-1">
                <Phone className="w-3 h-3" />
                <span>{conversation.customer_phone}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {conversation.status === 'open' && (
              <>
                <button
                  onClick={() => onToggleAi && onToggleAi(conversation.id, conversation.handling_mode !== 'ai')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                    conversation.handling_mode === 'ai'
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                  }`}
                  title={conversation.handling_mode === 'ai' ? 'Click to pause AI and take over manually' : 'Click to resume AI Auto-Responder'}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{conversation.handling_mode === 'ai' ? '🤖 AI Auto-Responder: Active' : '👨‍💼 Live Agent Mode'}</span>
                </button>
                <button
                  onClick={onOpenTransferModal}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
                  title="Transfer chat to another agent"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  <span>Transfer</span>
                </button>
                <button
                  onClick={onCloseChat}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-semibold transition-colors"
                  title="Close and archive conversation"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Close</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Handoff Requested Notice Banner */}
        {conversation.handoff_requested && (
          <div className="bg-gradient-to-r from-rose-500 to-amber-500 px-6 py-2.5 flex items-center justify-between text-white text-xs shadow-inner animate-pulse">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
              <span className="font-bold">Customer Requested Human Specialist!</span>
              {conversation.handoff_reason && (
                <span className="text-white/90 hidden sm:inline italic">
                  ("{conversation.handoff_reason}")
                </span>
              )}
            </div>
            <button
              onClick={() => onToggleAi && onToggleAi(conversation.id, false)}
              className="px-3 py-1 bg-white text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-bold transition-all shadow-xs"
            >
              Take Over Chat
            </button>
          </div>
        )}

        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3.5 bg-slate-50/50">
          {messages.map((msg) => {
            const isAgent = msg.sender_type === 'agent';
            const isSystem = msg.sender_type === 'system';
            const isBot = msg.sender_type === 'bot';

            if (isSystem) {
              return (
                <div key={msg.id} className="flex justify-center my-3">
                  <span className="text-[11px] bg-slate-200 text-slate-600 px-3.5 py-1 rounded-full font-medium shadow-2xs text-center max-w-md">
                    {msg.content}
                  </span>
                </div>
              );
            }

            if (isBot) {
              return (
                <div key={msg.id} className="flex flex-col items-start my-2">
                  <span className="text-[10px] font-bold text-indigo-600 mb-1 px-1 flex items-center gap-1">
                    <Bot className="w-3 h-3" /> ideacorp AI Assistant
                  </span>
                  <div className="max-w-[75%] rounded-2xl rounded-tl-none px-4 py-2.5 text-xs sm:text-sm bg-gradient-to-br from-indigo-50/90 to-purple-50/90 border border-indigo-100 text-slate-800 shadow-2xs">
                    <p className="whitespace-pre-wrap break-words leading-relaxed font-normal">
                      {msg.content}
                    </p>
                    {msg.metadata?.options && Array.isArray(msg.metadata.options) && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {msg.metadata.options.map((opt, oIdx) => (
                          <span key={oIdx} className="text-[11px] px-2 py-0.5 bg-white text-indigo-700 border border-indigo-200 rounded-lg font-medium">
                            {opt}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-indigo-400">
                      <span>
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isAgent ? 'items-end' : 'items-start'}`}
              >
                <span className="text-[10px] font-semibold text-slate-400 mb-1 px-1">
                  {isAgent ? 'You (Agent)' : (conversation.customer_name || 'Customer')}
                </span>

                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-xs sm:text-sm shadow-xs ${
                    isAgent
                      ? 'bg-telecom-600 text-white rounded-tr-none'
                      : 'bg-white text-slate-800 rounded-tl-none border border-slate-200'
                  }`}
                >
                  {/* Image attachment */}
                  {msg.message_type === 'image' && msg.file_url && (
                    <div className="mb-2 rounded-xl overflow-hidden border border-black/10">
                      <img
                        src={msg.file_url}
                        alt="Attachment"
                        className="max-h-64 w-full object-cover cursor-pointer"
                        onClick={() => window.open(msg.file_url, '_blank')}
                      />
                    </div>
                  )}

                  {/* File attachment */}
                  {msg.message_type === 'file' && msg.file_url && (
                    <a
                      href={msg.file_url}
                      target="_blank"
                      rel="noreferrer"
                      className={`flex items-center gap-2 p-2 rounded-xl mb-1 font-semibold ${
                        isAgent ? 'bg-telecom-700 text-white' : 'bg-slate-100 text-slate-800'
                      }`}
                    >
                      <FileText className="w-4 h-4" />
                      <span className="truncate">{msg.content || 'Download File'}</span>
                    </a>
                  )}

                  <p className="whitespace-pre-wrap break-words leading-relaxed">
                    {msg.content}
                  </p>

                  <div
                    className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${
                      isAgent ? 'text-telecom-200' : 'text-slate-400'
                    }`}
                  >
                    <span>
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {isAgent && (
                      msg.status === 'read' ? (
                        <CheckCheck className="w-3.5 h-3.5 text-sky-400" />
                      ) : msg.status === 'delivered' ? (
                        <CheckCheck className="w-3.5 h-3.5 text-slate-300" />
                      ) : (
                        <Check className="w-3.5 h-3.5 text-slate-300" />
                      )
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {isTyping && (
            <div className="flex items-center gap-2 text-xs text-slate-400 italic">
              <span className="w-2 h-2 rounded-full bg-telecom-500 animate-ping" />
              <span>Customer is typing...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Selected File Chip */}
        {selectedFile && (
          <div className="bg-slate-100 px-4 py-2 flex items-center justify-between text-xs text-slate-700 border-t border-slate-200">
            <div className="flex items-center gap-2 truncate">
              {selectedFile.type.startsWith('image/') ? (
                <ImageIcon className="w-4 h-4 text-telecom-600" />
              ) : (
                <FileText className="w-4 h-4 text-telecom-600" />
              )}
              <span className="truncate font-semibold">{selectedFile.name}</span>
            </div>
            <button
              onClick={() => setSelectedFile(null)}
              className="p-1 hover:bg-slate-200 rounded text-slate-500 hover:text-slate-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Canned Responses Pills */}
        <div className="p-2.5 bg-slate-100/60 border-t border-slate-200 flex items-center gap-2 overflow-x-auto">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 flex-shrink-0">
            <Sparkles className="w-3 h-3 text-telecom-500" /> Canned:
          </span>
          {cannedResponses.map((item, idx) => (
            <button
              key={idx}
              onClick={() => handleCannedResponse(item)}
              className="px-2.5 py-1 bg-white hover:bg-telecom-50 hover:text-telecom-700 hover:border-telecom-300 text-slate-600 rounded-lg text-xs font-medium border border-slate-200 transition-all flex-shrink-0 whitespace-nowrap shadow-2xs"
            >
              {item.length > 35 ? item.substring(0, 35) + '...' : item}
            </button>
          ))}
        </div>

        {/* Message Input Form */}
        <footer className="p-3 bg-white border-t border-slate-200 flex-shrink-0">
          <form onSubmit={handleSend} className="flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => e.target.files?.[0] && setSelectedFile(e.target.files[0])}
              className="hidden"
              accept="image/*,.pdf,.doc,.docx,.txt"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-slate-400 hover:text-telecom-600 hover:bg-slate-100 rounded-xl transition-colors"
              title="Attach File / Image"
            >
              <Paperclip className="w-5 h-5" />
            </button>

            <input
              type="text"
              value={inputText}
              onChange={handleInputChange}
              disabled={conversation.status === 'closed'}
              placeholder={conversation.status === 'closed' ? 'Conversation is closed' : 'Type a reply... (Enter to send)'}
              className="flex-1 bg-slate-50 text-slate-800 text-sm rounded-xl px-4 py-2.5 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-telecom-500 focus:bg-white transition-all disabled:bg-slate-100"
            />

            <button
              type="submit"
              disabled={conversation.status === 'closed' || (!inputText.trim() && !selectedFile) || isUploading}
              className="px-4 py-2.5 bg-telecom-600 hover:bg-telecom-700 text-white rounded-xl text-xs font-semibold shadow-sm disabled:opacity-40 transition-all flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send</span>
            </button>
          </form>
        </footer>
      </div>

      {/* Right Column: Tabbed Numbers Pool & Customer CRM Panel */}
      <div className="w-80 bg-white flex flex-col h-full border-l border-slate-200 overflow-hidden flex-shrink-0">
        {/* Tab Headers */}
        <div className="flex border-b border-slate-200 bg-slate-50/80 p-1.5 gap-1 flex-shrink-0">
          <button
            type="button"
            onClick={() => setActiveSideTab('numbers')}
            className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeSideTab === 'numbers'
                ? 'bg-white text-telecom-700 shadow-xs border border-slate-200'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Hash className="w-3.5 h-3.5 text-telecom-600" />
            <span>VIP Numbers</span>
            {reservedNumberInfo && (
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveSideTab('crm')}
            className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeSideTab === 'crm'
                ? 'bg-white text-telecom-700 shadow-xs border border-slate-200'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <User className="w-3.5 h-3.5 text-slate-500" />
            <span>Customer Info</span>
          </button>
        </div>

        {/* Tab 1: Numbers Pool & 3-Day Reservation */}
        {activeSideTab === 'numbers' ? (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Feedback notification toast */}
            {actionMessage && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>{actionMessage}</span>
              </div>
            )}

            {/* Active 3-Day Reservation Card */}
            {reservedNumberInfo ? (
              <div className="p-3.5 bg-gradient-to-br from-amber-500/10 via-amber-50 to-yellow-500/10 border-2 border-amber-300 rounded-2xl shadow-xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                    <Lock className="w-4 h-4 text-amber-600" />
                    <span>Active 3-Day Reservation</span>
                  </div>
                  <span className="text-[10px] bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded-full font-bold">
                    {getExpiryCountdown(reservedNumberInfo.reservation_expires_at)}
                  </span>
                </div>

                <div>
                  <div className="font-mono text-lg font-black text-slate-900 tracking-wider">
                    {reservedNumberInfo.mssid}
                  </div>
                  <div className="text-[11px] text-slate-600 mt-0.5 flex items-center justify-between">
                    <span>Category: <strong>{reservedNumberInfo.category}</strong></span>
                    <span className="text-[10px] text-amber-800">
                      Expires: {new Date(reservedNumberInfo.reservation_expires_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1 border-t border-amber-200/60">
                  <button
                    type="button"
                    onClick={() => handleSell(reservedNumberInfo.mssid)}
                    className="flex-1 py-1.5 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1 cursor-pointer"
                    title="Mark number as sold (permanently unavailable)"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Mark Sold</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRelease(reservedNumberInfo.mssid)}
                    className="py-1.5 px-3 bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                    title="Release reservation back to pool"
                  >
                    Release
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-center text-xs text-slate-500">
                <Lock className="w-4 h-4 mx-auto mb-1 text-slate-400" />
                <span>No number currently reserved for this customer.</span>
                <span className="block text-[11px] text-slate-400 mt-0.5">Select a number below to lock for 3 days.</span>
              </div>
            )}

            {/* Available Pool Search & Category Filter */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Series Numbers Pool</span>
                </h4>
                <button
                  type="button"
                  onClick={() => fetchSeriesNumbers(numbersSearch, selectedCategory)}
                  className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-700 transition-colors"
                  title="Refresh pool"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingNumbers ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {/* Search input */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Search series (e.g. 050, 777)..."
                  value={numbersSearch}
                  onChange={(e) => setNumbersSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-telecom-500 focus:bg-white"
                />
              </div>

              {/* Category pills */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[11px]">
                {['all', 'Platinum', 'Gold', 'Silver'].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2 py-0.5 rounded-lg font-medium transition-all flex-shrink-0 cursor-pointer ${
                      selectedCategory === cat
                        ? 'bg-telecom-600 text-white font-bold'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {cat === 'all' ? 'All' : cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Numbers List */}
            <div className="space-y-2">
              {isLoadingNumbers ? (
                <div className="py-6 text-center text-xs text-slate-400">
                  <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-1 text-telecom-600" />
                  Loading series numbers...
                </div>
              ) : availableNumbers.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400">
                  No matching available numbers found.
                </div>
              ) : (
                availableNumbers.map((num) => {
                  const isPlat = num.category?.toLowerCase().includes('platinum');
                  const isGold = num.category?.toLowerCase().includes('gold');
                  return (
                    <div
                      key={num.id || num.mssid}
                      className="p-2.5 rounded-xl border border-slate-200 bg-white hover:border-telecom-300 transition-all space-y-1.5 shadow-2xs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span>{isPlat ? '💎' : isGold ? '✨' : '🥈'}</span>
                          <span className="font-mono font-bold text-xs text-slate-900 tracking-wide">
                            {num.mssid}
                          </span>
                        </div>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                          isPlat ? 'bg-purple-50 text-purple-700 border border-purple-200'
                          : isGold ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-slate-50 text-slate-600 border border-slate-200'
                        }`}>
                          {num.category || 'Standard'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 pt-1">
                        <button
                          type="button"
                          onClick={() => handleShareToChat(num)}
                          className="flex-1 py-1 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-semibold transition-all flex items-center justify-center gap-1 cursor-pointer"
                          title="Send number showcase card into customer chat"
                        >
                          <Share2 className="w-3 h-3" />
                          <span>Share</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleReserve(num.mssid)}
                          className="flex-1 py-1 px-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                          title="Reserve this number for 3 days (72 hours)"
                        >
                          <Lock className="w-3 h-3 text-amber-700" />
                          <span>Hold 3d</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleSell(num.mssid)}
                          className="py-1 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-[11px] font-bold transition-all cursor-pointer"
                          title="Mark directly as sold"
                        >
                          Sell
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ) : (
          /* Tab 2: Customer CRM Profile */
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                Customer Profile
              </h4>
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center">
                <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-telecom-600 to-indigo-600 text-white font-bold text-xl flex items-center justify-center mx-auto mb-2 shadow-sm">
                  {conversation.customer_name ? conversation.customer_name.charAt(0) : 'C'}
                </div>
                <h3 className="text-sm font-bold text-slate-800">
                  {conversation.customer_name || 'Customer'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">{conversation.customer_phone}</p>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Telecom Details
              </h4>
              <div className="space-y-2 text-xs">
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Session ID</span>
                  <span className="font-mono text-slate-700 text-[11px] break-all">{conversation.id}</span>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Customer Notes</span>
                  <span className="text-slate-700 text-xs">
                    {conversation.customer_notes || 'No customer notes on file.'}
                  </span>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Started At</span>
                  <span className="text-slate-700 text-xs">
                    {new Date(conversation.created_at).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
