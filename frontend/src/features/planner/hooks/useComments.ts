import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { socket } from '../utils/socket';
import { CanvasComment, CommentReply } from '../../../types/comment';
import { useAuthStore } from '../../auth/store/useAuthStore';
import { useToast } from '../../../components/ui/ToastProvider';

export const useComments = (projectId: string | undefined) => {
  const [comments, setComments] = useState<CanvasComment[]>([]);
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);
  const [isAddingComment, setIsAddingComment] = useState<boolean>(false);
  const [pendingPinPos, setPendingPinPos] = useState<{ x: number; y: number } | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);

  const token = useAuthStore((state) => state.token);
  const currentUser = useAuthStore((state) => state.user);
  const { showToast } = useToast();

  const authHeaders = {
    headers: { Authorization: `Bearer ${token}` }
  };

  // Fetch comments
  const fetchComments = useCallback(async () => {
    if (!projectId || !token) return;
    setIsLoading(true);
    try {
      const res = await axios.get(`/api/v1/projects/${projectId}/comments`, authHeaders);
      setComments(res.data || []);
    } catch (err) {
      console.error('Failed to load comments:', err);
    } finally {
      setIsLoading(false);
    }
  }, [projectId, token]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  // Socket.io Real-time Event Subscription
  useEffect(() => {
    if (!projectId) return;

    // Join project-specific room
    socket.emit('join-project', projectId);

    const handleNewComment = (comment: CanvasComment) => {
      if (comment.projectId === projectId) {
        setComments((prev) => {
          if (prev.some((c) => c.id === comment.id)) return prev;
          return [...prev, comment];
        });
      }
    };

    const handleReplyAdded = (data: { projectId: string; commentId: string; reply: CommentReply }) => {
      if (data.projectId === projectId) {
        setComments((prev) =>
          prev.map((c) => {
            if (c.id === data.commentId) {
              const replies = c.replies || [];
              if (replies.some((r) => r.id === data.reply.id)) return c;
              return { ...c, replies: [...replies, data.reply] };
            }
            return c;
          })
        );
      }
    };

    const handleResolvedUpdated = (comment: CanvasComment) => {
      if (comment.projectId === projectId) {
        setComments((prev) =>
          prev.map((c) => (c.id === comment.id ? { ...c, ...comment } : c))
        );
      }
    };

    const handleCommentDeleted = (commentId: string) => {
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      setActiveCommentId((current) => (current === commentId ? null : current));
    };

    socket.on('new-comment', handleNewComment);
    socket.on('comment-reply-added', handleReplyAdded);
    socket.on('comment-resolved-updated', handleResolvedUpdated);
    socket.on('comment-deleted', handleCommentDeleted);

    return () => {
      socket.off('new-comment', handleNewComment);
      socket.off('comment-reply-added', handleReplyAdded);
      socket.off('comment-resolved-updated', handleResolvedUpdated);
      socket.off('comment-deleted', handleCommentDeleted);
    };
  }, [projectId]);

  // Create new spatial comment
  const createComment = async (x: number, y: number, content: string) => {
    if (!projectId || !token || !content.trim()) return;

    try {
      const res = await axios.post(
        `/api/v1/projects/${projectId}/comments`,
        { x, y, content },
        authHeaders
      );
      const newComment: CanvasComment = res.data;

      setComments((prev) => [...prev, newComment]);
      setActiveCommentId(newComment.id);
      setIsAddingComment(false);
      setPendingPinPos(null);

      // Broadcast via socket
      socket.emit('new-comment', { projectId, comment: newComment });
      showToast('Comment pin placed!', 'success');
    } catch (err: any) {
      console.error('Failed to create comment:', err);
      showToast('Failed to create comment.', 'error');
    }
  };

  // Reply to comment
  const addReply = async (commentId: string, content: string) => {
    if (!token || !content.trim()) return;

    try {
      const res = await axios.post(
        `/api/v1/comments/${commentId}/replies`,
        { content },
        authHeaders
      );
      const newReply: CommentReply = res.data;

      setComments((prev) =>
        prev.map((c) => {
          if (c.id === commentId) {
            return { ...c, replies: [...(c.replies || []), newReply] };
          }
          return c;
        })
      );

      // Broadcast via socket
      socket.emit('comment-reply-added', { projectId, commentId, reply: newReply });
      showToast('Reply posted!', 'success');
    } catch (err: any) {
      console.error('Failed to post reply:', err);
      showToast('Failed to post reply.', 'error');
    }
  };

  // Toggle resolve
  const toggleResolve = async (commentId: string, currentState: boolean) => {
    if (!token) return;

    try {
      const res = await axios.patch(
        `/api/v1/comments/${commentId}/resolve`,
        { isResolved: !currentState },
        authHeaders
      );
      const updated: CanvasComment = res.data;

      setComments((prev) =>
        prev.map((c) => (c.id === commentId ? updated : c))
      );

      socket.emit('comment-resolved-updated', { projectId, comment: updated });
      showToast(
        updated.isResolved ? 'Thread marked as resolved.' : 'Thread reopened.',
        'info'
      );
    } catch (err: any) {
      console.error('Failed to update resolve state:', err);
      showToast('Failed to update thread status.', 'error');
    }
  };

  // Delete comment
  const deleteComment = async (commentId: string) => {
    if (!token) return;

    try {
      await axios.delete(`/api/v1/comments/${commentId}`, authHeaders);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      if (activeCommentId === commentId) setActiveCommentId(null);

      socket.emit('comment-deleted', { projectId, commentId });
      showToast('Comment deleted.', 'info');
    } catch (err: any) {
      console.error('Failed to delete comment:', err);
      showToast('Failed to delete comment.', 'error');
    }
  };

  return {
    comments,
    activeCommentId,
    setActiveCommentId,
    isAddingComment,
    setIsAddingComment,
    pendingPinPos,
    setPendingPinPos,
    isLoading,
    isSidebarOpen,
    setIsSidebarOpen,
    createComment,
    addReply,
    toggleResolve,
    deleteComment,
    currentUser,
    refetch: fetchComments
  };
};
