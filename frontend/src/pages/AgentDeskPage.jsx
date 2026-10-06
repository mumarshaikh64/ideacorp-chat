import React, { useEffect, useState } from 'react';
import { useChatStore } from '../store/chatStore';
import { useAuthStore } from '../store/authStore';
import AgentConversationsList from '../components/agent/AgentConversationsList';
import AgentChatWindow from '../components/agent/AgentChatWindow';
import TransferModal from '../components/admin/TransferModal';
import IncomingChatAlert from '../components/common/Toast';
import { getSocket } from '../services/socket';
import { MessageSquare, Send } from 'lucide-react';

export default function AgentDeskPage({ onOpenInviteModal }) {
  const { user } = useAuthStore();
  const {
    conversations,
    activeConversation,
    messages,
    isTyping,
    incomingAlert,
    isLoadingConversations,
    fetchConversations,
    selectConversation,
    sendMessage,
    sendTyping,
    addMessage,
    setTypingIndicator,
    markMessagesRead,
    setIncomingAlert,
    clearIncomingAlert,
    closeChat,
    toggleAiMode,
    updateConversationHandling
  } = useChatStore();

  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);

  // Load conversations on mount
  useEffect(() => {
    fetchConversations({ status: 'open' });
  }, [fetchConversations]);

  // Bind real-time socket events for agent
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    // Incoming new or transferred chat
    socket.on('new_chat_assigned', (data) => {
      setIncomingAlert(data);
      fetchConversations({ status: 'open' });
    });

    // Customer requested human agent escalation
    socket.on('chat:handoff_requested', (data) => {
      setIncomingAlert({
        conversationId: data.conversationId,
        customer: {
          name: data.customerName,
          phone: data.customerPhone
        },
        title: '🚨 Human Specialist Requested!',
        message: data.reason || 'Customer wants to talk to a human agent.',
        isHandoff: true
      });
      updateConversationHandling(data.conversationId, 'human', true);
      fetchConversations({ status: 'open' });
    });

    // Handling mode changed
    socket.on('chat:mode_changed', ({ conversationId, handlingMode, handoffRequested }) => {
      updateConversationHandling(conversationId, handlingMode, handoffRequested);
    });

    // Real-time message
    socket.on('chat:message', (message) => {
      addMessage(message);
    });

    // Typing indicator
    socket.on('chat:typing', ({ isTyping: typingStatus, senderType, senderName }) => {
      if (senderType === 'customer') {
        setTypingIndicator(typingStatus, senderName);
      }
    });

    // Read receipt
    socket.on('chat:read', ({ readBy }) => {
      if (readBy === 'customer') {
        markMessagesRead();
      }
    });

    // Chat closed
    socket.on('chat:closed', () => {
      fetchConversations({ status: 'open' });
    });

    return () => {
      socket.off('new_chat_assigned');
      socket.off('chat:handoff_requested');
      socket.off('chat:mode_changed');
      socket.off('chat:message');
      socket.off('chat:typing');
      socket.off('chat:read');
      socket.off('chat:closed');
    };
  }, [
    addMessage,
    fetchConversations,
    markMessagesRead,
    setIncomingAlert,
    setTypingIndicator,
    updateConversationHandling
  ]);

  const handleAcceptIncomingChat = async () => {
    if (incomingAlert) {
      clearIncomingAlert();
      await fetchConversations({ status: 'open' });
      // Find the conversation and select it
      const target = conversations.find(c => c.id === incomingAlert.conversationId);
      if (target) {
        selectConversation(target);
      }
    }
  };

  const handleCloseActiveChat = async () => {
    if (!activeConversation) return;
    const confirmed = window.confirm('Are you sure you want to close this live chat session?');
    if (confirmed) {
      await closeChat(activeConversation.id, 'Session completed by agent');
      fetchConversations({ status: 'open' });
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] -m-8 overflow-hidden">
      {/* Toast Alert for Incoming / Transferred Chats */}
      <IncomingChatAlert
        alert={incomingAlert}
        onAccept={handleAcceptIncomingChat}
        onDismiss={clearIncomingAlert}
      />

      {/* Conversations List Left Column */}
      <AgentConversationsList
        conversations={conversations}
        activeConversation={activeConversation}
        onSelectConversation={selectConversation}
        isLoading={isLoadingConversations}
      />

      {/* Center & Right: Active Chat Window OR Empty State */}
      {activeConversation ? (
        <AgentChatWindow
          conversation={activeConversation}
          messages={messages}
          onSendMessage={sendMessage}
          onSendTyping={sendTyping}
          isTyping={isTyping}
          onOpenTransferModal={() => setIsTransferModalOpen(true)}
          onCloseChat={handleCloseActiveChat}
          onToggleAi={toggleAiMode}
        />
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 text-center p-8">
          <div className="w-16 h-16 rounded-3xl bg-telecom-50 text-telecom-600 flex items-center justify-center mb-4 shadow-sm">
            <MessageSquare className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-800">No Chat Selected</h3>
          <p className="text-xs text-slate-500 max-w-sm mt-1">
            Choose an ongoing conversation from the left sidebar, or invite a new customer via SMS.
          </p>
          {onOpenInviteModal && (
            <button
              onClick={onOpenInviteModal}
              className="mt-4 flex items-center gap-2 px-4 py-2 bg-telecom-600 hover:bg-telecom-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send Customer Invite</span>
            </button>
          )}
        </div>
      )}

      {/* Transfer Chat Modal */}
      <TransferModal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        conversation={activeConversation}
      />
    </div>
  );
}
