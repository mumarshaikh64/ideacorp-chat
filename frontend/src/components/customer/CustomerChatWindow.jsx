import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Paperclip, 
  Image as ImageIcon, 
  FileText, 
  Check, 
  CheckCheck, 
  ArrowRightLeft, 
  Circle, 
  Radio, 
  X,
  Bot,
  UserCheck,
  Sparkles,
  PhoneCall,
  Lock,
  Clock,
  CheckCircle2,
  Bookmark,
  Hash
} from 'lucide-react';
import api from '../../services/api';

export default function CustomerChatWindow({
  conversation,
  messages,
  onSendMessage,
  onSendTyping,
  isTyping,
  transferNotification,
  agent,
  onRequestHuman,
  isAgentOnline
}) {
  const [inputText, setInputText] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping, transferNotification]);

  const handleInputChange = (e) => {
    setInputText(e.target.value);

    // Typing throttle
    onSendTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      onSendTyping(false);
    }, 1500);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleSend = async (e) => {
    e?.preventDefault();
    if (!inputText.trim() && !selectedFile) return;

    if (selectedFile) {
      setIsUploading(true);
      try {
        const formData = new FormData();
        formData.append('file', selectedFile);

        const uploadRes = await api.post('/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        const fileData = uploadRes.data.file;
        onSendMessage(
          inputText.trim() || fileData.originalName,
          fileData.isImage ? 'image' : 'file',
          fileData.url
        );

        setSelectedFile(null);
      } catch (err) {
        console.error('File upload failed:', err);
      } finally {
        setIsUploading(false);
      }
    } else {
      onSendMessage(inputText.trim(), 'text');
    }

    setInputText('');
    onSendTyping(false);
  };

  const renderMessageTicks = (status) => {
    if (status === 'read') {
      return <CheckCheck className="w-3.5 h-3.5 text-sky-400 stroke-[2.5]" />;
    }
    if (status === 'delivered') {
      return <CheckCheck className="w-3.5 h-3.5 text-slate-300 stroke-[2]" />;
    }
    return <Check className="w-3.5 h-3.5 text-slate-300 stroke-[2]" />;
  };

  const isHumanActive = conversation?.handling_mode === 'human';

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-slate-100 border-x border-slate-200">
      {/* Top Header */}
      <header className="bg-slate-900 text-white p-3.5 flex items-center justify-between shadow-md flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-telecom-500 to-indigo-600 flex items-center justify-center font-bold text-white shadow-md">
              {agent?.name ? agent.name.charAt(0) : 'S'}
            </div>
            <Circle
              className={`w-3.5 h-3.5 absolute bottom-0 right-0 rounded-full border-2 border-slate-900 fill-current ${
                isAgentOnline ? 'text-emerald-500' : 'text-amber-400'
              }`}
            />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white leading-tight flex items-center gap-1.5">
              <span>{agent?.name || 'Dedicated Specialist'}</span>
              <span className="text-[10px] bg-slate-800 text-telecom-400 px-1.5 py-0.5 rounded font-mono">
                e& Partner
              </span>
            </h3>
            <p className="text-[11px] font-medium mt-0.5">
              {isHumanActive ? (
                isAgentOnline ? (
                  <span className="text-emerald-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Specialist Connected Live
                  </span>
                ) : (
                  <span className="text-amber-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                    Specialist Offline • Admin Transferring
                  </span>
                )
              ) : (
                <span className="text-slate-300 flex items-center gap-1">
                  <Bot className="w-3 h-3 text-telecom-400" />
                  AI Concierge Active
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Talk to Human Action Button / Live Badge */}
        {!isHumanActive ? (
          <button
            type="button"
            onClick={onRequestHuman}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 active:scale-95 text-white rounded-xl text-xs font-bold shadow-md shadow-amber-500/25 transition-all flex-shrink-0"
            title="Connect with a live human sales representative"
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Talk to Human</span>
          </button>
        ) : (
          <div className="flex items-center gap-1 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 px-2.5 py-1 rounded-xl text-[11px] font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Live Chat</span>
          </div>
        )}
      </header>

      {/* Offline Dedicated Specialist Notice Banner */}
      {isHumanActive && !isAgentOnline && (
        <div className="bg-amber-500/15 border-b border-amber-500/30 px-3.5 py-2 flex items-center gap-2 text-xs text-amber-800 animate-in fade-in duration-200 flex-shrink-0">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping flex-shrink-0" />
          <p className="text-[11px] leading-tight">
            Your assigned sales agent <strong>{agent?.name}</strong> is currently offline. Super Admin has been alerted to transfer your chat to an online specialist.
          </p>
        </div>
      )}

      {/* Seamless Transfer Notification Banner */}
      {transferNotification && (
        <div className="bg-emerald-500/10 border-b border-emerald-500/20 px-4 py-2.5 flex items-center gap-2.5 text-xs text-emerald-800 animate-in fade-in duration-200 flex-shrink-0">
          <ArrowRightLeft className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <div>
            <p className="font-semibold text-emerald-900">Specialist Connected</p>
            <p className="text-[11px] text-emerald-700">
              Session reassigned to <span className="font-bold">{transferNotification.toAgentName}</span>.
              {transferNotification.reason ? ` (${transferNotification.reason})` : ''}
            </p>
          </div>
        </div>
      )}

      {/* Message Thread */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
        {messages.map((msg) => {
          const isCustomer = msg.sender_type === 'customer';
          const isSystem = msg.sender_type === 'system';
          const isBot = msg.sender_type === 'bot';
          const isAgent = msg.sender_type === 'agent';
          const isHandoffPrompt = msg.message_type === 'handoff_prompt';

          if (isSystem) {
            return (
              <div key={msg.id} className="flex justify-center my-2">
                <span className="text-[11px] bg-slate-200/90 text-slate-600 px-3 py-1 rounded-full font-medium shadow-2xs text-center max-w-[90%]">
                  {msg.content}
                </span>
              </div>
            );
          }

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isCustomer ? 'items-end' : 'items-start'}`}
            >
              {/* Sender Label Above Bubble */}
              {!isCustomer && (
                <div className="flex items-center gap-1 text-[10px] font-bold mb-1 ml-1">
                  {isBot ? (
                    <>
                      <Bot className="w-3 h-3 text-telecom-600" />
                      <span className="text-telecom-700">ideacorp AI Concierge</span>
                    </>
                  ) : (
                    <>
                      <UserCheck className="w-3 h-3 text-indigo-600" />
                      <span className="text-indigo-700">
                        {msg.agent_name || agent?.name || 'Sales Specialist'}
                      </span>
                    </>
                  )}
                </div>
              )}

              <div
                className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 shadow-xs text-sm ${
                  isCustomer
                    ? 'bg-telecom-600 text-white rounded-tr-none'
                    : isHandoffPrompt
                    ? 'bg-amber-50 text-amber-900 border border-amber-200 rounded-tl-none font-medium'
                    : isBot
                    ? 'bg-white text-slate-800 rounded-tl-none border border-slate-200/90'
                    : 'bg-white text-slate-800 rounded-tl-none border-2 border-indigo-100'
                }`}
              >
                {/* Image Attachment */}
                {msg.message_type === 'image' && msg.file_url && (
                  <div className="mb-2 rounded-xl overflow-hidden border border-black/10">
                    <img
                      src={msg.file_url}
                      alt="Attachment"
                      className="max-h-56 w-full object-cover cursor-pointer"
                      onClick={() => window.open(msg.file_url, '_blank')}
                    />
                  </div>
                )}

                {/* File Attachment */}
                {msg.message_type === 'file' && msg.file_url && (
                  <a
                    href={msg.file_url}
                    target="_blank"
                    rel="noreferrer"
                    className={`flex items-center gap-2 p-2 rounded-xl mb-1 text-xs font-semibold ${
                      isCustomer ? 'bg-telecom-700 text-white' : 'bg-slate-100 text-slate-800'
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    <span className="truncate">{msg.content || 'Download Document'}</span>
                  </a>
                )}

                {/* Text Content */}
                <p className="whitespace-pre-wrap break-words leading-relaxed text-xs sm:text-sm">
                  {msg.content}
                </p>

                {/* VIP & Sequence Series Numbers Showcase Card */}
                {msg.metadata?.numbers && Array.isArray(msg.metadata.numbers) && msg.metadata.numbers.length > 0 && (
                  <div className="mt-3 p-3 bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl text-white border border-slate-700 shadow-sm space-y-2.5 text-left">
                    <div className="flex items-center justify-between border-b border-slate-700/80 pb-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        <span>Available VIP & Sequence Pool</span>
                      </div>
                      <span className="text-[10px] bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded-full font-semibold border border-amber-400/30">
                        72h Hold
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-2">
                      {msg.metadata.numbers.map((num, nIdx) => {
                        const isPlat = num.category?.toLowerCase().includes('platinum');
                        const isGold = num.category?.toLowerCase().includes('gold');
                        return (
                          <div
                            key={nIdx}
                            className="flex items-center justify-between p-2 rounded-lg bg-slate-800/80 border border-slate-700/80 hover:border-slate-600 transition-all"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-base">{isPlat ? '💎' : isGold ? '✨' : '🥈'}</span>
                              <div>
                                <span className="font-mono font-bold text-sm text-white tracking-wider block">
                                  {num.mssid}
                                </span>
                                <span className="text-[10px] text-slate-400 font-medium">
                                  {num.category || 'VIP'} • Available
                                </span>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => onSendMessage(`Mujhe ye number book karwana hai: ${num.mssid}`)}
                              className="px-2.5 py-1 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-950 font-bold rounded-lg text-[11px] shadow-xs flex items-center gap-1 active:scale-95 transition-all cursor-pointer"
                              title="Book this number for 3 days"
                            >
                              <Lock className="w-3 h-3 text-slate-950" />
                              <span>Book (3d)</span>
                            </button>
                          </div>
                        );
                      })}
                    </div>

                    <div className="pt-1.5 border-t border-slate-700/60 flex items-center justify-between text-[10px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-amber-400" /> 3-Day Reservation Hold
                      </span>
                      <span className="text-slate-400">Auto-expires if unsold</span>
                    </div>
                  </div>
                )}

                {/* Reservation Confirmed Special Banner */}
                {msg.message_type === 'number_reservation_confirmed' && (
                  <div className="mt-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-950 text-left flex items-center gap-2 text-xs font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>Locked for 72 Hours • Free Delivery Included</span>
                  </div>
                )}

                {/* Quick Reply Pills on Bot Messages */}
                {isBot && msg.metadata?.options && msg.metadata.options.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2.5 pt-2 border-t border-slate-100">
                    {msg.metadata.options.map((opt, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          if (opt.key === 'request_human') {
                            if (onRequestHuman) onRequestHuman();
                          } else {
                            onSendMessage(opt.label);
                          }
                        }}
                        className={`text-[11px] font-semibold px-2.5 py-1 rounded-xl transition-all active:scale-95 text-left shadow-2xs ${
                          opt.key === 'request_human'
                            ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300'
                            : 'bg-telecom-50 hover:bg-telecom-100 text-telecom-700 border border-telecom-200/80'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}

                {/* Timestamp & Delivery Ticks */}
                <div
                  className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${
                    isCustomer ? 'text-telecom-200' : 'text-slate-400'
                  }`}
                >
                  <span>
                    {new Date(msg.created_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                  {isCustomer && renderMessageTicks(msg.status)}
                </div>
              </div>
            </div>
          );
        })}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex items-center gap-2 text-xs text-slate-500 italic pl-1 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-telecom-500 animate-ping" />
            <span>
              {typeof isTyping === 'string' ? `${isTyping} is typing...` : 'Specialist is typing...'}
            </span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Selected File Preview */}
      {selectedFile && (
        <div className="bg-slate-200 px-4 py-2 flex items-center justify-between text-xs text-slate-700 border-t border-slate-300">
          <div className="flex items-center gap-2 truncate">
            {selectedFile.type.startsWith('image/') ? (
              <ImageIcon className="w-4 h-4 text-telecom-600" />
            ) : (
              <FileText className="w-4 h-4 text-telecom-600" />
            )}
            <span className="truncate font-medium">{selectedFile.name}</span>
          </div>
          <button
            onClick={() => setSelectedFile(null)}
            className="p-1 hover:bg-slate-300 rounded text-slate-500 hover:text-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Message Composer */}
      <footer className="p-3 bg-white border-t border-slate-200 flex-shrink-0">
        <form onSubmit={handleSend} className="flex items-center gap-2">
          {/* File attachment input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            className="hidden"
            accept="image/*,.pdf,.doc,.docx,.txt"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-slate-400 hover:text-telecom-600 hover:bg-slate-100 rounded-full transition-colors flex-shrink-0"
            title="Attach image or document"
          >
            <Paperclip className="w-5 h-5" />
          </button>

          <input
            type="text"
            value={inputText}
            onChange={handleInputChange}
            placeholder={isHumanActive ? 'Type your message to specialist...' : 'Ask about plans, delivery, or type here...'}
            className="flex-1 bg-slate-100 text-slate-800 text-sm rounded-2xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-telecom-500 focus:bg-white transition-all"
          />

          <button
            type="submit"
            disabled={(!inputText.trim() && !selectedFile) || isUploading}
            className="w-10 h-10 rounded-full bg-telecom-600 hover:bg-telecom-700 active:scale-95 text-white flex items-center justify-center shadow-md disabled:opacity-40 disabled:scale-100 transition-all flex-shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </footer>
    </div>
  );
}
