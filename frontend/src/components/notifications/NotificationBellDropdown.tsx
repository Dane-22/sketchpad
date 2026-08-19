import React, { useState, useRef, useEffect } from 'react';
import {
  Bell,
  CheckCheck,
  Trash2,
  Settings,
  Bot,
  MessageSquare,
  MapPin,
  AtSign,
  Sparkles,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { useNotificationCenter } from '../../features/notifications/hooks/useNotificationCenter';
import { usePushNotifications } from '../../features/notifications/hooks/usePushNotifications';
import { NotificationItem } from '../../types/notification';
import { NotificationSettingsModal } from '../modals/NotificationSettingsModal';

interface NotificationBellDropdownProps {
  onJumpToCanvas?: (x: number, y: number) => void;
  onOpenChannel?: (channelId: string) => void;
}

export const NotificationBellDropdown: React.FC<NotificationBellDropdownProps> = ({
  onJumpToCanvas,
  onOpenChannel,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'ai' | 'chat'>('all');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearAll,
  } = useNotificationCenter();

  const {
    isPushSubscribed,
    subscribeToPush,
    isRegistering,
  } = usePushNotifications();

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const filteredNotifications = notifications.filter((n) => {
    if (activeTab === 'ai') return n.type.startsWith('AI_');
    if (activeTab === 'chat') return n.type.startsWith('CHAT_') || n.type.startsWith('COMMENT_');
    return true;
  });

  const handleNotificationClick = (item: NotificationItem) => {
    markAsRead(item.id);

    const data = item.data;
    if (data?.x !== undefined && data?.y !== undefined && onJumpToCanvas) {
      onJumpToCanvas(data.x, data.y);
    }

    if (data?.channelId && onOpenChannel) {
      onOpenChannel(data.channelId);
    }

    setIsOpen(false);
  };

  const getNotificationIcon = (type: string) => {
    if (type.startsWith('AI_')) {
      return (
        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white shrink-0 shadow-md shadow-cyan-500/20">
          <Bot size={15} />
        </div>
      );
    }
    if (type === 'CHAT_MENTION') {
      return (
        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shrink-0 shadow-md shadow-purple-500/20">
          <AtSign size={15} />
        </div>
      );
    }
    if (type === 'CHAT_CANVAS_LOCATION' || type.startsWith('COMMENT_')) {
      return (
        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-600 to-orange-500 flex items-center justify-center text-white shrink-0 shadow-md shadow-amber-500/20">
          <MapPin size={15} />
        </div>
      );
    }
    return (
      <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shrink-0 shadow-md shadow-blue-500/20">
        <MessageSquare size={15} />
      </div>
    );
  };

  const formatTimeAgo = (dateStr: string) => {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDays = Math.floor(diffHr / 24);
    return `${diffDays}d ago`;
  };

  return (
    <>
      <div className="relative inline-block" ref={dropdownRef}>
        {/* BELL TRIGGER BUTTON */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`relative p-2 rounded-xl transition-all ${
            isOpen
              ? 'bg-blue-600/20 text-blue-400 border border-blue-500/40 shadow-[0_0_15px_rgba(59,130,246,0.3)]'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/80 border border-transparent'
          }`}
          title="Notifications & Alerts"
        >
          <Bell size={18} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full bg-gradient-to-r from-rose-500 to-pink-500 text-white text-[10px] font-bold shadow-md shadow-rose-500/30 animate-pulse min-w-[18px] text-center">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

        {/* DROPDOWN MENU */}
        {isOpen && (
          <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-slate-900/95 backdrop-blur-2xl border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden z-50 flex flex-col animate-in fade-in slide-in-from-top-2 duration-200">
            {/* Header */}
            <div className="p-3.5 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold text-white">Notifications</h3>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.2 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-bold border border-blue-500/30">
                    {unreadCount} unread
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="p-1.5 text-slate-400 hover:text-cyan-300 hover:bg-slate-800 rounded-lg transition-colors text-[11px] flex items-center gap-1"
                    title="Mark all as read"
                  >
                    <CheckCheck size={14} />
                    <span className="hidden sm:inline text-[10px]">Read all</span>
                  </button>
                )}
                <button
                  onClick={() => setIsSettingsOpen(true)}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                  title="Notification Settings"
                >
                  <Settings size={14} />
                </button>
              </div>
            </div>

            {/* Browser Push Permission Promo Banner (if not subscribed) */}
            {!isPushSubscribed && (
              <div className="p-3 bg-gradient-to-r from-blue-600/20 via-indigo-600/20 to-cyan-500/20 border-b border-blue-500/20 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <ShieldCheck size={16} className="text-cyan-400 shrink-0" />
                  <span className="text-[11px] text-slate-200 truncate">
                    Enable native Windows desktop alerts
                  </span>
                </div>
                <button
                  onClick={subscribeToPush}
                  disabled={isRegistering}
                  className="shrink-0 px-2.5 py-1 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-[10px] font-bold hover:opacity-95 shadow-sm"
                >
                  {isRegistering ? 'Enabling...' : 'Enable'}
                </button>
              </div>
            )}

            {/* Filter Tabs */}
            <div className="px-3 pt-2 pb-1.5 border-b border-slate-800 bg-slate-950/40 flex gap-1">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                  activeTab === 'all'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                All ({notifications.length})
              </button>
              <button
                onClick={() => setActiveTab('ai')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                  activeTab === 'ai'
                    ? 'bg-cyan-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-cyan-300 hover:bg-slate-800'
                }`}
              >
                <Sparkles size={10} />
                <span>EngiAI</span>
              </button>
              <button
                onClick={() => setActiveTab('chat')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                  activeTab === 'chat'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                Messenger
              </button>
            </div>

            {/* Notifications Feed */}
            <div className="max-h-[360px] overflow-y-auto p-2 flex flex-col gap-1 text-xs">
              {filteredNotifications.length === 0 ? (
                <div className="p-8 flex flex-col items-center justify-center text-center text-slate-500 gap-2">
                  <div className="w-10 h-10 rounded-2xl bg-slate-800/80 flex items-center justify-center text-slate-400">
                    <Bell size={18} />
                  </div>
                  <span className="text-xs font-semibold text-slate-400">All caught up!</span>
                  <span className="text-[11px] text-slate-400">No new notifications in this category.</span>
                </div>
              ) : (
                filteredNotifications.map((item) => {
                  const isUnread = !item.isRead;
                  const data = item.data;

                  return (
                    <div
                      key={item.id}
                      onClick={() => handleNotificationClick(item)}
                      className={`group relative p-3 rounded-2xl border transition-all cursor-pointer flex gap-3 items-start ${
                        isUnread
                          ? 'bg-slate-800/80 hover:bg-slate-800 border-blue-500/30 shadow-xs'
                          : 'bg-slate-950/40 hover:bg-slate-800/50 border-slate-800/60'
                      }`}
                    >
                      {getNotificationIcon(item.type)}

                      <div className="flex-1 min-w-0 flex flex-col">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <span className={`text-[11px] font-bold truncate ${isUnread ? 'text-white' : 'text-slate-300'}`}>
                            {item.title}
                          </span>
                          <span className="text-[9px] text-slate-400 shrink-0">
                            {formatTimeAgo(item.createdAt)}
                          </span>
                        </div>

                        <p className="text-[11px] text-slate-300 line-clamp-2 leading-relaxed">
                          {item.body}
                        </p>

                        {/* Interactive Jump Tags */}
                        {data?.x !== undefined && data?.y !== undefined && (
                          <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded-lg border border-cyan-500/20 w-fit">
                            <MapPin size={10} />
                            <span>Jump to Coords (X: {data.x}, Y: {data.y})</span>
                          </div>
                        )}
                      </div>

                      {isUnread && (
                        <span className="w-2 h-2 rounded-full bg-blue-400 shrink-0 mt-1 shadow-sm shadow-blue-400" />
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="p-2 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
                <button
                  onClick={clearAll}
                  className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 text-[10px] flex items-center gap-1 transition-colors"
                >
                  <Trash2 size={12} />
                  <span>Clear history</span>
                </button>

                <button
                  onClick={() => setIsSettingsOpen(true)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 text-[10px] flex items-center gap-1 transition-colors"
                >
                  <span>Preferences</span>
                  <ChevronRight size={12} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Settings Modal */}
      <NotificationSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </>
  );
};
