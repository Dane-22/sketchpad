import React from 'react';
import {
  X,
  Bell,
  Volume2,
  VolumeX,
  Bot,
  MessageSquare,
  MapPin,
  AtSign,
  CheckCircle2,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { usePushNotifications } from '../../features/notifications/hooks/usePushNotifications';
import { useNotificationStore } from '../../features/notifications/store/useNotificationStore';
import { useAuthStore } from '../../features/auth/store/useAuthStore';
import { playNotificationChime } from '../../features/notifications/utils/sound';

interface NotificationSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationSettingsModal: React.FC<NotificationSettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const token = useAuthStore((state) => state.token);
  const {
    preferences,
    updatePreferences,
  } = useNotificationStore();

  const {
    isPushSupported,
    isPushSubscribed,
    permissionState,
    isRegistering,
    subscribeToPush,
    unsubscribeFromPush,
  } = usePushNotifications();

  if (!isOpen) return null;

  const handleTogglePush = async () => {
    if (isPushSubscribed) {
      await unsubscribeFromPush();
    } else {
      await subscribeToPush();
    }
  };

  const handleTogglePref = (key: string, value: boolean) => {
    if (!token) return;
    updatePreferences({ [key]: value }, token);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
              <Bell size={20} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Notification Preferences</h2>
              <p className="text-xs text-slate-400">Manage desktop push, AI alerts & team messenger sounds</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 flex flex-col gap-5 max-h-[75vh] overflow-y-auto">
          {/* OS Desktop Push Notification Card */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex flex-col gap-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-white flex items-center gap-2">
                  Browser & Desktop Push Notifications
                  {isPushSubscribed && (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      <CheckCircle2 size={11} /> Active
                    </span>
                  )}
                </span>
                <span className="text-[11px] text-slate-400 mt-0.5">
                  Receive native Windows/Mac OS banners and lock screen alerts when working in other tabs.
                </span>
              </div>

              <button
                onClick={handleTogglePush}
                disabled={isRegistering || !isPushSupported}
                className={`shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  isPushSubscribed
                    ? 'bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/30'
                    : 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white hover:opacity-95 shadow-md shadow-blue-500/20'
                }`}
              >
                {isRegistering ? (
                  <>
                    <Loader2 size={12} className="animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : isPushSubscribed ? (
                  <span>Disable Push</span>
                ) : (
                  <span>Enable Push</span>
                )}
              </button>
            </div>

            {permissionState === 'denied' && (
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-2 text-[11px] text-amber-300">
                <AlertCircle size={14} className="shrink-0" />
                <span>Notifications are blocked in your browser settings. Please allow notifications for this site to receive OS alerts.</span>
              </div>
            )}
          </div>

          {/* Sound & Audio Effects */}
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Audio & Tones</h3>
            
            <div className="p-3.5 rounded-2xl bg-slate-950/40 border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-slate-800 text-cyan-400">
                  {preferences?.soundEnabled !== false ? <Volume2 size={16} /> : <VolumeX size={16} />}
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-white">Harmonic Audio Chime</span>
                  <span className="text-[11px] text-slate-400">Play instant low-latency Web Audio tone on alerts</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => playNotificationChime('ai')}
                  className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] font-semibold text-slate-300 border border-slate-700"
                >
                  Test Tone
                </button>
                <input
                  type="checkbox"
                  checked={preferences?.soundEnabled !== false}
                  onChange={(e) => handleTogglePref('soundEnabled', e.target.checked)}
                  className="w-4 h-4 accent-blue-500 rounded cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Channel & Trigger Preferences */}
          <div className="flex flex-col gap-2.5">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Notification Channels</h3>

            {/* EngiAI Copilot */}
            <div className="p-3 rounded-2xl bg-slate-950/40 border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  <Bot size={16} />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-white">EngiAI Assistant Alerts</span>
                  <span className="text-[11px] text-slate-400">Completed layout analyses, CAD tolerance warnings & replies</span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={preferences?.aiPushEnabled !== false}
                onChange={(e) => handleTogglePref('aiPushEnabled', e.target.checked)}
                className="w-4 h-4 accent-blue-500 rounded cursor-pointer"
              />
            </div>

            {/* Project Messenger */}
            <div className="p-3 rounded-2xl bg-slate-950/40 border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <MessageSquare size={16} />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-white">Project Messenger</span>
                  <span className="text-[11px] text-slate-400">New channel messages, group invites, and coordinate shares</span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={preferences?.chatPushEnabled !== false}
                onChange={(e) => handleTogglePref('chatPushEnabled', e.target.checked)}
                className="w-4 h-4 accent-blue-500 rounded cursor-pointer"
              />
            </div>

            {/* Spatial Comments */}
            <div className="p-3 rounded-2xl bg-slate-950/40 border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <MapPin size={16} />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-white">Spatial Comment Pins</span>
                  <span className="text-[11px] text-slate-400">Pins dropped on drawings and discussion replies</span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={preferences?.commentPushEnabled !== false}
                onChange={(e) => handleTogglePref('commentPushEnabled', e.target.checked)}
                className="w-4 h-4 accent-blue-500 rounded cursor-pointer"
              />
            </div>

            {/* Mentions Only Mode */}
            <div className="p-3 rounded-2xl bg-slate-950/40 border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  <AtSign size={16} />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-white">Mentions Only Filter</span>
                  <span className="text-[11px] text-slate-400">Only notify when explicitly tagged (@you or @all)</span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={preferences?.mentionsOnly === true}
                onChange={(e) => handleTogglePref('mentionsOnly', e.target.checked)}
                className="w-4 h-4 accent-blue-500 rounded cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-950/80 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
