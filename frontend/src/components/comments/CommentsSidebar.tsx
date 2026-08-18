import React, { useState } from 'react';
import { MessageSquare, X, Plus, CheckCircle2, MessageCircle, MapPin, Search } from 'lucide-react';
import { CanvasComment } from '../../types/comment';
import { useCanvasState } from '../../features/planner/hooks/useCanvasState';

interface CommentsSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  comments: CanvasComment[];
  activeCommentId: string | null;
  onSelectComment: (commentId: string) => void;
  onStartAddComment: () => void;
  isAddingComment: boolean;
}

export const CommentsSidebar: React.FC<CommentsSidebarProps> = ({
  isOpen,
  onClose,
  comments,
  activeCommentId,
  onSelectComment,
  onStartAddComment,
  isAddingComment,
}) => {
  const { stageWidth, stageHeight, stageScale, setStagePos } = useCanvasState();
  const [filter, setFilter] = useState<'all' | 'active' | 'resolved'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const filteredComments = comments.filter((c) => {
    if (filter === 'active' && c.isResolved) return false;
    if (filter === 'resolved' && !c.isResolved) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchContent = c.content.toLowerCase().includes(q);
      const matchAuthor = c.user?.fullName?.toLowerCase().includes(q);
      const matchReply = c.replies?.some((r) => r.content.toLowerCase().includes(q));
      return matchContent || matchAuthor || matchReply;
    }
    return true;
  });

  const activeCount = comments.filter((c) => !c.isResolved).length;
  const resolvedCount = comments.filter((c) => c.isResolved).length;

  const handleFocusPin = (comment: CanvasComment) => {
    // Center canvas view around this comment
    const targetX = -(comment.x * stageScale) + stageWidth / 2;
    const targetY = -(comment.y * stageScale) + stageHeight / 2;
    setStagePos({ x: targetX, y: targetY });
    onSelectComment(comment.id);
  };

  return (
    <aside className="absolute right-0 top-0 bottom-0 w-80 bg-slate-900/95 backdrop-blur-2xl border-l border-slate-700/80 z-40 flex flex-col shadow-2xl transition-all duration-300 animate-slideLeft text-slate-100">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-theme-accent/10 text-theme-accent">
            <MessageSquare size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white leading-tight">Canvas Discussions</h3>
            <p className="text-[10px] text-slate-400">{activeCount} active · {resolvedCount} resolved</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/60 transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      {/* Add Pin Action Bar */}
      <div className="p-3 border-b border-slate-800 bg-slate-950/40">
        <button
          onClick={onStartAddComment}
          className={`w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
            isAddingComment
              ? 'bg-amber-500 text-slate-950 ring-2 ring-amber-400/50 shadow-md'
              : 'bg-theme-accent text-slate-950 hover:opacity-90 shadow-sm'
          }`}
        >
          <Plus size={15} strokeWidth={2.5} />
          <span>{isAddingComment ? 'Click on canvas to drop pin...' : 'Drop a Comment Pin'}</span>
        </button>
      </div>

      {/* Filters & Search */}
      <div className="p-3 border-b border-slate-800 flex flex-col gap-2 bg-slate-950/20">
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search discussions..."
            className="w-full bg-slate-950/90 border border-slate-700/80 rounded-lg pl-8 pr-2 py-1.5 text-xs text-white placeholder:text-slate-400 outline-none focus:border-theme-accent transition-colors"
          />
        </div>

        <div className="flex rounded-lg bg-slate-950/80 p-0.5 border border-slate-800 text-xs">
          <button
            onClick={() => setFilter('all')}
            className={`flex-1 py-1 text-center rounded-md font-medium transition-colors ${
              filter === 'all'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            All ({comments.length})
          </button>
          <button
            onClick={() => setFilter('active')}
            className={`flex-1 py-1 text-center rounded-md font-medium transition-colors ${
              filter === 'active'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Active ({activeCount})
          </button>
          <button
            onClick={() => setFilter('resolved')}
            className={`flex-1 py-1 text-center rounded-md font-medium transition-colors ${
              filter === 'resolved'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Resolved ({resolvedCount})
          </button>
        </div>
      </div>

      {/* Discussions List */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2.5">
        {filteredComments.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center p-8 text-slate-400 gap-2 mt-8">
            <MessageCircle size={32} className="opacity-30" />
            <p className="text-xs font-medium">No discussions found</p>
            <span className="text-[10px]">
              {comments.length === 0
                ? 'Click "Drop a Comment Pin" to initiate a discussion point.'
                : 'Try adjusting your search filter.'}
            </span>
          </div>
        ) : (
          filteredComments.map((comment) => {
            const isSelected = activeCommentId === comment.id;
            const originalIndex = comments.findIndex((c) => c.id === comment.id) + 1;
            const replyCount = comment.replies?.length || 0;

            return (
              <div
                key={comment.id}
                onClick={() => handleFocusPin(comment)}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  isSelected
                    ? 'border-theme-accent bg-slate-800/90 shadow-md ring-1 ring-theme-accent/30'
                    : 'border-slate-700/60 bg-slate-800/60 hover:bg-slate-800/90 text-slate-100'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center text-[10px] font-bold text-theme-accent border border-slate-600">
                      #{originalIndex}
                    </span>
                    <span className="text-xs font-semibold text-white">
                      {comment.user?.fullName || 'User'}
                    </span>
                  </div>
                  {comment.isResolved ? (
                    <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-medium">
                      <CheckCircle2 size={11} /> Resolved
                    </span>
                  ) : (
                    <span className="text-[10px] text-amber-400 font-medium">
                      Active
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-200 line-clamp-2 leading-relaxed mb-2">
                  {comment.content}
                </p>

                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-700/50">
                  <span className="flex items-center gap-1">
                    <MapPin size={10} />
                    {Math.round(comment.x)}, {Math.round(comment.y)}
                  </span>
                  {replyCount > 0 && (
                    <span className="flex items-center gap-1 text-theme-accent font-medium">
                      <MessageCircle size={10} />
                      {replyCount} repl{replyCount > 1 ? 'ies' : 'y'}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};

export default CommentsSidebar;

