import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquare,
  Hash,
  Bot,
  Plus,
  Send,
  X,
  Minimize2,
  Maximize2,
  Sparkles,
  MapPin,
  Loader2,
  Cpu,
  UserPlus
} from 'lucide-react';
import { useProjectMessenger } from '../../features/planner/hooks/useProjectMessenger';
import { useCanvasState } from '../../features/planner/hooks/useCanvasState';
import { CanvasComment } from '../../types/comment';
import { useAuthStore } from '../../features/auth/store/useAuthStore';
import { CreateGroupModal } from '../modals/CreateGroupModal';
import { AddMembersModal } from '../modals/AddMembersModal';
import { ChatAttachment } from '../../types/chat';

interface ProjectMessengerWidgetProps {
  projectId: string;
  comments: CanvasComment[];
  onJumpToCanvas?: (x: number, y: number) => void;
}

export const ProjectMessengerWidget: React.FC<ProjectMessengerWidgetProps> = ({
  projectId,
  comments,
  onJumpToCanvas,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [isAddMembersOpen, setIsAddMembersOpen] = useState(false);
  const [input, setInput] = useState('');

  const currentUser = useAuthStore((state) => state.user);
  const { elements, stagePos, stageScale, unitMode } = useCanvasState();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    channels,
    activeChannelId,
    activeChannel,
    messages,
    isLoadingMessages,
    isSending,
    unreadMap,
    totalUnreadCount,
    setActiveChannelId,
    sendMessage,
    createChannel,
    addMembersToChannel,
  } = useProjectMessenger(projectId);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen && !isMinimized) {
      scrollToBottom();
    }
  }, [messages, isOpen, isMinimized]);

  // Context passed when invoking AI assistant in messages
  const getCanvasContext = () => {
    const typeCount: Record<string, number> = {};
    elements.forEach((el) => {
      typeCount[el.type] = (typeCount[el.type] || 0) + 1;
    });

    const commentSummaries = comments.map((c) => ({
      user: c.user?.fullName || 'User',
      content: c.content,
      isResolved: c.isResolved,
    }));

    return {
      elementCount: elements.length,
      elementTypes: typeCount,
      unitMode,
      comments: commentSummaries,
    };
  };

  const handleSend = async (e?: React.FormEvent, customContent?: string, customAttachments?: ChatAttachment[]) => {
    if (e) e.preventDefault();
    const text = customContent !== undefined ? customContent : input;
    if (!text.trim() || isSending) return;

    const context = getCanvasContext();
    await sendMessage(text, customAttachments, context);
    if (customContent === undefined) {
      setInput('');
    }
  };

  const handleAttachCurrentView = () => {
    // Calculate world center
    const centerX = Math.round((-stagePos.x + window.innerWidth / 2) / stageScale);
    const centerY = Math.round((-stagePos.y + window.innerHeight / 2) / stageScale);

    const attachment: ChatAttachment = {
      type: 'canvas-location',
      x: centerX,
      y: centerY,
      label: `Canvas Coords (X: ${centerX}, Y: ${centerY})`,
    };

    const attachText = input.trim()
      ? `${input.trim()} [📍 View Coordinates X:${centerX}, Y:${centerY}]`
      : `📍 Shared view coordinates (X: ${centerX}, Y: ${centerY})`;

    handleSend(undefined, attachText, [attachment]);
  };

  const handleAddAiMention = () => {
    if (!input.includes('@ai')) {
      setInput((prev) => (prev ? `@ai ${prev}` : '@ai '));
    }
  };

  return (
    <>
      <div className="fixed bottom-6 right-6 z-[80] flex flex-col items-end pointer-events-auto">
        {/* FLOATING TRIGGER BUTTON (When closed) */}
        {!isOpen && (
          <button
            onClick={() => {
              setIsOpen(true);
              setIsMinimized(false);
            }}
            className="group relative flex items-center gap-2.5 px-4 py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 text-white rounded-full shadow-2xl hover:shadow-[0_0_30px_rgba(59,130,246,0.6)] transition-all hover:scale-105 active:scale-95 border border-white/20"
          >
            <div className="p-1 rounded-full bg-white/20">
              <MessageSquare size={17} className="text-white" />
            </div>
            <div className="flex flex-col items-start text-left">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold tracking-wide">Team Messenger</span>
                <span className="flex items-center gap-0.5 px-1 py-0.2 rounded bg-cyan-400/20 text-cyan-200 text-[9px] font-bold">
                  <Sparkles size={9} /> AI
                </span>
              </div>
              <span className="text-[10px] text-blue-100 font-normal">
                {activeChannel ? `#${activeChannel.name}` : 'Project Discussions'}
              </span>
            </div>

            {totalUnreadCount > 0 && (
              <span className="absolute -top-1 -right-1 px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-bold shadow-md animate-bounce">
                {totalUnreadCount}
              </span>
            )}
          </button>
        )}

        {/* EXPANDED MESSENGER WINDOW */}
        {isOpen && (
          <div
            className={`bg-slate-900/95 backdrop-blur-2xl border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col transition-all duration-300 ${
              isMinimized
                ? 'w-80 h-14'
                : 'w-[420px] sm:w-[540px] md:w-[620px] h-[580px]'
            }`}
          >
            {/* Top Bar */}
            <div className="px-4 py-2.5 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
                  <MessageSquare size={16} />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-xs font-bold text-white">Project Messenger</h3>
                    <span className="px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 text-[9px] font-semibold border border-blue-500/30">
                      {channels.length} Groups
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Cpu size={10} className="text-emerald-400" />
                    Live Collaboration & EngiAI Copilot
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                  title={isMinimized ? 'Expand' : 'Minimize'}
                >
                  {isMinimized ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {!isMinimized && (
              <div className="flex-1 flex overflow-hidden">
                {/* LEFT SIDEBAR: Channels & Groups */}
                <div className="w-44 sm:w-48 bg-slate-950/90 border-r border-slate-800 flex flex-col shrink-0">
                  <div className="p-2.5 border-b border-slate-800/80 flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                      Channels
                    </span>
                    <button
                      onClick={() => setIsCreateGroupOpen(true)}
                      className="p-1 text-blue-400 hover:text-white hover:bg-blue-600/20 rounded-md transition-colors"
                      title="Create Group"
                    >
                      <Plus size={14} />
                    </button>
                  </div>

                  {/* Channel List */}
                  <div className="flex-1 overflow-y-auto p-1.5 flex flex-col gap-0.5">
                    {channels.map((c) => {
                      const isActive = c.id === activeChannelId;
                      const unread = unreadMap[c.id] || 0;
                      const isAiChannel = c.name === 'engi-ai';

                      return (
                        <button
                          key={c.id}
                          onClick={() => setActiveChannelId(c.id)}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-left transition-all ${
                            isActive
                              ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/30'
                              : 'text-slate-300 hover:bg-slate-850 hover:text-white'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            {isAiChannel ? (
                              <Bot size={13} className={isActive ? 'text-white' : 'text-cyan-400'} />
                            ) : (
                              <Hash size={13} className={isActive ? 'text-white' : 'text-slate-400'} />
                            )}
                            <span className="text-xs truncate">{c.name}</span>
                          </div>

                          {unread > 0 && !isActive && (
                            <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[9px] font-bold">
                              {unread}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* RIGHT CHAT AREA */}
                <div className="flex-1 flex flex-col bg-slate-900/60 overflow-hidden">
                  {/* Channel Header */}
                  <div className="px-3.5 py-2 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="flex items-center gap-1 font-bold text-xs text-white">
                        {activeChannel?.name === 'engi-ai' ? (
                          <Bot size={14} className="text-cyan-400" />
                        ) : (
                          <Hash size={14} className="text-blue-400" />
                        )}
                        <span>{activeChannel?.name || 'Discussion'}</span>
                      </div>
                      {activeChannel?.topic && (
                        <span className="text-[10px] text-slate-400 truncate hidden sm:inline">
                          · {activeChannel.topic}
                        </span>
                      )}
                    </div>

                    {/* Member Controls */}
                    {activeChannel && activeChannel.name !== 'engi-ai' && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => setIsAddMembersOpen(true)}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[10px] font-semibold text-slate-200 transition-colors"
                          title="Add Team Members"
                        >
                          <UserPlus size={11} className="text-blue-400" />
                          <span>{activeChannel.members?.length || 1}</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Messages Feed */}
                  <div className="flex-1 overflow-y-auto p-3.5 flex flex-col gap-3 text-xs">
                    {isLoadingMessages ? (
                      <div className="flex-1 flex items-center justify-center gap-2 text-slate-400 text-xs">
                        <Loader2 size={16} className="animate-spin text-blue-400" />
                        <span>Loading conversation...</span>
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-400 gap-2">
                        <div className="w-10 h-10 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-500">
                          <MessageSquare size={20} />
                        </div>
                        <p className="text-xs font-semibold text-slate-300">
                          Welcome to #{activeChannel?.name}
                        </p>
                        <p className="text-[11px] text-slate-400 max-w-xs">
                          Start the discussion with your team or mention{' '}
                          <span className="text-cyan-400 font-bold">@ai</span> for engineering advice.
                        </p>
                      </div>
                    ) : (
                      messages.map((msg) => {
                        const isMe = msg.userId === currentUser?.id;
                        const isAi = msg.isAi;

                        return (
                          <div
                            key={msg.id}
                            className={`flex flex-col max-w-[88%] ${
                              isMe ? 'self-end items-end' : 'self-start items-start'
                            }`}
                          >
                            {/* Author Header */}
                            <div className="flex items-center gap-1.5 mb-1 px-1">
                              {isAi ? (
                                <span className="flex items-center gap-1 text-[10px] font-bold text-cyan-300">
                                  <Sparkles size={10} /> EngiAI Copilot
                                </span>
                              ) : (
                                <>
                                  <span className="text-[10px] font-bold text-slate-300">
                                    {isMe ? 'You' : msg.user?.fullName || 'Engineer'}
                                  </span>
                                  {msg.user?.role && (
                                    <span className="px-1 py-0.2 rounded bg-slate-800 text-[8px] font-semibold text-slate-400">
                                      {msg.user.role}
                                    </span>
                                  )}
                                </>
                              )}
                              <span className="text-[9px] text-slate-400">
                                {new Date(msg.createdAt).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>

                            {/* Message Bubble */}
                            <div
                              className={`p-3 rounded-2xl leading-relaxed whitespace-pre-wrap ${
                                isAi
                                  ? 'bg-slate-950/90 text-slate-100 border border-cyan-500/40 rounded-bl-xs shadow-md shadow-cyan-500/5'
                                  : isMe
                                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-br-xs shadow-md'
                                  : 'bg-slate-800/90 text-slate-100 border border-slate-700/80 rounded-bl-xs shadow-xs'
                              }`}
                            >
                              {msg.content}

                              {/* Canvas Location Jump Attachments */}
                              {msg.attachments && msg.attachments.length > 0 && (
                                <div className="mt-2 pt-2 border-t border-white/15 flex flex-wrap gap-1.5">
                                  {msg.attachments.map((att, i) => (
                                    <button
                                      key={i}
                                      type="button"
                                      onClick={() => {
                                        if (att.x !== undefined && att.y !== undefined && onJumpToCanvas) {
                                          onJumpToCanvas(att.x, att.y);
                                        }
                                      }}
                                      className="flex items-center gap-1 px-2 py-1 rounded-lg bg-black/30 hover:bg-black/50 text-[10px] font-bold text-cyan-200 border border-cyan-400/30 transition-all hover:scale-105"
                                    >
                                      <MapPin size={10} className="text-cyan-400" />
                                      <span>{att.label || '📍 View on Canvas'}</span>
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}

                    {isSending && (
                      <div className="self-start flex items-center gap-2 p-2.5 bg-slate-800/70 rounded-2xl border border-slate-700/60 text-xs text-slate-300">
                        <Loader2 size={13} className="animate-spin text-cyan-400" />
                        <span>Sending message & processing AI copilot...</span>
                      </div>
                    )}

                    <div ref={messagesEndRef} />
                  </div>

                  {/* Input Toolbar & Shortcuts */}
                  <div className="px-3 py-1.5 border-t border-slate-800 bg-slate-950/60 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleAddAiMention}
                      className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-[10px] font-bold text-cyan-300 transition-colors"
                      title="Ask AI in this channel"
                    >
                      <Sparkles size={10} />
                      <span>@ai</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleAttachCurrentView}
                      className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[10px] font-semibold text-slate-300 transition-colors"
                      title="Share active canvas coordinates"
                    >
                      <MapPin size={10} className="text-blue-400" />
                      <span>Attach View</span>
                    </button>
                  </div>

                  {/* Message Input Form */}
                  <form
                    onSubmit={(e) => handleSend(e)}
                    className="p-2.5 border-t border-slate-800 bg-slate-950/80 flex gap-2 items-center"
                  >
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder={`Message #${activeChannel?.name || 'group'} (type @ai to ask)...`}
                      disabled={isSending}
                      className="flex-1 bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                    />
                    <button
                      type="submit"
                      disabled={!input.trim() || isSending}
                      className="p-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:opacity-90 transition-opacity disabled:opacity-40 shadow-sm shrink-0 font-semibold"
                    >
                      <Send size={14} />
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      <CreateGroupModal
        isOpen={isCreateGroupOpen}
        onClose={() => setIsCreateGroupOpen(false)}
        onCreate={createChannel}
      />

      <AddMembersModal
        isOpen={isAddMembersOpen}
        onClose={() => setIsAddMembersOpen(false)}
        channel={activeChannel}
        onAddMembers={addMembersToChannel}
      />
    </>
  );
};
