import { create } from 'zustand';
import api from '../services/api';
import { getSocket } from '../services/socket';

export const useChatStore = create((set, get) => ({
  conversations: [],
  activeConversation: null,
  messages: [],
  isTyping: false,
  typingUser: '',
  incomingAlert: null,
  availableAgents: [],
  isLoadingConversations: false,
  isLoadingMessages: false,

  setIncomingAlert: (alert) => set({ incomingAlert: alert }),
  clearIncomingAlert: () => set({ incomingAlert: null }),

  fetchConversations: async (params = {}) => {
    set({ isLoadingConversations: true });
    try {
      const res = await api.get('/conversations', { params });
      set({
        conversations: res.data.conversations || [],
        isLoadingConversations: false
      });
    } catch (err) {
      console.error('Failed to fetch conversations:', err);
      set({ isLoadingConversations: false });
    }
  },

  selectConversation: async (conversation) => {
    set({ activeConversation: conversation, isLoadingMessages: true, messages: [] });
    try {
      const res = await api.get(`/conversations/${conversation.id}/messages`);
      set({
        messages: res.data.messages || [],
        isLoadingMessages: false
      });

      // Join socket room
      const socket = getSocket();
      if (socket) {
        socket.emit('chat:join', { conversationId: conversation.id });
        socket.emit('chat:read', { conversationId: conversation.id });
      }
    } catch (err) {
      console.error('Failed to load messages for conversation:', err);
      set({ isLoadingMessages: false });
    }
  },

  sendMessage: (content, messageType = 'text', fileUrl = null) => {
    const { activeConversation } = get();
    if (!activeConversation) return;

    const socket = getSocket();
    if (socket) {
      socket.emit('chat:message', {
        conversationId: activeConversation.id,
        content,
        messageType,
        fileUrl
      }, (res) => {
        if (res && res.error) {
          console.error('Error sending message:', res.error);
        }
      });
    }
  },

  sendTyping: (isTyping) => {
    const { activeConversation } = get();
    if (!activeConversation) return;
    const socket = getSocket();
    if (socket) {
      socket.emit('chat:typing', {
        conversationId: activeConversation.id,
        isTyping
      });
    }
  },

  addMessage: (message) => {
    const { activeConversation, messages, conversations } = get();

    // If message belongs to active conversation, append it
    if (activeConversation && activeConversation.id === message.conversation_id) {
      // Deduplicate if already present
      if (!messages.some(m => m.id === message.id)) {
        set({ messages: [...messages, message] });
      }
    }

    // Also update last message in conversation list
    const updatedConversations = conversations.map(c => {
      if (c.id === message.conversation_id) {
        return {
          ...c,
          last_message: message.content,
          last_message_at: message.created_at,
          message_count: (parseInt(c.message_count || 0, 10) + 1).toString()
        };
      }
      return c;
    });

    set({ conversations: updatedConversations });
  },

  setTypingIndicator: (isTyping, senderName = '') => {
    set({ isTyping, typingUser: senderName });
  },

  markMessagesRead: () => {
    const { messages } = get();
    const updated = messages.map(m => ({ ...m, status: 'read' }));
    set({ messages: updated });
  },

  fetchAvailableAgents: async () => {
    try {
      const res = await api.get('/users/agents/available');
      set({ availableAgents: res.data.agents || [] });
    } catch (err) {
      console.error('Failed to fetch available agents:', err);
    }
  },

  transferChat: async (conversationId, toAgentId, reason) => {
    return new Promise((resolve) => {
      const socket = getSocket();
      if (!socket) return resolve({ success: false, error: 'Socket not connected' });

      socket.emit('chat:transfer_request', {
        conversationId,
        toAgentId,
        reason
      }, (res) => {
        if (res.success) {
          // Remove or update from local conversations
          const { conversations, activeConversation } = get();
          set({
            conversations: conversations.filter(c => c.id !== conversationId),
            activeConversation: activeConversation?.id === conversationId ? null : activeConversation
          });
        }
        resolve(res);
      });
    });
  },

  toggleAiMode: (conversationId, enableAi) => {
    return new Promise((resolve) => {
      const socket = getSocket();
      if (!socket) return resolve({ success: false, error: 'Socket not connected' });

      socket.emit('chat:toggle_ai', { conversationId, enableAi }, (res) => {
        if (res?.success) {
          const { activeConversation, conversations } = get();
          const mode = res.handlingMode || (enableAi ? 'ai' : 'human');
          
          if (activeConversation && activeConversation.id === conversationId) {
            set({
              activeConversation: {
                ...activeConversation,
                handling_mode: mode,
                handoff_requested: false
              }
            });
          }

          set({
            conversations: conversations.map(c => 
              c.id === conversationId 
                ? { ...c, handling_mode: mode, handoff_requested: false }
                : c
            )
          });
        }
        resolve(res);
      });
    });
  },

  updateConversationHandling: (conversationId, handlingMode, handoffRequested = false) => {
    const { activeConversation, conversations } = get();
    if (activeConversation && activeConversation.id === conversationId) {
      set({
        activeConversation: {
          ...activeConversation,
          handling_mode: handlingMode,
          handoff_requested: handoffRequested
        }
      });
    }

    set({
      conversations: conversations.map(c =>
        c.id === conversationId
          ? { ...c, handling_mode: handlingMode, handoff_requested: handoffRequested }
          : c
      )
    });
  },

  closeChat: async (conversationId, reason = '') => {
    try {
      await api.post(`/conversations/${conversationId}/close`, { reason });
      const { conversations, activeConversation } = get();

      const updated = conversations.map(c => {
        if (c.id === conversationId) {
          return { ...c, status: 'closed' };
        }
        return c;
      });

      set({
        conversations: updated,
        activeConversation: activeConversation?.id === conversationId 
          ? { ...activeConversation, status: 'closed' } 
          : activeConversation
      });
      return { success: true };
    } catch (err) {
      console.error('Failed to close conversation:', err);
      return { success: false, error: err.response?.data?.error || err.message };
    }
  }
}));
