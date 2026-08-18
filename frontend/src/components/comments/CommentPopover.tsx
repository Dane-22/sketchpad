import React, { useState } from 'react';
import { X, Send, CheckCircle2, Trash2, MessageSquare, CornerDownRight } from 'lucide-react';
import { CanvasComment } from '../../types/comment';
import { useCanvasState } from '../../features/planner/hooks/useCanvasState';

interface CommentPopoverProps {
  activeComment: CanvasComment | null;
  pendingPinPos: { x: number; y: number } | null;
  onClose: () => void;
  onCreateComment: (x: number, y: number, content: string) => void;
  onAddReply: (commentId: string, content: string) => void;
  onToggleResolve: (commentId: string, currentState: boolean) => void;
  onDeleteComment: (commentId: string) => void;
  currentUserId?: string;
}

export const CommentPopover: React.FC<CommentPopoverProps> = ({
  activeComment,
  pendingPinPos,
  onClose,
  onCreateComment,
  onAddReply,
  onToggleResolve,
  onDeleteComment,
  currentUserId,
}) => {
  const { stageScale, stagePos } = useCanvasState();
  const [newCommentText, setNewCommentText] = useState('');
  const [replyText, setReplyText] = useState('');

  if (!activeComment && !pendingPinPos) return null;

  // Determine target canvas coordinates
  const pinX = activeComment ? activeComment.x : pendingPinPos!.x;
  const pinY = activeComment ? activeComment.y : pendingPinPos!.y;

  // Convert to screen position
  const rawScreenX = pinX * stageScale + stagePos.x;
  const rawScreenY = pinY * stageScale + stagePos.y;

  // Adjust offsets to keep popover comfortably inside viewport
  const popoverWidth = 340;
  const left = Math.min(Math.max(rawScreenX + 20, 16), window.innerWidth - popoverWidth - 20);
  const top = Math.min(Math.max(rawScreenY - 20, 70), window.innerHeight - 450);

  const handlePostNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim() || !pendingPinPos) return;
    onCreateComment(pendingPinPos.x, pendingPinPos.y, newCommentText.trim());
    setNewCommentText('');
  };

  const handlePostReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !activeComment) return;
    onAddReply(activeComment.id, replyText.trim());
    setReplyText('');
  };

  const formatTime = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' · ' + date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  return (
    <div
      className="absolute z-[90] w-[340px] bg-slate-900/95 backdrop-blur-2xl border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-100 transition-all duration-200 animate-fadeIn"
      style={{ left: `${left}px`, top: `${top}px` }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* PENDING PIN CREATION MODE */}
      {pendingPinPos && !activeComment && (
        <form onSubmit={handlePostNew} className="p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-theme-accent">
              <MessageSquare size={16} />
              <span>New Comment Pin</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800/60 transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          <textarea
            autoFocus
            value={newCommentText}
            onChange={(e) => setNewCommentText(e.target.value)}
            placeholder="Write a comment or discussion point..."
            rows={3}
            className="w-full bg-slate-950/90 border border-slate-700/80 rounded-xl p-3 text-xs text-white placeholder:text-slate-400 outline-none focus:border-theme-accent focus:ring-1 focus:ring-theme-accent resize-none transition-colors leading-relaxed"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handlePostNew(e);
              }
            }}
          />

          <div className="flex items-center justify-between gap-2 pt-1">
            <span className="text-[10px] text-slate-400">Press Enter to post</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 text-xs rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!newCommentText.trim()}
                className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-lg bg-theme-accent text-slate-900 hover:opacity-90 transition-opacity disabled:opacity-40"
              >
                <Send size={13} />
                <span>Post Pin</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* ACTIVE COMMENT THREAD VIEW */}
      {activeComment && (
        <>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950/60">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-theme-accent to-blue-400 flex items-center justify-center text-[10px] font-bold text-slate-900">
                {activeComment.user?.fullName?.charAt(0) || 'U'}
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-white leading-none">
                  {activeComment.user?.fullName || 'User'}
                </span>
                <span className="text-[10px] text-slate-400 leading-tight mt-0.5">
                  {formatTime(activeComment.createdAt)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => onToggleResolve(activeComment.id, activeComment.isResolved)}
                className={`p-1.5 rounded-lg text-xs flex items-center gap-1 transition-colors ${
                  activeComment.isResolved
                    ? 'text-emerald-400 hover:bg-emerald-500/10'
                    : 'text-slate-400 hover:text-emerald-400 hover:bg-slate-800/60'
                }`}
                title={activeComment.isResolved ? 'Reopen discussion' : 'Mark as resolved'}
              >
                <CheckCircle2 size={16} />
              </button>

              {(currentUserId === activeComment.userId || !currentUserId) && (
                <button
                  onClick={() => onDeleteComment(activeComment.id)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  title="Delete thread"
                >
                  <Trash2 size={15} />
                </button>
              )}

              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Original Comment Body */}
          <div className="p-4 border-b border-slate-800">
            <p className="text-xs leading-relaxed text-slate-100 whitespace-pre-wrap">
              {activeComment.content}
            </p>
            {activeComment.isResolved && (
              <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-medium">
                <CheckCircle2 size={11} />
                <span>Resolved</span>
              </div>
            )}
          </div>

          {/* Replies Thread */}
          {activeComment.replies && activeComment.replies.length > 0 && (
            <div className="max-h-48 overflow-y-auto p-4 flex flex-col gap-3 bg-slate-950/40">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1">
                <CornerDownRight size={12} />
                <span>{activeComment.replies.length} Repl{activeComment.replies.length > 1 ? 'ies' : 'y'}</span>
              </span>
              {activeComment.replies.map((reply) => (
                <div key={reply.id} className="flex gap-2 text-xs">
                  <div className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-[9px] font-bold text-theme-accent shrink-0 mt-0.5 border border-slate-700">
                    {reply.user?.fullName?.charAt(0) || 'U'}
                  </div>
                  <div className="flex flex-col flex-1 bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/70">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-[11px] font-semibold text-white">
                        {reply.user?.fullName || 'User'}
                      </span>
                      <span className="text-[9px] text-slate-400">
                        {formatTime(reply.createdAt)}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-200 leading-relaxed whitespace-pre-wrap">
                      {reply.content}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Reply Form */}
          <form onSubmit={handlePostReply} className="p-3 bg-slate-950/60 border-t border-slate-800 flex gap-2 items-center">
            <input
              type="text"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Reply to thread..."
              className="flex-1 bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs text-white placeholder:text-slate-400 outline-none focus:border-theme-accent focus:ring-1 focus:ring-theme-accent transition-colors"
            />
            <button
              type="submit"
              disabled={!replyText.trim()}
              className="p-2 rounded-xl bg-theme-accent text-slate-900 hover:opacity-90 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed shrink-0 shadow-sm font-semibold"
              title="Send reply"
            >
              <Send size={13} />
            </button>
          </form>
        </>
      )}
    </div>
  );
};
