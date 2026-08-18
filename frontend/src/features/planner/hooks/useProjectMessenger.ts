import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { socket } from '../utils/socket';
import { useAuthStore } from '../../auth/store/useAuthStore';
import { ChatChannel, ChatMessage, ChatAttachment } from '../../../types/chat';

export const useProjectMessenger = (projectId: string) => {
  const [channels, setChannels] = useState<ChatChannel[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoadingChannels, setIsLoadingChannels] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [unreadMap, setUnreadMap] = useState<Record<string, number>>({});

  const token = useAuthStore((state) => state.token);
  const currentUser = useAuthStore((state) => state.user);

  const activeChannelIdRef = useRef<string | null>(activeChannelId);
  activeChannelIdRef.current = activeChannelId;

  // 1. Fetch channels for the project
  const fetchChannels = useCallback(async () => {
    if (!projectId || !token) return;
    setIsLoadingChannels(true);
    try {
      const res = await axios.get<ChatChannel[]>(`/api/v1/projects/${projectId}/channels`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setChannels(res.data);
      if (!activeChannelIdRef.current && res.data.length > 0) {
        setActiveChannelId(res.data[0].id);
      }
    } catch (err) {
      console.error('Failed to load project channels:', err);
    } finally {
      setIsLoadingChannels(false);
    }
  }, [projectId, token]);

  // 2. Fetch messages for active channel
  const fetchMessages = useCallback(async (channelId: string) => {
    if (!channelId || !token) return;
    setIsLoadingMessages(true);
    try {
      const res = await axios.get<ChatMessage[]>(`/api/v1/channels/${channelId}/messages`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessages(res.data);
      // Reset unread for this channel
      setUnreadMap((prev) => ({ ...prev, [channelId]: 0 }));
    } catch (err) {
      console.error('Failed to load messages for channel:', err);
    } finally {
      setIsLoadingMessages(false);
    }
  }, [token]);

  // Load channels on mount / project change
  useEffect(() => {
    fetchChannels();
  }, [fetchChannels]);

  // Load messages when active channel changes
  useEffect(() => {
    if (activeChannelId) {
      fetchMessages(activeChannelId);
      socket.emit('join-channel', activeChannelId);
    }
  }, [activeChannelId, fetchMessages]);

  // Real-time socket events for chat
  useEffect(() => {
    if (!socket.connected) {
      socket.connect();
    }

    const handleMessageReceived = (data: { projectId: string; channelId: string; message: any }) => {
      if (data.channelId === activeChannelIdRef.current) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === data.message.id)) return prev;
          return [...prev, data.message];
        });
      } else {
        // Increment unread count for other channel
        setUnreadMap((prev) => ({
          ...prev,
          [data.channelId]: (prev[data.channelId] || 0) + 1
        }));
      }
    };

    const handleChannelCreated = (newChannel: ChatChannel) => {
      setChannels((prev) => {
        if (prev.some((c) => c.id === newChannel.id)) return prev;
        return [...prev, newChannel];
      });
    };

    const handleChannelMemberUpdated = (data: { projectId: string; channelId: string }) => {
      if (data.projectId === projectId) {
        fetchChannels();
      }
    };

    socket.on('channel-message-received', handleMessageReceived);
    socket.on('channel-created', handleChannelCreated);
    socket.on('channel-member-updated', handleChannelMemberUpdated);

    return () => {
      socket.off('channel-message-received', handleMessageReceived);
      socket.off('channel-created', handleChannelCreated);
      socket.off('channel-member-updated', handleChannelMemberUpdated);
    };
  }, [projectId, fetchChannels]);

  // 3. Send message
  const sendMessage = async (
    content: string,
    attachments?: ChatAttachment[],
    context?: any
  ) => {
    if (!activeChannelId || !content.trim() || !token || isSending) return;

    setIsSending(true);
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: ChatMessage = {
      id: tempId,
      channelId: activeChannelId,
      userId: currentUser?.id,
      user: currentUser ? {
        id: currentUser.id,
        fullName: currentUser.fullName,
        email: currentUser.email,
        role: currentUser.role as any
      } : null,
      isAi: false,
      content: content.trim(),
      attachments: attachments || null,
      createdAt: new Date().toISOString()
    };

    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      const res = await axios.post<{ userMessage: ChatMessage; aiMessage?: ChatMessage }>(
        `/api/v1/channels/${activeChannelId}/messages`,
        { content, attachments, context },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Replace optimistic message with actual saved user message
      setMessages((prev) => {
        const filtered = prev.filter((m) => m.id !== tempId);
        const nextList = [...filtered, res.data.userMessage];
        if (res.data.aiMessage) {
          nextList.push(res.data.aiMessage);
        }
        return nextList;
      });

      // Broadcast user message to other connected clients
      socket.emit('send-channel-message', {
        projectId,
        channelId: activeChannelId,
        message: res.data.userMessage
      });

      // If AI generated a reply, broadcast it too
      if (res.data.aiMessage) {
        socket.emit('send-channel-message', {
          projectId,
          channelId: activeChannelId,
          message: res.data.aiMessage
        });
      }
    } catch (err) {
      console.error('Failed to send message:', err);
      // Remove optimistic message if failed
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    } finally {
      setIsSending(false);
    }
  };

  // 4. Create channel
  const createChannel = async (name: string, topic?: string, memberIds?: string[]) => {
    if (!projectId || !token) return null;
    try {
      const res = await axios.post<ChatChannel>(
        `/api/v1/projects/${projectId}/channels`,
        { name, topic, memberIds },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setChannels((prev) => [...prev, res.data]);
      setActiveChannelId(res.data.id);

      socket.emit('channel-created', {
        projectId,
        channel: res.data
      });

      return res.data;
    } catch (err) {
      console.error('Failed to create channel:', err);
      return null;
    }
  };

  // 5. Add members to channel
  const addMembersToChannel = async (channelId: string, userIds: string[]) => {
    if (!channelId || !token) return;
    try {
      await axios.post(
        `/api/v1/channels/${channelId}/members`,
        { userIds },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchChannels();
      socket.emit('channel-member-updated', { projectId, channelId });
    } catch (err) {
      console.error('Failed to add members:', err);
    }
  };

  // 6. Remove member from channel
  const removeMemberFromChannel = async (channelId: string, userId: string) => {
    if (!channelId || !token) return;
    try {
      await axios.delete(`/api/v1/channels/${channelId}/members/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchChannels();
      socket.emit('channel-member-updated', { projectId, channelId });
    } catch (err) {
      console.error('Failed to remove member:', err);
    }
  };

  const activeChannel = channels.find((c) => c.id === activeChannelId) || null;
  const totalUnreadCount = Object.values(unreadMap).reduce((a, b) => a + b, 0);

  return {
    channels,
    activeChannelId,
    activeChannel,
    messages,
    isLoadingChannels,
    isLoadingMessages,
    isSending,
    unreadMap,
    totalUnreadCount,
    setActiveChannelId,
    fetchChannels,
    fetchMessages,
    sendMessage,
    createChannel,
    addMembersToChannel,
    removeMemberFromChannel,
  };
};
