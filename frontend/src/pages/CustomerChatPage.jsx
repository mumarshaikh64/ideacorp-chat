import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import { initCustomerSocket, disconnectSocket, getSocket } from '../services/socket';
import WelcomeScreen from '../components/customer/WelcomeScreen';
import CustomerChatWindow from '../components/customer/CustomerChatWindow';
import { AlertCircle, Clock, ShieldX, Radio } from 'lucide-react';

export default function CustomerChatPage() {
  const { chatToken } = useParams();
  const [tokenStatus, setTokenStatus] = useState('validating'); // 'validating' | 'valid' | 'invalid' | 'expired' | 'closed'
  const [errorMessage, setErrorMessage] = useState('');
  const [inviteData, setInviteData] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [agent, setAgent] = useState(null);

  // Chat State
  const [isChatActive, setIsChatActive] = useState(false);
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [transferNotification, setTransferNotification] = useState(null);
  const [isAgentOnline, setIsAgentOnline] = useState(false);

  // 1. Validate chat token on initial load
  useEffect(() => {
    async function validate() {
      try {
        const res = await api.get(`/invites/validate/${chatToken}`);
        if (res.data.valid) {
          setInviteData(res.data.invite);
          setCustomer(res.data.customer);
          setAgent(res.data.agent);
          setTokenStatus('valid');

          // If conversation already exists and was ongoing, auto-resume
          if (res.data.invite.conversationId) {
            handleStartChat(null, res.data.invite.conversationId);
          }
        } else {
          setTokenStatus('invalid');
          setErrorMessage(res.data.error || 'Invalid chat token');
        }
      } catch (err) {
        const status = err.response?.status;
        if (status === 410) {
          setTokenStatus('expired');
          setErrorMessage(err.response?.data?.error || 'This chat invite has expired or already ended.');
        } else {
          setTokenStatus('invalid');
          setErrorMessage(err.response?.data?.error || 'Invalid or unverifiable chat token.');
        }
      }
    }

    if (chatToken) {
      validate();
    }

    return () => {
      disconnectSocket();
    };
  }, [chatToken]);

  // 2. Start or Resume Live Chat
  const handleStartChat = (initialOption = null, existingConvId = null) => {
    const socket = initCustomerSocket(chatToken);

    socket.on('connect', () => {
      if (existingConvId) {
        // Rejoin existing room
        socket.emit('chat:join', { conversationId: existingConvId }, (res) => {
          if (res?.success) {
            setConversation(res.conversation);
            setMessages(res.history || []);
            setIsChatActive(true);
            if (typeof res.isAgentOnline === 'boolean') {
              setIsAgentOnline(res.isAgentOnline);
            }
          }
        });
      } else {
        // Start brand new live chat
        socket.emit('chat:start', { initialOption }, (res) => {
          if (res?.success) {
            setConversation(res.conversation);
            setIsChatActive(true);
            if (typeof res.isAgentOnline === 'boolean') {
              setIsAgentOnline(res.isAgentOnline);
            }
          }
        });
      }
    });

    // Handle incoming messages from agent, bot, or system
    socket.on('chat:message', (newMsg) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });

      // Acknowledge read receipt if customer receives agent message
      if (newMsg.sender_type === 'agent') {
        socket.emit('chat:read', { conversationId: newMsg.conversation_id });
      }
    });

    // Handle mode changes (AI -> Human or Human -> AI)
    socket.on('chat:mode_changed', (data) => {
      setConversation((prev) => prev ? { ...prev, handling_mode: data.handlingMode, handoff_requested: data.handoffRequested } : prev);
      if (typeof data.isAgentOnline === 'boolean') {
        setIsAgentOnline(data.isAgentOnline);
      }
    });

    socket.on('chat:customer_joined', (data) => {
      if (typeof data.isAgentOnline === 'boolean') {
        setIsAgentOnline(data.isAgentOnline);
      }
    });

    // Handle typing indicator from agent or bot
    socket.on('chat:typing', ({ isTyping: typingStatus, senderType, senderName }) => {
      if (typingStatus) {
        setIsTyping(senderName || (senderType === 'bot' ? 'ideacorp AI Assistant' : 'Specialist'));
      } else {
        setIsTyping(false);
      }
    });

    // Handle read receipt tick updates from agent
    socket.on('chat:read', ({ readBy }) => {
      if (readBy === 'agent') {
        setMessages((prev) => prev.map((m) => ({ ...m, status: 'read' })));
      }
    });

    // Seamless agent transfer notification
    socket.on('chat:transferred', (data) => {
      setTransferNotification(data);
      if (data.systemMessage) {
        setMessages((prev) => [...prev, data.systemMessage]);
      }
      setAgent({ name: data.toAgentName, id: data.toAgentId });
      setIsAgentOnline(true);
    });

    // Chat closed by agent or inactivity
    socket.on('chat:closed', (data) => {
      setTokenStatus('closed');
      setErrorMessage(data.reason || 'This customer support session has been closed by your agent.');
    });
  };

  const handleRequestHuman = () => {
    const socket = getSocket();
    if (!socket || !conversation) return;
    socket.emit('chat:request_human', { conversationId: conversation.id });
  };

  const handleSendMessage = (content, messageType = 'text', fileUrl = null) => {
    const socket = getSocket();
    if (!socket || !conversation) return;

    socket.emit('chat:message', {
      conversationId: conversation.id,
      content,
      messageType,
      fileUrl
    });
  };

  const handleSendTyping = (typingStatus) => {
    const socket = getSocket();
    if (!socket || !conversation) return;

    socket.emit('chat:typing', {
      conversationId: conversation.id,
      isTyping: typingStatus
    });
  };

  // Render Token Validating State
  if (tokenStatus === 'validating') {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 rounded-2xl bg-telecom-600 flex items-center justify-center animate-pulse mb-3">
          <Radio className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold">Securing Support Channel...</h3>
        <p className="text-xs text-slate-400 mt-1">Verifying encrypted token signature</p>
      </div>
    );
  }

  // Render Expired, Closed, or Invalid Token Notice
  if (['invalid', 'expired', 'closed'].includes(tokenStatus)) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
        <div className="w-16 h-16 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center mb-4 shadow-xl">
          {tokenStatus === 'expired' ? <Clock className="w-8 h-8" /> : <ShieldX className="w-8 h-8" />}
        </div>
        <h2 className="text-xl font-bold tracking-tight">
          {tokenStatus === 'expired' ? 'Invite Link Expired' : tokenStatus === 'closed' ? 'Chat Session Concluded' : 'Invalid Link'}
        </h2>
        <p className="text-xs text-slate-300 mt-2 leading-relaxed">
          {errorMessage || 'This secure link is no longer active. To initiate a new conversation with our sales specialists, please request a fresh link.'}
        </p>
        <div className="mt-6 p-3 bg-slate-800/60 rounded-2xl border border-slate-700/60 text-[11px] text-slate-400">
          IdeaCrop Telecom Support • 24/7 Priority Assistance
        </div>
      </div>
    );
  }

  // If in live chat mode, render CustomerChatWindow
  if (isChatActive && conversation) {
    return (
      <CustomerChatWindow
        conversation={conversation}
        messages={messages}
        onSendMessage={handleSendMessage}
        onSendTyping={handleSendTyping}
        isTyping={isTyping}
        transferNotification={transferNotification}
        agent={agent}
        onRequestHuman={handleRequestHuman}
        isAgentOnline={isAgentOnline}
      />
    );
  }

  // Otherwise, render Welcome Screen with Quick Telecom Options
  return (
    <WelcomeScreen
      agent={agent}
      customer={customer}
      onStartChat={handleStartChat}
    />
  );
}
